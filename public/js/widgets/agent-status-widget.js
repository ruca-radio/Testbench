// Agent Status Widget - Live agent monitoring and management
class AgentStatusWidget {
    constructor(id, config = {}) {
        this.id = id;
        this.config = config;
        this.title = config.title || 'Agent Status';
        this.agents = [];
        this.updateInterval = null;
        this.refreshRate = config.refreshRate || 30000; // 30 seconds
    }

    getTitle() {
        return this.title;
    }

    getIcon() {
        return '🤖';
    }

    render() {
        return `
            <div class="agent-status-widget-content">
                <!-- Agent Controls -->
                <div class="agent-controls">
                    <button class="btn small primary" onclick="AgentStatusWidget.openAgentManager('${this.id}')">
                        + Add Agent
                    </button>
                    <button class="btn small secondary" onclick="AgentStatusWidget.refreshAgents('${this.id}')">
                        🔄 Refresh
                    </button>
                </div>

                <!-- Active Agents -->
                <div class="active-agents-section">
                    <h5>Active Agents</h5>
                    <div class="agent-list" id="agent-list-${this.id}">
                        ${this.renderExistingContent()}
                    </div>
                </div>

                <!-- Agent Activity Feed -->
                <div class="agent-activity-section">
                    <h5>Recent Activity</h5>
                    <div class="activity-feed" id="activity-feed-${this.id}">
                        <div class="activity-item">
                            <span class="activity-time">Just now</span>
                            <span class="activity-text">Agent system initialized</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Agent Selection -->
                <div class="quick-agent-section">
                    <h5>Quick Select</h5>
                    <select id="quick-agent-select-${this.id}" onchange="AgentStatusWidget.selectAgent('${this.id}')">
                        <option value="">Choose agent...</option>
                    </select>
                </div>
            </div>
        `;
    }

    renderExistingContent() {
        if (!this.config.existingContent) {
            return '<div class="empty-agents">No agents configured</div>';
        }

        return this.config.existingContent.map(el => el.outerHTML).join('');
    }

    onMounted(container) {
        this.container = container;
        this.loadAgents();
        this.startPeriodicUpdates();
    }

    async loadAgents() {
        try {
            const response = await fetch('/api/agents');
            if (response.ok) {
                const data = await response.json();
                this.agents = data.agents || [];
                this.renderAgents();
                this.updateQuickSelect();
            } else {
                console.error('Failed to load agents');
            }
        } catch (error) {
            console.error('Error loading agents:', error);
            AgentStatusWidget.addActivity(this.id, 'Error loading agents', 'error');
        }
    }

