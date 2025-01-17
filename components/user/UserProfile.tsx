import { useState, useEffect } from "react"
import Link from "next/link"
import { useUser } from "@auth0/nextjs-auth0/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Settings, User as UserIcon, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "./UserAvatar"
import { StatusIndicator } from "./StatusIndicator"
import { fetchApi } from '@/lib/api-client'
import { UserStatus } from "@/types/models/user"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface UserProfileProps {
  isCollapsed?: boolean
  className?: string
}

const statusConfig = {
  online: { label: "Active", color: "bg-green-500" },
  away: { label: "Away", color: "bg-yellow-500" },
  busy: { label: "Do not disturb", color: "bg-red-500" },
  offline: { label: "Offline", color: "bg-gray-500" }
}

export function UserProfile({
  isCollapsed = false,
  className
}: UserProfileProps) {
  const { user, isLoading: isAuthLoading } = useUser()
  const [userStatus, setUserStatus] = useState<UserStatus>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('userStatus') as UserStatus) || 'online'
    }
    return 'online'
  })
  const [displayName, setDisplayName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Persist status changes
  useEffect(() => {
    localStorage.setItem('userStatus', userStatus)
    // Update status in backend
    const updateStatus = async () => {
      try {
        await fetchApi('/api/user/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: userStatus })
        })
      } catch (error) {
        console.error("Error updating status:", error)
      }
    }
    updateStatus()
  }, [userStatus])

  // Fetch user data from our database
  useEffect(() => {
    const fetchUserData = async () => {
      setError(null)
      setIsLoading(true)
      try {
        const response = await fetchApi('/api/user/current')
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }
        const data = await response.json()
        setDisplayName(data.displayName)
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to load user data")
        setDisplayName(user?.name || user?.email?.split('@')[0] || "")
        toast.error("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.sub) {
      fetchUserData()
    }
  }, [user?.sub, user?.name, user?.email])

  if (isAuthLoading || !user) {
    return (
      <div className={cn(
        "flex-shrink-0 p-4 border-b border-gray-800 bg-gray-800/30",
        className
      )}>
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(
        "flex-shrink-0 p-4 border-b border-gray-800 bg-gray-800/30",
        className
      )}>
        <Button 
          variant="ghost" 
          className="w-full text-red-500"
          onClick={() => window.location.reload()}
        >
          Error loading profile. Click to retry.
        </Button>
      </div>
    )
  }

  const handleStatusChange = async (newStatus: UserStatus) => {
    setUserStatus(newStatus)
    try {
      await fetchApi('/api/user/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    }
  }

  return (
    <div className={cn(
      "flex-shrink-0 p-4 border-b border-gray-800 bg-gray-800/30",
      className
    )}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn(
              "transition-all duration-300",
              isCollapsed 
                ? "w-8 p-0" 
                : "w-full flex items-center justify-start p-2 rounded-lg transition-colors group hover:bg-gray-800"
            )}
          >
            <div className={cn(
              "flex items-center gap-x-3 rounded-md p-2 text-sm font-medium transition-colors",
              !isCollapsed && "justify-between w-full"
            )}>
              <div className={cn(
                "flex items-center",
                isCollapsed ? "relative justify-center" : "w-full"
              )}>
                <div className="flex items-center min-w-0">
                  <UserAvatar 
                    imageUrl={user.picture || undefined}
                    fallback={displayName || user.name || "?"}
                    showStatus={isCollapsed}
                    status={userStatus}
                    onError={() => console.error("Failed to load avatar")}
                  />
                  {!isCollapsed && (
                    <span className="ml-3 text-sm font-medium truncate group-hover:text-indigo-400 transition-colors">
                      {isLoading ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        displayName
                      )}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <StatusIndicator 
                    status={userStatus}
                    showLabel
                    className="ml-4"
                  />
                )}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <StatusIndicator status={userStatus} className="mr-2" />
              <span>Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(Object.keys(statusConfig) as Array<UserStatus>).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                >
                  <StatusIndicator status={status} className="mr-2" />
                  <span>{statusConfig[status].label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-red-600"
            asChild
          >
            <Link href="/logout">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 