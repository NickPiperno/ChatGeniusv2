import { renderHook, act } from '@testing-library/react'
import { useSearch } from '../../hooks/use-search'

// Mock fetchApi
jest.mock('../../lib/api-client', () => ({
  fetchApi: jest.fn()
}))

import { fetchApi } from '../../lib/api-client'

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSearch())

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasMore).toBe(false)
  })

  it('should fetch results when query changes', async () => {
    // Mock successful fetch response
    const mockResults = {
      results: [{ id: '1', content: 'test result' }],
      hasMore: false
    }

    ;(fetchApi as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults)
    })

    const { result } = renderHook(() => useSearch())

    // First, set the query
    act(() => {
      result.current.setQuery('test')
    })

    // Wait for the debounce and fetch to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400))
    })

    // Verify the API call
    expect(fetchApi).toHaveBeenCalledWith('/api/search/messages?query=test')

    // Verify the state updates
    expect(result.current.results).toEqual(mockResults.results)
    expect(result.current.hasMore).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    // Mock failed fetch
    ;(fetchApi as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSearch())

    // First, set the query
    act(() => {
      result.current.setQuery('test')
    })

    // Wait for the debounce and fetch to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400))
    })

    // Verify error state
    expect(result.current.error).toBe('Failed to search messages')
    expect(result.current.results).toEqual([])
    expect(result.current.hasMore).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should clear results when query is empty', async () => {
    const { result } = renderHook(() => useSearch())

    // First, set an empty query
    act(() => {
      result.current.setQuery('')
    })

    // Wait for the debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400))
    })

    expect(result.current.results).toEqual([])
    expect(result.current.hasMore).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle direct search calls', async () => {
    const mockResults = {
      results: [{ id: '1', content: 'test result' }],
      hasMore: false
    }

    ;(fetchApi as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults)
    })

    const { result } = renderHook(() => useSearch())

    await act(async () => {
      await result.current.search('test')
    })

    expect(fetchApi).toHaveBeenCalledWith('/api/search/messages?query=test')
    expect(result.current.results).toEqual(mockResults.results)
    expect(result.current.hasMore).toBe(false)
  })
}) 