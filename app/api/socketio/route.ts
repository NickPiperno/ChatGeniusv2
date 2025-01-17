import { NextResponse } from 'next/server'
import { Server } from 'socket.io'

export async function GET(req: Request) {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new NextResponse('Expected Websocket', { status: 426 })
  }
  
  const res = new NextResponse()
  const io = new Server({
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: [process.env.NEXT_PUBLIC_API_URL || '', 'https://chatgeniusv2-production.up.railway.app'],
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Handle socket events here
  io.on('connection', (socket) => {
    console.log('[Socket Server] Client connected:', socket.id)
    
    socket.on('error', (error) => {
      console.error('[Socket Server] Socket error:', error)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('[Socket Server] Client disconnected:', { id: socket.id, reason })
    })
  })

  return res
}

export const dynamic = 'force-dynamic' 