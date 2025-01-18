import { renderHook, act } from '@testing-library/react'
import { useSearch } from '@/hooks/use-search'

// Mock fetch
global.fetch = jest.fn()

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSearch())
    
    expect(result.current.query).toBe('')
    expect(result.current.results).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasMore).toBe(false)
  })

  it('should update query when setQuery is called', () => {
    const { result } = renderHook(() => useSearch())
    
    act(() => {
      result.current.setQuery('test query')
    })
    
    expect(result.current.query).toBe('test query')
  })

  it('should fetch results when query changes', async () => {
    const mockResponse = {
      results: [
        {
          message: {
            id: '1',
            content: 'test message',
            groupId: 'group1',
            userId: 'user1',
            displayName: 'Test User',
            timestamp: '2024-01-01T00:00:00Z'
          },
          groupId: 'group1',
          score: 1,
          matches: [{ field: 'content', snippet: 'test' }]
        }
      ],
      totalResults: 1
    }

    ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    )

    const { result } = renderHook(() => useSearch())
    
    act(() => {
      result.current.setQuery('test')
    })

    // Wait for the debounced query to trigger
    await new Promise(resolve => setTimeout(resolve, 400))

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/search/messages?query=test')
    )
  })

  it('should handle errors', async () => {
    ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500
      })
    )

    const { result } = renderHook(() => useSearch())
    
    act(() => {
      result.current.setQuery('test')
    })

    // Wait for the debounced query to trigger
    await new Promise(resolve => setTimeout(resolve, 400))

    expect(result.current.error).toBeTruthy()
  })

  it('should load more results when loadMore is called', async () => {
    const initialResponse = {
      results: [{ id: '1', content: 'first result' }],
      totalResults: 2,
      nextCursor: 'cursor1'
    }

    const moreResults = {
      results: [{ id: '2', content: 'second result' }],
      totalResults: 2
    }

    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialResponse)
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(moreResults)
        })
      )

    const { result } = renderHook(() => useSearch())
    
    act(() => {
      result.current.setQuery('test')
    })

    // Wait for initial results
    await new Promise(resolve => setTimeout(resolve, 400))
    await act(async () => {
      await result.current.search(result.current.query)
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result.current.results.length).toBe(2)
  })
}) 