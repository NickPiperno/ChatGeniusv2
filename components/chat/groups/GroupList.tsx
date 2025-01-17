'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Hash } from 'lucide-react'
import { GroupCard } from './GroupCard'
import { CreateGroupDialog } from '@/components/dialogs/CreateGroupDialog'
import { useGroups } from '@/hooks/data/use-groups'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { Group } from '@/types/models/group'
import { EditGroupDialog } from '@/components/dialogs/EditGroupDialog'
import { logger } from '@/lib/logger'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { VirtualizedList } from '@/components/ui/virtualized-list'
import { toast } from '@/components/ui/use-toast'
import { useUser } from '@auth0/nextjs-auth0/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface GroupListProps {
  isCollapsed: boolean
  onCreateGroup: (name: string) => Promise<void>
  onEditGroup: (groupId: string, name: string) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
}

function GroupListContent({
  isCollapsed,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup
}: GroupListProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const { groups, isLoading, refetch, removeGroup } = useGroups()

  const handleCreateGroup = async (name: string) => {
    try {
      logger.info('Creating new group', { name })
      await onCreateGroup(name)
      await refetch()
      setIsCreateDialogOpen(false)
    } catch (error) {
      logger.error('Failed to create group', error, { name })
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    // Check if user has permission to delete
    const group = groups?.find(g => g.id === groupId)
    if (!group || group.userId !== user?.id) {
      toast({
        title: "Permission Denied",
        description: "You can only delete groups you created.",
        variant: "destructive"
      })
      return
    }

    logger.info('Delete requested for group', { groupId })
    
    const isCurrentGroup = pathname === `/groups/${groupId}`
    let nextGroupId: string | undefined
    
    if (isCurrentGroup && groups) {
      const currentIndex = groups.findIndex(g => g.id === groupId)
      const nextGroup = groups[currentIndex + 1] || groups[currentIndex - 1]
      nextGroupId = nextGroup?.id
    }
    
    removeGroup(groupId)
    
    try {
      await onDeleteGroup(groupId)
      
      if (isCurrentGroup && nextGroupId) {
        router.push(`/groups/${nextGroupId}`)
      }
    } catch (error) {
      logger.error('Failed to delete group', error, { groupId })
      await refetch()
    }
  }

  const handleEditGroup = async (groupId: string, newName: string) => {
    // Check if user has permission to edit
    const group = groups?.find(g => g.id === groupId)
    if (!group || group.userId !== user?.id) {
      toast({
        title: "Permission Denied",
        description: "You can only edit groups you created.",
        variant: "destructive"
      })
      return
    }

    try {
      logger.info('Editing group', { groupId, newName })
      await onEditGroup(groupId, newName)
      await refetch()
      setEditingGroup(null)
    } catch (error) {
      logger.error('Failed to edit group', error, { groupId, newName })
      await refetch()
    }
  }

  // Memoize group rendering
  const renderedGroups = useMemo(() => {
    if (!groups) return null

    const sortedGroups = [...groups].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })

    const renderGroup = (group: Group) => (
      <GroupCard
        key={group.id}
        group={group}
        isCollapsed={isCollapsed}
        isActive={pathname === `/groups/${group.id}`}
        canEdit={group.userId === user?.id}
        onEdit={(groupId) => setEditingGroup(group)}
        onDelete={handleDeleteGroup}
      />
    )

    return (
      <VirtualizedList
        items={sortedGroups}
        renderItem={renderGroup}
        itemHeight={40}
        overscan={5}
      />
    )
  }, [groups, isCollapsed, pathname, user?.id])

  return (
    <div className="px-2 py-4">
      <div className="flex items-center justify-between mb-2 px-2">
        {!isCollapsed ? (
          <>
            <h2 className="text-sm font-semibold text-gray-400 uppercase">
              Groups
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg hover:bg-white/10"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg hover:bg-white/10 mx-auto"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="right"
              className="w-56 bg-gray-900 text-white border-gray-800"
            >
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : groups && groups.length > 0 ? (
                <>
                  {groups.map((group) => (
                    <DropdownMenuItem
                      key={group.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 cursor-pointer",
                        pathname === `/groups/${group.id}` && "bg-white/10"
                      )}
                      onClick={() => router.push(`/groups/${group.id}`)}
                    >
                      <Hash className="h-4 w-4" />
                      <span className="truncate">{group.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer border-t border-gray-800 mt-1"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Group</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No groups yet</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {!isCollapsed && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="space-y-[2px]">
              {renderedGroups}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No groups yet</p>
            </div>
          )}
        </>
      )}

      <CreateGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onConfirm={handleCreateGroup}
      />

      {editingGroup && (
        <EditGroupDialog
          group={editingGroup}
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
          onConfirm={(name) => handleEditGroup(editingGroup.id, name)}
        />
      )}
    </div>
  )
}

// Wrap with error boundary
export function GroupList(props: GroupListProps) {
  return (
    <ErrorBoundary
      fallback={<div className="text-center py-4 text-red-500">Failed to load groups</div>}
    >
      <GroupListContent {...props} />
    </ErrorBoundary>
  )
} 