import { Message, MessageAttachment } from './models/message'

export type { Message, MessageAttachment }

export interface TypingState {
  userId: string
  displayName: string
  timestamp: number
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  typingUsers: TypingState[]
} 