import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'
import { SearchResult } from '@/types/search'

interface SearchResults {
  results: SearchResult[]
  hasMore: boolean
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ results: [], hasMore: false })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ results: [], hasMore: false })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ query: searchQuery }).toString()
      const response = await fetchApi(`/api/search/messages?${params}`)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      setResults({
        results: data.results || [],
        hasMore: data.hasMore || false
      })
    } catch (err) {
      logger.error('Error searching messages:', err)
      setError('Failed to search messages')
      setResults({ results: [], hasMore: false })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        search(query)
      } else {
        setResults({ results: [], hasMore: false })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, search])

  return { 
    query, 
    setQuery, 
    results: results.results,
    hasMore: results.hasMore,
    isLoading, 
    error, 
    search 
  }
} 