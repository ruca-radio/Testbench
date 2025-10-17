const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

// Agent Swarm API endpoints

// Get all swarms
router.get('/api/agent-swarm/swarms', authenticate({ required: false }), async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const { includeTemplates = false } = req.query;
        
        let query = `
            SELECT * FROM agent_swarms 
            WHERE (user_id = ? OR user_id IS NULL)
        `;
        
        if (!includeTemplates) {
            query += ` AND id NOT LIKE 'template-%'`;
        }
        
        query += ` ORDER BY created DESC`;
        
        const getSwarms = db.prepare(query);
        const swarms = getSwarms.all(userId);
        
        // Parse JSON fields
        swarms.forEach(swarm => {
            swarm.config = JSON.parse(swarm.config || '{}');
            swarm.metrics = JSON.parse(swarm.metrics || '{}');
        });
        
        res.json({ swarms });
        
    } catch (error) {
        console.error('Error fetching swarms:', error);
        res.status(500).json({ error: 'Failed to fetch swarms' });
    }
});

// Create new swarm
router.post('/api/agent-swarm/swarms', authenticate({ required: false }), async (req, res) => {
    try {
        const {
            name, description, maxAgents = 5, distributionStrategy = 'auto',
            communicationMode = 'broadcast', autoSpawn = true, autoDecompose = true,
            config = {}
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Swarm name is required' });
        }
        
        const swarmId = `swarm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const now = new Date().toISOString();
        const userId = req.user?.id || null;
        
        const createSwarm = db.prepare(`
            INSERT INTO agent_swarms 
            (id, name, description, status, max_agents, distribution_strategy, communication_mode, 
             auto_spawn, auto_decompose, created, updated, user_id, config, metrics)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const initialMetrics = {
            totalTasks: 0,
            completedTasks: 0,
            activeTasks: 0,
            efficiency: 0,
            avgResponseTime: 0,
            activeAgents: 0
        };
        
        createSwarm.run(
            swarmId, name, description, 'inactive', maxAgents,
            distributionStrategy, communicationMode, autoSpawn ? 1 : 0,
            autoDecompose ? 1 : 0, now, now, userId,
            JSON.stringify(config), JSON.stringify(initialMetrics)
        );
        
        res.json({
            success: true,
            swarm: {
                id: swarmId,
                name,
                description,
                status: 'inactive',
                created: now
            }
        });
        
    } catch (error) {
        console.error('Error creating swarm:', error);
        res.status(500).json({ error: 'Failed to create swarm' });
    }
});

// Get specific swarm details
router.get('/api/agent-swarm/swarms/:swarmId', authenticate({ required: false }), async (req, res) => {
    try {
        const { swarmId } = req.params;
        const userId = req.user?.id || null;
        
        const getSwarm = db.prepare(`
            SELECT * FROM agent_swarms 
            WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        `);
        
        const swarm = getSwarm.get(swarmId, userId);
        
        if (!swarm) {
            return res.status(404).json({ error: 'Swarm not found' });
        }
        
        // Get associated agents
        const getAgents = db.prepare(`
            SELECT * FROM swarm_agents WHERE swarm_id = ? ORDER BY created
        `);
        const agents = getAgents.all(swarmId);
        
        // Get recent tasks
        const getTasks = db.prepare(`
            SELECT * FROM swarm_tasks WHERE swarm_id = ? ORDER BY created DESC LIMIT 20
        `);
        const tasks = getTasks.all(swarmId);
        
        // Parse JSON fields
        swarm.config = JSON.parse(swarm.config || '{}');
        swarm.metrics = JSON.parse(swarm.metrics || '{}');
        
        agents.forEach(agent => {
            agent.capabilities = JSON.parse(agent.capabilities || '[]');
            agent.configuration = JSON.parse(agent.configuration || '{}');
        });
        
        tasks.forEach(task => {
            task.task_data = JSON.parse(task.task_data || '{}');
            task.result_data = JSON.parse(task.result_data || '{}');
            task.error_data = JSON.parse(task.error_data || '{}');
            task.dependencies = JSON.parse(task.dependencies || '[]');
            task.tags = JSON.parse(task.tags || '[]');
        });
        
        res.json({
            swarm,
            agents,
            tasks
        });
        
    } catch (error) {
        console.error('Error fetching swarm details:', error);
        res.status(500).json({ error: 'Failed to fetch swarm details' });
    }
});

