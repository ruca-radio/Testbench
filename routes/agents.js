const express = require('express');
const router = express.Router();
const database = require('../database');

// Simple agent creation endpoint for API integration tests
router.post('/api/agents', async (req, res) => {
    const { id, name, role, provider, model, enabled, settings } = req.body;

    if (!name || !provider || !model) {
        return res.status(400).json({ error: 'Name, provider, and model are required' });
    }

    try {
        // Create agent object compatible with database
        const agent = {
            name: name,
            provider: provider,
            model: model,
            settings: settings || { temperature: 0.7 },
            role: role || 'assistant',
            capabilities: { messaging: true },
            enabled: enabled !== undefined ? enabled : true
        };

        // Save using enhanced function for collaboration features
        const result = database.saveAgentEnhanced(agent);

        res.status(201).json({
            success: true,
            message: `Agent '${agent.name}' created successfully`,
            agent: {
                id: result.lastInsertRowid,
                name: agent.name,
                role: agent.role,
                provider: agent.provider,
                model: agent.model,
                enabled: agent.enabled
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Handle unique constraint violations
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                error: 'Agent with this name already exists',
                details: error.message
            });
        }

        console.error('Error creating agent:', error.message);
        res.status(500).json({ error: 'Failed to create agent.', details: error.message });
    }
});

