import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { User } from '@/types/models/user'

/**
 * Hook to fetch and manage the current user's data from our database
 * @returns Object containing the current user data and loading state
 */
export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('[useCurrentUser] Effect running', {
      isClerkLoaded,
      hasClerkUser: !!clerkUser,
      clerkUserId: clerkUser?.id
    })

    const fetchCurrentUser = async () => {
      if (!isClerkLoaded) {
        console.log('[useCurrentUser] Clerk not loaded yet')
        return
      }

      if (!clerkUser?.id) {
        console.log('[useCurrentUser] No Clerk user ID - user might be signed out')
        setIsLoading(false)
        setUser(null)
        return
      }

      console.log('[useCurrentUser] Fetching current user data')
      try {
        const response = await fetch('/api/user/current')
        console.log('[useCurrentUser] Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[useCurrentUser] Error:', errorText)
          throw new Error('Failed to fetch current user')
        }
        
        const data = await response.json()
        console.log('[useCurrentUser] User data:', data)
        setUser(data)
      } catch (error) {
        console.error('[useCurrentUser] Error fetching current user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()
  }, [clerkUser?.id, isClerkLoaded])

  return { user, isLoading }
} 