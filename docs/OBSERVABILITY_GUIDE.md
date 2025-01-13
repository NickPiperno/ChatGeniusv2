# ChatGenius Observability Requirements Guide

This guide outlines the observability requirements and test specifications for the ChatGenius real-time chat application.

## 1. Key Performance Indicators (KPIs)

### 1.1 Message Delivery Latency

**Metric Definition:**
```typescript
interface MessageLatencyMetric {
  messageId: string;
  sendTimestamp: number;
  deliveryTimestamp: number;
  latencyMs: number;
}
```

**Thresholds:**
- P95 < 100ms
- P99 < 250ms
- Max < 1000ms

**Test Specifications:**
```typescript
describe('Message Delivery Latency', () => {
  it('should meet P95 latency requirements', async () => {
    const metrics = await collectLatencyMetrics({
      duration: '1h',
      sampleSize: 10000
    });
    
    const p95 = calculatePercentile(metrics.map(m => m.latencyMs), 95);
    expect(p95).toBeLessThan(100);
  });

  it('should alert on sustained high latency', async () => {
    const alert = await simulateHighLatency({
      latency: 200,
      duration: '5m'
    });
    
    expect(alert.triggered).toBe(true);
    expect(alert.severity).toBe('warning');
  });
});
```

### 1.2 WebSocket Connection Stability

**Metric Definition:**
```typescript
interface ConnectionMetric {
  userId: string;
  connectionDuration: number;
  disconnectReason?: string;
  reconnectAttempts: number;
}
```

**Thresholds:**
- Connection Success Rate > 99.9%
- Reconnection Success Rate > 99%
- Mean Time Between Disconnects > 24h

**Test Specifications:**
```typescript
describe('WebSocket Stability', () => {
  it('should maintain connection stability under load', async () => {
    const metrics = await simulateConnectionLoad({
      users: 1000,
      duration: '1h'
    });
    
    expect(metrics.successRate).toBeGreaterThan(0.999);
    expect(metrics.meanTimeBetweenDisconnects).toBeGreaterThan(24 * 60 * 60);
  });
});
```

## 2. Logging Requirements

### 2.1 Structured Logging Pattern

**Base Log Structure:**
```typescript
interface BaseLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  traceId: string;
  spanId: string;
  userId?: string;
  groupId?: string;
  message: string;
  metadata: Record<string, any>;
}
```

**Test Specifications:**
```typescript
describe('Structured Logging', () => {
  it('should generate valid structured logs', () => {
    const logger = createLogger();
    const logEntry = logger.info('Message sent', {
      userId: 'user123',
      messageId: 'msg456'
    });
    
    expect(logEntry).toMatchSchema(baseLogSchema);
    expect(logEntry.traceId).toBeDefined();
    expect(logEntry.timestamp).toMatch(ISO8601_REGEX);
  });

  it('should handle sensitive data redaction', () => {
    const logger = createLogger();
    const logEntry = logger.info('User authenticated', {
      email: 'user@example.com',
      password: 'secret123'
    });
    
    expect(logEntry.metadata.password).toBe('[REDACTED]');
    expect(logEntry.metadata.email).toBe('u***@example.com');
  });
});
```

### 2.2 Log Levels and Sampling

**Log Level Requirements:**
- DEBUG: Detailed debugging information
- INFO: Normal application behavior
- WARN: Potentially harmful situations
- ERROR: Error events that might still allow the application to continue

**Sampling Strategy:**
```typescript
interface SamplingConfig {
  debugSampleRate: number;    // 1% in production
  infoSampleRate: number;     // 10% in production
  warnSampleRate: number;     // 100% always
  errorSampleRate: number;    // 100% always
}

describe('Log Sampling', () => {
  it('should apply correct sampling rates', async () => {
    const logger = createLogger({ environment: 'production' });
    const logs = await generateTestLogs(1000);
    
    const sampledLogs = logger.processBatch(logs);
    const debugCount = sampledLogs.filter(l => l.level === 'debug').length;
    
    expect(debugCount).toBeLessThanOrEqual(10); // 1% of 1000
  });
});
```

## 3. Monitoring Specifications

### 3.1 Health Check Endpoints

**Endpoint Structure:**
```typescript
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
    websocket: ComponentHealth;
  };
  version: string;
  uptime: number;
}

describe('Health Check Endpoints', () => {
  it('should report accurate system health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchSchema(healthCheckSchema);
  });

  it('should detect degraded database performance', async () => {
    await simulateDatabaseLatency(500);
    const response = await request(app).get('/health');
    
    expect(response.body.status).toBe('degraded');
    expect(response.body.components.database.status).toBe('degraded');
  });
});
```

### 3.2 Real-time Metrics Collection

**Core Metrics:**
```typescript
interface CoreMetrics {
  activeConnections: number;
  messageRate: number;
  errorRate: number;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
}

describe('Metrics Collection', () => {
  it('should collect accurate real-time metrics', async () => {
    const metrics = await collectMetrics('1m');
    
    expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
    expect(metrics.messageRate).toBeNumber();
    expect(metrics.responseTime.p95).toBeNumber();
  });

  it('should handle high throughput scenarios', async () => {
    await simulateLoad({
      users: 1000,
      messagesPerSecond: 100,
      duration: '1m'
    });
    
    const metrics = await collectMetrics('1m');
    expect(metrics.messageRate).toBeGreaterThanOrEqual(100);
  });
});
```

