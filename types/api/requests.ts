// Message API requests
export interface CreateMessageRequest {
  groupId: string
  content: string
  sender: {
    id: string
    name: string
    imageUrl: string
  }
  parentId?: string
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: 'image' | 'document'
  }>
}

export interface UpdateMessageRequest {
  messageId: string
  content: string
}

// Channel API requests
export interface CreateChannelRequest {
  name: string
  description?: string
}

export interface UpdateChannelRequest {
  name: string
}

// User API requests
export interface UpdateUserRequest {
  displayName?: string
  username?: string
  status?: 'online' | 'offline' | 'away' | 'busy'
}

// File API requests
export interface FileUploadRequest {
  file: File
  groupId: string
  messageId?: string
}

export interface MessageRequest {
  groupId: string
  content: string
  senderId: string
  senderName: string
  senderImageUrl?: string
  attachments?: any[]
  metadata?: Record<string, any>
}

export interface ReactionRequest {
  groupId: string
  messageId: string
  emoji: string
  userId: string
  add: boolean
} 