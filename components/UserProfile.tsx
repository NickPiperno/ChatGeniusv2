import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'
import { User } from '@/types/models/user'

interface UserProfileProps {
  userId: string
}

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchApi(`/api/users/${userId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch user profile: ${response.statusText}`)
        }
        const data = await response.json()
        setUser(data)
      } catch (err) {
        logger.error('Error fetching user profile:', err)
        setError('Failed to load user profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (!user) {
    return <div>User not found</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={user.imageUrl} alt={user.displayName} />
            <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{user.displayName}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 