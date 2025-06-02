// AI Services Manager for provider configuration with enhanced connection testing
class AIServicesManager {
    static connectionStatus = {};
    static loadingStates = {};

    static async loadProviderSettings() {
        try {
            // Load settings from the correct backend endpoint
            const response = await fetch('/api/settings/list/all');
            if (response.ok) {
                const settings = await response.json();
                this.populateProviderSettings(settings);
                await this.loadAllModels();
                await this.testAllConnections(); // Test connections on load
            } else {
                console.warn('Settings endpoint not available, using empty settings');
                await this.loadAllModels();
            }
        } catch (error) {
            console.error('Error loading provider settings:', error);
            // Try to load models anyway
            await this.loadAllModels();
        }
    }

    static populateProviderSettings(settings) {
        // Populate form fields with current settings
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];

        providers.forEach(provider => {
            const config = settings[provider] || {};

            const keyInput = document.getElementById(`${provider}-api-key`);
            if (keyInput && config.key) {
                keyInput.value = config.key;
            }

            const endpointInput = document.getElementById(`${provider}-endpoint`);
            if (endpointInput && config.endpoint) {
                endpointInput.value = config.endpoint;
            }

            // Update connection status display
            this.updateConnectionStatusDisplay(provider, { connected: false, message: 'Not tested' });
        });
    }

    // Test connection for a specific provider
    static async testConnection(provider) {
        const statusEl = document.getElementById(`${provider}-connection-status`);
        const testBtn = document.getElementById(`${provider}-test-btn`);

        if (statusEl) {
            statusEl.innerHTML = '<span class="status-testing">🔄 Testing...</span>';
        }
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
        }

        try {
            // Get current API key and endpoint from form
            const keyInput = document.getElementById(`${provider}-api-key`);
            const endpointInput = document.getElementById(`${provider}-endpoint`);

            const config = {};
            if (keyInput && keyInput.value.trim()) {
                config.key = keyInput.value.trim();
            }
            if (endpointInput && endpointInput.value.trim()) {
                config.endpoint = endpointInput.value.trim();
            }

            const response = await fetch(`/api/models/test-connection/${provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: { [provider]: config } })
            });

            const result = await response.json();
            this.connectionStatus[provider] = result;
            this.updateConnectionStatusDisplay(provider, result);

            if (result.connected) {
                Utils.showSuccess(`${provider} connection successful!`);
                // Refresh models after successful connection
                await this.refreshProviderModels(provider);
            } else {
                Utils.showError(`${provider} connection failed: ${result.error || 'Unknown error'}`);
            }

        } catch (error) {
            console.error(`Error testing ${provider} connection:`, error);
            const result = { connected: false, error: error.message, message: `Connection test failed: ${error.message}` };
            this.connectionStatus[provider] = result;
            this.updateConnectionStatusDisplay(provider, result);
            Utils.showError(`${provider} connection test failed`);
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }
        }
    }

    // Test all provider connections
    static async testAllConnections() {
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];

        for (const provider of providers) {
            // Don't show individual success/error messages for bulk test
            await this.testConnectionSilent(provider);
        }
    }

    // Silent connection test (no UI notifications)
    static async testConnectionSilent(provider) {
        try {
            const keyInput = document.getElementById(`${provider}-api-key`);
            const endpointInput = document.getElementById(`${provider}-endpoint`);

            const config = {};
            if (keyInput && keyInput.value.trim()) {
                config.key = keyInput.value.trim();
            }
            if (endpointInput && endpointInput.value.trim()) {
                config.endpoint = endpointInput.value.trim();
            }

            const response = await fetch(`/api/models/test-connection/${provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: { [provider]: config } })
            });

            const result = await response.json();
            this.connectionStatus[provider] = result;
            this.updateConnectionStatusDisplay(provider, result);

        } catch (error) {
            const result = { connected: false, error: error.message, message: `Connection test failed: ${error.message}` };
            this.connectionStatus[provider] = result;
            this.updateConnectionStatusDisplay(provider, result);
        }
    }

    // Update connection status display
    static updateConnectionStatusDisplay(provider, result) {
        const statusEl = document.getElementById(`${provider}-connection-status`);
        if (!statusEl) return;

        if (result.connected) {
            statusEl.innerHTML = `<span class="status-connected">✅ Connected</span>`;
            if (result.modelCount !== undefined) {
                statusEl.innerHTML += `<span class="model-count"> (${result.modelCount} models)</span>`;
            }
        } else {
            statusEl.innerHTML = `<span class="status-disconnected">❌ Disconnected</span>`;
            if (result.message) {
                statusEl.innerHTML += `<span class="error-message"> - ${result.message}</span>`;
            }
        }
    }

    static async loadAllModels() {
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];

        for (const provider of providers) {
            await this.loadProviderModels(provider);
        }
    }

    static async loadProviderModels(provider) {
        try {
            // Use the correct backend endpoint
            const response = await fetch(`/api/models/list/${provider}`);
            const modelGrid = document.getElementById(`${provider}-model-grid`);

            if (!modelGrid) return;

            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                this.renderModelGrid(modelGrid, models, provider);
            } else {
                modelGrid.innerHTML = '<p class="error">Failed to load models</p>';
            }
        } catch (error) {
            console.error(`Error loading ${provider} models:`, error);
            const modelGrid = document.getElementById(`${provider}-model-grid`);
            if (modelGrid) {
                modelGrid.innerHTML = '<p class="error">Connection error</p>';
            }
        }
    }

    // Refresh models for a specific provider
    static async refreshProviderModels(provider) {
        const modelGrid = document.getElementById(`${provider}-model-grid`);
        if (modelGrid) {
            modelGrid.innerHTML = '<p class="loading">🔄 Refreshing models...</p>';
        }

        try {
            // Get current configuration
            const keyInput = document.getElementById(`${provider}-api-key`);
            const endpointInput = document.getElementById(`${provider}-endpoint`);

            const config = {};
            if (keyInput && keyInput.value.trim()) {
                config.key = keyInput.value.trim();
            }
            if (endpointInput && endpointInput.value.trim()) {
                config.endpoint = endpointInput.value.trim();
            }

            // Call the refresh endpoint
            const response = await fetch('/api/models/action/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: provider,
                    config: { [provider]: config }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                this.renderModelGrid(modelGrid, models, provider);
                Utils.showSuccess(`Refreshed ${models.length} models for ${provider}`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to refresh models');
            }
        } catch (error) {
            console.error(`Error refreshing ${provider} models:`, error);
            if (modelGrid) {
                modelGrid.innerHTML = '<p class="error">Failed to refresh models</p>';
            }
            Utils.showError(`Failed to refresh ${provider} models: ${error.message}`);
        }
    }

    // Refresh all models
    static async refreshAllModels() {
        const refreshBtn = document.getElementById('refresh-all-models-btn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
        }

        try {
            // Get configuration for all providers
            const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];
            const config = {};

            providers.forEach(provider => {
                const keyInput = document.getElementById(`${provider}-api-key`);
                const endpointInput = document.getElementById(`${provider}-endpoint`);

                config[provider] = {};
                if (keyInput && keyInput.value.trim()) {
                    config[provider].key = keyInput.value.trim();
                }
                if (endpointInput && endpointInput.value.trim()) {
                    config[provider].endpoint = endpointInput.value.trim();
                }
            });

            // Call the bulk refresh endpoint
            const response = await fetch('/api/models/action/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });

            if (response.ok) {
                const data = await response.json();
                const results = data.results || {};

                // Update each provider's model grid
                for (const provider of providers) {
                    if (results[provider] && results[provider].success) {
                        await this.loadProviderModels(provider);
                    }
                }

                const totalSuccess = Object.values(results).filter(r => r.success).length;
                Utils.showSuccess(`Successfully refreshed models for ${totalSuccess}/${providers.length} providers`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to refresh models');
            }
        } catch (error) {
            console.error('Error refreshing all models:', error);
            Utils.showError(`Failed to refresh models: ${error.message}`);
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh All Models';
            }
        }
    }

    static renderModelGrid(container, models, provider) {
        if (models.length === 0) {
            container.innerHTML = '<p class="no-models">No models available</p>';
            return;
        }

        const modelHTML = models.map(model => `
            <div class="model-item" data-model-id="${model.id}" data-provider="${provider}">
                <div class="model-info">
                    <h6>${model.name || model.id}</h6>
                    <span class="model-id">${model.id}</span>
                </div>
                <div class="model-controls">
                    <label class="switch">
                        <input type="checkbox" ${model.enabled !== false ? 'checked' : ''}
                               onchange="AIServicesManager.toggleModel('${provider}', '${model.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `).join('');

        container.innerHTML = modelHTML;
        // Add click handler for model introspection
        container.querySelectorAll('.model-item').forEach(item => {
            const modelId = item.getAttribute('data-model-id');
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                AIServicesManager.introspectModel(provider, modelId);
            });
        });
    }

    static async toggleModel(provider, modelId, enabled) {
        try {
            // Use the correct backend endpoint
            const response = await fetch('/api/models/action/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, modelId, enabled })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to toggle model');
            }

            console.log(`Model ${modelId} ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling model:', error);
            Utils.showError('Failed to update model status');
            // Revert the checkbox state
            const checkbox = document.querySelector(`input[onchange*="${modelId}"]`);
            if (checkbox) {
                checkbox.checked = !enabled;
            }
        }
    }

    static async saveSettings() {
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];
        const settings = {};

        providers.forEach(provider => {
            const keyInput = document.getElementById(`${provider}-api-key`);
            const endpointInput = document.getElementById(`${provider}-endpoint`);

            settings[provider] = {};

            if (keyInput && keyInput.value.trim()) {
                settings[provider].key = keyInput.value.trim();
            }

            if (endpointInput && endpointInput.value.trim()) {
                settings[provider].endpoint = endpointInput.value.trim();
            }
        });

        try {
            // Use the correct backend endpoint
            const response = await fetch('/api/settings/action/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save settings');
            }

            Utils.showSuccess('AI service settings saved successfully');

            // Test connections after saving
            await this.testAllConnections();

        } catch (error) {
            console.error('Error saving AI service settings:', error);
            Utils.showError(`Failed to save settings: ${error.message}`);
            throw error;
        }
    }

    // Real-time API key validation
    static onApiKeyChange(provider) {
        // Clear previous connection status when API key changes
        this.updateConnectionStatusDisplay(provider, { connected: false, message: 'API key changed - test connection' });

        // Debounced connection test
        clearTimeout(this.testTimeouts?.[provider]);
        this.testTimeouts = this.testTimeouts || {};
        this.testTimeouts[provider] = setTimeout(() => {
            this.testConnectionSilent(provider);
        }, 1000); // Test after 1 second of no typing
    }
    // Generate brief introduction for a model
    static async introspectModel(provider, modelId) {
        const inferenceEl = document.getElementById('inference-box');
        if (!inferenceEl) return;

        // Show the inference box and add loading state
        inferenceEl.style.display = 'block';
        inferenceEl.innerHTML = `
            <div class="loading-content">
                <div class="loading-indicator"></div>
                <span>Loading introduction for ${modelId}...</span>
            </div>
        `;

        try {
            const resp = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: 'system', content: `You are the AI model ${modelId}.` },
                        { role: 'user', content: 'Introduce yourself and state what you are good at in 15 words max.' }
                    ]
                })
            });
            const data = await resp.json();
            const introduction = data.choices?.[0]?.message?.content || data.response || 'No introduction available';

            inferenceEl.innerHTML = `
                <div class="model-intro">
                    <h5>${modelId}</h5>
                    <p>${introduction}</p>
                </div>
            `;
        } catch (error) {
            console.error('Error introspecting model:', error);
            inferenceEl.innerHTML = `
                <div class="model-intro error">
                    <h5>${modelId}</h5>
                    <p>Failed to load introduction: ${error.message}</p>
                </div>
            `;
        }
    }
}

window.AIServicesManager = AIServicesManager;
