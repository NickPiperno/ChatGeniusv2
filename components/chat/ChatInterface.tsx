'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSocket } from '@/hooks/realtime'
import { Message, MessageReaction, MessageAttachment } from '@/types/models/message'
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

interface ThreadStateType {
  parentMessage: Message | null;
  replies: Message[];
  isOpen: boolean;
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
      const onConnect = () => {
        console.log('[Chat] Socket connected:', socket.id)
      }

      const onDisconnect = () => {
        console.log('[Chat] Socket disconnected')
      }

      const onError = (error: any) => {
        console.error('[Chat] Socket error:', error)
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to chat server',
          variant: 'destructive'
        })
      }

      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('error', onError)

      return () => {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('error', onError)
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
        logger.info('[Chat] Message data analysis:', {
          totalMessages: data.length,
          messagesWithReplies: data.filter((m: Message) => (m.replies?.length ?? 0) > 0).length,
          messageDetails: data.map((m: Message) => ({
            id: m.id,
            isReply: !!m.parentId,
            hasReplies: (m.replies?.length ?? 0) > 0,
            replyCount: m.replies?.length ?? 0,
            parentId: m.parentId,
            senderInfo: {
              hasImageUrl: !!m.imageUrl,
              hasSender: !!m.sender,
              senderImageUrl: m.sender?.imageUrl
            }
          }))
        })

        // Filter out replies that should only be in threads
        const filteredMessages = data.filter((message: Message) => !message.parentId)
        logger.info('[Chat] Filtered messages:', {
          originalCount: data.length,
          filteredCount: filteredMessages.length,
          removedReplies: data.length - filteredMessages.length
        })
        
        setMessages(filteredMessages)
      } catch (error) {
        logger.error('[Chat] Error fetching messages:', error)
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

  // Handle thread updates
  const onThreadUpdate = useCallback((data: { messageId: string; replies: Message[] }) => {
    logger.info('[Chat] Thread update:', data);
    
    // Update messages state to include thread replies
    setMessages(prev => {
      const parentIndex = prev.findIndex(msg => msg.id === data.messageId);
      if (parentIndex === -1) return prev;

      const newMessages = [...prev];
      newMessages[parentIndex] = {
        ...newMessages[parentIndex],
        replies: data.replies,
        replyCount: data.replies.length
      };
      return newMessages;
    });

    // Update active thread if it matches
    if (activeThread?.parentMessage?.id === data.messageId) {
      setActiveThread({
        parentMessage: activeThread.parentMessage,
        replies: data.replies,
        isOpen: true
      });
    }
  }, [activeThread, setActiveThread]);

  // Handle reactions
  const onReaction = useCallback((data: { messageId: string; reactions: MessageReaction[] }) => {
    logger.info('[Chat] Reaction:', data);
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId 
        ? { ...msg, reactions: data.reactions }
        : msg
    ));
  }, []);

  // Handle message deletion
  const onDeleteMessage = useCallback((data: { messageId: string }) => {
    logger.info('[Chat] Message deleted:', { messageId: data.messageId });
    setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
  }, []);

  // Handle message edits
  const onEditMessage = useCallback((data: { messageId: string; content: string; edited: boolean }) => {
    logger.info('[Chat] Message edited:', data);
    
    // Update message in main messages list
    setMessages(prev => prev.map(msg =>
      msg.id === data.messageId
        ? { ...msg, content: data.content, edited: data.edited }
        : msg
    ));

    // Update message in thread if applicable
    if (activeThread) {
      if (activeThread.parentMessage?.id === data.messageId) {
        // Update parent message
        setActiveThread({
          ...activeThread,
          parentMessage: {
            ...activeThread.parentMessage,
            content: data.content,
            edited: data.edited
          }
        });
      } else {
        // Update reply if it exists in thread
        const updatedReplies = activeThread.replies.map(reply =>
          reply.id === data.messageId
            ? { ...reply, content: data.content, edited: data.edited }
            : reply
        );
        setActiveThread({
          ...activeThread,
          replies: updatedReplies
        });
      }
    }
  }, [activeThread, setActiveThread]);

  // Handle new messages
  const handleNewMessage = useCallback((message: Message) => {
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
        logger.info('[Chat] Adding reply to active thread:', {
          threadParentId: activeThread.parentMessage.id,
          replyId: message.id
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

      // Update parent message's reply count in main messages
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
      // Not a reply - add to main messages only if no thread is open
      if (!activeThread) {
        logger.info('[Chat] Adding message to main chat')
        setMessages(prev => [...prev, message])
      }
    }
  }, [activeThread, setActiveThread, socket, groupId]);

  // Socket connection and events with reconnection handling
  useEffect(() => {
    if (!socket || !isConnected || !groupId) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000;
    const unsentMessages = new Set<string>();

    // Join conversation on mount
    socket.emit('join_conversation', { groupId });
    logger.info('[Chat] Joining conversation:', { groupId });

    // Handle connection state
    const handleDisconnect = () => {
      logger.warn('[Chat] Socket disconnected');
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttempts++;
          socket.connect();
        }, reconnectDelay * Math.pow(2, reconnectAttempts));
      }
    };

    const handleReconnect = () => {
      logger.info('[Chat] Socket reconnected');
      reconnectAttempts = 0;
      // Resync messages
      socket.emit('join_conversation', { groupId });
    };

    // Subscribe to events with error handling
    const subscribeToEvents = () => {
      try {
        socket.on('connect', handleReconnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('message', handleNewMessage);
        socket.on('thread_update', onThreadUpdate);
        socket.on('reaction', onReaction);
        socket.on('delete_message', onDeleteMessage);
        socket.on('edit_message', onEditMessage);
        logger.info('[Chat] Subscribed to events');
      } catch (error) {
        logger.error('[Chat] Error subscribing to events:', error);
        setTimeout(subscribeToEvents, 1000);
      }
    };

    subscribeToEvents();

    // Cleanup with error handling
    return () => {
      try {
        logger.info('[Chat] Leaving conversation:', { groupId });
        socket.emit('leave_conversation', { groupId });
        socket.off('connect', handleReconnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('message', handleNewMessage);
        socket.off('thread_update', onThreadUpdate);
        socket.off('reaction', onReaction);
        socket.off('delete_message', onDeleteMessage);
        socket.off('edit_message', onEditMessage);
        logger.info('[Chat] Unsubscribed from events');
      } catch (error) {
        logger.error('[Chat] Error cleaning up socket events:', error);
      }
    };
  }, [socket, isConnected, groupId, handleNewMessage, onThreadUpdate, onReaction, onDeleteMessage, onEditMessage]);

  // Enhanced message sending with optimistic updates
  const sendMessage = async (content: string, attachments: { id: string; name: string; url: string; type: 'image' | 'document' }[] = [], metadata: Record<string, any> = {}, parentId?: string): Promise<void> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive'
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const messageData = {
      content,
      userId: user.id,
      displayName: user.username || user.firstName || 'Anonymous',
      imageUrl: user.imageUrl || '',
      attachments: attachments.map(att => ({
        ...att,
        size: 0
      })),
      metadata,
      parentId,
      timestamp
    };

    try {
      if (!socket?.connected) {
        throw new Error('Not connected to chat server');
      }

      socket.emit('message', {
        message: messageData,
        groupId
      });

    } catch (error) {
      logger.error('[Chat] Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Will retry when connection is restored.',
        variant: 'destructive'
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!socket || !groupId || !user) return;

    try {
      // Find the message being reacted to
      const message = messages.find(m => m.id === messageId) || 
        activeThread?.replies.find(r => r.id === messageId) ||
        (activeThread?.parentMessage?.id === messageId ? activeThread.parentMessage : null);

      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user already has a reaction
      const userCurrentEmoji = Object.entries(message.reactions || {}).find(
        ([_, reaction]) => reaction.users?.includes(user.id)
      )?.[0];

      // Determine if we're adding or removing
      const isAdding = userCurrentEmoji !== emoji;

      // Apply optimistic update
      const updatedReactions = { ...message.reactions };
      
      // Remove old reaction if exists
      if (userCurrentEmoji) {
        const users = updatedReactions[userCurrentEmoji].users.filter((id: string) => id !== user.id);
        if (users.length === 0) {
          delete updatedReactions[userCurrentEmoji];
        } else {
          updatedReactions[userCurrentEmoji] = {
            ...updatedReactions[userCurrentEmoji],
            users,
            count: users.length
          };
        }
      }

      // Add new reaction if different emoji
      if (isAdding) {
        const existingReaction = updatedReactions[emoji] || { users: [], count: 0 };
        updatedReactions[emoji] = {
          ...existingReaction,
          users: [...existingReaction.users, user.id],
          count: existingReaction.count + 1
        };
      }

      // Update message state optimistically
      const updatedMessage = {
        ...message,
        reactions: updatedReactions
      };

      // Update messages state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));

      // Update thread state if needed
      if (activeThread) {
        if (activeThread.parentMessage?.id === messageId) {
          setActiveThread({
            ...activeThread,
            parentMessage: updatedMessage
          });
        } else {
          setActiveThread({
            ...activeThread,
            replies: activeThread.replies.map(reply =>
              reply.id === messageId ? updatedMessage : reply
            )
          });
        }
      }

      // Emit socket event
      socket.emit('reaction', { 
        messageId,
        emoji,
        groupId,
        userId: user.id,
        add: isAdding
      });

    } catch (error) {
      logger.error('[Chat] Error handling reaction:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update reaction',
        variant: 'destructive'
      });
    }
  };

  const handleReply = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    // Set initial state with what we have
    setReplyingTo(message)
    setActiveThread({
      parentMessage: message,
      replies: message.replies || [],
      isOpen: true
    })

    // Immediately sync thread messages if socket is connected
    if (socket?.connected) {
      try {
        logger.info('[Chat] Syncing thread messages:', { messageId });
        
        // Request thread sync
        socket.emit('thread_sync', {
          groupId,
          messageId
        });

        // Wait for thread sync response
        const replies = await new Promise<Message[]>((resolve, reject) => {
          const onThreadSync = (data: { message: Message, replies: Message[] }) => {
            if (data.message.id === messageId) {
              socket.off('thread_sync', onThreadSync);
              resolve(data.replies);
            }
          };

          socket.on('thread_sync', onThreadSync);

          // Timeout after 5 seconds
          setTimeout(() => {
            socket.off('thread_sync', onThreadSync);
            reject(new Error('Timeout waiting for thread sync'));
          }, 5000);
        });

        // Update thread with synced replies
        const updatedThread = {
          parentMessage: activeThread?.parentMessage ?? null,
          replies: replies,
          isOpen: true
        };
        setActiveThread(updatedThread);

      } catch (error) {
        logger.error('[Chat] Error syncing thread:', error);
        toast({
          title: 'Warning',
          description: 'Could not load all thread messages. Some messages may be missing.',
          variant: 'destructive'
        });
      }
    }
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
      });
      return;
    }

    logger.info('[Chat] Sending reply:', {
      content: content.substring(0, 50),
      parentId: activeThread.parentMessage.id,
      groupId
    });

    const messageData = {
      content,
      userId: user.id,
      displayName: user.fullName || 'Anonymous',
      imageUrl: user.imageUrl,
      groupId,
      parentId: activeThread.parentMessage.id,
      attachments,
      sender: {
        id: user.id,
        displayName: user.fullName || 'Anonymous',
        imageUrl: user.imageUrl
      }
    };

    socket.emit('message', {
      message: messageData,
      groupId
    });
  };

  const handleCloseThread = () => {
    setActiveThread(null)
    setReplyingTo(null)
    if (socket?.connected) {
      socket.emit('thread_update', {
        groupId,
        messageId: activeThread?.parentMessage?.id ?? '',
        isOpen: false
      })
    }
  }

  const handleEdit = async (messageId: string, content: string) => {
    if (!socket || !isConnected || !groupId) {
      toast({
        title: 'Error',
        description: 'Not connected to chat server',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Find the message being edited
      const messageToEdit = messages.find(m => m.id === messageId) || 
        activeThread?.replies.find(r => r.id === messageId) ||
        (activeThread?.parentMessage?.id === messageId ? activeThread.parentMessage : null);

      if (!messageToEdit) {
        throw new Error('Message not found');
      }

      // Validate edit permissions
      if (messageToEdit.userId !== user?.id) {
        throw new Error('You can only edit your own messages');
      }

      // Apply optimistic update
      const updatedMessage = {
        ...messageToEdit,
        content,
        edited: true,
        editedAt: new Date().toISOString()
      };

      // Update messages state optimistically
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));

      // Update thread state if needed
      if (activeThread) {
        if (activeThread.parentMessage?.id === messageId) {
          setActiveThread({
            ...activeThread,
            parentMessage: updatedMessage
          });
        } else {
          setActiveThread({
            ...activeThread,
            replies: activeThread.replies.map(reply =>
              reply.id === messageId ? updatedMessage : reply
            )
          });
        }
      }
      
      logger.info('[Chat] Editing message:', {
        messageId,
        content: content.substring(0, 50),
        isReply: !!activeThread?.replies.find(reply => reply.id === messageId)
      });

      // Emit socket event
      socket.emit('edit_message', {
        groupId,
        messageId,
        content
      });

    } catch (error) {
      logger.error('[Chat] Error editing message:', error);
      
      // Revert optimistic update on error
      const originalMessage = messages.find(m => m.id === messageId);
      if (originalMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? originalMessage : msg
        ));
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to edit message',
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

    socket.emit('thread_sync', {
      groupId,
      messageId
    })

    // Listen for thread_sync response
    return new Promise((resolve, reject) => {
      const onThreadSync = (data: { message: Message, replies: Message[] }) => {
        if (data.message.id === messageId) {
          socket.off('thread_sync', onThreadSync)
          resolve(data.replies)
        }
      }

      socket.on('thread_sync', onThreadSync)

      // Timeout after 5 seconds
      setTimeout(() => {
        socket.off('thread_sync', onThreadSync)
        reject(new Error('Timeout waiting for thread sync'))
      }, 5000)
    })
  }

  // Load more replies
  const loadMoreReplies = useCallback(() => {
    if (!socket || !groupId || !activeThread?.parentMessage) return

    socket.emit('thread_sync', {
      messageId: activeThread.parentMessage.id,
      groupId
    })
  }, [socket, groupId, activeThread])

  // Delete message
  const deleteMessage = async (messageId: string): Promise<void> => {
    if (!socket || !isConnected || !groupId) {
      toast({
        title: 'Error',
        description: 'Not connected to chat',
        variant: 'destructive'
      });
      return;
    }

    try {
      socket.emit('delete_message', {
        messageId,
        groupId
      });
    } catch (error) {
      logger.error('[Chat] Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
    }
  };

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
      isReply: !!activeThread,
      threadInfo: activeThread ? {
        parentId: activeThread.parentMessage?.id,
        isOpen: true
      } : null
    })

    const messageData = {
      content,
      userId: user.id,
      displayName: user.username || user.fullName || user.firstName || user.id,
      imageUrl: user.imageUrl,
      groupId,
      attachments,
      // If thread is open, treat message as a reply to thread parent
      ...(activeThread?.parentMessage && {
        parentId: activeThread.parentMessage.id
      }),
      sender: {
        id: user.id,
        displayName: user.username || user.fullName || user.firstName || user.id,
        imageUrl: user.imageUrl
      }
    }

    logger.info('[Chat] Constructed message data:', {
      ...messageData,
      content: messageData.content.substring(0, 50),
      hasParentId: !!messageData.parentId
    })

    socket.emit('message', {
      message: messageData,
      groupId
    })

    // Only clear replyingTo if we're not in a thread
    if (replyingTo && !activeThread) {
      logger.info('[Chat] Clearing reply state')
      setReplyingTo(null)
    }
  }

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