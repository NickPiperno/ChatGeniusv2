# Architecture Overview

## Server Architecture

### Combined Server
The application uses a single server that handles both HTTP and WebSocket connections:
- Next.js handles HTTP requests and serves the web application
- Socket.IO is integrated with the Next.js HTTP server for real-time communication
- All traffic goes through port 3000 by default

### Real-time Communication
- Socket.IO manages WebSocket connections with automatic fallback to polling
- Events are handled in `combined-server.ts`
- Rooms are used for group chat isolation
- Automatic reconnection and state recovery
- Connection monitoring and health checks

## Data Storage

### DynamoDB Tables
- Messages Table: Stores chat messages and their metadata
- Groups Table: Manages group chat information and members
- Users Table: Stores user profiles and settings

### File Storage (MongoDB GridFS)
- Handles file uploads and downloads
- Stores file metadata and content
- Manages file streaming and retrieval

## Data Flow

### Message Flow
1. Client emits message event
2. Server validates and processes message
3. Message is stored in DynamoDB
4. Server broadcasts to room members
5. Clients receive and display message

### File Handling Flow
1. Upload Process:
   - Client initiates upload
   - File is processed and stored in MongoDB GridFS
   - System generates file ID and metadata
   - References stored in DynamoDB

2. Download Process:
   - Client requests file by ID
   - System validates access permissions
   - File is streamed to client

## Data Models

### Message
```typescript
interface Message {
  id: string
  content: string
  userId: string
  groupId: string
  createdAt: Date
  updatedAt?: Date
  parentId?: string
  replyCount?: number
  attachments?: FileReference[]
  reactions?: Reaction[]
  edited?: boolean
}
```

### FileReference
```typescript
interface FileReference {
  id: string        // Unique identifier
  name: string      // Original filename
  type: string      // MIME type
  size: number      // File size in bytes
  url: string       // Access URL
  metadata: {       // Additional metadata
    uploadedBy: string
    uploadedAt: Date
    // ... other metadata
  }
}
```

## API Endpoints

### Chat Operations
- `/api/messages` - Message operations
- `/api/groups` - Group management
- `/api/users` - User operations

### File Operations
- `/api/upload` - Handles file uploads
- `/api/files/[fileId]` - Streams files
- `/api/files/metadata/[fileId]` - Retrieves file metadata

### System Operations
- `/api/health` - System health check

## Socket Events

### Client to Server
- `message` - Send a new message
- `edit_message` - Edit an existing message
- `delete_message` - Delete a message
- `reaction` - Add/remove reaction
- `thread_sync` - Request thread messages
- `thread_typing` - Typing indicator
- `thread_read` - Mark messages as read

### Server to Client
- `message` - New message notification
- `message_update` - Message edited notification
- `message_delete` - Message deleted notification
- `reaction_update` - Reaction changes
- `thread_state` - Thread state updates
- `thread_typing_update` - Typing indicators
- `error` - Error notifications

## Health Monitoring
The application includes comprehensive health monitoring:
- Server status (HTTP and WebSocket)
- Database connections
- Room statistics
- Socket connection stats
- Memory usage
- Error rates

## Security
- Authentication via Clerk
- CORS configuration for API and WebSocket
- Input validation
- Rate limiting
- Room-based access control 