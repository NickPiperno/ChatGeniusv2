import { useEffect, useState, useCallback } from 'react'
import { Message } from '@/types/models/message'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'
import { MessageList } from '@/components/chat/messages/MessageList'
import { MessageInputTiptap as MessageInput } from '@/components/chat/input/MessageInputTiptap'
import { useUsers } from '@/hooks/data/use-users'

interface ChatInterfaceProps {
  groupId?: string
  userId?: string
}

export function ChatInterface({ groupId, userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { users } = useUsers()

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const endpoint = groupId 
          ? `/api/groups/${groupId}/messages`
          : `/api/dm/${userId}/messages`

        const response = await fetchApi(endpoint)
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`)
        }
        const data = await response.json()
        setMessages(data)
      } catch (err) {
        logger.error('Error fetching messages:', err)
        setError('Failed to load messages')
      } finally {
        setIsLoading(false)
      }
    }

    if (groupId || userId) {
      fetchMessages()
    }
  }, [groupId, userId])

  const handleSendMessage = async (content: string, attachments?: Array<{
    id: string
    name: string
    url: string
    type: 'document' | 'image'
  }>) => {
    try {
      const endpoint = groupId
        ? `/api/groups/${groupId}/messages`
        : `/api/dm/${userId}/messages`

      const response = await fetchApi(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, attachments }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const newMessage = await response.json()
      setMessages(prev => [...prev, newMessage])
    } catch (err) {
      logger.error('Error sending message:', err)
      throw new Error('Failed to send message')
    }
  }

  const handleReaction = async (messageId: string, emoji: string, previousEmoji?: string) => {
    try {
      const response = await fetchApi('/api/messages/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messageId, 
          reaction: emoji,
          previousReaction: previousEmoji 
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to add reaction: ${response.statusText}`)
      }

      // Update the message with the new reaction
      const updatedMessage = await response.json()
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ))
    } catch (err) {
      logger.error('Error adding reaction:', err)
      throw new Error('Failed to add reaction')
    }
  }

  const handleReply = async (messageId: string) => {
    // Implement reply functionality
    logger.debug('Reply to message', { messageId })
  }

  const handleEdit = async (messageId: string, content: string) => {
    try {
      const response = await fetchApi(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error(`Failed to edit message: ${response.statusText}`)
      }

      const updatedMessage = await response.json()
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ))
    } catch (err) {
      logger.error('Error editing message:', err)
      throw new Error('Failed to edit message')
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      const response = await fetchApi(`/api/messages/${messageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.statusText}`)
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (err) {
      logger.error('Error deleting message:', err)
      throw new Error('Failed to delete message')
    }
  }

  if (isLoading) {
    return <div>Loading messages...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList 
        messages={messages}
        onReaction={handleReaction}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
      <MessageInput 
        onSendMessage={handleSendMessage}
        chatSettings={{ enterToSend: true }}
        users={users}
        placeholder="Type a message..."
        groupId={groupId}
      />
    </div>
  )
} 