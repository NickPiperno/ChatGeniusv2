import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface MentionPopupProps {
  users: Array<{
    id: string
    name: string
    imageUrl: string
  }>
  onSelect: (user: { id: string; name: string }) => void
  onClose: () => void
}

export function MentionPopup({ users, onSelect, onClose }: MentionPopupProps) {
  return (
    <div className="absolute bottom-full mb-2 w-64 bg-white rounded-lg shadow-lg border p-2">
      <div className="space-y-1">
        {users.map(user => (
          <button
            key={user.id}
            className="w-full flex items-center p-2 hover:bg-gray-100 rounded"
            onClick={() => onSelect(user)}
          >
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <span>{user.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
} 