import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'

export function useSearch() {
  const [results, setResults] = useState<any[]>([])
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
      const response = await fetchApi(`/api/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }
      const data = await response.json()
      setResults(data)
    } catch (err) {
      logger.error('Error performing search:', err)
      setError('Failed to perform search')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    results,
    isLoading,
    error,
    search
  }
} 