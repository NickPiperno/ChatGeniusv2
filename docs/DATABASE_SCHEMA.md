# Database Schema Reference

This document outlines the DynamoDB table structures and naming conventions used in the ChatGenius application.

## Naming Conventions

- `id`: Used as the primary identifier for messages
- `groupId`: Used to identify channels/groups
- `userId`: Used to identify users and message senders
- `parentId`: Used to identify the parent message in replies
- `replyId`: Used to identify individual replies

## Table Structures

### Messages Table
- Hash Key: `id` (String)
- Range Key: `groupId` (String)
- GSI: GroupIdIndex
  - Hash Key: `groupId`
  - Range Key: `timestamp`
- GSI: ParentMessageIndex
  - Hash Key: `parentId`
  - Range Key: `timestamp`
- Required Fields:
  - `content` (String)
  - `userId` (String)
  - `displayName` (String)
  - `timestamp` (Number)
  - `reactions` (Map)
  - `attachments` (List)
  - `edited` (Boolean)
- Optional Fields:
  - `imageUrl` (String)      # Avatar URL of the sender
  - `parentId` (String)       # References parent message for replies
  - `replyCount` (Number)     # Number of replies to this message
  - `metadata` (Map)          # Additional message metadata

### GroupChats Table
- Hash Key: `id` (String)
- Required Fields:
  - `name` (String)        # Name of the group/DM
  - `userId` (String)      # Owner/creator ID
  - `createdAt` (String)   # ISO timestamp
  - `updatedAt` (String)   # ISO timestamp
  - `members` (String[])   # Array of member user IDs
  - `type` ('group' | 'dm') # Type of chat - either group or DM
  - `isPrivate` (Boolean)  # Whether the chat is private
- Optional Fields:
  - `description` (String) # Group description (groups only)
  - `metadata` (Map)      # Additional metadata

### FileMetadata Table
- Hash Key: `id` (String)
- Range Key: `groupId` (String)
- GSI: MessageIndex
  - Hash Key: `messageId`
- GSI: GroupFilesIndex
  - Hash Key: `groupId`
  - Range Key: `uploadedAt`
- Required Fields:
  - `messageId` (String)
  - `uploadedAt` (String)
  - `name` (String)
  - `type` (String)
  - `size` (Number)
  - `url` (String)
  - `uploadedBy` (String)

### Users Table
- Hash Key: `id` (String)
- GSI: EmailIndex
  - Hash Key: `email`
- GSI: displayNameIndex
  - Hash Key: `displayName`
- Required Fields:
  - `id` (String)            # Unique identifier
  - `email` (String)         # User's email address
  - `displayName` (String)   # User's displayName
  - `Auth0Id` (String)       # Auth0 authentication ID
  - `lastActiveAt` (Number)  # Last active timestamp
- Optional Fields:
  - `imageUrl` (String)     # User's avatar URL

### PinnedMessages Table
- Hash Key: `groupId` (String)
- Range Key: `pinnedAt` (Number)

### Notifications Table
- Hash Key: `userId` (String)
- Range Key: `timestamp` (Number)

### UserStatus Table
- Hash Key: `userId` (String)

### TypingIndicators Table
- Hash Key: `conversationId` (String)
- Range Key: `userId` (String)

### Reactions Table
- Hash Key: `messageId` (String)
- Range Key: `userId` (String)

## API Route Structure

All message-related routes follow this pattern:
```
/api/groups/[groupId]/messages
/api/groups/[groupId]/messages/[id]
/api/groups/[groupId]/messages/[id]/replies
/api/groups/[groupId]/messages/[id]/replies/[replyId]
```

## Common Fields

### Message
- `id`: Unique identifier
- `groupId`: Group/channel identifier
- `content`: Message content
- `userId`: User ID of sender
- `timestamp`: Unix timestamp
- `attachments`: Array of attachment metadata
- `reactions`: Map of reactions
- `parentId`: Optional, references parent message in thread
- `edited`: Whether the message has been edited

## Core Entities

### Messages
- `id`: Unique identifier
- `groupId`: Group/channel identifier
- `content`: Message content
- `userId`: ID of the user who sent the message
- `displayName`: Name of the sender
- `avatarUrl`: Avatar URL of the sender
- `timestamp`: When the message was sent
- `parentId`: Optional, references parent message in a thread
- `replyCount`: Number of replies to this message
- `reactions`: Map of emoji to reaction data
- `attachments`: Array of file attachments
- `metadata`: Additional message metadata
- `edited`: Whether the message has been edited

### Thread System
Threads are implemented using the Messages table:
- Regular messages have no `parentId`
- Reply messages include a `parentId` referencing their parent message
- The ParentMessageIndex GSI enables efficient retrieval of all replies to a message
- Reactions and attachments work identically for both regular messages and replies

### Message Reactions
Reactions are stored in the message document:
```typescript
interface MessageReaction {
  emoji: string
  users: string[]  // Array of user IDs who reacted
  count: number    // Total reaction count
}
```

### Thread Read Status
Tracks which users have read messages in a thread:
```typescript
interface ThreadReadStatus {
  messageId: string    // Parent message ID
  userId: string      // User who read the thread
  lastReadAt: string  // Timestamp of last read
  metadata?: Record<string, any>
}
```

### Real-time Events
Socket events for thread and reaction management:
- `thread_sync`: Synchronize thread state
- `thread_update`: Update thread open/closed state
- `reaction`: Add/remove reactions
- `thread_typing`: Thread typing indicators
- `thread_read`: Update thread read status

## API Endpoints

### Thread Management
```typescript
// Get thread messages
GET /api/messages/{messageId}/thread

// Update thread status
POST /api/messages/{messageId}/thread/read
{
  userId: string
  lastReadAt: string
}
```

### Reaction Management
```typescript
// Add/remove reaction
POST /api/messages/{messageId}/reactions
{
  groupId: string
  emoji: string
  userId: string
  add: boolean
}
``` 

## Search System

### Search Results
Search results are returned in a standardized format:
```typescript
interface SearchResult {
  id: string
  type: 'message' | 'file'
  content?: string        // For messages
  name?: string          // For files
  sender?: {
    id: string
    displayName: string
    avatarUrl: string
  }
  groupId: string        // Group where the item is located
  name: string           // Name of the group
  timestamp: number      // When the item was created/modified
  matches: {            // Highlighted matches for search terms
    start: number
    end: number
  }[]
  url?: string          // For files
  fileType?: string     // For files
} 