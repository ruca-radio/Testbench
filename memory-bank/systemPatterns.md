# System Patterns

This file documents recurring patterns and standards used in the project.
It is optional, but recommended to be updated as the project evolves.

## Coding Patterns

### Agent Communication Pattern

**2025-05-29 23:53:34** - Multi-Agent Messaging Standard

```typescript
// Standard agent message structure
interface AgentMessage {
  id: string;
  conversationId: string;
  fromAgent: string;
  toAgent?: string; // null for broadcast
  messageType: 'task' | 'question' | 'result' | 'clarification' | 'status';
  content: {
    text: string;
    data?: any;
    taskId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  parentMessageId?: string;
  timestamp: string;
}
```

### Provider Enhancement Pattern

**2025-05-29 23:53:34** - Extending Existing Providers

```javascript
// Pattern for adding agent capabilities to existing providers
class EnhancedProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.agentContext = {};
    this.messageQueue = [];
  }

  async sendWithAgentContext(message, agentId, conversationId) {
    // Inject agent context into provider request
    const enhancedMessage = this.addAgentContext(message, agentId);
    return await this.send(enhancedMessage);
  }

  addAgentContext(message, agentId) {
    // Standard pattern for agent context injection
  }
}
```

### Database Migration Pattern

**2025-05-29 23:53:34** - Schema Extension Strategy

```javascript
// Pattern for extending existing database schema
const migrationPattern = {
  preserveExisting: true,
  addCollaborationTables: [
    'agent_conversations',
    'agent_messages',
    'agent_tasks',
    'workspace_context'
  ],
  addIndexes: [
    'idx_agent_messages_conversation',
    'idx_agent_tasks_assignee',
    'idx_workspace_context_type'
  ]
};
```

### Error Handling Pattern

**2025-05-29 23:53:34** - Multi-Agent Error Recovery

```javascript
// Pattern for handling agent communication failures
class AgentErrorHandler {
  async handleAgentError(error, agentId, conversationId) {
    switch(error.type) {
      case 'TIMEOUT':
        await this.retryWithBackoff(agentId);
        break;
      case 'UNAVAILABLE':
        await this.reassignToAlternativeAgent(conversationId);
        break;
      case 'CONFLICT':
        await this.resolveAgentConflict(conversationId);
        break;
    }
  }
}
```

## Architectural Patterns

### Message Broker Pattern

**2025-05-29 23:53:34** - Redis-Based Agent Communication

```javascript
// Centralized message routing for agent communication
class MessageBroker {
  constructor(redisClient) {
    this.redis = redisClient;
    this.subscribers = new Map();
  }

  async publishAgentMessage(message) {
    // Route message based on agent availability and priority
    const route = await this.determineRoute(message);
    await this.redis.publish(route.channel, JSON.stringify(message));
  }

  async subscribeAgent(agentId, callback) {
    // Subscribe agent to its dedicated channel
    await this.redis.subscribe(`agent:${agentId}`, callback);
  }
}
```

### Turn Management Pattern

**2025-05-29 23:53:34** - Orchestrated Agent Coordination

```javascript
// Manages speaking turns in multi-agent conversations
class TurnManager {
  constructor() {
    this.conversationStates = new Map();
  }

  async requestTurn(agentId, conversationId, priority = 'medium') {
    const state = this.conversationStates.get(conversationId);
    if (state.currentSpeaker === null || priority === 'urgent') {
      return this.grantTurn(agentId, conversationId);
    }
    return this.queueTurn(agentId, conversationId, priority);
  }
}
```

### Workspace Isolation Pattern

**2025-05-29 23:53:34** - Multi-Tenant Agent Workspaces

```javascript
// Ensures agent interactions are properly isolated by workspace
class WorkspaceManager {
  async createAgentWorkspace(workspaceId, participants) {
    const context = new WorkspaceContext(workspaceId);
    const messageBroker = new WorkspaceMessageBroker(workspaceId);

    return {
      context,
      messageBroker,
      participants: this.validateParticipants(participants)
    };
  }

  async isolateWorkspaceData(workspaceId) {
    // Ensure agents can only access their workspace data
  }
}
```

### Provider Load Balancing Pattern

**2025-05-29 23:53:34** - Multi-Agent Provider Distribution

