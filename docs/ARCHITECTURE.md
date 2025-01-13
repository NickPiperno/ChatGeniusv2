# ChatGenius Architecture

## UI Constants

### Layout
- Header height is consistently set to 64px across the application
- This value is passed to components via the `headerHeight` prop
- Used for proper spacing and alignment in:
  - Main chat interface
  - Thread panels
  - Modal dialogs
  - Mobile responsive layouts

## Database Architecture

The application uses a dual-database approach for optimal performance and functionality:

### DynamoDB (`lib/services/dynamodb.ts`)
- Primary database for application data
- Stores:
  - Users and user profiles
  - Messages and reactions
  - Channels and DMs
  - File metadata (references to MongoDB files)
  - User preferences and settings
  - Real-time features (typing indicators, user status)
- Provides fast access for real-time chat features
- Types defined in `lib/types/dynamodb.ts`

### MongoDB GridFS (`lib/mongodb.ts`)
- Used EXCLUSIVELY for file storage
- Responsibilities:
  - File uploads and downloads
  - Large binary data storage
  - File streaming
- Does NOT store any application data
- All file operations are isolated in `lib/mongodb.ts`
- Uses GridFS for efficient handling of large files

## Type System

The type system is organized into two main categories:

### Frontend/API Types (`lib/types/app.ts`)
- Types used in React components and API responses
- Represents the shape of data as seen by the frontend
- Includes:
  - Component prop types
  - Event types
  - UI state types

### DynamoDB Types (`lib/types/dynamodb.ts`)
- Represents the schema of data in DynamoDB
- Used by the DynamoDB service for type safety
- Includes:
  - User profiles
  - Messages
  - Channels
  - File metadata
  - Real-time feature types

## File Handling Flow

When a file is attached to a message:

1. Frontend:
   - User selects a file
   - File is sent to `/api/upload` endpoint

2. Backend:
   - File is uploaded to MongoDB GridFS using `lib/mongodb.ts`
   - MongoDB returns a file ID and metadata
   - File metadata is stored in DynamoDB as part of the message
   - API returns file info to frontend

3. Retrieval:
   - Frontend displays file using URL from message
   - URL points to `/api/files/[fileId]` endpoint
   - Endpoint streams file from MongoDB GridFS

## Type Relationships

```typescript
// DynamoDB Message Type
interface DynamoDBMessage {
  id: string
  content: string
  // ... other message fields
  attachments?: {
    id: string        // MongoDB GridFS ID
    url: string       // API endpoint
    name: string      // Original filename
    type: string      // File type
  }[]
}

// MongoDB File Type (GridFS)
interface GridFSFile {
  _id: ObjectId
  filename: string
  contentType: string
  metadata: {
    userId: string
    groupId: string
    originalName: string
    type: string
    size: number
  }
}

// Frontend Message Type
interface Message {
  id: string
  content: string
  // ... other message fields
  attachments?: {
    id: string
    url: string
    name: string
    type: 'document' | 'image'
  }[]
}
```

## API Routes

### File Routes (`/api/files/*`)
- All file operations use `lib/mongodb.ts`
- `/api/upload` - Handles file uploads to MongoDB GridFS
- `/api/files/[fileId]` - Streams files from MongoDB GridFS
- File metadata stored in DynamoDB after successful upload

### Data Routes
- All data operations use `lib/services/dynamodb.ts`
- Handle users, messages, channels, etc.
- Store file metadata but not actual files 

## Real-time Communication

### Socket Events
The application uses Socket.IO for real-time communication. Key events include:

#### Message Events
- `message`: Send new messages
- `message_update`: Edit existing messages
- `message_delete`: Delete messages

#### Thread Events
- `thread_sync`: Request thread synchronization
- `thread_sync_complete`: Thread sync completed
- `thread_update`: Thread state changes
- `thread_typing`: Thread typing indicators
- `thread_read`: Thread read status updates

#### Reaction Events
- `reaction`: Add/remove message reactions
- `reaction_update`: Reaction state changes

