import { io as socketIO } from 'socket.io-client'
import { logger } from './logger'

// Determine if we're running in local development
const isDev = process.env.NODE_ENV === 'development'
const isLocalSocket = process.env.USE_LOCAL_SOCKET === 'true'

// Use local socket in development if specified, otherwise use EC2
const SOCKET_URL = isDev && isLocalSocket 
  ? 'http://localhost:3001'
  : process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

logger.info('[Socket Client] Initializing with URL: ' + SOCKET_URL, {
  environment: process.env.NODE_ENV,
  useLocalSocket: isLocalSocket
})

const socket = socketIO(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  path: '/socket.io',
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
})

socket.on('connect', () => {
  logger.info('[Socket Client] Connected to server:', {
    url: SOCKET_URL,
    id: socket.id,
    transport: socket.io.engine?.transport?.name
  })
})

socket.on('disconnect', () => {
  logger.info('[Socket Client] Disconnected from server:', {
    url: SOCKET_URL,
    id: socket.id
  })
})

socket.on('connect_error', (error) => {
  logger.error('[Socket Client] Connection error:', {
    url: SOCKET_URL,
    error: error.message,
    transport: socket.io.engine?.transport?.name
  })
})

export default socket 