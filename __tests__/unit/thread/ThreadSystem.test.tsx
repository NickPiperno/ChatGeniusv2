import { render, screen, waitFor, act } from '@testing-library/react'
import { useThreadStore } from '../../../lib/store/thread'
import { Message } from '../../../types/models'
import { ChatInterface } from '../../../components/chat/ChatInterface'
import { Socket } from 'socket.io-client'
import { ClerkProvider } from '@clerk/nextjs'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useUser: () => ({
    user: {
      id: 'test-user-id',
      fullName: 'Test User',
      primaryEmailAddress: {
        emailAddress: 'test@example.com'
      }
    },
    isLoaded: true,
    isSignedIn: true
  })
}))

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    set: jest.fn()
  })
}))

// Mock socket.io-client
const mockSocket = {
  on: jest.fn((event, callback) => {
    mockSocket._mock.calls.push([event, callback]);
    mockSocket._mock.listeners[event] = callback;
  }),
  off: jest.fn(),
  emit: jest.fn((event, data, callback) => {
    if (event === 'message' && callback) {
      callback(null); // No error
    }
  }),
  connect: jest.fn(),
  disconnect: jest.fn(),
  id: 'mock-socket-id',
  connected: true,
  _mock: {
    calls: [] as [string, (...args: any[]) => void][],
    listeners: {} as Record<string, (...args: any[]) => void>,
    emitEvent: (event: string, ...args: any[]) => {
      const listener = mockSocket._mock.listeners[event];
      if (listener) {
        listener(...args);
      }
    }
  }
} as unknown as Socket & { 
  _mock: { 
    calls: [string, (...args: any[]) => void][];
    listeners: Record<string, (...args: any[]) => void>;
    emitEvent: (event: string, ...args: any[]) => void;
  } 
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

// Mock useSocket hook
jest.mock('@/hooks/realtime/use-socket', () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: true,
    hasSocket: true
  })
}));

// Mock MessageThread component
jest.mock('../../../components/chat/thread/MessageThread', () => ({
  MessageThread: ({ isOpen, parentMessage, replies }: { isOpen: boolean; parentMessage: any; replies: any[] }) => (
    isOpen ? (
      <div data-testid="thread-sidebar">
        <div data-testid="parent-message">{parentMessage.content}</div>
        {replies.map((reply: any) => (
          <div key={reply.id} data-testid="thread-reply">{reply.content}</div>
        ))}
      </div>
    ) : null
  )
}))

// Mock MessageList component
jest.mock('../../../components/chat/messages/MessageList', () => ({
  MessageList: ({ messages }: { messages: any[] }) => (
    <div data-testid="message-list">
      {messages.map((msg: any) => (
        <div key={msg.id} data-testid="message-item">{msg.content}</div>
      ))}
    </div>
  )
}))

// Mock MessageInputTiptap component
jest.mock('../../../components/chat/input/MessageInputTiptap', () => ({
  MessageInputTiptap: () => <div data-testid="message-input">Message Input</div>
}))

// Mock fetch
const mockMessages = {
  messages: [
    {
      id: '1',
      content: 'Parent message',
      timestamp: new Date().toISOString(),
      userId: 'test-user-id',
      displayName: 'Test User',
      groupId: 'group1',
      replies: [] as Message[],
      replyCount: 1,
      reactions: {},
      attachments: [],
      imageUrl: 'https://example.com/avatar.png',
      metadata: {},
      sender: {
        id: 'test-user-id',
        displayName: 'Test User',
        imageUrl: 'https://example.com/avatar.png'
      }
    },
    {
      id: '2',
      content: 'Reply message',
      timestamp: new Date().toISOString(),
      userId: 'test-user-id',
      displayName: 'Test User',
      groupId: 'group1',
      parentId: '1',
      replies: [] as Message[],
      replyCount: 0,
      reactions: {},
      attachments: [],
      imageUrl: 'https://example.com/avatar.png',
      metadata: {},
      sender: {
        id: 'test-user-id',
        displayName: 'Test User',
        imageUrl: 'https://example.com/avatar.png'
      }
    }
  ],
  count: 2,
  firstMessageId: '1',
  lastMessageId: '2'
};

// Set up the replies after both messages are defined
mockMessages.messages[0].replies = [mockMessages.messages[1]];

global.fetch = jest.fn((url) => {
  if (url.includes('/api/groups/group1/messages')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic' as ResponseType,
      url: '',
      json: () => Promise.resolve(mockMessages.messages)
    } as Response)
  }
  return Promise.reject(new Error(`Unhandled fetch URL: ${url}`))
}) as jest.Mock;

// Mock useToast hook
jest.mock('../../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock LoadingSpinner component
jest.mock('../../../components/ui/feedback/LoadingSpinner', () => ({
  LoadingSpinner: ({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) => (
    <div data-testid="loading-spinner" className={className}>
      <div className={`animate-spin ${size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6"}`} />
    </div>
  )
}))

// Create a wrapper component with providers
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider publishableKey="test-key">
      <div data-testid="test-wrapper">
        {children}
      </div>
    </ClerkProvider>
  )
}

