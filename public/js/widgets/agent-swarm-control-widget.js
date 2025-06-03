class AgentSwarmControlWidget extends BaseWidget {
    constructor(containerId, config = {}) {
        super(containerId, config);
        this.type = 'agent-swarm-control';
        this.name = config.title || 'Agent Swarm Control';
        this.maxAgents = config.maxAgents || 5;
        this.autoSpawn = config.autoSpawn !== false;
        this.taskQueue = config.taskQueue !== false;
        
        // Core state
        this.activeAgents = new Map(); // agentId -> agent config
        this.swarmMetrics = {
            totalTasks: 0,
            completedTasks: 0,
            activeTasks: 0,
            efficiency: 0,
            avgResponseTime: 0
        };
        this.taskQueue = [];
        this.isSwarmActive = false;
        
        this.init();
    }

    async init() {
        await this.loadAvailableAgents();
        this.render();
        this.setupEventListeners();
        this.startMetricsUpdate();
    }

    async loadAvailableAgents() {
        try {
            const response = await fetch('/api/agents');
            const data = await response.json();
            this.availableAgents = data.agents || [];
        } catch (error) {
            console.error('Failed to load agents:', error);
            this.availableAgents = [];
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="agent-swarm-control">
                <div class="swarm-header">
                    <div class="swarm-title">
                        <h3><i class="fas fa-robot"></i> Agent Swarm Control</h3>
                        <div class="swarm-status ${this.isSwarmActive ? 'active' : 'inactive'}">
                            <span class="status-indicator"></span>
                            ${this.isSwarmActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                    <div class="swarm-controls">
                        <button class="btn ${this.isSwarmActive ? 'btn-danger' : 'btn-success'}" id="toggleSwarm">
                            ${this.isSwarmActive ? 'Stop Swarm' : 'Start Swarm'}
                        </button>
                        <button class="btn btn-secondary" id="emergencyStop">
                            <i class="fas fa-stop"></i> Emergency Stop
                        </button>
                    </div>
                </div>

                <div class="swarm-metrics">
                    <div class="metric-card">
                        <div class="metric-value">${this.activeAgents.size}</div>
                        <div class="metric-label">Active Agents</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${this.swarmMetrics.activeTasks}</div>
                        <div class="metric-label">Active Tasks</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${this.swarmMetrics.completedTasks}</div>
                        <div class="metric-label">Completed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${this.swarmMetrics.efficiency}%</div>
                        <div class="metric-label">Efficiency</div>
                    </div>
                </div>

                <div class="task-input-section">
                    <div class="task-input-header">
                        <h4><i class="fas fa-tasks"></i> Task Assignment</h4>
                        <div class="task-mode-toggle">
                            <label>
                                <input type="checkbox" id="autoDecompose" ${this.autoSpawn ? 'checked' : ''}>
                                Auto-decompose complex tasks
                            </label>
                        </div>
                    </div>
                    <div class="task-input-form">
                        <textarea 
                            id="taskDescription" 
                            placeholder="Describe the task you want the agent swarm to complete. The system will automatically decompose complex tasks and assign them to specialized agents."
                            rows="3"
                        ></textarea>
                        <div class="task-options">
                            <select id="taskPriority">
                                <option value="normal">Normal Priority</option>
                                <option value="high">High Priority</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            <select id="taskSpecialization">
                                <option value="auto">Auto-select specialization</option>
                                <option value="research">Research & Analysis</option>
                                <option value="writing">Content Writing</option>
                                <option value="coding">Programming</option>
                                <option value="creative">Creative Tasks</option>
                                <option value="data">Data Processing</option>
                                <option value="planning">Planning & Strategy</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="assignTask">
                            <i class="fas fa-plus"></i> Assign Task to Swarm
                        </button>
                    </div>
                </div>

                <div class="agent-management">
                    <div class="section-header">
                        <h4><i class="fas fa-users"></i> Agent Management</h4>
                        <div class="agent-actions">
                            <button class="btn btn-sm btn-secondary" id="spawnAgent">
                                <i class="fas fa-plus"></i> Spawn Agent
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" id="configureAgents">
                                <i class="fas fa-cog"></i> Configure
                            </button>
                        </div>
                    </div>
                    
                    <div class="active-agents-grid" id="activeAgentsGrid">
                        ${this.renderActiveAgents()}
                    </div>
                </div>

                <div class="swarm-configuration">
                    <div class="config-section">
                        <h5>Swarm Configuration</h5>
                        <div class="config-grid">
                            <div class="config-item">
                                <label>Max Concurrent Agents:</label>
                                <input type="number" id="maxAgents" value="${this.maxAgents}" min="1" max="10">
                            </div>
                            <div class="config-item">
                                <label>Task Distribution Strategy:</label>
                                <select id="distributionStrategy">
                                    <option value="auto">Automatic</option>
                                    <option value="load-balanced">Load Balanced</option>
                                    <option value="specialized">Specialization Based</option>
                                    <option value="round-robin">Round Robin</option>
                                </select>
                            </div>
                            <div class="config-item">
                                <label>Communication Mode:</label>
                                <select id="communicationMode">
                                    <option value="broadcast">Broadcast</option>
                                    <option value="hierarchical">Hierarchical</option>
                                    <option value="peer-to-peer">Peer-to-Peer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderActiveAgents() {
        if (this.activeAgents.size === 0) {
            return `
                <div class="no-agents">
                    <i class="fas fa-robot" style="font-size: 2em; color: #ccc;"></i>
                    <p>No active agents</p>
                    <p class="text-muted">Click "Start Swarm" to begin</p>
                </div>
            `;
        }

        return Array.from(this.activeAgents.values()).map(agent => `
            <div class="agent-card" data-agent-id="${agent.id}">
                <div class="agent-header">
                    <div class="agent-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="agent-info">
                        <div class="agent-name">${agent.name}</div>
                        <div class="agent-model">${agent.model}</div>
                    </div>
                    <div class="agent-status ${agent.status}">
                        <span class="status-dot"></span>
                        ${agent.status}
                    </div>
                </div>
                <div class="agent-metrics">
                    <div class="metric">
                        <span class="metric-label">Tasks:</span>
                        <span class="metric-value">${agent.tasksCompleted || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate:</span>
                        <span class="metric-value">${agent.successRate || 0}%</span>
                    </div>
                </div>
                <div class="agent-current-task">
                    ${agent.currentTask ? `
                        <div class="current-task">
                            <i class="fas fa-tasks"></i>
                            <span>${agent.currentTask.substring(0, 50)}...</span>
                        </div>
                    ` : '<div class="idle">Idle</div>'}
                </div>
                <div class="agent-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="this.parentWidget.reassignAgent('${agent.id}')">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="this.parentWidget.terminateAgent('${agent.id}')">
                        <i class="fas fa-stop"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Toggle swarm
        this.container.querySelector('#toggleSwarm').addEventListener('click', () => {
            this.toggleSwarm();
        });

        // Emergency stop
        this.container.querySelector('#emergencyStop').addEventListener('click', () => {
            this.emergencyStop();
        });

        // Assign task
        this.container.querySelector('#assignTask').addEventListener('click', () => {
            this.assignTaskToSwarm();
        });

        // Spawn agent
        this.container.querySelector('#spawnAgent').addEventListener('click', () => {
            this.spawnAgent();
        });

        // Configure agents
        this.container.querySelector('#configureAgents').addEventListener('click', () => {
            this.openAgentConfiguration();
        });

        // Configuration changes
        this.container.querySelector('#maxAgents').addEventListener('change', (e) => {
            this.maxAgents = parseInt(e.target.value);
        });

        // Auto-decompose toggle
        this.container.querySelector('#autoDecompose').addEventListener('change', (e) => {
            this.autoSpawn = e.target.checked;
        });

        // Store reference for agent actions
        const agentCards = this.container.querySelectorAll('.agent-card');
        agentCards.forEach(card => {
            card.parentWidget = this;
        });
    }

    async toggleSwarm() {
        try {
            if (this.isSwarmActive) {
                await this.stopSwarm();
            } else {
                await this.startSwarm();
            }
        } catch (error) {
            console.error('Error toggling swarm:', error);
            this.showError('Failed to toggle swarm state');
        }
    }

    async startSwarm() {
        // Initialize swarm with default agents
        this.isSwarmActive = true;
        
        // Spawn initial agents based on configuration
        const initialAgents = Math.min(3, this.maxAgents); // Start with 3 agents
        for (let i = 0; i < initialAgents; i++) {
            await this.spawnAgent();
        }

        this.updateStatus();
        this.broadcastSwarmEvent('swarm:started', { agentCount: this.activeAgents.size });
    }

    async stopSwarm() {
        this.isSwarmActive = false;
        
        // Gracefully terminate all agents
        for (const [agentId, agent] of this.activeAgents) {
            await this.terminateAgent(agentId);
        }

        this.activeAgents.clear();
        this.updateStatus();
        this.broadcastSwarmEvent('swarm:stopped', {});
    }

    async emergencyStop() {
        this.isSwarmActive = false;
        this.activeAgents.clear();
        this.taskQueue = [];
        this.updateStatus();
        this.showWarning('Emergency stop activated - all agents terminated');
        this.broadcastSwarmEvent('swarm:emergency_stop', {});
    }

    async assignTaskToSwarm() {
        const taskDescription = this.container.querySelector('#taskDescription').value.trim();
        const priority = this.container.querySelector('#taskPriority').value;
        const specialization = this.container.querySelector('#taskSpecialization').value;
        const autoDecompose = this.container.querySelector('#autoDecompose').checked;

        if (!taskDescription) {
            this.showError('Please provide a task description');
            return;
        }

        const task = {
            id: `task-${Date.now()}`,
            description: taskDescription,
            priority,
            specialization,
            autoDecompose,
            created: new Date().toISOString(),
            status: 'pending'
        };

        try {
            if (autoDecompose && this.isComplexTask(taskDescription)) {
                await this.decomcomposeAndAssign(task);
            } else {
                await this.assignTaskToAgent(task);
            }

            // Clear input
            this.container.querySelector('#taskDescription').value = '';
            this.updateMetrics();
            
        } catch (error) {
            console.error('Error assigning task:', error);
            this.showError('Failed to assign task to swarm');
        }
    }

    isComplexTask(description) {
        // Simple heuristics to determine if a task should be decomposed
        const indicators = [
            'analyze and', 'research and', 'create and', 'develop and',
            'multiple', 'several', 'various', 'comprehensive',
            'step by step', 'phases', 'stages'
        ];
        
        const lowerDesc = description.toLowerCase();
        return indicators.some(indicator => lowerDesc.includes(indicator)) || 
               description.length > 200 || 
               (description.match(/and/g) || []).length > 2;
    }

    async decomcomposeAndAssign(task) {
        // Use AI to decompose the task into subtasks
        try {
            const response = await fetch('/api/agent-swarm/decompose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskDescription: task.description,
                    specialization: task.specialization,
                    maxSubtasks: this.maxAgents
                })
            });

            const data = await response.json();
            const subtasks = data.subtasks || [task];

            // Assign each subtask to available agents
            for (const subtask of subtasks) {
                await this.assignTaskToAgent({
                    ...subtask,
                    id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    parentTask: task.id,
                    priority: task.priority
                });
            }

            this.broadcastSwarmEvent('task:decomposed', { 
                originalTask: task, 
                subtasks: subtasks.length 
            });

        } catch (error) {
            // Fallback to direct assignment if decomposition fails
            await this.assignTaskToAgent(task);
        }
    }

    async assignTaskToAgent(task) {
        // Find the best agent for this task
        const bestAgent = this.findBestAgentForTask(task);
        
        if (!bestAgent) {
            // Spawn a new agent if needed and possible
            if (this.activeAgents.size < this.maxAgents) {
                const newAgent = await this.spawnSpecializedAgent(task.specialization);
                if (newAgent) {
                    await this.executeTaskOnAgent(newAgent.id, task);
                } else {
                    this.queueTask(task);
                }
            } else {
                this.queueTask(task);
            }
        } else {
            await this.executeTaskOnAgent(bestAgent.id, task);
        }
    }

    findBestAgentForTask(task) {
        const availableAgents = Array.from(this.activeAgents.values())
            .filter(agent => agent.status === 'idle' || agent.status === 'available');

        if (availableAgents.length === 0) return null;

        // Score agents based on specialization and load
        const scoredAgents = availableAgents.map(agent => ({
            agent,
            score: this.calculateAgentTaskScore(agent, task)
        }));

        scoredAgents.sort((a, b) => b.score - a.score);
        return scoredAgents[0]?.agent;
    }

    calculateAgentTaskScore(agent, task) {
        let score = 0;
        
        // Specialization match
        if (agent.specialization === task.specialization) score += 50;
        
        // Load balancing (prefer less busy agents)
        score += (100 - (agent.currentLoad || 0));
        
        // Success rate
        score += (agent.successRate || 50);
        
        // Response time (prefer faster agents)
        score += Math.max(0, 50 - (agent.avgResponseTime || 10));
        
        return score;
    }

    async executeTaskOnAgent(agentId, task) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) return;

        // Update agent status
        agent.status = 'working';
        agent.currentTask = task.description;
        agent.currentTaskId = task.id;

        try {
            // Send task to agent execution backend
            const response = await fetch('/api/agent-swarm/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId,
                    task,
                    swarmId: this.id
                })
            });

            if (response.ok) {
                this.swarmMetrics.activeTasks++;
                this.updateStatus();
                this.broadcastSwarmEvent('task:assigned', { agentId, taskId: task.id });
            } else {
                throw new Error('Task execution failed');
            }

        } catch (error) {
            console.error('Error executing task:', error);
            agent.status = 'error';
            this.queueTask(task);
        }
    }

    queueTask(task) {
        this.taskQueue.push(task);
        this.broadcastSwarmEvent('task:queued', { taskId: task.id });
    }

    async spawnAgent(specialization = 'general') {
        if (this.activeAgents.size >= this.maxAgents) {
            this.showWarning('Maximum agents reached');
            return null;
        }

        const agentTemplate = this.selectAgentTemplate(specialization);
        if (!agentTemplate) {
            this.showError('No suitable agent template found');
            return null;
        }

        const agent = {
            id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${specialization.charAt(0).toUpperCase() + specialization.slice(1)} Agent ${this.activeAgents.size + 1}`,
            model: agentTemplate.model,
            provider: agentTemplate.provider,
            specialization,
            status: 'spawning',
            tasksCompleted: 0,
            successRate: 100,
            avgResponseTime: 0,
            currentLoad: 0,
            created: new Date().toISOString()
        };

        try {
            // Initialize agent through backend
            const response = await fetch('/api/agent-swarm/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agent)
            });

            if (response.ok) {
                agent.status = 'idle';
                this.activeAgents.set(agent.id, agent);
                this.updateStatus();
                this.broadcastSwarmEvent('agent:spawned', { agentId: agent.id });
                return agent;
            } else {
                throw new Error('Agent spawn failed');
            }

        } catch (error) {
            console.error('Error spawning agent:', error);
            this.showError('Failed to spawn agent');
            return null;
        }
    }

    async spawnSpecializedAgent(specialization) {
        return await this.spawnAgent(specialization === 'auto' ? 'general' : specialization);
    }

    selectAgentTemplate(specialization) {
        // Return the best agent template for the specialization
        const templates = {
            research: { model: 'gpt-4o', provider: 'openai' },
            writing: { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
            coding: { model: 'gpt-4o', provider: 'openai' },
            creative: { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
            data: { model: 'gpt-4o', provider: 'openai' },
            planning: { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
            general: { model: 'gpt-4o-mini', provider: 'openai' }
        };

        return templates[specialization] || templates.general;
    }

    async terminateAgent(agentId) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) return;

        try {
            // Gracefully terminate agent
            await fetch(`/api/agent-swarm/terminate/${agentId}`, {
                method: 'DELETE'
            });

            this.activeAgents.delete(agentId);
            this.updateStatus();
            this.broadcastSwarmEvent('agent:terminated', { agentId });

        } catch (error) {
            console.error('Error terminating agent:', error);
            // Force removal even if backend call fails
            this.activeAgents.delete(agentId);
            this.updateStatus();
        }
    }

    reassignAgent(agentId) {
        // Implement agent reassignment logic
        console.log('Reassigning agent:', agentId);
        // This would open a modal or interface to reassign the agent
    }

    openAgentConfiguration() {
        // Open agent configuration modal
        console.log('Opening agent configuration');
        // This would open a modal for detailed agent configuration
    }

    updateStatus() {
        this.render();
    }

    updateMetrics() {
        // Calculate efficiency
        if (this.swarmMetrics.totalTasks > 0) {
            this.swarmMetrics.efficiency = Math.round(
                (this.swarmMetrics.completedTasks / this.swarmMetrics.totalTasks) * 100
            );
        }

        // Update displays
        this.updateStatus();
    }

    startMetricsUpdate() {
        setInterval(() => {
            this.updateMetrics();
        }, 5000);
    }

    broadcastSwarmEvent(eventType, data) {
        // Broadcast event to other widgets and system
        if (window.EventBus) {
            window.EventBus.emit(eventType, {
                swarmId: this.id,
                timestamp: new Date().toISOString(),
                ...data
            });
        }
    }

    // Event handlers for external events
    onTaskCompleted(data) {
        if (data.agentId && this.activeAgents.has(data.agentId)) {
            const agent = this.activeAgents.get(data.agentId);
            agent.status = 'idle';
            agent.currentTask = null;
            agent.currentTaskId = null;
            agent.tasksCompleted++;
            
            this.swarmMetrics.completedTasks++;
            this.swarmMetrics.activeTasks = Math.max(0, this.swarmMetrics.activeTasks - 1);
            
            // Check if there are queued tasks
            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                this.executeTaskOnAgent(data.agentId, nextTask);
            }
            
            this.updateMetrics();
        }
    }

    onTaskFailed(data) {
        if (data.agentId && this.activeAgents.has(data.agentId)) {
            const agent = this.activeAgents.get(data.agentId);
            agent.status = 'idle';
            agent.currentTask = null;
            agent.currentTaskId = null;
            
            this.swarmMetrics.activeTasks = Math.max(0, this.swarmMetrics.activeTasks - 1);
            
            // Re-queue the failed task for retry
            if (data.task && data.task.retries < 3) {
                data.task.retries = (data.task.retries || 0) + 1;
                this.queueTask(data.task);
            }
            
            this.updateMetrics();
        }
    }

    showError(message) {
        console.error('Agent Swarm Error:', message);
        // Could implement a toast notification system
    }

    showWarning(message) {
        console.warn('Agent Swarm Warning:', message);
        // Could implement a toast notification system
    }

    destroy() {
        // Cleanup when widget is destroyed
        if (this.isSwarmActive) {
            this.emergencyStop();
        }
        super.destroy();
    }
}

// Register widget
if (window.WidgetFactory) {
    window.WidgetFactory.register('agent-swarm-control', AgentSwarmControlWidget);
}