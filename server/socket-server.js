const { Server } = require('socket.io');
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('[Socket Server] Loading environment from:', envPath);

try {
  const content = fs.readFileSync(envPath, 'utf8');
  const envVars = content.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^#\s][^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

  // Set environment variables
  Object.entries(envVars).forEach(([key, value]) => {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  });

  console.log('[Socket Server] Environment variables loaded:', {
    count: Object.keys(envVars).length,
    keys: Object.keys(envVars)
  });
} catch (error) {
  console.error('[Socket Server] Error loading environment:', error);
  process.exit(1);
}

// Server setup
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_API_URL ? [process.env.NEXT_PUBLIC_API_URL] : [],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8
});

// Extract port from NEXT_PUBLIC_SOCKET_URL or use default
if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
  console.error('[Socket Server] NEXT_PUBLIC_SOCKET_URL is not defined');
  process.exit(1);
}

const SOCKET_URL = new URL(process.env.NEXT_PUBLIC_SOCKET_URL);
const PORT = parseInt(SOCKET_URL.port);

if (!PORT) {
  console.error('[Socket Server] Invalid port in NEXT_PUBLIC_SOCKET_URL');
  process.exit(1);
}

httpServer.listen(PORT, () => {
  console.log(`[Socket Server] Server is running on port ${PORT}`);
});

// Socket event handlers
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', {
    socketId: socket.id,
    rooms: Array.from(socket.rooms),
    handshake: socket.handshake
  });

  socket.on('join_conversation', (groupId) => {
    console.log('[Socket] Client joining conversation:', {
      socketId: socket.id,
      groupId,
      previousRooms: Array.from(socket.rooms)
    });
    socket.join(groupId);
    console.log('[Socket] Client joined conversation:', {
      socketId: socket.id,
      groupId,
      currentRooms: Array.from(socket.rooms),
      roomSize: io.sockets.adapter.rooms.get(groupId)?.size
    });
  });

  socket.on('leave_conversation', (groupId) => {
    socket.leave(groupId);
    console.log('[Socket Server] Client left conversation', {
      socketId: socket.id,
      groupId,
      remainingRooms: Array.from(socket.rooms.values()),
      roomSize: io.sockets.adapter.rooms.get(groupId)?.size || 0
    });
  });

  socket.on('disconnect', () => {
    console.log('[Socket Server] Client disconnected:', socket.id);
  });
});

module.exports = io; 