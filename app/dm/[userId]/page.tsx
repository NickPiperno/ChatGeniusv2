'use client'

import { useParams } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useEffect, useState } from 'react'
import { AppUser } from '@/types/models/user'
import { mockUsers } from '@/lib/data'
import { logger } from '@/lib/logger'
import { SearchBar } from '@/components/SearchBar'
import { ColoredAvatar } from '@/components/ui/colored-avatar'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const SEARCH_BAR_HEIGHT = 48
const DM_HEADER_HEIGHT = 48

export default function DMPage() {
  const params = useParams()
  const userId = params.userId as string
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chatSettings] = useState({ enterToSend: true })

  useEffect(() => {
    async function fetchUserDetails() {
      try {
        // First check if this is a mock user
        const mockUser = mockUsers.find(u => u.id === userId)
        if (mockUser) {
          logger.info('Using mock user for DM:', { userId, name: mockUser.name })
          setUser(mockUser)
          setIsLoading(false)
          return
        }

        // If not a mock user, try to fetch from API
        logger.info('Fetching user details from API:', { userId })
        const response = await fetch(`/api/users/${userId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch user')
        }
        const userData = await response.json()
        
        const user: AppUser = {
          id: userData.id,
          name: userData.name,
          email: userData.email || '',
          username: userData.username,
          displayName: userData.displayName || userData.name,
          status: userData.status || 'offline',
          imageUrl: userData.avatarUrl || userData.imageUrl,
          isOnline: userData.isOnline || false,
          lastActive: userData.lastActive ? new Date(userData.lastActive) : undefined,
          preferences: userData.preferences || {}
        }
        
        logger.info('User details fetched:', { 
          userId: user.id, 
          name: user.name,
          isOnline: user.isOnline 
        })
        
        setUser(user)
      } catch (error) {
        logger.error('Error fetching user:', {
          error,
          userId,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchUserDetails()
    }
  }, [userId])

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen">User not found</div>
  }

  return (
    <div className="flex flex-col h-full">
      <SearchBar />
      <div className="sticky top-[48px] z-10 h-12 flex items-center justify-between px-6 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            {user.imageUrl ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.imageUrl} alt={user.name} />
                <AvatarFallback>
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <ColoredAvatar 
                name={user.name} 
                size="sm"
              />
            )}
            <div className={cn(
              'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-background',
              user.isOnline ? 'bg-green-500' : 'bg-gray-500'
            )} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-semibold text-lg leading-none">
              {user.displayName || user.name}
            </h1>
            <span className="text-xs text-muted-foreground">
              {user.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <ChatInterface 
          groupId={`dm-${userId}`}
          isDM={true}
          otherUser={user}
          users={[user]}
          chatSettings={chatSettings}
          headerHeight={DM_HEADER_HEIGHT}
          searchBarHeight={SEARCH_BAR_HEIGHT}
        />
      </div>
    </div>
  )
} 