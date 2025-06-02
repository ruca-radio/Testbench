// Agent Manager for comprehensive agent CRUD operations
class AgentManager {
    static currentEditingAgent = null;
    static agents = [];

    static async loadAgents() {
        try {
            const response = await fetch('/api/agents/list');
            if (response.ok) {
                this.agents = await response.json();
                this.renderAgentGrid();
            }
        } catch (error) {
            console.error('Error loading agents:', error);
            Utils.showError('Failed to load agents');
        }
    }

    static renderAgentGrid() {
        const agentGrid = document.getElementById('agent-grid');
        if (!agentGrid) return;

        if (this.agents.length === 0) {
            agentGrid.innerHTML = '<p class="empty-state">No agents configured. Create your first agent!</p>';
            return;
        }

        const agentHTML = this.agents.map(agent => `
            <div class="agent-card" data-agent-id="${agent.id}">
                <div class="agent-header">
                    <h5>${agent.name}</h5>
                    <div class="agent-badge">${agent.provider || 'default'}</div>
                </div>
                <div class="agent-description">
                    ${agent.description || 'No description'}
                </div>
                <div class="agent-meta">
                    <span class="agent-model">${agent.model || 'No model set'}</span>
                    <span class="agent-temp">Temp: ${agent.temperature || 1.0}</span>
                </div>
                <div class="agent-actions">
                    <button class="btn small primary" onclick="AgentManager.editAgent('${agent.id}')">Edit</button>
                    <button class="btn small secondary" onclick="AgentManager.cloneAgent('${agent.id}')">Clone</button>
                    <button class="btn small secondary" onclick="AgentManager.exportAgent('${agent.id}')">Export</button>
                    <button class="btn small danger" onclick="AgentManager.deleteAgent('${agent.id}')">Delete</button>
                </div>
            </div>
        `).join('');

        agentGrid.innerHTML = agentHTML;
    }

    static async updateAgentList(agents) {
        this.agents = agents || [];
        this.renderAgentGrid();
    }

    static createAgent() {
        this.currentEditingAgent = null;
        this.showAgentEditor('Create New Agent');
        this.clearAgentForm();
    }

    static showAgentEditor(title) {
        const editor = document.getElementById('agent-editor');
        const editorTitle = document.getElementById('agent-editor-title');
        
        if (editor) {
            editor.style.display = 'block';
            if (editorTitle) {
                editorTitle.textContent = title;
            }
        }
    }

    static hideAgentEditor() {
        const editor = document.getElementById('agent-editor');
        if (editor) {
            editor.style.display = 'none';
        }
        this.currentEditingAgent = null;
    }

    static clearAgentForm() {
        // Clear form fields
        const nameField = document.getElementById('agent-name');
        const descField = document.getElementById('agent-description');
        const providerField = document.getElementById('agent-provider');
        const modelField = document.getElementById('agent-model');
        const systemMsgField = document.getElementById('agent-system-message');
        const tempField = document.getElementById('agent-temperature');
        const tempValueField = document.getElementById('agent-temperature-value');
        const maxTokensField = document.getElementById('agent-max-tokens');

        if (nameField) nameField.value = '';
        if (descField) descField.value = '';
        if (providerField) providerField.value = '';
        if (modelField) modelField.innerHTML = '<option value="">Select a provider first</option>';
        if (systemMsgField) systemMsgField.value = 'You are a helpful AI assistant.';
        if (tempField) tempField.value = '1';
        if (tempValueField) tempValueField.textContent = '1.0';
        if (maxTokensField) maxTokensField.value = '4000';

        // Clear tool checkboxes
        const toolCheckboxes = document.querySelectorAll('#agent-tools input[type="checkbox"]');
        toolCheckboxes.forEach(cb => cb.checked = false);

        // Clear MCP checkboxes
        const mcpCheckboxes = document.querySelectorAll('#agent-mcp-servers input[type="checkbox"]');
        mcpCheckboxes.forEach(cb => cb.checked = false);
    }

    static async editAgent(agentId) {
        try {
            const response = await fetch(`/api/agents/${agentId}`);
            if (response.ok) {
                const agent = await response.json();
                this.currentEditingAgent = agent;
                this.showAgentEditor(`Edit Agent: ${agent.name}`);
                this.populateAgentForm(agent);
            }
        } catch (error) {
            console.error('Error loading agent:', error);
            Utils.showError('Failed to load agent');
        }
    }

