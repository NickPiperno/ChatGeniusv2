import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types/models/user'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'

/**
 * Hook to fetch and manage user data
 * @returns Object containing users array and loading state
 * @example
 * ```tsx
 * function UserList() {
 *   const { users, isLoading } = useUsers()
 *   
 *   if (isLoading) return <div>Loading...</div>
 *   
 *   return (
 *     <ul>
 *       {users.map(user => (
 *         <li key={user.id}>{user.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [version, setVersion] = useState(0)

  const fetchUsers = async () => {
    logger.debug('Fetching users')
    try {
      setIsLoading(true)
      const response = await fetchApi('/api/users')
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      logger.error('Error fetching users:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = useCallback(() => {
    setVersion(v => v + 1)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [version])

  return {
    users,
    isLoading,
    refetch
  }
} 