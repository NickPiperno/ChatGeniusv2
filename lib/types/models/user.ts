export interface User {
  id: string
  name: string
  email: string
  imageUrl?: string
  metadata?: Record<string, any>
} 