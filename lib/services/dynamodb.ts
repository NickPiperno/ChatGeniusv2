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

// Initialize DynamoDB client
console.log('[DynamoDB] Environment check:', {
  hasRegion: !!process.env.AWS_REGION,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
  hasMessagesTable: !!process.env.DYNAMODB_MESSAGES_TABLE,
  hasGroupsTable: !!process.env.DYNAMODB_GROUP_CHATS_TABLE,
  region: process.env.AWS_REGION,
  messagesTable: process.env.DYNAMODB_MESSAGES_TABLE || 'dev_Messages-np',
  groupsTable: process.env.DYNAMODB_GROUP_CHATS_TABLE || 'dev_GroupChats',
  nodeEnv: process.env.NODE_ENV,
  isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
  railwayEnv: process.env.RAILWAY_ENVIRONMENT_NAME,
  railwayRegion: process.env.RAILWAY_REGION,
  railwayServiceId: process.env.RAILWAY_SERVICE_ID
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

export class DynamoDBService {
  private static instance: DynamoDBService | null = null;
  private dynamodb: DynamoDBDocumentClient | null = null;
  private clientConfig: any;
  public isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  // Add initialization state tracking
  private static initializationState = {
    attempts: 0,
    lastAttempt: null as string | null,
    errors: [] as string[],
    isInProgress: false,
    startTime: null as string | null
  };

  private constructor() {
    // Add immediate console logging
    console.log('[DynamoDB] Constructor called:', {
      time: new Date().toISOString(),
      hasInstance: !!DynamoDBService.instance,
      isInitialized: DynamoDBService.instance?.isInitialized || false,
      hasInitPromise: !!DynamoDBService.instance?.initializationPromise,
      state: DynamoDBService.initializationState,
      env: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
        region: process.env.AWS_REGION,
        hasCredentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    DynamoDBService.initializationState.startTime = new Date().toISOString();
    DynamoDBService.initializationState.isInProgress = true;

    // Increase timeout to 30 seconds for Railway cold starts
    const INIT_TIMEOUT_MS = 30000;

    // Start initialization with timeout and early connection test
    this.initializationPromise = (async () => {
      try {
        // Create client first
        const client = new DynamoDBClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
          }
        });

        // Test basic connectivity before full initialization
        console.log('[DynamoDB] Testing basic connectivity...', {
          time: new Date().toISOString(),
          region: process.env.AWS_REGION
        });

        try {
          await client.send(new DescribeTableCommand({
            TableName: process.env.DYNAMODB_GROUP_CHATS_TABLE
          }));
          console.log('[DynamoDB] Basic connectivity test passed');
        } catch (error) {
          console.error('[DynamoDB] Basic connectivity test failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            region: process.env.AWS_REGION
          });
        }

        // Proceed with full initialization
        return Promise.race([
          this.initializeClient(),
          new Promise<void>((_, reject) => {
            setTimeout(() => {
              const error = new Error(`DynamoDB initialization timed out after ${INIT_TIMEOUT_MS}ms`);
              console.error('[DynamoDB] Initialization timeout:', {
                time: new Date().toISOString(),
                startTime: DynamoDBService.initializationState.startTime,
                attempts: DynamoDBService.initializationState.attempts,
                errors: DynamoDBService.initializationState.errors,
                timeoutMs: INIT_TIMEOUT_MS
              });
              reject(error);
            }, INIT_TIMEOUT_MS);
          })
        ]);
      } catch (error) {
        console.error('[DynamoDB] Early initialization failed:', {
          time: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          region: process.env.AWS_REGION
        });
        throw error;
      }
    })();
    
    // Add initialization status check with better error handling
    this.initializationPromise
      .then(() => {
        console.log('[DynamoDB] Initialization completed successfully:', {
          time: new Date().toISOString(),
          duration: new Date().getTime() - new Date(DynamoDBService.initializationState.startTime!).getTime(),
          isInitialized: this.isInitialized,
          hasClient: !!this.dynamodb,
          attempts: DynamoDBService.initializationState.attempts,
          state: DynamoDBService.initializationState
        });
      })
      .catch((error) => {
        this.isInitialized = false;
        this.dynamodb = null;
        this.initializationPromise = null;
        DynamoDBService.initializationState.isInProgress = false;
        DynamoDBService.initializationState.errors.push(error instanceof Error ? error.message : 'Unknown error');
        
        console.error('[DynamoDB] Initialization failed:', {
          time: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          state: DynamoDBService.initializationState,
          environment: {
            nodeEnv: process.env.NODE_ENV,
            isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
            railwayRegion: process.env.RAILWAY_REGION,
            awsRegion: process.env.AWS_REGION,
            hasCredentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY
          }
        });
      });
  }

  public static getInstance(): DynamoDBService {
    console.log('[DynamoDB] GetInstance called:', {
      time: new Date().toISOString(),
      hasInstance: !!DynamoDBService.instance,
      state: DynamoDBService.instance ? {
        isInitialized: DynamoDBService.instance.isInitialized,
        hasClient: !!DynamoDBService.instance.dynamodb,
        hasInitPromise: !!DynamoDBService.instance.initializationPromise
      } : 'no instance'
    });

    if (!DynamoDBService.instance) {
      DynamoDBService.instance = new DynamoDBService();
    }
    return DynamoDBService.instance;
  }

  private async initializeClient() {
    DynamoDBService.initializationState.attempts++;
    DynamoDBService.initializationState.lastAttempt = new Date().toISOString();
    const startTime = Date.now();

    console.log('[DynamoDB] InitializeClient started:', {
      time: new Date().toISOString(),
      attempt: DynamoDBService.initializationState.attempts,
      state: DynamoDBService.initializationState,
      env: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
        region: process.env.AWS_REGION,
        endpoint: process.env.AWS_ENDPOINT,
        hasCredentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
        credentialsLength: {
          accessKey: process.env.AWS_ACCESS_KEY_ID?.length || 0,
          secretKey: process.env.AWS_SECRET_ACCESS_KEY?.length || 0
        },
        tables: {
          messages: process.env.DYNAMODB_MESSAGES_TABLE,
          groups: process.env.DYNAMODB_GROUP_CHATS_TABLE,
          users: process.env.DYNAMODB_USERS_TABLE
        }
      }
    });

    try {
      // Validate required credentials with detailed logging
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
        const missingCreds = {
          accessKey: !process.env.AWS_ACCESS_KEY_ID,
          secretKey: !process.env.AWS_SECRET_ACCESS_KEY,
          region: !process.env.AWS_REGION
        };
        
        console.error('[DynamoDB] Missing required AWS credentials:', {
          time: new Date().toISOString(),
          missing: missingCreds,
          attempt: DynamoDBService.initializationState.attempts
        });
        
        throw new Error(`Missing AWS credentials: ${Object.entries(missingCreds)
          .filter(([_, isMissing]) => isMissing)
          .map(([key]) => key)
          .join(', ')}`);
      }

      // Store the client configuration
      this.clientConfig = {
        region: process.env.AWS_REGION,
        ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      };

      console.log('[DynamoDB] Creating DynamoDB client:', {
        time: new Date().toISOString(),
        config: {
          region: this.clientConfig.region,
          hasEndpoint: !!this.clientConfig.endpoint,
          hasCredentials: !!this.clientConfig.credentials,
          credentialsLength: {
            accessKey: process.env.AWS_ACCESS_KEY_ID?.length || 0,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY?.length || 0
          }
        },
        attempt: DynamoDBService.initializationState.attempts,
        duration: Date.now() - startTime
      });

      const client = new DynamoDBClient(this.clientConfig);
      this.dynamodb = DynamoDBDocumentClient.from(client);
      
      // Test the connection immediately with retries
      console.log('[DynamoDB] Testing connection...', {
        time: new Date().toISOString(),
        attempt: DynamoDBService.initializationState.attempts,
        duration: Date.now() - startTime
      });

      let isConnected = false;
      let retryCount = 0;
      const maxRetries = 3;
      const retryResults = [];
      
      while (!isConnected && retryCount < maxRetries) {
        try {
          const attemptStartTime = Date.now();
          isConnected = await this.testConnection();
          const attemptDuration = Date.now() - attemptStartTime;
          
          retryResults.push({
            attempt: retryCount + 1,
            success: isConnected,
            duration: attemptDuration,
            timestamp: new Date().toISOString()
          });

          if (!isConnected) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.warn(`[DynamoDB] Connection test failed, retrying:`, {
                time: new Date().toISOString(),
                retryCount,
                maxRetries,
                attempts: retryResults,
                nextRetryIn: 1000 * retryCount
              });
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          } else {
            console.log('[DynamoDB] Connection test succeeded:', {
              time: new Date().toISOString(),
              attempts: retryResults,
              totalDuration: Date.now() - startTime
            });
          }
        } catch (error) {
          retryCount++;
          retryResults.push({
            attempt: retryCount,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString()
          });

          console.error(`[DynamoDB] Connection test error:`, {
            time: new Date().toISOString(),
            retryCount,
            maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            attempts: retryResults
          });

          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      if (!isConnected) {
        throw new Error('Failed to connect to DynamoDB after multiple attempts');
      }

      this.isInitialized = true;
      console.log('[DynamoDB] Service initialized successfully:', {
        time: new Date().toISOString(),
        duration: Date.now() - startTime,
        attempts: retryResults,
        state: {
          isInitialized: this.isInitialized,
          hasClient: !!this.dynamodb,
          region: this.clientConfig.region
        }
      });

    } catch (error) {
      this.dynamodb = null;
      this.isInitialized = false;
      this.initializationPromise = null;
      DynamoDBService.initializationState.isInProgress = false;
      DynamoDBService.initializationState.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      console.error('[DynamoDB] Service initialization failed:', {
        time: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        state: DynamoDBService.initializationState,
        config: {
          region: this.clientConfig?.region,
          hasEndpoint: !!this.clientConfig?.endpoint,
          hasCredentials: !!this.clientConfig?.credentials
        }
      });
      
      throw error;
    }
  }

  private async ensureInitialized() {
    console.log('[DynamoDB] EnsureInitialized called:', {
      time: new Date().toISOString(),
      isInitialized: this.isInitialized,
      hasClient: !!this.dynamodb,
      hasInitPromise: !!this.initializationPromise,
      state: DynamoDBService.initializationState
    });

    // If already initialized, return immediately
    if (this.isInitialized && this.dynamodb) {
      return;
    }

    // If initialization is in progress, wait for it with timeout
    if (this.initializationPromise) {
      try {
        await Promise.race<void>([
          this.initializationPromise,
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Waiting for initialization timed out after 5s')), 5000)
          )
        ]);
      } catch (error) {
        // Clear failed initialization
        this.isInitialized = false;
        this.dynamodb = null;
        this.initializationPromise = null;
        
        logger.error('[DynamoDB] Initialization wait failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    }

    // If not initialized and no initialization in progress, start new one
    if (!this.isInitialized) {
      logger.info('[DynamoDB] Starting new initialization...');
      this.initializationPromise = Promise.race<void>([
        this.initializeClient(),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('New initialization timed out after 10s')), 10000)
        )
      ]);
      
      try {
        await this.initializationPromise;
      } catch (error) {
        logger.error('[DynamoDB] New initialization failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    }

    if (!this.isInitialized || !this.dynamodb) {
      throw new Error('DynamoDB service failed to initialize after attempts');
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
      const tables = [
        { name: TableNames.Messages, envVar: process.env.DYNAMODB_MESSAGES_TABLE },
        { name: TableNames.GroupChats, envVar: process.env.DYNAMODB_GROUP_CHATS_TABLE },
        { name: TableNames.Users, envVar: process.env.DYNAMODB_USERS_TABLE }
      ];

      // Log full connection details
      console.log('[DynamoDB] Connection test started:', {
        time: new Date().toISOString(),
        attempt: DynamoDBService.initializationState.attempts,
        clientConfig: {
          region: this.clientConfig?.region,
          endpoint: process.env.AWS_ENDPOINT,
          credentials: {
            hasAccessKey: !!this.clientConfig?.credentials?.accessKeyId,
            hasSecretKey: !!this.clientConfig?.credentials?.secretAccessKey,
            accessKeyLength: this.clientConfig?.credentials?.accessKeyId?.length,
            secretKeyLength: this.clientConfig?.credentials?.secretAccessKey?.length
          }
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
          railwayRegion: process.env.RAILWAY_REGION,
          awsRegion: process.env.AWS_REGION,
          railwayServiceId: process.env.RAILWAY_SERVICE_ID,
          railwayProjectId: process.env.RAILWAY_PROJECT_ID,
          hasEndpoint: !!process.env.AWS_ENDPOINT
        },
        tables: tables.map(t => ({
          name: t.name,
          envVar: t.envVar,
          isConfigured: !!t.envVar
        }))
      });

      // Test each critical table
      for (const table of tables) {
        const tableStartTime = Date.now();
        console.log(`[DynamoDB] Testing table ${table.name}:`, {
          time: new Date().toISOString(),
          tableName: table.name,
          envVar: table.envVar
        });

        try {
          const describeCommand = new DescribeTableCommand({
            TableName: table.name
          });
          
          console.log(`[DynamoDB] Sending describe command for ${table.name}:`, {
            time: new Date().toISOString(),
            command: 'DescribeTable',
            tableName: table.name
          });

          const result = await this.dynamodb!.send(describeCommand);
          const tableLatency = Date.now() - tableStartTime;

          console.log(`[DynamoDB] Table ${table.name} check succeeded:`, {
            time: new Date().toISOString(),
            tableName: table.name,
            status: result.Table?.TableStatus,
            itemCount: result.Table?.ItemCount,
            latencyMs: tableLatency,
            region: this.clientConfig?.region
          });
        } catch (error) {
          const errorDetails = {
            time: new Date().toISOString(),
            tableName: table.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            errorCode: (error as any)?.name || 'Unknown',
            statusCode: (error as any)?.statusCode,
            region: this.clientConfig?.region,
            requestId: (error as any)?.requestId,
            cfId: (error as any)?.cfId,
            attempt: DynamoDBService.initializationState.attempts
          };

          console.error(`[DynamoDB] Table ${table.name} check failed:`, errorDetails);
          return false;
        }
      }

      const totalLatency = Date.now() - startTime;
      console.log('[DynamoDB] Connection test completed successfully:', {
        time: new Date().toISOString(),
        totalLatencyMs: totalLatency,
        tablesChecked: tables.length,
        allTablesAccessible: true,
        region: this.clientConfig?.region
      });

      return true;
    } catch (error) {
      const errorDetails = {
        time: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorCode: (error as any)?.name || 'Unknown',
        statusCode: (error as any)?.statusCode,
        stack: error instanceof Error ? error.stack : undefined,
        region: this.clientConfig?.region,
        requestId: (error as any)?.requestId,
        cfId: (error as any)?.cfId,
        attempt: DynamoDBService.initializationState.attempts,
        clientState: {
          isInitialized: this.isInitialized,
          hasClient: !!this.dynamodb,
          hasConfig: !!this.clientConfig,
          configRegion: this.clientConfig?.region
        }
      };

      console.error('[DynamoDB] Connection test failed:', errorDetails);
      return false;
    }
  }
}