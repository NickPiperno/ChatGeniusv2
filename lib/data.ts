import { DirectMessage } from '@/types/models/channel'
import { AppUser } from '@/types/models/user'

// Mock users for testing DM functionality
export const mockUsers: AppUser[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice J.',
    status: 'online',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=Alice',
    isOnline: true,
    lastActive: new Date(),
    preferences: {}
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    displayName: 'Bob S.',
    status: 'offline',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=Bob',
    isOnline: false,
    lastActive: new Date(Date.now() - 3600000), // 1 hour ago
    preferences: {}
  },
  {
    id: 'user-3',
    email: 'carol@example.com',
    displayName: 'Carol W.',
    status: 'online',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=Carol',
    isOnline: true,
    lastActive: new Date(),
    preferences: {}
  },
  {
    id: 'user-4',
    email: 'david@example.com',
    displayName: 'David B.',
    status: 'away',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=David',
    isOnline: true,
    lastActive: new Date(Date.now() - 300000), // 5 minutes ago
    preferences: {}
  },
  {
    id: 'user-5',
    email: 'eve@example.com',
    displayName: 'Eve D.',
    status: 'busy',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=Eve',
    isOnline: true,
    lastActive: new Date(),
    preferences: {}
  }
]

// Convert users to DirectMessage format for the DM list
export const mockDirectMessages: DirectMessage[] = mockUsers.map(user => ({
  id: user.id,
  name: user.displayName,
  status: user.status as 'online' | 'offline' | 'away' | 'busy',
  imageUrl: user.imageUrl
}))

// Mock channels remain the same
export const channels = [
  { id: '1', name: 'General' },
  { id: '2', name: 'Random' },
] 