```javascript
// Distributes agent requests across available providers
class ProviderLoadBalancer {
  constructor(providers) {
    this.providers = providers;
    this.agentProviderMap = new Map();
    this.loadMetrics = new Map();
  }

  async assignProviderToAgent(agentId, requirements) {
    const availableProviders = this.filterByRequirements(requirements);
    const optimalProvider = this.selectByLoadAndLatency(availableProviders);
    this.agentProviderMap.set(agentId, optimalProvider);
    return optimalProvider;
  }
}
```

## Testing Patterns

### Multi-Agent Scenario Testing

**2025-05-29 23:53:34** - Collaboration Workflow Validation

```javascript
// Pattern for testing multi-agent interactions
describe('Multi-Agent Collaboration', () => {
  beforeEach(async () => {
    this.workspace = await createTestWorkspace();
    this.agents = await createTestAgents(['orchestrator', 'coder', 'reviewer']);
  });

  it('should complete code development workflow', async () => {
    const task = 'Build REST API for user management';

    // Orchestrator receives task
    await this.agents.orchestrator.receiveTask(task);

    // Orchestrator delegates to coder
    const delegation = await this.agents.orchestrator.delegateTask(
      task, this.agents.coder.id
    );

    // Coder completes task
    const result = await this.agents.coder.completeTask(delegation);

    // Reviewer validates result
    const review = await this.agents.reviewer.reviewResult(result);

    expect(review.status).toBe('approved');
  });
});
```

### Message Latency Testing

**2025-05-29 23:53:34** - Performance Validation

```javascript
// Pattern for testing <100ms agent message latency requirement
describe('Agent Message Performance', () => {
  it('should deliver messages under 100ms', async () => {
    const startTime = Date.now();

    await agent1.sendMessage('Hello agent2', agent2.id);
    const message = await agent2.waitForMessage();

    const latency = Date.now() - startTime;
    expect(latency).toBeLessThan(100);
  });
});
```

### Concurrent Agent Testing

**2025-05-29 23:53:34** - Scalability Validation

```javascript
// Pattern for testing 10+ simultaneous agents requirement
describe('Agent Scalability', () => {
  it('should support 10+ simultaneous agents', async () => {
    const agents = await createMultipleAgents(15);
    const promises = agents.map(agent => agent.startCollaboration());

    const results = await Promise.all(promises);

    expect(results.every(r => r.success)).toBe(true);
    expect(this.getActiveAgentCount()).toBeGreaterThanOrEqual(10);
  });
});
```

### Error Recovery Testing

**2025-05-29 23:53:34** - Reliability Validation

```javascript
// Pattern for testing 99.9% message delivery reliability
describe('Message Reliability', () => {
  it('should achieve 99.9% delivery rate under load', async () => {
    const messageCount = 1000;
    const messages = generateTestMessages(messageCount);

    const deliveryResults = await Promise.allSettled(
      messages.map(msg => sendMessageWithRetry(msg))
    );

    const successRate = deliveryResults
      .filter(r => r.status === 'fulfilled').length / messageCount;

    expect(successRate).toBeGreaterThan(0.999);
  });
});
```

---
*2025-05-29 23:53:34 - System patterns established for multi-agent architecture, communication protocols, and testing strategies*

## Phase 1 Implementation Patterns

**2025-05-30 01:11:06** - Patterns Established During Foundation Cleanup & Enhancement

### Agent Context Injection Pattern

**Implementation**: Used across all 5 providers (OpenAI, Anthropic, Ollama, OpenRouter, MCP)

```javascript
// Uniform agent context structure implemented in Phase 1.2
const agentContext = {
  agentId: 'agent_12345',
  conversationId: 'conv_67890',
  role: 'orchestrator' | 'specialist' | 'reviewer',
  priority: 1-5 // 1=low, 5=urgent
};

// Provider enhancement pattern used across all providers
async function enhanceWithAgentContext(message, agentContext) {
  if (!agentContext) {
    return message; // Backward compatibility
  }

  const systemMessage = `Agent Context: You are ${agentContext.role} agent ${agentContext.agentId} in conversation ${agentContext.conversationId} with priority ${agentContext.priority}. Collaborate accordingly.`;

  return {
    ...message,
    messages: [
      { role: 'system', content: systemMessage },
      ...message.messages
    ]
  };
}
```

### Provider Load Balancing Pattern

**Implementation**: Load balancing and failover mechanisms implemented in Phase 1.2

