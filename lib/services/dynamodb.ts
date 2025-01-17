import { 
  DynamoDBClient,
  DescribeTableCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-dynamodb'
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb'
import { Message, MessageReaction, MessageUpdate } from '@/types/models/message'
import { User } from '@/types/models/user'
import { GroupChat, TypingIndicator, Reaction } from '@/types/models/dynamodb'
import { ThreadReadStatus } from '@/types/models/thread'
import { logger } from '@/lib/logger'

interface DynamoDBMessage extends Omit<Message, 'reactions'> {
  reactions: Record<string, MessageReaction>
}

// Add region validation
const RAILWAY_TO_AWS_REGIONS: Record<string, string> = {
  'us-east': 'us-east-1',
  'us-west': 'us-west-1',
  'eu-west': 'eu-west-1',
  'ap-south': 'ap-south-1'
};

// Initialize DynamoDB client
console.log('[DynamoDB] Environment check:', {
  hasRegion: !!process.env.AWS_REGION,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
  hasMessagesTable: !!process.env.DYNAMODB_MESSAGES_TABLE,
  hasGroupsTable: !!process.env.DYNAMODB_GROUP_CHATS_TABLE,
  region: process.env.AWS_REGION,
  messagesTable: process.env.DYNAMODB_MESSAGES_TABLE || 'dev_Messages-np',
  groupsTable: process.env.DYNAMODB_GROUP_CHATS_TABLE || 'dev_GroupChats'
})

// Move credential validation to initializeClient
const TableNames = {
  Messages: process.env.DYNAMODB_MESSAGES_TABLE || 'dev_Messages-np',
  GroupChats: process.env.DYNAMODB_GROUP_CHATS_TABLE || 'dev_GroupChats',
  Users: process.env.DYNAMODB_USERS_TABLE || 'dev_Users',
  FileMetadata: process.env.DYNAMODB_FILE_METADATA_TABLE || 'dev_FileMetadata',
  Notifications: process.env.DYNAMODB_NOTIFICATIONS_TABLE || 'dev_Notifications',
  UserStatus: process.env.DYNAMODB_USER_STATUS_TABLE || 'dev_UserStatus',
  TypingIndicators: process.env.DYNAMODB_TYPING_INDICATORS_TABLE || 'dev_TypingIndicators',
  Reactions: process.env.DYNAMODB_REACTIONS_TABLE || 'dev_Reactions',
  PinnedMessages: process.env.DYNAMODB_PINNED_MESSAGES_TABLE || 'dev_PinnedMessages',
  Mentions: process.env.DYNAMODB_MENTIONS_TABLE || 'dev_Mentions',
  ThreadReadStatus: process.env.DYNAMODB_THREAD_READ_STATUS_TABLE || 'dev_ThreadReadStatus'
};

// Make convertToMessage function public
export function convertToMessage(item: DynamoDBMessage): Message {
  return {
    id: item.id,
    groupId: item.groupId,
    content: item.content,
    userId: item.userId,
    displayName: item.displayName,
    imageUrl: item.imageUrl || '',
    timestamp: item.timestamp,
    reactions: item.reactions || {},
    attachments: item.attachments || [],
    metadata: item.metadata || {},
    replyCount: item.replyCount || 0,
    ...(item.parentId && { parentId: item.parentId }),
    sender: {
      id: item.userId,
      displayName: item.displayName,
      imageUrl: item.imageUrl || ''
    },
    replies: []
  }
}

// Singleton instance with initialization state
let instance: DynamoDBService | null = null;
let initializationPromise: Promise<void> | null = null;

export class DynamoDBService {
  private static instance: DynamoDBService | null = null;
  private initializationPromise: Promise<void> | null = null;
  private dynamodb: DynamoDBDocumentClient | null = null;
  private clientConfig: any;
  public isInitialized = false;

  constructor() {
    if (DynamoDBService.instance) {
      return DynamoDBService.instance;
    }

    // Ensure we don't create multiple instances during initialization
    if (this.initializationPromise) {
      throw new Error('DynamoDB service is already initializing');
    }

    DynamoDBService.instance = this;
    this.initializationPromise = this.initializeClient().catch(error => {
      // Reset state on initialization failure
      DynamoDBService.instance = null;
      this.initializationPromise = null;
      throw error;
    });
  }

  // Static method to get instance
  public static async getInstance(): Promise<DynamoDBService> {
    if (!DynamoDBService.instance) {
      DynamoDBService.instance = new DynamoDBService();
    }
    
    // Wait for initialization if it's in progress
    if (DynamoDBService.instance.initializationPromise) {
      await DynamoDBService.instance.initializationPromise;
    }

    if (!DynamoDBService.instance.isInitialized) {
      throw new Error('DynamoDB service failed to initialize');
    }

    return DynamoDBService.instance;
  }

  private async initializeClient() {
    // Only initialize once
    if (this.isInitialized || this.dynamodb) {
      return;
    }

    try {
      // Add region validation logging
      const railwayRegion = process.env.RAILWAY_REGION;
      const configuredAwsRegion = process.env.AWS_REGION;
      const expectedAwsRegion = railwayRegion ? RAILWAY_TO_AWS_REGIONS[railwayRegion] : null;

      logger.info('[DynamoDB] Region configuration:', {
        railwayRegion,
        configuredAwsRegion,
        expectedAwsRegion,
        isMatch: expectedAwsRegion === configuredAwsRegion,
        allEnvironment: {
          RAILWAY_REGION: process.env.RAILWAY_REGION,
          RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
          AWS_REGION: process.env.AWS_REGION,
          NODE_ENV: process.env.NODE_ENV
        }
      });

      // Warn if regions don't match
      if (expectedAwsRegion && expectedAwsRegion !== configuredAwsRegion) {
        logger.warn('[DynamoDB] Region mismatch detected:', {
          message: 'AWS region does not match Railway region',
          railwayRegion,
          configuredAwsRegion,
          expectedAwsRegion,
          recommendation: 'Consider updating AWS_REGION to match Railway region'
        });
      }

      logger.info('[DynamoDB] Starting service initialization...', {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
        region: process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      });

      // Validate credentials
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
        const missingCreds = {
          accessKey: !process.env.AWS_ACCESS_KEY_ID,
          secretKey: !process.env.AWS_SECRET_ACCESS_KEY,
          region: !process.env.AWS_REGION
        };
        
        throw new Error(`Missing AWS credentials: ${Object.entries(missingCreds)
          .filter(([_, isMissing]) => isMissing)
          .map(([key]) => key)
          .join(', ')}`);
      }

      // Add network diagnostic information
      const networkInfo = {
        railway: {
          region: process.env.RAILWAY_REGION,
          environment: process.env.RAILWAY_ENVIRONMENT_NAME,
          projectId: process.env.RAILWAY_PROJECT_ID,
          serviceId: process.env.RAILWAY_SERVICE_ID
        },
        aws: {
          region: process.env.AWS_REGION,
          endpoint: `dynamodb.${process.env.AWS_REGION}.amazonaws.com`,
          credentialsPresent: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
        }
      };

      logger.info('[DynamoDB] Network configuration:', networkInfo);

      // Initialize client with enhanced logging
      this.clientConfig = {
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      };

      const client = new DynamoDBClient(this.clientConfig);
      this.dynamodb = DynamoDBDocumentClient.from(client);

      // Test connection with enhanced diagnostics
      let isConnected = false;
      let lastError: Error | undefined;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const startTime = Date.now();
          isConnected = await this.testConnection();
          const endTime = Date.now();
          
          logger.info('[DynamoDB] Connection attempt result:', {
            attempt,
            success: isConnected,
            latencyMs: endTime - startTime,
            networkInfo
          });

          if (isConnected) break;
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          logger.warn('[DynamoDB] Connection attempt failed:', { 
            attempt,
            error: lastError,
            networkInfo,
            errorDetails: {
              name: error instanceof Error ? error.name : 'Unknown',
              message: error instanceof Error ? error.message : 'Unknown error',
              code: (error as any)?.code,
              statusCode: (error as any)?.statusCode,
              requestId: (error as any)?.requestId
            }
          });
          
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!isConnected) {
        throw lastError || new Error('Failed to connect to DynamoDB after multiple attempts');
      }

      this.isInitialized = true;
      logger.info('[DynamoDB] Service initialized successfully');

    } catch (error) {
      this.dynamodb = null;
      this.isInitialized = false;
      initializationPromise = null;
      instance = null;
      
      logger.error('[DynamoDB] Service initialization failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }

  private async ensureInitialized() {
    logger.info('[DynamoDB] EnsureInitialized called:', {
      isInitialized: this.isInitialized,
      hasDynamoDB: !!this.dynamodb,
      hasInitializationPromise: !!this.initializationPromise,
      clientConfig: this.clientConfig ? {
        region: this.clientConfig.region,
        hasCredentials: !!this.clientConfig.credentials
      } : 'No config'
    });

    // Wait for any ongoing initialization
    if (this.initializationPromise) {
      logger.info('[DynamoDB] Waiting for ongoing initialization...');
      await this.initializationPromise;
      logger.info('[DynamoDB] Initialization completed:', {
        isInitialized: this.isInitialized,
        hasDynamoDB: !!this.dynamodb
      });
    }

    // If not initialized and no initialization in progress, start one
    if (!this.isInitialized && !this.initializationPromise) {
      logger.info('[DynamoDB] Starting new initialization...');
      this.initializationPromise = this.initializeClient();
      await this.initializationPromise;
      logger.info('[DynamoDB] New initialization completed:', {
        isInitialized: this.isInitialized,
        hasDynamoDB: !!this.dynamodb
      });
    }

    if (!this.isInitialized || !this.dynamodb) {
      logger.error('[DynamoDB] Service not initialized after initialization attempt:', {
        isInitialized: this.isInitialized,
        hasDynamoDB: !!this.dynamodb,
        hasConfig: !!this.clientConfig,
        env: {
          nodeEnv: process.env.NODE_ENV,
          isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
          hasRegion: !!process.env.AWS_REGION,
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      throw new Error('DynamoDB service is not initialized. Check AWS credentials and configuration.');
    }
  }

  async verifyTables(): Promise<void> {
    await this.ensureInitialized();
    logger.info('[DynamoDB] Verifying required tables exist...')
    
    // Log the actual table names being used
    logger.info('[DynamoDB] Table names:', {
      Messages: TableNames.Messages,
      GroupChats: TableNames.GroupChats,
      Users: TableNames.Users,
      envMessages: process.env.DYNAMODB_MESSAGES_TABLE,
      envGroupChats: process.env.DYNAMODB_GROUP_CHATS_TABLE,
      envUsers: process.env.DYNAMODB_USERS_TABLE
    })
    
    try {
      const tables = [
        { name: TableNames.Messages, envVar: process.env.DYNAMODB_MESSAGES_TABLE },
        { name: TableNames.GroupChats, envVar: process.env.DYNAMODB_GROUP_CHATS_TABLE },
        { name: TableNames.Users, envVar: process.env.DYNAMODB_USERS_TABLE }
      ]
      
      for (const table of tables) {
        try {
          logger.info(`[DynamoDB] Checking table ${table.name} (${table.envVar})...`)
          await this.send(new DescribeTableCommand({
            TableName: table.name
          }))
          logger.info(`[DynamoDB] Table ${table.name} exists and is accessible`)
        } catch (error) {
          if (error instanceof ResourceNotFoundException) {
            logger.error(`[DynamoDB] Table ${table.name} does not exist`)
            throw error
          }
          logger.error(`[DynamoDB] Error checking table ${table.name}:`, {
            error,
            message: error instanceof Error ? error.message : 'Unknown error'
          })
          throw error
        }
      }
      
      logger.info('[DynamoDB] All required tables exist and are accessible')
    } catch (error) {
      logger.error('[DynamoDB] Error verifying tables:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  // Add send method with proper typing
  async send<T = any>(command: any): Promise<T> {
    await this.ensureInitialized();
    
    try {
      logger.info('[DynamoDB] Preparing to execute command:', {
        commandName: command?.constructor?.name,
        tableName: command?.input?.TableName,
        config: {
          region: this.clientConfig.region,
          hasCredentials: !!this.clientConfig.credentials,
          credentialsLength: {
            accessKey: process.env.AWS_ACCESS_KEY_ID?.length || 0,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY?.length || 0
          }
        },
        commandInput: command?.input ? {
          ...command.input,
          // Mask any sensitive data
          Item: command.input.Item ? 'Present' : undefined,
          Key: command.input.Key ? 'Present' : undefined
        } : 'No input'
      });
      
      const result = await this.dynamodb!.send(command);
      logger.info('[DynamoDB] Command executed successfully:', {
        commandName: command?.constructor?.name,
        hasResult: !!result,
        resultKeys: result ? Object.keys(result) : []
      });
      return result as T;
    } catch (error) {
      logger.error('[DynamoDB] Command execution failed:', {
        error,
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        command: {
          name: command?.constructor?.name,
          input: command?.input ? {
            ...command.input,
            // Mask any sensitive data
            Item: command.input.Item ? 'Present' : undefined,
            Key: command.input.Key ? 'Present' : undefined
          } : 'No input'
        },
        config: {
          region: this.clientConfig.region,
          hasCredentials: !!this.clientConfig.credentials,
          credentialsLength: {
            accessKey: process.env.AWS_ACCESS_KEY_ID?.length || 0,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY?.length || 0
          }
        }
      });
      throw error;
    }
  }

  // Messages
  async createMessage(message: Message): Promise<Message> {
    console.log('[DynamoDB] Creating message:', message)

    const item = {
      id: message.id,
      groupId: message.groupId,
      content: message.content,
      userId: message.userId,
      displayName: message.displayName,
      imageUrl: message.imageUrl,
      timestamp: message.timestamp,
      reactions: message.reactions || {},
      attachments: message.attachments || [],
      metadata: message.metadata || {},
      replyCount: message.replyCount || 0,
      ...(message.parentId && { parentId: message.parentId })
    }

    await this.dynamodb!.send(new PutCommand({
      TableName: TableNames.Messages,
      Item: item
    }))

    return {
      ...message,
      sender: {
        id: message.userId,
        displayName: message.displayName,
        imageUrl: message.imageUrl
      },
      replies: []
    }
  }

  async createReply(reply: Message): Promise<void> {
    console.log('[DynamoDB] Creating reply:', {
      id: reply.id,
      parentId: reply.parentId,
      userId: reply.userId,
      content: reply.content.substring(0, 50)
    })
    
    try {
      // First create the reply message
      await this.createMessage(reply)

      // Then increment the parent message's replyCount
      if (reply.parentId) {
        await this.dynamodb!.send(new UpdateCommand({
          TableName: TableNames.Messages,
          Key: {
            id: reply.parentId,
            groupId: reply.groupId
          },
          UpdateExpression: 'ADD replyCount :inc',
          ExpressionAttributeValues: {
            ':inc': 1
          }
        }))
      }
    } catch (error) {
      console.error('[DynamoDB] Error creating reply:', {
        error,
        replyId: reply.id,
        parentId: reply.parentId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async getMessagesByGroup(groupId: string, limit: number = 50): Promise<Message[]> {
    console.log('[DynamoDB] Fetching messages for group:', {
      groupId,
      limit,
      tableName: TableNames.Messages
    })
    
    try {
      // First, get all messages for the group
      const result = await this.dynamodb!.send(new QueryCommand({
        TableName: TableNames.Messages,
        IndexName: 'GroupIdIndex',
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: {
          ':groupId': groupId
        },
        Limit: limit,
        ScanIndexForward: false // Get most recent messages first
      }))

      console.log('[DynamoDB] Query result:', {
        count: result.Count,
        scannedCount: result.ScannedCount,
        hasItems: !!result.Items,
        itemCount: result.Items?.length
      })
      
      if (!result.Items) {
        console.log('[DynamoDB] No messages found for group:', groupId)
        return []
      }

      // Separate parent messages and replies
      const parentMessages: DynamoDBMessage[] = []
      const repliesMap: Record<string, DynamoDBMessage[]> = {}

      result.Items.forEach((item) => {
        const message = item as DynamoDBMessage
        if (message.parentId) {
          // This is a reply
          if (!repliesMap[message.parentId]) {
            repliesMap[message.parentId] = []
          }
          repliesMap[message.parentId].push(message)
        } else {
          // This is a parent message
          parentMessages.push(message)
        }
      })

      // Convert parent messages and attach their replies
      const messages = parentMessages.map(item => {
        const message = convertToMessage(item)
        if (repliesMap[message.id]) {
          message.replies = repliesMap[message.id]
            .map(reply => convertToMessage(reply))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Sort replies chronologically
        }
        return message
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Sort parent messages chronologically

      console.log('[DynamoDB] Successfully processed messages:', {
        totalMessages: result.Items.length,
        parentMessages: messages.length,
        repliesFound: Object.keys(repliesMap).length,
        messageDetails: messages.map(m => ({
          id: m.id,
          timestamp: m.timestamp,
          replyCount: m.replies?.length ?? 0
        }))
      })

      return messages
    } catch (error) {
      console.error('[DynamoDB] Error fetching messages:', error)
      throw error
    }
  }

  // Message Replies
  async addReply(parentId: string, reply: Message): Promise<void> {
    console.log('[DynamoDB] Adding reply:', {
      parentId,
      replyId: reply.id,
      userId: reply.userId
    })
    
    try {
      await this.dynamodb!.send(new UpdateCommand({
        TableName: TableNames.Messages,
        Key: { id: parentId },
        UpdateExpression: 'SET replies = list_append(if_not_exists(replies, :empty_list), :reply)',
        ExpressionAttributeValues: {
          ':reply': [reply],
          ':empty_list': []
        }
      }))
      
      console.log('[DynamoDB] Successfully added reply')
    } catch (error) {
      console.error('[DynamoDB] Error adding reply:', error)
      throw error
    }
  }

  // Reactions
  async addReaction(messageId: string, reaction: Reaction): Promise<void> {
    console.log('[DynamoDB] Adding reaction:', {
      messageId,
      emoji: reaction.emoji,
      userId: reaction.userId
    })
    
    try {
      await this.dynamodb!.send(new PutCommand({
        TableName: TableNames.Reactions,
        Item: {
          messageId,
          userId: reaction.userId,
          emoji: reaction.emoji,
          timestamp: reaction.timestamp
        }
      }))
    } catch (error) {
      console.error('[DynamoDB] Error adding reaction:', {
        error,
        messageId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async removeReaction(messageId: string, userId: string): Promise<void> {
    console.log('[DynamoDB] Removing reaction:', {
      messageId,
      userId
    })
    
    try {
      await this.dynamodb!.send(new DeleteCommand({
        TableName: TableNames.Reactions,
        Key: {
          messageId,
          userId
        }
      }))
    } catch (error) {
      console.error('[DynamoDB] Error removing reaction:', {
        error,
        messageId,
        userId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  // Typing Indicators
  async setTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    console.log('[DynamoDB] Setting typing indicator:', {
      conversationId,
      userId,
      isTyping
    })
    
    try {
      await this.dynamodb!.send(new PutCommand({
        TableName: TableNames.TypingIndicators,
        Item: {
          conversationId,
          userId,
          isTyping,
          updatedAt: Date.now()
        }
      }))
      console.log('[DynamoDB] Successfully set typing indicator')
    } catch (error) {
      console.error('[DynamoDB] Error setting typing indicator:', error)
      throw error
    }
  }

  async getTypingUsers(conversationId: string): Promise<TypingIndicator[]> {
    console.log('[DynamoDB] Getting typing users for conversation:', conversationId)
    
    try {
      const result = await this.dynamodb!.send(new QueryCommand({
        TableName: TableNames.TypingIndicators,
        KeyConditionExpression: 'conversationId = :conversationId',
        FilterExpression: 'isTyping = :isTyping',
        ExpressionAttributeValues: {
          ':conversationId': conversationId,
          ':isTyping': true
        }
      }))
      
      console.log('[DynamoDB] Found typing users:', result.Items?.length || 0)
      return result.Items as TypingIndicator[]
    } catch (error) {
      console.error('[DynamoDB] Error getting typing users:', error)
      throw error
    }
  }

  async deleteTypingIndicator(conversationId: string, userId: string): Promise<void> {
    console.log('[DynamoDB] Deleting typing indicator:', {
      conversationId,
      userId
    })
    
    try {
      await this.dynamodb!.send(new DeleteCommand({
        TableName: TableNames.TypingIndicators,
        Key: {
          conversationId,
          userId
        }
      }))
      console.log('[DynamoDB] Successfully deleted typing indicator')
    } catch (error) {
      console.error('[DynamoDB] Error deleting typing indicator:', error)
      throw error
    }
  }

  // Group Chats
  async createGroupChat(groupChat: GroupChat): Promise<GroupChat> {
    logger.info('[DynamoDB] Creating group chat:', {
      id: groupChat.id,
      name: groupChat.name,
      members: groupChat.members,
      tableName: TableNames.GroupChats
    })

    try {
      await this.dynamodb!.send(new PutCommand({
        TableName: TableNames.GroupChats,
        Item: {
          id: groupChat.id,
          name: groupChat.name,
          userId: groupChat.userId,
          members: groupChat.members,
          createdAt: groupChat.createdAt,
          updatedAt: groupChat.updatedAt,
          metadata: groupChat.metadata || {}
        }
      }))

      logger.info('[DynamoDB] Group chat created successfully:', {
        id: groupChat.id,
        name: groupChat.name
      })

      return groupChat
    } catch (error) {
      logger.error('[DynamoDB] Error creating group chat:', {
        error,
        groupId: groupChat.id,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        tableName: TableNames.GroupChats
      })
      throw error
    }
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    console.log('[DynamoDB] Getting all users')
    
    try {
      const result = await this.dynamodb!.send(new ScanCommand({
        TableName: TableNames.Users,
        Limit: 50 // Limiting to 50 users for performance
      }))
      
      console.log('[DynamoDB] Users scan result:', {
        count: result.Count,
        scannedCount: result.ScannedCount
      })
      
      return (result.Items || []) as User[]
    } catch (error) {
      console.error('[DynamoDB] Error getting all users:', error)
      throw error
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    console.log('[DynamoDB] Getting user by ID:', userId)
    
    try {
      const result = await this.dynamodb!.send(new GetCommand({
        TableName: TableNames.Users,
        Key: { id: userId }
      }))
      
      console.log('[DynamoDB] User query result:', {
        hasItem: !!result.Item,
        userId: result.Item?.id
      })
      
      return result.Item as User || null
    } catch (error) {
      console.error('[DynamoDB] Error getting user:', error)
      throw error
    }
  }

  async getMessage(messageId: string): Promise<Message | null> {
    console.log('[DynamoDB] Getting message:', messageId)
    
    try {
      const result = await this.dynamodb!.send(new GetCommand({
        TableName: TableNames.Messages,
        Key: { id: messageId }
      }))

      if (!result.Item) return null
      return convertToMessage(result.Item as DynamoDBMessage)
    } catch (error) {
      console.error('[DynamoDB] Error getting message:', {
        error,
        messageId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async getRepliesForMessage(
    messageId: string,
    limit?: number,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<Message[]> {
    console.log('[DynamoDB] Getting replies for message:', {
      messageId,
      limit,
      hasLastKey: !!lastEvaluatedKey
    })
    
    try {
      const result = await this.dynamodb!.send(new QueryCommand({
        TableName: TableNames.Messages,
        IndexName: 'ParentMessageIndex',
        KeyConditionExpression: 'parentId = :parentId',
        ExpressionAttributeValues: {
          ':parentId': messageId
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: true // true = ascending order by timestamp (oldest first)
      }))

      if (!result.Items) return []
      
      // Sort by timestamp to ensure chronological order
      const replies = result.Items.map(item => convertToMessage(item as DynamoDBMessage))
      return replies.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } catch (error) {
      console.error('[DynamoDB] Error getting replies:', {
        error,
        messageId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async getMessagesForGroup(groupId: string, limit: number = 50, lastEvaluatedKey?: any): Promise<{ messages: Message[], lastEvaluatedKey?: any }> {
    console.log('[DynamoDB] Getting messages for group:', {
      groupId,
      limit,
      lastEvaluatedKey
    })

    try {
      const result = await this.dynamodb!.send(new QueryCommand({
        TableName: TableNames.Messages,
        IndexName: 'GroupIdIndex',
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: {
          ':groupId': groupId
        },
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: lastEvaluatedKey
      }))

      return {
        messages: (result.Items || []).map((item) => convertToMessage(item as DynamoDBMessage)),
        lastEvaluatedKey: result.LastEvaluatedKey
      }
    } catch (error) {
      console.error('[DynamoDB] Error getting messages for group:', {
        error,
        groupId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async updateMessage(messageId: string, updates: MessageUpdate): Promise<void> {
    console.log('[DynamoDB] Updating message:', {
      messageId,
      updates: JSON.stringify(updates)
    })
    
    try {
      const updateExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`)
        expressionAttributeNames[`#${key}`] = key
        expressionAttributeValues[`:${key}`] = value
      })

      await this.dynamodb!.send(new UpdateCommand({
        TableName: TableNames.Messages,
        Key: { id: messageId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }))
    } catch (error) {
      console.error('[DynamoDB] Error updating message:', {
        error,
        messageId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    console.log('[DynamoDB] Deleting message:', messageId)
    
    try {
      await this.dynamodb!.send(new DeleteCommand({
        TableName: TableNames.Messages,
        Key: { id: messageId }
      }))
    } catch (error) {
      console.error('[DynamoDB] Error deleting message:', {
        error,
        messageId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async updateReply(replyId: string, updates: Partial<Message>): Promise<void> {
    console.log('[DynamoDB] Updating reply:', {
      replyId,
      updates: JSON.stringify(updates)
    })
    
    try {
      const updateExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`)
        expressionAttributeNames[`#${key}`] = key
        expressionAttributeValues[`:${key}`] = value
      })

      await this.dynamodb!.send(new UpdateCommand({
        TableName: TableNames.Messages,
        Key: { id: replyId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }))
    } catch (error) {
      console.error('[DynamoDB] Error updating reply:', {
        error,
        replyId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async deleteReply(replyId: string): Promise<void> {
    console.log('[DynamoDB] Deleting reply:', replyId)
    
    try {
      await this.dynamodb!.send(new DeleteCommand({
        TableName: TableNames.Messages,
        Key: { id: replyId }
      }))
    } catch (error) {
      console.error('[DynamoDB] Error deleting reply:', {
        error,
        replyId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async getRepliesWithPagination(
    parentId: string,
    limit?: number,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<{ replies: Message[]; lastEvaluatedKey?: Record<string, any> }> {
    console.log('[DynamoDB] Getting paginated replies:', {
      parentId,
      limit,
      hasLastKey: !!lastEvaluatedKey
    })
    
    try {
      const result = await this.dynamodb!.send(new QueryCommand({
        TableName: TableNames.Messages,
        IndexName: 'ParentMessageIndex',
        KeyConditionExpression: 'parentId = :parentId',
        ExpressionAttributeValues: {
          ':parentId': parentId
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: true // true = ascending order by timestamp (oldest first)
      }))

      console.log('[DynamoDB] Got paginated replies:', {
        count: result.Items?.length || 0,
        parentId,
        hasMore: !!result.LastEvaluatedKey
      })

      // Sort by timestamp to ensure chronological order
      const replies = (result.Items || []).map(item => convertToMessage(item as DynamoDBMessage))
      return {
        replies: replies.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        lastEvaluatedKey: result.LastEvaluatedKey
      }
    } catch (error) {
      console.error('[DynamoDB] Error getting paginated replies:', {
        error,
        parentId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async updateThreadReadStatus(
    messageId: string,
    userId: string,
    lastReadTimestamp: string
  ): Promise<void> {
    console.log('[DynamoDB] Updating thread read status:', {
      messageId,
      userId,
      lastReadTimestamp
    })
    
    try {
      await this.dynamodb!.send(new PutCommand({
        TableName: TableNames.ThreadReadStatus,
        Item: {
          messageId,
          userId,
          lastReadTimestamp
        }
      }))
    } catch (error) {
      console.error('[DynamoDB] Error updating thread read status:', {
        error,
        messageId,
        userId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async getThreadReadStatus(messageId: string): Promise<ThreadReadStatus[]> {
    console.log('[DynamoDB] Getting thread read status:', messageId)
    
    try {
      const result = await this.dynamodb!.send(new QueryCommand({
        TableName: TableNames.ThreadReadStatus,
        KeyConditionExpression: 'messageId = :messageId',
        ExpressionAttributeValues: {
          ':messageId': messageId
        }
      }))

      return (result.Items || []) as ThreadReadStatus[]
    } catch (error) {
      console.error('[DynamoDB] Error getting thread read status:', {
        error,
        messageId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async retryFailedOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error('[DynamoDB] Operation failed, retrying:', {
          attempt,
          maxRetries,
          error: lastError
        })
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries')
  }

  // Error handling wrapper
  public async handleDynamoDBOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
        console.error('[DynamoDB] Missing AWS credentials:', {
          hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          hasRegion: !!process.env.AWS_REGION,
          nodeEnv: process.env.NODE_ENV,
          isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME
        })
        throw new Error('Missing AWS credentials')
      }

      return await operation()
    } catch (error) {
      console.error('[DynamoDB] Operation failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error,
        env: {
          nodeEnv: process.env.NODE_ENV,
          isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
          region: process.env.AWS_REGION
        }
      })
      throw error
    }
  }

  async getGroupsByUserId(userId: string): Promise<GroupChat[]> {
    try {
      logger.info('[DynamoDB] GetGroupsByUserId called:', {
        userId,
        isInitialized: this.isInitialized,
        hasDynamoDB: !!this.dynamodb,
        tableName: process.env.DYNAMODB_GROUP_CHATS_TABLE
      });
      
      // Check if groups table is available
      if (!process.env.DYNAMODB_GROUP_CHATS_TABLE) {
        logger.warn('[DynamoDB] Groups table not configured, returning empty array');
        return [];
      }

      await this.ensureInitialized();
      
      logger.info('[DynamoDB] Fetching groups for user:', {
        userId,
        tableName: process.env.DYNAMODB_GROUP_CHATS_TABLE,
        isInitialized: this.isInitialized,
        hasDynamoDB: !!this.dynamodb
      });

      // Get all groups and filter by user membership
      const result = await this.dynamodb!.send(new ScanCommand({
        TableName: process.env.DYNAMODB_GROUP_CHATS_TABLE,
        FilterExpression: 'contains(members, :userId)',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      }));

      const groups = (result.Items || []) as GroupChat[];
      logger.info('[DynamoDB] Found groups for user:', {
        userId,
        count: groups.length,
        groups: groups.map(g => ({ id: g.id, name: g.name, memberCount: g.members?.length })),
        tableName: process.env.DYNAMODB_GROUP_CHATS_TABLE
      });

      return groups;
    } catch (error) {
      logger.error('[DynamoDB] Error getting groups for user:', {
        error,
        userId,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        tableName: process.env.DYNAMODB_GROUP_CHATS_TABLE,
        isInitialized: this.isInitialized,
        hasDynamoDB: !!this.dynamodb,
        clientConfig: this.clientConfig ? {
          region: this.clientConfig.region,
          hasCredentials: !!this.clientConfig.credentials
        } : 'No config'
      });
      throw error;
    }
  }

  async ensureUserInGroup(userIds: string | string[], groupId: string): Promise<void> {
    const users = Array.isArray(userIds) ? userIds : [userIds]
    console.log('[DynamoDB] Ensuring users are in group:', { users, groupId })
    
    try {
      // Get current group to check existing members
      const group = await this.getGroupById(groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Get current members or empty array
      const currentMembers = group.members || []

      // Add any missing users
      const newMembers = users.filter(userId => !currentMembers.includes(userId))
      if (newMembers.length === 0) {
        console.log('[DynamoDB] All users already in group')
        return
      }

      // Update group with new members
      await this.dynamodb!.send(new UpdateCommand({
        TableName: TableNames.GroupChats,
        Key: { id: groupId },
        UpdateExpression: 'SET members = list_append(if_not_exists(members, :empty_list), :new_members)',
        ExpressionAttributeValues: {
          ':empty_list': [],
          ':new_members': newMembers
        }
      }))
      
      console.log('[DynamoDB] Successfully added users to group:', {
        addedUsers: newMembers.length
      })
    } catch (error) {
      console.error('[DynamoDB] Error adding users to group:', {
        error,
        users,
        groupId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async getGroupById(groupId: string): Promise<GroupChat | null> {
    const result = await this.dynamodb!.send(new GetCommand({
      TableName: TableNames.GroupChats,
      Key: { id: groupId }
    }))

    if (!result.Item) return null

    return {
      id: result.Item.id,
      name: result.Item.name,
      userId: result.Item.userId,
      members: result.Item.members,
      createdAt: result.Item.createdAt,
      updatedAt: result.Item.updatedAt,
      metadata: result.Item.metadata || {}
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    console.log('[DynamoDB] Starting group deletion:', groupId)
    
    try {
      // First verify the group exists
      const group = await this.getGroupById(groupId)
      if (!group) {
        console.error('[DynamoDB] Cannot delete non-existent group:', groupId)
        throw new Error('Group not found')
      }

      console.log('[DynamoDB] Group found:', {
        id: group.id,
        name: group.name,
        creatorId: group.userId,
        members: group.members,
        tableName: TableNames.GroupChats
      })

      // First, delete all messages in the group
      console.log('[DynamoDB] Fetching messages for group:', groupId)
      try {
        const result = await this.getMessagesForGroup(groupId)
        console.log('[DynamoDB] Found messages to delete:', result.messages.length)
        
        if (result.messages.length > 0) {
          // Delete messages sequentially to avoid overwhelming DynamoDB
          for (const message of result.messages) {
            try {
              console.log('[DynamoDB] Deleting message:', message.id)
              await this.dynamodb!.send(new DeleteCommand({
                TableName: TableNames.Messages,
                Key: { 
                  id: message.id,
                  groupId: message.groupId
                }
              }))
              console.log('[DynamoDB] Successfully deleted message:', message.id)
            } catch (error) {
              console.error('[DynamoDB] Error deleting message:', {
                messageId: message.id,
                groupId: message.groupId,
                error: error instanceof Error ? error.message : 'Unknown error',
                errorType: error instanceof Error ? error.constructor.name : typeof error
              })
              // Continue with other messages even if one fails
            }
          }
        }
      } catch (error) {
        console.error('[DynamoDB] Error in message deletion process:', {
          error,
          groupId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error
        })
        // Continue with group deletion even if message deletion fails
      }

      // Then delete the group itself
      console.log('[DynamoDB] Deleting group record:', {
        groupId,
        tableName: TableNames.GroupChats
      })

      const deleteCommand = new DeleteCommand({
        TableName: TableNames.GroupChats,
        Key: { id: groupId }
      })
      
      await this.dynamodb!.send(deleteCommand)
      console.log('[DynamoDB] Group record deleted successfully:', groupId)
    } catch (error) {
      console.error('[DynamoDB] Error in group deletion process:', {
        error,
        groupId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        tableName: TableNames.GroupChats
      })
      throw error
    }
  }

  async getMessagesWithReplies(groupId: string, limit: number = 50, lastEvaluatedKey?: any): Promise<{ messages: Message[], lastEvaluatedKey?: any }> {
    const result = await this.getMessagesForGroup(groupId, limit, lastEvaluatedKey)
    
    // Get replies for each message
    const messagesWithReplies = await Promise.all(
      result.messages.map(async (message) => {
        if (message.replyCount > 0) {
          const replies = await this.getRepliesForMessage(message.id)
          return { ...message, replies }
        }
        return { ...message, replies: [] }
      })
    )

    return {
      messages: messagesWithReplies,
      lastEvaluatedKey: result.lastEvaluatedKey
    }
  }

  async updateGroup(groupId: string, updates: Partial<GroupChat>): Promise<GroupChat> {
    console.log('[DynamoDB] Updating group:', {
      groupId,
      updates: JSON.stringify(updates, null, 2)
    })
    
    try {
      // Build update expression and attribute values
      const updateExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`)
        expressionAttributeNames[`#${key}`] = key
        expressionAttributeValues[`:${key}`] = value
      })

      const updateExpression = `SET ${updateExpressions.join(', ')}`

      console.log('[DynamoDB] Update parameters:', {
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues
      })

      const result = await this.dynamodb!.send(new UpdateCommand({
        TableName: TableNames.GroupChats,
        Key: { id: groupId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }))

      console.log('[DynamoDB] Group updated successfully:', {
        groupId,
        updatedAttributes: result.Attributes
      })

      return result.Attributes as GroupChat
    } catch (error) {
      console.error('[DynamoDB] Error updating group:', {
        groupId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      })
      throw error
    }
  }

  // Add search method
  async searchMessages(params: {
    query: string
    groupId?: string
    limit?: number
    cursor?: string
    startDate?: string
    endDate?: string
  }): Promise<{
    items: DynamoDBMessage[]
    count: number
    lastEvaluatedKey?: any
  }> {
    console.log('[DynamoDB] Initializing search with params:', params)
    
    const { query, groupId, limit = 20, cursor, startDate, endDate } = params

    // Build filter expressions
    const filterExpressions: string[] = []
    const expressionValues: Record<string, any> = {
      ':query1': query.toLowerCase(),
      ':query2': query.toUpperCase(),
      ':query3': query
    }

    // Add content search condition - check for lowercase, uppercase, and exact match
    filterExpressions.push('(contains(content, :query1) OR contains(content, :query2) OR contains(content, :query3))')

    // Add group filter if specified
    if (groupId) {
      filterExpressions.push('groupId = :groupId')
      expressionValues[':groupId'] = groupId
    }

    // Add date range filters if specified
    if (startDate) {
      filterExpressions.push('timestamp >= :startDate')
      expressionValues[':startDate'] = startDate
    }
    if (endDate) {
      filterExpressions.push('timestamp <= :endDate')
      expressionValues[':endDate'] = endDate
    }

    // Build the scan parameters
    const scanParams = {
      TableName: TableNames.Messages,
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeValues: expressionValues,
      Limit: limit,
      ...(cursor && { ExclusiveStartKey: JSON.parse(decodeURIComponent(cursor)) })
    }

    console.log('[DynamoDB] Executing scan with params:', scanParams)

    try {
      // Execute the scan
      console.log('[DynamoDB] Sending scan command...')
      const result = await this.send(new ScanCommand(scanParams))
      console.log('[DynamoDB] Scan command completed')
      
      console.log('[DynamoDB] Search results:', {
        count: result.Count,
        scannedCount: result.ScannedCount,
        hasMore: !!result.LastEvaluatedKey
      })

      return {
        items: (result.Items || []) as DynamoDBMessage[],
        count: result.Count || 0,
        lastEvaluatedKey: result.LastEvaluatedKey
      }
    } catch (error) {
      console.error('[DynamoDB] Error searching messages:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        params: scanParams,
        error
      })
      throw error
    }
  }

  // Users
  async createUser(user: User): Promise<User> {
    console.log('[DynamoDB] Creating user:', {
      userId: user.id,
      email: user.email
    })
    
    try {
      await this.dynamodb!.send(new PutCommand({
        TableName: TableNames.Users,
        Item: {
          id: user.id,
          auth0Id: user.auth0Id,
          email: user.email,
          displayName: user.displayName,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastActiveAt: user.lastActiveAt
        }
      }))
      
      console.log('[DynamoDB] Successfully created user:', user.id)
      return user
    } catch (error) {
      console.error('[DynamoDB] Error creating user:', {
        error,
        userId: user.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    console.log('[DynamoDB] Updating user:', {
      userId,
      updates: JSON.stringify(updates)
    })
    
    try {
      const updateExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`)
        expressionAttributeNames[`#${key}`] = key
        expressionAttributeValues[`:${key}`] = value
      })

      // Always update the updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt')
      expressionAttributeNames['#updatedAt'] = 'updatedAt'
      expressionAttributeValues[':updatedAt'] = new Date().toISOString()

      const result = await this.dynamodb!.send(new UpdateCommand({
        TableName: TableNames.Users,
        Key: { id: userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }))

      console.log('[DynamoDB] User updated successfully:', {
        userId,
        updatedAttributes: result.Attributes
      })

      return result.Attributes as User
    } catch (error) {
      console.error('[DynamoDB] Error updating user:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  async deleteUser(userId: string): Promise<void> {
    console.log('[DynamoDB] Deleting user:', userId)
    
    try {
      await this.dynamodb!.send(new DeleteCommand({
        TableName: TableNames.Users,
        Key: { id: userId }
      }))
      
      console.log('[DynamoDB] Successfully deleted user')
    } catch (error) {
      console.error('[DynamoDB] Error deleting user:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  private convertDynamoDBMessageToMessage(item: any): Message {
    return {
      id: item.id,
      groupId: item.groupId,
      content: item.content,
      userId: item.userId,
      displayName: item.displayName,
      imageUrl: item.imageUrl || '',
      timestamp: item.timestamp,
      reactions: item.reactions || {},
      attachments: item.attachments || [],
      metadata: item.metadata || {},
      replyCount: item.replyCount || 0,
      ...(item.parentId && { parentId: item.parentId }),
      sender: {
        id: item.userId,
        displayName: item.displayName,
        imageUrl: item.imageUrl || ''
      },
      replies: []
    }
  }

  async getUserByAuthId(auth0Id: string): Promise<User | null> {
    console.log('[DynamoDB] Getting user by Auth0 ID:', auth0Id)
    
    try {
      const result = await this.dynamodb!.send(new QueryCommand({
        TableName: TableNames.Users,
        IndexName: 'Auth0IdIndex',
        KeyConditionExpression: 'auth0Id = :auth0Id',
        ExpressionAttributeValues: {
          ':auth0Id': auth0Id
        }
      }))

      if (!result.Items || result.Items.length === 0) {
        return null
      }

      return result.Items[0] as User
    } catch (error) {
      console.error('[DynamoDB] Error getting user by Auth0 ID:', {
        auth0Id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  // Group Chats
  async getAllGroups(): Promise<GroupChat[]> {
    console.log('[DynamoDB] Getting all groups')
    
    try {
      const result = await this.dynamodb!.send(new ScanCommand({
        TableName: TableNames.GroupChats
      }))
      
      console.log('[DynamoDB] Groups scan result:', {
        count: result.Count,
        scannedCount: result.ScannedCount
      })
      
      return (result.Items || []) as GroupChat[]
    } catch (error) {
      console.error('[DynamoDB] Error getting all groups:', error)
      throw error
    }
  }

  async updateAllGroupsWithAllUsers(): Promise<void> {
    console.log('[DynamoDB] Starting update of all groups with all users')
    
    try {
      // Get all users
      const allUsers = await this.getAllUsers()
      const userIds = allUsers.map(user => user.id)
      
      console.log('[DynamoDB] Found users:', {
        count: userIds.length,
        userIds
      })

      // Get all groups
      const allGroups = await this.getAllGroups()
      console.log('[DynamoDB] Found groups:', {
        count: allGroups.length,
        groups: allGroups.map(g => ({ id: g.id, name: g.name }))
      })

      // Update each group
      for (const group of allGroups) {
        console.log('[DynamoDB] Updating group:', {
          id: group.id,
          name: group.name,
          currentMembers: group.members?.length || 0,
          newMembers: userIds.length
        })

        await this.updateGroup(group.id, {
          members: userIds,
          updatedAt: new Date().toISOString()
        })
      }

      console.log('[DynamoDB] Successfully updated all groups with all users')
    } catch (error) {
      console.error('[DynamoDB] Error updating groups with users:', error)
      throw error
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      logger.info('[DynamoDB] Starting connection test with config:', {
        region: this.clientConfig?.region,
        hasCredentials: !!this.clientConfig?.credentials,
        tables: {
          messages: TableNames.Messages,
          groups: TableNames.GroupChats
        },
        networkInfo: {
          railway: {
            region: process.env.RAILWAY_REGION,
            environment: process.env.RAILWAY_ENVIRONMENT_NAME,
            projectId: process.env.RAILWAY_PROJECT_ID,
            serviceId: process.env.RAILWAY_SERVICE_ID
          }
        }
      });

      // Try to describe the Messages table as a connection test
      const result = await this.dynamodb!.send(new DescribeTableCommand({
        TableName: TableNames.Messages
      }));

      const endTime = Date.now();
      const latency = endTime - startTime;

      logger.info('[DynamoDB] Connection test successful:', {
        latencyMs: latency,
        tableInfo: {
          tableName: result.Table?.TableName,
          tableStatus: result.Table?.TableStatus,
          itemCount: result.Table?.ItemCount,
          tableSizeBytes: result.Table?.TableSizeBytes
        }
      });
      return true;
    } catch (error) {
      logger.error('[DynamoDB] Connection test failed:', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        networkInfo: {
          railway: {
            region: process.env.RAILWAY_REGION,
            environment: process.env.RAILWAY_ENVIRONMENT_NAME,
            projectId: process.env.RAILWAY_PROJECT_ID,
            serviceId: process.env.RAILWAY_SERVICE_ID
          }
        },
        config: {
          region: this.clientConfig?.region,
          hasCredentials: !!this.clientConfig?.credentials,
          credentialsLength: {
            accessKey: process.env.AWS_ACCESS_KEY_ID?.length || 0,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY?.length || 0
          },
          tables: {
            messages: TableNames.Messages,
            groups: TableNames.GroupChats
          }
        }
      });
      return false;
    }
  }
}