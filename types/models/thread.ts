import { Message } from './message'

export interface ThreadReadStatus {
  messageId: string
  userId: string
  lastReadAt: string
  metadata?: Record<string, any>
}

export interface ThreadState {
  parentMessage: Message | null
  replies: Message[]
  isOpen: boolean
} 