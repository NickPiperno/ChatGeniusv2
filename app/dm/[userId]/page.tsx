'use client'

import { useParams } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useEffect, useState } from 'react'
import { AppUser } from '@/types/models/user'
import { useUsers } from '@/hooks/data/use-users'

export default function DMPage() {
  console.log('DMPage mounted')
  
  const params = useParams()
  const userId = params.userId as string
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chatSettings, setChatSettings] = useState({ enterToSend: true })
  const { users: allUsers, isLoading: isLoadingUsers } = useUsers()

  // Log whenever users or loading state changes
  console.log('DMPage render:', { allUsers, isLoadingUsers })

  useEffect(() => {
    console.log('%c[DMPage] Users state:', 'background: #222; color: #00ff00', {
      allUsersCount: allUsers?.length,
      isLoadingUsers,
      currentUserId: userId,
      hasCurrentUser: !!user,
      allUsers
    })
  }, [allUsers, isLoadingUsers, userId, user])

  useEffect(() => {
    async function fetchUserDetails() {
      console.log('%c[DMPage] Fetching user details for:', 'background: #222; color: #00ff00', userId)
      try {
        const response = await fetch(`/api/users/${userId}`)
        console.log('%c[DMPage] User details response:', 'background: #222; color: #00ff00', response.status)
        if (!response.ok) {
          throw new Error('Failed to fetch user')
        }
        const userData = await response.json()
        console.log('%c[DMPage] User data received:', 'background: #222; color: #00ff00', {
          id: userData.id,
          name: userData.name,
          username: userData.username,
          fullData: userData
        })
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email || '',
          username: userData.username,
          fullName: userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}`
            : userData.name,
          status: userData.status || 'offline',
          imageUrl: userData.avatarUrl || userData.imageUrl,
          isOnline: userData.isOnline || false,
          lastActive: userData.lastActive ? new Date(userData.lastActive) : undefined,
          preferences: userData.preferences || {}
        })
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchUserDetails()
    }
  }, [userId])

  if (isLoading || isLoadingUsers) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen">User not found</div>
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatInterface 
        groupId={`dm-${userId}`}
        isDM={true}
        otherUser={user}
        users={allUsers}
        chatSettings={chatSettings}
        headerHeight={64}
        searchBarHeight={0}
      />
    </div>
  )
} 