import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SearchBar } from '@/components/SearchBar'
import { useSearch } from '@/hooks/use-search'

// Mock the useSearch hook
jest.mock('@/hooks/use-search')
const mockUseSearch = useSearch as jest.Mock

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}))

describe('SearchBar', () => {
  const mockResults = {
    results: [
      {
        message: {
          id: '1',
          content: 'test message',
          groupId: 'group1',
          senderId: 'user1',
          senderName: 'Test User',
          timestamp: '2024-01-01T00:00:00Z'
        },
        groupId: 'group1',
        score: 1,
        matches: [{ field: 'content', snippet: 'test' }]
      }
    ],
    totalResults: 1
  }

  beforeEach(() => {
    mockUseSearch.mockReturnValue({
      query: '',
      setQuery: jest.fn(),
      results: null,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })
  })

  it('renders search input', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText(/search messages/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: null,
      isLoading: true,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    render(<SearchBar />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays search results', () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: mockResults,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    render(<SearchBar />)
    expect(screen.getByText('test message')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('shows error message', () => {
    const errorMessage = 'Search failed'
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: null,
      isLoading: false,
      error: new Error(errorMessage),
      hasMore: false,
      loadMore: jest.fn()
    })

    render(<SearchBar />)
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows load more button when hasMore is true', () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: mockResults,
      isLoading: false,
      error: null,
      hasMore: true,
      loadMore: jest.fn()
    })

    render(<SearchBar />)
    expect(screen.getByText(/load more results/i)).toBeInTheDocument()
  })

  it('handles keyboard shortcuts', () => {
    const setQuery = jest.fn()
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery,
      results: null,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    render(<SearchBar />)
    
    // Test Ctrl+K
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(document.activeElement).toBe(screen.getByPlaceholderText(/search messages/i))

    // Test Escape
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(setQuery).toHaveBeenCalledWith('')
  })

  it('handles click outside', () => {
    const setQuery = jest.fn()
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery,
      results: mockResults,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    render(<SearchBar />)
    
    fireEvent.mouseDown(document.body)
    expect(setQuery).toHaveBeenCalledWith('')
  })

  it('highlights matching text', () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: {
        results: [
          {
            message: {
              id: '1',
              content: 'This is a test message',
              groupId: 'group1',
              senderId: 'user1',
              senderName: 'Test User',
              timestamp: '2024-01-01T00:00:00Z'
            },
            groupId: 'group1',
            score: 1,
            matches: [{ field: 'content', snippet: 'test' }]
          }
        ],
        totalResults: 1
      },
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    render(<SearchBar />)
    
    const highlightedText = screen.getByText('test')
    expect(highlightedText).toHaveClass('bg-yellow-200')
  })
}) 