    renderAgents() {
        const agentList = document.getElementById(`agent-list-${this.id}`);
        if (!agentList) return;

        if (this.agents.length === 0) {
            agentList.innerHTML = '<div class="empty-agents">No agents configured</div>';
            return;
        }

        agentList.innerHTML = this.agents.map(agent => `
            <div class="agent-item" data-agent-id="${agent.id}">
                <div class="agent-info">
                    <div class="agent-header">
                        <span class="agent-name">${agent.name}</span>
                        <span class="agent-status ${agent.enabled ? 'online' : 'offline'}">
                            ${agent.enabled ? '🟢' : '🔴'}
                        </span>
                    </div>
                    <div class="agent-details">
                        <span class="agent-provider">${agent.provider || 'Unknown'}</span>
                        <span class="agent-model">${agent.model || 'No model'}</span>
                    </div>
                    <div class="agent-role">${agent.role || 'assistant'}</div>
                </div>
                <div class="agent-actions">
                    <button class="btn tiny" onclick="AgentStatusWidget.toggleAgent('${this.id}', '${agent.id}')"
                            title="${agent.enabled ? 'Disable' : 'Enable'}">
                        ${agent.enabled ? '⏸️' : '▶️'}
                    </button>
                    <button class="btn tiny" onclick="AgentStatusWidget.configureAgent('${this.id}', '${agent.id}')"
                            title="Configure">⚙️</button>
                    <button class="btn tiny danger" onclick="AgentStatusWidget.removeAgent('${this.id}', '${agent.id}')"
                            title="Remove">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    updateQuickSelect() {
        const select = document.getElementById(`quick-agent-select-${this.id}`);
        if (!select) return;

        const enabledAgents = this.agents.filter(agent => agent.enabled);
        select.innerHTML = '<option value="">Choose agent...</option>' +
            enabledAgents.map(agent =>
                `<option value="${agent.id}">${agent.name}</option>`
            ).join('');
    }

    startPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.loadAgents();
        }, this.refreshRate);
    }

    // Static methods for UI interactions
    static async openAgentManager(widgetId) {
        // Open the main settings modal to the agents tab
        if (window.SettingsModal) {
            SettingsModal.openTab('agents');
        } else {
            Utils.showError('Agent manager not available');
        }
    }

    static async refreshAgents(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (widget) {
            AgentStatusWidget.addActivity(widgetId, 'Refreshing agents...');
            await widget.loadAgents();
            AgentStatusWidget.addActivity(widgetId, 'Agents refreshed');
        }
    }

    static async toggleAgent(widgetId, agentId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        const agent = widget.agents.find(a => a.id === agentId);
        if (!agent) return;

        try {
            const response = await fetch(`/api/agents/${agentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !agent.enabled })
            });

            if (response.ok) {
                agent.enabled = !agent.enabled;
                widget.renderAgents();
                widget.updateQuickSelect();

                const action = agent.enabled ? 'enabled' : 'disabled';
                AgentStatusWidget.addActivity(widgetId, `Agent ${agent.name} ${action}`);
                Utils.showSuccess(`Agent ${action}`);
            } else {
                throw new Error(`Failed to toggle agent: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error toggling agent:', error);
            AgentStatusWidget.addActivity(widgetId, `Error toggling agent: ${error.message}`, 'error');
            Utils.showError('Failed to toggle agent');
        }
    }

    static async configureAgent(widgetId, agentId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        const agent = widget.agents.find(a => a.id === agentId);
        if (!agent) return;

        // Open agent configuration modal
        Utils.showModal(`Configure ${agent.name}`, `
            <div class="agent-config-form">
                <div class="settings-group">
                    <label for="agent-config-name">Name:</label>
                    <input type="text" id="agent-config-name" value="${agent.name}">
                </div>
                <div class="settings-group">
                    <label for="agent-config-description">Description:</label>
                    <textarea id="agent-config-description" rows="3">${agent.description || ''}</textarea>
                </div>
                <div class="settings-group">
                    <label for="agent-config-role">Role:</label>
                    <select id="agent-config-role">
                        <option value="assistant" ${agent.role === 'assistant' ? 'selected' : ''}>Assistant</option>
                        <option value="specialist" ${agent.role === 'specialist' ? 'selected' : ''}>Specialist</option>
                        <option value="orchestrator" ${agent.role === 'orchestrator' ? 'selected' : ''}>Orchestrator</option>
                        <option value="reviewer" ${agent.role === 'reviewer' ? 'selected' : ''}>Reviewer</option>
                        <option value="testbench" ${agent.role === 'testbench' ? 'selected' : ''}>TestBench</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="agent-config-priority">Priority:</label>
                    <select id="agent-config-priority">
                        <option value="1" ${agent.priority === 1 ? 'selected' : ''}>Low</option>
                        <option value="2" ${agent.priority === 2 ? 'selected' : ''}>Normal</option>
                        <option value="3" ${agent.priority === 3 ? 'selected' : ''}>High</option>
                        <option value="4" ${agent.priority === 4 ? 'selected' : ''}>Critical</option>
                        <option value="5" ${agent.priority === 5 ? 'selected' : ''}>Urgent</option>
                    </select>
                </div>
            </div>
        `, () => {
            AgentStatusWidget.saveAgentConfig(widgetId, agentId);
        });
    }

    static async saveAgentConfig(widgetId, agentId) {
        const config = {
            name: document.getElementById('agent-config-name').value,
            description: document.getElementById('agent-config-description').value,
            role: document.getElementById('agent-config-role').value,
            priority: parseInt(document.getElementById('agent-config-priority').value)
        };

        try {
            const response = await fetch(`/api/agents/${agentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                AgentStatusWidget.refreshAgents(widgetId);
                AgentStatusWidget.addActivity(widgetId, `Agent ${config.name} configuration updated`);
                Utils.showSuccess('Agent configuration saved');
            } else {
                throw new Error(`Failed to save configuration: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error saving agent config:', error);
            Utils.showError('Failed to save agent configuration');
        }
    }

    static async removeAgent(widgetId, agentId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        const agent = widget.agents.find(a => a.id === agentId);
        if (!agent) return;

        if (!confirm(`Are you sure you want to remove agent "${agent.name}"?`)) return;

        try {
            const response = await fetch(`/api/agents/${agentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                widget.agents = widget.agents.filter(a => a.id !== agentId);
                widget.renderAgents();
                widget.updateQuickSelect();

                AgentStatusWidget.addActivity(widgetId, `Agent ${agent.name} removed`);
                Utils.showSuccess('Agent removed');
            } else {
                throw new Error(`Failed to remove agent: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error removing agent:', error);
            AgentStatusWidget.addActivity(widgetId, `Error removing agent: ${error.message}`, 'error');
            Utils.showError('Failed to remove agent');
        }
    }

    static selectAgent(widgetId) {
        const select = document.getElementById(`quick-agent-select-${widgetId}`);
        if (!select || !select.value) return;

        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        const agent = widget.agents.find(a => a.id === select.value);
        if (agent) {
            // Trigger agent selection in main interface
            if (window.switchAgent) {
                window.switchAgent(agent.id);
            }

            AgentStatusWidget.addActivity(widgetId, `Selected agent: ${agent.name}`);
        }
    }

    static addActivity(widgetId, message, type = 'info') {
        const feed = document.getElementById(`activity-feed-${widgetId}`);
        if (!feed) return;

        const activityItem = document.createElement('div');
        activityItem.className = `activity-item ${type}`;
        activityItem.innerHTML = `
            <span class="activity-time">${new Date().toLocaleTimeString()}</span>
            <span class="activity-text">${message}</span>
        `;

        feed.insertBefore(activityItem, feed.firstChild);

        // Keep only last 10 items
        while (feed.children.length > 10) {
            feed.removeChild(feed.lastChild);
        }
    }

    onDestroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Register the widget
if (window.widgetSystem) {
    window.widgetSystem.registerWidget('agent-status-widget', AgentStatusWidget);
}
