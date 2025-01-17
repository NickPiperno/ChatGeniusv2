import { Message } from '@/types/models/message'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ThreadPreviewProps {
  replyCount: number
  lastReply?: Message
  onClick: () => void
}

export function ThreadPreview({ replyCount, lastReply, onClick }: ThreadPreviewProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 flex items-center gap-1 px-2 py-0.5 text-sm hover:bg-accent/20"
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4" />
      <span className="text-sm font-medium">
        {replyCount}
      </span>
      {lastReply && (
        <span className="text-xs text-muted-foreground ml-1">
          • {formatDistanceToNow(new Date(lastReply.timestamp), { addSuffix: true })}
        </span>
      )}
    </Button>
  )
} 