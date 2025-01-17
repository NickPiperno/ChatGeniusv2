import { 
  DynamoDBClient, 
  DynamoDBClientConfig,
  DescribeTableCommand,
  DescribeTableCommandOutput,
  ScanCommand,
  ScanCommandOutput,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  AttributeValue,
  PutItemCommand,
  DeleteItemCommand
} from '@aws-sdk/client-dynamodb';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { logger } from '../logger';
import { Message, MessageAttachment } from '../../types/models/message';

// Table names until we can import from constants
const TableNames = {
  GroupChats: process.env.DYNAMODB_TABLE_GROUPS || 'groups',
  Messages: process.env.DYNAMODB_TABLE_MESSAGES || 'messages',
  Users: process.env.DYNAMODB_TABLE_USERS || 'users'
};

const CONNECTION_TIMEOUT_MS = 5000;
const OPERATION_TIMEOUT_MS = 10000;

interface ConnectionMetrics {
  startTime: number;
  initDuration?: number;
  lastAttemptDuration?: number;
  totalAttempts: number;
  lastError?: string;
}

interface DynamoDBConfig {
  region: string;
  credentials: AwsCredentialIdentity;
  tableName: string;
}

interface GroupItem {
  userId: { S: string };
  groupId: { S: string };
  name: { S: string };
  createdAt: { S: string };
  members?: { SS: string[] };
  [key: string]: { S: string } | { N: string } | { BOOL: boolean } | { SS: string[] } | undefined;
}

interface UserItem {
  id: { S: string };
  email: { S: string };
  name: { S: string };
  createdAt: { S: string };
  status?: { S: 'online' | 'away' | 'busy' | 'offline' };
}

interface UserCreateInput {
  id: string;
  email: string;
  auth0Id: string;
  displayName: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: number;
}

interface GroupChatCreateInput {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  members: string[];
  metadata: Record<string, any>;
}

interface MessageInput {
  id: string;
  content: string;
  userId: string;
  displayName: string;
  imageUrl: string;
  groupId: string;
  timestamp: string;
  reactions: Record<string, any>;
  attachments: any[];
  metadata: Record<string, any>;
  replyCount: number;
  parentId?: string;
  sender: {
    id: string;
    displayName: string;
    imageUrl: string;
  };
  replies: any[];
}

export interface MessageItem {
  id: { S: string };
  content: { S: string };
  userId: { S: string };
  displayName: { S: string };
  imageUrl: { S: string };
  groupId: { S: string };
  timestamp: { S: string };
  reactions: { M: Record<string, AttributeValue> };
  attachments: { L: AttributeValue[] };
  metadata: { M: Record<string, AttributeValue> };
  replyCount: { N: string };
  parentId?: { S: string };
  sender: { M: Record<string, AttributeValue> };
  replies: { L: AttributeValue[] };
}

interface UserUpdateInput {
  displayName?: string;
  imageUrl?: string;
  lastActiveAt?: number;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

export function convertToMessage(item: MessageItem): Message {
  const sender = item.sender.M;
  if (!sender.id?.S || !sender.displayName?.S || !sender.imageUrl?.S) {
    throw new Error('Invalid sender data in message item');
  }

    return {
    id: item.id.S,
    groupId: item.groupId.S,
    content: item.content.S,
    userId: item.userId.S,
    displayName: item.displayName.S,
    imageUrl: item.imageUrl.S,
    timestamp: item.timestamp.S,
    reactions: item.reactions.M,
    attachments: item.attachments.L.map((a: AttributeValue) => a.M as unknown as MessageAttachment),
    metadata: item.metadata.M,
    replyCount: parseInt(item.replyCount.N),
    parentId: item.parentId?.S,
      sender: {
      id: sender.id.S,
      displayName: sender.displayName.S,
      imageUrl: sender.imageUrl.S
      },
      replies: []
    }
  }

export class DynamoDBService {
  private static instance: DynamoDBService | null = null;
  private initializationPromise: Promise<void> | null = null;
  private client: DynamoDBClient;
  private config: DynamoDBConfig;
  private metrics: ConnectionMetrics = {
    startTime: Date.now(),
    totalAttempts: 0
  };

  private constructor() {
    // Ensure credentials are provided
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required');
    }

