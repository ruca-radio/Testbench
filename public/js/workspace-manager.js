/**
 * Workspace Manager
 * Handles workspace management in the settings modal
 */
class WorkspaceManager {
    static init() {
        this.workspaces = [];
        this.currentWorkspace = null;
        console.log('WorkspaceManager initialized');
    }

    /**
     * Load workspaces from the backend
     */
    static async loadWorkspaces() {
        try {
            const response = await fetch('/api/workspaces');
            if (response.ok) {
                const data = await response.json();
                this.workspaces = data.workspaces || [];
                this.updateWorkspaceGrid();
                this.loadCurrentWorkspace();
                console.log('Workspaces loaded:', this.workspaces.length);
                return this.workspaces;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to load workspaces');
            }
        } catch (error) {
            console.error('Error loading workspaces:', error);
            Utils.showError('Failed to load workspaces');
            return [];
        }
    }

    /**
     * Update the workspace grid in the UI
     */
    static updateWorkspaceGrid() {
        const workspaceGrid = document.getElementById('workspace-grid');
        if (!workspaceGrid) return;

        if (this.workspaces.length === 0) {
            workspaceGrid.innerHTML = '<p class="empty-state">No workspaces available</p>';
            return;
        }

        let html = '';
        this.workspaces.forEach(workspace => {
            const isCurrent = this.currentWorkspace && this.currentWorkspace.id === workspace.id;
            html += `
            <div class="workspace-item ${isCurrent ? 'current' : ''}" data-workspace-id="${workspace.id}">
                <div class="workspace-info">
                    <h5>${workspace.name}</h5>
                    <p>${workspace.description || 'No description'}</p>
                    <span class="workspace-meta">${workspace.agents?.length || 0} agents • Created ${new Date(workspace.created_at).toLocaleDateString()}</span>
                </div>
                <div class="workspace-actions">
                    ${!isCurrent ? `<button class="btn small primary" onclick="WorkspaceManager.switchToWorkspace('${workspace.id}')">Switch</button>` : '<span class="current-badge">Current</span>'}
                    <button class="btn small" onclick="WorkspaceManager.editWorkspace('${workspace.id}')">Edit</button>
                    <button class="btn small danger" onclick="WorkspaceManager.deleteWorkspace('${workspace.id}')">Delete</button>
                </div>
            </div>
            `;
        });

        workspaceGrid.innerHTML = html;
    }

    /**
     * Load current workspace info
     */
    static async loadCurrentWorkspace() {
        try {
            const response = await fetch('/api/workspaces/current');
            if (response.ok) {
                const data = await response.json();
                this.currentWorkspace = data.workspace;
                this.updateCurrentWorkspaceInfo();
            }
        } catch (error) {
            console.error('Error loading current workspace:', error);
        }
    }

    /**
     * Update current workspace info in UI
     */
    static updateCurrentWorkspaceInfo() {
        const nameElement = document.getElementById('current-workspace-name');
        if (nameElement && this.currentWorkspace) {
            nameElement.textContent = this.currentWorkspace.name;
        }
    }

    /**
     * Create a new workspace
     */
    static createWorkspace() {
        this.showWorkspaceEditor();
    }

    /**
     * Edit an existing workspace
     */
    static editWorkspace(workspaceId) {
        const workspace = this.workspaces.find(w => w.id === workspaceId);
        if (workspace) {
            this.showWorkspaceEditor(workspace);
        }
    }

