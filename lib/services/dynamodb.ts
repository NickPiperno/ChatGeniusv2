import { 
  DynamoDBClient, 
  DynamoDBClientConfig 
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
import { Message, MessageUpdate } from '@/types/models/message'
import { User } from '@/types/models/user'
import { 
  GroupChat, 
  FileMetadata, 
  Notification, 
  UserStatus, 
  TypingIndicator, 
  Reaction, 
  PinnedMessage, 
  Mention
} from '@/types/models/dynamodb'

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

// Validate required credentials
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
  console.error('[DynamoDB] Missing required AWS credentials:', {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    hasRegion: !!process.env.AWS_REGION
  })
  throw new Error('Missing required AWS credentials or region')
}

let client: DynamoDBClient
let dynamodb: DynamoDBDocumentClient

try {
  client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  // Log DynamoDB initialization
  console.log('[DynamoDB] Client initialized with region:', process.env.AWS_REGION)

  dynamodb = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: true
    }
  });

  console.log('[DynamoDB] Document client initialized successfully')
} catch (error) {
  console.error('[DynamoDB] Error initializing DynamoDB client:', {
    error,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  })
  throw error
}

const TableNames = {
  Messages: process.env.DYNAMODB_MESSAGES_TABLE || 'dev_Messages-np',
  GroupChats: process.env.DYNAMODB_GROUP_CHATS_TABLE || 'dev_GroupChats',
  FileMetadata: process.env.DYNAMODB_FILE_METADATA_TABLE || 'dev_FileMetadata',
  Users: process.env.DYNAMODB_USERS_TABLE || 'dev_Users',
  Notifications: process.env.DYNAMODB_NOTIFICATIONS_TABLE || 'dev_Notifications',
  UserStatus: process.env.DYNAMODB_USER_STATUS_TABLE || 'dev_UserStatus',
  TypingIndicators: process.env.DYNAMODB_TYPING_INDICATORS_TABLE || 'dev_TypingIndicators',
  Reactions: process.env.DYNAMODB_REACTIONS_TABLE || 'dev_Reactions',
  PinnedMessages: process.env.DYNAMODB_PINNED_MESSAGES_TABLE || 'dev_PinnedMessages',
  Mentions: process.env.DYNAMODB_MENTIONS_TABLE || 'dev_Mentions',
  ThreadReadStatus: process.env.DYNAMODB_THREAD_READ_STATUS_TABLE || 'dev_ThreadReadStatus'
};

interface ThreadReadStatus {
  userId: string
  messageId: string
  lastReadTimestamp: string
}

interface DynamoDBMessage {
  id: string
  groupId: string
  content: string
  senderId: string
  senderName: string
  senderImageUrl?: string
  timestamp: string
  reactions: Record<string, any>
  attachments: any[]
  metadata?: Record<string, any>
  replyCount: number
  parentId?: string
}

// Make convertToMessage function public
export function convertToMessage(item: DynamoDBMessage): Message {
  return {
    id: item.id,
    groupId: item.groupId,
    content: item.content,
    senderId: item.senderId,
    senderName: item.senderName,
    senderImageUrl: item.senderImageUrl,
    timestamp: item.timestamp,
    reactions: item.reactions || {},
    attachments: item.attachments || [],
    metadata: item.metadata || {},
    replyCount: item.replyCount || 0,
    ...(item.parentId && { parentId: item.parentId }),
    sender: {
      id: item.senderId,
      name: item.senderName,
      imageUrl: item.senderImageUrl || ''
    },
    replies: []
  }
}

export class DynamoDBService {
  private dynamodb: DynamoDBClient

