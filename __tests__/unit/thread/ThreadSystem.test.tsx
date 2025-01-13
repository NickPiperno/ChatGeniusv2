import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { useThreadStore } from '../../../lib/store/thread'
import { Message } from '../../../types/models'
import { ChatInterface } from '../../../components/chat/ChatInterface'
import { Socket } from 'socket.io-client'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
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
  }),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  id: 'mock-socket-id',
  _mock: {
    calls: [] as [string, (...args: any[]) => void][]
  }
} as unknown as Socket & { _mock: { calls: [string, (...args: any[]) => void][] } };

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

// Mock fetch
const mockMessages = {
  messages: [
    {
      id: '1',
      content: 'Parent message',
      timestamp: new Date().toISOString(),
      senderId: 'test-user-id',
      senderName: 'Test User',
      groupId: 'group1',
      replies: [] as Message[],
      replyCount: 1,
      reactions: {},
      attachments: []
    },
    {
      id: '2',
      content: 'Reply message',
      timestamp: new Date().toISOString(),
      senderId: 'test-user-id',
      senderName: 'Test User',
      groupId: 'group1',
      parentId: '1',
      replies: [] as Message[],
      replyCount: 0,
      reactions: {},
      attachments: []
    }
  ],
  count: 2,
  firstMessageId: '1',
  lastMessageId: '2'
};

// Set up the replies after both messages are defined
mockMessages.messages[0].replies = [mockMessages.messages[1]];

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    json: () => Promise.resolve(mockMessages.messages)
  } as Response)
) as jest.Mock;

// Mock useToast hook
jest.mock('../../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock LoadingSpinner component
jest.mock('../../../components/ui/feedback/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}))

// Create a wrapper component with providers
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

describe('Thread System', () => {
  // Increase timeout for all tests in this describe block
  jest.setTimeout(15000)

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    mockSocket._mock.calls = []
    
    // Reset thread store state
    useThreadStore.setState({
      activeThread: null
    })
  })

  describe('Thread State Management', () => {
    it('should initialize with no active thread', () => {
      render(<ChatInterface 
        groupId="group1"
        users={[]}
        chatSettings={{ enterToSend: true }}
        headerHeight={64}
      />, { wrapper: Wrapper });
      
      const state = useThreadStore.getState();
      expect(state.activeThread).toBeNull();
    });

    it('should properly sync thread state with socket updates', async () => {
      render(<ChatInterface 
        groupId="group1"
        users={[]}
        chatSettings={{ enterToSend: true }}
        headerHeight={64}
      />, { wrapper: Wrapper });

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Parent message')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Find the thread_state callback
      const threadCallback = mockSocket._mock.calls.find(([event]) => event === 'thread_state')?.[1];
      
      if (threadCallback) {
        act(() => {
          threadCallback({
            message: mockMessages.messages[0],
            replies: [mockMessages.messages[1]],
            isOpen: true
          });
        });
      }

      // Wait for thread state to be updated
      await waitFor(() => {
        const state = useThreadStore.getState();
        expect(state.activeThread).not.toBeNull();
        expect(state.activeThread?.isOpen).toBe(true);
      }, { timeout: 5000 });

      // Verify thread sidebar is shown
      await waitFor(() => {
        expect(screen.getByTestId('thread-sidebar')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Thread UI Interactions', () => {
    it('should show thread sidebar when thread is active', async () => {
      render(<ChatInterface 
        groupId="group1"
        users={[]}
        chatSettings={{ enterToSend: true }}
        headerHeight={64}
      />, { wrapper: Wrapper });

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Parent message')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Set active thread
      act(() => {
        useThreadStore.setState({
          activeThread: {
            parentMessage: mockMessages.messages[0],
            replies: [mockMessages.messages[1]],
            isOpen: true
          }
        });
      });

      // Wait for thread state to be updated
      await waitFor(() => {
        const state = useThreadStore.getState();
        expect(state.activeThread).not.toBeNull();
        expect(state.activeThread?.isOpen).toBe(true);
      }, { timeout: 5000 });

      // Verify thread sidebar is shown
      await waitFor(() => {
        expect(screen.getByTestId('thread-sidebar')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
}) 