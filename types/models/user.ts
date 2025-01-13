// Core User type that represents a user in our system
export interface BaseUser {
  id: string
  name: string
  email: string
  username: string
  avatarUrl?: string
  createdAt: number
}

// Extended User type with UI-specific properties
export interface User {
  id: string
  name: string
  email: string
  username?: string
  fullName?: string
  imageUrl?: string
  status?: 'online' | 'offline' | 'away' | 'busy'
  metadata?: Record<string, any>
}

// User status type
export type UserStatus = 'online' | 'offline' | 'away' | 'busy'

// User as stored in DynamoDB
export interface DynamoUser extends BaseUser {
  clerkId: string
  preferences: Record<string, any>
}

// User status as stored in DynamoDB
export interface UserStatusRecord {
  userId: string
  status: UserStatus
  lastActiveAt: number
}

// Application-level User type that combines UI and data properties
export interface AppUser extends User {
  isOnline?: boolean
  lastActive?: Date
  preferences?: Record<string, any>
} 