  constructor() {
    console.log('[DynamoDB] Initializing service...')
    
    // Initialize the DynamoDB client
    this.dynamodb = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    })
    
    console.log('[DynamoDB] Service initialized')
  }

  // Add send method with proper typing
  async send<T = any>(command: any): Promise<T> {
    console.log('[DynamoDB] Executing command:', {
      commandName: command?.constructor?.name,
      tableName: command?.input?.TableName
    })
    
    if (!this.dynamodb) {
      console.error('[DynamoDB] Client not initialized')
      throw new Error('DynamoDB client not initialized')
    }
    
    try {
      const result = await this.dynamodb.send(command)
      console.log('[DynamoDB] Command executed successfully')
      return result as T
    } catch (error) {
      console.error('[DynamoDB] Command execution failed:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        command: command?.constructor?.name
      })
      throw error
    }
  }

  // Messages
  async createMessage(message: Message): Promise<Message> {
    console.log('[DynamoDB] Creating message:', message)

    const item = {
      id: message.id,
      groupId: message.groupId,
      content: message.content,
      senderId: message.senderId,
      senderName: message.senderName,
      senderImageUrl: message.senderImageUrl,
      timestamp: message.timestamp,
      reactions: message.reactions || {},
      attachments: message.attachments || [],
      metadata: message.metadata || {},
      replyCount: 0,
      ...(message.parentId && { parentId: message.parentId })
    }

    await dynamodb.send(new PutCommand({
      TableName: TableNames.Messages,
      Item: item
    }))

    return item
  }

  async createReply(reply: Message): Promise<void> {
    console.log('[DynamoDB] Creating reply:', {
      id: reply.id,
      parentId: reply.parentId,
      content: reply.content.substring(0, 50)
    })
    
    try {
      // First create the reply message
      await this.createMessage(reply)

      // Then increment the parent message's replyCount
      if (reply.parentId) {
        await dynamodb.send(new UpdateCommand({
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
      const result = await dynamodb.send(new QueryCommand({
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
      senderId: reply.senderId
    })
    
    try {
      await dynamodb.send(new UpdateCommand({
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
      await dynamodb.send(new PutCommand({
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
      await dynamodb.send(new DeleteCommand({
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
      await dynamodb.send(new PutCommand({
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
      const result = await dynamodb.send(new QueryCommand({
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
      await dynamodb.send(new DeleteCommand({
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
    console.log('[DynamoDB] Creating group chat:', {
      id: groupChat.id,
      name: groupChat.name,
      creatorId: groupChat.creatorId
    })
    
    try {
      const item = {
        ...groupChat,
        members: groupChat.members || [],
        createdAt: groupChat.createdAt || new Date().toISOString(),
        updatedAt: groupChat.updatedAt || new Date().toISOString(),
        metadata: groupChat.metadata || {}
      }

      await dynamodb.send(new PutCommand({
        TableName: TableNames.GroupChats,
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)'
      }))
      
      console.log('[DynamoDB] Successfully created group chat')
      return item
    } catch (error) {
      console.error('[DynamoDB] Error creating group chat:', error)
      throw error
    }
  }

  // Users
  async getUserById(userId: string): Promise<User | null> {
    console.log('[DynamoDB] Getting user by ID:', userId)
    
    try {
      const result = await dynamodb.send(new GetCommand({
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

  async createUser(user: {
    id: string
    clerkId: string
    name: string
    username: string
    email: string
    avatarUrl?: string
    createdAt: number
    preferences: Record<string, any>
  }): Promise<void> {
    console.log('[DynamoDB] Creating user:', {
      id: user.id,
      name: user.name,
      username: user.username
    })
    
    try {
      await dynamodb.send(new PutCommand({
        TableName: TableNames.Users,
        Item: user,
        ConditionExpression: 'attribute_not_exists(id)'
      }))
      
      console.log('[DynamoDB] Successfully created user')
    } catch (error) {
      console.error('[DynamoDB] Error creating user:', error)
      throw error
    }
  }

  async updateUser(userId: string, updates: Partial<{
    name: string
    username: string
    email: string
    avatarUrl: string
    preferences: Record<string, any>
  }>): Promise<void> {
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

      await dynamodb.send(new UpdateCommand({
        TableName: TableNames.Users,
        Key: { id: userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }))
      
      console.log('[DynamoDB] Successfully updated user')
    } catch (error) {
      console.error('[DynamoDB] Error updating user:', error)
      throw error
    }
  }

  async deleteUser(userId: string): Promise<void> {
    console.log('[DynamoDB] Deleting user:', userId)
    
    try {
      await dynamodb.send(new DeleteCommand({
        TableName: TableNames.Users,
        Key: { id: userId }
      }))
      
      console.log('[DynamoDB] Successfully deleted user')
    } catch (error) {
      console.error('[DynamoDB] Error deleting user:', error)
      throw error
    }
  }

  async getMessage(messageId: string): Promise<Message | null> {
    console.log('[DynamoDB] Getting message:', messageId)
    
    try {
      const result = await dynamodb.send(new GetCommand({
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
      const result = await dynamodb.send(new QueryCommand({
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
      const result = await dynamodb.send(new QueryCommand({
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

      await dynamodb.send(new UpdateCommand({
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
      await dynamodb.send(new DeleteCommand({
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

      await dynamodb.send(new UpdateCommand({
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
      await dynamodb.send(new DeleteCommand({
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
      const result = await dynamodb.send(new QueryCommand({
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
      await dynamodb.send(new PutCommand({
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
      const result = await dynamodb.send(new QueryCommand({
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
      return await operation()
    } catch (error) {
      console.error('[DynamoDB] Operation failed:', error)
      throw error
    }
  }

  async getGroupsByUserId(userId: string): Promise<GroupChat[]> {
    console.log('[DynamoDB] Getting groups for user:', userId)

    const result = await dynamodb.send(new ScanCommand({
      TableName: TableNames.GroupChats,
      FilterExpression: 'contains(members, :userId)',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }))

    console.log('[DynamoDB] Raw groups data:', result.Items)

    const groups = result.Items as GroupChat[] || []
    
    // Specifically log the baby group if found
    const babyGroup = groups.find(g => g.name === 'baby')
    if (babyGroup) {
      console.log('[DynamoDB] Found baby group in scan:', {
        id: babyGroup.id,
        name: babyGroup.name,
        creatorId: babyGroup.creatorId,
        members: babyGroup.members,
        createdAt: babyGroup.createdAt,
        updatedAt: babyGroup.updatedAt,
        allFields: Object.keys(babyGroup)
      })
    }

    console.log('[DynamoDB] Processed groups:', groups.map(g => ({
      id: g.id,
      name: g.name,
      creatorId: g.creatorId,
      members: g.members
    })))

    return groups
  }

  async getGroupById(groupId: string): Promise<GroupChat | null> {
    console.log('[DynamoDB] Getting group by ID:', groupId)
    
    try {
      const result = await dynamodb.send(new GetCommand({
        TableName: TableNames.GroupChats,
        Key: { id: groupId }
      }))
      
      // Add more detailed logging for the baby group
      if (result.Item && result.Item.name === 'baby') {
        console.log('[DynamoDB] Found baby group details:', {
          id: result.Item.id,
          name: result.Item.name,
          creatorId: result.Item.creatorId,
          members: result.Item.members,
          createdAt: result.Item.createdAt,
          updatedAt: result.Item.updatedAt
        })
      }
      
      console.log('[DynamoDB] Group query result:', {
        hasItem: !!result.Item,
        group: result.Item,
        creatorId: result.Item?.creatorId
      })
      
      return result.Item as GroupChat || null
    } catch (error) {
      console.error('[DynamoDB] Error getting group:', error)
      throw error
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
        creatorId: group.creatorId,
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
              await dynamodb.send(new DeleteCommand({
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
      
      await dynamodb.send(deleteCommand)
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

      const result = await dynamodb.send(new UpdateCommand({
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

  async getAllUsers(): Promise<User[]> {
    console.log('[DynamoDB] Fetching all users')
    
    try {
      const result = await dynamodb.send(new ScanCommand({
        TableName: TableNames.Users,
      }))
      
      const users = result.Items?.map(item => ({
        id: item.id,
        name: item.name,
        email: item.email,
        username: item.username,
        fullName: item.fullName || item.name,
        imageUrl: item.avatarUrl || item.imageUrl,
        status: item.status || 'offline',
        isOnline: item.isOnline || false,
        lastActive: item.lastActive ? new Date(item.lastActive) : undefined,
        preferences: item.preferences || {}
      })) || []

      console.log('[DynamoDB] Successfully fetched users:', {
        count: users.length
      })
      
      return users
    } catch (error) {
      console.error('[DynamoDB] Error fetching users:', error)
      throw error
    }
  }

  // Notifications
  async createNotification(notification: {
    userId: string
    type: 'mention' | 'reply' | 'reaction'
    messageId: string
    groupId: string
    actorId: string
    actorName: string
    timestamp: number
    metadata?: Record<string, any>
  }): Promise<void> {
    console.log('[DynamoDB] Creating notification:', notification)

    const item = {
      userId: notification.userId,
      timestamp: notification.timestamp,
      type: notification.type,
      messageId: notification.messageId,
      groupId: notification.groupId,
      actorId: notification.actorId,
      actorName: notification.actorName,
      metadata: notification.metadata || {},
      read: false
    }

    await dynamodb.send(new PutCommand({
      TableName: TableNames.Notifications,
      Item: item
    }))
  }

  async getUnreadNotifications(userId: string): Promise<any[]> {
    console.log('[DynamoDB] Getting unread notifications for user:', userId)
    
    try {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TableNames.Notifications,
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: 'read = :read',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':read': false
        }
      }))

      return result.Items || []
    } catch (error) {
      console.error('[DynamoDB] Error getting unread notifications:', error)
      throw error
    }
  }

  async markNotificationAsRead(userId: string, timestamp: number): Promise<void> {
    console.log('[DynamoDB] Marking notification as read:', { userId, timestamp })
    
    try {
      await dynamodb.send(new UpdateCommand({
        TableName: TableNames.Notifications,
        Key: {
          userId,
          timestamp
        },
        UpdateExpression: 'SET read = :read',
        ExpressionAttributeValues: {
          ':read': true
        }
      }))
    } catch (error) {
      console.error('[DynamoDB] Error marking notification as read:', error)
      throw error
    }
  }
}