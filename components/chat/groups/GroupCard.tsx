'use client'

import { useRouter } from 'next/navigation'
import { Hash, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Group } from '@/types/models/group'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface GroupCardProps {
  group: Group
  isCollapsed: boolean
  isActive: boolean
  onEdit: (groupId: string) => void
  onDelete: (groupId: string) => void
}

export function GroupCard({
  group,
  isCollapsed,
  isActive,
  onEdit,
  onDelete
}: GroupCardProps) {
  const router = useRouter()
  const { user } = useUser()

  const handleDelete = () => {
    console.log('[GroupCard] Attempting to delete group:', {
      groupId: group.id,
      groupName: group.name,
      userId: user?.id,
      isCreator: user?.id === group.creatorId,
      creatorId: group.creatorId,
      isBabyGroup: group.name === 'baby'
    })
    onDelete(group.id)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(group.id)
  }

  return (
    <div
      className={cn(
        'group flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer',
        isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white',
      )}
      onClick={() => router.push(`/group/${group.id}`)}
    >
      <div className="flex items-center min-w-0">
        <Hash className="h-4 w-4 shrink-0 mr-2" />
        {!isCollapsed && (
          <span className="truncate text-sm font-medium">
            {group.name}
          </span>
        )}
      </div>
      
      {!isCollapsed && (
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