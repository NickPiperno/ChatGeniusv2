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
import { useUser } from '@clerk/nextjs'
import { useGroups } from '@/hooks/data/use-groups'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

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

  useEffect(() => {
    logger.debug('Component heights:', {
      searchBarHeight: SEARCH_BAR_HEIGHT,
      headerHeight: GROUP_HEADER_HEIGHT,
      totalHeight: SEARCH_BAR_HEIGHT + GROUP_HEADER_HEIGHT
    })
  }, [])

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
  }, [group.id, socket])

  useEffect(() => {
    logger.debug('Group details:', {
      groupId: group.id,
      groupName: group.name,
      creatorId: group.creatorId,
      currentUserId: user?.id,
      isCreator: user?.id === group.creatorId,
      members: group.members
    })
  }, [group, user])

  useEffect(() => {
    logger.debug('Group creator information:', {
      groupName: group.name,
      creatorId: group.creatorId,
      isCurrentUserCreator: user?.id === group.creatorId
    })
  }, [group, user])

  const handleDelete = async () => {
    if (!user) return

    try {
      // Check if user is creator before attempting delete
      if (user.id !== group.creatorId) {
        throw new Error(`Only the group creator can delete this group. Creator ID: ${group.creatorId}`)
      }

      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE'
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
        creatorId: group.creatorId,
        currentUserId: user.id
      })
      throw error
    }
  }

  // Check if user is a member of the group
  if (!group.members.includes(userId)) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-500">You are not a member of this group.</p>
      </div>
    )
  }

  // Create User objects from member IDs
  const users: User[] = group.members.map(id => ({
    id,
    name: '', // These will be populated by the server
    email: '',
    username: '',
    createdAt: Date.now(), // Use timestamp in milliseconds
    avatarUrl: ''
  }))

  return (
    <div className="flex flex-col h-full">
      <SearchBar />
      <div className="sticky top-[48px] z-10 h-12 flex items-center px-6 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h1 className="font-semibold text-lg truncate">{group.name}</h1>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <ChatInterface 
          groupId={group.id}
          users={users}
          chatSettings={chatSettings}
          headerHeight={GROUP_HEADER_HEIGHT}
          searchBarHeight={SEARCH_BAR_HEIGHT}
        />
      </div>
    </div>
  )
} 