### Event Flow
1. Client emits event (e.g., `message`, `reaction`)
2. Server validates and processes request
3. Server updates database
4. Server broadcasts event to relevant clients
5. Clients update their state

## Thread System Architecture

### Components
1. **MessageThread**
   - Manages thread UI and state
   - Handles thread synchronization
   - Manages thread read status

2. **MessageList**
   - Renders messages in thread
   - Handles message actions (edit, delete)
   - Manages reactions

3. **ThreadStore**
   - Manages thread state
   - Handles error states
   - Manages retry logic

### Data Flow
```typescript
interface ThreadState {
  isOpen: boolean
  parentMessage: Message
  replies: MessageReply[]
  isLoading: boolean
  error: Error | null
}

interface ThreadAction {
  type: 'SYNC' | 'UPDATE' | 'ERROR'
  payload: any
}
```

### Error Handling
- Retry logic for failed operations
- Error states with user feedback
- Graceful degradation

## Reaction System

### Implementation
Reactions are implemented using:
1. Optimistic updates for instant feedback
2. Server validation
3. Broadcast to all clients
4. Persistence in database

### Data Structure
```typescript
interface ReactionState {
  messageId: string
  reactions: {
    [emoji: string]: {
      count: number
      users: string[]
    }
  }
}
```

### Performance Considerations
- Batch updates for multiple reactions
- Debounced typing indicators
- Optimized thread synchronization
- Pagination for long threads 

## Server/Client Component Pattern

### Overview
The application uses a structured pattern for pages that require both server-side operations and client-side interactivity:

1. **Server Component** (`page.tsx`)
   - Handles data fetching
   - Generates metadata
   - Performs authentication
   - Passes data to client components

2. **Client Component** (`client.tsx`)
   - Manages interactivity
   - Handles client-side state
   - Renders UI components

### Implementation Example
```typescript
// page.tsx (Server Component)
export default async function Page({ params }) {
  // Server-side operations
  const data = await fetchData()
  const metadata = await generateMetadata()
  
  // Pass data to client component
  return <ClientComponent data={data} />
}

// client.tsx (Client Component)
'use client'
export function ClientComponent({ data }) {
  // Client-side interactivity
  const [state, setState] = useState(data)
  
  return <InteractiveUI data={state} />
}
```

### Group Chat Implementation
The group chat feature demonstrates this pattern:

#### Server Component (`app/group/[groupId]/page.tsx`)
```typescript
export default async function GroupPage({ params }) {
  // Authentication
  const { userId } = auth()
  if (!userId) return notFound()

  // Data fetching
  const group = await dynamoDb.getGroupById(params.groupId)
  const messages = await dynamoDb.getMessagesByGroup(params.groupId)

  // Pass to client component
  return <GroupPageClient 
    group={group} 
    messages={messages} 
    userId={userId} 
  />
}
```

#### Client Component (`app/group/[groupId]/client.tsx`)
```typescript
export function GroupPageClient({ group, messages, userId }) {
  // Access control
  if (!group.members.includes(userId)) {
    return <AccessDenied />
  }

  // Interactive chat interface
  return <GroupChat 
    group={group} 
    initialMessages={messages} 
  />
}
```

### Benefits
1. **Performance**
   - Initial data fetching on server
   - Reduced client-side JavaScript
   - Optimized for Next.js App Router

2. **Type Safety**
   - Clear data flow boundaries
   - Typed props between components
   - Server/client separation

3. **Maintainability**
   - Single responsibility principle
   - Clear separation of concerns
   - Easier debugging and testing

4. **Security**
   - Authentication on server
   - Sensitive operations isolated
   - Data validation at boundaries

### Best Practices
1. Keep server components focused on data fetching and initial state
2. Move all interactive features to client components
3. Use proper typing for component props
4. Handle loading and error states appropriately
5. Consider implementing error boundaries
6. Use suspense boundaries for loading states

### Error Handling
```typescript
// Server-side error handling
try {
  const data = await fetchData()
} catch (error) {
  return <ErrorComponent message="Failed to load data" />
}

// Client-side error handling
try {
  await handleUserAction()
} catch (error) {
  showErrorToast("Action failed")
}
``` 