// Start/Stop swarm
router.patch('/api/agent-swarm/swarms/:swarmId/status', authenticate({ required: false }), async (req, res) => {
    try {
        const { swarmId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id || null;
        
        if (!['active', 'inactive', 'paused'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const updateStatus = db.prepare(`
            UPDATE agent_swarms 
            SET status = ?, updated = ?
            WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        `);
        
        const result = updateStatus.run(status, new Date().toISOString(), swarmId, userId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Swarm not found' });
        }
        
        res.json({ success: true, status });
        
    } catch (error) {
        console.error('Error updating swarm status:', error);
        res.status(500).json({ error: 'Failed to update swarm status' });
    }
});

// Spawn agent
router.post('/api/agent-swarm/spawn', authenticate({ required: false }), async (req, res) => {
    try {
        const {
            swarmId, name, model, provider, specialization = 'general',
            capabilities = [], configuration = {}
        } = req.body;
        
        if (!swarmId || !name || !model || !provider) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check if swarm exists and has capacity
        const getSwarm = db.prepare('SELECT * FROM agent_swarms WHERE id = ?');
        const swarm = getSwarm.get(swarmId);
        
        if (!swarm) {
            return res.status(404).json({ error: 'Swarm not found' });
        }
        
        const getAgentCount = db.prepare('SELECT COUNT(*) as count FROM swarm_agents WHERE swarm_id = ?');
        const { count } = getAgentCount.get(swarmId);
        
        if (count >= swarm.max_agents) {
            return res.status(400).json({ error: 'Swarm has reached maximum agent capacity' });
        }
        
        const agentId = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const now = new Date().toISOString();
        
        const spawnAgent = db.prepare(`
            INSERT INTO swarm_agents 
            (id, swarm_id, name, model, provider, specialization, status, 
             tasks_completed, success_rate, avg_response_time, current_load,
             capabilities, configuration, created, last_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        spawnAgent.run(
            agentId, swarmId, name, model, provider, specialization, 'idle',
            0, 100.0, 0.0, 0,
            JSON.stringify(capabilities), JSON.stringify(configuration),
            now, now
        );
        
        // Log communication event
        logCommunication(swarmId, null, null, 'system', {
            event: 'agent_spawned',
            agentId: agentId,
            agentName: name,
            specialization: specialization
        });
        
        res.json({
            success: true,
            agent: {
                id: agentId,
                name,
                model,
                provider,
                specialization,
                status: 'idle',
                created: now
            }
        });
        
    } catch (error) {
        console.error('Error spawning agent:', error);
        res.status(500).json({ error: 'Failed to spawn agent' });
    }
});

// Terminate agent
router.delete('/api/agent-swarm/terminate/:agentId', authenticate({ required: false }), async (req, res) => {
    try {
        const { agentId } = req.params;
        
        // Get agent info before deletion
        const getAgent = db.prepare('SELECT * FROM swarm_agents WHERE id = ?');
        const agent = getAgent.get(agentId);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        // If agent has current task, reassign or fail it
        if (agent.current_task_id) {
            const updateTask = db.prepare(`
                UPDATE swarm_tasks 
                SET status = 'pending', assigned_agent_id = NULL, assigned_at = NULL
                WHERE id = ?
            `);
            updateTask.run(agent.current_task_id);
        }
        
        // Delete agent
        const deleteAgent = db.prepare('DELETE FROM swarm_agents WHERE id = ?');
        deleteAgent.run(agentId);
        
        // Log communication event
        logCommunication(agent.swarm_id, null, null, 'system', {
            event: 'agent_terminated',
            agentId: agentId,
            agentName: agent.name,
            reason: 'manual_termination'
        });
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error terminating agent:', error);
        res.status(500).json({ error: 'Failed to terminate agent' });
    }
});

// Get all tasks for a swarm
router.get('/api/agent-swarm/tasks', authenticate({ required: false }), async (req, res) => {
    try {
        const { swarmId, status, priority, limit = 50, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM swarm_tasks WHERE 1=1';
        const params = [];
        
        if (swarmId) {
            query += ' AND swarm_id = ?';
            params.push(swarmId);
        }
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (priority) {
            query += ' AND priority = ?';
            params.push(priority);
        }
        
        query += ' ORDER BY created DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const getTasks = db.prepare(query);
        const tasks = getTasks.all(...params);
        
        // Parse JSON fields
        tasks.forEach(task => {
            task.task_data = JSON.parse(task.task_data || '{}');
            task.result_data = JSON.parse(task.result_data || '{}');
            task.error_data = JSON.parse(task.error_data || '{}');
            task.dependencies = JSON.parse(task.dependencies || '[]');
            task.tags = JSON.parse(task.tags || '[]');
        });
        
        res.json({ tasks });
        
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create new task
router.post('/api/agent-swarm/tasks', authenticate({ required: false }), async (req, res) => {
    try {
        const {
            swarmId, title, description, priority = 'normal', specialization = 'general',
            estimatedTime, taskData = {}, dependencies = [], tags = []
        } = req.body;
        
        if (!swarmId || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const now = new Date().toISOString();
        
        const createTask = db.prepare(`
            INSERT INTO swarm_tasks 
            (id, swarm_id, title, description, priority, specialization, status,
             estimated_time, progress, retries, max_retries, created,
             task_data, dependencies, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        createTask.run(
            taskId, swarmId, title, description, priority, specialization, 'pending',
            estimatedTime, 0, 0, 3, now,
            JSON.stringify(taskData), JSON.stringify(dependencies), JSON.stringify(tags)
        );
        
        // Update swarm metrics
        updateSwarmMetrics(swarmId);
        
        res.json({
            success: true,
            task: {
                id: taskId,
                title,
                description,
                priority,
                status: 'pending',
                created: now
            }
        });
        
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task status
router.patch('/api/agent-swarm/tasks/:taskId/status', authenticate({ required: false }), async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, progress, resultData, errorData } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        
        const now = new Date().toISOString();
        let updateFields = 'status = ?, updated = ?';
        let updateParams = [status, now];
        
        // Add status-specific timestamps
        if (status === 'in_progress' && !progress) {
            updateFields += ', started_at = ?';
            updateParams.push(now);
        } else if (status === 'completed') {
            updateFields += ', completed_at = ?, progress = 100';
            updateParams.push(now);
        }
        
        // Add optional fields
        if (progress !== undefined) {
            updateFields += ', progress = ?';
            updateParams.push(progress);
        }
        
        if (resultData) {
            updateFields += ', result_data = ?';
            updateParams.push(JSON.stringify(resultData));
        }
        
        if (errorData) {
            updateFields += ', error_data = ?';
            updateParams.push(JSON.stringify(errorData));
        }
        
        updateParams.push(taskId);
        
        const updateTask = db.prepare(`
            UPDATE swarm_tasks SET ${updateFields} WHERE id = ?
        `);
        
        const result = updateTask.run(...updateParams);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Get updated task
        const getTask = db.prepare('SELECT * FROM swarm_tasks WHERE id = ?');
        const task = getTask.get(taskId);
        
        // Update agent status if needed
        if (task.assigned_agent_id) {
            if (status === 'completed' || status === 'failed') {
                const updateAgent = db.prepare(`
                    UPDATE swarm_agents 
                    SET status = 'idle', current_task_id = NULL, last_active = ?
                    WHERE id = ?
                `);
                updateAgent.run(now, task.assigned_agent_id);
                
                if (status === 'completed') {
                    const incrementCompleted = db.prepare(`
                        UPDATE swarm_agents 
                        SET tasks_completed = tasks_completed + 1
                        WHERE id = ?
                    `);
                    incrementCompleted.run(task.assigned_agent_id);
                }
            }
        }
        
        // Update swarm metrics
        updateSwarmMetrics(task.swarm_id);
        
        res.json({ success: true, task });
        
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Failed to update task status' });
    }
});

// Task decomposition endpoint
router.post('/api/agent-swarm/decompose', authenticate({ required: false }), async (req, res) => {
    try {
        const { taskDescription, specialization, maxSubtasks = 5 } = req.body;
        
        if (!taskDescription) {
            return res.status(400).json({ error: 'Task description is required' });
        }
        
        // Use AI to decompose the task (simplified implementation)
        const decompositionPrompt = `
            Decompose the following task into ${maxSubtasks} or fewer specific, actionable subtasks.
            Consider the specialization: ${specialization}
            
            Task: ${taskDescription}
            
            Return a JSON array of subtasks, each with:
            - title: Brief title for the subtask
            - description: Detailed description
            - specialization: Best agent type for this subtask
            - estimatedTime: Estimated time in minutes
            - priority: urgent, high, normal, or low
            
            Example format:
            [
                {
                    "title": "Research Phase",
                    "description": "Gather information about...",
                    "specialization": "research",
                    "estimatedTime": 30,
                    "priority": "high"
                }
            ]
        `;
        
        // Make request to chat endpoint for decomposition
        const response = await fetch(`${req.protocol}://${req.get('host')}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: decompositionPrompt }],
                model: 'gpt-4o',
                provider: 'openai'
            })
        });
        
        if (!response.ok) {
            throw new Error('Decomposition request failed');
        }
        
        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || '';
        
        // Try to parse JSON from AI response
        let subtasks = [];
        try {
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                subtasks = JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.error('Failed to parse AI decomposition response:', parseError);
            // Fallback: create basic subtasks
            subtasks = [
                {
                    title: "Initial Analysis",
                    description: taskDescription.substring(0, 200) + "...",
                    specialization: specialization,
                    estimatedTime: 30,
                    priority: "normal"
                }
            ];
        }
        
        res.json({ subtasks });
        
    } catch (error) {
        console.error('Error decomposing task:', error);
        res.status(500).json({ error: 'Failed to decompose task' });
    }
});

// Execute task on agent
router.post('/api/agent-swarm/execute', authenticate({ required: false }), async (req, res) => {
    try {
        const { agentId, task, swarmId } = req.body;
        
        if (!agentId || !task) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Get agent details
        const getAgent = db.prepare('SELECT * FROM swarm_agents WHERE id = ?');
        const agent = getAgent.get(agentId);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        const now = new Date().toISOString();
        
        // Update task assignment
        const assignTask = db.prepare(`
            UPDATE swarm_tasks 
            SET assigned_agent_id = ?, status = 'assigned', assigned_at = ?
            WHERE id = ?
        `);
        assignTask.run(agentId, now, task.id);
        
        // Update agent status
        const updateAgent = db.prepare(`
            UPDATE swarm_agents 
            SET status = 'working', current_task_id = ?, last_active = ?
            WHERE id = ?
        `);
        updateAgent.run(task.id, now, agentId);
        
        // Log communication
        logCommunication(swarmId, null, agentId, 'task_assignment', {
            taskId: task.id,
            taskDescription: task.description,
            priority: task.priority
        });
        
        // Simulate task execution (in real implementation, this would queue actual work)
        setTimeout(() => {
            simulateTaskExecution(task.id, agentId);
        }, 1000);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error executing task:', error);
        res.status(500).json({ error: 'Failed to execute task' });
    }
});

// Get swarm communications
router.get('/api/agent-swarm/:swarmId/communications', authenticate({ required: false }), async (req, res) => {
    try {
        const { swarmId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const getCommunications = db.prepare(`
            SELECT * FROM swarm_communications 
            WHERE swarm_id = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `);
        
        const communications = getCommunications.all(swarmId, parseInt(limit), parseInt(offset));
        
        // Parse message content
        communications.forEach(comm => {
            comm.message_content = JSON.parse(comm.message_content || '{}');
        });
        
        res.json({ communications });
        
    } catch (error) {
        console.error('Error fetching communications:', error);
        res.status(500).json({ error: 'Failed to fetch communications' });
    }
});

// Helper functions

function logCommunication(swarmId, fromAgentId, toAgentId, messageType, messageContent, taskId = null) {
    const logComm = db.prepare(`
        INSERT INTO swarm_communications 
        (swarm_id, from_agent_id, to_agent_id, message_type, message_content, task_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    logComm.run(
        swarmId, fromAgentId, toAgentId, messageType,
        JSON.stringify(messageContent), taskId, new Date().toISOString()
    );
}

function updateSwarmMetrics(swarmId) {
    try {
        // Get current task counts
        const getTaskCounts = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status IN ('assigned', 'in_progress') THEN 1 ELSE 0 END) as active
            FROM swarm_tasks WHERE swarm_id = ?
        `);
        
        const taskCounts = getTaskCounts.get(swarmId);
        
        // Get agent count
        const getAgentCount = db.prepare(`
            SELECT COUNT(*) as count FROM swarm_agents WHERE swarm_id = ?
        `);
        const agentCount = getAgentCount.get(swarmId);
        
        // Calculate efficiency
        const efficiency = taskCounts.total > 0 ? Math.round((taskCounts.completed / taskCounts.total) * 100) : 0;
        
        const metrics = {
            totalTasks: taskCounts.total,
            completedTasks: taskCounts.completed,
            activeTasks: taskCounts.active,
            efficiency: efficiency,
            activeAgents: agentCount.count,
            lastUpdated: new Date().toISOString()
        };
        
        // Update swarm metrics
        const updateMetrics = db.prepare(`
            UPDATE agent_swarms SET metrics = ?, updated = ? WHERE id = ?
        `);
        updateMetrics.run(JSON.stringify(metrics), new Date().toISOString(), swarmId);
        
    } catch (error) {
        console.error('Error updating swarm metrics:', error);
    }
}

async function simulateTaskExecution(taskId, agentId) {
    // This is a simulation - in real implementation, this would integrate with actual AI models
    try {
        // Simulate some processing time
        const processingTime = Math.random() * 10000 + 5000; // 5-15 seconds
        
        setTimeout(() => {
            const success = Math.random() > 0.1; // 90% success rate
            const now = new Date().toISOString();
            
            if (success) {
                // Complete task successfully
                const updateTask = db.prepare(`
                    UPDATE swarm_tasks 
                    SET status = 'completed', progress = 100, completed_at = ?
                    WHERE id = ?
                `);
                updateTask.run(now, taskId);
                
                // Update agent
                const updateAgent = db.prepare(`
                    UPDATE swarm_agents 
                    SET status = 'idle', current_task_id = NULL, last_active = ?,
                        tasks_completed = tasks_completed + 1
                    WHERE id = ?
                `);
                updateAgent.run(now, agentId);
                
            } else {
                // Task failed
                const updateTask = db.prepare(`
                    UPDATE swarm_tasks 
                    SET status = 'failed', error_data = ?
                    WHERE id = ?
                `);
                updateTask.run(JSON.stringify({ error: 'Simulated task failure', timestamp: now }), taskId);
                
                // Update agent
                const updateAgent = db.prepare(`
                    UPDATE swarm_agents 
                    SET status = 'idle', current_task_id = NULL, last_active = ?
                    WHERE id = ?
                `);
                updateAgent.run(now, agentId);
            }
            
            // Get swarm ID for metrics update
            const getTask = db.prepare('SELECT swarm_id FROM swarm_tasks WHERE id = ?');
            const task = getTask.get(taskId);
            if (task) {
                updateSwarmMetrics(task.swarm_id);
            }
            
        }, processingTime);
        
    } catch (error) {
        console.error('Error in task simulation:', error);
    }
}

module.exports = router;