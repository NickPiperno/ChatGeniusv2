'use client'

import { useEffect, useCallback, createContext, useContext, ReactNode, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useToast } from '@/components/ui/use-toast'
import { Message, MessageReaction } from '@/types/models/message'

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

interface ServerToClientEvents {
  error: (error: { message: string }) => void
  message: (data: Message) => void
  thread_update: (data: { messageId: string; replies: Message[] }) => void
  reaction: (data: { messageId: string; reactions: MessageReaction[] }) => void
  delete_message: (data: { messageId: string }) => void
  edit_message: (data: { messageId: string; content: string; edited: boolean }) => void
  thread_sync: (data: { messageId: string; message: Message; replies: Message[] }) => void
  thread_typing: (data: { messageId: string; userId: string; isTyping: boolean }) => void
  thread_read: (data: { messageId: string; userId: string; lastReadTimestamp: string }) => void
  group_name_updated: (data: { groupId: string; name: string }) => void
}

interface ClientToServerEvents {
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
  join_conversation: (data: { groupId: string }) => void
  leave_conversation: (data: { groupId: string }) => void
  thread_update: (data: { groupId: string; messageId: string; isOpen: boolean }) => void
  reaction: (data: { messageId: string; groupId: string; emoji: string; userId: string; add: boolean }) => void
  message: (data: MessageData) => void
  delete_message: (data: { messageId: string; groupId: string }) => void
  edit_message: (data: { groupId: string; messageId: string; content: string }) => void
  thread_sync: (data: { groupId: string; messageId: string }) => void
  thread_typing: (data: { groupId: string; messageId: string; isTyping: boolean }) => void
  thread_read: (data: { groupId: string; messageId: string; lastReadTimestamp: string }) => void
  group_name_updated: (data: { groupId: string; name: string }) => void
}

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null)

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { toast } = useToast()
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      console.error('[Socket] NEXT_PUBLIC_API_URL is not defined')
      return
    }

    const socketUrl = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`
    console.log('[Socket] Connecting to:', socketUrl)
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: '/api/socketio',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      forceNew: true,
      secure: true,
      rejectUnauthorized: false,
      withCredentials: true,
      timeout: 10000
    })

    newSocket.on('connect', () => {
      console.log('[Socket] Connected with ID:', newSocket.id, 'Transport:', newSocket.io.engine.transport.name)
      setSocket(newSocket)
      setIsConnected(true)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      setIsConnected(false)
      toast({
        title: 'Connection lost',
        description: `Attempting to reconnect... (${reason})`,
        variant: 'destructive'
      })
    })

    newSocket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', {
        message: error.message,
        type: error.name,
        transport: newSocket.io?.engine?.transport?.name
      })
      setIsConnected(false)
      toast({
        title: 'Connection error',
        description: `Failed to connect: ${error.message}`,
        variant: 'destructive'
      })
    })

    newSocket.on('error', (error) => {
      console.error('[Socket] Error:', error)
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    })

    return () => {
      console.log('[Socket] Cleaning up connection')
      newSocket.disconnect()
    }
  }, [toast])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export { useTypingIndicator } from './use-typing' 