```javascript
// Pattern implemented across all providers for multi-agent scenarios
class ProviderManager {
  constructor() {
    this.instances = new Map();
    this.loadMetrics = new Map();
    this.agentAssignments = new Map();
  }

  async getProviderForAgent(agentId, agentContext) {
    const assignment = this.agentAssignments.get(agentId);
    if (assignment && this.isProviderHealthy(assignment.instanceId)) {
      return assignment.provider;
    }

    // Load balance based on current metrics
    const optimalProvider = this.selectOptimalProvider(agentContext);
    this.agentAssignments.set(agentId, {
      provider: optimalProvider,
      instanceId: optimalProvider.instanceId,
      assignedAt: Date.now()
    });

    return optimalProvider;
  }

  async handleProviderFailover(agentId, error, agentContext) {
    if (agentContext?.priority >= 4) { // High priority agents get failover
      const fallbackProvider = await this.getFallbackProvider(agentContext);
      if (fallbackProvider) {
        this.agentAssignments.set(agentId, {
          provider: fallbackProvider,
          instanceId: fallbackProvider.instanceId,
          assignedAt: Date.now(),
          failoverFrom: error.provider
        });
        return fallbackProvider;
      }
    }
    throw error;
  }
}
```

### WebSocket Foundation Pattern

**Implementation**: Socket.io integration in [`index.js`](index.js) for real-time agent communication

```javascript
// WebSocket infrastructure pattern established in Phase 1.1
const { Server } = require('socket.io');
const http = require('http');

// Server setup with HTTP + WebSocket support
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Agent connection management pattern
const connectedAgents = new Map();

io.on('connection', (socket) => {
  socket.on('agent:register', (agentData) => {
    connectedAgents.set(socket.id, {
      agentId: agentData.agentId,
      socketId: socket.id,
      connectedAt: new Date(),
      status: 'online'
    });
    socket.join(`agent:${agentData.agentId}`);
  });

  socket.on('agent:message', (messageData) => {
    // Foundation for Phase 2 message routing
    io.to(`agent:${messageData.toAgentId}`).emit('message', messageData);
  });

  socket.on('disconnect', () => {
    connectedAgents.delete(socket.id);
  });
});
```

### Zero Breaking Changes Pattern

**Implementation**: Architectural approach used throughout Phase 1

```javascript
// Pattern for enhancing existing functionality without breaking compatibility
function enhanceExistingFunction(originalFunction, enhancement) {
  return function(...args) {
    // Check if enhancement parameters are provided
    const hasEnhancementData = args.some(arg =>
      arg && typeof arg === 'object' && arg.agentContext
    );

    if (hasEnhancementData) {
      // Apply enhancement
      return enhancement.apply(this, args);
    } else {
      // Use original behavior
      return originalFunction.apply(this, args);
    }
  };
}

// Example: Provider enhancement maintaining backward compatibility
const originalSendMessage = provider.sendMessage;
provider.sendMessage = enhanceExistingFunction(
  originalSendMessage,
  async function(message, agentContext) {
    const enhancedMessage = await this.enhanceWithAgentContext(message, agentContext);
    return originalSendMessage.call(this, enhancedMessage);
  }
);
```

### Database Schema Verification Pattern

**Implementation**: Used in Phase 1.3 for safe database migration

```javascript
// Pattern for validating existing schema against requirements
class SchemaVerifier {
  async verifyCollaborationSchema() {
    const requiredTables = [
      'agent_conversations',
      'agent_messages',
      'agent_tasks',
      'workspace_context'
    ];

    const requiredIndexes = [
      'idx_agent_messages_conversation_id',
      'idx_agent_messages_from_agent',
      'idx_agent_tasks_assignee_id',
      'idx_workspace_context_workspace_id'
    ];

    // Verify tables exist and match specification
    for (const table of requiredTables) {
      const exists = await this.tableExists(table);
      if (!exists) {
        throw new Error(`Required table ${table} not found`);
      }

      const schema = await this.getTableSchema(table);
      await this.validateTableSchema(table, schema);
    }

    // Verify indexes for performance
    for (const index of requiredIndexes) {
      const exists = await this.indexExists(index);
      if (!exists) {
        throw new Error(`Required index ${index} not found`);
      }
    }

    // Test functionality with real data
    await this.testCollaborationFunctions();
  }
}
```

### Performance Monitoring Pattern

**Implementation**: Response time tracking and metrics collection added in Phase 1.1

```javascript
// Pattern for tracking performance metrics across the platform
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    // Log performance metrics
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`);

    // Collect metrics for monitoring
    if (global.performanceMetrics) {
      global.performanceMetrics.push({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        timestamp: new Date()
      });
    }
  });

  next();
};
```

---
