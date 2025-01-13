export interface MessageReaction {
  emoji: string
  users: string[]
  count: number
}

export interface MessageAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  metadata?: Record<string, any>
}

export interface BaseMessage {
  id: string
  groupId: string
  content: string
  senderId: string
  senderName: string
  senderImageUrl?: string
  timestamp: string
  reactions: Record<string, MessageReaction>
  attachments: MessageAttachment[]
  metadata?: Record<string, any>
  edited?: boolean
  parentId?: string
  replyCount: number
}

export interface Message extends BaseMessage {
  sender?: {
    id: string
    name: string
    imageUrl: string
  }
  replies?: Message[]
}

export interface ThreadState {
  parentMessage: Message | null
  replies: Message[]
  isOpen: boolean
}

export type MessageUpdate = Partial<BaseMessage> & {
  edited?: boolean
  editedAt?: string
} 