'use client'

import { useState } from 'react'
import { useUser } from "@clerk/nextjs"
import { format, isSameDay, formatDistanceToNow, parseISO } from "date-fns"
import { MessageSquare, MoreVertical, Paperclip } from "lucide-react"
import ReactMarkdown from 'react-markdown'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"
import { Message } from "@/types/models/message"
import { ReactionBar } from "./ReactionBar"
import { ReactionPicker } from "./ReactionPicker"
import { MessageContent } from './MessageContent'
import { Avatar, AvatarImage } from "@/components/ui/avatar"

interface MessageComponentProps {
  message: Message
  isReply?: boolean
  parentId?: string
  parentTimestamp?: Date
  onReaction: (messageId: string, emoji: string, parentId?: string) => void
  onReply: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  showReplies?: boolean
  hideReplyButton?: boolean
}

export function MessageComponent({ 
  message, 
  isReply = false, 
  parentId,
  parentTimestamp,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  showReplies = true,
  hideReplyButton = false
}: MessageComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const { user } = useUser()
  const isOwnMessage = user?.id === message.sender?.id

  const handleEdit = () => {
    setIsEditing(true)
    setEditedContent(message.content)
  }

  const handleSaveEdit = () => {
    if (editedContent.trim() !== message.content) {
      onEdit(message.id, editedContent)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
      setEditedContent(message.content)
    }
  }

  const shouldShowFullDate = isReply && parentTimestamp && !isSameDay(
    typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp,
    parentTimestamp
  )
  const indentationClass = isReply
    ? "pl-8 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700"
    : ""

  const formattedDate = formatDistanceToNow(
    typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp,
    { addSuffix: true }
  )

  const replyCount = message.replies?.length || 0

  return (
    <div className={cn(
      "group relative flex gap-2 px-4 py-2 transition-colors duration-200",
      "hover:bg-gray-50 dark:hover:bg-gray-800/50",
      indentationClass
    )}>
      <div className="flex-shrink-0">
        <Avatar>
          <AvatarImage 
            src={message.sender.imageUrl} 
            alt={message.sender.displayName || 'User'} 
          />
        </Avatar>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs">{message.sender?.displayName || 'Unknown User'}</span>
          <div className="flex items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>
              {formattedDate}
            </span>
            {message.edited && (
              <span className="text-[11px] text-muted-foreground">(edited)</span>
            )}
          </div>
          {isOwnMessage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit} className="text-xs">
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(message.id)}
                  className="text-red-600 text-xs"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveEdit} className="text-xs h-7">Save</Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setIsEditing(false)
                setEditedContent(message.content)
              }}
              className="text-xs h-7"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="text-xs">
              <MessageContent content={message.content} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              {Object.keys(message.reactions).length > 0 && (
                <ReactionBar
                  reactions={message.reactions}
                  onReactionClick={(emoji: string) => onReaction(message.id, emoji, parentId)}
                  className="flex-shrink-0"
                />
              )}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {message.attachments.map((attachment) => (
                    <div key={attachment.id} className="inline-block">
                      {attachment.type === 'image' ? (
                        <img 
                          src={attachment.url} 
                          alt={attachment.name}
                          className="max-w-sm rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        />
                      ) : (
                        <a 
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Paperclip className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-700">{attachment.name}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <ReactionPicker onSelect={(emoji: string) => onReaction(message.id, emoji, parentId)} />
                {!hideReplyButton && !isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => onReply(message.id)}
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    Reply
                    {replyCount > 0 && (
                      <span className="ml-1">({replyCount})</span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
        {showReplies && replyCount > 0 && !hideReplyButton && !isReply && (
          <div className="mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 h-6"
              onClick={() => onReply(message.id)}
            >
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 