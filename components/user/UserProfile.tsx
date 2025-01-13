import { useState, useEffect } from "react"
import Link from "next/link"
import { useUser, useClerk } from "@clerk/nextjs"
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
  const { user } = useUser()
  const { signOut } = useClerk()
  const [userStatus, setUserStatus] = useState<"online" | "away" | "busy" | "offline">("online")
  const [customUsername, setCustomUsername] = useState<string>("")

  // Fetch custom username
  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const response = await fetch("/api/user/username?userId=" + user?.id)
        if (response.ok) {
          const data = await response.json()
          setCustomUsername(data.username || user?.username || "")
        }
      } catch (error) {
        console.error("Error fetching username:", error)
        setCustomUsername(user?.username || "")
      }
    }

    if (user?.id) {
      fetchUsername()
    }
  }, [user?.id, user?.username])

  if (!user) return null

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
                    userId={user.id}
                    showStatus={isCollapsed}
                    status={userStatus}
                  />
                  {!isCollapsed && (
                    <span className="ml-3 text-sm font-medium truncate group-hover:text-indigo-400 transition-colors">
                      {customUsername || user.username}
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
              {(Object.keys(statusConfig) as Array<"online" | "away" | "busy" | "offline">).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => setUserStatus(status)}
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
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 