// Quick configuration panel management
class QuickConfig {
    static init() {
        this.setupEventListeners();
        console.log('QuickConfig initialized');
    }

    static setupEventListeners() {
        // Temperature slider
        const tempSlider = document.getElementById('quick-temperature');
        const tempValue = document.getElementById('quick-temperature-value');

        if (tempSlider && tempValue) {
            tempSlider.addEventListener('input', (e) => {
                tempValue.textContent = parseFloat(e.target.value).toFixed(1);
                this.updateSettings();
            });
        }

        // Max tokens slider
        const maxTokensSlider = document.getElementById('quick-max-tokens');
        const maxTokensValue = document.getElementById('quick-max-tokens-value');

        if (maxTokensSlider && maxTokensValue) {
            maxTokensSlider.addEventListener('input', (e) => {
                maxTokensValue.textContent = e.target.value;
                this.updateSettings();
            });
        }

        // Model selection
        const modelSelect = document.getElementById('quick-model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => this.updateSettings());
        }

        // Agent selection
        const agentSelect = document.getElementById('quick-agent-select');
        if (agentSelect) {
            agentSelect.addEventListener('change', () => this.loadQuickAgent());
        }
    }

    static updateModelList(models) {
        try {
            const modelSelect = document.getElementById('quick-model-select');
            if (!modelSelect) {
                console.error('Model select element not found');
                return;
            }

            // Show loading state
            modelSelect.innerHTML = '<option value="">Loading models...</option>';
            modelSelect.disabled = true;

            // Handle empty models array
            if (!models || models.length === 0) {
                modelSelect.innerHTML = '<option value="">No models available</option>';
                modelSelect.disabled = false;
                Utils.showError('No models available. Check your API keys and connections.');
                return;
            }

            // Clear previous options
            modelSelect.innerHTML = '';

            try {
                // Group models by provider
                const groupedModels = {};
                models.forEach(model => {
                    const provider = model.provider || 'unknown';
                    if (!groupedModels[provider]) {
                        groupedModels[provider] = [];
                    }
                    groupedModels[provider].push(model);
                });

                // Add options grouped by provider
                Object.keys(groupedModels).forEach(provider => {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);

                    groupedModels[provider].forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = model.name || model.id;
                        optgroup.appendChild(option);
                    });

                    modelSelect.appendChild(optgroup);
                });

                // Select first model by default
                if (models.length > 0) {
                    modelSelect.value = models[0].id;
                    this.updateSettings();
                }

                console.log(`Successfully loaded ${models.length} models from ${Object.keys(groupedModels).length} providers`);
            } catch (innerError) {
                console.error('Error processing model data:', innerError);
                modelSelect.innerHTML = '<option value="">Error processing models</option>';
                Utils.showError('Error processing model data');
            }

            // Re-enable select
            modelSelect.disabled = false;
        } catch (error) {
            console.error('Error updating model list:', error);
            Utils.showError('Failed to update model list');

            // Ensure the select is usable even after error
            const modelSelect = document.getElementById('quick-model-select');
            if (modelSelect) {
                modelSelect.innerHTML = '<option value="">Error loading models</option>';
                modelSelect.disabled = false;
            }
        }
    }

    static updateAgentList(agents) {
        const agentSelect = document.getElementById('quick-agent-select');
        if (!agentSelect) return;

        // Clear existing options except default
        agentSelect.innerHTML = '<option value="default">Default Assistant</option>';

        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.name;
            agentSelect.appendChild(option);
        });
    }

    static updateSettings() {
        const temperature = document.getElementById('quick-temperature')?.value;
        const model = document.getElementById('quick-model-select')?.value;

        const settings = {
            temperature: parseFloat(temperature) || 1.0,
            model: model || ''
        };

        if (window.app) {
            window.app.updateSettings(settings);
        }

        // Also update the main model dropdown to stay in sync
        const mainModelSelect = document.getElementById('model-select');
        if (mainModelSelect && model && mainModelSelect.value !== model) {
            mainModelSelect.value = model;
        }
    }

    static loadQuickAgent() {
        const agentSelect = document.getElementById('quick-agent-select');
        if (!agentSelect) return;

        const agentId = agentSelect.value;

        if (window.app) {
            window.app.setCurrentAgent(agentId);
        }

        // Load agent settings if not default
        if (agentId !== 'default') {
            this.loadAgentSettings(agentId);
        }
    }

    static async loadAgentSettings(agentId) {
        try {
            const response = await fetch(`/api/agents/${agentId}`);
            if (response.ok) {
                const agent = await response.json();

                // Update UI with agent settings
                if (agent.model) {
                    const modelSelect = document.getElementById('quick-model-select');
                    if (modelSelect) {
                        modelSelect.value = agent.model;
                    }
                }

                if (agent.temperature !== undefined) {
                    const tempSlider = document.getElementById('quick-temperature');
                    const tempValue = document.getElementById('quick-temperature-value');
                    if (tempSlider && tempValue) {
                        tempSlider.value = agent.temperature;
                        tempValue.textContent = agent.temperature.toFixed(1);
                    }
                }

                this.updateSettings();
            }
        } catch (error) {
            console.error('Error loading agent settings:', error);
        }
    }
}

// Global functions for onclick handlers
window.toggleModelSettings = function () {
    const content = document.getElementById('model-settings-content');
    const icon = document.querySelector('.collapse-icon');
    const header = document.querySelector('.model-settings-header');

    if (content && icon && header) {
        const isHidden = content.hidden;
        content.hidden = !isHidden;
        icon.textContent = isHidden ? '▼' : '▶';
        header.setAttribute('aria-expanded', isHidden.toString());
    }
};

window.loadQuickAgent = function () {
    QuickConfig.loadQuickAgent();
};

window.updateQuickModel = function () {
    QuickConfig.updateSettings();
};

window.updateQuickSettings = function () {
    QuickConfig.updateSettings();
};

window.openAgentManager = function () {
    SettingsModal.open('agents');
};

// Missing global functions for UI interactions
window.openMCPManager = function () {
    SettingsModal.open('mcp');
};

window.switchWorkspace = function (workspaceId) {
    console.log('Switching to workspace:', workspaceId);
    // Implementation for workspace switching
    if (window.app) {
        window.app.currentWorkspace = workspaceId;
    }
    Utils.showInfo(`Switched to workspace: ${workspaceId}`);
};

window.switchModel = function (modelId) {
    console.log('Switching to model:', modelId);
    // Update the app's current model setting
    if (window.app) {
        window.app.updateSettings({ model: modelId });
    }

    // Update the quick config display to match
    const quickModelSelect = document.getElementById('quick-model-select');
    if (quickModelSelect && quickModelSelect.value !== modelId) {
        quickModelSelect.value = modelId;
    }

    Utils.showInfo(`Switched to model: ${modelId}`);
};

window.QuickConfig = QuickConfig;
