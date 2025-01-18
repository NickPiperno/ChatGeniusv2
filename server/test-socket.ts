import { io as Client } from 'socket.io-client'
import { logger } from '../lib/logger'

async function testSocketConnection() {
  try {
    // Replace with your EC2 instance URL when testing
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    
    logger.info('Attempting to connect to socket server:', { url: SOCKET_URL })
    
    const socket = Client(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socket.on('connect', () => {
      logger.info('Connected to socket server', {
        id: socket.id,
        connected: socket.connected
      })

      // Test joining a conversation
      const testGroupId = 'test-group-1'
      socket.emit('join_conversation', testGroupId)

      // Test sending a message
      const testMessage = {
        message: {
          content: 'Test message from EC2',
          userId: 'test-user',
          displayName: 'Test User',
        },
        groupId: testGroupId
      }
      socket.emit('message', testMessage)
    })

    socket.on('message', (message) => {
      logger.info('Received message:', { message })
    })

    socket.on('error', (error) => {
      logger.error('Socket error:', error)
    })

    socket.on('disconnect', (reason) => {
      logger.info('Disconnected from socket server:', { reason })
    })

    // Keep the script running for a while to test the connection
    await new Promise(resolve => setTimeout(resolve, 30000))
    socket.disconnect()
    
  } catch (error) {
    logger.error('Test failed:', error)
  }
}

testSocketConnection().catch(console.error) 