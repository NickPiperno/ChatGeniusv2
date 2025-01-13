import { Socket, Server as SocketServer } from 'socket.io'
import { Message, MessageUpdate, MessageReaction } from '../types/models/message'
import { DynamoDBMessage } from '../types/models/dynamodb'
import { logger } from '../lib/logger'
import * as dotenv from 'dotenv'

interface ReactionData {
  groupId: string
  messageId: string
  emoji: string
  userId: string
  parentId?: string
  add: boolean
}

interface MessageData {
  message: {
    content: string
    senderId: string
    senderName: string
    senderImageUrl?: string
    attachments?: any[]
    metadata?: Record<string, any>
    parentId?: string
  }
  groupId: string
}

interface ReplyError {
  code: string
  message: string
  retryable: boolean
  data?: any
}

// Load environment variables
dotenv.config({ path: '.env.local' })

// Log loaded environment variables (excluding sensitive ones)
const envVars = Object.keys(process.env).filter(key => 
  !key.includes('SECRET') && 
  !key.includes('KEY') && 
  !key.includes('PASSWORD')
)

console.log('[Socket Server] Environment variables loaded:', {
  count: envVars.length,
  keys: envVars
})

// Verify environment variables are set
console.log('[Socket Server] Environment check:', {
  hasRegion: !!process.env.AWS_REGION,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
})

// Server setup
const { Server } = require('socket.io')
const { createServer } = require('http')
const { DynamoDBService } = require('../lib/services/dynamodb')

const dynamoDb = new DynamoDBService()

// Rest of the server setup
const httpServer = createServer()

// Get the frontend URL from environment variables
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.error('[Socket Server] NEXT_PUBLIC_API_URL is not defined');
  process.exit(1);
}

console.log('[Socket Server] Allowing CORS from:', process.env.NEXT_PUBLIC_API_URL)

const io = new SocketServer(httpServer, {
  cors: {
    origin: [process.env.NEXT_PUBLIC_API_URL],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8
})

// Extract port from NEXT_PUBLIC_SOCKET_URL or use default
if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
  console.error('[Socket Server] NEXT_PUBLIC_SOCKET_URL is not defined');
  process.exit(1);
}

const SOCKET_URL = new URL(process.env.NEXT_PUBLIC_SOCKET_URL);
const PORT = parseInt(SOCKET_URL.port);

if (!PORT) {
  console.error('[Socket Server] Invalid port in NEXT_PUBLIC_SOCKET_URL');
  process.exit(1);
}

httpServer.listen(PORT, () => {
  console.log(`[Socket Server] Server is running on port ${PORT}`);
});

// Log transport changes
io.engine.on('connection', (socket: any) => {
  console.log('[Socket Server] New transport connection:', {
    id: socket.id,
    transport: socket.transport.name,
    protocol: socket.protocol,
    headers: socket.request.headers
  })
})

io.engine.on('transport', (transport: any, req: any) => {
  console.log('[Socket Server] Transport change:', {
    name: transport.name,
    protocol: transport.protocol,
    headers: req.headers
  })
})