## 4. Tracing Requirements

### 4.1 Distributed Tracing Configuration

**Trace Context:**
```typescript
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage: Record<string, string>;
}

describe('Distributed Tracing', () => {
  it('should propagate trace context through the system', async () => {
    const result = await simulateMessageFlow();
    
    expect(result.spans).toContainEqual({
      name: 'process_message',
      parentSpanId: expect.any(String),
      attributes: expect.objectContaining({
        'messaging.system': 'websocket',
        'messaging.operation': 'process'
      })
    });
  });
});
```

### 4.2 Sampling Strategy

```typescript
interface TraceSamplingConfig {
  defaultSampleRate: number;      // 0.1 (10%)
  errorSampleRate: number;        // 1.0 (100%)
  highValuePathRate: number;      // 1.0 (100%)
}

describe('Trace Sampling', () => {
  it('should apply correct sampling rates', async () => {
    const tracer = createTracer({
      defaultSampleRate: 0.1
    });
    
    const traces = await generateTraces(1000);
    const sampledTraces = traces.filter(t => t.sampled);
    
    expect(sampledTraces.length).toBeCloseTo(100, -1); // 10% of 1000
  });

  it('should always sample error paths', async () => {
    const tracer = createTracer();
    const errorTrace = await simulateErrorPath();
    
    expect(errorTrace.sampled).toBe(true);
  });
});
```

## 5. Integration Points

### 5.1 APM Integration Tests

```typescript
describe('APM Integration', () => {
  it('should send metrics to APM system', async () => {
    const apm = createAPMClient();
    await simulateApplicationLoad();
    
    const metrics = await apm.getMetrics({
      timeRange: '5m'
    });
    
    expect(metrics).toContainMetric({
      name: 'message_delivery_latency',
      type: 'histogram'
    });
  });
});
```

### 5.2 Log Aggregation

```typescript
describe('Log Aggregation', () => {
  it('should forward logs to aggregation system', async () => {
    const logger = createLogger();
    const logAggregator = createLogAggregator();
    
    await logger.error('Test error', new Error('Test'));
    const aggregatedLogs = await logAggregator.search({
      query: 'Test error',
      timeRange: '1m'
    });
    
    expect(aggregatedLogs).toHaveLength(1);
    expect(aggregatedLogs[0]).toMatchSchema(aggregatedLogSchema);
  });
});
```

## 6. Testing Framework

### 6.1 Load Testing Specifications

```typescript
describe('Load Testing', () => {
  it('should handle peak load conditions', async () => {
    const results = await k6.run({
      vus: 1000,
      duration: '10m',
      script: 'load-test.js'
    });
    
    expect(results.metrics.http_req_duration.p95).toBeLessThan(200);
    expect(results.metrics.ws_connection_errors).toBe(0);
  });
});
```

### 6.2 Chaos Testing Scenarios

```typescript
describe('Chaos Testing', () => {
  it('should handle network partition', async () => {
    const chaos = createChaosTest();
    
    await chaos.injectFailure({
      type: 'NETWORK_PARTITION',
      duration: '5m'
    });
    
    const metrics = await collectMetrics('5m');
    expect(metrics.messageDeliverySuccess).toBeGreaterThan(0.99);
  });

  it('should handle database degradation', async () => {
    const chaos = createChaosTest();
    
    await chaos.injectFailure({
      type: 'DATABASE_LATENCY',
      latency: '500ms',
      duration: '5m'
    });
    
    const alerts = await getAlerts('5m');
    expect(alerts).toContainAlert({
      type: 'DATABASE_DEGRADED',
      severity: 'warning'
    });
  });
});
```

## 7. Recovery Procedures

### 7.1 Automated Recovery Tests

```typescript
describe('Recovery Procedures', () => {
  it('should auto-recover from connection failures', async () => {
    await simulateConnectionFailure();
    
    const recovery = await monitorRecovery({
      timeout: '1m'
    });
    
    expect(recovery.successful).toBe(true);
    expect(recovery.duration).toBeLessThan(30000); // 30 seconds
  });

  it('should handle message redelivery after outage', async () => {
    const messages = await simulateMessageBacklog();
    await simulateOutage('1m');
    
    const results = await waitForRedelivery(messages);
    expect(results.deliveredCount).toBe(messages.length);
    expect(results.orderPreserved).toBe(true);
  });
});
```

## 8. Documentation Requirements

### 8.1 Metric Documentation

Each metric must include:
- Clear description
- Unit of measurement
- Collection method
- Aggregation rules
- Alert thresholds
- Example queries

### 8.2 Alert Documentation

Each alert must specify:
- Trigger conditions
- Severity levels
- Response procedures
- Escalation paths
- Resolution steps

## 9. Implementation Checklist

- [ ] Set up OpenTelemetry instrumentation
- [ ] Configure structured logging
- [ ] Implement health check endpoints
- [ ] Set up metrics collection
- [ ] Configure APM integration
- [ ] Implement trace sampling
- [ ] Set up log aggregation
- [ ] Configure alerting rules
- [ ] Implement recovery procedures
- [ ] Write automated tests
- [ ] Create runbooks
- [ ] Document all metrics and alerts

## 10. Maintenance Procedures

- Regular review of alert thresholds
- Periodic testing of recovery procedures
- Update of runbooks based on incidents
- Regular chaos testing exercises
- Review and adjustment of sampling rates
- Monitoring of storage and retention policies 