'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Socket, io } from 'socket.io-client'
import { useToast } from '@/components/ui/use-toast'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
})

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  useEffect(() => {
    console.log('[Socket Hook] Initializing socket connection')
    
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 30000,
      withCredentials: true,
      forceNew: true,
      path: '/socket.io'
    })

    socketInstance.on('connect', () => {
      const connectionInfo = {
        id: socketInstance.id,
        connected: socketInstance.connected,
        transport: socketInstance.io.engine?.transport?.name
      }
      console.log('[Socket Hook] Connected:', connectionInfo)
      
      setIsConnected(true)
      setConnectionAttempts(0)

      if (connectionAttempts > 0) {
        toast({
          title: 'Reconnected',
          description: 'Chat connection restored',
          duration: 3000
        })
      }
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket Hook] Disconnected:', {
        reason,
        wasConnected: isConnected,
        attempts: connectionAttempts,
        transport: socketInstance.io.engine?.transport?.name
      })
      
      setIsConnected(false)
      
      if (reason !== 'io client disconnect') {
        toast({
          title: 'Disconnected',
          description: 'Lost connection to chat server',
          variant: 'destructive',
          duration: 5000
        })
      }
    })

    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log('[Socket Hook] Reconnection attempt:', {
        attempt,
        maxAttempts: socketInstance.io.opts.reconnectionAttempts,
        transport: socketInstance.io.engine?.transport?.name
      })
      
      setConnectionAttempts(attempt)
      
      if (attempt === 1) {
        toast({
          title: 'Connection Lost',
          description: 'Attempting to reconnect...',
          duration: 5000
        })
      }
    })

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket Hook] Connection error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        transport: socketInstance.io.engine?.transport?.name
      })
      
      setIsConnected(false)

      if (connectionAttempts === 0) {
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to chat server',
          variant: 'destructive',
          duration: 5000
        })
      }
    })

    setSocket(socketInstance)

    return () => {
      console.log('[Socket Hook] Cleaning up socket connection')
      socketInstance.disconnect()
    }
  }, [connectionAttempts, toast])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
} 