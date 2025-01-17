import { io as ioc } from 'socket.io-client'
import { AddressInfo } from 'net'
import fetch from 'node-fetch'
import { createCombinedServer } from '../server/combined-server'

// Store original env vars
const originalEnv = process.env.NEXT_PUBLIC_API_URL

describe('Combined Server Integration Tests', () => {
  let server: any
  let socketServer: any
  let clientSocket: any
  let port: number

  beforeAll(async () => {
    // Set test environment variables
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost'
    
    const { server: httpServer, io } = await createCombinedServer()
    server = httpServer
    socketServer = io

    // Start listening on a random port
    server.listen(0)
    port = (server.address() as AddressInfo).port
    process.env.NEXT_PUBLIC_API_URL = `http://localhost:${port}`
  })

  afterAll((done) => {
    // Restore original env vars
    process.env.NEXT_PUBLIC_API_URL = originalEnv
    
    if (server) server.close()
    if (socketServer) socketServer.close()
    done()
  })

  beforeEach((done) => {
    clientSocket = ioc(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true,
      forceNew: true
    })
    clientSocket.on('connect', done)
  })

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close()
    }
  })

  describe('HTTP Server', () => {
    test('serves Next.js content', async () => {
      const response = await fetch(`http://localhost:${port}`)
      expect(response.status).toBe(200)
    })
  })

  describe('WebSocket Server', () => {
    test('handles socket connections', (done) => {
      expect(clientSocket.connected).toBe(true)
      done()
    })

    test('handles joining and leaving conversations', (done) => {
      const groupId = 'test-group-1'
      
      // Join conversation
      clientSocket.emit('join_conversation', groupId)
      
      // Wait a bit to ensure the join is processed
      setTimeout(() => {
        // Leave conversation
        clientSocket.emit('leave_conversation', groupId)
        
        // Give some time for the leave to be processed
        setTimeout(() => {
          done()
        }, 100)
      }, 100)
    })

    test('handles message sending and receiving', (done) => {
      const groupId = 'test-group-2'
      const testMessage = {
        message: {
          content: 'Test message',
          userId: 'test-user',
          displayName: 'Test User',
          imageUrl: 'https://example.com/avatar.jpg'
        },
        groupId
      }

      // Join the conversation first
      clientSocket.emit('join_conversation', groupId)

      // Listen for the message event
      clientSocket.on('message', (data: any) => {
        expect(data.content).toBe(testMessage.message.content)
        expect(data.userId).toBe(testMessage.message.userId)
        expect(data.groupId).toBe(testMessage.groupId)
        done()
      })

      // Wait a bit to ensure we've joined the room
      setTimeout(() => {
        // Send the test message
        clientSocket.emit('message', testMessage)
      }, 100)
    })

    test('handles error scenarios gracefully', (done) => {
      const invalidMessage = {
        message: {},
        groupId: 'test-group-3'
      }

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Failed to process message')
        done()
      })

      clientSocket.emit('message', invalidMessage)
    })
  })
}) 