import { Message } from '../models/message'
import { User } from '../models/user'
import { Channel, DirectMessageChannel } from '../models/channel'

export interface MessageComponentProps {
  message: Message
  isReply?: boolean
  parentId?: string
  parentTimestamp?: Date
  onReaction: (messageId: string, emoji: string, parentId?: string) => void
  onReply: (messageId: string) => void
  onEdit: (messageId: string, newContent: string) => void
  onDelete: (messageId: string) => void
  showReplies?: boolean
  hideReplyButton?: boolean
}

export interface ChannelListProps {
  isCollapsed: boolean
  onCreateChannel: (name: string) => Promise<void>
  onEditChannel: (groupId: string, newName: string) => Promise<void>
  onDeleteChannel: (groupId: string) => Promise<void>
}

export interface DirectMessageListProps {
  isCollapsed: boolean
  directMessages: User[]
}

export interface UserProfileProps {
  isCollapsed: boolean
  user?: User
}

export interface FilePreviewProps {
  file: File
  onRemove: () => void
}

export interface MentionsTextareaProps {
  value: string
  onChange: (value: string) => void
  onMention: (userId: string) => void
  users: User[]
  placeholder?: string
} 