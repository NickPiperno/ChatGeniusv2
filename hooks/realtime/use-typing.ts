'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { debounce } from 'lodash'
import { useSocket } from './use-socket'

/**
 * Interface for a user who is currently typing
 */
interface TypingUser {
  userId: string
  username: string
}

/**
 * Hook to manage typing indicators in a conversation
 * @param conversationId - The ID of the current conversation
 * @returns Object containing typing users and function to emit typing status
 * @example
 * ```tsx
 * function ChatInput({ conversationId }) {
 *   const { typingUsers, emitTyping } = useTypingIndicator(conversationId)
 *   
 *   const handleInput = (e) => {
 *     emitTyping()
 *   }
 *   
 *   return (
 *     <div>
 *       {typingUsers.length > 0 && (
 *         <div>{typingUsers[0].username} is typing...</div>
 *       )}
 *       <input onChange={handleInput} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useTypingIndicator(conversationId: string) {
  const { user } = useUser()
  const { socket } = useSocket()
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  useEffect(() => {
    if (!socket) return

    // Listen for typing events
    socket.on('typing_started', ({ userId, username }) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.userId === userId)) {
          return [...prev, { userId, username }]
        }
        return prev
      })
    })

    socket.on('typing_stopped', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId))
    })

    // Cleanup
    return () => {
      socket.off('typing_started')
      socket.off('typing_stopped')
    }
  }, [socket])

  // Debounced function to emit typing stopped
  const debouncedStopTyping = useCallback(
    debounce(() => {
      if (!socket || !user?.id) return

      socket.emit('typing_stopped', {
        conversationId,
        userId: user.id,
        username: user.username
      })
    }, 1000),
    [socket, user, conversationId]
  )

  // Function to emit typing started
  const emitTyping = useCallback(() => {
    if (!socket || !user?.id) return

    socket.emit('typing_started', {
      conversationId,
      userId: user.id,
      username: user.username
    })

    // Schedule typing stopped
    debouncedStopTyping()

    return () => {
      debouncedStopTyping.cancel()
    }
  }, [socket, user, conversationId, debouncedStopTyping])

  return {
    typingUsers,
    emitTyping
  }
} 