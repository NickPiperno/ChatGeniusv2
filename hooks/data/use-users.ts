import { useState, useEffect } from 'react'
import { User } from '@/types/models/user'

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
  console.log('useUsers hook called')
  
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('useUsers effect running')
    const fetchUsers = async () => {
      console.log('Fetching users...')
      try {
        const response = await fetch('/api/users')
        console.log('Users response:', response.status)
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Users error:', errorText)
          throw new Error('Failed to fetch users')
        }
        const data = await response.json()
        console.log('Users data:', data)
        setUsers(data)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { users, isLoading }
} 