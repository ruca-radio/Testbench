/**
 * Collaboration Engine Test Suite
 * Tests message broker, turn management, and shared context with <100ms latency verification
 */

const collaborationEngine = require('../services/collaborationEngine');
const database = require('../database');

describe('Phase 2.2: Collaboration Engine Tests', () => {
    let testWorkspaceId;
    let testAgentIds;
    let testConversationId;

    beforeAll(async () => {
        // Setup test workspace and agents WITH ACTUAL DATABASE RECORDS
        const uniqueId = Date.now();

        // Create actual workspace in database
        const workspaceResult = database.createWorkspace({
            name: `Test Workspace ${uniqueId}`,
            description: 'Test workspace for collaboration engine tests',
            config: { allowBroadcast: true }
        });
        testWorkspaceId = workspaceResult.lastInsertRowid;

        // Create actual agents in database
        testAgentIds = [];
        for (let i = 1; i <= 3; i++) {
            const agentResult = database.saveAgentEnhanced({
                name: `test-agent-${uniqueId}-${i}`,
                provider: 'openai',
                model: 'gpt-4',
                settings: { temperature: 0.7 },
                role: 'participant',
                capabilities: { messaging: true },
                enabled: true
            });
            testAgentIds.push(agentResult.lastInsertRowid);
        }

        // Add agents to workspace using database function
        for (const agentId of testAgentIds) {
            database.addAgentToWorkspace(testWorkspaceId, agentId, 'participant');
        }
    });

    afterAll(async () => {
        // Cleanup test data - remove database records
        try {
            for (const agentId of testAgentIds) {
                database.removeAgentFromWorkspace(testWorkspaceId, agentId);
                database.deleteAgent(agentId);
            }
            database.deleteWorkspace(testWorkspaceId);
        } catch (error) {
            console.warn('Cleanup error:', error.message);
        }
    });

    describe('Message Broker System', () => {
        test('should publish and route messages with <100ms latency', async () => {
            const startTime = Date.now();

            const message = {
                conversationId: 'test-conv-1',
                fromAgentId: testAgentIds[0],
                toAgentId: testAgentIds[1],
                messageType: 'test',
                content: { text: 'Hello Agent 2' },
                workspaceId: testWorkspaceId,
                priority: 'medium'
            };

            const publishedMessage = await collaborationEngine.messageBroker.publishMessage(message);
            const latency = Date.now() - startTime;

            expect(publishedMessage).toBeDefined();
            expect(publishedMessage.id).toBeDefined();
            expect(publishedMessage.timestamp).toBeDefined();
            expect(latency).toBeLessThan(100); // <100ms requirement
        });

        test('should handle priority message queuing', async () => {
            const normalMessage = {
                conversationId: 'test-conv-2',
                fromAgentId: testAgentIds[0],
                toAgentId: testAgentIds[1],
                messageType: 'normal',
                content: { text: 'Normal priority' },
                workspaceId: testWorkspaceId,
                priority: 'medium'
            };

            const urgentMessage = {
                conversationId: 'test-conv-2',
                fromAgentId: testAgentIds[0],
                toAgentId: testAgentIds[1],
                messageType: 'urgent',
                content: { text: 'Urgent priority' },
                workspaceId: testWorkspaceId,
                priority: 'urgent'
            };

            // Send normal message first
            await collaborationEngine.messageBroker.publishMessage(normalMessage);

            // Send urgent message second
            await collaborationEngine.messageBroker.publishMessage(urgentMessage);

            // Get pending messages - urgent should come first
            const pendingMessages = await collaborationEngine.messageBroker.getPendingMessages(testAgentIds[1]);

            expect(pendingMessages.length).toBeGreaterThan(0);
            expect(pendingMessages[0].priority).toBe('urgent');
        });

        test('should store and replay messages', async () => {
            const testConversationId = 'replay-test-conv';

            const message1 = {
                conversationId: testConversationId,
                fromAgentId: testAgentIds[0],
                toAgentId: testAgentIds[1],
                messageType: 'test',
                content: { text: 'Message 1' },
                workspaceId: testWorkspaceId
            };

            const message2 = {
                conversationId: testConversationId,
                fromAgentId: testAgentIds[1],
                toAgentId: testAgentIds[0],
                messageType: 'test',
                content: { text: 'Message 2' },
                workspaceId: testWorkspaceId
            };

            await collaborationEngine.messageBroker.publishMessage(message1);
            await collaborationEngine.messageBroker.publishMessage(message2);

            const replayedMessages = await collaborationEngine.messageBroker.replayMessages(testConversationId);

            expect(replayedMessages.length).toBe(2);
            expect(replayedMessages[0].content.text).toBe('Message 1');
            expect(replayedMessages[1].content.text).toBe('Message 2');
        });
    });

    describe('Turn Management System', () => {
        test('should grant and release speaking turns', async () => {
            const testConversationId = 'turn-test-conv';

            // Request turn for agent 1
            const turnResult = await collaborationEngine.turnManager.requestTurn(
                testAgentIds[0],
                testConversationId,
                'medium'
            );

            expect(turnResult.status).toBe('granted');
            expect(turnResult.agentId).toBe(testAgentIds[0]);

            // Check turn status
            const turnStatus = collaborationEngine.turnManager.getTurnStatus(testConversationId);
            expect(turnStatus.currentSpeaker).toBe(testAgentIds[0]);

            // Release turn
            const releaseResult = await collaborationEngine.turnManager.releaseTurn(testConversationId);
            expect(releaseResult.status).toBe('released');
            expect(releaseResult.previousSpeaker).toBe(testAgentIds[0]);
        });

        test('should handle turn queuing with priority', async () => {
            const testConversationId = 'priority-turn-test';

            // Agent 1 gets the turn first
            await collaborationEngine.turnManager.grantTurn(testAgentIds[0], testConversationId, 5000);

            // Agent 2 requests normal priority turn
            const normalRequest = await collaborationEngine.turnManager.requestTurn(
                testAgentIds[1],
                testConversationId,
                'medium'
            );
            expect(normalRequest.status).toBe('queued');

            // Agent 3 requests high priority turn
            const highRequest = await collaborationEngine.turnManager.requestTurn(
                testAgentIds[2],
                testConversationId,
                'high'
            );
            expect(highRequest.status).toBe('queued');

            // Check queue order - high priority should be first
            const turnStatus = collaborationEngine.turnManager.getTurnStatus(testConversationId);
            expect(turnStatus.queueLength).toBe(2);
            expect(turnStatus.queue[0].agentId).toBe(testAgentIds[2]); // High priority first
            expect(turnStatus.queue[1].agentId).toBe(testAgentIds[1]); // Normal priority second

            // Release turn and verify high priority agent gets it
            await collaborationEngine.turnManager.releaseTurn(testConversationId);

            const finalStatus = collaborationEngine.turnManager.getTurnStatus(testConversationId);
            expect(finalStatus.currentSpeaker).toBe(testAgentIds[2]);
        });

        test('should handle urgent priority override', async () => {
            const testConversationId = 'urgent-override-test';

            // Agent 1 is currently speaking
            await collaborationEngine.turnManager.grantTurn(testAgentIds[0], testConversationId, 30000);

            // Agent 2 requests urgent turn - should get immediate access
            const urgentRequest = await collaborationEngine.turnManager.requestTurn(
                testAgentIds[1],
                testConversationId,
                'urgent'
            );

            expect(urgentRequest.status).toBe('granted');
            expect(urgentRequest.agentId).toBe(testAgentIds[1]);

            const turnStatus = collaborationEngine.turnManager.getTurnStatus(testConversationId);
            expect(turnStatus.currentSpeaker).toBe(testAgentIds[1]);
        });
    });

    describe('Workspace Manager', () => {
        test('should create isolated workspaces', async () => {
            const isolatedWorkspaceId = 'isolated-test-workspace';

            const workspace = await collaborationEngine.workspaceManager.createWorkspace(
                isolatedWorkspaceId,
                {
                    name: 'Isolated Test',
                    permissions: { allowContextSharing: true }
                }
            );

            expect(workspace.id).toBe(isolatedWorkspaceId);
            expect(workspace.isolation).toBeDefined();
            expect(workspace.isolation.messageNamespace).toBe(`ws:${isolatedWorkspaceId}`);
            expect(workspace.isolation.contextNamespace).toBe(`ctx:${isolatedWorkspaceId}`);
        });

        test('should enforce workspace access validation', async () => {
            const privateWorkspaceId = 'private-workspace';
            const unauthorizedAgentId = 'unauthorized-agent';

            await collaborationEngine.workspaceManager.createWorkspace(privateWorkspaceId);

            // Should throw error for unauthorized access
            expect(() => {
                collaborationEngine.workspaceManager.validateAccess(
                    unauthorizedAgentId,
                    privateWorkspaceId
                );
            }).toThrow();
        });

        test('should track agent-workspace relationships', async () => {
            const relationshipWorkspaceId = 'relationship-test-workspace';
            const relationshipAgentId = 'relationship-agent';

            await collaborationEngine.workspaceManager.createWorkspace(relationshipWorkspaceId);
            await collaborationEngine.workspaceManager.addAgentToWorkspace(
                relationshipWorkspaceId,
                relationshipAgentId,
                'participant'
            );

            const workspaceAgents = collaborationEngine.workspaceManager.getWorkspaceAgents(relationshipWorkspaceId);
            const agentWorkspaces = collaborationEngine.workspaceManager.getAgentWorkspaces(relationshipAgentId);

            expect(workspaceAgents).toContain(relationshipAgentId);
            expect(agentWorkspaces).toContain(relationshipWorkspaceId);
        });
    });

    describe('Context Manager', () => {
        test('should set and get shared context with versioning', async () => {
            const contextWorkspaceId = 'context-test-workspace';
            const contextAgentId = 'context-agent';

            await collaborationEngine.workspaceManager.createWorkspace(contextWorkspaceId);
            await collaborationEngine.workspaceManager.addAgentToWorkspace(
                contextWorkspaceId,
                contextAgentId,
                'participant'
            );

            // Set context
            const contextData = await collaborationEngine.contextManager.setContext(
                contextWorkspaceId,
                'project',
                'status',
                'in-progress',
                contextAgentId
            );

            expect(contextData.version).toBe(1);
            expect(contextData.value).toBe('in-progress');
            expect(contextData.agentId).toBe(contextAgentId);

            // Get context
            const retrievedContext = await collaborationEngine.contextManager.getContext(
                contextWorkspaceId,
                'project',
                'status'
            );

            expect(retrievedContext.length).toBe(1);
            expect(retrievedContext[0].value).toBe('in-progress');
            expect(retrievedContext[0].version).toBe(1);
        });

        test('should handle context version conflicts', async () => {
            const conflictWorkspaceId = 'conflict-test-workspace';
            const conflictAgentId = 'conflict-agent';

            await collaborationEngine.workspaceManager.createWorkspace(conflictWorkspaceId);
            await collaborationEngine.workspaceManager.addAgentToWorkspace(
                conflictWorkspaceId,
                conflictAgentId,
                'participant'
            );

            // Set initial context (version 1)
            await collaborationEngine.contextManager.setContext(
                conflictWorkspaceId,
                'settings',
                'theme',
                'dark',
                conflictAgentId
            );

            // Try to update with old version - should fail
            await expect(
                collaborationEngine.contextManager.setContext(
                    conflictWorkspaceId,
                    'settings',
                    'theme',
                    'light',
                    conflictAgentId,
                    0 // Old version
                )
            ).rejects.toThrow('Version conflict');
        });

        test('should prevent concurrent context modifications', async () => {
            const lockWorkspaceId = 'lock-test-workspace';
            const lockAgentId = 'lock-agent';

            await collaborationEngine.workspaceManager.createWorkspace(lockWorkspaceId);
            await collaborationEngine.workspaceManager.addAgentToWorkspace(
                lockWorkspaceId,
                lockAgentId,
                'participant'
            );

            // Simulate concurrent access by calling setContext twice simultaneously
            const promise1 = collaborationEngine.contextManager.setContext(
                lockWorkspaceId,
                'concurrent',
                'test',
                'value1',
                lockAgentId
            );

            const promise2 = collaborationEngine.contextManager.setContext(
                lockWorkspaceId,
                'concurrent',
                'test',
                'value2',
                lockAgentId
            );

            // One should succeed, one should fail with lock error
            const results = await Promise.allSettled([promise1, promise2]);

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failureCount = results.filter(r => r.status === 'rejected').length;

            expect(successCount).toBe(1);
            expect(failureCount).toBe(1);
        });
    });

    describe('End-to-End Agent Communication', () => {
        test('should support complete agent-to-agent workflow', async () => {
            // Create conversation using existing test workspace and agents
            const conversation = await collaborationEngine.createConversation(
                testWorkspaceId,
                testAgentIds,
                testAgentIds[0] // First agent as orchestrator
            );

            expect(conversation.conversationId).toBeDefined();
            expect(conversation.orchestratorId).toBe(testAgentIds[0]);

            // Orchestrator assigns task to coder
            const task = await collaborationEngine.assignTask(
                conversation.conversationId,
                testAgentIds[0], // orchestrator
                testAgentIds[1], // coder
                'Build REST API for user management',
                { requirements: ['CRUD operations', 'Authentication', 'Input validation'] }
            );

            expect(task.assigneeId).toBe(testAgentIds[1]);
            expect(task.status).toBe('pending');

            // Coder completes task
            await collaborationEngine.updateTaskStatus(
                task.id,
                'completed',
                { code: 'api-implementation.js', tests: 'api-tests.js' }
            );

            // Set shared context
            await collaborationEngine.setSharedContext(
                testWorkspaceId,
                'project',
                'api-status',
                'implemented',
                testAgentIds[1] // coder
            );

            // Verify context sharing
            const sharedContext = await collaborationEngine.getSharedContext(testWorkspaceId, 'project');
            expect(sharedContext.length).toBeGreaterThan(0);
            expect(sharedContext[0].value).toBe('implemented');

            // Test message latency
            const messageStartTime = Date.now();
            const message = await collaborationEngine.sendMessage(
                conversation.conversationId,
                testAgentIds[1], // coder
                testAgentIds[2], // reviewer
                'review_request',
                { message: 'Please review my API implementation', taskId: task.id }
            );
            const messageLatency = Date.now() - messageStartTime;

            expect(message).toBeDefined();
            expect(messageLatency).toBeLessThan(100); // <100ms requirement
        });

        test('should support 10+ simultaneous agents', async () => {
            const uniqueId = Date.now();
            const agentCount = 15;

            // Create scalability workspace in database
            const scalabilityWorkspaceResult = database.createWorkspace({
                name: `Scalability Test Workspace ${uniqueId}`,
                description: 'Test workspace for scalability testing'
            });
            const scalabilityWorkspaceId = scalabilityWorkspaceResult.lastInsertRowid;

            // Create agents in database
            const agents = [];
            for (let i = 0; i < agentCount; i++) {
                const agentResult = database.saveAgentEnhanced({
                    name: `scale-agent-${uniqueId}-${i}`,
                    provider: 'openai',
                    model: 'gpt-4',
                    settings: { temperature: 0.7 },
                    role: 'participant',
                    capabilities: { messaging: true },
                    enabled: true
                });
                agents.push(agentResult.lastInsertRowid);
                database.addAgentToWorkspace(scalabilityWorkspaceId, agentResult.lastInsertRowid, 'participant');
            }

            // Create conversation with all agents
            const conversation = await collaborationEngine.createConversation(
                scalabilityWorkspaceId,
                agents,
                agents[0] // First agent is orchestrator
            );

            // Send messages from all agents simultaneously
            const messagePromises = agents.slice(1).map((agentId, index) =>
                collaborationEngine.sendMessage(
                    conversation.conversationId,
                    agentId,
                    agents[0], // Send to orchestrator
                    'status_update',
                    { status: `Agent ${index + 2} ready`, agentId }
                )
            );

            const startTime = Date.now();
            const messageResults = await Promise.all(messagePromises);
            const totalTime = Date.now() - startTime;

            expect(messageResults.length).toBe(agentCount - 1);
            expect(totalTime).toBeLessThan(1000); // Should handle 14 messages in under 1 second

            // Verify all messages were processed
            messageResults.forEach(message => {
                expect(message.id).toBeDefined();
                expect(message.conversationId).toBe(conversation.conversationId);
            });

            // Get metrics
            const metrics = collaborationEngine.getMetrics();
            expect(metrics.messagesProcessed).toBeGreaterThan(0);

            // Cleanup scalability test data
            for (const agentId of agents) {
                database.removeAgentFromWorkspace(scalabilityWorkspaceId, agentId);
                database.deleteAgent(agentId);
            }
            database.deleteWorkspace(scalabilityWorkspaceId);
        });
    });

    describe('Performance and Reliability', () => {
        test('should maintain <100ms message latency under load', async () => {
            const uniqueId = Date.now();

            // Create load test workspace in database
            const loadTestWorkspaceResult = database.createWorkspace({
                name: `Load Test Workspace ${uniqueId}`,
                description: 'Test workspace for load testing'
            });
            const loadTestWorkspaceId = loadTestWorkspaceResult.lastInsertRowid;

            // Create sender and receiver agents in database
            const senderResult = database.saveAgentEnhanced({
                name: `load-sender-${uniqueId}`,
                provider: 'openai',
                model: 'gpt-4',
                settings: { temperature: 0.7 },
                role: 'participant',
                capabilities: { messaging: true },
                enabled: true
            });
            const senderAgentId = senderResult.lastInsertRowid;

            const receiverResult = database.saveAgentEnhanced({
                name: `load-receiver-${uniqueId}`,
                provider: 'openai',
                model: 'gpt-4',
                settings: { temperature: 0.7 },
                role: 'participant',
                capabilities: { messaging: true },
                enabled: true
            });
            const receiverAgentId = receiverResult.lastInsertRowid;

            database.addAgentToWorkspace(loadTestWorkspaceId, senderAgentId, 'participant');
            database.addAgentToWorkspace(loadTestWorkspaceId, receiverAgentId, 'participant');

            const conversation = await collaborationEngine.createConversation(
                loadTestWorkspaceId,
                [senderAgentId, receiverAgentId]
            );

            const messageCount = 50;
            const latencies = [];

            // Send multiple messages and measure latency
            for (let i = 0; i < messageCount; i++) {
                const startTime = Date.now();

                await collaborationEngine.sendMessage(
                    conversation.conversationId,
                    senderAgentId,
                    receiverAgentId,
                    'load_test',
                    { messageNumber: i, content: `Load test message ${i}` }
                );

                const latency = Date.now() - startTime;
                latencies.push(latency);
            }

            // Calculate statistics
            const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
            const maxLatency = Math.max(...latencies);
            const latenciesUnder100ms = latencies.filter(lat => lat < 100).length;
            const reliabilityPercentage = (latenciesUnder100ms / messageCount) * 100;

            expect(averageLatency).toBeLessThan(100);
            expect(reliabilityPercentage).toBeGreaterThan(95); // 95%+ under 100ms

            console.log(`Load test results:
                Messages: ${messageCount}
                Average latency: ${averageLatency.toFixed(2)}ms
                Max latency: ${maxLatency}ms
                Under 100ms: ${reliabilityPercentage.toFixed(1)}%`);

            // Cleanup load test data
            database.removeAgentFromWorkspace(loadTestWorkspaceId, senderAgentId);
            database.removeAgentFromWorkspace(loadTestWorkspaceId, receiverAgentId);
            database.deleteAgent(senderAgentId);
            database.deleteAgent(receiverAgentId);
            database.deleteWorkspace(loadTestWorkspaceId);
        });

        test('should handle Redis fallback gracefully', async () => {
            // Test memory-based fallback when Redis is unavailable
            const originalRedis = collaborationEngine.messageBroker.redis;
            collaborationEngine.messageBroker.redis = null; // Simulate Redis failure

            const uniqueId = Date.now();

            // Create fallback test workspace in database
            const fallbackWorkspaceResult = database.createWorkspace({
                name: `Fallback Test Workspace ${uniqueId}`,
                description: 'Test workspace for Redis fallback testing'
            });
            const fallbackWorkspaceId = fallbackWorkspaceResult.lastInsertRowid;

            // Create agents in database
            const agent1Result = database.saveAgentEnhanced({
                name: `fallback-agent-1-${uniqueId}`,
                provider: 'openai',
                model: 'gpt-4',
                settings: { temperature: 0.7 },
                role: 'participant',
                capabilities: { messaging: true },
                enabled: true
            });
            const agent1 = agent1Result.lastInsertRowid;

            const agent2Result = database.saveAgentEnhanced({
                name: `fallback-agent-2-${uniqueId}`,
                provider: 'openai',
                model: 'gpt-4',
                settings: { temperature: 0.7 },
                role: 'participant',
                capabilities: { messaging: true },
                enabled: true
            });
            const agent2 = agent2Result.lastInsertRowid;

            database.addAgentToWorkspace(fallbackWorkspaceId, agent1, 'participant');
            database.addAgentToWorkspace(fallbackWorkspaceId, agent2, 'participant');

            const conversation = await collaborationEngine.createConversation(
                fallbackWorkspaceId,
                [agent1, agent2]
            );

            // Should still work without Redis
            const message = await collaborationEngine.sendMessage(
                conversation.conversationId,
                agent1,
                agent2,
                'fallback_test',
                { text: 'Testing memory fallback' }
            );

            expect(message).toBeDefined();
            expect(message.id).toBeDefined();

            // Get pending messages should work
            const pendingMessages = await collaborationEngine.messageBroker.getPendingMessages(agent2);
            expect(pendingMessages.length).toBeGreaterThan(0);

            // Restore Redis client
            collaborationEngine.messageBroker.redis = originalRedis;

            // Cleanup fallback test data
            database.removeAgentFromWorkspace(fallbackWorkspaceId, agent1);
            database.removeAgentFromWorkspace(fallbackWorkspaceId, agent2);
            database.deleteAgent(agent1);
            database.deleteAgent(agent2);
            database.deleteWorkspace(fallbackWorkspaceId);
        });
    });
});
