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
import { MessageThread } from './thread/MessageThread'

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

interface ReactionEventData {
  messageId: string
  groupId: string
  emoji: string
  userId: string
  add: boolean
  parentId?: string
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
  const activeThread = threadStore.activeThread

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.sub || !socket?.socket) return
      
      try {
        setIsLoadingMessages(true)
        logger.info('[Chat] Joining conversation:', { groupId })
        
        // Join the conversation to receive messages
        socket.socket.emit('join_conversation', { groupId })
        
        // Fetch initial messages from API
        const response = await fetch(`/api/messages/${groupId}`)
        const data = await response.json()
        
        if (data.messages) {
          logger.info('[Chat] Initial messages loaded:', { count: data.messages.length })
          // Sort messages by timestamp before setting them
          const sortedMessages = data.messages.sort((a: Message, b: Message) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setMessages(sortedMessages)
          scrollToBottom()
        }
        
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
        logger.info('[Chat] Leaving conversation:', { groupId })
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
        logger.info('[Chat] New message received:', { 
          messageId: message.id,
          groupId: message.groupId,
          isReply: !!message.parentId
        })

        if (message.parentId) {
          // Update thread if this is a reply
          if (activeThread?.parentMessage?.id === message.parentId) {
            threadStore.setActiveThread({
              ...activeThread,
              replies: [...activeThread.replies, message]
            })
          }
          // Update parent message's reply count
          setMessages(prev => prev.map(msg => {
            if (msg.id === message.parentId) {
              return {
                ...msg,
                replies: [...(msg.replies || []), message],
                replyCount: (msg.replyCount || 0) + 1
              }
            }
            return msg
          }))
        } else {
          setMessages(prev => {
            const newMessages = [...prev, message];
            return newMessages.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          })
          scrollToBottom()
        }
      }
    }

    const handleMessageUpdate = (data: { messageId: string; content: string; edited: boolean }) => {
      logger.info('[Chat] Message update received:', {
        messageId: data.messageId,
        content: data.content.substring(0, 50)
      });

      // Update message in thread if applicable
      if (activeThread?.parentMessage?.id === data.messageId) {
        threadStore.setActiveThread({
          ...activeThread,
          parentMessage: {
            ...activeThread.parentMessage,
            content: data.content,
            edited: data.edited
          }
        });
      } else if (activeThread) {
        threadStore.updateReply(data.messageId, {
          content: data.content,
          edited: data.edited
        });
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId ? { ...msg, content: data.content, edited: data.edited } : msg
        )
      )
    }

    const handleMessageDelete = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId))
    }

    const handleReactionUpdate = (data: { messageId: string; reactions: MessageReaction[] }) => {
      logger.info('[Chat] Received reaction update:', {
        messageId: data.messageId,
        reactions: data.reactions
      });

      // Convert array to object structure
      const reactionsObject: Record<string, MessageReaction> = {};
      data.reactions.forEach(reaction => {
        if (reaction.emoji) {
          reactionsObject[reaction.emoji] = {
            emoji: reaction.emoji,
            users: reaction.users,
            count: reaction.users.length
          };
        }
      });

      logger.info('[Chat] Converted reactions to object:', {
        messageId: data.messageId,
        reactionsObject,
        reactionsKeys: Object.keys(reactionsObject)
      });

      // Update reaction in thread if applicable
      if (activeThread?.parentMessage?.id === data.messageId) {
        threadStore.setActiveThread({
          ...activeThread,
          parentMessage: {
            ...activeThread.parentMessage,
            reactions: reactionsObject
          }
        });
      } else if (activeThread) {
        threadStore.updateReply(data.messageId, {
          reactions: reactionsObject
        });
      }

      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            reactions: reactionsObject
          };
        }
        return msg;
      }));
    };
    
    const handleThreadSync = (data: { messageId: string; message: Message; replies: Message[] }) => {
      logger.info('[Chat] Thread sync received:', {
        messageId: data.messageId,
        replyCount: data.replies.length
      })

      // Update thread state with synced data
      if (activeThread?.parentMessage?.id === data.messageId) {
        threadStore.setActiveThread({
          parentMessage: data.message,
          replies: data.replies,
          isOpen: true
        })
      }

      // Update message in main list
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            replies: data.replies,
            replyCount: data.replies.length
          }
        }
        return msg
      }))
    }

    socketRef.on('message', handleNewMessage)
    socketRef.on('edit_message', handleMessageUpdate)
    socketRef.on('delete_message', handleMessageDelete)
    socketRef.on('reaction', handleReactionUpdate)
    socketRef.on('thread_sync', handleThreadSync)

    return () => {
      socketRef.off('message', handleNewMessage)
      socketRef.off('edit_message', handleMessageUpdate)
      socketRef.off('delete_message', handleMessageDelete)
      socketRef.off('reaction', handleReactionUpdate)
      socketRef.off('thread_sync', handleThreadSync)
    }
  }, [socket?.socket, groupId, activeThread, threadStore])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (content: string, attachments: Array<{
    id: string
    name: string
    url: string
    type: 'document' | 'image'
  }> = []) => {
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

    logger.info('[Chat] Sending message:', {
      content: content.substring(0, 50),
      groupId,
      userId: user.sub,
      isReply: !!replyingTo,
      replyingToMessage: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content.substring(0, 50)
      } : null
    })

    const messageData = {
      content,
      userId: user.sub,
      displayName: user.nickname || user.name || user.email?.split('@')[0] || user.sub,
      imageUrl: user.picture || '',
      groupId,
      attachments,
      ...(replyingTo && {
        parentId: replyingTo.id
      }),
      sender: {
        id: user.sub,
        displayName: user.nickname || user.name || user.email?.split('@')[0] || user.sub,
        imageUrl: user.picture || ''
      }
    }

    logger.info('[Chat] Constructed message data:', {
      ...messageData,
      content: messageData.content.substring(0, 50),
      hasParentId: !!messageData.parentId
    })

    socket.socket.emit('message', {
      message: messageData,
      groupId
    })

    logger.info('[Chat] Message sent successfully')
    if (replyingTo) {
      logger.info('[Chat] Clearing reply state')
      setReplyingTo(null)
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

  const handleEdit = async (messageId: string, content: string) => {
    if (!socket?.socket) {
      toast({
        title: "Error",
        description: "Not connected to chat server",
        variant: "destructive"
      });
      return;
    }

    try {
      // Strip HTML tags from content
      const cleanContent = content.replace(/<\/?[^>]+(>|$)/g, "").trim();
      
      logger.info('[Chat] Editing message:', {
        messageId,
        content: cleanContent.substring(0, 50),
        isReply: !!activeThread?.replies.find(reply => reply.id === messageId)
      });

      // Update local message state immediately for better UX
      const updatedMessages = messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: cleanContent, edited: true }
          : msg
      );
      setMessages(updatedMessages);

      // Emit the edit event
      socket.socket.emit('edit_message', {
        groupId,
        messageId,
        content: cleanContent
      });
    } catch (error) {
      logger.error('[Chat] Error editing message:', error);
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive"
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!socket?.socket || !user?.sub) return

    try {
      logger.info('[Chat] Adding reaction to message:', {
        messageId,
        emoji,
        userId: user.sub
      })

      // Find message in main messages or thread replies
      const message = messages.find(msg => msg.id === messageId) || 
                     activeThread?.replies.find(reply => reply.id === messageId) ||
                     (activeThread?.parentMessage?.id === messageId ? activeThread.parentMessage : null)

      if (!message) {
        logger.warn('[Chat] Message not found for reaction:', { 
          messageId,
          isInMainMessages: !!messages.find(msg => msg.id === messageId),
          isInThreadReplies: !!activeThread?.replies.find(reply => reply.id === messageId),
          isThreadParent: activeThread?.parentMessage?.id === messageId
        })
        return
      }

      // Check if user has already reacted with this emoji
      const hasReacted = message.reactions?.[emoji]?.users.includes(user.sub);

      socket.socket.emit('reaction', {
        groupId,
        messageId,
        emoji,
        userId: user.sub,
        add: !hasReacted
      })
    } catch (error) {
      logger.error('[Chat] Error handling reaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to add reaction',
        variant: 'destructive'
      })
    }
  }

  const handleOpenThread = (message: Message) => {
    logger.info('[Chat] Opening thread locally:', {
      messageId: message.id,
      hasReplies: !!message.replies,
      replyCount: message.replies?.length || 0
    })

    // Update local thread state with existing replies
    threadStore.setActiveThread({
      parentMessage: message,
      replies: message.replies || [],
      isOpen: true
    })

    // Request thread state update from server
    if (socket?.socket) {
      socket.socket.emit('thread_sync', {
        groupId,
        messageId: message.id
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
          if (message) {
            setReplyingTo(message);
            handleOpenThread(message);
          }
        }}
        onEdit={handleEdit}
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
        chatSettings={chatSettings}
        users={users}
        isReplying={!!replyingTo}
        placeholder={replyingTo ? "Write a reply..." : "Type a message..."}
        className="bg-transparent"
        groupId={groupId}
      />
      {activeThread && (
        <MessageThread
          isOpen={activeThread.isOpen}
          onClose={() => threadStore.clearThread()}
          parentMessage={activeThread.parentMessage!}
          replies={activeThread.replies}
          onReaction={handleReaction}
          onEdit={handleEdit}
          onDelete={handleDeleteMessage}
          users={users}
          headerHeight={headerHeight}
          searchBarHeight={searchBarHeight}
        />
      )}
    </div>
  )
} 