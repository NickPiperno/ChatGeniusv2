export interface Group {
  id: string
  name: string
  description?: string
  creatorId: string
  createdAt: string
  updatedAt: string
  members: string[]
  metadata?: Record<string, any>
  type: 'group' | 'dm'
  isPrivate: boolean
  avatarUrl?: string
} 