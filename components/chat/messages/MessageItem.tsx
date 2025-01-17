import { useState, useEffect } from 'react'
import { Message, MessageAttachment } from '@/types/models/message'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageContent } from './MessageContent'
import { ThreadPreview } from '../thread/ThreadPreview'
import { cn } from '@/lib/utils'
import { useUser } from '@auth0/nextjs-auth0/client'
import { formatDistanceToNow } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Reply, Smile, Edit2, Trash2, MoreHorizontal, Paperclip, MessageSquare } from 'lucide-react'
import { ReactionPicker } from './ReactionPicker'

interface MessageItemProps {
  message: Message & {
    edited?: boolean
  }
  onReaction: (messageId: string, emoji: string, previousEmoji?: string) => void
  onReply: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  showThreadPreview?: boolean
  className?: string
}

export function MessageItem({
  message,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  showThreadPreview = true,
  className
}: MessageItemProps) {
  const { user } = useUser()
  const [isHovered, setIsHovered] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const isCurrentUser = user?.sub === message.userId
  const [replyCount, setReplyCount] = useState(message.replies?.length || 0)

  const handleReaction = (emoji: string) => {
    if (!user?.sub) return
    
    const hasReacted = message.reactions?.[emoji]?.users.includes(user.sub)
    onReaction(message.id, emoji, hasReacted ? emoji : undefined)
    setShowReactionPicker(false)
  }

  const handleEdit = () => {
    const cleanContent = message.content.replace(/<\/?[^>]+(>|$)/g, "").trim()
    setIsEditing(true)
    setEditedContent(cleanContent)
  }

  const handleSaveEdit = () => {
    onEdit(message.id, editedContent)
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(message.id)
  }

  const handleReply = () => {
    onReply(message.id)
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

  useEffect(() => {
    setReplyCount(message.replyCount || message.replies?.length || 0)
  }, [message.replies, message.replyCount])

  return (
    <div
      className={cn(
        "group relative flex gap-2 px-4 py-2 hover:bg-accent/5 rounded-lg transition-colors",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowReactionPicker(false)
      }}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={message.imageUrl} alt={message.displayName} />
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs">{message.displayName}</span>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground">
              (You)
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
          {message.edited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    isHovered && "opacity-100"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleReply}>
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="relative"
                >
                  <Smile className="mr-2 h-4 w-4" />
                  Add Reaction
                </DropdownMenuItem>
                {isCurrentUser && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {showReactionPicker && (
              <div className="absolute left-full top-0 ml-2 bg-white rounded-md shadow-md p-3 z-50 border">
                <ReactionPicker onSelect={handleReaction} />
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="max-w-[40%] h-8 text-sm py-1"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setIsEditing(false)
                setEditedContent(message.content)
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <MessageContent content={message.content} />
        )}

        <div className="flex items-center gap-2 mt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(message.reactions || {})
              .filter(([_, reaction]) => reaction.count > 0)
              .map(([emoji, reaction]) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 flex items-center gap-1 px-2 py-0.5 text-xs hover:bg-accent/20",
                    reaction.users.includes(user?.sub || '') && "bg-accent/20"
                  )}
                  onClick={() => handleReaction(emoji)}
                >
                  <span>{emoji}</span>
                  <span className="text-xs font-medium">{reaction.count}</span>
                </Button>
              ))}
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="flex items-center gap-2">
              {message.attachments.map((attachment: string | MessageAttachment) => {
                if (typeof attachment === 'string') {
                  return (
                    <div
                      key={attachment}
                      className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Paperclip className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-700">{attachment}</span>
                    </div>
                  );
                }

                return (
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
                );
              })}
            </div>
          )}
            
          {replyCount > 0 && showThreadPreview && (
            <ThreadPreview
              replyCount={replyCount}
              lastReply={message.replies?.[message.replies.length - 1]}
              onClick={handleReply}
            />
          )}
        </div>
      </div>
    </div>
  )
} 