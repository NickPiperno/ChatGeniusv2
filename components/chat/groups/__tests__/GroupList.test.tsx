import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { GroupList } from '../GroupList'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => '/groups/1'
}))

describe('GroupList', () => {
  const defaultProps = {
    isCollapsed: false,
    onCreateGroup: vi.fn(),
    onEditGroup: vi.fn(),
    onDeleteGroup: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render successfully', () => {
    render(<GroupList {...defaultProps} />)
    expect(screen.getByText('Groups')).toBeInTheDocument()
  })

  it('should handle group creation', async () => {
    render(<GroupList {...defaultProps} />)
    
    // Open create dialog
    fireEvent.click(screen.getByRole('button'))
    
    // Fill and submit form
    const input = screen.getByPlaceholderText('Group name')
    fireEvent.change(input, { target: { value: 'New Group' } })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(defaultProps.onCreateGroup).toHaveBeenCalledWith('New Group')
    })
  })

  it('should handle group deletion', async () => {
    render(<GroupList {...defaultProps} />)
    
    // Find and click delete button
    const deleteButton = screen.getByLabelText('Delete group')
    fireEvent.click(deleteButton)

    // Confirm deletion
    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(defaultProps.onDeleteGroup).toHaveBeenCalled()
    })
  })

  it('should handle group editing', async () => {
    render(<GroupList {...defaultProps} />)
    
    // Find and click edit button
    const editButton = screen.getByLabelText('Edit group')
    fireEvent.click(editButton)

    // Fill and submit form
    const input = screen.getByDisplayValue('Test Group')
    fireEvent.change(input, { target: { value: 'Updated Group' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(defaultProps.onEditGroup).toHaveBeenCalledWith(
        expect.any(String),
        'Updated Group'
      )
    })
  })
}) 