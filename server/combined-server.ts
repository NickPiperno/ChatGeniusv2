import { Server, Socket } from 'socket.io'
import { createServer } from 'http'
import next from 'next'
import { parse } from 'url'
import { logger } from '../lib/logger'
import { DynamoDBService } from '../lib/services/dynamodb'
import { Message, MessageUpdate, MessageReaction } from '../types/models/message'

// Types
interface MessageData {
  message: {
    content: string
    userId: string
    displayName: string
    imageUrl?: string
    attachments?: any[]
    metadata?: Record<string, any>
    parentId?: string
    sender?: {
      id: string
      displayName: string
      imageUrl: string
    }
  }
  groupId: string
}

interface ReactionData {
  groupId: string
  messageId: string
  emoji: string
  userId: string
  parentId?: string
  add: boolean
}

// Define socket event types
interface ServerToClientEvents {
  error: (data: { message: string }) => void;
  message: (data: any) => void;
  thread_update: (data: any) => void;
  reaction: (data: any) => void;
  delete_message: (data: { messageId: string }) => void;
  edit_message: (data: { messageId: string; content: string; edited: boolean }) => void;
  thread_sync: (data: { messageId: string; message: Message; replies: Message[] }) => void;
  thread_typing: (data: { messageId: string; userId: string; isTyping: boolean }) => void;
  thread_read: (data: { messageId: string; userId: string; lastReadTimestamp: string }) => void;
  group_name_updated: (data: { groupId: string; name: string }) => void;
}

interface ClientToServerEvents {
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  join_conversation: (data: any) => void;
  leave_conversation: (data: any) => void;
  thread_update: (data: any) => void;
  reaction: (data: any) => void;
  message: (data: any) => void;
  delete_message: (data: { messageId: string; groupId: string }) => void;
  edit_message: (data: { groupId: string; messageId: string; content: string }) => void;
  thread_sync: (data: { groupId: string; messageId: string }) => void;
  thread_typing: (data: { groupId: string; messageId: string; isTyping: boolean }) => void;
  thread_read: (data: { groupId: string; messageId: string; lastReadTimestamp: string }) => void;
  group_name_updated: (data: { groupId: string; name: string }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
}

interface SocketStats {
  connected: boolean;
  connections: number;
  rooms: number;
}

// Initialize Next.js
const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

export async function createCombinedServer() {
  await app.prepare()
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
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

  const dynamoDb = new DynamoDBService()

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    logger.info('[Socket] Client connected:', { socketId: socket.id })

    // Handle joining conversations
    socket.on('join_conversation', async (data: { groupId: string }) => {
      logger.info('[Socket] Client joining conversation:', { 
        socketId: socket.id, 
        groupId: data.groupId,
        previousRooms: Array.from(socket.rooms)
      })
      await socket.join(data.groupId)
      logger.info('[Socket] Client joined conversation:', { 
        socketId: socket.id, 
        groupId: data.groupId,
        currentRooms: Array.from(socket.rooms),
        roomSize: (await io.in(data.groupId).allSockets()).size
      })
    })

    // Handle leaving conversations
    socket.on('leave_conversation', async (data: { groupId: string }) => {
      logger.info('[Socket] Client leaving conversation:', { socketId: socket.id, groupId: data.groupId })
      await socket.leave(data.groupId)
    })

    // Handle new messages
    socket.on('message', async (data: MessageData) => {
      try {
        logger.info('[Socket] New message received:', {
          socketId: socket.id,
          groupId: data.groupId,
          content: data.message.content.substring(0, 50),
          rooms: Array.from(socket.rooms),
          allSockets: Array.from((await io.in(data.groupId).allSockets())).length
        })

        // Save message to DynamoDB
        const messageToSave: Message = {
          id: crypto.randomUUID(),
          groupId: data.groupId,
          content: data.message.content,
          userId: data.message.userId,
          displayName: data.message.displayName,
          imageUrl: data.message.imageUrl || '',
          timestamp: new Date().toISOString(),
          reactions: {},
          attachments: data.message.attachments || [],
          metadata: data.message.metadata || {},
          replyCount: 0,
          parentId: data.message.parentId,
          sender: {
            id: data.message.userId,
            displayName: data.message.displayName,
            imageUrl: data.message.imageUrl || ''
          },
          replies: []
        }

        logger.info('[Socket] Saving message:', {
          messageId: messageToSave.id,
          groupId: messageToSave.groupId
        })

        const savedMessage = await dynamoDb.createMessage(messageToSave)

        logger.info('[Socket] Broadcasting message:', {
          messageId: savedMessage.id,
          groupId: savedMessage.groupId,
          roomSize: (await io.in(data.groupId).allSockets()).size
        })

        // Broadcast to all clients in the room (including sender)
        io.in(data.groupId).emit('message', savedMessage)
      } catch (error) {
        logger.error('[Socket] Error handling message:', error)
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to send message'
        })
      }
    })

    // Handle message deletion
    socket.on('delete_message', async (data: { messageId: string; groupId: string }) => {
      try {
        logger.info('[Socket] Delete message request:', {
          socketId: socket.id,
          messageId: data.messageId,
          groupId: data.groupId
        })

        // Delete message from DynamoDB
        await dynamoDb.deleteMessage(data.messageId)

        // Broadcast deletion to all clients in the room
        io.to(data.groupId).emit('delete_message', {
          messageId: data.messageId
        })
      } catch (error) {
        logger.error('[Socket] Error deleting message:', error)
        socket.emit('error', {
          message: 'Failed to delete message'
        })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('[Socket] Client disconnected:', { socketId: socket.id })
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