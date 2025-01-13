'use client'

import { Button } from '@/components/ui/button'
import { ColoredAvatar } from '@/components/ui/colored-avatar'
import { cn } from '@/lib/utils'
import { DirectMessage } from '@/types/models/group'

interface DirectMessageCardProps {
  directMessage: DirectMessage
  isCollapsed: boolean
  isActive: boolean
  onSelect: () => void
}

export function DirectMessageCard({
  directMessage,
  isCollapsed,
  isActive,
  onSelect
}: DirectMessageCardProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full flex items-center p-2 rounded-lg transition-colors hover:bg-white/10 hover:text-white',
        isActive && 'bg-white/10 text-white',
        isCollapsed ? 'justify-center px-0' : 'justify-start'
      )}
      onClick={onSelect}
    >
      <div className={cn(
        "relative",
        isCollapsed && "flex justify-center w-full"
      )}>
        <ColoredAvatar name={directMessage.name} size="sm" />
        <div className={cn(
          'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-gray-900',
          directMessage.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
        )} />
      </div>
      {!isCollapsed && <span className="ml-3 truncate">{directMessage.name}</span>}
    </Button>
  )
} 