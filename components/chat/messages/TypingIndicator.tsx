'use client'

interface TypingUser {
  id: string
  displayName: string
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  return (
    <div className="px-4 py-2 text-sm text-gray-500">
      {typingUsers.length === 1 ? (
        <span>{typingUsers[0].displayName} is typing...</span>
      ) : typingUsers.length === 2 ? (
        <span>{typingUsers[0].displayName} and {typingUsers[1].displayName} are typing...</span>
      ) : (
        <span>Several people are typing...</span>
      )}
    </div>
  )
} 