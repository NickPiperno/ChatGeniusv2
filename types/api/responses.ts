import { Message } from '../models/message'
import { Channel } from '../models/channel'
import { User } from '../models/user'

// Message API responses
export interface MessageResponse extends Message {
  error?: string
}

export interface MessagesResponse {
  messages: Message[]
  nextCursor?: string
  error?: string
}

// Channel API responses
export interface ChannelResponse extends Channel {
  error?: string
}

export interface ChannelsResponse {
  channels: Channel[]
  error?: string
}

// User API responses
export interface UserResponse extends User {
  error?: string
}

export interface UsersResponse {
  users: User[]
  error?: string
}

// File API responses
export interface FileUploadResponse {
  id: string
  url: string
  name: string
  type: string
  error?: string
}

// Error response
export interface ErrorResponse {
  error: string
  code?: string
  details?: any
} 