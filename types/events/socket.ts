import { Message, MessageReaction } from '../models/message'

// WebSocket event types for real-time updates
export interface TypingEvent {
  userId: string
  groupId: string
  isTyping: boolean
}

export interface ReactionEvent {
  messageId: string
  groupId: string
  emoji: string
  userId: string
  add: boolean
}

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

// Typing indicator as stored in DynamoDB
export interface TypingIndicator {
  groupId: string
  userId: string
  isTyping: boolean
  updatedAt: number
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