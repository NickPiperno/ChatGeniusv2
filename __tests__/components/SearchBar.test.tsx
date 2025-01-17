import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SearchBar } from '@/components/SearchBar'
import { useSearch } from '@/hooks/use-search'
import { UserProvider } from '@auth0/nextjs-auth0/client'

// Mock Auth0
jest.mock('@auth0/nextjs-auth0/client', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useUser: () => ({
    user: {
      sub: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/picture.jpg'
    },
    isLoading: false,
    error: undefined
  })
}))

// Mock the useSearch hook
jest.mock('@/hooks/use-search')
const mockUseSearch = useSearch as jest.Mock

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })),
  useSearchParams: () => ({
    get: jest.fn(),
    set: jest.fn()
  })
}))

// Mock AutoSizer
jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) => 
    children({ width: 1000, height: 500 })
}))

// Create a wrapper component with providers
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
}

describe('SearchBar', () => {
  const mockResults = {
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
        groupName: 'Test Group',
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

  it('renders search input', async () => {
    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })
    expect(screen.getByPlaceholderText(/search messages/i)).toBeInTheDocument()
  })

  it('shows loading state', async () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: null,
      isLoading: true,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('displays search results', async () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: mockResults.results,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })

    // Wait for the virtualized list to render
    await waitFor(() => {
      // Check for the highlighted text and the rest of the message separately
      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('message')).toBeInTheDocument()
      
      // Check for user and group info
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })
  })

  it('shows error message', async () => {
    const errorMessage = 'Search failed'
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: null,
      isLoading: false,
      error: errorMessage,
      hasMore: false,
      loadMore: jest.fn()
    })

    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows no results message when query exists but no results', async () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: [],
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('handles keyboard shortcuts', async () => {
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

    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    })
    expect(document.activeElement).toBe(screen.getByPlaceholderText(/search messages/i))

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(setQuery).toHaveBeenCalledWith('')
  })

  it('handles click outside', async () => {
    const setQuery = jest.fn()
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery,
      results: mockResults.results,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })
    
    await act(async () => {
      fireEvent.mouseDown(document.body)
    })
    expect(setQuery).toHaveBeenCalledWith('')
  })

  it('highlights matching text in search results', async () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: mockResults.results,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn()
    })

    await act(async () => {
      render(<SearchBar />, { wrapper: Wrapper })
    })

    // Wait for the virtualized list to render
    await waitFor(() => {
      const highlightedText = screen.getByText('test')
      expect(highlightedText).toHaveClass('bg-yellow-200')
    })
  })
}) 