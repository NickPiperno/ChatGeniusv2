'use client'

import { useState, useEffect } from 'react'
import { Group } from '@/types/models/group'
import { Message } from '@/types/models/message'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { User } from '@/types/models/user'
import { SearchBar } from '@/components/SearchBar'
import { Hash, Trash2 } from 'lucide-react'
import { useSocket } from '@/hooks/realtime'
import { useRouter } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useGroups } from '@/hooks/data/use-groups'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'
import { AppLayout } from '@/components/AppLayout'

interface GroupPageClientProps {
  group: Group
  messages: Message[]
  userId: string
}

export function GroupPageClient({ group: initialGroup, messages, userId }: GroupPageClientProps) {
  const [chatSettings] = useState({ enterToSend: true })
  const [group, setGroup] = useState(initialGroup)
  const { socket } = useSocket()
  const router = useRouter()
  const { user } = useUser()
  const { refetch: refetchGroups, removeGroup } = useGroups()
  const SEARCH_BAR_HEIGHT = 48 // Height of the search bar
  const GROUP_HEADER_HEIGHT = 48 // Height of the group header
  const isCreator = user?.sub === group.userId

  useEffect(() => {
    if (!socket) return
    
    socket.on('group_name_updated', ({ groupId, name }) => {
      if (groupId === group.id) {
        setGroup(prev => ({ ...prev, name }))
      }
    })

    return () => {
      socket.off('group_name_updated')
    }
  }, [socket, group.id])

  useEffect(() => {
    logger.debug('Group member information:', {
      groupId: group.id,
      groupName: group.name,
      userId: group.userId,
      currentUserId: user?.sub,
      isCreator: user?.sub === group.userId,
      members: group.members ?? []
    })

    logger.debug('Group creator information:', {
      groupName: group.name,
      userId: group.userId,
      isCurrentUserCreator: user?.sub === group.userId
    })
  }, [group, user])

  async function handleDeleteGroup() {
    if (!user) return

    try {
      // Check if user is creator before attempting delete
      if (user.sub !== group.userId) {
        throw new Error(`Only the group creator can delete this group. Creator ID: ${group.userId}`)
      }

      const response = await fetchApi(`/api/groups/${group.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to delete group'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      removeGroup(group.id)
      router.push('/')
      await refetchGroups()
    } catch (error) {
      logger.error('[GroupPage] Error deleting group:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        groupName: group.name,
        groupId: group.id,
        userId: group.userId,
        currentUserId: user.sub
      })
      throw error
    }
  }

  // Check if user is a member of the group
  const members = group.members ?? []
  if (!members.includes(userId)) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-500">You are not a member of this group.</p>
      </div>
    )
  }

  // Create User objects from member IDs
  const users: User[] = members.map(id => ({
    id,
    auth0Id: id,
    email: '',
    displayName: '',
    imageUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActiveAt: Date.now()
  }))

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 h-12 flex items-center px-6 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <h1 className="font-semibold text-lg truncate">{group.name}</h1>
            </div>
            {isCreator && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-100/10"
                onClick={handleDeleteGroup}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatInterface 
            groupId={group.id}
            users={users}
            chatSettings={chatSettings}
            headerHeight={GROUP_HEADER_HEIGHT}
            searchBarHeight={0}
          />
        </div>
      </div>
    </AppLayout>
  )
}