'use client'

import { useState, useEffect } from 'react'
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorBoundary } from "@/components/ui/feedback/ErrorBoundary"
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"

export function ProfileSettingsForm() {
  const { user } = useUser()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false)

  // Fetch current username and display name from our database
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`/api/user/username?userId=${user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setUsername(data.username || user?.username || '')
          setDisplayName(data.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '')
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setUsername(user?.username || '')
        setDisplayName(`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '')
      }
    }

    if (user?.id) {
      fetchUserData()
    }
  }, [user?.id, user?.username, user?.firstName, user?.lastName])

  const handleSaveUsername = async () => {
    if (!username.trim()) return
    setIsSavingUsername(true)
    
    try {
      const response = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          username: username,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      setIsEditingUsername(false)
      toast.success('Username updated successfully')
    } catch (error) {
      console.error('Error updating username:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update username')
    } finally {
      setIsSavingUsername(false)
    }
  }

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) return
    setIsSavingDisplayName(true)
    
    try {
      const response = await fetch('/api/user/update-displayname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          displayName: displayName,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      setIsEditingDisplayName(false)
      toast.success('Display name updated successfully')
    } catch (error) {
      console.error('Error updating display name:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update display name')
    } finally {
      setIsSavingDisplayName(false)
    }
  }

  if (!user) return null

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your profile information and account settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Username Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Username</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This is your unique identifier.
              </p>
              <div className="flex items-center gap-4">
                {isEditingUsername ? (
                  <>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="max-w-sm"
                    />
                    <Button 
                      onClick={handleSaveUsername}
                      disabled={isSavingUsername || !username.trim()}
                    >
                      {isSavingUsername ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : null}
                      {isSavingUsername ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditingUsername(false)
                        setUsername(user?.username || '')
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">{username || 'No username set'}</span>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingUsername(true)}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Display Name Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Display Name</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This is how you'll appear to others.
              </p>
              <div className="flex items-center gap-4">
                {isEditingDisplayName ? (
                  <>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="max-w-sm"
                    />
                    <Button 
                      onClick={handleSaveDisplayName}
                      disabled={isSavingDisplayName || !displayName.trim()}
                    >
                      {isSavingDisplayName ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : null}
                      {isSavingDisplayName ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditingDisplayName(false)
                        setDisplayName(`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '')
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">{displayName || 'No display name set'}</span>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingDisplayName(true)}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Clerk Account Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Account Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your email, password, and other account settings.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).Clerk) {
                    (window as any).Clerk.openUserProfile()
                  }
                }}
              >
                Open Account Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
} 