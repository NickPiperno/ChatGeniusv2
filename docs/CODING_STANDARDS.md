# Elite-Level Coding Standards for Modern Chat Applications

## 1. Code Architecture

### 1.1 Clean Architecture Implementation

```typescript
// Example: Feature-based Clean Architecture

// 1. Domain Layer (core business logic)
interface Message {
  id: string
  content: string
  senderId: string
  timestamp: Date
  attachments?: Attachment[]
}

// 2. Use Case Layer (application logic)
interface SendMessageUseCase {
  execute(message: Message): Promise<void>
}

// 3. Interface Layer (adapters)
interface MessageRepository {
  save(message: Message): Promise<void>
  getByGroupId(groupId: string): Promise<Message[]>
}

// 4. Infrastructure Layer (frameworks & drivers)
class WebSocketMessageGateway implements MessageRepository {
  constructor(private socket: Socket) {}
  
  async save(message: Message): Promise<void> {
    await this.socket.emit('message:send', message)
  }
}
```

### 1.2 SOLID Principles in Practice

```typescript
// Single Responsibility Principle
class MessageFormatter {
  formatMarkdown(content: string): string
  formatMentions(content: string): string
  formatEmojis(content: string): string
}

// Open/Closed Principle
interface MessageValidator {
  validate(message: Message): boolean
}

class LengthValidator implements MessageValidator {
  validate(message: Message): boolean
}

class ProfanityValidator implements MessageValidator {
  validate(message: Message): boolean
}

// Interface Segregation
interface MessageReader {
  read(id: string): Promise<Message>
}

interface MessageWriter {
  write(message: Message): Promise<void>
}

// Dependency Inversion
class ChatService {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly userRepo: UserRepository
  ) {}
}
```

### 1.3 Performance Optimization Patterns

```typescript
// 1. Message Virtualization
function MessageList() {
  return (
    <VirtualizedList
      rowCount={messages.length}
      rowHeight={getVariableMessageHeight}
      renderRow={({ index }) => (
        <Message
          key={messages[index].id}
          message={messages[index]}
        />
      )}
    />
  )
}

// 2. Optimistic Updates
function useMessageSend() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: sendMessage,
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries(['messages'])
      const previous = queryClient.getQueryData(['messages'])
      queryClient.setQueryData(['messages'], old => [...old, newMessage])
      return { previous }
    }
  })
}

// 3. Efficient Real-time Updates
const messageStore = create<MessageStore>((set) => ({
  messages: [],
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message]
  })),
  updateMessage: (id, update) => set(state => ({
    messages: state.messages.map(msg =>
      msg.id === id ? { ...msg, ...update } : msg
    )
  }))
}))
```

## 2. Code Organization

### 2.1 Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/            
│   ├── chat/              # Chat-specific components
│   │   ├── message/       # Message-related components
│   │   ├── input/         # Input-related components
│   │   └── sidebar/       # Sidebar components
│   └── shared/            # Shared UI components
├── features/              # Feature-based modules
│   ├── messaging/         # Messaging feature
│   ├── presence/          # User presence feature
│   └── reactions/         # Message reactions feature
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── server/                # Server-side code
└── types/                 # TypeScript types
```

### 2.2 State Management Patterns

```typescript
// 1. Server State
const useMessages = (groupId: string) => {
  return useQuery({
    queryKey: ['messages', groupId],
    queryFn: () => fetchMessages(groupId),
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5 // 5 minutes
  })
}

// 2. Client State
interface ChatStore {
  activeGroup: string | null
  draftMessages: Record<string, string>
  setActiveGroup: (groupId: string) => void
  setDraftMessage: (groupId: string, content: string) => void
}

// 3. Derived State
const useUnreadCount = (groupId: string) => {
  const messages = useMessages(groupId)
  const lastRead = useLastRead(groupId)
  
  return useMemo(() => 
    messages.data?.filter(m => 
      m.timestamp > lastRead
    ).length ?? 0,
    [messages.data, lastRead]
  )
}
```

### 2.3 Error Handling Strategy

```typescript
// 1. Error Boundaries
class ChatErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return <ChatErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}

// 2. Error Types
interface ChatError extends Error {
  code: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'PERMISSION_ERROR'
  context?: Record<string, unknown>
}

