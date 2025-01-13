import { Message } from '@/types/models/message'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ReplyBannerProps {
  replyingTo: Message | null
  onCancel: () => void
}

export function ReplyBanner({ replyingTo, onCancel }: ReplyBannerProps) {
  if (!replyingTo) return null

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted border-t">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Replying to {replyingTo.senderName}
        </span>
        <span className="text-sm text-foreground line-clamp-1">
          {replyingTo.content}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
} 