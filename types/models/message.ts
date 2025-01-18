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

export interface MessageSender {
  id: string
  displayName: string
  imageUrl: string
}

export interface Message {
  id: string
  groupId: string
  content: string
  userId: string
  displayName: string
  imageUrl: string
  timestamp: string
  reactions: Record<string, any>
  attachments: MessageAttachment[]
  metadata: Record<string, any>
  replyCount: number
  parentId?: string
  edited?: boolean
  sender: {
    id: string
    displayName: string
    imageUrl: string
  }
  replies: Message[]
}

export interface MessageUpdate {
  content?: string
  metadata?: Record<string, any>
  reactions?: Record<string, any>
  attachments?: MessageAttachment[]
}

export interface ThreadState {
  parentMessage: Message | null
  replies: Message[]
  isOpen: boolean
} 