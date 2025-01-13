# ChatGenius Refactoring Guide

This guide outlines the refactoring guidelines and best practices for maintaining and improving the ChatGenius codebase.

## 1. Code Smell Detection

### 1.1 Common Anti-patterns

| Anti-pattern | Detection Method | Threshold | Tool |
|--------------|-----------------|-----------|------|
| Large Components | Line count | > 300 lines | ESLint |
| Prop Drilling | Depth of props | > 3 levels | Custom ESLint rule |
| Duplicate Logic | Similarity index | > 80% match | SonarQube |
| Complex Conditions | Cognitive complexity | > 15 | ESLint |

**ESLint Rule Example:**
```typescript
// .eslintrc.js
module.exports = {
  rules: {
    'max-lines-per-function': ['error', { max: 300 }],
    'max-depth': ['error', { max: 3 }],
    'complexity': ['error', { max: 15 }],
    'custom/no-prop-drilling': ['warn', { maxDepth: 3 }]
  }
}
```

### 1.2 Automated Detection Setup

```typescript
// scripts/code-quality.ts
interface CodeQualityMetrics {
  complexity: number;
  duplications: number;
  coverage: number;
  techDebt: {
    hours: number;
    hotspots: string[];
  };
}

async function analyzeCodeQuality(): Promise<CodeQualityMetrics> {
  const analysis = await sonarqube.analyze({
    projectKey: 'chatgenius',
    sources: './src',
    tests: './**/*.test.ts'
  });

  return {
    complexity: analysis.complexity.median,
    duplications: analysis.duplications.percentage,
    coverage: analysis.coverage.percentage,
    techDebt: {
      hours: analysis.techDebt.hours,
      hotspots: analysis.techDebt.hotspots
    }
  };
}
```

## 2. Refactoring Patterns

### 2.1 Extract Hook Pattern

**Problem:** Logic duplication in multiple components handling WebSocket connections.

**Before:**
```typescript
function ChatRoom() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };
    setSocket(ws);
    return () => ws.close();
  }, []);

  // Component logic...
}
```

**After:**
```typescript
// hooks/useWebSocket.ts
interface WebSocketHook {
  socket: WebSocket | null;
  messages: Message[];
  sendMessage: (message: string) => void;
  connectionStatus: ConnectionStatus;
}

function useWebSocket(url: string): WebSocketHook {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('disconnected');
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    setSocket(ws);
    return () => ws.close();
  }, [url]);

  const sendMessage = useCallback((message: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ content: message }));
    }
  }, [socket]);

  return {
    socket,
    messages,
    sendMessage,
    connectionStatus: status
  };
}

// Component usage
function ChatRoom() {
  const { messages, sendMessage, connectionStatus } = useWebSocket(WS_URL);
  // Simplified component logic...
}
```

**Test Coverage Requirements:**
```typescript
describe('useWebSocket', () => {
  it('should establish connection', async () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected');
    });
  });

  it('should handle messages', async () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    const mockMessage = { content: 'test' };
    
    // Simulate message
    mockWebSocket.emit('message', JSON.stringify(mockMessage));
    
    await waitFor(() => {
      expect(result.current.messages).toContainEqual(mockMessage);
    });
  });

  it('should handle disconnection', async () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    
    // Simulate disconnect
    mockWebSocket.close();
    
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('disconnected');
    });
  });
});
```

### 2.2 API Layer Consolidation

**Problem:** Scattered API calls with inconsistent error handling.

**Before:**
```typescript
// Various components
async function sendMessage(content: string) {
  const response = await fetch('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ content })
  });
  return response.json();
}

async function getMessages() {
  const response = await fetch('/api/messages');
  return response.json();
}
```

