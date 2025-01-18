'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Hash, MoreVertical, Pencil, Trash2, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Group } from '@/types/models/group'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import { useUsers } from '@/hooks/data/use-users'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import * as Portal from '@radix-ui/react-portal'

interface GroupCardProps {
  group: Group
  isCollapsed: boolean
  isActive: boolean
  canEdit: boolean
  onEdit: (groupId: string) => void
  onDelete: (groupId: string) => Promise<void>
}

export function GroupCard({
  group,
  isCollapsed,
  isActive,
  canEdit,
  onEdit,
  onDelete
}: GroupCardProps) {
  const router = useRouter()
  const { user } = useUser()
  const { users } = useUsers()
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  // Find the creator's information
  const creator = users.find(u => u.id === group.userId)

  const handleDelete = () => {
    onDelete(group.id)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(group.id)
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top + rect.height / 2
    })
    setShowTooltip(true)
  }

  return (
    <div
      className={cn(
        'group flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer',
        isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white',
      )}
      onClick={() => router.push(`/groups/${group.id}`)}
    >
      <div className="flex items-center min-w-0">
        <Hash className="h-4 w-4 shrink-0 mr-2" />
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {group.name}
            </span>
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Crown className="h-4 w-4 text-yellow-500 shrink-0" />
            </div>
            {showTooltip && (
              <Portal.Root>
                <div
                  className="fixed bg-secondary py-1 px-2 rounded-md shadow-md z-[100] transform -translate-y-1/2"
                  style={{
                    left: tooltipPosition.x,
                    top: tooltipPosition.y,
                  }}
                >
                  <p className="text-[10px] whitespace-nowrap text-foreground">
                    Created by {creator?.displayName || 'Unknown'}
                  </p>
                </div>
              </Portal.Root>
            )}
          </div>
        )}
      </div>
      
      {!isCollapsed && canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-gray-400">Created by {creator?.displayName || 'Unknown'}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              Edit Group
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-500 focus:text-red-500"
            >
              Delete Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
} 