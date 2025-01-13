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
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch current username from our database
  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const response = await fetch(`/api/user/username?userId=${user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setUsername(data.username || user?.username || '')
        }
      } catch (error) {
        console.error('Error fetching username:', error)
        setUsername(user?.username || '')
      }
    }

    if (user?.id) {
      fetchUsername()
    }
  }, [user?.id, user?.username])

  const handleSave = async () => {
    if (!username.trim()) return
    setIsSaving(true)
    
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

      setIsEditing(false)
      toast.success('Username updated successfully')
    } catch (error) {
      console.error('Error updating username:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update username')
    } finally {
      setIsSaving(false)
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
                This is your public display name.
              </p>
              <div className="flex items-center gap-4">
                {isEditing ? (
                  <>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="max-w-sm"
                    />
                    <Button 
                      onClick={handleSave}
                      disabled={isSaving || !username.trim()}
                    >
                      {isSaving ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : null}
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false)
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
                      onClick={() => setIsEditing(true)}
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