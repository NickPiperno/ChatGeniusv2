import { cn } from '@/lib/utils'

interface MessageContentProps {
  content: string
  className?: string
}

export function MessageContent({ content, className }: MessageContentProps) {
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-p:my-0 prose-ul:my-1 prose-ol:my-1",
        "prose-li:my-0 prose-strong:font-semibold",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
} 