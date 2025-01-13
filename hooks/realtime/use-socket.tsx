'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'
import { useToast } from '@/components/ui/use-toast'
import socket from '@/lib/socket-client'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
})

export function SocketProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  useEffect(() => {
    console.log('[Socket Hook] Initializing socket connection')

    socket.on('connect', () => {
      const connectionInfo = {
        id: socket.id,
        connected: socket.connected,
        transport: socket.io.engine?.transport?.name
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

    socket.on('disconnect', (reason) => {
      console.log('[Socket Hook] Disconnected:', {
        reason,
        wasConnected: isConnected,
        attempts: connectionAttempts,
        transport: socket.io.engine?.transport?.name
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

    socket.on('reconnect_attempt', (attempt) => {
      console.log('[Socket Hook] Reconnection attempt:', {
        attempt,
        maxAttempts: socket.io.opts.reconnectionAttempts,
        transport: socket.io.engine?.transport?.name
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

    socket.on('connect_error', (error) => {
      console.error('[Socket Hook] Connection error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        transport: socket.io.engine?.transport?.name
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

    return () => {
      console.log('[Socket Hook] Cleaning up socket connection')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('reconnect_attempt')
      socket.off('connect_error')
    }
  }, [connectionAttempts, toast, isConnected])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
} 