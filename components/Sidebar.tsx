'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { users } from '@/lib/data'
import { useUser } from '@clerk/nextjs'
import { io } from 'socket.io-client'
import { EditGroupDialog } from './dialogs/EditGroupDialog'
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { GroupList } from './chat/groups/GroupList'
import { DirectMessageList } from './chat/dm/DirectMessageList'
import { Group } from '@/types/models/group'
import { UserProfile } from './user/UserProfile'
import { ErrorBoundary } from './ui/feedback/ErrorBoundary'
import { useGroups } from '@/hooks/data/use-groups'
import { useSocket } from '@/hooks/realtime'
import { logger } from '@/lib/logger'

// Add direct message users
const directMessages = users

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const { groups, refetch, removeGroup, clearPendingDeletion } = useGroups()
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { socket } = useSocket()

  const handleCreateGroup = async (name: string) => {
    try {
      logger.info('Creating group:', {
        name,
        userId: user?.id
      })

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
      })

      const responseText = await response.text()
      logger.debug('Create group response:', {
        status: response.status,
        text: responseText
      })

      if (!response.ok) {
        throw new Error(`Failed to create group: ${responseText}`)
      }

      const group = JSON.parse(responseText)
      logger.info('Group created successfully:', {
        id: group.id,
        name: group.name,
        creatorId: group.creatorId
      })

      await refetch()
    } catch (error) {
      logger.error('Error creating group:', error)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    logger.info('Starting group deletion:', {
      groupId,
      userId: user?.id,
      currentPath: pathname,
      currentGroups: groups?.map(g => ({ id: g.id, name: g.name }))
    })

    try {
      logger.debug('Removing group from local state:', groupId)
      removeGroup(groupId)

      if (pathname === `/group/${groupId}`) {
        logger.debug('Currently in deleted group, redirecting to home')
        router.push('/')
      }

      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Delete response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          headers: Object.fromEntries(response.headers.entries())
        })
        
        let errorMessage = 'Failed to delete group'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      logger.debug('Server confirmed deletion:', groupId)
      logger.debug('Syncing with server')
      clearPendingDeletion(groupId)
      await refetch()
      
      logger.debug('Deletion process completed')
    } catch (error) {
      logger.error('Error deleting group:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      await refetch()
      throw error
    }
  }

  const handleEditGroup = async (groupId: string, newName: string) => {
    try {
      logger.info('Updating group:', { groupId, newName })
      
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName })
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Update response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          headers: Object.fromEntries(response.headers.entries())
        })
        
        let errorMessage = 'Failed to update group'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      const updatedGroup = await response.json()
      logger.info('Group updated successfully:', updatedGroup)
      await refetch()
    } catch (error) {
      logger.error('Error updating group:', error)
      throw error
    }
  }

  if (!user) return null

  return (
    <ErrorBoundary>
      <Collapsible
        open={!isCollapsed}
        onOpenChange={(open: boolean) => setIsCollapsed(!open)}
        className={cn(
          "transition-all duration-300 ease-in-out relative",
          isCollapsed ? "w-16" : "w-64",
          "flex flex-col flex-shrink-0 bg-gray-900 text-white"
        )}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-800 bg-gray-800/50">
          {!isCollapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
              ChatGenius
            </h1>
          )}
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(
                "h-8 w-8 p-0 rounded-full hover:bg-gray-800 transition-colors",
                isCollapsed && "absolute -right-4 bg-gray-900 hover:bg-gray-800 border border-gray-800",
                isCollapsed && "left-1/2 -translate-x-1/2 top-4"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-400 hover:text-white" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-400 hover:text-white" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <UserProfile isCollapsed={isCollapsed} />

        <ScrollArea className="flex-1">
          <GroupList
            isCollapsed={isCollapsed}
            onCreateGroup={handleCreateGroup}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
          />
          <DirectMessageList
            isCollapsed={isCollapsed}
            directMessages={directMessages}
          />
        </ScrollArea>
        <div className="flex-shrink-0 p-4 border-t border-gray-800">
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center p-2 rounded-lg transition-colors hover:bg-white/10 hover:text-white",
              pathname === '/settings' && "bg-white/10 text-white",
              isCollapsed ? "justify-center" : "justify-start"
            )}
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-4 w-4" />
            {!isCollapsed && <span className="ml-3">Settings</span>}
          </Button>
        </div>

        {/* Edit Group Dialog */}
        {editingGroup && (
          <EditGroupDialog
            isOpen={true}
            onClose={() => setEditingGroup(null)}
            onSave={async (newName) => {
              if (editingGroup) {
                await handleEditGroup(editingGroup.id, newName)
                setEditingGroup(null)
              }
            }}
            initialName={editingGroup.name}
          />
        )}
      </Collapsible>
    </ErrorBoundary>
  )
}

