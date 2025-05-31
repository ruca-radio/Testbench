/**
 * Multi-Agent Collaboration Frontend
 * Handles workspace management, agent communication, and task orchestration
 */

class CollaborationApp {
    constructor() {
        this.workspaces = [];
        this.agents = [];
        this.conversations = [];
        this.messages = [];
        this.tasks = [];
        this.currentWorkspace = null;
        this.refreshInterval = null;

        this.init();
    }

    async init() {
        console.log('Initializing Collaboration App...');
        this.setupEventListeners();
        await this.loadInitialData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form submissions
        document.getElementById('create-workspace-form').addEventListener('submit', (e) => {
            this.handleCreateWorkspace(e);
        });

        document.getElementById('add-agent-form').addEventListener('submit', (e) => {
            this.handleAddAgent(e);
        });

        document.getElementById('start-conversation-form').addEventListener('submit', (e) => {
            this.handleStartConversation(e);
        });

        // Modal click outside to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadWorkspaces(),
                this.loadAgents(),
                this.loadSystemStatus()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
        }
    }

    async loadWorkspaces() {
        try {
            const response = await fetch('/api/collaboration/workspaces');
            if (!response.ok) throw new Error('Failed to fetch workspaces');

            this.workspaces = await response.json();
            this.renderWorkspaces();
        } catch (error) {
            console.error('Error loading workspaces:', error);
            this.showError('Failed to load workspaces');
        }
    }

    async loadAgents() {
        try {
            const response = await fetch('/api/agents');
            if (!response.ok) throw new Error('Failed to fetch agents');

            this.agents = await response.json();
            this.updateAgentSelects();
        } catch (error) {
            console.error('Error loading agents:', error);
            this.showError('Failed to load agents');
        }
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/api/collaboration/status');
            if (!response.ok) throw new Error('Failed to fetch status');

            const status = await response.json();
            this.renderSystemStatus(status);
        } catch (error) {
            console.error('Error loading system status:', error);
            this.showError('Failed to load system status');
        }
    }

    renderWorkspaces() {
        const grid = document.getElementById('workspaces-grid');
        if (!grid) return;

        if (this.workspaces.length === 0) {
            grid.innerHTML = '<p>No workspaces found. Create your first workspace to get started.</p>';
            return;
        }

        grid.innerHTML = this.workspaces.map(workspace => `
            <div class="workspace-card">
                <h3>${this.escapeHtml(workspace.name)}</h3>
                <p>${this.escapeHtml(workspace.description || 'No description')}</p>
                <div class="agent-list" id="agents-${workspace.id}">
                    <em>Loading agents...</em>
                </div>
                <div style="margin-top: 15px;">
                    <button class="btn" onclick="app.showAddAgentModal('${workspace.id}')">Add Agent</button>
                    <button class="btn btn-success" onclick="app.showStartConversationModal('${workspace.id}')">Start Conversation</button>
                    <button class="btn btn-warning" onclick="app.deleteWorkspace('${workspace.id}')">Delete</button>
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    Created: ${new Date(workspace.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');

        // Load agents for each workspace
        this.workspaces.forEach(workspace => {
            this.loadWorkspaceAgents(workspace.id);
        });
    }

    async loadWorkspaceAgents(workspaceId) {
        try {
            const response = await fetch(`/api/collaboration/workspaces/${workspaceId}/agents`);
            if (!response.ok) throw new Error('Failed to fetch workspace agents');

            const agents = await response.json();
            this.renderWorkspaceAgents(workspaceId, agents);
        } catch (error) {
            console.error('Error loading workspace agents:', error);
            document.getElementById(`agents-${workspaceId}`).innerHTML =
                '<em style="color: red;">Error loading agents</em>';
        }
    }

    renderWorkspaceAgents(workspaceId, agents) {
        const container = document.getElementById(`agents-${workspaceId}`);
        if (!container) return;

        if (agents.length === 0) {
            container.innerHTML = '<em>No agents assigned</em>';
            return;
        }

        container.innerHTML = agents.map(agent => `
            <span class="agent-badge" title="${agent.role}">${agent.agentId}</span>
        `).join('');
    }

    updateAgentSelects() {
        // Update agent select in add agent modal
        const agentSelect = document.getElementById('agent-select');
        if (agentSelect) {
            agentSelect.innerHTML = this.agents.map(agent => `
                <option value="${agent.id}">${agent.name || agent.id}</option>
            `).join('');
        }

        // Update orchestrator select in conversation modal
        const orchestratorSelect = document.getElementById('conversation-orchestrator');
        if (orchestratorSelect) {
            orchestratorSelect.innerHTML = '<option value="">None</option>' +
                this.agents.map(agent => `
                    <option value="${agent.id}">${agent.name || agent.id}</option>
                `).join('');
        }
    }

    renderSystemStatus(status) {
        const container = document.getElementById('system-status');
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div class="workspace-card">
                    <h4>Active Conversations</h4>
                    <p style="font-size: 24px; margin: 10px 0; color: #007bff;">${status.activeConversations}</p>
                </div>
                <div class="workspace-card">
                    <h4>Queued Messages</h4>
                    <p style="font-size: 24px; margin: 10px 0; color: #28a745;">${status.queuedMessages}</p>
                </div>
                <div class="workspace-card">
                    <h4>Queued Tasks</h4>
                    <p style="font-size: 24px; margin: 10px 0; color: #ffc107;">${status.queuedTasks}</p>
                </div>
                <div class="workspace-card">
                    <h4>System Uptime</h4>
                    <p style="font-size: 18px; margin: 10px 0; color: #6c757d;">${this.formatUptime(status.uptime)}</p>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button class="btn" onclick="app.loadSystemStatus()">Refresh Status</button>
            </div>
        `;
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Load tab-specific data
        if (tabName === 'conversations') {
            this.loadConversations();
        } else if (tabName === 'status') {
            this.loadSystemStatus();
        }
    }

    async loadConversations() {
        try {
            // For now, we'll show a placeholder
            // In a full implementation, you'd load conversations from all workspaces
            document.getElementById('messages-list').innerHTML =
                '<p>Select a workspace and start a conversation to see messages here.</p>';
            document.getElementById('tasks-list').innerHTML =
                '<p>Active tasks will appear here when conversations are started.</p>';
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    async handleCreateWorkspace(e) {
        e.preventDefault();

        const name = document.getElementById('workspace-name').value;
        const description = document.getElementById('workspace-description').value;

        try {
            const response = await fetch('/api/collaboration/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, description })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create workspace');
            }

            const workspace = await response.json();
            this.workspaces.push(workspace);
            this.renderWorkspaces();
            this.closeModal('create-workspace-modal');
            this.showSuccess('Workspace created successfully');

            // Reset form
            document.getElementById('create-workspace-form').reset();
        } catch (error) {
            console.error('Error creating workspace:', error);
            this.showError(error.message);
        }
    }

    async handleAddAgent(e) {
        e.preventDefault();

        const workspaceId = document.getElementById('target-workspace-id').value;
        const agentId = document.getElementById('agent-select').value;
        const role = document.getElementById('agent-role').value;

        try {
            const response = await fetch(`/api/collaboration/workspaces/${workspaceId}/agents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ agentId, role })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add agent');
            }

            this.loadWorkspaceAgents(workspaceId);
            this.closeModal('add-agent-modal');
            this.showSuccess('Agent added to workspace successfully');
        } catch (error) {
            console.error('Error adding agent:', error);
            this.showError(error.message);
        }
    }

    async handleStartConversation(e) {
        e.preventDefault();

        const workspaceId = document.getElementById('conversation-workspace-id').value;
        const orchestratorId = document.getElementById('conversation-orchestrator').value || null;

        // Get selected participants
        const participants = Array.from(document.querySelectorAll('#conversation-participants input:checked'))
            .map(checkbox => checkbox.value);

        if (participants.length < 2) {
            this.showError('Please select at least 2 participants for a conversation');
            return;
        }

        try {
            const response = await fetch('/api/collaboration/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workspaceId,
                    participants,
                    orchestratorId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start conversation');
            }

            const conversation = await response.json();
            this.closeModal('start-conversation-modal');
            this.showSuccess(`Conversation started successfully (ID: ${conversation.conversationId})`);
        } catch (error) {
            console.error('Error starting conversation:', error);
            this.showError(error.message);
        }
    }

    async deleteWorkspace(workspaceId) {
        if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/collaboration/workspaces/${workspaceId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete workspace');
            }

            this.workspaces = this.workspaces.filter(w => w.id !== workspaceId);
            this.renderWorkspaces();
            this.showSuccess('Workspace deleted successfully');
        } catch (error) {
            console.error('Error deleting workspace:', error);
            this.showError(error.message);
        }
    }

    showCreateWorkspaceModal() {
        this.showModal('create-workspace-modal');
    }

    async showAddAgentModal(workspaceId) {
        document.getElementById('target-workspace-id').value = workspaceId;
        this.showModal('add-agent-modal');
    }

    async showStartConversationModal(workspaceId) {
        document.getElementById('conversation-workspace-id').value = workspaceId;

        // Load agents for this workspace to show as participants
        try {
            const response = await fetch(`/api/collaboration/workspaces/${workspaceId}/agents`);
            if (!response.ok) throw new Error('Failed to fetch workspace agents');

            const agents = await response.json();
            const participantsContainer = document.getElementById('conversation-participants');

            if (agents.length < 2) {
                participantsContainer.innerHTML = '<p style="color: red;">This workspace needs at least 2 agents to start a conversation.</p>';
            } else {
                participantsContainer.innerHTML = agents.map(agent => `
                    <label style="display: block; margin-bottom: 8px;">
                        <input type="checkbox" value="${agent.agentId}" style="margin-right: 8px;">
                        ${agent.agentId} (${agent.role})
                    </label>
                `).join('');
            }

            this.showModal('start-conversation-modal');
        } catch (error) {
            console.error('Error loading workspace agents:', error);
            this.showError('Failed to load workspace agents');
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('success-message');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    startAutoRefresh() {
        // Refresh system status every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (document.querySelector('[data-tab="status"]').classList.contains('active')) {
                this.loadSystemStatus();
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Global functions for modal handling
function showCreateWorkspaceModal() {
    app.showCreateWorkspaceModal();
}

function closeModal(modalId) {
    app.closeModal(modalId);
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CollaborationApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.stopAutoRefresh();
    }
});
