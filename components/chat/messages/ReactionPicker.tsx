'use client'

import { cn } from '@/lib/utils'

const commonEmojis = ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🚀', '✨']

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  className?: string
}

export function ReactionPicker({
  onSelect,
  className
}: ReactionPickerProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-2 bg-white rounded-md min-w-[160px]', className)}>
      {commonEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSelect(emoji)
          }}
          className="flex items-center justify-center text-xl hover:bg-accent/10 p-2 rounded-md transition-colors duration-200"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
} 