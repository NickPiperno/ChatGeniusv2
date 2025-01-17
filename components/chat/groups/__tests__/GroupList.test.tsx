import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { GroupList } from '../GroupList'
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

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/groups/1'
}))

// Create a wrapper component with providers
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
}

describe('GroupList', () => {
  const defaultProps = {
    isCollapsed: false,
    onCreateGroup: jest.fn(),
    onEditGroup: jest.fn(),
    onDeleteGroup: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render successfully', async () => {
    await act(async () => {
      render(<GroupList {...defaultProps} />, { wrapper: Wrapper })
    })
    expect(screen.getByText('Groups')).toBeInTheDocument()
  })

  it('should handle group creation', async () => {
    await act(async () => {
      render(<GroupList {...defaultProps} />, { wrapper: Wrapper })
    })
    
    // Open create dialog
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    
    // Fill and submit form
    await act(async () => {
      const input = screen.getByPlaceholderText('Group name')
      fireEvent.change(input, { target: { value: 'New Group' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Create'))
    })

    await waitFor(() => {
      expect(defaultProps.onCreateGroup).toHaveBeenCalledWith('New Group')
    })
  })

  it('should handle group deletion', async () => {
    await act(async () => {
      render(<GroupList {...defaultProps} />, { wrapper: Wrapper })
    })
    
    // Find and click delete button
    await act(async () => {
      const deleteButton = screen.getByLabelText('Delete group')
      fireEvent.click(deleteButton)
    })

    // Confirm deletion
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'))
    })

    await waitFor(() => {
      expect(defaultProps.onDeleteGroup).toHaveBeenCalled()
    })
  })

  it('should handle group editing', async () => {
    await act(async () => {
      render(<GroupList {...defaultProps} />, { wrapper: Wrapper })
    })
    
    // Find and click edit button
    await act(async () => {
      const editButton = screen.getByLabelText('Edit group')
      fireEvent.click(editButton)
    })

    // Fill and submit form
    await act(async () => {
      const input = screen.getByDisplayValue('Test Group')
      fireEvent.change(input, { target: { value: 'Updated Group' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })

    await waitFor(() => {
      expect(defaultProps.onEditGroup).toHaveBeenCalledWith(
        expect.any(String),
        'Updated Group'
      )
    })
  })
}) 