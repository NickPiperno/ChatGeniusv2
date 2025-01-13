# Socket Connection Troubleshooting Guide

## Issue: WebSocket Connection Failures

When encountering WebSocket connection issues in a Next.js application with Socket.IO, follow these steps:

### 1. Environment Variables Setup
- Ensure environment variables are loaded correctly in the socket server
- Use direct file reading for `.env.local` in standalone servers:
```typescript
const fs = require('fs')
const path = require('path')
const envPath = path.resolve(process.cwd(), '.env.local')

// Load environment variables directly
try {
  const content = fs.readFileSync(envPath, 'utf8')
  const envVars = content.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^#\s][^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      acc[key.trim()] = value.trim()
    }
    return acc
  }, {})
  
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value
  })
} catch (error) {
  console.error('[Socket Server] Error loading environment:', error)
  process.exit(1)
}
```

### 2. Socket Server Configuration
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})
```

### 3. Client Configuration
```typescript
const socketInstance = io('http://localhost:3001', {
  transports: ['polling', 'websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 30000,
  withCredentials: true,
  forceNew: true,
  path: '/socket.io'
})
```

### 4. Port Management
If encountering `EADDRINUSE` errors:
```powershell
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

### 5. Message Component Date Handling
When displaying message timestamps:
```typescript
import { formatDistanceToNow, parseISO } from 'date-fns'

const formattedDate = formatDistanceToNow(
  typeof message.timestamp === 'string' ? parseISO(message.timestamp) : new Date(message.timestamp),
  { addSuffix: true }
)
```

### Common Issues and Solutions

1. **WebSocket Connection Failures**
   - Ensure CORS is properly configured
   - Try polling first, then upgrade to WebSocket
   - Check for port conflicts
   - Verify environment variables are loaded

2. **Message Display Issues**
   - Use proper date parsing for timestamps
   - Ensure message types are correctly defined
   - Handle both string and number timestamp formats

3. **Environment Variable Issues**
   - Load `.env.local` explicitly for standalone servers
   - Verify all required variables are present
   - Check AWS credentials and region settings

### Verification Steps

1. Check server logs for successful connection:
```
[Socket Server] New transport connection: {
  id: 'xxx',
  transport: 'polling',
  protocol: 4
}
```

2. Verify environment variables:
```
[DynamoDB] Environment check: {
  hasRegion: true,
  hasAccessKey: true,
  hasSecretKey: true,
  hasMessagesTable: true
}
```

3. Confirm message handling:
- Messages appear in chat
- Timestamps display correctly
- Edits and reactions work 