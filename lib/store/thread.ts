import { create } from 'zustand'
import { Message } from '@/types/models/message'
import { logger } from '@/lib/logger'

interface ThreadState {
  activeThread: {
    parentMessage: Message | null
    replies: Message[]
    isOpen: boolean
  } | null
}

interface ThreadStore extends ThreadState {
  setActiveThread: (thread: ThreadState['activeThread']) => void
  addReply: (reply: Message) => void
  updateReply: (messageId: string, updates: Partial<Message>) => void
  deleteReply: (messageId: string) => void
  clearThread: () => void
}

export const useThreadStore = create<ThreadStore>((set) => ({
  activeThread: null,

  setActiveThread: (thread) => {
    logger.info('[ThreadStore] Setting active thread', {
      messageId: thread?.parentMessage?.id,
      replyCount: thread?.replies?.length || 0,
      isOpen: thread?.isOpen
    })
    set({ activeThread: thread })
  },

  addReply: (reply) => set((state) => {
    if (!state.activeThread) {
      logger.warn('[ThreadStore] Cannot add reply: No active thread')
      return state
    }

    logger.info('[ThreadStore] Adding reply to thread', {
      threadId: state.activeThread.parentMessage?.id,
      replyId: reply.id
    })

    return {
      activeThread: {
        ...state.activeThread,
        replies: [...state.activeThread.replies, reply]
      }
    }
  }),

  updateReply: (messageId, updates) => set((state) => {
    if (!state.activeThread) {
      logger.warn('[ThreadStore] Cannot update reply: No active thread')
      return state
    }

    logger.info('[ThreadStore] Updating reply', {
      threadId: state.activeThread.parentMessage?.id,
      replyId: messageId,
      updates: Object.keys(updates)
    })

    return {
      activeThread: {
        ...state.activeThread,
        replies: state.activeThread.replies.map((reply) =>
          reply.id === messageId ? { ...reply, ...updates } : reply
        )
      }
    }
  }),

  deleteReply: (messageId) => set((state) => {
    if (!state.activeThread) {
      logger.warn('[ThreadStore] Cannot delete reply: No active thread')
      return state
    }

    logger.info('[ThreadStore] Deleting reply', {
      threadId: state.activeThread.parentMessage?.id,
      replyId: messageId
    })

    return {
      activeThread: {
        ...state.activeThread,
        replies: state.activeThread.replies.filter((reply) => reply.id !== messageId)
      }
    }
  }),

  clearThread: () => {
    logger.info('[ThreadStore] Clearing thread')
    set({ activeThread: null })
  }
})) 