// 3. Error Handlers
const errorHandlers: Record<string, (error: ChatError) => void> = {
  NETWORK_ERROR: (error) => {
    toast.error('Connection lost. Retrying...')
    retryConnection()
  },
  VALIDATION_ERROR: (error) => {
    form.setError(error.context?.field as string, {
      message: error.message
    })
  }
}
```

## 3. Performance Standards

### 3.1 Memory Management

```typescript
// 1. Resource Cleanup
function ChatRoom() {
  const cleanup = useRef<(() => void)[]>([])
  
  useEffect(() => {
    const socket = connectToChat()
    cleanup.current.push(() => socket.disconnect())
    
    const observer = setupPresenceObserver()
    cleanup.current.push(() => observer.disconnect())
    
    return () => {
      cleanup.current.forEach(fn => fn())
      cleanup.current = []
    }
  }, [])
}

// 2. Memory Leaks Prevention
function useMessageSubscription(groupId: string) {
  const subscription = useRef<Subscription>()
  
  useEffect(() => {
    subscription.current = subscribeToMessages(groupId)
    return () => subscription.current?.unsubscribe()
  }, [groupId])
}
```

### 3.2 Async Operation Handling

```typescript
// 1. Concurrent Operations
const sendMessageWithAttachments = async (
  message: Message,
  files: File[]
) => {
  const uploadPromises = files.map(uploadFile)
  const attachments = await Promise.all(uploadPromises)
  
  return sendMessage({
    ...message,
    attachments
  })
}

// 2. Cancellation
const useCancellableQuery = (queryFn: () => Promise<any>) => {
  const abortController = useRef<AbortController>()
  
  useEffect(() => {
    abortController.current = new AbortController()
    return () => abortController.current?.abort()
  }, [])
  
  return useQuery({
    queryFn: () => queryFn(),
    signal: abortController.current?.signal
  })
}
```

## 4. Code Quality Metrics

### 4.1 Complexity Thresholds

```typescript
// Maximum cyclomatic complexity: 10
// Maximum cognitive complexity: 15
// Maximum parameters per function: 3
// Maximum function length: 30 lines

// Good
function processMessage(
  message: Message,
  options: MessageOptions = {}
): ProcessedMessage {
  const {
    shouldFormat = true,
    shouldValidate = true
  } = options

  if (shouldValidate) {
    validateMessage(message)
  }

  return shouldFormat
    ? formatMessage(message)
    : message
}

// Bad - Too complex
function handleMessageAction(
  message: Message,
  action: string,
  user: User,
  group: Group,
  options: MessageOptions
) {
  // Complex nested conditions...
}
```

### 4.2 Function Guidelines

```typescript
// 1. Pure Functions
const formatMessagePreview = (
  content: string,
  maxLength: number = 50
): string => {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

// 2. Side Effects Isolation
const useMessageEffects = (message: Message) => {
  useEffect(() => {
    trackMessageView(message.id)
  }, [message.id])
  
  useEffect(() => {
    if (message.mentions?.includes(currentUser.id)) {
      notifyMention(message)
    }
  }, [message.mentions])
}
```

## 5. Security Standards

### 5.1 Input Validation

```typescript
// 1. Message Validation
const messageSchema = z.object({
  content: z.string()
    .min(1)
    .max(2000)
    .transform(sanitizeHtml),
  attachments: z.array(
    z.object({
      url: z.string().url(),
      type: z.enum(['image', 'file'])
    })
  ).max(10)
})

// 2. Real-time Data Validation
socket.on('message', (data) => {
  const result = messageSchema.safeParse(data)
  if (!result.success) {
    socket.emit('error', {
      code: 'VALIDATION_ERROR',
      details: result.error
    })
    return
  }
  processMessage(result.data)
})
```

### 5.2 WebSocket Security

```typescript
// 1. Connection Authentication
const secureSocket = io({
  auth: {
    token: await getAuthToken()
  },
  transports: ['websocket']
})

// 2. Message Rate Limiting
class RateLimiter {
  private messageCount: number = 0
  private resetTimeout: NodeJS.Timeout

  constructor(
    private limit: number = 10,
    private window: number = 10000
  ) {
    this.resetCount()
  }

  canSendMessage(): boolean {
    return this.messageCount < this.limit
  }

  trackMessage(): void {
    this.messageCount++
  }

  private resetCount(): void {
    this.resetTimeout = setInterval(() => {
      this.messageCount = 0
    }, this.window)
  }
}
```

## 6. Testing Requirements

### 6.1 Unit Testing

```typescript
describe('MessageFormatter', () => {
  const formatter = new MessageFormatter()

  it('formats markdown correctly', () => {
    const input = '**bold** *italic*'
    const output = formatter.format(input)
    expect(output).toContain('<strong>bold</strong>')
    expect(output).toContain('<em>italic</em>')
  })

  it('handles empty input', () => {
    expect(formatter.format('')).toBe('')
  })

  it('sanitizes dangerous content', () => {
    const input = '<script>alert("xss")</script>'
    expect(formatter.format(input)).not.toContain('script')
  })
})
```

### 6.2 Integration Testing

```typescript
describe('ChatRoom Integration', () => {
  it('handles complete message flow', async () => {
    // Setup
    const { user } = renderChatRoom()
    const messageText = 'Hello, world!'

    // Action
    await user.type(
      screen.getByPlaceholderText('Type a message'),
      messageText
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(messageText)).toBeInTheDocument()
    })
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'message:send',
      expect.objectContaining({ content: messageText })
    )
  })
})
```

## 7. Documentation Standards

### 7.1 Component Documentation

```typescript
/**
 * MessageComposer component handles message input and submission.
 * 
 * @example
 * ```tsx
 * <MessageComposer
 *   onSend={(message) => handleSend(message)}
 *   placeholder="Type a message..."
 *   maxLength={1000}
 * />
 * ```
 * 
 * @param props - Component props
 * @param props.onSend - Callback fired when a message is sent
 * @param props.placeholder - Input placeholder text
 * @param props.maxLength - Maximum message length
 * 
 * @remarks
 * - Handles file attachments up to 10MB
 * - Supports markdown formatting
 * - Implements mention suggestions
 */
