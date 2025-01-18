# ChatGenius Features

## Message Threading System

### Thread/Reply Functionality
- Each message can be replied to, creating a threaded conversation
- Replies are stored as regular messages with a `parentId` reference
- Thread counts show number of replies under each message
- Replies appear in both the main chat and the thread sidebar

### Thread Sidebar
- Opens on the right side when clicking "Reply"
- Shows original message at the top
- Displays all replies in chronological order
- Uses the main message input for replies
- Shows "Replying to [user]" banner above input
- Preserves context of the conversation
- Can be closed via "Cancel" button or Esc key

### Thread Features
- Virtualized thread list for optimal performance
- Paginated replies (20 per page)
- Real-time updates
- Keyboard shortcuts:
  - `Esc` - Close thread
  - `PageUp/PageDown` - Navigate pages
  - `Ctrl/Cmd + R` - Focus reply input
- Smooth animations and transitions
- Thread synchronization
- Error handling with retries
- Loading states and indicators

## Reaction System

### Emoji Reactions
- Users can react to messages with emoji
- One emoji per user per message
- New reactions replace user's previous reaction
- Users can remove their own reactions

### Reaction Display
- Groups identical reactions together
- Shows reaction count
- Hover to see list of users who reacted
- Supports both main messages and replies

### Reaction Picker
- Quick access to common emojis
- Clean, modern interface
- Optimized for desktop and mobile
- Supports keyboard navigation

## Message Formatting

### Text Formatting
- Bold text using `**text**`
- Italic text using `*text*`
- Underline using `__text__`
- Code blocks using ``` ` ```
- Links using `[text](url)`

### List Support
- Bullet points
- Numbered lists
- Auto-continuation
- Proper indentation

## Real-time Features

### Live Updates
- Messages appear instantly
- Reaction counts update in real-time
- Thread counts update automatically
- Typing indicators

### Message Management
- Edit own messages
- Delete own messages
- See edit history
- Edit indicators

## UI/UX Features

### Modern Interface
- Clean, minimal design
- Responsive layout
- Dark mode support
- Smooth animations

### Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

## Data Model

### Message Structure
```typescript
interface Message {
  id: string
  content: string
  timestamp: number
  userId: string
  displayName: string
  imageUrl?: string
  attachments?: MessageAttachment[]
  mentions?: string[]
  parentId?: string
  reactions: Record<string, MessageReaction>
  replies: Message[]
  edited?: boolean
}
```

### Reaction Structure
```typescript
interface MessageReaction {
  emoji: string
  count: number
  users: string[] // user IDs
}
```

### Message Input
- Single input box for both messages and replies
- Changes placeholder to "Write a reply..." when in reply mode
- Shows reply banner with original message context
- Allows canceling reply with "Cancel" button
- Automatically focuses when reply mode is activated
- Maintains thread context while typing 