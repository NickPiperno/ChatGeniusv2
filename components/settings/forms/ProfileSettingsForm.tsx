'use client'

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@auth0/nextjs-auth0/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/user/UserAvatar"
import { fetchApi } from "@/lib/api-client"
import { User } from "@/types/models/user"
import { toast } from "sonner"
import { debounce } from "lodash"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSettingsForm() {
  const { user, isLoading: isAuthLoading } = useUser()
  const [userData, setUserData] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.sub) return
      setError(null)
      setIsLoading(true)
      try {
        const response = await fetchApi('/api/user/current')
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }
        const data = await response.json()
        setUserData(data)
        setDisplayName(data.displayName)
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to load user data")
        toast.error("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.sub) {
      fetchUserData()
    }
  }, [user?.sub])

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (newDisplayName: string) => {
      setIsSaving(true)
      try {
        const response = await fetchApi('/api/user/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: newDisplayName })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update display name')
        }
        
        toast.success("Settings saved")
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error("Error saving settings:", error)
        toast.error("Failed to save settings")
      } finally {
        setIsSaving(false)
      }
    }, 500),
    []
  )

  // Handle display name change
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayName = e.target.value
    if (newDisplayName.length > 50) return
    setDisplayName(newDisplayName)
    setHasUnsavedChanges(true)
    debouncedSave(newDisplayName)
  }

  // Handle discard changes
  const handleDiscard = () => {
    if (userData) {
      setDisplayName(userData.displayName)
      setHasUnsavedChanges(false)
    }
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Profile</h3>
          <p className="text-sm text-muted-foreground">
            Manage your profile settings
          </p>
        </div>
        <Separator />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Profile</h3>
          <p className="text-sm text-red-500">
            {error}
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Manage your profile settings
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Profile Picture</Label>
          <div className="flex items-center gap-x-4">
            <UserAvatar
              imageUrl={user?.picture || undefined}
              fallback={displayName || user?.name || "?"}
              className="h-20 w-20"
              onError={() => toast.error("Failed to load avatar")}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://manage.auth0.com/u/settings', '_blank')}
            >
              Change Picture
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            To change your profile picture, visit your Auth0 account settings
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="Enter your display name"
            disabled={isSaving}
          />
          {displayName.length >= 45 && (
            <p className="text-xs text-yellow-500">
              {50 - displayName.length} characters remaining
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!hasUnsavedChanges}
            >
              Discard Changes
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will discard all unsaved changes to your profile settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDiscard}>
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          type="submit"
          disabled={!hasUnsavedChanges || isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
} 