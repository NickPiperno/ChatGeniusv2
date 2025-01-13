export interface DirectMessage {
  id: string
  name: string
  status: 'online' | 'offline' | 'away' | 'busy'
  imageUrl?: string
} 