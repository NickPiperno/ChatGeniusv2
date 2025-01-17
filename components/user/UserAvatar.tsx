import { UserButton } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  userId?: string
  imageUrl?: string
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
  status?: "online" | "away" | "busy" | "offline"
  className?: string
}

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  offline: "bg-gray-500"
}

export function UserAvatar({
  userId,
  imageUrl,
  size = "md",
  showStatus = false,
  status = "offline",
  className
}: UserAvatarProps) {
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

  return (
    <div className={cn("relative", className)}>
      {userId ? (
        <UserButton 
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: sizes[size]
            }
          }}
        />
      ) : (
        <div className={cn(
          "rounded-full overflow-hidden",
          sizes[size]
        )}>
          <img 
            src={imageUrl || "/default-avatar.png"} 
            alt="User avatar" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
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