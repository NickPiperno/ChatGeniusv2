# ChatGenius TDD Development Guide

This guide outlines the Test-Driven Development (TDD) approach for building the ChatGenius real-time chat application. Each feature will follow the Red-Green-Refactor cycle.

## Setup and Configuration

### Test Environment
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  setupFiles: ['<rootDir>/jest.setup.js']
}
```

### Test Structure
```
__tests__/
  unit/
    models/
      user.test.ts
      message.test.ts
      group.test.ts
    services/
      auth.test.ts
      websocket.test.ts
  integration/
    api/
      auth.test.ts
      messages.test.ts
      groups.test.ts
    websocket/
      connection.test.ts
  e2e/
    chat.test.ts
    auth.test.ts
```

## 1. User Authentication Tests

### 1.1 User Model Tests

```typescript
// __tests__/unit/models/user.test.ts

import { User } from '@/lib/types/models/user';

describe('User Model', () => {
  describe('validation', () => {
    it('should require email', () => {
      const user = {
        id: '123',
        name: 'Test User',
        email: ''
      };
      expect(() => validateUser(user)).toThrow('Email is required');
    });

    it('should validate email format', () => {
      const user = {
        id: '123',
        name: 'Test User',
        email: 'invalid-email'
      };
      expect(() => validateUser(user)).toThrow('Invalid email format');
    });
  });

  describe('authentication', () => {
    it('should hash password before saving', async () => {
      const user = {
        email: 'test@example.com',
        password: 'password123'
      };
      const savedUser = await createUser(user);
      expect(savedUser.password).not.toBe(user.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/);
    });
  });
});
```

### 1.2 Authentication Service Tests

```typescript
// __tests__/unit/services/auth.test.ts

