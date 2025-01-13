import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'

export function useSearch() {
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ q: query }).toString()
      const response = await fetchApi(`/api/search/messages?${params}`)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      logger.error('Error searching messages:', err)
      setError('Failed to search messages')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { results, isLoading, error, search }
} 