# Socket Connection Troubleshooting Guide

## Issue: WebSocket Connection Failures

When encountering WebSocket connection issues in a Next.js application with Socket.IO, follow these steps:

### 1. Environment Variables Setup
Required environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=<YOUR_API_URL>
NEXT_PUBLIC_SOCKET_URL=<YOUR_SOCKET_URL>
```

Load environment variables in standalone servers:
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
// Validate environment variables
if (!process.env.NEXT_PUBLIC_SOCKET_URL || !process.env.NEXT_PUBLIC_API_URL) {
  console.error('[Socket Server] Required environment variables are not defined');
  process.exit(1);
}

const SOCKET_URL = new URL(process.env.NEXT_PUBLIC_SOCKET_URL);
const PORT = parseInt(SOCKET_URL.port);

if (!PORT) {
  console.error('[Socket Server] Invalid port in NEXT_PUBLIC_SOCKET_URL');
  process.exit(1);
}

const io = new Server(httpServer, {
  cors: {
    origin: [process.env.NEXT_PUBLIC_API_URL],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'], // Try polling first, then upgrade
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8
})

httpServer.listen(PORT, () => {
  console.log(`[Socket Server] Server is running on port ${PORT}`);
});

// Add transport logging
io.engine.on('connection', (socket) => {
  console.log('[Socket Server] New transport connection:', {
    id: socket.id,
    transport: socket.transport.name,
    protocol: socket.protocol,
    headers: socket.request.headers
  })
})
```

### 3. Client Configuration
```typescript
const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
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
If encountering `EADDRINUSE` errors, get the port from the URL and kill the process:
```powershell
# Windows (PowerShell)
$socketUrl = [System.Uri]$env:NEXT_PUBLIC_SOCKET_URL
Get-Process -Id (Get-NetTCPConnection -LocalPort $socketUrl.Port).OwningProcess | Stop-Process -Force
```

### Common Issues and Solutions

1. **WebSocket Connection Failures**
   - Ensure CORS is properly configured with correct environment variables
   - Try polling first, then upgrade to WebSocket
   - Check for port conflicts
   - Verify environment variables are loaded and valid

2. **Environment Variable Issues**
   - Ensure both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` are set
   - Verify URLs contain valid ports
   - Check that URLs are accessible from both client and server
   - Load `.env.local` explicitly for standalone servers

### Verification Steps

1. Check environment variables are loaded:
```
[Socket Server] Environment variables loaded: {
  NEXT_PUBLIC_API_URL: '<YOUR_API_URL>',
  NEXT_PUBLIC_SOCKET_URL: '<YOUR_SOCKET_URL>'
}
```

2. Verify server startup:
```
[Socket Server] Server is running on port <PORT>
```

3. Check client connection:
```
[Socket Server] New transport connection: {
  id: 'xxx',
  transport: 'polling',
  protocol: 4
}
``` 