describe('Authentication Service', () => {
  describe('login', () => {
    it('should return JWT token on successful login', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const result = await authService.login(credentials);
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      await expect(authService.login(credentials))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('session management', () => {
    it('should validate active sessions', async () => {
      const token = 'valid-jwt-token';
      const session = await authService.validateSession(token);
      expect(session.isValid).toBe(true);
      expect(session.userId).toBeDefined();
    });
  });
});
```

## 2. Message Handling Tests

### 2.1 Message Model Tests

```typescript
// __tests__/unit/models/message.test.ts

describe('Message Model', () => {
  describe('creation', () => {
    it('should create message with required fields', async () => {
      const message = {
        content: 'Hello World',
        userId: 'user123',
        groupId: 'group456'
      };
      const savedMessage = await createMessage(message);
      expect(savedMessage.id).toBeDefined();
      expect(savedMessage.timestamp).toBeDefined();
      expect(savedMessage.content).toBe(message.content);
    });

    it('should validate message content length', () => {
      const message = {
        content: '', // Empty content
        userId: 'user123',
        groupId: 'group456'
      };
      expect(() => validateMessage(message)).toThrow('Message content is required');
    });
  });

  describe('delivery status', () => {
    it('should track message delivery status', async () => {
      const message = await createMessage({
        content: 'Test message',
        userId: 'user123',
        groupId: 'group456'
      });
      
      await markMessageAsDelivered(message.id);
      const updatedMessage = await getMessage(message.id);
      expect(updatedMessage.deliveryStatus).toBe('delivered');
    });
  });
});
```

### 2.2 WebSocket Connection Tests

```typescript
// __tests__/unit/services/websocket.test.ts

describe('WebSocket Service', () => {
  describe('connection', () => {
    it('should establish connection with valid token', async () => {
      const token = await generateValidToken();
      const connection = await websocketService.connect(token);
      expect(connection.status).toBe('connected');
    });

    it('should handle reconnection attempts', async () => {
      const connection = await websocketService.connect(token);
      await connection.disconnect();
      const reconnected = await connection.reconnect();
      expect(reconnected.status).toBe('connected');
    });
  });

  describe('message handling', () => {
    it('should emit message received event', (done) => {
      const connection = await websocketService.connect(token);
      connection.on('message', (message) => {
        expect(message).toBeDefined();
        expect(message.content).toBe('test message');
        done();
      });
      
      await sendTestMessage('test message');
    });
  });
});
```

## 3. Chat Room Tests

### 3.1 Group Management Tests

```typescript
// __tests__/unit/models/group.test.ts

describe('Group Model', () => {
  describe('creation', () => {
    it('should create group with members', async () => {
      const group = {
        name: 'Test Group',
        userId: 'user123',
        members: ['user123', 'user456']
      };
      const savedGroup = await createGroup(group);
      expect(savedGroup.id).toBeDefined();
      expect(savedGroup.members).toHaveLength(2);
    });
  });

  describe('membership', () => {
    it('should handle member addition', async () => {
      const group = await createGroup({
        name: 'Test Group',
        userId: 'user123',
        members: ['user123']
      });
      
      await addMemberToGroup(group.id, 'user789');
      const updatedGroup = await getGroup(group.id);
      expect(updatedGroup.members).toContain('user789');
    });
  });
});
```

## 4. Integration Tests

### 4.1 API Integration Tests

```typescript
// __tests__/integration/api/messages.test.ts

describe('Message API Integration', () => {
  describe('POST /api/groups/:groupId/messages', () => {
    it('should create and broadcast message', async () => {
      const token = await loginTestUser();
      const group = await createTestGroup();
      
      const response = await request(app)
        .post(`/api/groups/${group.id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Test message'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.message).toBeDefined();
      
      // Verify WebSocket broadcast
      expect(mockWebSocket.broadcast).toHaveBeenCalledWith(
        group.id,
        expect.objectContaining({
          type: 'new_message',
          payload: expect.any(Object)
        })
      );
    });
  });
});
```

### 4.2 WebSocket Integration Tests

```typescript
// __tests__/integration/websocket/connection.test.ts

describe('WebSocket Integration', () => {
  describe('message flow', () => {
    it('should handle complete message flow', async () => {
      // Setup test users and connections
      const [sender, receiver] = await setupTestUsers();
      const group = await createTestGroup([sender.id, receiver.id]);
      
      // Connect both users
      const senderWs = await connectWebSocket(sender.token);
      const receiverWs = await connectWebSocket(receiver.token);
      
      // Send message
      await senderWs.send({
        type: 'message',
        groupId: group.id,
        content: 'Test message'
      });
      
      // Verify receiver gets message
      await expect(
        new Promise(resolve => {
          receiverWs.on('message', resolve);
        })
      ).resolves.toMatchObject({
        type: 'new_message',
        payload: {
          content: 'Test message',
          userId: sender.id
        }
      });
    });
  });
});
```

## 5. Edge Cases and Error Handling

### 5.1 Error Scenarios

```typescript
// __tests__/unit/services/error-handling.test.ts

describe('Error Handling', () => {
  describe('network issues', () => {
    it('should queue messages during connection loss', async () => {
      const connection = await websocketService.connect(token);
      await simulateNetworkFailure();
      
      const message = await sendMessage('offline message');
      expect(message.status).toBe('queued');
      
      await restoreNetwork();
      await waitForSync();
      
      const syncedMessage = await getMessage(message.id);
      expect(syncedMessage.status).toBe('sent');
    });
  });

  describe('rate limiting', () => {
    it('should handle message rate limiting', async () => {
      const messages = Array(10).fill('test message');
      const results = await Promise.all(
        messages.map(msg => sendMessage(msg))
      );
      
      expect(results.some(r => r.status === 'rate_limited')).toBe(true);
    });
  });
});
```

## 6. Acceptance Criteria

### User Authentication
- ✓ Users can register with email and password
- ✓ Users can log in and receive JWT token
- ✓ Invalid credentials are properly handled
- ✓ Sessions are validated and managed

### Messaging
- ✓ Messages are delivered in real-time
- ✓ Offline messages are queued and synced
- ✓ Message delivery status is tracked
- ✓ Rate limiting prevents spam

### Groups
- ✓ Users can create and join groups
- ✓ Group membership is properly managed
- ✓ Group messages are broadcast to all members
- ✓ Member presence is tracked

### Real-time Features
- ✓ WebSocket connections are stable
- ✓ Reconnection is handled gracefully
- ✓ Message ordering is maintained
- ✓ User presence is accurately reflected

## 7. Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=user
npm test -- --testPathPattern=message
npm test -- --testPathPattern=integration

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 8. CI/CD Integration

Tests should be integrated into the CI/CD pipeline:

1. Unit tests run on every commit
2. Integration tests run on PR creation
3. E2E tests run before deployment
4. Coverage reports generated and tracked

## 9. Best Practices

1. Follow AAA pattern (Arrange-Act-Assert)
2. Use meaningful test descriptions
3. Maintain test isolation
4. Clean up test data
5. Mock external services
6. Use test factories for common setup
7. Keep tests focused and atomic
8. Maintain test coverage above 80%

Remember to run tests frequently and maintain them as the codebase evolves. 