**After:**
```typescript
// lib/api/messages.ts
interface MessageAPI {
  send(content: string): Promise<Message>;
  list(options: ListOptions): Promise<Message[]>;
  delete(id: string): Promise<void>;
  update(id: string, content: string): Promise<Message>;
}

class MessageService implements MessageAPI {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(`/api/messages${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        throw new APIError(response.statusText, response.status);
      }

      return response.json();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async send(content: string): Promise<Message> {
    return this.request<Message>('', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async list(options: ListOptions): Promise<Message[]> {
    const params = new URLSearchParams(options as any);
    return this.request<Message[]>(`?${params}`);
  }

  private handleError(error: unknown): void {
    // Centralized error handling
    if (error instanceof APIError) {
      switch (error.status) {
        case 401:
          authStore.refreshToken();
          break;
        case 429:
          this.handleRateLimit(error);
          break;
        default:
          logger.error('API Error', { error });
      }
    }
  }
}
```

## 3. Technical Debt Categories

### 3.1 Architecture Debt

**Identification Criteria:**

| Issue | Detection Method | Priority | Impact |
|-------|-----------------|-----------|--------|
| Monolithic Components | Size metrics | High | Performance, Maintainability |
| Tight Coupling | Dependency graph | High | Flexibility, Testing |
| Inconsistent Patterns | Pattern analysis | Medium | Maintainability |

**Resolution Strategy:**
```typescript
// Example: Breaking down a monolithic component

// Before: Large ChatRoom component
function ChatRoom() {
  // 500+ lines of mixed concerns
}

// After: Modular components
function ChatRoom() {
  return (
    <ChatProvider>
      <ChatHeader />
      <MessageList />
      <UserList />
      <MessageInput />
    </ChatProvider>
  );
}

// Separate concerns into context
function ChatProvider({ children }: PropsWithChildren) {
  const messages = useMessages();
  const users = useUsers();
  const typing = useTypingIndicator();

  return (
    <ChatContext.Provider value={{ messages, users, typing }}>
      {children}
    </ChatContext.Provider>
  );
}
```

### 3.2 Test Debt

**Priority Assessment Matrix:**

| Test Type | Coverage Target | Current | Priority |
|-----------|----------------|----------|-----------|
| Unit | 90% | 75% | High |
| Integration | 80% | 60% | High |
| E2E | 60% | 40% | Medium |

**Resolution Strategy:**
```typescript
// Example: Adding missing integration tests

describe('Chat Integration', () => {
  it('should handle complete message flow', async () => {
    // Setup
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const group = await createTestGroup([sender.id, receiver.id]);

    // Action
    const message = await sendMessage(group.id, 'test');

    // Assertions
    await assertMessageDelivered(message.id);
    await assertNotificationSent(receiver.id);
    await assertMessageStored(message.id);
  });
});
```

## 4. Refactoring Workflow

### 4.1 Pre-refactoring Checklist

```typescript
// scripts/refactor-check.ts
interface RefactorCheck {
  coverage: boolean;
  tests: boolean;
  complexity: boolean;
  dependencies: boolean;
}

async function preRefactorCheck(path: string): Promise<RefactorCheck> {
  const coverage = await checkTestCoverage(path);
  const tests = await runTests(path);
  const complexity = await analyzeComplexity(path);
  const dependencies = await checkDependencies(path);

  return {
    coverage: coverage.percentage > 80,
    tests: tests.passing,
    complexity: complexity.score < 15,
    dependencies: dependencies.valid
  };
}
```

### 4.2 Feature Flag Implementation

```typescript
// lib/features.ts
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
}

class FeatureManager {
  private flags: Map<string, FeatureFlag>;

  isEnabled(flag: string, userId: string): boolean {
    const feature = this.flags.get(flag);
    if (!feature) return false;

    if (!feature.enabled) return false;

    if (feature.rolloutPercentage < 100) {
      return this.isUserInRollout(userId, feature.rolloutPercentage);
    }

    return true;
  }

  private isUserInRollout(userId: string, percentage: number): boolean {
    const hash = this.hashUserId(userId);
    return (hash % 100) < percentage;
  }
}
```

## 5. Specific Scenarios

### 5.1 Database Schema Refactoring

**Step-by-step Process:**

1. **Version Current Schema:**
```typescript
// migrations/20240215_message_reactions.ts
import { Migration } from '../types';

export const up: Migration = async (db) => {
  await db.schema.alterTable('messages', (table) => {
    table.jsonb('reactions').defaultTo('{}');
  });
};

export const down: Migration = async (db) => {
  await db.schema.alterTable('messages', (table) => {
    table.dropColumn('reactions');
  });
};
```

2. **Data Migration:**
```typescript
// migrations/data/20240215_populate_reactions.ts
export async function migrateData(db: Database) {
  const messages = await db.select().from('messages');
  
  for (const message of messages) {
    await db('messages')
      .where('id', message.id)
      .update({
        reactions: JSON.stringify({
          likes: message.legacy_likes || 0,
          hearts: message.legacy_hearts || 0
        })
      });
  }
}
```

3. **Verification:**
```typescript
describe('Message Reactions Migration', () => {
  it('should migrate all messages', async () => {
    await migrateData(testDb);
    
    const messages = await testDb.select().from('messages');
    for (const message of messages) {
      expect(message.reactions).toBeDefined();
      expect(JSON.parse(message.reactions)).toHaveProperty('likes');
    }
  });
});
```

### 5.2 State Management Optimization

**Before:**
```typescript
function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  
  // Multiple useEffects managing different states
}
```

**After:**
```typescript
// stores/chat.ts
interface ChatState {
  messages: Message[];
  users: User[];
  typing: string[];
  online: string[];
}

interface ChatStore {
  state: ChatState;
  addMessage: (message: Message) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, isOnline: boolean) => void;
}

const useChatStore = create<ChatStore>((set) => ({
  state: {
    messages: [],
    users: [],
    typing: [],
    online: []
  },
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setTyping: (userId, isTyping) => set((state) => ({
    typing: isTyping
      ? [...state.typing, userId]
      : state.typing.filter(id => id !== userId)
  })),
  
  setOnline: (userId, isOnline) => set((state) => ({
    online: isOnline
      ? [...state.online, userId]
      : state.online.filter(id => id !== userId)
  }))
}));