```

### 7.2 API Documentation

```typescript
/**
 * Message API endpoints and types.
 * 
 * @packageDocumentation
 */

/**
 * Represents a chat message.
 */
interface Message {
  /** Unique message identifier */
  id: string
  
  /** Message content in markdown format */
  content: string
  
  /** ISO timestamp of message creation */
  timestamp: string
  
  /** User ID of message sender */
  senderId: string
}

/**
 * Sends a new message to a chat group.
 * 
 * @param groupId - Target group identifier
 * @param message - Message content and metadata
 * @returns Promise resolving to the created message
 * 
 * @throws {ValidationError} If message content is invalid
 * @throws {PermissionError} If user cannot send to group
 */
async function sendMessage(
  groupId: string,
  message: Message
): Promise<Message>
```

## 8. Version Control Standards

### 8.1 Commit Messages

```
feat(chat): implement message reactions
^    ^     ^
|    |     |
|    |     +-> Summary in present tense
|    +-------> Scope
+------------> Type: feat/fix/docs/style/refactor/test/chore
```

### 8.2 Branch Strategy

```
main
  ├── develop
  │   ├── feature/message-reactions
  │   ├── feature/file-uploads
  │   └── bugfix/message-ordering
  └── hotfix/security-patch
```

## 9. Monitoring and Debugging

### 9.1 Performance Monitoring

```typescript
// 1. Component Performance
const MessageList = memo(function MessageList() {
  const renderCount = useRenderCount()
  
  useEffect(() => {
    performance.mark('messageList-rendered')
    trackMetric('component.messageList.render', renderCount)
  })
  
  return (/* ... */)
})

// 2. Network Monitoring
const api = axios.create({
  baseURL: '/api',
  onRequest: (config) => {
    config.metadata = { startTime: Date.now() }
  },
  onResponse: (response) => {
    const duration = Date.now() - response.config.metadata.startTime
    trackMetric('api.response.time', duration, {
      endpoint: response.config.url
    })
  }
})
```

### 9.2 Error Tracking

```typescript
// 1. Error Boundaries with Tracking
class TrackedErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    trackError(error, {
      component: this.constructor.name,
      stackTrace: info.componentStack
    })
  }
}

// 2. API Error Tracking
const trackApiError = (error: ApiError) => {
  Sentry.captureException(error, {
    tags: {
      endpoint: error.endpoint,
      statusCode: error.status
    },
    extra: {
      request: error.request,
      response: error.response
    }
  })
}
```

## 10. Optimization Checklist

### Performance
- [x] Implement virtualization for long lists
  - Message lists
  - Thread replies
  - User lists
- [x] Use React.memo() for expensive renders
- [x] Optimize images with next/image
- [x] Implement proper code splitting
- [x] Use service worker for caching
- [x] Implement pagination for large datasets
  - Thread replies (20 per page)
  - Message history
  - Search results
- [x] Optimize keyboard interactions
  - Thread navigation
  - Message actions
  - Global shortcuts

### Security
- [x] Implement rate limiting
- [x] Sanitize all user input
- [x] Use secure WebSocket connections
- [x] Implement proper authentication

### User Experience
- [x] Keyboard shortcuts for common actions
- [x] Loading states and indicators
- [x] Error handling with retry options
- [x] Smooth animations and transitions
- [x] Responsive design
- [x] Accessibility features 