# Socket Connection Troubleshooting Guide

## Issue: WebSocket Connection Failures

When encountering WebSocket connection issues in the ChatGenius application, follow these steps:

### 1. Environment Variables Setup
Required environment variable in `.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000  # Your server URL
```

The application uses a single server for both HTTP and WebSocket connections, so only one URL is needed.

### 2. Server Configuration
The server configuration is handled in `server/combined-server.ts`:

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.NEXT_PUBLIC_API_URL],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  maxHttpBufferSize: 1e8
})

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

### 3. Client Usage
Socket.IO is automatically initialized when connecting to the server. The client will use the same URL as the API:

```typescript
// The socket connection is handled by the server
// No additional client configuration is needed
// Just use the socket events in your components
socket.emit('message', {
  content: 'Hello!',
  groupId: 'group-123'
})
```

### 4. Port Management
If encountering `EADDRINUSE` errors, the port (default: 3000) is already in use. Kill the process:

```powershell
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Common Issues and Solutions

1. **WebSocket Connection Failures**
   - Ensure CORS is properly configured in `combined-server.ts`
   - Check for port conflicts (default port: 3000)
   - Verify `NEXT_PUBLIC_API_URL` is set and valid
   - Check server logs for connection errors

2. **Environment Variable Issues**
   - Ensure `NEXT_PUBLIC_API_URL` is set
   - Verify the URL is accessible
   - Check that the port matches your server configuration

3. **Socket Event Issues**
   - Verify the event names match between client and server
   - Check that you're in the correct room/group before emitting events
   - Look for any connection state errors in the console

### Verification Steps

1. Check server startup:
```
[Server] Server is running on port 3000
```

2. Verify socket connection:
```
[Socket Server] New transport connection: {
  id: 'xxx',
  transport: 'polling',
  protocol: 4
}
```

3. Monitor socket events:
```
[Socket Server] Client connected: <socket.id>
[Socket Server] Joined room: <groupId>
[Socket Server] Message received: { content: '...', groupId: '...' }
```

### Health Check

The application includes a health check endpoint at `/api/health` that monitors:
- Server status (HTTP and WebSocket)
- DynamoDB connection
- Room statistics
- Socket connection stats

Use this endpoint to verify the overall health of your server:
```bash
curl http://localhost:3000/api/health
``` 