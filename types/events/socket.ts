import { Message } from '../models/message'

// Message data interfaces
export interface MessageData {
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

export interface ReactionData {
  groupId: string
  messageId: string
  emoji: string
  userId: string
  parentId?: string
  add: boolean
}

// Event interfaces
export interface TypingEvent {
  userId: string
  groupId: string
  isTyping: boolean
}

export interface ReactionEvent extends ReactionData {}

export interface MessageEvent {
  message: Message
  groupId: string
}

export interface ThreadEvent {
  message: Message
  replies: Message[]
  isOpen: boolean
}

export interface UserStatusEvent {
  userId: string
  status: 'online' | 'offline' | 'away' | 'busy'
}

export interface GroupEvent {
  groupId: string
  action: 'created' | 'updated' | 'deleted'
  data?: any
}

export interface MessageUpdateEvent {
  messageId: string
  groupId: string
  content: string
  edited: boolean
}

export interface MessageDeleteEvent {
  messageId: string
  groupId: string
}

// Typing indicator for DynamoDB
export interface TypingIndicator {
  groupId: string
  userId: string
  isTyping: boolean
  updatedAt: number
}

// Socket.IO event interfaces
export interface ServerToClientEvents {
  error: (data: { message: string }) => void
  message: (data: MessageEvent) => void
  thread_update: (data: ThreadEvent) => void
  reaction: (data: ReactionEvent) => void
  delete_message: (data: MessageDeleteEvent) => void
  edit_message: (data: MessageUpdateEvent) => void
  thread_sync: (data: { messageId: string; message: Message; replies: Message[] }) => void
  thread_typing: (data: { messageId: string; userId: string; isTyping: boolean }) => void
  thread_read: (data: { messageId: string; userId: string; lastReadTimestamp: string }) => void
  group_name_updated: (data: { groupId: string; name: string }) => void
}

export interface ClientToServerEvents {
  join_conversation: (groupId: string) => void
  leave_conversation: (groupId: string) => void
  thread_update: (data: ThreadEvent) => void
  reaction: (data: ReactionEvent) => void
  message: (data: MessageData) => void
  delete_message: (data: MessageDeleteEvent) => void
  edit_message: (data: MessageUpdateEvent) => void
  thread_sync: (messageId: string) => void
  thread_typing: (data: { messageId: string; isTyping: boolean }) => void
  thread_read: (data: { messageId: string; lastReadTimestamp: string }) => void
  group_name_updated: (data: { groupId: string; name: string }) => void
} 