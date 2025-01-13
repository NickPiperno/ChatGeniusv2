import { DirectMessage } from '@/types/models/channel'
import { AppUser } from '@/types/models/user'

// Mock users for testing DM functionality
export const mockUsers: AppUser[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    username: 'alicej',
    displayName: 'Alice J.',
    status: 'online',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=Alice',
    isOnline: true,
    lastActive: new Date(),
    preferences: {}
  },
  {
    id: 'user-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    username: 'bobs',
    displayName: 'Bob S.',
    status: 'offline',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=Bob',
    isOnline: false,
    lastActive: new Date(Date.now() - 3600000), // 1 hour ago
    preferences: {}
  },
  {
    id: 'user-3',
    name: 'Carol Williams',
    email: 'carol@example.com',
    username: 'carolw',
    displayName: 'Carol W.',
    status: 'online',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=Carol',
    isOnline: true,
    lastActive: new Date(),
    preferences: {}
  },
  {
    id: 'user-4',
    name: 'David Brown',
    email: 'david@example.com',
    username: 'davidb',
    displayName: 'David B.',
    status: 'away',
    imageUrl: 'https://api.dicebear.com/7.x/avatars/svg?seed=David',
    isOnline: true,
    lastActive: new Date(Date.now() - 300000), // 5 minutes ago
    preferences: {}
  },
  {
    id: 'user-5',
    name: 'Eve Davis',
    email: 'eve@example.com',
    username: 'eved',
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
  name: user.displayName || user.name,
  status: user.status as 'online' | 'offline' | 'away' | 'busy',
  imageUrl: user.imageUrl
}))

// Mock channels remain the same
export const channels = [
  { id: '1', name: 'General' },
  { id: '2', name: 'Random' },
] 