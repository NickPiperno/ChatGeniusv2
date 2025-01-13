import { Message } from './models/message'

export interface SearchResult {
  message: Message
  groupId: string
  groupName: string
  score: number
  matches: {
    field: string
    snippet: string
  }[]
}

export interface SearchResponse {
  results: SearchResult[]
  totalResults: number
  nextCursor?: string
}

export interface SearchParams {
  query: string
  groupId?: string
  limit?: number
  cursor?: string
  userId?: string
  startDate?: string
  endDate?: string
} 