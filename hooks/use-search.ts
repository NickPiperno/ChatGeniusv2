import { useState, useCallback, useEffect, useRef } from 'react'
import { useDebounce } from 'use-debounce'
import { SearchParams, SearchResponse } from '@/types/search'

interface UseSearchProps {
  initialQuery?: string
  debounceMs?: number
  groupId?: string
  cacheTimeout?: number
}

interface UseSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: SearchResponse | null
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => Promise<void>
  clearCache: () => void
}

interface CacheEntry {
  data: SearchResponse
  timestamp: number
  params: SearchParams
}

const searchCache = new Map<string, CacheEntry>()

function getCacheKey(params: SearchParams): string {
  return `${params.query}-${params.groupId || ''}-${params.cursor || ''}`
}

function isCacheValid(entry: CacheEntry, timeout: number): boolean {
  return Date.now() - entry.timestamp < timeout
}

export function useSearch({
  initialQuery = '',
  debounceMs = 300,
  groupId,
  cacheTimeout = 5 * 60 * 1000 // 5 minutes
}: UseSearchProps = {}): UseSearchReturn {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery] = useDebounce(query, debounceMs)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | undefined>()
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearCache = useCallback(() => {
    searchCache.clear()
  }, [])

  const fetchResults = useCallback(async (searchParams: SearchParams) => {
    console.log('[Search] Fetching results:', searchParams)
    
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const cacheKey = getCacheKey(searchParams)
      const cachedResult = searchCache.get(cacheKey)

      // Return cached result if valid
      if (cachedResult && isCacheValid(cachedResult, cacheTimeout)) {
        console.log('[Search] Returning cached result for:', cacheKey)
        return cachedResult.data
      }

      const params = new URLSearchParams({
        query: searchParams.query,
        ...(searchParams.groupId && { groupId: searchParams.groupId }),
        ...(searchParams.limit && { limit: searchParams.limit.toString() }),
        ...(searchParams.cursor && { cursor: searchParams.cursor })
      })

      console.log('[Search] Making API request:', `/api/search/messages?${params}`)
      
      const response = await fetch(`/api/search/messages?${params}`, {
        signal: abortControllerRef.current.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('[Search] API request failed:', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error('Failed to fetch search results')
      }

      const data: SearchResponse = await response.json()
      console.log('[Search] API response:', data)

      // Cache the result
      searchCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        params: searchParams
      })

      return data
    } catch (err) {
      console.error('[Search] Error fetching results:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }
      setError(err instanceof Error ? err : new Error('An error occurred'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [cacheTimeout])

  // Cleanup function to remove old cache entries
  useEffect(() => {
    const cleanup = () => {
      Array.from(searchCache.entries()).forEach(([key, entry]) => {
        if (!isCacheValid(entry, cacheTimeout)) {
          searchCache.delete(key)
        }
      })
    }

    const interval = setInterval(cleanup, cacheTimeout)
    return () => clearInterval(interval)
  }, [cacheTimeout])

  // Fetch initial results when query changes
  useEffect(() => {
    console.log('[Search] Query changed:', { debouncedQuery, groupId })
    
    if (debouncedQuery) {
      fetchResults({ query: debouncedQuery, groupId }).then((data) => {
        console.log('[Search] Setting results:', data)
        if (data) {
          setResults(data)
          setCursor(data.nextCursor)
        }
      })
    } else {
      setResults(null)
      setCursor(undefined)
    }

    // Cleanup on unmount or query change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [debouncedQuery, groupId, fetchResults])

  const loadMore = useCallback(async () => {
    if (!cursor || !debouncedQuery || isLoading) return

    const data = await fetchResults({
      query: debouncedQuery,
      groupId,
      cursor
    })

    if (data) {
      setResults(prev => ({
        results: [...(prev?.results || []), ...data.results],
        totalResults: data.totalResults,
        nextCursor: data.nextCursor
      }))
      setCursor(data.nextCursor)
    }
  }, [cursor, debouncedQuery, groupId, isLoading, fetchResults])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasMore: !!cursor,
    loadMore,
    clearCache
  }
} 