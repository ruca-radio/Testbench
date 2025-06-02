// Agent Orchestrator Widget - For managing multi-agent collaboration
class AgentOrchestratorWidget extends BaseWidget {
    constructor(widgetData) {
        super(widgetData);
        this.agents = new Map();
        this.conversations = [];
        this.activeConversationId = null;
        this.orchestrationMode = 'sequential'; // sequential, parallel, hierarchical
        this.taskQueue = [];
    }

    async onInit() {
        // Load available agents
        await this.loadAgents();
        
        // Render orchestrator UI
        this.render();
        
        // Setup WebSocket for real-time agent communication
        this.setupWebSocket();
    }

    async loadAgents() {
        try {
            const response = await fetch('/api/agents/list/all');
            if (response.ok) {
                const data = await response.json();
                const agents = data.agents || [];
                
                agents.forEach(agent => {
                    this.agents.set(agent.id, {
                        ...agent,
                        status: 'idle',
                        currentTask: null
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    }

    render() {
        this.setContent(`
            <div class="agent-orchestrator">
                <div class="orchestrator-header">
                    <div class="orchestration-controls">
                        <label>Mode:</label>
                        <select id="orchestration-mode-${this.id}" onchange="window.enhancedWidgetSystem.widgets.get('${this.id}').changeMode(this.value)">
                            <option value="sequential">Sequential</option>
                            <option value="parallel">Parallel</option>
                            <option value="hierarchical">Hierarchical</option>
                            <option value="collaborative">Collaborative</option>
                        </select>
                        <button class="btn small primary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').startNewTask()">
                            New Task
                        </button>
                    </div>
                </div>

                <div class="orchestrator-content">
                    <div class="agents-panel">
                        <h4>Available Agents</h4>
                        <div class="agent-list" id="agent-list-${this.id}">
                            ${this.renderAgentList()}
                        </div>
                    </div>

                    <div class="workflow-panel">
                        <h4>Active Workflow</h4>
                        <div class="workflow-canvas" id="workflow-${this.id}">
                            <div class="workflow-placeholder">
                                <p>No active workflow</p>
                                <button class="btn secondary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').createWorkflow()">
                                    Create Workflow
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="communication-panel">
                        <h4>Agent Communication</h4>
                        <div class="agent-messages" id="agent-messages-${this.id}">
                            <!-- Agent messages will appear here -->
                        </div>
                        <div class="human-intervention" id="human-intervention-${this.id}" style="display: none;">
                            <p class="intervention-prompt">Human intervention required:</p>
                            <textarea id="human-input-${this.id}" rows="3" placeholder="Your input..."></textarea>
                            <button class="btn primary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').submitHumanInput()">
                                Submit
                            </button>
                        </div>
                    </div>
                </div>

                <div class="task-queue-panel">
                    <h4>Task Queue</h4>
                    <div class="task-queue" id="task-queue-${this.id}">
                        ${this.renderTaskQueue()}
                    </div>
                </div>
            </div>
        `);
    }

    renderAgentList() {
        if (this.agents.size === 0) {
            return '<p class="empty-state">No agents available</p>';
        }

        return Array.from(this.agents.values()).map(agent => `
            <div class="agent-item ${agent.status}" data-agent-id="${agent.id}">
                <div class="agent-info">
                    <span class="agent-name">${agent.name}</span>
                    <span class="agent-model">${agent.model || 'No model'}</span>
                </div>
                <div class="agent-status">
                    <span class="status-indicator ${agent.status}"></span>
                    <span class="status-text">${agent.status}</span>
                </div>
                ${agent.currentTask ? `
                    <div class="agent-task">
                        Working on: ${agent.currentTask.name}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderTaskQueue() {
        if (this.taskQueue.length === 0) {
            return '<p class="empty-state">No tasks in queue</p>';
        }

        return this.taskQueue.map((task, index) => `
            <div class="task-item ${task.status}" data-task-id="${task.id}">
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-type">${task.type}</span>
                </div>
                <div class="task-actions">
                    <button class="btn small" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').executeTask('${task.id}')">
                        Execute
                    </button>
                    <button class="btn small danger" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').removeTask('${task.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    changeMode(mode) {
        this.orchestrationMode = mode;
        console.log(`Orchestration mode changed to: ${mode}`);
        
        // Update UI based on mode
        this.updateWorkflowDisplay();
    }

    startNewTask() {
        // Show task creation dialog
        const modal = document.createElement('div');
        modal.className = 'task-modal modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Task</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Task Name:</label>
                        <input type="text" id="task-name" placeholder="e.g., Research and summarize topic">
                    </div>
                    <div class="form-group">
                        <label>Task Type:</label>
                        <select id="task-type">
                            <option value="research">Research</option>
                            <option value="analysis">Analysis</option>
                            <option value="generation">Content Generation</option>
                            <option value="review">Review & Edit</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="task-description" rows="4" placeholder="Detailed task description..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Assigned Agents:</label>
                        <div class="agent-checkboxes">
                            ${Array.from(this.agents.values()).map(agent => `
                                <label>
                                    <input type="checkbox" value="${agent.id}">
                                    ${agent.name}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Requires Human Review:</label>
                        <input type="checkbox" id="human-review">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn primary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').createTask()">
                        Create Task
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    createTask() {
        const name = document.getElementById('task-name').value;
        const type = document.getElementById('task-type').value;
        const description = document.getElementById('task-description').value;
        const humanReview = document.getElementById('human-review').checked;
        
        // Get selected agents
        const selectedAgents = [];
        document.querySelectorAll('.agent-checkboxes input:checked').forEach(cb => {
            selectedAgents.push(cb.value);
        });
        
        if (!name || selectedAgents.length === 0) {
            Utils.showError('Please provide a task name and select at least one agent');
            return;
        }
        
        const task = {
            id: `task-${Date.now()}`,
            name,
            type,
            description,
            agents: selectedAgents,
            humanReview,
            status: 'pending',
            created: new Date().toISOString(),
            steps: []
        };
        
        this.taskQueue.push(task);
        this.updateTaskQueueDisplay();
        
        // Close modal
        document.querySelector('.task-modal').remove();
        
        // Auto-execute if in certain modes
        if (this.orchestrationMode === 'sequential' || this.orchestrationMode === 'parallel') {
            this.executeTask(task.id);
        }
    }

    async executeTask(taskId) {
        const task = this.taskQueue.find(t => t.id === taskId);
        if (!task) return;
        
        task.status = 'running';
        this.updateTaskQueueDisplay();
        
        try {
            switch (this.orchestrationMode) {
                case 'sequential':
                    await this.executeSequential(task);
                    break;
                case 'parallel':
                    await this.executeParallel(task);
                    break;
                case 'hierarchical':
                    await this.executeHierarchical(task);
                    break;
                case 'collaborative':
                    await this.executeCollaborative(task);
                    break;
            }
            
            task.status = 'completed';
        } catch (error) {
            console.error('Task execution error:', error);
            task.status = 'failed';
            task.error = error.message;
        }
        
        this.updateTaskQueueDisplay();
    }

    async executeSequential(task) {
        // Execute task with agents one by one
        for (const agentId of task.agents) {
            const agent = this.agents.get(agentId);
            if (!agent) continue;
            
            // Update agent status
            agent.status = 'working';
            agent.currentTask = task;
            this.updateAgentDisplay();
            
            // Create conversation context
            const context = this.buildContext(task, agent);
            
            // Send to agent
            const result = await this.sendToAgent(agent, task.description, context);
            
            // Add to communication log
            this.addAgentMessage(agent, result.message, 'response');
            
            // Check if human review needed
            if (task.humanReview && result.requiresReview) {
                await this.requestHumanIntervention(task, result);
            }
            
            // Update context with agent's response
            task.steps.push({
                agent: agent.name,
                response: result.message,
                timestamp: new Date().toISOString()
            });
            
            // Update agent status
            agent.status = 'idle';
            agent.currentTask = null;
            this.updateAgentDisplay();
        }
    }

    async executeParallel(task) {
        // Execute task with all agents in parallel
        const promises = task.agents.map(async agentId => {
            const agent = this.agents.get(agentId);
            if (!agent) return null;
            
            // Update agent status
            agent.status = 'working';
            agent.currentTask = task;
            this.updateAgentDisplay();
            
            try {
                const context = this.buildContext(task, agent);
                const result = await this.sendToAgent(agent, task.description, context);
                
                // Add to communication log
                this.addAgentMessage(agent, result.message, 'response');
                
                return { agent, result };
            } finally {
                // Update agent status
                agent.status = 'idle';
                agent.currentTask = null;
                this.updateAgentDisplay();
            }
        });
        
        const results = await Promise.all(promises);
        
        // Aggregate results
        const aggregated = this.aggregateResults(results.filter(r => r !== null));
        
        // Check if human review needed
        if (task.humanReview) {
            await this.requestHumanIntervention(task, aggregated);
        }
    }

    async executeHierarchical(task) {
        // Find lead agent (first in list or specifically designated)
        const leadAgentId = task.agents[0];
        const leadAgent = this.agents.get(leadAgentId);
        if (!leadAgent) return;
        
        // Lead agent creates sub-tasks
        const subtasks = await this.getSubtasksFromLead(leadAgent, task);
        
        // Distribute subtasks to other agents
        for (let i = 0; i < subtasks.length && i < task.agents.length - 1; i++) {
            const agentId = task.agents[i + 1];
            const agent = this.agents.get(agentId);
            if (!agent) continue;
            
            const subtask = subtasks[i];
            const result = await this.sendToAgent(agent, subtask.description, subtask.context);
            
            subtask.result = result;
        }
        
        // Lead agent aggregates results
        const finalResult = await this.sendToAgent(leadAgent, 'Aggregate and summarize the following results', {
            originalTask: task.description,
            subtaskResults: subtasks
        });
        
        task.finalResult = finalResult;
    }

    async executeCollaborative(task) {
        // Create a collaborative session
        const session = {
            id: `session-${Date.now()}`,
            task,
            participants: task.agents.map(id => this.agents.get(id)),
            messages: [],
            consensus: null
        };
        
        // Initial round - all agents provide their perspective
        const initialResponses = await Promise.all(
            session.participants.map(agent => 
                this.sendToAgent(agent, task.description, { mode: 'collaborative' })
            )
        );
        
        // Discussion rounds
        let rounds = 0;
        const maxRounds = 5;
        
        while (!session.consensus && rounds < maxRounds) {
            rounds++;
            
            // Each agent reviews others' responses
            for (let i = 0; i < session.participants.length; i++) {
                const agent = session.participants[i];
                const otherResponses = initialResponses.filter((_, idx) => idx !== i);
                
                const response = await this.sendToAgent(agent, 
                    'Review these perspectives and provide your updated thoughts', {
                    yourPrevious: initialResponses[i],
                    others: otherResponses
                });
                
                session.messages.push({ agent: agent.name, message: response.message });
            }
            
            // Check for consensus
            session.consensus = await this.checkConsensus(session.messages);
        }
        
        task.collaborativeResult = session;
    }

    async sendToAgent(agent, message, context = {}) {
        try {
            const response = await fetch('/api/agents/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: agent.id,
                    message,
                    context,
                    model: agent.model,
                    provider: agent.provider
                })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Agent ${agent.name} failed to respond`);
            }
        } catch (error) {
            console.error(`Error communicating with agent ${agent.name}:`, error);
            throw error;
        }
    }

    buildContext(task, agent) {
        return {
            taskId: task.id,
            taskType: task.type,
            previousSteps: task.steps,
            agentRole: agent.role || 'assistant',
            orchestrationMode: this.orchestrationMode
        };
    }

    addAgentMessage(agent, message, type = 'message') {
        const messagesContainer = document.getElementById(`agent-messages-${this.id}`);
        if (!messagesContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `agent-message ${type}`;
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="agent-name">${agent.name}</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${message}</div>
        `;
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async requestHumanIntervention(task, agentResult) {
        return new Promise((resolve) => {
            const interventionPanel = document.getElementById(`human-intervention-${this.id}`);
            const promptEl = interventionPanel.querySelector('.intervention-prompt');
            
            promptEl.textContent = `Review required for task "${task.name}": ${agentResult.reviewReason || 'Please review and provide feedback'}`;
            interventionPanel.style.display = 'block';
            
            // Store resolve function
            this.humanInterventionResolve = resolve;
        });
    }

    submitHumanInput() {
        const input = document.getElementById(`human-input-${this.id}`).value;
        const interventionPanel = document.getElementById(`human-intervention-${this.id}`);
        
        if (input && this.humanInterventionResolve) {
            this.humanInterventionResolve(input);
            this.humanInterventionResolve = null;
            
            // Clear and hide
            document.getElementById(`human-input-${this.id}`).value = '';
            interventionPanel.style.display = 'none';
            
            // Add to message log
            this.addAgentMessage({ name: 'Human' }, input, 'human-input');
        }
    }

    removeTask(taskId) {
        this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
        this.updateTaskQueueDisplay();
    }

    updateAgentDisplay() {
        const agentList = document.getElementById(`agent-list-${this.id}`);
        if (agentList) {
            agentList.innerHTML = this.renderAgentList();
        }
    }

    updateTaskQueueDisplay() {
        const taskQueue = document.getElementById(`task-queue-${this.id}`);
        if (taskQueue) {
            taskQueue.innerHTML = this.renderTaskQueue();
        }
    }

    updateWorkflowDisplay() {
        const workflowCanvas = document.getElementById(`workflow-${this.id}`);
        if (!workflowCanvas) return;
        
        // Update workflow visualization based on mode
        switch (this.orchestrationMode) {
            case 'sequential':
                this.renderSequentialWorkflow(workflowCanvas);
                break;
            case 'parallel':
                this.renderParallelWorkflow(workflowCanvas);
                break;
            case 'hierarchical':
                this.renderHierarchicalWorkflow(workflowCanvas);
                break;
            case 'collaborative':
                this.renderCollaborativeWorkflow(workflowCanvas);
                break;
        }
    }

    createWorkflow() {
        // Open workflow designer
        Utils.showInfo('Workflow designer coming soon!');
    }

    setupWebSocket() {
        // Setup real-time communication
        // This would connect to the collaboration engine
        console.log('WebSocket setup for agent orchestration');
    }

    async onDestroy() {
        // Cleanup
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

// Register widget
window.AgentOrchestratorWidget = AgentOrchestratorWidget;