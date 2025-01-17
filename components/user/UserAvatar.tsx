import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { UserStatus } from "@/types/models/user"
import { useState } from "react"

interface UserAvatarProps {
  imageUrl?: string
  fallback?: string
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
  status?: UserStatus
  className?: string
  onError?: () => void
}

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  offline: "bg-gray-500"
}

export function UserAvatar({
  imageUrl,
  fallback = "?",
  size = "md",
  showStatus = false,
  status = "offline",
  className,
  onError
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  }

  const statusSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3"
  }

  const handleImageError = () => {
    setImageError(true)
    onError?.()
  }

  return (
    <div className={cn("relative", className)}>
      <Avatar className={sizes[size]}>
        {!imageError && imageUrl && (
          <AvatarImage 
            src={imageUrl} 
            alt="User avatar" 
            onError={handleImageError}
          />
        )}
        <AvatarFallback>
          {fallback.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {showStatus && (
        <div className={cn(
          "absolute bottom-0 right-0 rounded-full ring-2 ring-gray-900",
          statusColors[status],
          statusSizes[size]
        )} />
      )}
    </div>
  )
} 