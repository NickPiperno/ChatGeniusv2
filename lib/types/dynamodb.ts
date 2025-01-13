import { Message, MessageReaction, MessageAttachment, MessageUpdate } from '@/types/models/message'

export type { Message, MessageReaction, MessageAttachment, MessageUpdate }

export interface GroupChat {
  id: string
  name: string
  creatorId: string
  createdAt: string
  updatedAt: string
  members: string[]
  metadata?: Record<string, any>
}

export interface FileMetadata {
  id: string
  groupId: string
  messageId: string
  name: string
  type: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: string
  metadata?: Record<string, any>
}

export interface User {
  id: string
  name: string
  email: string
  imageUrl?: string
  metadata?: Record<string, any>
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  metadata?: Record<string, any>
  createdAt: string
  readAt?: string
}

export interface UserStatus {
  userId: string
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen: string
  metadata?: Record<string, any>
}

export interface TypingIndicator {
  userId: string
  groupId: string
  messageId?: string
  isTyping: boolean
  timestamp: string
}

export interface Reaction {
  messageId: string
  emoji: string
  userId: string
  timestamp: string
}

export interface PinnedMessage {
  groupId: string
  messageId: string
  pinnedBy: string
  pinnedAt: string
  metadata?: Record<string, any>
}

export interface Mention {
  messageId: string
  userId: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface NotificationStatus {
  userId: string
  groupId: string
  lastReadAt: string
  metadata?: Record<string, any>
}

export interface ThreadReadStatus {
  messageId: string
  userId: string
  lastReadAt: string
  metadata?: Record<string, any>
}

export const TableNames = {
  Messages: 'Messages',
  GroupChats: 'GroupChats',
  FileMetadata: 'FileMetadata',
  Users: 'Users',
  Notifications: 'Notifications',
  UserStatus: 'UserStatus',
  TypingIndicators: 'TypingIndicators',
  Reactions: 'Reactions',
  PinnedMessages: 'PinnedMessages',
  MessageReplies: 'MessageReplies',
  Mentions: 'Mentions',
  ThreadReadStatus: 'ThreadReadStatus'
} as const 