// Enhanced agent management with database
router.post('/api/agents/action/save', async (req, res) => {
    const { agent } = req.body;

    if (!agent) {
        return res.status(400).json({ error: 'Agent configuration is required' });
    }

    // Validate agent structure
    if (typeof agent !== 'object' || !agent.name || !agent.model || !agent.settings) {
        return res.status(400).json({ error: 'Invalid agent configuration. Must include name, model, and settings.' });
    }

    try {
        database.saveAgent(agent);
        res.json({
            success: true,
            message: `Agent '${agent.name}' saved successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving agent:', error.message);
        res.status(500).json({ error: 'Failed to save agent configuration.', details: error.message });
    }
});

// List all agents
router.get('/api/agents/list/all', async (req, res) => {
    try {
        const agents = database.getAllAgents();
        res.json({ agents });
    } catch (error) {
        console.error('Error listing agents:', error.message);
        res.status(500).json({ error: 'Failed to list agents.', details: error.message });
    }
});

// Load a specific agent configuration
router.get('/api/agents/get/:name', async (req, res) => {
    const { name } = req.params;

    if (!name) {
        return res.status(400).json({ error: 'Agent name is required' });
    }

    try {
        const agent = database.getAgent(name);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json(agent);
    } catch (error) {
        console.error('Error loading agent:', error.message);
        res.status(500).json({ error: 'Failed to load agent configuration.', details: error.message });
    }
});

// Delete an agent configuration
router.delete('/api/agents/action/delete/:name', async (req, res) => {
    const { name } = req.params;

    if (!name) {
        return res.status(400).json({ error: 'Agent name is required' });
    }

    try {
        const result = database.deleteAgent(name);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json({ success: true, message: `Agent '${name}' deleted successfully.` });
    } catch (error) {
        console.error('Error deleting agent:', error.message);
        res.status(500).json({ error: 'Failed to delete agent configuration.', details: error.message });
    }
});

// Clone an existing agent
router.post('/api/agents/action/clone/:name', async (req, res) => {
    const { name } = req.params;
    const { newName } = req.body;

    if (!name || !newName) {
        return res.status(400).json({ error: 'Original agent name and new name are required' });
    }

    try {
        const existingAgent = database.getAgent(name);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Create new agent with cloned settings
        const clonedAgent = {
            ...existingAgent,
            name: newName,
            id: undefined // Remove the ID so a new one is generated
        };

        database.saveAgent(clonedAgent);
        res.json({
            success: true,
            message: `Agent '${name}' cloned as '${newName}' successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error cloning agent:', error.message);
        res.status(500).json({ error: 'Failed to clone agent configuration.', details: error.message });
    }
});

// ===== ENHANCED COLLABORATION FEATURES =====
// Role-based agent management endpoints

// Assign roles to agents
router.post('/api/agents/:id/roles', async (req, res) => {
    const { id } = req.params;
    const { role, capabilities } = req.body;

    if (!role) {
        return res.status(400).json({ error: 'Role is required' });
    }

    // Validate role
    const validRoles = ['orchestrator', 'specialist', 'reviewer', 'coder', 'researcher', 'analyst', 'writer', 'assistant', 'testbench'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({
            error: 'Invalid role',
            validRoles: validRoles
        });
    }

    // Special handling for TestBench role assignment
    if (role === 'testbench') {
        // Check if requesting agent has TestBench permissions
        const requestingAgent = database.getAgentEnhanced(id);
        if (requestingAgent && requestingAgent.role === 'testbench') {
            // TestBench agent can assign TestBench role to others
        } else {
            // For now, only allow TestBench agents to assign TestBench role
            // In production, this might require additional admin verification
            return res.status(403).json({
                error: 'Only TestBench agents can assign TestBench role to other agents'
            });
        }
    }

    try {
        // Get existing agent first to preserve other data
        const existingAgent = database.getAgent(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Update agent with new role and capabilities using enhanced save
        const updatedAgent = {
            ...existingAgent,
            role: role,
            capabilities: capabilities || existingAgent.capabilities || {},
            enabled: existingAgent.enabled !== undefined ? existingAgent.enabled : true
        };

        database.saveAgentEnhanced(updatedAgent);

        res.json({
            success: true,
            message: `Agent '${existingAgent.name}' assigned role '${role}' successfully`,
            agent: {
                id: existingAgent.id,
                name: existingAgent.name,
                role: role,
                capabilities: updatedAgent.capabilities
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error assigning agent role:', error.message);
        res.status(500).json({ error: 'Failed to assign agent role.', details: error.message });
    }
});

// Discover agents by role
router.get('/api/agents/by-role/:role', async (req, res) => {
    const { role } = req.params;
    const { enabled } = req.query;

    try {
        const allAgents = database.getAllAgents();

        // Filter agents by role using enhanced agent data
        let filteredAgents = allAgents.filter(agent => {
            // Try to get enhanced agent data
            try {
                const enhancedAgent = database.getAgentEnhanced(agent.name);
                return enhancedAgent && enhancedAgent.role === role;
            } catch (e) {
                // Fallback to basic agent data - check if role is in settings
                return agent.settings && agent.settings.role === role;
            }
        });

        // Apply enabled filter if specified
        if (enabled !== undefined) {
            const enabledFilter = enabled === 'true';
            filteredAgents = filteredAgents.filter(agent => {
                try {
                    const enhancedAgent = database.getAgentEnhanced(agent.name);
                    return enhancedAgent ? enhancedAgent.enabled === enabledFilter : enabledFilter === true;
                } catch (e) {
                    return enabledFilter === true; // Default to enabled for basic agents
                }
            });
        }

        // Enhance the response with role and capability information
        const enhancedResults = filteredAgents.map(agent => {
            try {
                const enhancedAgent = database.getAgentEnhanced(agent.name);
                return enhancedAgent || {
                    ...agent,
                    role: agent.settings?.role || 'assistant',
                    capabilities: agent.settings?.capabilities || {},
                    enabled: true
                };
            } catch (e) {
                return {
                    ...agent,
                    role: agent.settings?.role || 'assistant',
                    capabilities: agent.settings?.capabilities || {},
                    enabled: true
                };
            }
        });

        res.json({
            role: role,
            agents: enhancedResults,
            count: enhancedResults.length
        });
    } catch (error) {
        console.error('Error discovering agents by role:', error.message);
        res.status(500).json({ error: 'Failed to discover agents by role.', details: error.message });
    }
});

// Assign agent to workspace
router.post('/api/agents/:id/workspace/:workspaceId', async (req, res) => {
    const { id, workspaceId } = req.params;
    const { role } = req.body;

    if (!id || !workspaceId) {
        return res.status(400).json({ error: 'Agent ID and workspace ID are required' });
    }

    try {
        // Verify agent exists
        const agent = database.getAgent(id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Verify workspace exists
        const workspace = database.getWorkspace(workspaceId);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Add agent to workspace with specified role
        const workspaceRole = role || 'participant';
        const result = database.addAgentToWorkspace(workspaceId, agent.id, workspaceRole);

        res.json({
            success: true,
            message: `Agent '${agent.name}' assigned to workspace '${workspace.name}' with role '${workspaceRole}'`,
            assignment: {
                agentId: agent.id,
                agentName: agent.name,
                workspaceId: workspaceId,
                workspaceName: workspace.name,
                role: workspaceRole
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error assigning agent to workspace:', error.message);
        res.status(500).json({ error: 'Failed to assign agent to workspace.', details: error.message });
    }
});

// Get available agents for assignment
router.get('/api/agents/available', async (req, res) => {
    const { workspaceId, role, excludeAssigned } = req.query;

    try {
        let availableAgents = database.getAllAgents();

        // If workspaceId specified and excludeAssigned is true, exclude already assigned agents
        if (workspaceId && excludeAssigned === 'true') {
            const assignedAgents = database.getWorkspaceAgents(workspaceId);
            const assignedAgentIds = assignedAgents.map(wa => wa.agentId);
            availableAgents = availableAgents.filter(agent => !assignedAgentIds.includes(agent.id));
        }

        // Filter by role if specified
        if (role) {
            availableAgents = availableAgents.filter(agent => {
                try {
                    const enhancedAgent = database.getAgentEnhanced(agent.name);
                    return enhancedAgent && enhancedAgent.role === role;
                } catch (e) {
                    return agent.settings && agent.settings.role === role;
                }
            });
        }

        // Enhance agents with collaboration data
        const enhancedAgents = availableAgents.map(agent => {
            try {
                const enhancedAgent = database.getAgentEnhanced(agent.name);
                return enhancedAgent || {
                    ...agent,
                    role: agent.settings?.role || 'assistant',
                    capabilities: agent.settings?.capabilities || {},
                    enabled: true
                };
            } catch (e) {
                return {
                    ...agent,
                    role: agent.settings?.role || 'assistant',
                    capabilities: agent.settings?.capabilities || {},
                    enabled: true
                };
            }
        });

        // Filter out disabled agents
        const enabledAgents = enhancedAgents.filter(agent => agent.enabled);

        res.json({
            agents: enabledAgents,
            count: enabledAgents.length,
            filters: {
                workspaceId: workspaceId || null,
                role: role || null,
                excludeAssigned: excludeAssigned === 'true'
            }
        });
    } catch (error) {
        console.error('Error getting available agents:', error.message);
        res.status(500).json({ error: 'Failed to get available agents.', details: error.message });
    }
});

// Update agent collaboration status
router.put('/api/agents/:id/status', async (req, res) => {
    const { id } = req.params;
    const { enabled, capabilities } = req.body;

    if (enabled === undefined && !capabilities) {
        return res.status(400).json({ error: 'At least one field (enabled, capabilities) is required' });
    }

    try {
        // Get existing agent
        const existingAgent = database.getAgent(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Get enhanced agent data if available
        let enhancedAgent;
        try {
            enhancedAgent = database.getAgentEnhanced(existingAgent.name);
        } catch (e) {
            enhancedAgent = null;
        }

        // Prepare updated agent data
        const updatedAgent = {
            name: existingAgent.name,
            provider: existingAgent.provider,
            model: existingAgent.model,
            settings: existingAgent.settings,
            role: enhancedAgent?.role || existingAgent.settings?.role || 'assistant',
            capabilities: capabilities !== undefined ? capabilities : (enhancedAgent?.capabilities || existingAgent.settings?.capabilities || {}),
            enabled: enabled !== undefined ? enabled : (enhancedAgent?.enabled !== undefined ? enhancedAgent.enabled : true)
        };

        // Save updated agent using enhanced function
        database.saveAgentEnhanced(updatedAgent);

        res.json({
            success: true,
            message: `Agent '${existingAgent.name}' status updated successfully`,
            agent: {
                id: existingAgent.id,
                name: existingAgent.name,
                enabled: updatedAgent.enabled,
                capabilities: updatedAgent.capabilities,
                role: updatedAgent.role
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating agent status:', error.message);
        res.status(500).json({ error: 'Failed to update agent status.', details: error.message });
    }
});

// Get agents assigned to workspace
router.get('/api/workspaces/:id/agents', async (req, res) => {
    const { id } = req.params;
    const { role } = req.query;

    try {
        // Verify workspace exists
        const workspace = database.getWorkspace(id);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Get agents assigned to workspace
        let workspaceAgents = database.getWorkspaceAgents(id);

        // Filter by role if specified
        if (role) {
            workspaceAgents = workspaceAgents.filter(wa => wa.role === role);
        }

        // Enhance agent data with collaboration information
        const enhancedWorkspaceAgents = workspaceAgents.map(wa => {
            try {
                const enhancedAgent = database.getAgentEnhanced(wa.agent.name);
                return {
                    ...wa,
                    agent: enhancedAgent ? {
                        ...wa.agent,
                        role: enhancedAgent.role,
                        capabilities: enhancedAgent.capabilities,
                        enabled: enhancedAgent.enabled
                    } : wa.agent
                };
            } catch (e) {
                return wa;
            }
        });

        res.json({
            workspace: {
                id: workspace.id,
                name: workspace.name,
                description: workspace.description
            },
            agents: enhancedWorkspaceAgents,
            count: enhancedWorkspaceAgents.length,
            filters: {
                role: role || null
            }
        });
    } catch (error) {
        console.error('Error getting workspace agents:', error.message);
        res.status(500).json({ error: 'Failed to get workspace agents.', details: error.message });
    }
});

// Remove agent from workspace
router.delete('/api/agents/:id/workspace/:workspaceId', async (req, res) => {
    const { id, workspaceId } = req.params;

    try {
        // Verify agent exists
        const agent = database.getAgent(id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Verify workspace exists
        const workspace = database.getWorkspace(workspaceId);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Remove agent from workspace
        const result = database.removeAgentFromWorkspace(workspaceId, agent.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Agent not assigned to this workspace' });
        }

        res.json({
            success: true,
            message: `Agent '${agent.name}' removed from workspace '${workspace.name}'`,
            removal: {
                agentId: agent.id,
                agentName: agent.name,
                workspaceId: workspaceId,
                workspaceName: workspace.name
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error removing agent from workspace:', error.message);
        res.status(500).json({ error: 'Failed to remove agent from workspace.', details: error.message });
    }
});

// Execute agent for multi-agent collaboration
router.post('/api/agents/execute', async (req, res) => {
    const { agentId, message, context, model, provider } = req.body;

    if (!agentId || !message) {
        return res.status(400).json({ error: 'Agent ID and message are required' });
    }

    try {
        // Get agent details
        const agent = database.getAgent(agentId);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Use agent's model/provider or override with provided values
        const useModel = model || agent.model;
        const useProvider = provider || agent.provider;

        // Prepare messages with agent's system prompt
        const messages = [];
        
        // Add system message if agent has one
        if (agent.settings?.system_prompt || agent.systemMessage) {
            messages.push({
                role: 'system',
                content: agent.settings?.system_prompt || agent.systemMessage || 'You are a helpful AI assistant.'
            });
        }

        // Add context if provided
        if (context) {
            messages.push({
                role: 'system',
                content: `Context: ${JSON.stringify(context)}`
            });
        }

        // Add the user message
        messages.push({
            role: 'user',
            content: message
        });

        // Route to appropriate provider
        const { handleOpenAI } = require('../providers/openai');
        const { handleAnthropic } = require('../providers/anthropic');
        const { handleOpenRouter } = require('../providers/openrouter');
        const { handleOllama } = require('../providers/ollama');

        let completion;
        const modelParams = {
            temperature: agent.settings?.temperature || 0.7,
            max_tokens: agent.settings?.max_tokens || 2000
        };

        switch (useProvider) {
            case 'openai':
                completion = await handleOpenAI(messages, useModel, {}, modelParams);
                break;
            case 'anthropic':
                completion = await handleAnthropic(messages, useModel, {}, modelParams);
                break;
            case 'openrouter':
                completion = await handleOpenRouter(messages, useModel, {}, modelParams);
                break;
            case 'ollama':
                completion = await handleOllama(messages, useModel, {}, modelParams);
                break;
            default:
                return res.status(400).json({ error: 'Unsupported provider' });
        }

        const responseContent = completion.choices?.[0]?.message?.content || '';

        res.json({
            success: true,
            message: responseContent,
            agent: {
                id: agent.id,
                name: agent.name,
                role: agent.role || 'assistant'
            },
            requiresReview: false, // Could be enhanced with content analysis
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error executing agent:', error.message);
        res.status(500).json({ 
            error: 'Failed to execute agent', 
            details: error.message 
        });
    }
});

// ===== TESTBENCH AGENT SYSTEM-LEVEL ENDPOINTS =====

// Create agent with system-level capabilities
router.post('/api/agents/testbench/create-system', async (req, res) => {
    const { agentId, agentConfig, systemCapabilities = {} } = req.body;

    if (!agentId || !agentConfig) {
        return res.status(400).json({ error: 'TestBench agent ID and agent configuration are required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasSystemCreatePermission = database.hasPermission('testbench', 'agent', 'management', 'create');
        if (!hasSystemCreatePermission) {
            return res.status(403).json({ error: 'TestBench agent lacks system-level agent creation permissions.' });
        }

        // Enhanced agent with system capabilities
        const enhancedAgent = {
            name: agentConfig.name,
            provider: agentConfig.provider || 'gpt-4o',
            model: agentConfig.model || 'gpt-4o',
            settings: {
                temperature: agentConfig.settings?.temperature || 0.3,
                max_tokens: agentConfig.settings?.max_tokens || 4000,
                system_prompt: agentConfig.settings?.system_prompt || 'You are an AI assistant with advanced capabilities.',
                ...agentConfig.settings
            },
            role: agentConfig.role || 'specialist',
            capabilities: {
                messaging: true,
                collaboration: true,
                system_access: systemCapabilities.system_access || false,
                agent_creation: systemCapabilities.agent_creation || false,
                workspace_management: systemCapabilities.workspace_management || false,
                knowledge_management: systemCapabilities.knowledge_management || false,
                feature_testing: systemCapabilities.feature_testing || false,
                system_monitoring: systemCapabilities.system_monitoring || false,
                ...agentConfig.capabilities
            },
            enabled: agentConfig.enabled !== undefined ? agentConfig.enabled : true
        };

        // Special system prompt for TestBench agents
        if (enhancedAgent.role === 'testbench') {
            enhancedAgent.settings.system_prompt = 'You are a TestBench Agent with system-level capabilities. You can modify settings, create agents and workspaces, provision knowledge bases, implement and test features, and control system functions. Always prioritize safety and maintain detailed audit logs of your actions.';
        }

        const result = database.saveAgentEnhanced(enhancedAgent);

        // Log the system-level creation
        database.logTestBenchAction(
            agentId,
            'system_agent_create',
            'agent',
            result.lastInsertRowid,
            {
                agentName: enhancedAgent.name,
                agentRole: enhancedAgent.role,
                systemCapabilities: Object.keys(systemCapabilities).filter(k => systemCapabilities[k])
            },
            true,
            null,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            success: true,
            message: `System-level agent '${enhancedAgent.name}' created successfully`,
            agent: {
                id: result.lastInsertRowid,
                name: enhancedAgent.name,
                role: enhancedAgent.role,
                provider: enhancedAgent.provider,
                model: enhancedAgent.model,
                capabilities: enhancedAgent.capabilities,
                enabled: enhancedAgent.enabled
            },
            systemCapabilities: Object.keys(systemCapabilities).filter(k => systemCapabilities[k]),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'system_agent_create', 'agent', 'unknown',
            { agentConfig, systemCapabilities }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error creating system-level agent:', error.message);
        res.status(500).json({ error: 'Failed to create system-level agent.', details: error.message });
    }
});

// Get agent capability matrix
router.get('/api/agents/testbench/capabilities', async (req, res) => {
    const { agentId } = req.query;

    if (!agentId) {
        return res.status(400).json({ error: 'TestBench agent ID is required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        // Get all agents and their capabilities
        const agents = database.getAllAgents();
        const capabilityMatrix = [];

        for (const agent of agents) {
            try {
                const enhancedAgent = database.getAgentEnhanced(agent.name);
                const capabilities = enhancedAgent ? enhancedAgent.capabilities : {};

                capabilityMatrix.push({
                    id: agent.id,
                    name: agent.name,
                    role: enhancedAgent?.role || 'assistant',
                    provider: agent.provider,
                    model: agent.model,
                    enabled: enhancedAgent?.enabled !== undefined ? enhancedAgent.enabled : true,
                    capabilities: {
                        messaging: capabilities.messaging || false,
                        collaboration: capabilities.collaboration || false,
                        system_access: capabilities.system_access || false,
                        agent_creation: capabilities.agent_creation || false,
                        workspace_management: capabilities.workspace_management || false,
                        knowledge_management: capabilities.knowledge_management || false,
                        feature_testing: capabilities.feature_testing || false,
                        system_monitoring: capabilities.system_monitoring || false
                    },
                    systemLevel: enhancedAgent?.role === 'testbench'
                });
            } catch (e) {
                // Handle agents that don't have enhanced data
                capabilityMatrix.push({
                    id: agent.id,
                    name: agent.name,
                    role: 'assistant',
                    provider: agent.provider,
                    model: agent.model,
                    enabled: true,
                    capabilities: {
                        messaging: false,
                        collaboration: false,
                        system_access: false,
                        agent_creation: false,
                        workspace_management: false,
                        knowledge_management: false,
                        feature_testing: false,
                        system_monitoring: false
                    },
                    systemLevel: false
                });
            }
        }

        // Calculate summary statistics
        const summary = {
            total: capabilityMatrix.length,
            enabled: capabilityMatrix.filter(a => a.enabled).length,
            testbench: capabilityMatrix.filter(a => a.role === 'testbench').length,
            systemCapable: capabilityMatrix.filter(a => a.capabilities.system_access).length,
            byRole: {}
        };

        // Count by role
        for (const agent of capabilityMatrix) {
            summary.byRole[agent.role] = (summary.byRole[agent.role] || 0) + 1;
        }

        database.logTestBenchAction(agentId, 'capability_matrix', 'agent', 'all',
            { totalAgents: summary.total, systemCapable: summary.systemCapable },
            true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            capabilities: capabilityMatrix,
            summary: summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'capability_matrix', 'agent', 'all',
            {}, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error getting agent capability matrix:', error.message);
        res.status(500).json({ error: 'Failed to get agent capability matrix.', details: error.message });
    }
});

// Validate agent configuration for system deployment
router.post('/api/agents/testbench/validate', async (req, res) => {
    const { agentId, agentConfig, validationType = 'standard' } = req.body;

    if (!agentId || !agentConfig) {
        return res.status(400).json({ error: 'TestBench agent ID and agent configuration are required' });
    }

    try {
        // Verify TestBench permissions
        const testbenchAgent = database.getAgentEnhanced(agentId);
        if (!testbenchAgent || testbenchAgent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            recommendations: [],
            securityChecks: [],
            performanceChecks: []
        };

        // Basic validation
        if (!agentConfig.name || agentConfig.name.length < 3) {
            validation.errors.push('Agent name must be at least 3 characters long');
            validation.valid = false;
        }

        if (!agentConfig.provider) {
            validation.errors.push('Provider is required');
            validation.valid = false;
        }

        if (!agentConfig.model) {
            validation.errors.push('Model is required');
            validation.valid = false;
        }

        // Settings validation
        if (agentConfig.settings) {
            if (agentConfig.settings.temperature !== undefined) {
                if (agentConfig.settings.temperature < 0 || agentConfig.settings.temperature > 2) {
                    validation.errors.push('Temperature must be between 0 and 2');
                    validation.valid = false;
                }
            }

            if (agentConfig.settings.max_tokens !== undefined) {
                if (agentConfig.settings.max_tokens < 1 || agentConfig.settings.max_tokens > 32000) {
                    validation.warnings.push('Max tokens should be between 1 and 32000 for optimal performance');
                }
            }
        }

        // Role validation
        if (agentConfig.role) {
            const validRoles = ['orchestrator', 'specialist', 'reviewer', 'coder', 'researcher', 'analyst', 'writer', 'assistant', 'testbench'];
            if (!validRoles.includes(agentConfig.role)) {
                validation.errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
                validation.valid = false;
            }

            // TestBench role security check
            if (agentConfig.role === 'testbench') {
                validation.securityChecks.push('TestBench role detected - requires elevated security clearance');
                if (validationType !== 'system') {
                    validation.warnings.push('TestBench role should use system validation type');
                }
            }
        }

        // Capabilities validation
        if (agentConfig.capabilities) {
            const systemCapabilities = [
                'system_access', 'agent_creation', 'workspace_management',
                'knowledge_management', 'feature_testing', 'system_monitoring'
            ];

            const hasSystemCapabilities = systemCapabilities.some(cap => agentConfig.capabilities[cap]);

            if (hasSystemCapabilities) {
                validation.securityChecks.push('System-level capabilities detected');

                if (agentConfig.role !== 'testbench') {
                    validation.warnings.push('System capabilities typically require TestBench role');
                }
            }
        }

        // Performance checks
        if (agentConfig.provider === 'openai' && agentConfig.model?.includes('gpt-4')) {
            validation.performanceChecks.push('GPT-4 model selected - optimal for complex tasks');
        }

        if (agentConfig.provider === 'anthropic' && agentConfig.model?.includes('claude')) {
            validation.performanceChecks.push('Claude model selected - excellent for analysis and reasoning');
        }

        // Recommendations
        if (validation.valid) {
            validation.recommendations.push('Configuration appears valid and ready for deployment');

            if (agentConfig.role === 'testbench') {
                validation.recommendations.push('Consider enabling audit logging for TestBench operations');
                validation.recommendations.push('Ensure backup procedures are in place before deployment');
            }
        }

        database.logTestBenchAction(agentId, 'agent_validate', 'agent', agentConfig.name || 'unknown',
            { valid: validation.valid, errors: validation.errors.length },
            true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            validation: validation,
            agentName: agentConfig.name,
            validationType: validationType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        database.logTestBenchAction(agentId, 'agent_validate', 'agent', agentConfig.name || 'unknown',
            { agentConfig }, false, error.message, req.ip, req.get('User-Agent'));

        console.error('Error validating agent configuration:', error.message);
        res.status(500).json({ error: 'Failed to validate agent configuration.', details: error.message });
    }
});

module.exports = router;
