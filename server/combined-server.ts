import { Server, Socket } from 'socket.io'
import { createServer } from 'http'
import next from 'next'
import { parse } from 'url'
import { logger } from '../lib/logger'
import { DynamoDBService } from '../lib/services/dynamodb'
import { Message, MessageUpdate } from '../types/models/message'
import crypto from 'crypto'
import { 
  ServerToClientEvents, 
  ClientToServerEvents,
  MessageData,
  ReactionData,
  MessageEvent,
  ReactionEvent,
  MessageUpdateEvent,
  MessageDeleteEvent
} from '../types/events/socket'

// Initialize Next.js
const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
const port = parseInt(process.env.PORT || '8080', 10)

logger.info('[Server] Starting with configuration:', {
  env: process.env.NODE_ENV,
  port,
  hostname,
  railway: {
    environment: process.env.RAILWAY_ENVIRONMENT_NAME,
    region: process.env.RAILWAY_REGION,
    projectId: process.env.RAILWAY_PROJECT_ID,
    serviceId: process.env.RAILWAY_SERVICE_ID
  }
});

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Initialize DynamoDB service
let dynamoDb: DynamoDBService;

async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[Server] Creating DynamoDB instance...');
    dynamoDb = new DynamoDBService();
    // Wait for initialization to complete
    await (dynamoDb as any).initializationPromise;
    logger.info('[Server] DynamoDB instance ready:', {
      isInitialized: dynamoDb.isInitialized
    });
  }
  return dynamoDb;
}

export async function createCombinedServer() {
  await app.prepare()

  // Initialize DynamoDB before creating server
  try {
    dynamoDb = await getDynamoDBInstance();
    logger.info('[Server] DynamoDB initialized successfully');
  } catch (error) {
    logger.error('[Server] Failed to initialize DynamoDB:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Continue server creation even if DynamoDB fails
  }

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      logger.error('Error occurred handling request:', {
        url: req.url,
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(server, {
    path: '/api/socketio',
    transports: ['websocket', 'polling'],
    cors: {
      origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000'
        : process.env.NEXT_PUBLIC_API_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    logger.info('[Socket] Client connected:', {
      socketId: socket.id
    })

    // Join conversation
    socket.on('join_conversation', async (groupId: string) => {
      logger.info('[Socket] Client joining conversation:', {
        socketId: socket.id,
        groupId
      })
      
      socket.join(groupId)
    })

    // Leave conversation
    socket.on('leave_conversation', async (groupId: string) => {
      logger.info('[Socket] Client leaving conversation:', {
        socketId: socket.id,
        groupId
      })
      
      socket.leave(groupId)
    })

    // Handle messages
    socket.on('message', async (data: MessageData) => {
      logger.info('[Socket] Received message:', {
        socketId: socket.id,
        groupId: data.groupId
      })

      try {
        const message = await dynamoDb.createMessage({
          id: crypto.randomUUID(),
          content: data.message.content,
          userId: data.message.userId,
          displayName: data.message.displayName,
          imageUrl: data.message.imageUrl || '',
          groupId: data.groupId,
          timestamp: new Date().toISOString(),
          reactions: {},
          attachments: data.message.attachments || [],
          metadata: data.message.metadata || {},
          replyCount: 0,
          parentId: data.message.parentId,
          sender: data.message.sender || {
            id: data.message.userId,
            displayName: data.message.displayName,
            imageUrl: data.message.imageUrl || ''
          },
          replies: []
        })

        const messageEvent: MessageEvent = {
          message,
          groupId: data.groupId
        }

        socket.to(data.groupId).emit('message', messageEvent)
        
        logger.info('[Socket] Message sent successfully:', {
          messageId: message.id,
          groupId: data.groupId
        })
      } catch (error) {
        logger.error('[Socket] Error sending message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Handle reactions
    socket.on('reaction', async (data: ReactionData) => {
      logger.info('[Socket] Received reaction:', {
        socketId: socket.id,
        messageId: data.messageId,
        emoji: data.emoji
      })

      try {
        const reactionEvent: ReactionEvent = {
          messageId: data.messageId,
          groupId: data.groupId,
          emoji: data.emoji,
          userId: data.userId,
          parentId: data.parentId,
          add: data.add
        }

        socket.to(data.groupId).emit('reaction', reactionEvent)
        
        logger.info('[Socket] Reaction sent successfully:', {
          messageId: data.messageId,
          emoji: data.emoji
        })
      } catch (error) {
        logger.error('[Socket] Error sending reaction:', error)
        socket.emit('error', { message: 'Failed to send reaction' })
      }
    })

    // Handle message edits
    socket.on('edit_message', async (data: MessageUpdateEvent) => {
      logger.info('[Socket] Editing message:', {
        socketId: socket.id,
        messageId: data.messageId
      })

      try {
        socket.to(data.groupId).emit('edit_message', data)
        
        logger.info('[Socket] Message edited successfully:', {
          messageId: data.messageId
        })
      } catch (error) {
        logger.error('[Socket] Error editing message:', error)
        socket.emit('error', { message: 'Failed to edit message' })
      }
    })

    // Handle message deletions
    socket.on('delete_message', async (data: MessageDeleteEvent) => {
      logger.info('[Socket] Deleting message:', {
        socketId: socket.id,
        messageId: data.messageId
      })

      try {
        socket.to(data.groupId).emit('delete_message', data)
        
        logger.info('[Socket] Message deleted successfully:', {
          messageId: data.messageId
        })
      } catch (error) {
        logger.error('[Socket] Error deleting message:', error)
        socket.emit('error', { message: 'Failed to delete message' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('[Socket] Client disconnected:', {
        socketId: socket.id
      })
    })
  })

  return { server, app, io }
}

export async function startServer() {
  const { server } = await createCombinedServer()
  const port = parseInt(process.env.PORT || '3000', 10)
  
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
  
  return server
} 