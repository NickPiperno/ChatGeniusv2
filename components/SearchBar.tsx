'use client'

import { useRef, useEffect, useState } from 'react'
import { Search, Clock, MessageSquare, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useSearch } from '@/hooks/use-search'
import { Spinner } from '@/components/ui/spinner'
import { SearchResult } from '@/types/search'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

const RESULT_ITEM_HEIGHT = 100 // Approximate height of each result item

interface ResultItemProps {
  index: number
  style: React.CSSProperties
  data: {
    results: SearchResult[]
    onResultClick: (result: SearchResult) => void
    highlightText: (text: string, matches: { field: string; snippet: string }[]) => React.ReactNode
  }
}

const ResultItem = ({ index, style, data }: ResultItemProps) => {
  const result = data.results[index]
  const { onResultClick, highlightText } = data

  return (
    <div
      style={style}
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
      onClick={() => onResultClick(result)}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span>{result.message.senderName}</span>
        <span>•</span>
        <span>{result.groupName}</span>
        <span>•</span>
        <span>{format(new Date(result.message.timestamp), 'MMM d, yyyy')}</span>
      </div>
      <div className="text-sm">
        {highlightText(result.message.content, result.matches)}
      </div>
    </div>
  )
}

export function SearchBar() {
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasMore,
    loadMore,
    clearCache
  } = useSearch()
  
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)
  const router = useRouter()

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }

    // Add keyboard shortcut (Ctrl/Cmd + K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setQuery('')
      }
    }

    // Handle click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    // Add to recent searches
    const newRecent = [query, ...recentSearches.filter((s: string) => s !== query)].slice(0, 5)
    setRecentSearches(newRecent)
    localStorage.setItem('recentSearches', JSON.stringify(newRecent))
  }

  const handleResultClick = (result: SearchResult) => {
    setQuery('')
    router.push(`/group/${result.groupId}`)
  }

  // Highlight matching text
  const highlightText = (text: string, matches: { field: string; snippet: string }[]) => {
    if (!matches.length) return text

    const match = matches[0]
    const snippet = match.snippet
    const index = text.toLowerCase().indexOf(snippet.toLowerCase())
    
    if (index === -1) return text

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-200 text-gray-900">
          {text.slice(index, index + snippet.length)}
        </span>
        {text.slice(index + snippet.length)}
      </>
    )
  }

  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: { scrollOffset: number, scrollUpdateWasRequested: boolean }) => {
    if (!scrollUpdateWasRequested && hasMore && !isLoading) {
      const totalHeight = (results?.results.length || 0) * RESULT_ITEM_HEIGHT
      const threshold = 100 // pixels before the end
      
      if (totalHeight - scrollOffset < threshold) {
        loadMore()
      }
    }
  }

  return (
    <div className="flex-shrink-0 border-b bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white" ref={searchRef}>
      <div className="container mx-auto px-4 py-3 flex justify-center">
        <div className="w-full max-w-2xl relative">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              {isLoading ? (
                <Spinner className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              ) : (
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              )}
              <Input
                ref={inputRef}
                type="search"
                placeholder="Search messages... (Ctrl + K)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 w-full bg-white/10 border-white/20 text-white placeholder:text-white/70"
              />
            </div>
            <Button 
              type="submit" 
              variant="secondary" 
              className="bg-white text-purple-700 hover:bg-white/90"
              disabled={isLoading}
            >
              Search
            </Button>
          </form>

          {/* Search Results Dropdown */}
          {(query || error) && (
            <div 
              ref={resultsRef}
              className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-[70vh] overflow-hidden"
            >
              {error && (
                <div className="p-4 text-sm text-red-500">
                  {error.message}
                </div>
              )}

              {/* Search Results */}
              {results?.results.length ? (
                <div className="h-[70vh]">
                  <AutoSizer>
                    {({ height, width }: { height: number; width: number }) => (
                      <List
                        ref={listRef}
                        height={height}
                        width={width}
                        itemCount={results.results.length}
                        itemSize={RESULT_ITEM_HEIGHT}
                        onScroll={handleScroll}
                        itemData={{
                          results: results.results,
                          onResultClick: handleResultClick,
                          highlightText
                        }}
                      >
                        {ResultItem}
                      </List>
                    )}
                  </AutoSizer>
                </div>
              ) : query && !isLoading ? (
                <div className="p-4 text-sm text-gray-500">
                  No results found
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 