    /**
     * Show workspace editor modal
     */
    static showWorkspaceEditor(workspace = null) {
        // Create editor if it doesn't exist
        if (!document.getElementById('workspace-editor')) {
            const editorHTML = `
            <div id="workspace-editor" class="workspace-editor modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="workspace-editor-title">Create Workspace</h3>
                        <button class="modal-close" onclick="WorkspaceManager.closeEditor()">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div class="settings-group">
                            <label for="workspace-name">Name:</label>
                            <input type="text" id="workspace-name" placeholder="My Workspace">
                        </div>

                        <div class="settings-group">
                            <label for="workspace-description">Description:</label>
                            <textarea id="workspace-description" placeholder="Describe this workspace..."></textarea>
                        </div>

                        <div class="settings-group">
                            <label for="workspace-agents">Assigned Agents:</label>
                            <div id="workspace-agents" class="agent-checkboxes">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>

                        <div class="settings-group">
                            <label for="workspace-template">Template:</label>
                            <select id="workspace-template">
                                <option value="">No Template</option>
                                <option value="code-development">Code Development</option>
                                <option value="research-analysis">Research & Analysis</option>
                                <option value="content-creation">Content Creation</option>
                                <option value="custom">Custom Workflow</option>
                            </select>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn secondary" onclick="WorkspaceManager.closeEditor()">Cancel</button>
                        <button class="btn primary" onclick="WorkspaceManager.saveWorkspace()">Save Workspace</button>
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', editorHTML);
        }

        // Show editor
        const editor = document.getElementById('workspace-editor');
        const title = document.getElementById('workspace-editor-title');

        if (workspace) {
            title.textContent = 'Edit Workspace';
            document.getElementById('workspace-name').value = workspace.name;
            document.getElementById('workspace-description').value = workspace.description || '';
            document.getElementById('workspace-template').value = workspace.template || '';
            this.selectedWorkspace = workspace;
        } else {
            title.textContent = 'Create Workspace';
            document.getElementById('workspace-name').value = '';
            document.getElementById('workspace-description').value = '';
            document.getElementById('workspace-template').value = '';
            this.selectedWorkspace = null;
        }

        this.loadAvailableAgents();
        editor.style.display = 'flex';
    }

    /**
     * Load available agents for workspace assignment
     */
    static async loadAvailableAgents() {
        try {
            const response = await fetch('/api/agents');
            if (response.ok) {
                const data = await response.json();
                const agents = data.agents || [];
                this.populateAgentCheckboxes(agents);
            }
        } catch (error) {
            console.error('Error loading agents:', error);
        }
    }

    /**
     * Populate agent checkboxes
     */
    static populateAgentCheckboxes(agents) {
        const container = document.getElementById('workspace-agents');
        if (!container) return;

        let html = '';
        agents.forEach(agent => {
            const isAssigned = this.selectedWorkspace &&
                this.selectedWorkspace.agents &&
                this.selectedWorkspace.agents.includes(agent.id);

            html += `
            <label>
                <input type="checkbox" value="${agent.id}" ${isAssigned ? 'checked' : ''}>
                ${agent.name} (${agent.provider})
            </label>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Close workspace editor
     */
    static closeEditor() {
        const editor = document.getElementById('workspace-editor');
        if (editor) {
            editor.style.display = 'none';
        }
        this.selectedWorkspace = null;
    }

    /**
     * Save workspace
     */
    static async saveWorkspace() {
        const name = document.getElementById('workspace-name').value.trim();
        const description = document.getElementById('workspace-description').value.trim();
        const template = document.getElementById('workspace-template').value;

        // Get selected agents
        const agentCheckboxes = document.querySelectorAll('#workspace-agents input[type="checkbox"]:checked');
        const selectedAgents = Array.from(agentCheckboxes).map(cb => cb.value);

        if (!name) {
            Utils.showError('Workspace name is required');
            return;
        }

        const workspaceData = {
            name,
            description,
            template,
            agents: selectedAgents
        };

        try {
            const url = this.selectedWorkspace
                ? `/api/workspaces/${this.selectedWorkspace.id}`
                : '/api/workspaces';

            const method = this.selectedWorkspace ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workspaceData)
            });

            if (response.ok) {
                this.closeEditor();
                await this.loadWorkspaces();
                Utils.showSuccess(`Workspace '${name}' ${this.selectedWorkspace ? 'updated' : 'created'} successfully`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save workspace');
            }
        } catch (error) {
            console.error('Error saving workspace:', error);
            Utils.showError(error.message);
        }
    }

    /**
     * Switch to a workspace
     */
    static async switchToWorkspace(workspaceId) {
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                await this.loadWorkspaces();
                await this.loadCurrentWorkspace();
                Utils.showSuccess('Workspace switched successfully');

                // Refresh the page to update the UI
                window.location.reload();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to switch workspace');
            }
        } catch (error) {
            console.error('Error switching workspace:', error);
            Utils.showError(error.message);
        }
    }

    /**
     * Delete a workspace
     */
    static async deleteWorkspace(workspaceId) {
        const workspace = this.workspaces.find(w => w.id === workspaceId);
        if (!workspace) return;

        if (!confirm(`Are you sure you want to delete the workspace '${workspace.name}'? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadWorkspaces();
                Utils.showSuccess(`Workspace '${workspace.name}' deleted successfully`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete workspace');
            }
        } catch (error) {
            console.error('Error deleting workspace:', error);
            Utils.showError(error.message);
        }
    }

    /**
     * Edit current workspace
     */
    static editCurrent() {
        if (this.currentWorkspace) {
            this.editWorkspace(this.currentWorkspace.id);
        }
    }

    /**
     * Import workspace
     */
    static importWorkspace() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const workspaceData = JSON.parse(event.target.result);

                        if (!workspaceData.name) {
                            throw new Error('Invalid workspace format');
                        }

                        const response = await fetch('/api/workspaces', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(workspaceData)
                        });

                        if (response.ok) {
                            await this.loadWorkspaces();
                            Utils.showSuccess(`Workspace '${workspaceData.name}' imported successfully`);
                        } else {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to import workspace');
                        }
                    } catch (parseError) {
                        console.error('Error parsing workspace:', parseError);
                        Utils.showError('Invalid workspace file format');
                    }
                };
                reader.readAsText(file);
            } catch (error) {
                console.error('Error importing workspace:', error);
                Utils.showError('Failed to import workspace');
            }
        };

        input.click();
    }

    /**
     * Export current workspace
     */
    static exportWorkspace() {
        if (!this.currentWorkspace) {
            Utils.showError('No current workspace to export');
            return;
        }

        try {
            const blob = new Blob([JSON.stringify(this.currentWorkspace, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `workspace-${this.currentWorkspace.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
            a.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting workspace:', error);
            Utils.showError('Failed to export workspace');
        }
    }

    /**
     * Save workspace settings
     */
    static async saveSettings() {
        const autoSave = document.getElementById('workspace-auto-save')?.checked;
        const contextLimit = document.getElementById('workspace-context-limit')?.value;
        const defaultAgent = document.getElementById('workspace-default-agent')?.value;

        const settings = {
            autoSave,
            contextLimit: parseInt(contextLimit) || 50,
            defaultAgent
        };

        try {
            const response = await fetch('/api/workspaces/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                console.log('Workspace settings saved');
            } else {
                throw new Error('Failed to save workspace settings');
            }
        } catch (error) {
            console.error('Error saving workspace settings:', error);
            throw error;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    WorkspaceManager.init();
});

window.WorkspaceManager = WorkspaceManager;
