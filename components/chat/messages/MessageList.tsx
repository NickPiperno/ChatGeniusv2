'use client'

import { Message } from '@/types/models/message'
import { MessageItem } from './MessageItem'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

interface MessageListProps {
  messages: Message[]
  onReaction: (messageId: string, emoji: string) => void
  onReply: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  isLoading?: boolean
  className?: string
  showThreadPreview?: boolean
  noPadding?: boolean
}

export function MessageList({
  messages = [],
  onReaction,
  onReply,
  onEdit,
  onDelete,
  isLoading,
  className,
  showThreadPreview = true,
  noPadding = false
}: MessageListProps) {
  // Handle cases where messages is not an array
  const messageArray = Array.isArray(messages) ? messages : []

  return (
    <div className={cn(
      !noPadding && "px-4",
      className
    )}>
      {messageArray.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onReaction={onReaction}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          showThreadPreview={showThreadPreview}
        />
      ))}
      {isLoading && (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      )}
      {!isLoading && messageArray.length === 0 && (
        <div className="flex justify-center py-4 text-muted-foreground">
          No messages yet
        </div>
      )}
    </div>
  )
} 