// Component usage
function ChatRoom() {
  const { messages, typing, online } = useChatStore(
    (state) => state.state
  );
  
  // Simplified component logic
}
```

## 6. Tooling Setup

### 6.1 Static Analysis Configuration

```typescript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint', 'testing-library', 'jest-dom'],
  rules: {
    'max-lines': ['error', { max: 300 }],
    'max-depth': ['error', { max: 3 }],
    'complexity': ['error', { max: 15 }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'react-hooks/exhaustive-deps': 'error'
  }
};

// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 6.2 Performance Profiling

```typescript
// lib/performance.ts
interface PerformanceMetrics {
  componentRenders: Map<string, number>;
  apiLatency: Map<string, number[]>;
  memoryUsage: number[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    componentRenders: new Map(),
    apiLatency: new Map(),
    memoryUsage: []
  };

  trackRender(componentName: string): void {
    const current = this.metrics.componentRenders.get(componentName) || 0;
    this.metrics.componentRenders.set(componentName, current + 1);
  }

  trackApiCall(endpoint: string, duration: number): void {
    const latencies = this.metrics.apiLatency.get(endpoint) || [];
    this.metrics.apiLatency.set(endpoint, [...latencies, duration]);
  }

  generateReport(): PerformanceReport {
    return {
      hotComponents: this.getHotComponents(),
      slowEndpoints: this.getSlowEndpoints(),
      memoryTrend: this.getMemoryTrend()
    };
  }
}
```

## 7. Best Practices

### 7.1 Incremental Refactoring

```typescript
// Example: Incrementally migrating to new API pattern

// Step 1: Create new API client
const newApiClient = createApiClient();

// Step 2: Add feature flag
const useNewApi = featureManager.isEnabled('new-api');

// Step 3: Implement both paths
async function fetchData(id: string) {
  if (useNewApi) {
    try {
      return await newApiClient.fetch(id);
    } catch (error) {
      // Log error and fallback
      logger.error('New API failed', { error });
      return legacyFetch(id);
    }
  }
  return legacyFetch(id);
}

// Step 4: Monitor and gradually increase rollout
featureManager.setRolloutPercentage('new-api', 10);
```

### 7.2 Code Quality Gates

```typescript
// scripts/quality-gate.ts
interface QualityGate {
  coverage: number;
  complexity: number;
  duplications: number;
  techDebt: number;
}

async function checkQualityGate(
  analysis: CodeAnalysis
): Promise<boolean> {
  const gates: QualityGate = {
    coverage: 80,
    complexity: 15,
    duplications: 3,
    techDebt: 20
  };

  const results = {
    coverage: analysis.coverage >= gates.coverage,
    complexity: analysis.complexity <= gates.complexity,
    duplications: analysis.duplications <= gates.duplications,
    techDebt: analysis.techDebt <= gates.techDebt
  };

  return Object.values(results).every(Boolean);
}
```

## 8. Emergency Procedures

### 8.1 Rollback Process

```typescript
// scripts/rollback.ts
interface RollbackPlan {
  version: string;
  changes: string[];
  dependencies: string[];
  dataChanges: boolean;
}

async function executeRollback(plan: RollbackPlan): Promise<void> {
  // 1. Verify current state
  await verifyCurrentState();

  // 2. Take snapshot
  await createSnapshot();

  // 3. Revert code changes
  await revertGitTag(plan.version);

  // 4. Revert database if needed
  if (plan.dataChanges) {
    await revertDatabaseMigration(plan.version);
  }

  // 5. Verify system health
  await verifySystemHealth();
}
```

### 8.2 Monitoring During Refactoring

```typescript
// lib/monitoring.ts
interface RefactorMetrics {
  errorRate: number;
  performance: PerformanceMetrics;
  userImpact: UserImpactMetrics;
}

class RefactorMonitor {
  private baseline: RefactorMetrics;
  private current: RefactorMetrics;

  async compareWithBaseline(): Promise<ComparisonResult> {
    const comparison = {
      errorRate: this.compareErrorRates(),
      performance: this.comparePerformance(),
      userImpact: this.compareUserImpact()
    };

    if (this.shouldRollback(comparison)) {
      await this.triggerRollback();
    }

    return comparison;
  }

  private shouldRollback(comparison: ComparisonResult): boolean {
    return (
      comparison.errorRate > 2 || // 2x increase in errors
      comparison.performance.latency > 1.5 || // 50% slower
      comparison.userImpact.negative > 0.1 // 10% negative impact
    );
  }
}
```

Remember to:
1. Always measure before and after refactoring
2. Use feature flags for gradual rollout
3. Monitor error rates and performance metrics
4. Have clear rollback criteria and procedures
5. Document all changes and their impact 

## Message Input
The chat input now uses TipTap for rich text editing. Key features include:
- Rich text formatting (bold, italic, underline)
- List support (bullet and numbered)
- Emoji picker
- File attachments
- Enter to send (configurable)
- Shift+Enter for new lines

The implementation is in `components/chat/input/MessageInputTiptap.tsx`. 