    // Explicitly set region based on environment
    const region = process.env.AWS_REGION || 'us-east-2';
    
    // Log all relevant configuration
    logger.info('[DynamoDB] Configuration:', {
      region,
      railwayRegion: process.env.RAILWAY_REGION,
      environment: process.env.NODE_ENV,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      tables: {
        groups: TableNames.GroupChats,
        messages: TableNames.Messages,
        users: TableNames.Users
      }
    });
    
    this.config = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      tableName: TableNames.GroupChats
    };

    const clientConfig: DynamoDBClientConfig = {
      region: this.config.region,
      credentials: this.config.credentials,
      maxAttempts: 3,
      retryMode: 'standard'
    };

    this.client = new DynamoDBClient(clientConfig);
  }

  public static async getInstance(): Promise<DynamoDBService> {
    if (!DynamoDBService.instance) {
      DynamoDBService.instance = new DynamoDBService();
      await DynamoDBService.instance.initialize();
    }
    return DynamoDBService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const initStart = Date.now();
      try {
        logger.info(`[DynamoDB] Starting initialization at ${new Date().toISOString()}`);
        logger.info(`[DynamoDB] Using AWS region: ${this.config.region}`);
        logger.info(`[DynamoDB] Railway region: ${process.env.RAILWAY_REGION}`);
        
        await this.testConnection();
        
        this.metrics.initDuration = Date.now() - initStart;
        logger.info(`[DynamoDB] Initialization successful after ${this.metrics.initDuration}ms`);
    } catch (error) {
        const typedError = error as Error & {
          code?: string;
          statusCode?: number;
          requestId?: string;
        };
        this.metrics.lastError = typedError.message;
        logger.error(`[DynamoDB] Initialization failed after ${Date.now() - initStart}ms:`, {
          error: typedError.message,
          code: typedError.code,
          statusCode: typedError.statusCode,
          requestId: typedError.requestId
        });
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  private async testConnection(): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[DynamoDB] Connection attempt #${attempt}`, {
          region: this.config.region,
          tableName: this.config.tableName,
          attempt,
          maxRetries
        });
        
        // Test all tables to ensure complete connectivity
        const tables = [TableNames.GroupChats, TableNames.Messages, TableNames.Users];
        
        for (const table of tables) {
          const params = {
            TableName: table
          };
          
          const command = new DescribeTableCommand(params);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS);
          });

          const result = await Promise.race([
            this.client.send(command),
            timeoutPromise
          ]) as DescribeTableCommandOutput;

          logger.info(`[DynamoDB] Table check successful:`, {
            table,
            status: result.Table?.TableStatus,
            itemCount: result.Table?.ItemCount
          });
        }

        logger.info(`[DynamoDB] All tables verified successfully on attempt ${attempt}`);
        return;
      } catch (error) {
        const typedError = error as Error & {
          code?: string;
          statusCode?: number;
          requestId?: string;
        };

        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 5000);
        
        logger.error(`[DynamoDB] Connection attempt ${attempt} failed:`, {
          error: typedError.message,
          code: typedError.code,
          statusCode: typedError.statusCode,
          requestId: typedError.requestId,
          region: this.config.region,
          nextRetryIn: attempt < maxRetries ? `${delay}ms` : 'no more retries',
          credentials: {
            hasAccessKey: !!this.config.credentials.accessKeyId,
            hasSecretKey: !!this.config.credentials.secretAccessKey,
            accessKeyLength: this.config.credentials.accessKeyId?.length,
            secretKeyLength: this.config.credentials.secretAccessKey?.length
          }
        });

        if (attempt === maxRetries) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  public async getGroupsByUserId(userId: string): Promise<GroupItem[]> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting getGroupsByUserId for user ${userId}`);
    
    try {
      const params = {
        TableName: this.config.tableName,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: userId }
        }
      };

      logger.info(`[DynamoDB] Scanning table ${this.config.tableName} with params:`, params);
      
      const scanPromise = this.client.send(new ScanCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([scanPromise, operationTimeoutPromise]) as ScanCommandOutput;
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Scan completed in ${duration}ms. Found ${result.Items?.length ?? 0} items`);
      
      return (result.Items || []) as GroupItem[];
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Scan failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async getGroupById(groupId: string): Promise<GroupItem | null> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting getGroupById for group ${groupId}`);
    
    try {
      const params = {
        TableName: this.config.tableName,
        Key: {
          groupId: { S: groupId }
        }
      };

      logger.info(`[DynamoDB] Getting item from table ${this.config.tableName}`);
      
      const getItemPromise = this.client.send(new GetItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([getItemPromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] GetItem completed in ${duration}ms`);
      
      return result.Item as GroupItem || null;
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] GetItem failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async ensureUserInGroup(userId: string, groupId: string): Promise<boolean> {
    const group = await this.getGroupById(groupId);
    if (!group) {
      logger.error(`[DynamoDB] Group ${groupId} not found`);
      return false;
    }

    // Check if user is in group's members list
    const members = group.members?.SS || [];
    return members.includes(userId);
  }

  public async getMessagesForGroup(groupId: string, limit: number = 50): Promise<any[]> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting getMessagesForGroup for group ${groupId}`);
    
    try {
      const params = {
        TableName: TableNames.Messages,
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: {
          ':groupId': { S: groupId }
        },
        Limit: limit,
        ScanIndexForward: false // Get most recent messages first
      };

      logger.info(`[DynamoDB] Querying table ${TableNames.Messages} for messages`);
      
      const queryPromise = this.client.send(new QueryCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([queryPromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Query completed in ${duration}ms. Found ${result.Items?.length ?? 0} messages`);
      
      return result.Items || [];
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Query failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async getAllUsers(): Promise<UserItem[]> {
    const operationStart = Date.now();
    logger.info('[DynamoDB] Starting getAllUsers');
    
    try {
      const params = {
        TableName: TableNames.Users
      };

      const scanPromise = this.client.send(new ScanCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([scanPromise, operationTimeoutPromise]) as ScanCommandOutput;
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Scan completed in ${duration}ms. Found ${result.Items?.length ?? 0} users`);
      
      return (result.Items || []).map(item => ({
        id: { S: item.id?.S || '' },
        email: { S: item.email?.S || '' },
        name: { S: item.name?.S || '' },
        createdAt: { S: item.createdAt?.S || '' },
        ...(item.status?.S && { status: { S: item.status.S as 'online' | 'away' | 'busy' | 'offline' } })
      }));
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Scan failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async getAllGroups(): Promise<GroupItem[]> {
    const operationStart = Date.now();
    logger.info('[DynamoDB] Starting getAllGroups');
    
    try {
      const params = {
        TableName: this.config.tableName
      };

      logger.info(`[DynamoDB] Scanning table ${this.config.tableName}`);
      
      const scanPromise = this.client.send(new ScanCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([scanPromise, operationTimeoutPromise]) as ScanCommandOutput;
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Scan completed in ${duration}ms. Found ${result.Items?.length ?? 0} groups`);
      
      return (result.Items || []).map(item => ({
        userId: item.userId as { S: string },
        groupId: item.groupId as { S: string },
        name: item.name as { S: string },
        createdAt: item.createdAt as { S: string },
        members: item.members as { SS: string[] }
      }));
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Scan failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async updateGroup(groupId: string, updates: { members: string[], updatedAt: string, name?: string }) {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting updateGroup for group ${groupId}`);
    
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeValues: Record<string, AttributeValue> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (updates.name !== undefined) {
        updateExpressions.push('#name = :name');
        expressionAttributeValues[':name'] = { S: updates.name };
        expressionAttributeNames['#name'] = 'name';
      }

      if (updates.members) {
        updateExpressions.push('#members = :members');
        expressionAttributeValues[':members'] = { SS: updates.members };
        expressionAttributeNames['#members'] = 'members';
      }

      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeValues[':updatedAt'] = { S: updates.updatedAt };
      expressionAttributeNames['#updatedAt'] = 'updatedAt';

      const params = {
        TableName: TableNames.GroupChats,
        Key: {
          groupId: { S: groupId }
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW' as const
      };

      const updatePromise = this.client.send(new UpdateItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([updatePromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Group updated in ${duration}ms`);
      
      return result.Attributes as GroupItem;
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Update group failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async deleteGroup(groupId: string): Promise<void> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting deleteGroup for group ${groupId}`);
    
    try {
      const params = {
        TableName: TableNames.GroupChats,
        Key: {
          groupId: { S: groupId }
        }
      };

      const deletePromise = this.client.send(new DeleteItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      await Promise.race([deletePromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Group deleted in ${duration}ms`);
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Delete group failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async createUser(input: UserCreateInput): Promise<UserItem> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting createUser for user ${input.id}`);
    
    try {
      const params = {
        TableName: TableNames.Users,
        Item: {
          id: { S: input.id },
          email: { S: input.email },
          auth0Id: { S: input.auth0Id },
          displayName: { S: input.displayName },
          imageUrl: { S: input.imageUrl },
          createdAt: { S: input.createdAt },
          updatedAt: { S: input.updatedAt },
          lastActiveAt: { N: input.lastActiveAt.toString() }
        }
      };

      logger.info(`[DynamoDB] Putting item in table ${TableNames.Users}`);
      
      const putItemPromise = this.client.send(new PutItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      await Promise.race([putItemPromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] User created in ${duration}ms`);

    return {
        id: { S: input.id },
        email: { S: input.email },
        name: { S: input.displayName },
        createdAt: { S: input.createdAt }
      };
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Create user failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async createGroupChat(input: GroupChatCreateInput): Promise<GroupItem> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting createGroupChat for group ${input.id}`);
    
    try {
      const params = {
        TableName: this.config.tableName,
        Item: {
          groupId: { S: input.id },
          name: { S: input.name },
          userId: { S: input.userId },
          createdAt: { S: input.createdAt },
          updatedAt: { S: input.updatedAt },
          members: { SS: input.members },
          metadata: { M: Object.entries(input.metadata).reduce((acc, [key, value]) => {
            acc[key] = { S: JSON.stringify(value) };
            return acc;
          }, {} as Record<string, AttributeValue>) }
        }
      };

      logger.info(`[DynamoDB] Putting item in table ${this.config.tableName}`);
      
      const putItemPromise = this.client.send(new PutItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      await Promise.race([putItemPromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Group created in ${duration}ms`);
      
    return {
        groupId: { S: input.id },
        name: { S: input.name },
        userId: { S: input.userId },
        createdAt: { S: input.createdAt },
        members: { SS: input.members }
      };
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Create group failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async createMessage(input: MessageInput): Promise<MessageItem> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting createMessage for message ${input.id}`);
    
    try {
      const params = {
      TableName: TableNames.Messages,
        Item: {
          id: { S: input.id },
          content: { S: input.content },
          userId: { S: input.userId },
          displayName: { S: input.displayName },
          imageUrl: { S: input.imageUrl },
          groupId: { S: input.groupId },
          timestamp: { S: input.timestamp },
          reactions: { M: Object.entries(input.reactions).reduce((acc, [key, value]) => {
            acc[key] = { S: JSON.stringify(value) };
            return acc;
          }, {} as Record<string, AttributeValue>) },
          attachments: { L: input.attachments.map(attachment => ({ S: JSON.stringify(attachment) })) },
          metadata: { M: Object.entries(input.metadata).reduce((acc, [key, value]) => {
            acc[key] = { S: JSON.stringify(value) };
            return acc;
          }, {} as Record<string, AttributeValue>) },
          replyCount: { N: input.replyCount.toString() },
          ...(input.parentId ? { parentId: { S: input.parentId } } : {}),
          sender: { M: {
            id: { S: input.sender.id },
            displayName: { S: input.sender.displayName },
            imageUrl: { S: input.sender.imageUrl }
          }},
          replies: { L: input.replies.map(reply => ({ S: JSON.stringify(reply) })) }
        }
      };

      logger.info(`[DynamoDB] Putting message in table ${TableNames.Messages}`);
      
      const putItemPromise = this.client.send(new PutItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      await Promise.race([putItemPromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] Message created in ${duration}ms`);
      
      return params.Item as MessageItem;
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Create message failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async updateUser(userId: string, updates: UserUpdateInput): Promise<UserItem> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting updateUser for user ${userId}`);
    
    try {
      // Build update expression and attribute values
      const updateExpressions: string[] = [];
      const expressionAttributeValues: Record<string, AttributeValue> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (updates.displayName !== undefined) {
        updateExpressions.push('#displayName = :displayName');
        expressionAttributeValues[':displayName'] = { S: updates.displayName };
        expressionAttributeNames['#displayName'] = 'displayName';
      }

      if (updates.imageUrl !== undefined) {
        updateExpressions.push('#imageUrl = :imageUrl');
        expressionAttributeValues[':imageUrl'] = { S: updates.imageUrl };
        expressionAttributeNames['#imageUrl'] = 'imageUrl';
      }

      if (updates.lastActiveAt !== undefined) {
        updateExpressions.push('#lastActiveAt = :lastActiveAt');
        expressionAttributeValues[':lastActiveAt'] = { N: updates.lastActiveAt.toString() };
        expressionAttributeNames['#lastActiveAt'] = 'lastActiveAt';
      }

      // Add updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeValues[':updatedAt'] = { S: new Date().toISOString() };
      expressionAttributeNames['#updatedAt'] = 'updatedAt';

      const params = {
        TableName: TableNames.Users,
        Key: {
          id: { S: userId }
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW' as const
      };

      logger.info(`[DynamoDB] Updating user in table ${TableNames.Users}`, {
        userId,
        updates: Object.keys(updates)
      });
      
      const updatePromise = this.client.send(new UpdateItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([updatePromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] User updated in ${duration}ms`);
      
      // Cast the result to UserItem, ensuring required fields are present
      const attributes = result.Attributes as Record<string, AttributeValue>;
      if (!attributes?.id?.S || !attributes?.email?.S || !attributes?.name?.S || !attributes?.createdAt?.S) {
        throw new Error('Missing required fields in user attributes');
      }

    return {
        id: { S: attributes.id.S },
        email: { S: attributes.email.S },
        name: { S: attributes.name.S },
        createdAt: { S: attributes.createdAt.S }
      };
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Update user failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async getUserById(userId: string): Promise<UserItem | null> {
    const operationStart = Date.now();
    logger.info(`[DynamoDB] Starting getUserById for user ${userId}`);
    
    try {
      const params = {
        TableName: TableNames.Users,
        Key: {
          id: { S: userId }
        }
      };

      logger.info(`[DynamoDB] Getting user from table ${TableNames.Users}`);
      
      const getItemPromise = this.client.send(new GetItemCommand(params));
      const operationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT_MS);
      });

      const result = await Promise.race([getItemPromise, operationTimeoutPromise]);
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] GetItem completed in ${duration}ms`);
      
      if (!result.Item) {
        return null;
      }

      const item = result.Item;
      if (!item.id?.S || !item.email?.S || !item.name?.S || !item.createdAt?.S) {
        logger.error('[DynamoDB] Missing required fields in user item:', item);
        throw new Error('Missing required fields in user item');
      }

      return {
        id: { S: item.id.S },
        email: { S: item.email.S },
        name: { S: item.name.S },
        createdAt: { S: item.createdAt.S }
      };
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] GetItem failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }

  public async updateAllGroupsWithAllUsers(): Promise<void> {
    const operationStart = Date.now();
    logger.info('[DynamoDB] Starting updateAllGroupsWithAllUsers');
    
    try {
      // Get all users first
      const allUsers = await this.getAllUsers();
      const userIds = allUsers.map(user => user.id.S);

      // Get all groups
      const allGroups = await this.getAllGroups();
      
      // Update each group with all users as members
      for (const group of allGroups) {
        await this.updateGroup(group.groupId.S, {
          members: userIds,
          updatedAt: new Date().toISOString(),
          name: group.name.S // Preserve existing name
        });
        logger.info(`[DynamoDB] Updated group ${group.groupId.S} with all users`);
      }
      
      const duration = Date.now() - operationStart;
      logger.info(`[DynamoDB] All groups updated with all users in ${duration}ms`);
    } catch (error) {
      const typedError = error as Error & {
        code?: string;
        statusCode?: number;
        requestId?: string;
        time?: Date;
        retryable?: boolean;
      };
      
      const duration = Date.now() - operationStart;
      logger.error(`[DynamoDB] Update all groups failed after ${duration}ms:`, {
        error: typedError.message,
        code: typedError.code,
        statusCode: typedError.statusCode,
        requestId: typedError.requestId,
        time: typedError.time,
        retryable: typedError.retryable,
        metrics: this.metrics
      });
      throw error;
    }
  }
}