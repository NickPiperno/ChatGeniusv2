export interface GroupChat {
  id: string
  name: string
  createdAt: string
  userId: string
  members?: string[]
  updatedAt?: string
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

export interface DynamoDBMessage {
  id: string
  groupId: string
  content: string
  userId: string
  displayName: string
  imageUrl?: string
  timestamp: string
  reactions: Record<string, any>
  attachments: any[]
  metadata?: Record<string, any>
  replyCount: number
  parentId?: string
  sender: {
    id: string
    displayName: string
    imageUrl: string
  }
} 