io.on('connection', (socket: Socket) => {
  console.log('[Socket Server] New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('[Socket Server] Client disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('[Socket Server] Socket error:', error);
  });

  // Log all incoming events
  socket.onAny((eventName, ...args) => {
    console.log('[Socket Server] Received event:', eventName, 'with args:', args);
  });

  logger.info('[Socket] Client connected:', {
    socketId: socket.id,
    rooms: Array.from(socket.rooms),
    handshake: socket.handshake
  })

  socket.on('join_conversation', (groupId: string) => {
    logger.info('[Socket] Client joining conversation:', {
      socketId: socket.id,
      groupId,
      previousRooms: Array.from(socket.rooms)
    })
    socket.join(groupId)
    logger.info('[Socket] Client joined conversation:', {
      socketId: socket.id,
      groupId,
      currentRooms: Array.from(socket.rooms),
      roomSize: io.sockets.adapter.rooms.get(groupId)?.size
    })
  })

  socket.on('leave_conversation', (groupId: string) => {
    socket.leave(groupId)
    logger.info('[Socket Server] Client left conversation', {
      socketId: socket.id,
      groupId,
      remainingRooms: Array.from(socket.rooms.values()),
      roomSize: io.sockets.adapter.rooms.get(groupId)?.size || 0
    })
  })

  socket.on('message', async (data: MessageData) => {
    logger.info('[Socket] Received message event:', {
      socketId: socket.id,
      messageData: data,
      isReply: !!data.message.parentId,
      rooms: Array.from(socket.rooms)
    })
    try {
      const { message, groupId } = data
      logger.info('[Socket Server] Received message:', {
        content: message.content.substring(0, 50),
        groupId,
        hasParentId: !!message.parentId
      })

      const timestamp = new Date().toISOString()
      const messageId = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`

      const newMessage = {
        id: messageId,
        groupId,
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        senderImageUrl: message.senderImageUrl,
        timestamp,
        reactions: {},
        attachments: message.attachments || [],
        metadata: message.metadata || {},
        ...(message.parentId && { parentId: message.parentId })
      }

      logger.info('[Socket Server] Created new message:', {
        messageId,
        hasParentId: !!newMessage.parentId,
        parentId: newMessage.parentId
      })

      await dynamoDb.createMessage(newMessage)

      // Emit the new message to all clients in the group
      io.to(groupId).emit('message', newMessage)

      // If this is a reply, update the thread state
      if (message.parentId) {
        logger.info('[Socket Server] Updating thread state for reply:', {
          parentId: message.parentId,
          replyId: messageId
        })

        // Get the parent message and all replies
        const [parentMessage, replies] = await Promise.all([
          dynamoDb.getMessage(message.parentId),
          dynamoDb.getRepliesForMessage(message.parentId).catch((error: Error) => {
            if (error.message?.includes('backfilling global secondary index')) {
              logger.warn('[Socket Server] GSI still backfilling, returning empty replies array')
              return []
            }
            throw error
          })
        ])

        if (parentMessage) {
          // Emit thread state update
          io.to(groupId).emit('thread_state', {
            message: parentMessage,
            replies: replies || [],
            isOpen: true
          })
        }
      }
    } catch (error) {
      logger.error('[Socket Server] Error handling message:', error)
    }
  })

  socket.on('reaction', async (data: ReactionData) => {
    logger.info('[Socket Server] Received reaction request', {
      groupId: data.groupId,
      messageId: data.messageId,
      emoji: data.emoji,
      userId: data.userId,
      add: data.add,
      socketId: socket.id
    });

    try {
      const message = await dynamoDb.getMessage(data.messageId);
      if (!message) {
        logger.warn('[Socket Server] Message not found for reaction', {
          messageId: data.messageId
        });
        return;
      }

      logger.info('[Socket Server] Processing reaction', {
        messageId: data.messageId,
        isReply: !!message.parentId,
        parentId: message.parentId,
        content: message.content?.substring(0, 50)
      });

      const reactions = (message.reactions || {}) as Record<string, MessageReaction>;
      
      // Remove any existing reactions from this user first
      Object.entries(reactions).forEach(([existingEmoji, reaction]) => {
        if (reaction.users.includes(data.userId)) {
          reaction.users = reaction.users.filter(id => id !== data.userId);
          reaction.count = Math.max(0, reaction.count - 1);
          if (reaction.count === 0) {
            delete reactions[existingEmoji];
          }
          // Remove the reaction from DynamoDB
          dynamoDb.removeReaction(data.messageId, data.userId).catch((error: Error) => {
            logger.error('[Socket Server] Error removing reaction', {
              error: error instanceof Error ? error.message : 'Unknown error',
              messageId: data.messageId,
              userId: data.userId
            });
          });
        }
      });

      // Add the new reaction if add is true
      if (data.add) {
        if (!reactions[data.emoji]) {
          reactions[data.emoji] = { emoji: data.emoji, users: [], count: 0 };
        }
        if (!reactions[data.emoji].users.includes(data.userId)) {
          reactions[data.emoji].users.push(data.userId);
          reactions[data.emoji].count++;
          // Add the reaction to DynamoDB
          dynamoDb.addReaction(data.messageId, {
            messageId: data.messageId,
            userId: data.userId,
            emoji: data.emoji,
            timestamp: new Date().toISOString()
          }).catch((error: Error) => {
            logger.error('[Socket Server] Error adding reaction', {
              error: error instanceof Error ? error.message : 'Unknown error',
              messageId: data.messageId,
              userId: data.userId
            });
          });
        }
      }

      await dynamoDb.updateMessage(data.messageId, { reactions });

      // Ensure client is in the room before broadcasting
      if (!socket.rooms.has(data.groupId)) {
        logger.info('[Socket Server] Rejoining room before reaction broadcast', {
          groupId: data.groupId,
          socketId: socket.id
        });
        await socket.join(data.groupId);
      }

      const roomSize = io.sockets.adapter.rooms.get(data.groupId)?.size || 0;
      io.to(data.groupId).emit('reaction_update', {
        messageId: data.messageId,
        reactions
      });

      logger.info('[Socket Server] Reaction broadcast complete', {
        groupId: data.groupId,
        roomSize,
        messageId: data.messageId,
        activeRooms: Array.from(socket.rooms)
      });

      // If it was a reply, update thread state
      if (message.parentId) {
        const replies = await dynamoDb.getRepliesForMessage(message.parentId);
        const parentMessage = await dynamoDb.getMessage(message.parentId);

        logger.info('[Socket Server] Updating thread state after reaction', {
          parentId: message.parentId,
          replyCount: replies.length,
          hasParentMessage: !!parentMessage,
          roomSize
        });

        io.to(data.groupId).emit('thread_state', {
          message: parentMessage,
          replies,
          isOpen: true
        });
      }
    } catch (error) {
      logger.error('[Socket Server] Reaction operation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: data.messageId,
        groupId: data.groupId,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  socket.on('thread_update', async (data: { groupId: string; messageId: string; isOpen: boolean }) => {
    try {
      const { groupId, messageId, isOpen } = data
      logger.info('[Socket Server] Thread update received', { 
        groupId, 
        messageId, 
        isOpen,
        socketId: socket.id
      })

      // Get the message and its replies
      const [message, replies] = await Promise.all([
        dynamoDb.getMessage(messageId),
        dynamoDb.getRepliesForMessage(messageId).catch((error: Error) => {
          // Handle backfilling GSI error gracefully
          if (error.message?.includes('backfilling global secondary index')) {
            logger.warn('[Socket Server] GSI still backfilling, returning empty replies array', {
              messageId,
              error: error.message
            })
            return []
          }
          throw error
        })
      ])

      if (!message) {
        logger.error('[Socket Server] Message not found', { messageId })
        return
      }

      logger.info('[Socket Server] Retrieved thread data', {
        messageId,
        hasMessage: !!message,
        replyCount: replies?.length || 0
      })

      // Broadcast thread state to all clients in the group
      logger.info('[Socket Server] Broadcasting thread_state', {
        groupId,
        messageId: message.id,
        replyCount: replies?.length || 0,
        isOpen,
        roomSize: io.sockets.adapter.rooms.get(groupId)?.size || 0
      })

      io.to(groupId).emit('thread_state', {
        message,
        replies: replies || [],
        isOpen
      })
    } catch (error) {
      logger.error('[Socket Server] Error handling thread update', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  })

  socket.on('edit_message', async (data: { groupId: string; messageId: string; content: string }) => {
    logger.info('[Socket Server] Received edit request', {
      groupId: data.groupId,
      messageId: data.messageId,
      content: data.content.substring(0, 50),
      socketId: socket.id
    });

    try {
      const message = await dynamoDb.getMessage(data.messageId);
      if (!message) {
        logger.warn('[Socket Server] Message not found for edit', {
          messageId: data.messageId
        });
        return;
      }

      logger.info('[Socket Server] Processing message edit', {
        messageId: data.messageId,
        isReply: !!message.parentId,
        parentId: message.parentId,
        oldContent: message.content?.substring(0, 50),
        newContent: data.content.substring(0, 50)
      });

      // Update the message in DynamoDB
      await dynamoDb.updateMessage(data.messageId, { 
        content: data.content,
        edited: true
      });

      // Ensure client is in the room before broadcasting
      if (!socket.rooms.has(data.groupId)) {
        logger.info('[Socket Server] Rejoining room before edit broadcast', {
          groupId: data.groupId,
          socketId: socket.id
        });
        await socket.join(data.groupId);
      }

      const roomSize = io.sockets.adapter.rooms.get(data.groupId)?.size || 0;
      
      // Broadcast the edit to all clients in the channel
      io.to(data.groupId).emit('message_update', {
        messageId: data.messageId,
        content: data.content,
        edited: true
      });

      logger.info('[Socket Server] Edit broadcast complete', {
        groupId: data.groupId,
        roomSize,
        messageId: data.messageId,
        activeRooms: Array.from(socket.rooms)
      });

      // If it was a reply, update thread state
      if (message.parentId) {
        const replies = await dynamoDb.getRepliesForMessage(message.parentId);
        const parentMessage = await dynamoDb.getMessage(message.parentId);

        logger.info('[Socket Server] Updating thread state after edit', {
          parentId: message.parentId,
          replyCount: replies.length,
          hasParentMessage: !!parentMessage,
          roomSize
        });

        io.to(data.groupId).emit('thread_state', {
          message: parentMessage,
          replies,
          isOpen: true
        });
      }
    } catch (error) {
      logger.error('[Socket Server] Edit operation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: data.messageId,
        groupId: data.groupId,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  socket.on('delete_message', async (data: { groupId: string; messageId: string }) => {
    logger.info('[Socket Server] Received delete request', {
      groupId: data.groupId,
      messageId: data.messageId,
      socketId: socket.id,
      currentRooms: Array.from(socket.rooms)
    });

    try {
      // Get message before deletion to check if it's a reply
      const message = await dynamoDb.getMessage(data.messageId);
      
      if (!message) {
        logger.warn('[Socket Server] Message not found for deletion', {
          messageId: data.messageId
        });
        return;
      }

      logger.info('[Socket Server] Processing message deletion', {
        messageId: data.messageId,
        isReply: !!message.parentId,
        parentId: message.parentId,
        content: message.content?.substring(0, 50)
      });

      // Ensure client is in the room before broadcasting
      if (!socket.rooms.has(data.groupId)) {
        logger.info('[Socket Server] Rejoining room before delete broadcast', {
          groupId: data.groupId,
          socketId: socket.id
        });
        await socket.join(data.groupId);
      }

      await dynamoDb.deleteMessage(data.messageId);
      
      logger.info('[Socket Server] Message deleted successfully', {
        messageId: data.messageId
      });

      // Get room size after ensuring membership
      const roomSize = io.sockets.adapter.rooms.get(data.groupId)?.size || 0;
      
      // Broadcast deletion to room
      io.to(data.groupId).emit('message_delete', {
        messageId: data.messageId
      });

      logger.info('[Socket Server] Deletion broadcast complete', {
        groupId: data.groupId,
        roomSize,
        messageId: data.messageId,
        activeRooms: Array.from(socket.rooms)
      });

      // If it was a reply, update thread state
      if (message.parentId) {
        const replies = await dynamoDb.getRepliesForMessage(message.parentId);
        const parentMessage = await dynamoDb.getMessage(message.parentId);

        logger.info('[Socket Server] Updating thread state after reply deletion', {
          parentId: message.parentId,
          replyCount: replies.length,
          hasParentMessage: !!parentMessage,
          roomSize
        });

        io.to(data.groupId).emit('thread_state', {
          message: parentMessage,
          replies,
          isOpen: true
        });
      }
    } catch (error) {
      logger.error('[Socket Server] Delete operation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: data.messageId,
        groupId: data.groupId,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  });

  socket.on('reply_error', async (error: ReplyError) => {
    console.error('[Socket Server] Reply error:', {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      data: error.data
    })

    // Broadcast error to relevant clients
    if (error.data?.groupId) {
      socket.to(error.data.groupId).emit('reply_error', {
        code: error.code,
        message: error.message,
        retryable: error.retryable
      })
    }
  })

  socket.on('thread_sync', async (data: { groupId: string; messageId: string }) => {
    try {
      const { groupId, messageId } = data
      console.log('Thread sync:', { groupId, messageId })

      // Get the parent message and all replies
      const [message, replies] = await Promise.all([
        dynamoDb.getMessage(messageId),
        dynamoDb.getRepliesForMessage(messageId)
      ])

      if (!message) {
        throw new Error('Parent message not found')
      }

      // Sort replies by timestamp
      const sortedReplies = replies.sort((a: Message, b: Message) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      // Send the synchronized thread state
      socket.emit('thread_sync_complete', {
        messageId,
        message,
        replies: sortedReplies
      })
    } catch (error) {
      console.error('Error handling thread sync:', error)
    }
  })

  socket.on('thread_typing', async (data: { groupId: string; messageId: string; isTyping: boolean }) => {
    try {
      const { groupId, messageId, isTyping } = data
      console.log('Thread typing:', { groupId, messageId, isTyping })

      // Broadcast typing status to other users in the thread
      socket.to(groupId).emit('thread_typing_update', {
        messageId,
        userId: socket.data.userId,
        isTyping
      })
    } catch (error) {
      console.error('Error handling thread typing:', error)
    }
  })

  socket.on('thread_read', async (data: { groupId: string; messageId: string; lastReadTimestamp: string }) => {
    try {
      const { groupId, messageId, lastReadTimestamp } = data
      console.log('Thread read:', { groupId, messageId, lastReadTimestamp })

      // Update read status in DynamoDB
      await dynamoDb.updateThreadReadStatus(messageId, socket.data.userId, lastReadTimestamp)

      // Broadcast read status to other users
      socket.to(groupId).emit('thread_read_update', {
        messageId,
        userId: socket.data.userId,
        lastReadTimestamp
      })
    } catch (error) {
      console.error('Error handling thread read:', error)
    }
  })

  socket.on('group_name_updated', async (data: { groupId: string; name: string }) => {
    try {
      const { groupId, name } = data
      console.log('[Socket Server] Group name updated:', { groupId, name })
      
      // Broadcast the update to all clients
      io.emit('group_name_updated', { groupId, name })
    } catch (error) {
      console.error('[Socket Server] Error handling group name update:', error)
    }
  })

  socket.on('disconnect', () => {
    console.log('[Socket Server] Client disconnected:', socket.id)
  })
})

export default io 