    static async cloneAgent(agentId) {
        try {
            const response = await fetch(`/api/agents/clone/${agentId}`, {
                method: 'POST'
            });

            if (response.ok) {
                const clonedAgent = await response.json();
                Utils.showSuccess(`Agent cloned as "${clonedAgent.name}"`);
                await this.loadAgents();
            }
        } catch (error) {
            console.error('Error cloning agent:', error);
            Utils.showError('Failed to clone agent');
        }
    }

    static async deleteAgent(agentId) {
        const agent = this.agents.find(a => a.id === agentId);
        if (!agent) return;

        const confirmed = confirm(`Are you sure you want to delete "${agent.name}"?`);
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/agents/delete/${agentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Utils.showSuccess('Agent deleted successfully');
                await this.loadAgents();
            }
        } catch (error) {
            console.error('Error deleting agent:', error);
            Utils.showError('Failed to delete agent');
        }
    }

    static exportAgent(agentId) {
        const agent = this.agents.find(a => a.id === agentId);
        if (!agent) return;

        const dataStr = JSON.stringify(agent, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${agent.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_agent.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    static importAgent() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const agentData = JSON.parse(e.target.result);

                    // Validate agent data
                    if (!agentData.name) {
                        throw new Error('Invalid agent file: missing name');
                    }

                    // Remove ID to create new agent
                    delete agentData.id;
                    agentData.name = `${agentData.name} (Imported)`;

                    const response = await fetch('/api/agents/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(agentData)
                    });

                    if (response.ok) {
                        Utils.showSuccess('Agent imported successfully');
                        await this.loadAgents();
                    }
                } catch (error) {
                    console.error('Error importing agent:', error);
                    Utils.showError('Failed to import agent');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    static showAgentEditor(title) {
        const editor = document.getElementById('agent-editor');
        const titleElement = document.getElementById('agent-editor-title');

        if (editor && titleElement) {
            titleElement.textContent = title;
            editor.style.display = 'block';
            editor.scrollIntoView({ behavior: 'smooth' });
        }
    }

    static hideAgentEditor() {
        const editor = document.getElementById('agent-editor');
        if (editor) {
            editor.style.display = 'none';
        }
    }

    static clearAgentForm() {
        document.getElementById('agent-name').value = '';
        document.getElementById('agent-description').value = '';
        document.getElementById('agent-provider').value = '';
        document.getElementById('agent-model').innerHTML = '<option value="">Select a provider first</option>';
        document.getElementById('agent-system-message').value = '';
        document.getElementById('agent-temperature').value = '1';
        document.getElementById('agent-temperature-value').textContent = '1.0';
        document.getElementById('agent-max-tokens').value = '4000';

        // Clear tool checkboxes
        document.querySelectorAll('#agent-tools input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#agent-mcp-servers input[type="checkbox"]').forEach(cb => cb.checked = false);
    }

    static populateAgentForm(agent) {
        document.getElementById('agent-name').value = agent.name || '';
        document.getElementById('agent-description').value = agent.description || '';
        document.getElementById('agent-provider').value = agent.provider || '';
        document.getElementById('agent-system-message').value = agent.systemMessage || '';
        document.getElementById('agent-temperature').value = agent.temperature || 1;
        document.getElementById('agent-temperature-value').textContent = (agent.temperature || 1).toFixed(1);
        document.getElementById('agent-max-tokens').value = agent.maxTokens || 4000;

        // Update model options and select current model
        this.updateModelOptions().then(() => {
            if (agent.model) {
                document.getElementById('agent-model').value = agent.model;
            }
        });

        // Set tool checkboxes
        if (agent.tools) {
            agent.tools.forEach(tool => {
                const checkbox = document.querySelector(`#agent-tools input[value="${tool}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Set MCP server checkboxes
        if (agent.mcpServers) {
            agent.mcpServers.forEach(server => {
                const checkbox = document.querySelector(`#agent-mcp-servers input[value="${server}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    static async updateModelOptions() {
        const providerSelect = document.getElementById('agent-provider');
        const modelSelect = document.getElementById('agent-model');

        if (!providerSelect || !modelSelect) return;

        const provider = providerSelect.value;
        modelSelect.innerHTML = '<option value="">Loading models...</option>';

        if (!provider) {
            modelSelect.innerHTML = '<option value="">Select a provider first</option>';
            return;
        }

        try {
            const response = await fetch(`/api/models/${provider}`);
            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];

                modelSelect.innerHTML = '<option value="">Select a model</option>';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name || model.id;
                    modelSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading models:', error);
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
        }
    }

    static validateAgentForm(agentData) {
        const errors = [];
        
        // Required fields validation
        if (!agentData.name) {
            errors.push('Agent name is required');
            document.getElementById('agent-name').classList.add('invalid');
        } else if (agentData.name.length < 3) {
            errors.push('Agent name must be at least 3 characters long');
            document.getElementById('agent-name').classList.add('invalid');
        } else {
            document.getElementById('agent-name').classList.remove('invalid');
        }
        
        if (!agentData.provider) {
            errors.push('Provider selection is required');
            document.getElementById('agent-provider').classList.add('invalid');
        } else {
            document.getElementById('agent-provider').classList.remove('invalid');
        }
        
        if (!agentData.model) {
            errors.push('Model selection is required');
            document.getElementById('agent-model').classList.add('invalid');
        } else {
            document.getElementById('agent-model').classList.remove('invalid');
        }
        
        // System message validation - not required but should be reasonable if provided
        if (agentData.systemMessage && agentData.systemMessage.length > 0 && agentData.systemMessage.length < 10) {
            errors.push('System message should be at least 10 characters if provided');
            document.getElementById('agent-system-message').classList.add('invalid');
        } else {
            document.getElementById('agent-system-message').classList.remove('invalid');
        }
        
        // Numeric parameter validation
        if (isNaN(agentData.temperature) || agentData.temperature < 0 || agentData.temperature > 2) {
            errors.push('Temperature must be a number between 0 and 2');
            document.getElementById('agent-temperature').classList.add('invalid');
        } else {
            document.getElementById('agent-temperature').classList.remove('invalid');
        }
        
        if (isNaN(agentData.maxTokens) || agentData.maxTokens < 1 || agentData.maxTokens > 32000) {
            errors.push('Max tokens must be a number between 1 and 32000');
            document.getElementById('agent-max-tokens').classList.add('invalid');
        } else {
            document.getElementById('agent-max-tokens').classList.remove('invalid');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    static async saveAgent() {
        // Clear previous validation styles
        document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
        
        const agentData = {
            name: document.getElementById('agent-name').value.trim(),
            description: document.getElementById('agent-description').value.trim(),
            provider: document.getElementById('agent-provider').value,
            model: document.getElementById('agent-model').value,
            systemMessage: document.getElementById('agent-system-message').value.trim(),
            temperature: parseFloat(document.getElementById('agent-temperature').value),
            maxTokens: parseInt(document.getElementById('agent-max-tokens').value),
            tools: Array.from(document.querySelectorAll('#agent-tools input:checked')).map(cb => cb.value),
            mcpServers: Array.from(document.querySelectorAll('#agent-mcp-servers input:checked')).map(cb => cb.value)
        };

        // Comprehensive validation
        const validation = this.validateAgentForm(agentData);
        if (!validation.valid) {
            Utils.showError(validation.errors.join('<br>'));
            return;
        }

        try {
            let response;
            if (this.currentEditingAgent) {
                // Update existing agent
                response = await fetch(`/api/agents/update/${this.currentEditingAgent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentData)
                });
            } else {
                // Create new agent
                response = await fetch('/api/agents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentData)
                });
            }

            if (response.ok) {
                Utils.showSuccess(`Agent ${this.currentEditingAgent ? 'updated' : 'created'} successfully`);
                this.hideAgentEditor();
                await this.loadAgents();

                // Update agent list in quick config
                if (window.app) {
                    await window.app.loadAgents();
                }
            }
        } catch (error) {
            console.error('Error saving agent:', error);
            Utils.showError('Failed to save agent');
        }
    }

    static cancelEdit() {
        this.currentEditingAgent = null;
        this.hideAgentEditor();
    }

    static async saveCurrentAgent() {
        // This method is called from SettingsModal.save()
        // We don't need to do anything here as individual agent saves are handled separately
        return Promise.resolve();
    }

    static updateAgentList(agents) {
        this.agents = agents;
        // Update workspace default agent dropdown
        const workspaceAgentSelect = document.getElementById('workspace-default-agent');
        if (workspaceAgentSelect) {
            workspaceAgentSelect.innerHTML = '<option value="default">Default Assistant</option>';
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = agent.name;
                workspaceAgentSelect.appendChild(option);
            });
        }
    }
}

// Set up temperature slider
document.addEventListener('DOMContentLoaded', () => {
    const tempSlider = document.getElementById('agent-temperature');
    const tempValue = document.getElementById('agent-temperature-value');

    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', (e) => {
            tempValue.textContent = parseFloat(e.target.value).toFixed(1);
        });
    }
});

window.AgentManager = AgentManager;
