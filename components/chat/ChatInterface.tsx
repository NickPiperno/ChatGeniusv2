'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSocket } from '@/hooks/realtime'
import { Message, MessageReaction } from '@/types/models/message'
import { User } from '@/types/models/user'
import { ReactionEvent, ThreadEvent } from '@/types/events/socket'
import { MessageList } from './messages/MessageList'
import { MessageInputTiptap } from './input/MessageInputTiptap'
import { MessageThread } from './thread/MessageThread'
import { useThreadStore } from '@/lib/store/thread'
import { useToast } from '@/components/ui/use-toast'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { logger } from '@/lib/logger'
import { ReplyBanner } from './input/ReplyBanner'
import { cn } from '@/lib/utils'

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

export function ChatInterface({
  groupId,
  users,
  isDM = false,
  otherUser,
  chatSettings,
  headerHeight,
  searchBarHeight
}: ChatInterfaceProps) {
  const { user } = useUser()
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { activeThread, setActiveThread } = useThreadStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  // Add debug logging
  useEffect(() => {
    console.log('[ChatInterface] Height props:', {
      headerHeight,
      searchBarHeight,
      totalHeight: headerHeight + searchBarHeight,
      calculatedHeight: `calc(100vh - ${headerHeight}px)`
    })
  }, [headerHeight, searchBarHeight])

  // Debug socket connection
  useEffect(() => {
    console.log('[Chat] Socket connection status:', {
      hasSocket: !!socket,
      isConnected,
      socketId: socket?.id,
      groupId
    })

    if (socket) {
      socket.on('connect', () => {
        console.log('[Chat] Socket connected:', socket.id)
      })

      socket.on('disconnect', () => {
        console.log('[Chat] Socket disconnected')
      })

      socket.on('error', (error: any) => {
        console.error('[Chat] Socket error:', error)
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to chat server',
          variant: 'destructive'
        })
      })
    }

    return () => {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
        socket.off('error')
      }
    }
  }, [socket, isConnected, groupId, toast])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const lastMessageTime = new Date(lastMessage.timestamp).getTime()
      
      // Only scroll for new messages (created in the last second)
      if (lastMessageTime > Date.now() - 1000) {
        const chatContainer = messagesEndRef.current.parentElement
        if (chatContainer) {
          const { scrollHeight, scrollTop, clientHeight } = chatContainer
          const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 100 // Within 100px of bottom
          
          if (isScrolledToBottom) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }
    }
  }, [messages])

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log('[Chat] Fetching messages for group:', groupId)
        const response = await fetch(`/api/groups/${groupId}/messages`)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('[Chat] Error response:', errorData)
          throw new Error(errorData.message || 'Failed to fetch messages')
        }
        
        const data = await response.json()
        
        // Add detailed logging of message structure
        console.log('[Chat] Message data analysis:', {
          totalMessages: data.length,
          messagesWithReplies: data.filter((m: Message) => (m.replies?.length ?? 0) > 0).length,
          messageDetails: data.map((m: Message) => ({
            id: m.id,
            isReply: !!m.parentId,
            hasReplies: (m.replies?.length ?? 0) > 0,
            replyCount: m.replies?.length ?? 0,
            parentId: m.parentId
          }))
        })

        // Filter out replies that should only be in threads
        const filteredMessages = data.filter((message: Message) => !message.parentId)
        console.log('[Chat] Filtered messages:', {
          originalCount: data.length,
          filteredCount: filteredMessages.length,
          removedReplies: data.length - filteredMessages.length
        })
        
        setMessages(filteredMessages)
      } catch (error) {
        console.error('[Chat] Error fetching messages:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load messages',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    fetchMessages()
  }, [groupId, toast])

  // Update message state when receiving a new message
  const handleNewMessage = (message: Message) => {
    logger.info('[Chat] New message received:', {
      messageId: message.id,
      content: message.content.substring(0, 50),
      isReply: !!message.parentId,
      parentId: message.parentId,
      hasActiveThread: !!activeThread,
      activeThreadParentId: activeThread?.parentMessage?.id
    })

    if (message.parentId) {
      // This is a reply
      if (activeThread && activeThread.parentMessage?.id === message.parentId) {
        // Thread is open and matches - add reply to thread
        logger.info('[Chat] Adding message to active thread:', {
          threadParentId: activeThread.parentMessage.id,
          replyId: message.id,
          currentRepliesCount: activeThread.replies.length
        })
        setActiveThread({
          ...activeThread,
          replies: [...activeThread.replies, message]
        })
      } else {
        // Thread not open or doesn't match - request thread state update
        logger.info('[Chat] Reply received but thread not open or mismatch - requesting thread state:', {
          parentId: message.parentId,
          activeThreadId: activeThread?.parentMessage?.id
        })
        socket?.emit('thread_update', {
          groupId,
          messageId: message.parentId,
          isOpen: true
        })
      }

      // Update parent message's reply count in the main messages array
      setMessages(prev => prev.map(msg => {
        if (msg.id === message.parentId) {
          const updatedReplies = msg.replies ? [...msg.replies, message] : [message];
          return {
            ...msg,
            replyCount: updatedReplies.length,
            replies: updatedReplies
          }
        }
        return msg
      }))
    } else {
      // Not a reply - add to main messages
      logger.info('[Chat] Adding message to main chat')
      setMessages(prev => [...prev, message])
    }
  }

  // Socket connection and events
  useEffect(() => {
    if (!socket || !isConnected) {
      logger.warn('[Chat] Socket not ready', { 
        hasSocket: !!socket, 
        isConnected,
        socketId: socket?.id
      })
      return
    }

    logger.info('[Chat] Setting up socket connection', { 
      groupId,
      socketId: socket.id,
      connectedRooms: socket.connected
    })
    
    // Join the conversation room
    socket.emit('join_conversation', groupId)

    // Handle notifications
    const handleNotification = (notification: {
      type: 'mention' | 'reply' | 'reaction'
      messageId: string
      groupId: string
      actorId: string
      actorName: string
      content: string
    }) => {
      logger.info('[Chat] Received notification:', {
        type: notification.type,
        messageId: notification.messageId,
        actorName: notification.actorName
      })

      // Show toast notification
      toast({
        title: `New ${notification.type}`,
        description: `${notification.actorName} ${notification.type === 'mention' ? 'mentioned you' : 'replied to your message'} in a message`,
        variant: 'default'
      })
    }

    socket.on('notification', handleNotification)

    // Handle reconnection
    const handleReconnect = (attempt: number) => {
      logger.info('[Chat] Socket reconnected, rejoining room', {
        groupId,
        socketId: socket.id,
        attempt
      })
      socket.emit('join_conversation', groupId)
    }

    socket.on('reconnect', handleReconnect)
    
    // Message events
    socket.on('message', handleNewMessage)

    // Handle thread state updates
    const handleThreadState = (event: ThreadEvent) => {
      logger.info('[Chat] Received thread_state', {
        messageId: event.message?.id,
        hasMessage: !!event.message,
        replyCount: event.replies?.length || 0,
        isOpen: event.isOpen
      });

      const { message, replies, isOpen } = event;

      // Update the parent message's reply count in the main messages list
      if (message) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === message.id) {
            return {
              ...msg,
              replies: replies || [],
              replyCount: replies?.length || 0
            };
          }
          return msg;
        }));
      }

      if (isOpen) {
        logger.info('[Chat] Opening thread', {
          messageId: message?.id,
          replyCount: replies?.length || 0
        });
        setActiveThread({
          parentMessage: message,
          replies: replies || [],
          isOpen: true
        });
      } else {
        logger.info('[Chat] Closing thread');
        setActiveThread(null);
      }
    };

    socket.on('thread_state', handleThreadState);
    
    // Reaction update events
    const handleReactionUpdate = (data: { messageId: string; reactions: Record<string, MessageReaction> }) => {
      console.log('[Chat] Received reaction update:', {
        messageId: data.messageId,
        reactionCount: Object.keys(data.reactions).length
      });

      // Update reaction in thread if applicable
      if (activeThread?.parentMessage?.id === data.messageId) {
        useThreadStore.getState().setActiveThread({
          ...activeThread,
          parentMessage: {
            ...activeThread.parentMessage,
            reactions: data.reactions
          }
        });
      } else if (activeThread) {
        useThreadStore.getState().updateReply(data.messageId, {
          reactions: data.reactions
        });
      }

      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            reactions: data.reactions
          };
        }
        return msg;
      }));
    };

    socket.on('reaction_update', handleReactionUpdate);

    // Message update events
    const handleMessageUpdate = (data: { messageId: string; content: string; edited: boolean }) => {
      console.log('[Chat] Received message update:', {
        messageId: data.messageId,
        content: data.content.substring(0, 50)
      });

      // Update message in thread if applicable
      if (activeThread?.parentMessage?.id === data.messageId) {
        useThreadStore.getState().setActiveThread({
          ...activeThread,
          parentMessage: {
            ...activeThread.parentMessage,
            content: data.content,
            edited: data.edited
          }
        });
      } else if (activeThread) {
        useThreadStore.getState().updateReply(data.messageId, {
          content: data.content,
          edited: data.edited
        });
      }

      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            content: data.content,
            edited: data.edited
          };
        }
        return msg;
      }));
    };

    socket.on('message_update', handleMessageUpdate);

    // Handle message deletions
    const handleMessageDelete = (data: { messageId: string }) => {
      console.log('[Chat] Message deleted:', data.messageId);
      
      // Remove message from thread if applicable
      if (activeThread?.parentMessage?.id === data.messageId) {
        useThreadStore.getState().clearThread();
      } else if (activeThread) {
        const updatedReplies = activeThread.replies.filter(reply => reply.id !== data.messageId);
        useThreadStore.getState().setActiveThread({
          ...activeThread,
          replies: updatedReplies
        });
      }

      // Remove message from messages list
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    };

    socket.on('message_delete', handleMessageDelete);

    // Cleanup function
    return () => {
      logger.info('[Chat] Cleaning up socket events')
      socket.off('notification', handleNotification)
      socket.off('message', handleNewMessage)
      socket.off('thread_state', handleThreadState)
      socket.off('reaction_update', handleReactionUpdate)
      socket.off('message_update', handleMessageUpdate)
      socket.off('message_delete', handleMessageDelete)
      socket.off('reconnect', handleReconnect)
      socket.emit('leave_conversation', groupId)
    }
  }, [socket, isConnected, groupId])

  // Handle sending messages
  const handleSendMessage = async (content: string, attachments: Array<{
    id: string
    name: string
    url: string
    type: 'document' | 'image'
  }> = []) => {
    if (!socket || !isConnected || !user) {
      logger.error('[Chat] Cannot send message:', {
        hasSocket: !!socket,
        isConnected,
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
      userId: user.id,
      isReply: !!replyingTo,
      replyingToMessage: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content.substring(0, 50)
      } : null
    })

    const messageData = {
      content,
      senderId: user.id,
      senderName: user.fullName || user.username,
      senderImageUrl: user.imageUrl,
      groupId,
      attachments,
      ...(replyingTo && {
        parentId: replyingTo.id
      })
    }

    logger.info('[Chat] Constructed message data:', {
      ...messageData,
      content: messageData.content.substring(0, 50),
      hasParentId: !!messageData.parentId
    })

    socket.emit('message', {
      message: messageData,
      groupId
    }, (error: any) => {
      if (error) {
        logger.error('[Chat] Error sending message:', error)
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive'
        })
      } else {
        logger.info('[Chat] Message sent successfully')
        if (replyingTo) {
          logger.info('[Chat] Clearing reply state')
          setReplyingTo(null)
        }
      }
    })
  }

  const handleReaction = async (messageId: string, emoji: string, parentId?: string) => {
    if (!socket || !user) return

    try {
      logger.info('[Chat] Adding reaction to message:', {
        messageId,
        emoji,
        parentId,
        userId: user.id
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

      const hasReacted = message.reactions[emoji]?.users.includes(user.id)
      socket.emit('reaction', {
        groupId,
        messageId,
        emoji,
        userId: user.id,
        parentId,
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

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    setReplyingTo(message)
    setActiveThread({
      parentMessage: message,
      replies: message.replies || [],
      isOpen: true
    })
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
    setActiveThread(null)
  }

  const handleSendReply = async (content: string, attachments: File[] = []): Promise<void> => {
    if (!socket || !isConnected || !user || !activeThread?.parentMessage) {
      logger.error('[Chat] Cannot send reply:', {
        hasSocket: !!socket,
        isConnected,
        hasUser: !!user,
        hasParentMessage: !!activeThread?.parentMessage
      })
      return
    }

    logger.info('[Chat] Sending reply:', {
      content: content.substring(0, 50),
      parentId: activeThread.parentMessage.id,
      groupId
    })

    const messageData = {
      content,
      senderId: user.id,
      senderName: user.fullName || user.username,
      senderImageUrl: user.imageUrl,
      groupId,
      parentId: activeThread.parentMessage.id,
      attachments
    }

    return new Promise<void>((resolve, reject) => {
      socket.emit('message', {
        message: messageData,
        groupId
      }, (error: any) => {
        if (error) {
          logger.error('[Chat] Error sending reply:', error)
          reject(error)
        } else {
          logger.info('[Chat] Reply sent successfully')
          resolve()
        }
      })
    })
  }

  const handleCloseThread = () => {
    setActiveThread(null)
    setReplyingTo(null)
    if (socket?.connected) {
      socket.emit('thread_update', {
        groupId,
        messageId: activeThread?.parentMessage?.id,
        isOpen: false
      })
    }
  }

  const handleEdit = async (messageId: string, content: string) => {
    if (!socket || !isConnected) return;

    try {
      // Strip HTML tags from content
      const cleanContent = content.replace(/<\/?[^>]+(>|$)/g, "").trim();
      
      logger.info('[Chat] Editing message:', {
        messageId,
        content: cleanContent.substring(0, 50),
        isReply: !!activeThread?.replies.find(reply => reply.id === messageId)
      });

      socket.emit('edit_message', {
        groupId,
        messageId,
        content: cleanContent
      });
    } catch (error) {
      logger.error('[Chat] Error editing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!socket || !socket.connected) {
      toast({
        title: "Error",
        description: "Cannot delete message: Socket not connected",
        variant: "destructive"
      });
      return;
    }

    try {
      logger.info('[Chat] Deleting message:', {
        messageId,
        isReply: !!activeThread?.replies.find(reply => reply.id === messageId)
      });
      
      socket.emit('delete_message', {
        groupId,
        messageId
      });

      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    } catch (error) {
      logger.error('[Chat] Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLoadMoreReplies = async (messageId: string, page: number): Promise<Message[]> => {
    if (!socket || !isConnected) {
      throw new Error('Not connected to chat server');
    }

    return new Promise((resolve, reject) => {
      socket.emit('load_thread_replies', {
        groupId,
        messageId,
        page,
        limit: 20
      }, (error: any, replies: Message[]) => {
        if (error) {
          console.error('[Chat] Error loading replies:', error);
          reject(error);
        } else {
          console.log('[Chat] Loaded replies:', {
            messageId,
            page,
            count: replies.length
          });
          resolve(replies);
        }
      });
    });
  };

  return (
    <div 
      className="flex flex-col h-[calc(100vh-var(--total-header-height))]" 
      style={{ '--total-header-height': `${headerHeight + searchBarHeight}px` } as any}
    >
      <div className="flex-1 overflow-y-auto px-4">
        <div className="pt-6" />
        <MessageList
          messages={messages}
          onReaction={handleReaction}
          onReply={handleReply}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
          className="min-h-full"
          showThreadPreview={true}
          noPadding
        />
        <div ref={messagesEndRef} className="h-20" />
      </div>
      
      <div className={cn(
        "sticky bottom-4 flex flex-col gap-2 mx-4 p-4 border rounded-lg bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm mb-4",
        activeThread ? "mr-[416px]" : "mr-4"
      )}>
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
      </div>

      {activeThread && activeThread.parentMessage && (
        <MessageThread
          isOpen={true}
          parentMessage={activeThread.parentMessage}
          replies={activeThread.replies}
          onClose={handleCloseThread}
          onReaction={handleReaction}
          onEdit={handleEdit}
          onDelete={handleDelete}
          users={users}
          headerHeight={headerHeight}
          searchBarHeight={searchBarHeight}
          onLoadMoreReplies={handleLoadMoreReplies}
        />
      )}
    </div>
  )
} 