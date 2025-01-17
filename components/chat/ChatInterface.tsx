'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { toast } from '@/components/ui/use-toast'
import { fetchApi } from '@/lib/api-client'
import { useThreadStore } from '@/lib/store/thread'
import { useSocket } from '@/hooks/realtime'
import type { Message, MessageAttachment, MessageReaction } from '@/types/models/message'
import type { User } from '@/types/models/user'
import type { ThreadState } from '@/types/models/thread'
import { Socket } from 'socket.io-client'
import { MessageList } from './messages/MessageList'
import { MessageInputTiptap } from './input/MessageInputTiptap'
import { ReplyBanner } from './input/ReplyBanner'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { logger } from '@/lib/logger'

interface ChatInterfaceProps {
  groupId: string
  users: User[]
  isDM?: boolean
  otherUser?: User
  chatSettings: {
    enterToSend: boolean
  }
  headerHeight: number
  searchBarHeight: number
}

interface MessageListProps {
  messages: Message[]
  users: User[]
  currentUser: User | null
  onReply: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onReaction: (messageId: string, reaction: string) => void
  className?: string
}

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: { id: string; name: string; url: string; type: 'image' | 'document'; size: number }[]) => Promise<void>
  onEditMessage?: (content: string) => void
  editingMessage: Message | null
  enterToSend: boolean
  className?: string
}

interface ReplyBannerProps {
  replyingTo: Message
  onCancel: () => void
}

export function ChatInterface({
  groupId,
  users,
  isDM = false,
  otherUser,
  chatSettings,
  headerHeight,
  searchBarHeight
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, isLoading } = useUser()
  const threadStore = useThreadStore()
  const socket = useSocket()

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.sub || !socket?.socket) return
      
      try {
        // Join the conversation to receive messages
        socket.socket.emit('join_conversation', { groupId })
        
        // Initial message load will come through the 'message' event handler
        setIsLoadingMessages(false)
      } catch (error) {
        logger.error('Error fetching messages:', error)
        toast({
          title: 'Error',
          description: 'Failed to load messages. Please try again.',
          variant: 'destructive'
        })
        setMessages([])
        setIsLoadingMessages(false)
      }
    }

    fetchMessages()

    // Clean up - leave conversation when unmounting
    return () => {
      if (socket?.socket) {
        socket.socket.emit('leave_conversation', { groupId })
      }
    }
  }, [groupId, user?.sub, socket?.socket])

  // Socket event handlers
  useEffect(() => {
    if (!socket?.socket) return

    const socketRef = socket.socket

    const handleNewMessage = (message: Message) => {
      if (message.groupId === groupId) {
        setMessages(prev => [...prev, message])
        scrollToBottom()
      }
    }

    const handleMessageUpdate = (data: { messageId: string; content: string; edited: boolean }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId ? { ...msg, content: data.content, edited: data.edited } : msg
        )
      )
    }

    const handleMessageDelete = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId))
    }

    const handleReaction = (data: { messageId: string; reactions: MessageReaction[] }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        )
      )
    }
    
    socketRef.on('message', handleNewMessage)
    socketRef.on('edit_message', handleMessageUpdate)
    socketRef.on('delete_message', handleMessageDelete)
    socketRef.on('reaction', handleReaction)

    return () => {
      socketRef.off('message', handleNewMessage)
      socketRef.off('edit_message', handleMessageUpdate)
      socketRef.off('delete_message', handleMessageDelete)
      socketRef.off('reaction', handleReaction)
    }
  }, [socket?.socket, groupId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (content: string, attachments: { id: string; name: string; url: string; type: 'image' | 'document'; size: number }[] = []) => {
    if (!socket?.socket || !user?.sub) {
      logger.error('[Chat] Cannot send message:', {
        hasSocket: !!socket?.socket,
        hasUser: !!user
      })
      toast({
        title: 'Error',
        description: 'Not connected to chat server',
        variant: 'destructive'
      })
      return
    }

    try {
      logger.info('[Chat] Sending message:', {
        content: content.substring(0, 50),
        groupId,
        userId: user.sub
      })

      const messageData = {
        content,
        userId: user.sub,
        displayName: user.name || user.email?.split('@')[0] || user.sub,
        imageUrl: user.picture || undefined,
        groupId,
        attachments,
        ...(replyingTo && {
          parentId: replyingTo.id
        }),
        sender: user.picture ? {
          id: user.sub,
          displayName: user.name || user.email?.split('@')[0] || user.sub,
          imageUrl: user.picture
        } : undefined
      }

      socket.socket.emit('message', {
        message: messageData,
        groupId
      })

      logger.info('[Chat] Message sent successfully')
      if (replyingTo) {
        setReplyingTo(null)
      }

    } catch (error) {
      logger.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!socket?.socket) {
      toast({
        title: 'Error',
        description: 'Not connected to chat server',
        variant: 'destructive'
      })
      return
    }

    try {
      socket.socket.emit('delete_message', { messageId, groupId })
    } catch (error) {
      console.error('Error deleting message:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete message'
      })
    }
  }

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!socket?.socket) {
      toast({
        title: 'Error',
        description: 'Not connected to chat server',
        variant: 'destructive'
      })
      return
    }

    try {
      socket.socket.emit('edit_message', { messageId, content, groupId })
      setEditingMessage(null)
    } catch (error) {
      console.error('Error editing message:', error)
      toast({
        title: 'Error',
        description: 'Failed to edit message'
      })
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!socket?.socket || !user?.sub) {
      toast({
        title: 'Error',
        description: 'Not connected to chat server',
        variant: 'destructive'
      })
      return
    }

    try {
      socket.socket.emit('reaction', {
        messageId,
        groupId,
        emoji,
        userId: user.sub,
        add: true // We can enhance this later to toggle reactions
      })
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to add reaction'
      })
    }
  }

  const handleOpenThread = (message: Message) => {
    if (threadStore.setActiveThread) {
      threadStore.setActiveThread({
        parentMessage: message,
        replies: [],
        isOpen: true
      })
    }
  }

  if (isLoading || isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div 
      className="flex flex-col h-full"
      style={{ 
        height: `calc(100vh - ${headerHeight + searchBarHeight}px)` 
      }}
    >
      <MessageList
        messages={messages}
        onReply={(messageId: string) => {
          const message = messages.find(m => m.id === messageId);
          if (message) setReplyingTo(message);
        }}
        onEdit={(messageId: string, content: string) => {
          const message = messages.find(m => m.id === messageId);
          if (message) {
            const updatedMessage = { ...message, content };
            setEditingMessage(updatedMessage);
          }
        }}
        onDelete={handleDeleteMessage}
        onReaction={handleReaction}
        className="flex-1"
      />
      <div ref={messagesEndRef} />
      {replyingTo && (
        <ReplyBanner
          replyingTo={replyingTo}
          onCancel={() => setReplyingTo(null)}
        />
      )}
      <MessageInputTiptap
        onSendMessage={handleSendMessage}
        onEditMessage={editingMessage ? 
          (content: string) => handleEditMessage(editingMessage.id, content) : 
          undefined
        }
        editingMessage={editingMessage}
        chatSettings={chatSettings}
        users={users}
        className="mt-4"
      />
    </div>
  )
} 