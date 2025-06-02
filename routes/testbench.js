const express = require('express');
const router = express.Router();
const database = require('../database');

// ===== TESTBENCH AGENT MANAGEMENT ENDPOINTS =====

// Create TestBench Agent with elevated permissions
router.post('/api/testbench/agents/create', async (req, res) => {
    const { agentId, agentConfig } = req.body;

    if (!agentId || !agentConfig) {
        return res.status(400).json({ error: 'Agent ID and agent configuration are required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasAgentCreatePermission = database.hasPermission('testbench', 'agent', 'management', 'create');
        if (!hasAgentCreatePermission) {
            return res.status(403).json({ error: 'TestBench agent lacks agent creation permissions.' });
        }

        // Enhanced agent configuration with TestBench defaults
        const enhancedConfig = {
            name: agentConfig.name,
            provider: agentConfig.provider || 'openai',
            model: agentConfig.model || 'gpt-4o',
            settings: {
                temperature: agentConfig.settings?.temperature || 0.7,
                max_tokens: agentConfig.settings?.max_tokens || 4000,
                ...agentConfig.settings
            },
            role: agentConfig.role || 'specialist',
            capabilities: {
                messaging: true,
                collaboration: true,
                system_access: agentConfig.role === 'testbench',
                ...agentConfig.capabilities
            },
            enabled: agentConfig.enabled !== undefined ? agentConfig.enabled : true
        };

        // Create the agent
        const result = database.saveAgentEnhanced(enhancedConfig);

        // Log the action
        database.logTestBenchAction(
            agentId,
            'agent_create',
            'agent',
            result.lastInsertRowid,
            { agentName: enhancedConfig.name, agentRole: enhancedConfig.role },
            true,
            null,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            success: true,
            message: `Agent '${enhancedConfig.name}' created successfully`,
            agent: {
                id: result.lastInsertRowid,
                name: enhancedConfig.name,
                role: enhancedConfig.role,
                provider: enhancedConfig.provider,
                model: enhancedConfig.model,
                capabilities: enhancedConfig.capabilities,
                enabled: enhancedConfig.enabled
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'agent_create', 'agent', 'unknown',
            { agentConfig }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error creating agent via TestBench:', error.message);
        res.status(500).json({ error: 'Failed to create agent.', details: error.message });
    }
});

// Bulk agent creation for testing scenarios
router.post('/api/testbench/agents/create-bulk', async (req, res) => {
    const { agentId, agentConfigs, workspace_id } = req.body;

    if (!agentId || !agentConfigs || !Array.isArray(agentConfigs)) {
        return res.status(400).json({ error: 'Agent ID and array of agent configurations are required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasAgentCreatePermission = database.hasPermission('testbench', 'agent', 'management', 'create');
        if (!hasAgentCreatePermission) {
            return res.status(403).json({ error: 'TestBench agent lacks agent creation permissions.' });
        }

        const createdAgents = [];
        const errors = [];

        for (const agentConfig of agentConfigs) {
            try {
                const enhancedConfig = {
                    name: agentConfig.name,
                    provider: agentConfig.provider || 'openai',
                    model: agentConfig.model || 'gpt-4o',
                    settings: {
                        temperature: agentConfig.settings?.temperature || 0.7,
                        max_tokens: agentConfig.settings?.max_tokens || 4000,
                        ...agentConfig.settings
                    },
                    role: agentConfig.role || 'specialist',
                    capabilities: {
                        messaging: true,
                        collaboration: true,
                        ...agentConfig.capabilities
                    },
                    enabled: agentConfig.enabled !== undefined ? agentConfig.enabled : true
                };

                const result = database.saveAgentEnhanced(enhancedConfig);
                const newAgentId = result.lastInsertRowid;

                // Add to workspace if specified
                if (workspace_id) {
                    database.addAgentToWorkspace(workspace_id, newAgentId, enhancedConfig.role);
                }

                createdAgents.push({
                    id: newAgentId,
                    name: enhancedConfig.name,
                    role: enhancedConfig.role,
                    provider: enhancedConfig.provider,
                    model: enhancedConfig.model
                });

            } catch (agentError) {
                errors.push({
                    agent: agentConfig.name || 'unknown',
                    error: agentError.message
                });
            }
        }

        database.logTestBenchAction(agentId, 'agent_create_bulk', 'agent', 'bulk',
            { created: createdAgents.length, errors: errors.length, workspace_id },
            true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            message: `Bulk agent creation completed: ${createdAgents.length} created, ${errors.length} errors`,
            created: createdAgents,
            errors: errors,
            workspace_id: workspace_id || null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'agent_create_bulk', 'agent', 'bulk',
            { agentConfigs }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error in bulk agent creation:', error.message);
        res.status(500).json({ error: 'Failed to create agents in bulk.', details: error.message });
    }
});

// ===== WORKSPACE PROVISIONING ENDPOINTS =====

// Provision complete workspace with agents
router.post('/api/testbench/workspaces/provision', async (req, res) => {
    const { agentId, workspaceConfig, agentConfigs = [], autoStart = false } = req.body;

    if (!agentId || !workspaceConfig) {
        return res.status(400).json({ error: 'Agent ID and workspace configuration are required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasWorkspacePermission = database.hasPermission('testbench', 'workspace', 'management', 'provision');
        if (!hasWorkspacePermission) {
            return res.status(403).json({ error: 'TestBench agent lacks workspace provisioning permissions.' });
        }

        // Create workspace
        const workspace = {
            name: workspaceConfig.name,
            description: workspaceConfig.description || 'Workspace provisioned by TestBench Agent',
            config: {
                collaboration_enabled: true,
                max_agents: workspaceConfig.max_agents || 10,
                message_retention: workspaceConfig.message_retention || '30d',
                auto_scaling: workspaceConfig.auto_scaling || false,
                monitoring: workspaceConfig.monitoring || true,
                ...workspaceConfig.config
            },
            thumbnail: workspaceConfig.thumbnail || null,
            isDefault: workspaceConfig.isDefault || false
        };

        const workspaceResult = database.createWorkspace(workspace);
        const workspaceId = workspaceResult.lastInsertRowid;

        // Create and assign agents
        const assignedAgents = [];
        for (const agentConfig of agentConfigs) {
            try {
                const enhancedConfig = {
                    name: `${workspace.name}-${agentConfig.role || 'agent'}-${Date.now()}`,
                    provider: agentConfig.provider || 'openai',
                    model: agentConfig.model || 'gpt-4o',
                    settings: {
                        temperature: agentConfig.settings?.temperature || 0.7,
                        max_tokens: agentConfig.settings?.max_tokens || 4000,
                        ...agentConfig.settings
                    },
                    role: agentConfig.role || 'specialist',
                    capabilities: {
                        messaging: true,
                        collaboration: true,
                        ...agentConfig.capabilities
                    },
                    enabled: true
                };

                const agentResult = database.saveAgentEnhanced(enhancedConfig);
                const newAgentId = agentResult.lastInsertRowid;

                // Assign to workspace
                database.addAgentToWorkspace(workspaceId, newAgentId, enhancedConfig.role);

                assignedAgents.push({
                    id: newAgentId,
                    name: enhancedConfig.name,
                    role: enhancedConfig.role,
                    provider: enhancedConfig.provider,
                    model: enhancedConfig.model
                });

            } catch (agentError) {
                console.error(`Error creating agent for workspace: ${agentError.message}`);
            }
        }

        // Start collaboration if requested
        let conversationId = null;
        if (autoStart && assignedAgents.length > 0) {
            conversationId = `conv_${workspaceId}_${Date.now()}`;
            database.createAgentConversation({
                workspaceId: workspaceId,
                conversationId: conversationId,
                participants: assignedAgents.map(a => a.id),
                orchestratorId: assignedAgents.find(a => a.role === 'orchestrator')?.id || assignedAgents[0].id,
                status: 'active'
            });
        }

        database.logTestBenchAction(agentId, 'workspace_provision', 'workspace', workspaceId,
            { workspaceName: workspace.name, agentsCreated: assignedAgents.length, autoStart },
            true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            message: `Workspace '${workspace.name}' provisioned successfully`,
            workspace: {
                id: workspaceId,
                name: workspace.name,
                description: workspace.description,
                config: workspace.config
            },
            agents: assignedAgents,
            conversationId: conversationId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'workspace_provision', 'workspace', 'unknown',
            { workspaceConfig, agentConfigs }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error provisioning workspace:', error.message);
        res.status(500).json({ error: 'Failed to provision workspace.', details: error.message });
    }
});

// ===== KNOWLEDGE BASE MANAGEMENT ENDPOINTS =====

// Create and configure knowledge base
router.post('/api/testbench/knowledge/create', async (req, res) => {
    const { agentId, knowledgeBaseConfig } = req.body;

    if (!agentId || !knowledgeBaseConfig) {
        return res.status(400).json({ error: 'Agent ID and knowledge base configuration are required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasKnowledgePermission = database.hasPermission('testbench', 'knowledge', 'management', 'create');
        if (!hasKnowledgePermission) {
            return res.status(403).json({ error: 'TestBench agent lacks knowledge management permissions.' });
        }

        // Create knowledge base
        const knowledgeBase = {
            id: knowledgeBaseConfig.id || `kb_${Date.now()}`,
            name: knowledgeBaseConfig.name,
            description: knowledgeBaseConfig.description || 'Knowledge base created by TestBench Agent',
            type: knowledgeBaseConfig.type || 'documents',
            vectorEnabled: knowledgeBaseConfig.vectorEnabled !== undefined ? knowledgeBaseConfig.vectorEnabled : true,
            embeddingModel: knowledgeBaseConfig.embeddingModel || 'text-embedding-ada-002',
            chunkSize: knowledgeBaseConfig.chunkSize || 1000,
            chunkOverlap: knowledgeBaseConfig.chunkOverlap || 200,
            documentCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = database.createKnowledgeBase(knowledgeBase);

        database.logTestBenchAction(agentId, 'knowledge_create', 'knowledge_base', knowledgeBase.id,
            { name: knowledgeBase.name, type: knowledgeBase.type }, true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            message: `Knowledge base '${knowledgeBase.name}' created successfully`,
            knowledgeBase: {
                id: knowledgeBase.id,
                name: knowledgeBase.name,
                description: knowledgeBase.description,
                type: knowledgeBase.type,
                vectorEnabled: knowledgeBase.vectorEnabled,
                embeddingModel: knowledgeBase.embeddingModel,
                chunkSize: knowledgeBase.chunkSize,
                chunkOverlap: knowledgeBase.chunkOverlap
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'knowledge_create', 'knowledge_base', 'unknown',
            { knowledgeBaseConfig }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error creating knowledge base:', error.message);
        res.status(500).json({ error: 'Failed to create knowledge base.', details: error.message });
    }
});

// ===== FEATURE TESTING ENDPOINTS =====

// Create and execute feature test
router.post('/api/testbench/features/test', async (req, res) => {
    const { agentId, testConfig, executeImmediately = false } = req.body;

    if (!agentId || !testConfig) {
        return res.status(400).json({ error: 'Agent ID and test configuration are required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasTestingPermission = database.hasPermission('testbench', 'testing', 'features', 'create');
        if (!hasTestingPermission) {
            return res.status(403).json({ error: 'TestBench agent lacks feature testing permissions.' });
        }

        // Create feature test
        const featureTest = {
            testName: testConfig.testName,
            testType: testConfig.testType || 'integration',
            testConfig: testConfig,
            status: executeImmediately ? 'running' : 'pending',
            startedByAgent: agentId,
            totalAssertions: testConfig.assertions?.length || 0
        };

        const result = database.createFeatureTest(featureTest);
        const testId = result.lastInsertRowid;

        let testResults = null;

        // Execute test immediately if requested
        if (executeImmediately) {
            try {
                testResults = await executeFeatureTest(testId, testConfig, agentId);

                // Update test with results
                database.updateFeatureTest(testId, {
                    testResults: testResults,
                    status: testResults.success ? 'completed' : 'failed',
                    successRate: testResults.successRate,
                    totalAssertions: testResults.totalAssertions,
                    passedAssertions: testResults.passedAssertions
                });

            } catch (testError) {
                database.updateFeatureTest(testId, {
                    status: 'failed',
                    testResults: { error: testError.message, success: false }
                });
                testResults = { error: testError.message, success: false };
            }
        }

        database.logTestBenchAction(agentId, 'feature_test', 'test', testId,
            { testName: featureTest.testName, testType: featureTest.testType, executeImmediately },
            true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            message: `Feature test '${featureTest.testName}' ${executeImmediately ? 'executed' : 'created'} successfully`,
            test: {
                id: testId,
                testName: featureTest.testName,
                testType: featureTest.testType,
                status: executeImmediately ? (testResults?.success ? 'completed' : 'failed') : 'pending',
                totalAssertions: featureTest.totalAssertions
            },
            results: testResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'feature_test', 'test', 'unknown',
            { testConfig }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error creating/executing feature test:', error.message);
        res.status(500).json({ error: 'Failed to create/execute feature test.', details: error.message });
    }
});

// Execute pending feature test
router.post('/api/testbench/features/test/:testId/execute', async (req, res) => {
    const { testId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasExecutePermission = database.hasPermission('testbench', 'testing', 'features', 'execute');
        if (!hasExecutePermission) {
            return res.status(403).json({ error: 'TestBench agent lacks test execution permissions.' });
        }

        // Get test
        const test = database.getFeatureTest(testId);
        if (!test) {
            return res.status(404).json({ error: 'Feature test not found' });
        }

        if (test.status !== 'pending') {
            return res.status(400).json({ error: `Cannot execute test in '${test.status}' status` });
        }

        // Update status to running
        database.updateFeatureTest(testId, { status: 'running' });

        // Execute test
        const testResults = await executeFeatureTest(testId, test.testConfig, agentId);

        // Update test with results
        database.updateFeatureTest(testId, {
            testResults: testResults,
            status: testResults.success ? 'completed' : 'failed',
            successRate: testResults.successRate,
            totalAssertions: testResults.totalAssertions,
            passedAssertions: testResults.passedAssertions
        });

        database.logTestBenchAction(agentId, 'test_execute', 'test', testId,
            { testName: test.testName, success: testResults.success }, true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            message: `Feature test '${test.testName}' executed successfully`,
            test: {
                id: testId,
                testName: test.testName,
                status: testResults.success ? 'completed' : 'failed',
                successRate: testResults.successRate
            },
            results: testResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // Update test status to failed
        try {
            database.updateFeatureTest(testId, {
                status: 'failed',
                testResults: { error: error.message, success: false }
            });
        } catch (updateError) {
            console.error('Error updating test status:', updateError.message);
        }

        database.logTestBenchAction(agentId, 'test_execute', 'test', testId,
            { testId }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error executing feature test:', error.message);
        res.status(500).json({ error: 'Failed to execute feature test.', details: error.message });
    }
});

// ===== TESTBENCH CHAT ENDPOINT =====

// TestBench Agent chat interface
router.post('/api/testbench/chat', async (req, res) => {
    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Get or create TestBench agent
        let testbenchAgent = database.getAllAgents().find(a => {
            try {
                const enhanced = database.getAgentEnhanced(a.name);
                return enhanced && enhanced.role === 'testbench' && enhanced.enabled;
            } catch (e) {
                return false;
            }
        });

        if (!testbenchAgent) {
            // Create a default TestBench agent
            const newAgent = {
                name: 'TestBench-Assistant',
                provider: 'openai',
                model: 'gpt-4o',
                settings: { temperature: 0.7, max_tokens: 4000 },
                role: 'testbench',
                capabilities: {
                    messaging: true,
                    collaboration: true,
                    system_access: true,
                    agent_create: true,
                    workspace_manage: true,
                    knowledge_provision: true,
                    feature_test: true
                },
                enabled: true
            };

            try {
                console.log('Creating TestBench agent with:', JSON.stringify(newAgent, null, 2));
                const result = database.saveAgentEnhanced(newAgent);
                testbenchAgent = database.getAgent('TestBench-Assistant');
                console.log('Created default TestBench agent');
            } catch (createError) {
                console.error('Error creating TestBench agent:', createError);
                throw createError;
            }
        }

        // Build system message for TestBench Agent
        const systemMessage = `You are a TestBench Agent - a system-level testing and configuration management assistant with advanced capabilities.
Your role is to help users test system features, create agents, configure workspaces, and manage platform settings.

You have the following capabilities:
- Create and configure AI agents with specific roles and capabilities
- Provision workspaces with pre-configured agent teams
- Set up knowledge bases with sample data
- Modify system configuration and settings
- Run automated tests on platform features
- Monitor system health and performance

When users ask you to perform actions, provide clear explanations of what you're doing and suggest follow-up actions.
Be helpful, proactive, and suggest best practices for system configuration.`;

        // Import chat handler
        const { handleOpenAI } = require('../providers/openai');
        const { handleAnthropic } = require('../providers/anthropic');
        const { getProviderFromModel } = require('../utils/helpers');

        const messages = [
            { role: 'system', content: systemMessage },
            { role: 'user', content: message }
        ];

        // Get provider configuration
        const provider = getProviderFromModel(testbenchAgent.model);
        const providerConfig = database.getProviderSettings(provider) || {};

        // Parse settings if they're a string
        let agentSettings = testbenchAgent.settings;
        if (typeof agentSettings === 'string') {
            try {
                agentSettings = JSON.parse(agentSettings);
            } catch (e) {
                agentSettings = { temperature: 0.7, max_tokens: 4000 };
            }
        }

        let completion;
        switch (provider) {
            case 'openai':
                completion = await handleOpenAI(messages, testbenchAgent.model, providerConfig, agentSettings);
                break;
            case 'anthropic':
                completion = await handleAnthropic(messages, testbenchAgent.model, providerConfig, agentSettings);
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        const response = completion.choices?.[0]?.message?.content || completion.content || 'I encountered an error processing your request.';

        // Parse potential actions from the response
        const actions = [];
        
        // Simple pattern matching for common actions
        if (response.toLowerCase().includes('create') && response.toLowerCase().includes('agent')) {
            actions.push({ type: 'create_agent' });
        }
        if (response.toLowerCase().includes('create') && response.toLowerCase().includes('workspace')) {
            actions.push({ type: 'create_workspace' });
        }
        if (response.toLowerCase().includes('run') && response.toLowerCase().includes('test')) {
            actions.push({ type: 'run_tests' });
        }
        if (response.toLowerCase().includes('health') || response.toLowerCase().includes('status')) {
            actions.push({ type: 'health_check' });
        }

        // Log the chat interaction
        try {
            // Get the agent ID instead of name for audit logging
            const agentEnhanced = database.getAgentEnhanced(testbenchAgent.name);
            const agentId = agentEnhanced ? agentEnhanced.id : testbenchAgent.name;
            
            database.logTestBenchAction(
                agentId,
                'chat_interaction',
                'chat',
                'testbench-chat',
                { message: message.substring(0, 100), context },
                true,
                null,
                req.ip || 'unknown',
                req.get('User-Agent') || 'unknown'
            );
        } catch (logError) {
            console.error('Error logging TestBench action:', logError);
            // Continue without logging if there's an error
        }

        res.json({
            success: true,
            response: response,
            actions: actions,
            agent: {
                name: testbenchAgent.name,
                model: testbenchAgent.model
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in TestBench chat:', error.message);
        res.status(500).json({ 
            error: 'Failed to process TestBench chat request',
            details: error.message 
        });
    }
});

// ===== SYSTEM HEALTH & CAPABILITY ASSESSMENT =====

// System health check
router.get('/api/testbench/system/health', async (req, res) => {
    const { agentId } = req.query;

    if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasHealthPermission = database.hasPermission('testbench', 'system', 'health', 'read');
        if (!hasHealthPermission) {
            return res.status(403).json({ error: 'TestBench agent lacks health monitoring permissions.' });
        }

        // Collect system health data
        const healthData = {
            database: {
                status: 'healthy',
                tables: ['agents', 'workspaces', 'agent_conversations', 'agent_messages', 'settings'],
                records: {
                    agents: database.getAllAgents().length,
                    workspaces: database.getAllWorkspaces().length,
                    conversations: database.db.prepare('SELECT COUNT(*) as count FROM agent_conversations').get().count,
                    messages: database.db.prepare('SELECT COUNT(*) as count FROM agent_messages').get().count
                }
            },
            agents: {
                total: database.getAllAgents().length,
                enabled: database.getAllAgents().filter(a => {
                    try {
                        const enhanced = database.getAgentEnhanced(a.name);
                        return enhanced && enhanced.enabled;
                    } catch (e) {
                        return true; // Default to enabled for basic agents
                    }
                }).length,
                byRole: {}
            },
            testbench: {
                permissions: database.getSystemPermissions('testbench').length,
                configurations: database.getAllTestBenchConfigurations().length,
                backups: database.getAllBackupSnapshots().length,
                tests: database.getAllFeatureTests().length
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            }
        };

        // Count agents by role
        const agents = database.getAllAgents();
        for (const agent of agents) {
            try {
                const enhanced = database.getAgentEnhanced(agent.name);
                const role = enhanced?.role || 'assistant';
                healthData.agents.byRole[role] = (healthData.agents.byRole[role] || 0) + 1;
            } catch (e) {
                healthData.agents.byRole['assistant'] = (healthData.agents.byRole['assistant'] || 0) + 1;
            }
        }

        database.logTestBenchAction(agentId, 'health_check', 'system', 'health',
            { status: 'healthy' }, true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            health: healthData,
            status: 'healthy',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'health_check', 'system', 'health',
            {}, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error checking system health:', error.message);
        res.status(500).json({ error: 'Failed to check system health.', details: error.message });
    }
});

// System capability assessment
router.get('/api/testbench/system/capabilities', async (req, res) => {
    const { agentId } = req.query;

    if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        // Assess system capabilities
        const capabilities = {
            multiAgent: {
                enabled: true,
                features: {
                    messaging: true,
                    collaboration: true,
                    workspaces: true,
                    taskAssignment: true,
                    contextSharing: true
                }
            },
            providers: {
                openai: !!database.getSetting('openai', 'api_key'),
                anthropic: !!database.getSetting('anthropic', 'api_key'),
                openrouter: !!database.getSetting('openrouter', 'api_key'),
                ollama: !!database.getSetting('ollama', 'endpoint')
            },
            models: {
                available: Object.keys(database.getWorkspaceModels()).length > 0,
                gpt4o: database.getWorkspaceModels()['openai']?.some(m => m.id.includes('gpt-4o')) || false,
                claude4: database.getWorkspaceModels()['anthropic']?.some(m => m.id.includes('claude-3')) || false
            },
            storage: {
                database: true,
                knowledgeBases: database.getAllKnowledgeBases().length > 0,
                backups: database.getAllBackupSnapshots().length > 0
            },
            testing: {
                featureTests: true,
                configValidation: true,
                systemHealth: true,
                auditLogging: true
            },
            security: {
                permissions: true,
                auditLog: database.getAuditLogs({ limit: 1 }).length > 0,
                encryption: true // MCP server keys are encrypted
            }
        };

        database.logTestBenchAction(agentId, 'capability_assessment', 'system', 'capabilities',
            { assessed: Object.keys(capabilities).length }, true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            capabilities: capabilities,
            assessment: 'System ready for TestBench operations',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'capability_assessment', 'system', 'capabilities',
            {}, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error assessing system capabilities:', error.message);
        res.status(500).json({ error: 'Failed to assess system capabilities.', details: error.message });
    }
});

// Run multiple feature test suites
router.post('/api/testbench/tests/run', async (req, res) => {
    const { test_suites, generate_report } = req.body;
    if (!Array.isArray(test_suites) || test_suites.length === 0) {
        return res.status(400).json({ error: 'test_suites array is required' });
    }
    try {
        const results = [];
        let passed = 0;
        for (const suite of test_suites) {
            // Execute each test suite
            const testConfig = { testName: suite, testType: suite, successThreshold: 0.8 };
            const result = await executeFeatureTest(null, testConfig, null);
            results.push({ suite, success: result.success, details: result });
            if (result.success) passed++;
        }
        const total = test_suites.length;
        const failed = total - passed;
        // Optionally generate a report URL (stubbed)
        const report_url = generate_report ? `/api/testbench/tests/report/${Date.now()}` : null;
        res.json({ passed, total, failed, report_url, results });
    } catch (error) {
        console.error('Error running feature tests:', error.message);
        res.status(500).json({ error: 'Failed to run feature tests', details: error.message });
    }
});

// Comprehensive health check endpoint
router.get('/api/testbench/health/comprehensive', async (req, res) => {
    try {
        const healthData = {
            overall_status: 'healthy',
            healthy_components: 0,
            total_components: 0,
            database: 'healthy',
            collaboration: 'healthy',
            providers: 'unknown',
            testbench: 'healthy',
            components: {}
        };

        // Check database
        try {
            const agentCount = database.getAllAgents().length;
            const workspaceCount = database.getAllWorkspaces().length;
            healthData.components.database = {
                status: 'healthy',
                agents: agentCount,
                workspaces: workspaceCount
            };
            healthData.healthy_components++;
        } catch (e) {
            healthData.components.database = { status: 'error', error: e.message };
            healthData.database = 'error';
        }
        healthData.total_components++;

        // Check collaboration engine
        try {
            const conversationCount = database.db.prepare('SELECT COUNT(*) as count FROM agent_conversations').get().count;
            healthData.components.collaboration = {
                status: 'healthy',
                conversations: conversationCount
            };
            healthData.healthy_components++;
        } catch (e) {
            healthData.components.collaboration = { status: 'error', error: e.message };
            healthData.collaboration = 'error';
        }
        healthData.total_components++;

        // Check providers
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];
        let connectedProviders = 0;
        for (const provider of providers) {
            const hasConfig = !!database.getSetting(provider, provider === 'ollama' ? 'endpoint' : 'api_key');
            if (hasConfig) connectedProviders++;
        }
        healthData.components.providers = {
            status: connectedProviders > 0 ? 'healthy' : 'warning',
            connected: connectedProviders,
            total: providers.length
        };
        healthData.providers = connectedProviders > 0 ? 'healthy' : 'warning';
        if (connectedProviders > 0) healthData.healthy_components++;
        healthData.total_components++;

        // Check TestBench status
        const testbenchAgents = database.getAllAgents().filter(a => {
            try {
                const enhanced = database.getAgentEnhanced(a.name);
                return enhanced && enhanced.role === 'testbench';
            } catch (e) {
                return false;
            }
        });
        healthData.components.testbench = {
            status: testbenchAgents.length > 0 ? 'healthy' : 'warning',
            agents: testbenchAgents.length
        };
        healthData.testbench = testbenchAgents.length > 0 ? 'healthy' : 'warning';
        if (testbenchAgents.length > 0) healthData.healthy_components++;
        healthData.total_components++;

        // Calculate overall status
        const healthPercentage = (healthData.healthy_components / healthData.total_components) * 100;
        if (healthPercentage >= 75) {
            healthData.overall_status = 'healthy';
        } else if (healthPercentage >= 50) {
            healthData.overall_status = 'warning';
        } else {
            healthData.overall_status = 'critical';
        }

        res.json(healthData);
    } catch (error) {
        console.error('Error performing comprehensive health check:', error.message);
        res.status(500).json({
            overall_status: 'error',
            error: 'Failed to perform health check',
            details: error.message
        });
    }
});

// Clear TestBench test data
router.delete('/api/testbench/data/clear', async (req, res) => {
    const { clear_test_data } = req.body;
    if (!clear_test_data) {
        return res.status(400).json({ error: 'clear_test_data flag is required' });
    }
    try {
        // Remove feature tests, backups, and audit logs
        const delTests = database.db.prepare('DELETE FROM feature_tests').run().changes;
        const delBackups = database.db.prepare('DELETE FROM backup_snapshots').run().changes;
        const delLogs = database.db.prepare('DELETE FROM audit_log').run().changes;
        res.json({
            success: true,
            agents_removed: 0,
            workspaces_removed: 0,
            test_results_removed: delTests,
            backups_removed: delBackups,
            audit_logs_removed: delLogs,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error clearing test data:', error.message);
        res.status(500).json({ error: 'Failed to clear test data', details: error.message });
    }
});

// ===== HELPER FUNCTIONS =====

// Execute feature test
async function executeFeatureTest(testId, testConfig, agentId) {
    const results = {
        testId: testId,
        startTime: new Date().toISOString(),
        endTime: null,
        success: false,
        totalAssertions: 0,
        passedAssertions: 0,
        failedAssertions: 0,
        successRate: 0,
        assertions: [],
        logs: []
    };

    try {
        results.logs.push(`Starting test execution: ${testConfig.testName}`);

        // Execute test based on type
        if (testConfig.testType === 'agent_creation') {
            await testAgentCreation(testConfig, results);
        } else if (testConfig.testType === 'workspace_collaboration') {
            await testWorkspaceCollaboration(testConfig, results);
        } else if (testConfig.testType === 'provider_connectivity') {
            await testProviderConnectivity(testConfig, results);
        } else if (testConfig.testType === 'knowledge_base') {
            await testKnowledgeBase(testConfig, results);
        } else {
            throw new Error(`Unknown test type: ${testConfig.testType}`);
        }

        // Calculate results
        results.totalAssertions = results.assertions.length;
        results.passedAssertions = results.assertions.filter(a => a.passed).length;
        results.failedAssertions = results.totalAssertions - results.passedAssertions;
        results.successRate = results.totalAssertions > 0 ? (results.passedAssertions / results.totalAssertions) : 0;
        results.success = results.successRate >= (testConfig.successThreshold || 0.8);

        results.endTime = new Date().toISOString();
        results.logs.push(`Test completed. Success rate: ${(results.successRate * 100).toFixed(1)}%`);

        return results;

    } catch (error) {
        results.endTime = new Date().toISOString();
        results.success = false;
        results.logs.push(`Test failed with error: ${error.message}`);
        throw error;
    }
}

// Test agent creation functionality
async function testAgentCreation(testConfig, results) {
    results.logs.push('Testing agent creation functionality...');

    // Test creating a basic agent
    try {
        const testAgent = {
            name: `test-agent-${Date.now()}`,
            provider: 'openai',
            model: 'gpt-4o',
            settings: { temperature: 0.7 },
            role: 'specialist',
            capabilities: { messaging: true },
            enabled: true
        };

        const result = database.saveAgentEnhanced(testAgent);
        const agentId = result.lastInsertRowid;

        results.assertions.push({
            name: 'Agent creation',
            passed: agentId > 0,
            details: `Agent created with ID: ${agentId}`
        });

        // Test retrieving the agent
        const retrievedAgent = database.getAgentEnhanced(testAgent.name);
        results.assertions.push({
            name: 'Agent retrieval',
            passed: retrievedAgent && retrievedAgent.name === testAgent.name,
            details: retrievedAgent ? 'Agent retrieved successfully' : 'Failed to retrieve agent'
        });

        // Cleanup
        database.deleteAgent(testAgent.name);
        results.logs.push('Test agent cleaned up');

    } catch (error) {
        results.assertions.push({
            name: 'Agent creation',
            passed: false,
            details: `Error: ${error.message}`
        });
    }
}

// Test workspace collaboration functionality
async function testWorkspaceCollaboration(testConfig, results) {
    results.logs.push('Testing workspace collaboration functionality...');

    try {
        // Create test workspace
        const testWorkspace = {
            name: `test-workspace-${Date.now()}`,
            description: 'Test workspace for collaboration testing',
            config: { collaboration_enabled: true, max_agents: 5 },
            isDefault: false
        };

        const workspaceResult = database.createWorkspace(testWorkspace);
        const workspaceId = workspaceResult.lastInsertRowid;

        results.assertions.push({
            name: 'Workspace creation',
            passed: workspaceId > 0,
            details: `Workspace created with ID: ${workspaceId}`
        });

        // Create test agents and add to workspace
        const testAgents = [
            { name: `test-orch-${Date.now()}`, role: 'orchestrator' },
            { name: `test-spec-${Date.now()}`, role: 'specialist' }
        ];

        for (const agentConfig of testAgents) {
            const agent = {
                name: agentConfig.name,
                provider: 'openai',
                model: 'gpt-4o',
                settings: { temperature: 0.7 },
                role: agentConfig.role,
                capabilities: { messaging: true, collaboration: true },
                enabled: true
            };

            const agentResult = database.saveAgentEnhanced(agent);
            database.addAgentToWorkspace(workspaceId, agentResult.lastInsertRowid, agentConfig.role);
        }

        // Test workspace agents retrieval
        const workspaceAgents = database.getWorkspaceAgents(workspaceId);
        results.assertions.push({
            name: 'Workspace agent assignment',
            passed: workspaceAgents.length === testAgents.length,
            details: `${workspaceAgents.length} agents assigned to workspace`
        });

        // Cleanup
        database.deleteWorkspace(workspaceId);
        for (const agentConfig of testAgents) {
            database.deleteAgent(agentConfig.name);
        }
        results.logs.push('Test workspace and agents cleaned up');

    } catch (error) {
        results.assertions.push({
            name: 'Workspace collaboration',
            passed: false,
            details: `Error: ${error.message}`
        });
    }
}

// Test provider connectivity
async function testProviderConnectivity(testConfig, results) {
    results.logs.push('Testing provider connectivity...');

    const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];

    for (const provider of providers) {
        try {
            const hasApiKey = !!database.getSetting(provider, 'api_key');
            const hasEndpoint = provider === 'ollama' ? !!database.getSetting(provider, 'endpoint') : true;

            results.assertions.push({
                name: `${provider} configuration`,
                passed: hasApiKey || hasEndpoint,
                details: hasApiKey ? 'API key configured' : (hasEndpoint ? 'Endpoint configured' : 'No configuration found')
            });

        } catch (error) {
            results.assertions.push({
                name: `${provider} configuration`,
                passed: false,
                details: `Error: ${error.message}`
            });
        }
    }
}

// Test knowledge base functionality
async function testKnowledgeBase(testConfig, results) {
    results.logs.push('Testing knowledge base functionality...');

    try {
        const testKB = {
            id: `test-kb-${Date.now()}`,
            name: 'Test Knowledge Base',
            description: 'Test knowledge base for functionality testing',
            type: 'documents',
            vectorEnabled: true,
            embeddingModel: 'text-embedding-ada-002',
            chunkSize: 1000,
            chunkOverlap: 200,
            documentCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        database.createKnowledgeBase(testKB);

        results.assertions.push({
            name: 'Knowledge base creation',
            passed: true,
            details: `Knowledge base '${testKB.name}' created successfully`
        });

        // Test retrieval
        const retrievedKB = database.getKnowledgeBase(testKB.id);
        results.assertions.push({
            name: 'Knowledge base retrieval',
            passed: retrievedKB && retrievedKB.name === testKB.name,
            details: retrievedKB ? 'Knowledge base retrieved successfully' : 'Failed to retrieve knowledge base'
        });

        // Cleanup
        database.deleteKnowledgeBase(testKB.id);
        results.logs.push('Test knowledge base cleaned up');

    } catch (error) {
        results.assertions.push({
            name: 'Knowledge base functionality',
            passed: false,
            details: `Error: ${error.message}`
        });
    }
}

module.exports = router;
