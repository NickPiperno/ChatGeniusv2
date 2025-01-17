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
      origin: process.env.NEXT_PUBLIC_API_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // Handle socket events here
  io.on('connection', (socket) => {
    console.log('Client connected')
    
    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })

  return res
}

export const dynamic = 'force-dynamic' 