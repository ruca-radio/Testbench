/**
 * Multi-Agent Collaboration API Routes
 * Handles workspace management, agent communication, and task orchestration
 */

const express = require('express');
const router = express.Router();
const database = require('../database');
const collaborationEngine = require('../services/collaborationEngine');

// Workspace Management

/**
 * Create a new workspace
 * POST /api/collaboration/workspaces
 */
router.post('/workspaces', async (req, res) => {
    console.log('POST /workspaces route reached');
    console.log('Request body:', req.body);

    try {
        const { name, description, metadata = {} } = req.body;

        console.log('Extracted data:', { name, description, metadata });

        if (!name) {
            console.log('Name validation failed');
            return res.status(400).json({ error: 'Workspace name is required' });
        }

        // Check if workspace with this name already exists
        const existingWorkspaces = await database.getAllWorkspaces();
        const nameExists = existingWorkspaces.some(ws => ws.name === name);

        if (nameExists) {
            console.log(`Workspace name conflict: ${name}`);
            return res.status(409).json({
                error: 'Workspace name already exists',
                details: `A workspace named "${name}" already exists. Please choose a different name.`
            });
        }

        const workspaceData = {
            name: name,
            description: description || null,
            config: metadata || {},
            thumbnail: null,
            isDefault: 0
        };

        console.log('Calling database.createWorkspace with:', workspaceData);

        const result = database.createWorkspace(workspaceData);

        console.log('Database result:', result);

        // Get the created workspace
        const workspace = database.getWorkspace(result.lastInsertRowid);
        console.log('Retrieved workspace:', workspace);

        res.json(workspace);
    } catch (error) {
        console.error('Error creating workspace:', error);
        console.error('Full error stack:', error.stack);

        // Handle specific SQLite constraint errors
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                error: 'Workspace name already exists',
                details: 'A workspace with this name already exists. Please choose a different name.'
            });
        }

        res.status(500).json({
            error: 'Failed to create workspace',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * Get all workspaces
 * GET /api/collaboration/workspaces
 */
router.get('/workspaces', async (req, res) => {
    try {
        const workspaces = await database.getWorkspaces();
        res.json(workspaces);
    } catch (error) {
        console.error('Error getting workspaces:', error);
        res.status(500).json({ error: 'Failed to get workspaces' });
    }
});

/**
 * Get workspace by ID
 * GET /api/collaboration/workspaces/:id
 */
router.get('/workspaces/:id', async (req, res) => {
    try {
        const workspace = await database.getWorkspace(req.params.id);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        res.json(workspace);
    } catch (error) {
        console.error('Error getting workspace:', error);
        res.status(500).json({ error: 'Failed to get workspace' });
    }
});

/**
 * Update workspace
 * PUT /api/collaboration/workspaces/:id
 */
router.put('/workspaces/:id', async (req, res) => {
    try {
        const { name, description, metadata } = req.body;
        await database.updateWorkspace(req.params.id, name, description, metadata);

        const workspace = await database.getWorkspace(req.params.id);
        res.json(workspace);
    } catch (error) {
        console.error('Error updating workspace:', error);
        res.status(500).json({ error: 'Failed to update workspace' });
    }
});

/**
 * Delete workspace
 * DELETE /api/collaboration/workspaces/:id
 */
router.delete('/workspaces/:id', async (req, res) => {
    try {
        await database.deleteWorkspace(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting workspace:', error);
        res.status(500).json({ error: 'Failed to delete workspace' });
    }
});

// Agent Management in Workspaces

/**
 * Add agent to workspace
 * POST /api/collaboration/workspaces/:id/agents
 */
router.post('/workspaces/:id/agents', async (req, res) => {
    try {
        const { agentId, role = 'participant', tools = [] } = req.body;

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        await database.addAgentToWorkspace(req.params.id, agentId, role, tools);
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding agent to workspace:', error);
        res.status(500).json({ error: 'Failed to add agent to workspace' });
    }
});

/**
 * Get agents in workspace
 * GET /api/collaboration/workspaces/:id/agents
 */
router.get('/workspaces/:id/agents', async (req, res) => {
    try {
        const agents = await database.getWorkspaceAgents(req.params.id);
        res.json(agents);
    } catch (error) {
        console.error('Error getting workspace agents:', error);
        res.status(500).json({ error: 'Failed to get workspace agents' });
    }
});

/**
 * Remove agent from workspace
 * DELETE /api/collaboration/workspaces/:workspaceId/agents/:agentId
 */
router.delete('/workspaces/:workspaceId/agents/:agentId', async (req, res) => {
    try {
        await database.removeAgentFromWorkspace(req.params.workspaceId, req.params.agentId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing agent from workspace:', error);
        res.status(500).json({ error: 'Failed to remove agent from workspace' });
    }
});

// Conversation Management

/**
 * Create a new agent conversation
 * POST /api/collaboration/conversations
 */
router.post('/conversations', async (req, res) => {
    try {
        const { workspaceId, participants, orchestratorId } = req.body;

        if (!workspaceId || !participants || !Array.isArray(participants)) {
            return res.status(400).json({
                error: 'Workspace ID and participants array are required'
            });
        }

        const conversation = await collaborationEngine.createConversation(
            workspaceId,
            participants,
            orchestratorId
        );
        res.json(conversation);
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

/**
 * Get conversations in workspace
 * GET /api/collaboration/workspaces/:id/conversations
 */
router.get('/workspaces/:id/conversations', async (req, res) => {
    try {
        const conversations = await database.getAgentConversations(req.params.id);
        res.json(conversations);
    } catch (error) {
        console.error('Error getting conversations:', error);
        res.status(500).json({ error: 'Failed to get conversations' });
    }
});

/**
 * Get conversation by ID
 * GET /api/collaboration/conversations/:id
 */
router.get('/conversations/:id', async (req, res) => {
    try {
        const conversation = await database.getAgentConversation(req.params.id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json(conversation);
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({ error: 'Failed to get conversation' });
    }
});

// Message Management

/**
 * Send a message in a conversation
 * POST /api/collaboration/conversations/:id/messages
 */
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { fromAgentId, toAgentId, messageType, content, parentMessageId } = req.body;

        if (!fromAgentId || !messageType || !content) {
            return res.status(400).json({
                error: 'From agent ID, message type, and content are required'
            });
        }

        const message = await collaborationEngine.sendMessage(
            req.params.id,
            fromAgentId,
            toAgentId,
            messageType,
            content,
            parentMessageId
        );
        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * Get messages in a conversation
 * GET /api/collaboration/conversations/:id/messages
 */
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const messages = await database.getAgentMessages(
            req.params.id,
            limit ? parseInt(limit) : undefined,
            offset ? parseInt(offset) : undefined
        );
        res.json(messages);
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

/**
 * Get pending messages for an agent
 * GET /api/collaboration/agents/:id/messages
 */
router.get('/agents/:id/messages', async (req, res) => {
    try {
        const messages = collaborationEngine.getAgentMessages(req.params.id);
        res.json(messages);
    } catch (error) {
        console.error('Error getting agent messages:', error);
        res.status(500).json({ error: 'Failed to get agent messages' });
    }
});

// Task Management

/**
 * Assign a task
 * POST /api/collaboration/tasks
 */
router.post('/tasks', async (req, res) => {
    try {
        const { conversationId, assignerId, assigneeId, description, data } = req.body;

        if (!conversationId || !assignerId || !assigneeId || !description) {
            return res.status(400).json({
                error: 'Conversation ID, assigner ID, assignee ID, and description are required'
            });
        }

        const task = await collaborationEngine.assignTask(
            conversationId,
            assignerId,
            assigneeId,
            description,
            data || {}
        );
        res.json(task);
    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({ error: 'Failed to assign task' });
    }
});

/**
 * Update task status
 * PUT /api/collaboration/tasks/:id
 */
router.put('/tasks/:id', async (req, res) => {
    try {
        const { status, result } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const updatedTask = await collaborationEngine.updateTaskStatus(
            parseInt(req.params.id),
            status,
            result
        );
        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

/**
 * Get tasks for an agent
 * GET /api/collaboration/agents/:id/tasks
 */
router.get('/agents/:id/tasks', async (req, res) => {
    try {
        const { status } = req.query;
        let tasks;

        if (status) {
            // Get tasks from database with status filter
            const allTasks = await database.getAgentTasks(req.params.id);
            tasks = allTasks.filter(task => task.status === status);
        } else {
            // Get pending tasks from collaboration engine
            tasks = collaborationEngine.getAgentTasks(req.params.id);
        }

        res.json(tasks);
    } catch (error) {
        console.error('Error getting agent tasks:', error);
        res.status(500).json({ error: 'Failed to get agent tasks' });
    }
});

/**
 * Get tasks in a conversation
 * GET /api/collaboration/conversations/:id/tasks
 */
router.get('/conversations/:id/tasks', async (req, res) => {
    try {
        const tasks = await database.getConversationTasks(req.params.id);
        res.json(tasks);
    } catch (error) {
        console.error('Error getting conversation tasks:', error);
        res.status(500).json({ error: 'Failed to get conversation tasks' });
    }
});

// Context Management

/**
 * Set shared context in workspace
 * POST /api/collaboration/workspaces/:id/context
 */
router.post('/workspaces/:id/context', async (req, res) => {
    try {
        const { contextType, key, value, agentId } = req.body;

        if (!contextType || !key || value === undefined || !agentId) {
            return res.status(400).json({
                error: 'Context type, key, value, and agent ID are required'
            });
        }

        await collaborationEngine.setSharedContext(
            req.params.id,
            contextType,
            key,
            value,
            agentId
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error setting shared context:', error);
        res.status(500).json({ error: 'Failed to set shared context' });
    }
});

/**
 * Get shared context from workspace
 * GET /api/collaboration/workspaces/:id/context
 */
router.get('/workspaces/:id/context', async (req, res) => {
    try {
        const { contextType } = req.query;
        const context = await collaborationEngine.getSharedContext(
            req.params.id,
            contextType
        );
        res.json(context);
    } catch (error) {
        console.error('Error getting shared context:', error);
        res.status(500).json({ error: 'Failed to get shared context' });
    }
});

// Workflow Orchestration

/**
 * Start a workflow
 * POST /api/collaboration/workflows
 */
router.post('/workflows', async (req, res) => {
    try {
        const { workspaceId, workflowDefinition, orchestratorId } = req.body;

        if (!workspaceId || !workflowDefinition || !orchestratorId) {
            return res.status(400).json({
                error: 'Workspace ID, workflow definition, and orchestrator ID are required'
            });
        }

        const conversationId = await collaborationEngine.orchestrateWorkflow(
            workspaceId,
            workflowDefinition,
            orchestratorId
        );
        res.json({ conversationId, status: 'started' });
    } catch (error) {
        console.error('Error starting workflow:', error);
        res.status(500).json({ error: 'Failed to start workflow' });
    }
});

// Agent Response Processing

/**
 * Process agent response
 * POST /api/collaboration/agents/:id/response
 */
router.post('/agents/:id/response', async (req, res) => {
    try {
        const { conversationId, responseType, responseData } = req.body;

        if (!conversationId || !responseType || !responseData) {
            return res.status(400).json({
                error: 'Conversation ID, response type, and response data are required'
            });
        }

        await collaborationEngine.processAgentResponse(
            req.params.id,
            conversationId,
            responseType,
            responseData
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing agent response:', error);
        res.status(500).json({ error: 'Failed to process agent response' });
    }
});

// Health and Status

/**
 * Get collaboration engine status
 * GET /api/collaboration/status
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            activeConversations: collaborationEngine.activeConversations.size,
            queuedMessages: Array.from(collaborationEngine.messageQueue.values())
                .reduce((total, queue) => total + queue.length, 0),
            queuedTasks: Array.from(collaborationEngine.taskQueue.values())
                .reduce((total, queue) => total + queue.length, 0),
            uptime: process.uptime()
        };
        res.json(status);
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

module.exports = router;
