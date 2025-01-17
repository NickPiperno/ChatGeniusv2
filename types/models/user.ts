// Main User type for the application
export interface User {
  id: string              // Hash Key
  email: string          // GSI: EmailIndex
  displayName: string    // GSI: displayNameIndex
  auth0Id: string       // GSI: Auth0IdIndex
  lastActiveAt: number  // GSI: LastActiveIndex
  imageUrl?: string     // Optional field
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

// User status type for real-time features
export type UserStatus = 'online' | 'offline' | 'away' | 'busy'

// User status record for real-time features
export interface UserStatusRecord {
  userId: string
  status: UserStatus
  lastActiveAt: number
}

// Type for updating user properties
export interface UserUpdate {
  displayName?: string
  imageUrl?: string
  metadata?: Record<string, any>
  lastActiveAt?: number
} 