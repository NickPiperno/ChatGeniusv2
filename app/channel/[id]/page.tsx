'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { AppUser } from '@/types/models/user'
import { Group } from '@/types/models/group'

export default function GroupPage() {
  const params = useParams()
  const groupId = params.id as string
  const [group, setGroup] = useState<Group | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatSettings] = useState({ enterToSend: true })

  useEffect(() => {
    async function fetchGroupDetails() {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('Fetching group data for ID:', groupId)
        const groupResponse = await fetch(`/api/groups/${groupId}`)
        console.log('Group response status:', groupResponse.status)
        
        if (!groupResponse.ok) {
          const errorData = await groupResponse.json()
          console.error('Group fetch error:', errorData)
          throw new Error(errorData.error || 'Group not found')
        }
        
        const groupData = await groupResponse.json()
        console.log('Group data:', groupData)
        setGroup(groupData)

        console.log('Fetching users for group:', groupId)
        const usersResponse = await fetch(`/api/groups/${groupId}/users`)
        console.log('Users response status:', usersResponse.status)
        
        if (!usersResponse.ok) {
          const errorData = await usersResponse.json()
          console.error('Users fetch error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch users')
        }
        
        const usersData = await usersResponse.json()
        console.log('Users data:', usersData)
        setUsers(usersData)
      } catch (err) {
        console.error('Error fetching group details:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    if (groupId) {
      fetchGroupDetails()
    }
  }, [groupId])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  if (!group) {
    return <ErrorMessage message="Group not found" />
  }

  return (
    <div className="flex flex-col h-screen">
      <ErrorBoundary>
        <ChatInterface 
          groupId={groupId}
          users={users}
          chatSettings={chatSettings}
          headerHeight={64}
        />
      </ErrorBoundary>
    </div>
  )
}

