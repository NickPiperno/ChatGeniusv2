'use client'

import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { MessageReaction } from '@/types/models/message'

interface ReactionBarProps {
  reactions: Record<string, MessageReaction>
  onReactionClick: (emoji: string) => void
  className?: string
}

export function ReactionBar({
  reactions,
  onReactionClick,
  className
}: ReactionBarProps) {
  const { user } = useUser()

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      <TooltipProvider>
        {Object.entries(reactions).map(([emoji, reaction]) => {
          const hasReacted = user?.id && reaction.users.includes(user.id)
          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onReactionClick(emoji)}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-sm hover:bg-gray-100 transition-colors',
                    hasReacted && 'bg-gray-100 border-gray-300'
                  )}
                  disabled={!user?.id}
                >
                  {emoji} {reaction.count}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {reaction.users.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {reaction.users.map((userId) => (
                        <span key={userId}>{userId}</span>
                      ))}
                    </div>
                  ) : (
                    <span>No reactions yet</span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </div>
  )
} 