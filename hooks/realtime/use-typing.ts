'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useSocket } from './index'

export function useTypingIndicator(groupId: string, messageId: string) {
  const { socket, isConnected } = useSocket()
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const debouncedEmit = useRef<NodeJS.Timeout>()

  const emitTyping = useCallback((isTyping: boolean) => {
    if (!socket || !isConnected) return

    socket.emit('thread_typing', {
      groupId,
      messageId,
      isTyping
    })
  }, [socket, isConnected, groupId, messageId])

  useEffect(() => {
    if (!socket || !isConnected) return

    const handleTypingUpdate = (data: { messageId: string; userId: string; isTyping: boolean }) => {
      if (data.messageId !== messageId) return

      setTypingUsers(prev => {
        if (data.isTyping && !prev.includes(data.userId)) {
          return [...prev, data.userId]
        }
        return prev.filter(id => id !== data.userId)
      })
    }

    socket.on('thread_typing', handleTypingUpdate)

    return () => {
      socket.off('thread_typing', handleTypingUpdate)
    }
  }, [socket, isConnected, messageId])

  const onTyping = useCallback(() => {
    if (debouncedEmit.current) {
      clearTimeout(debouncedEmit.current)
    }

    emitTyping(true)

    debouncedEmit.current = setTimeout(() => {
      emitTyping(false)
    }, 2000)
  }, [emitTyping])

  return {
    typingUsers,
    onTyping
  }
} 