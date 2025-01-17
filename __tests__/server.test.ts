import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { io as ioc } from 'socket.io-client'
import next from 'next'
import { AddressInfo } from 'net'
import fetch from 'node-fetch'

jest.mock('next', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockResolvedValue(undefined),
    getRequestHandler: jest.fn().mockReturnValue((req: any, res: any) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Next.js Mock Response')
    })
  }))
})

describe('Combined Server Tests', () => {
  let httpServer: any
  let socketServer: SocketServer
  let clientSocket: any
  let port: number

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer()
    socketServer = new SocketServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    // Start listening on a random port
    httpServer.listen(0)
    port = (httpServer.address() as AddressInfo).port

    // Basic socket connection handler
    socketServer.on('connection', (socket) => {
      socket.on('test_event', (data) => {
        socket.emit('test_response', data)
      })
    })
  })

  afterAll(() => {
    socketServer.close()
    httpServer.close()
  })

  beforeEach((done) => {
    clientSocket = ioc(`http://localhost:${port}`)
    clientSocket.on('connect', done)
  })

  afterEach(() => {
    clientSocket.close()
  })

  test('HTTP server responds', async () => {
    const response = await fetch(`http://localhost:${port}`)
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('Next.js Mock Response')
  })

  test('WebSocket server handles connections', (done) => {
    expect(clientSocket.connected).toBe(true)
    done()
  })

  test('WebSocket server handles events', (done) => {
    const testData = { message: 'test' }
    
    clientSocket.on('test_response', (data: any) => {
      expect(data).toEqual(testData)
      done()
    })

    clientSocket.emit('test_event', testData)
  })
}) 