describe('Thread System', () => {
  // Increase timeout for all tests in this describe block
  jest.setTimeout(15000)

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks()
    mockSocket._mock.calls = []
    
    // Reset thread store state
    await act(async () => {
      useThreadStore.setState({
        activeThread: null,
        setActiveThread: (thread) => useThreadStore.setState({ activeThread: thread }),
        addReply: (reply) => useThreadStore.setState((state) => ({
          activeThread: state.activeThread ? {
            ...state.activeThread,
            replies: [...state.activeThread.replies, reply]
          } : null
        })),
        updateReply: (messageId, updates) => useThreadStore.setState((state) => ({
          activeThread: state.activeThread ? {
            ...state.activeThread,
            replies: state.activeThread.replies.map((reply) =>
              reply.id === messageId ? { ...reply, ...updates } : reply
            )
          } : null
        })),
        deleteReply: (messageId) => useThreadStore.setState((state) => ({
          activeThread: state.activeThread ? {
            ...state.activeThread,
            replies: state.activeThread.replies.filter((reply) => reply.id !== messageId)
          } : null
        })),
        clearThread: () => useThreadStore.setState({ activeThread: null })
      })
    })
  })

  describe('Thread State Management', () => {
    it('should initialize with no active thread', async () => {
      // Render the component
      const rendered = render(<ChatInterface 
        groupId="group1"
        users={[]}
        chatSettings={{ enterToSend: true }}
        headerHeight={64}
        searchBarHeight={48}
      />, { wrapper: Wrapper })
      
      // First verify loading state
      expect(rendered.container.querySelector('[data-testid="loading-spinner"]')).toBeInTheDocument()
      
      // Wait for loading to complete and messages to be fetched
      await waitFor(() => {
        expect(rendered.container.querySelector('[data-testid="loading-spinner"]')).not.toBeInTheDocument()
        expect(rendered.container.querySelector('[data-testid="message-list"]')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Then verify thread state
      const state = useThreadStore.getState()
      expect(state.activeThread).toBeNull()
      expect(rendered.container.querySelector('[data-testid="thread-sidebar"]')).not.toBeInTheDocument()
    })

    it('should properly sync thread state with socket updates', async () => {
      await act(async () => {
        render(<ChatInterface 
          groupId="group1"
          users={[]}
          chatSettings={{ enterToSend: true }}
          headerHeight={64}
          searchBarHeight={48}
        />, { wrapper: Wrapper })
      })

      // Wait for initial render and loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Emit thread_state event
      await act(async () => {
        mockSocket._mock.emitEvent('thread_state', {
          message: mockMessages.messages[0],
          replies: [mockMessages.messages[1]],
          isOpen: true
        })
      })

      // Wait for thread state to be updated
      await waitFor(() => {
        const state = useThreadStore.getState()
        expect(state.activeThread).not.toBeNull()
        if (state.activeThread && state.activeThread.parentMessage) {
          expect(state.activeThread.parentMessage.id).toBe('1')
          expect(state.activeThread.replies).toHaveLength(1)
          expect(state.activeThread.replies[0].id).toBe('2')
        }
      }, { timeout: 5000 })

      // Verify thread sidebar is shown with correct content
      await waitFor(() => {
        const threadSidebar = screen.getByTestId('thread-sidebar')
        expect(threadSidebar).toBeInTheDocument()
        expect(screen.getByTestId('parent-message')).toHaveTextContent('Parent message')
        expect(screen.getByTestId('thread-reply')).toHaveTextContent('Reply message')
      }, { timeout: 5000 })
    })

    it('should handle adding and removing replies', async () => {
      await act(async () => {
        render(<ChatInterface 
          groupId="group1"
          users={[]}
          chatSettings={{ enterToSend: true }}
          headerHeight={64}
          searchBarHeight={48}
        />, { wrapper: Wrapper })
      })

      // Wait for initial render and loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Set active thread
      await act(async () => {
        mockSocket._mock.emitEvent('thread_state', {
          message: mockMessages.messages[0],
          replies: [mockMessages.messages[1]],
          isOpen: true
        })
      })

      // Add a new reply
      const newReply = {
        id: '3',
        content: 'New reply',
        timestamp: new Date().toISOString(),
        userId: 'test-user-id',
        displayName: 'Test User',
        groupId: 'group1',
        parentId: '1',
        replies: [],
        replyCount: 0,
        reactions: {},
        attachments: [],
        imageUrl: 'https://example.com/avatar.png',
        metadata: {},
        sender: {
          id: 'test-user-id',
          displayName: 'Test User',
          imageUrl: 'https://example.com/avatar.png'
        }
      }

      await act(async () => {
        mockSocket._mock.emitEvent('message', newReply)
      })

      // Verify new reply is shown
      await waitFor(() => {
        const threadReplies = screen.getAllByTestId('thread-reply')
        expect(threadReplies).toHaveLength(2)
        expect(threadReplies[1]).toHaveTextContent('New reply')
      }, { timeout: 5000 })

      // Delete the reply
      await act(async () => {
        mockSocket._mock.emitEvent('message_delete', { messageId: '3' })
      })

      // Verify reply is removed
      await waitFor(() => {
        const threadReplies = screen.getAllByTestId('thread-reply')
        expect(threadReplies).toHaveLength(1)
        expect(threadReplies[0]).toHaveTextContent('Reply message')
      }, { timeout: 5000 })
    })

    it('should handle message updates in thread', async () => {
      await act(async () => {
        render(<ChatInterface 
          groupId="group1"
          users={[]}
          chatSettings={{ enterToSend: true }}
          headerHeight={64}
          searchBarHeight={48}
        />, { wrapper: Wrapper })
      })

      // Wait for initial render and loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Set active thread
      await act(async () => {
        mockSocket._mock.emitEvent('thread_state', {
          message: mockMessages.messages[0],
          replies: [mockMessages.messages[1]],
          isOpen: true
        })
      })

      // Update a reply
      await act(async () => {
        mockSocket._mock.emitEvent('message_update', {
          messageId: '2',
          content: 'Updated reply',
          edited: true
        })
      })

      // Verify reply is updated
      await waitFor(() => {
        const threadReplies = screen.getAllByTestId('thread-reply')
        expect(threadReplies).toHaveLength(1)
        expect(threadReplies[0]).toHaveTextContent('Updated reply')
      }, { timeout: 5000 })
    })
  })

  describe('Thread UI Interactions', () => {
    it('should show thread sidebar when thread is active', async () => {
      await act(async () => {
        render(<ChatInterface 
          groupId="group1"
          users={[]}
          chatSettings={{ enterToSend: true }}
          headerHeight={64}
          searchBarHeight={48}
        />, { wrapper: Wrapper })
      })

      // Wait for initial render and loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Set active thread
      await act(async () => {
        useThreadStore.setState({
          activeThread: {
            parentMessage: mockMessages.messages[0],
            replies: [mockMessages.messages[1]],
            isOpen: true
          }
        })
      })

      // Verify thread sidebar is shown with correct content
      await waitFor(() => {
        const threadSidebar = screen.getByTestId('thread-sidebar')
        expect(threadSidebar).toBeInTheDocument()
        expect(screen.getByTestId('parent-message')).toHaveTextContent('Parent message')
        expect(screen.getByTestId('thread-reply')).toHaveTextContent('Reply message')
      }, { timeout: 5000 })
    })

    it('should handle reaction updates in thread', async () => {
      await act(async () => {
        render(<ChatInterface 
          groupId="group1"
          users={[]}
          chatSettings={{ enterToSend: true }}
          headerHeight={64}
          searchBarHeight={48}
        />, { wrapper: Wrapper })
      })

      // Wait for initial render and loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Set active thread
      await act(async () => {
        mockSocket._mock.emitEvent('thread_state', {
          message: mockMessages.messages[0],
          replies: [mockMessages.messages[1]],
          isOpen: true
        })
      })

      // Update reactions
      await act(async () => {
        mockSocket._mock.emitEvent('reaction_update', {
          messageId: '2',
          reactions: {
            '👍': {
              count: 1,
              users: ['test-user-id']
            }
          }
        })
      })

      // Verify thread state is updated
      await waitFor(() => {
        const state = useThreadStore.getState()
        if (state.activeThread) {
          const reply = state.activeThread.replies[0]
          expect(reply.reactions['👍']).toBeDefined()
          expect(reply.reactions['👍'].count).toBe(1)
          expect(reply.reactions['👍'].users).toContain('test-user-id')
        }
      }, { timeout: 5000 })
    })

    it('should handle error states gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ message: 'Failed to fetch messages' })
        } as Response)
      ) as jest.Mock

      await act(async () => {
        render(<ChatInterface 
          groupId="group1"
          users={[]}
          chatSettings={{ enterToSend: true }}
          headerHeight={64}
          searchBarHeight={48}
        />, { wrapper: Wrapper })
      })

      // Wait for error state
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify thread state remains empty
      const state = useThreadStore.getState()
      expect(state.activeThread).toBeNull()

      // Verify toast was called with error message
      const toastMock = jest.requireMock('../../../components/ui/use-toast').useToast().toast
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        variant: 'destructive'
      }))
    })

    it('should handle socket disconnection', async () => {
      await act(async () => {
        render(<ChatInterface 
          groupId="group1"
          users={[]}
          chatSettings={{ enterToSend: true }}
          headerHeight={64}
          searchBarHeight={48}
        />, { wrapper: Wrapper })
      })

      // Wait for initial render
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Simulate socket disconnection
      await act(async () => {
        mockSocket._mock.emitEvent('disconnect', {})
      })

      // Verify toast was called with connection error
      const toastMock = jest.requireMock('../../../components/ui/use-toast').useToast().toast
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Connection Error',
        description: 'Failed to connect to chat server',
        variant: 'destructive'
      }))
    })
  })
}) 