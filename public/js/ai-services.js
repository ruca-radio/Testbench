// AI Services Manager for provider configuration with enhanced connection testing
class AIServicesManager {
    static connectionStatus = {};
    static connectionValidated = {}; // Track which connections have been validated
    static loadingStates = {};

    static async loadProviderSettings() {
        try {
            // Use the new Utils.apiCall for standardized error handling
            const settings = await Utils.apiCall('/api/settings/list/all');
            this.populateProviderSettings(settings);
            await this.loadAllModels();
            
            // Only test connections that haven't been validated yet
            await this.testConnectionsIfNeeded();
        } catch (error) {
            console.error('Error loading provider settings:', error);
            Utils.showError('Failed to load provider settings', error.message);
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
            if (endpointInput) {
                // For Ollama, use saved setting or env fallback
                if (provider === 'ollama' && !config.endpoint) {
                    // Use the default from env if no setting is saved
                    endpointInput.value = 'http://10.27.27.10:11434';
                } else if (config.endpoint) {
                    endpointInput.value = config.endpoint;
                }
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

            // Use new standardized API call
            const result = await Utils.apiCall(`/api/models/test-connection/${provider}`, {
                method: 'POST',
                body: JSON.stringify({ config: { [provider]: config } })
            });

            this.connectionStatus[provider] = result;
            this.updateConnectionStatusDisplay(provider, result);

            if (result.connected) {
                Utils.showSuccess(`${provider} connection successful!`);
                // Refresh models after successful connection
                await this.refreshProviderModels(provider);
            } else {
                Utils.showError(`${provider} connection failed`, result.message || result.error);
            }

        } catch (error) {
            console.error(`Error testing ${provider} connection:`, error);
            const result = {
                connected: false,
                error: error.message,
                message: `Connection test failed: ${error.message}`
            };
            this.connectionStatus[provider] = result;
            this.updateConnectionStatusDisplay(provider, result);
            Utils.showError(`${provider} connection test failed`, error.message);
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }
        }
    }

    // Test connections only if they haven't been validated yet
    static async testConnectionsIfNeeded() {
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];

        for (const provider of providers) {
            // Check if this provider connection has already been validated
            const keyInput = document.getElementById(`${provider}-api-key`);
            const endpointInput = document.getElementById(`${provider}-endpoint`);
            
            const currentKey = keyInput?.value?.trim();
            const currentEndpoint = endpointInput?.value?.trim();
            
            // Create a hash of the current configuration
            const configHash = this.createConfigHash(provider, currentKey, currentEndpoint);
            
            // Only test if we haven't validated this exact configuration before
            if (!this.connectionValidated[provider] || this.connectionValidated[provider] !== configHash) {
                await this.testConnectionSilent(provider);
                // Store the validated configuration hash
                if (this.connectionStatus[provider]?.connected) {
                    this.connectionValidated[provider] = configHash;
                }
            } else {
                // Use cached status
                this.updateConnectionStatusDisplay(provider, { connected: true, message: 'Connection verified' });
            }
        }
    }

    // Test all provider connections (forced)
    static async testAllConnections() {
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];
        
        // Clear validation cache to force retesting
        this.connectionValidated = {};

        for (const provider of providers) {
            // Don't show individual success/error messages for bulk test
            await this.testConnectionSilent(provider);
        }
    }

    // Create a hash of the configuration for caching purposes
    static createConfigHash(provider, key, endpoint) {
        const config = `${provider}:${key || ''}:${endpoint || ''}`;
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < config.length; i++) {
            const char = config.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
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

    static async loadProviderModels(provider, page = 1, pageSize = 20, search = '') {
        try {
            // Build query parameters for pagination and search
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString()
            });
            if (search) {
                params.append('search', search);
            }

            // Use the correct backend endpoint
            const response = await fetch(`/api/models/list/${provider}?${params}`);
            const modelGrid = document.getElementById(`${provider}-model-grid`);

            if (!modelGrid) return;

            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                const pagination = data.pagination || {};
                this.renderModelGrid(modelGrid, models, provider, pagination, search);
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

    static renderModelGrid(container, models, provider, pagination = {}, currentSearch = '') {
        // Create stats display (search is now inline with API key)
        const statsHTML = `
            <div class="model-stats-header">
                <div class="model-stats">
                    ${pagination.total ? `Showing ${pagination.startIndex || 1}-${pagination.endIndex || models.length} of ${pagination.total}` : `${models.length} models`}
                </div>
            </div>
        `;

        if (models.length === 0) {
            container.innerHTML = statsHTML + '<p class="no-models">No models available</p>';
            return;
        }

        const modelHTML = models.map(model => {
            const modelData = model.data || {};
            const modelType = modelData.type || 'Text';
            
            return `
            <div class="model-tile-compact" data-model-id="${model.id}" data-provider="${provider}">
                <div class="model-compact-header">
                    <div class="model-compact-info">
                        <span class="model-compact-name" title="${model.id}">${model.name || model.id}</span>
                        <span class="model-compact-type">${modelType}</span>
                    </div>
                    <div class="model-toggle">
                        <label class="switch">
                            <input type="checkbox" ${model.enabled === true ? 'checked' : ''}
                                   onchange="AIServicesManager.toggleModel('${provider}', '${model.id}', this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        // Create pagination controls
        const paginationHTML = this.createPaginationControls(provider, pagination, currentSearch);

        container.innerHTML = statsHTML + '<div class="model-grid">' + modelHTML + '</div>' + paginationHTML;

        // Add click handler for model introspection (excluding the toggle switch)
        container.querySelectorAll('.model-tile-compact').forEach(item => {
            const modelId = item.getAttribute('data-model-id');
            item.addEventListener('click', (e) => {
                // Don't trigger on switch clicks
                if (!e.target.closest('.model-toggle')) {
                    AIServicesManager.introspectModel(provider, modelId);
                }
            });
        });
    }

    static createPaginationControls(provider, pagination, currentSearch) {
        if (!pagination.totalPages || pagination.totalPages <= 1) {
            return '';
        }

        const currentPage = pagination.currentPage || 1;
        const totalPages = pagination.totalPages;
        
        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="btn small" onclick="AIServicesManager.loadProviderModels('${provider}', ${currentPage - 1}, 20, '${currentSearch}')">← Previous</button>`;
        }
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="btn small" onclick="AIServicesManager.loadProviderModels('${provider}', 1, 20, '${currentSearch}')">1</button>`;
            if (startPage > 2) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="btn small ${isActive}" onclick="AIServicesManager.loadProviderModels('${provider}', ${i}, 20, '${currentSearch}')">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
            paginationHTML += `<button class="btn small" onclick="AIServicesManager.loadProviderModels('${provider}', ${totalPages}, 20, '${currentSearch}')">${totalPages}</button>`;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="btn small" onclick="AIServicesManager.loadProviderModels('${provider}', ${currentPage + 1}, 20, '${currentSearch}')">Next →</button>`;
        }
        
        paginationHTML += '</div>';
        return paginationHTML;
    }

    // Search handling with debounce
    static handleModelSearch(provider, searchTerm) {
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Set new timeout for debounced search
        this.searchTimeout = setTimeout(() => {
            this.loadProviderModels(provider, 1, 20, searchTerm);
        }, 300);
    }

    static clearModelSearch(provider) {
        const searchInput = document.getElementById(`${provider}-model-search`);
        if (searchInput) {
            searchInput.value = '';
            this.loadProviderModels(provider, 1, 20, '');
        }
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
            // Use standardized API call
            await Utils.apiCall('/api/settings/action/bulk-update', {
                method: 'POST',
                body: JSON.stringify({ settings })
            });

            Utils.showSuccess('AI service settings saved successfully');

            // Test connections after saving
            await this.testAllConnections();

        } catch (error) {
            console.error('Error saving AI service settings:', error);
            Utils.showError('Failed to save settings', error.message);
            throw error;
        }
    }

    // Real-time API key validation
    static onApiKeyChange(provider) {
        // Clear cached validation when API key changes
        delete this.connectionValidated[provider];
        
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
        const descriptionDisplay = document.getElementById('model-description-display');
        const descriptionText = document.getElementById('description-text');
        
        if (!descriptionDisplay || !descriptionText) return;

        // Show the description display with loading state
        descriptionDisplay.style.display = 'block';
        descriptionText.textContent = `Getting introduction from ${modelId}...`;
        descriptionText.className = 'loading';
        
        // Reset any previous typewriter state
        const descriptionContent = descriptionText.parentElement;
        descriptionContent.classList.remove('typewriter');

        try {
            // Use the current provider configuration for the API call
            const keyInput = document.getElementById(`${provider}-api-key`);
            const endpointInput = document.getElementById(`${provider}-endpoint`);
            
            const config = {};
            if (keyInput && keyInput.value.trim()) {
                config.key = keyInput.value.trim();
            }
            if (endpointInput && endpointInput.value.trim()) {
                config.endpoint = endpointInput.value.trim();
            }

            // Get the configurable prompt from Global Settings
            const promptField = document.getElementById('model-description-prompt');
            const prompt = promptField?.value?.trim() || 'In 10 words or less, tell me who you are and what you can do.';

            const resp = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelId,
                    provider: provider,
                    config: { [provider]: config },
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                })
            });
            
            if (!resp.ok) {
                throw new Error(`API error: ${resp.status}`);
            }
            
            const data = await resp.json();
            const introduction = data.choices?.[0]?.message?.content || data.response || 'I am an AI model ready to help you.';

            // Remove loading class and show description with typewriter effect
            descriptionText.className = 'scrolling';
            descriptionText.textContent = `${modelId}: ${introduction}`;
            
            // Add typewriter class to parent for cursor effect
            const descriptionContent = descriptionText.parentElement;
            descriptionContent.classList.add('typewriter');

        } catch (error) {
            console.error('Error getting model introduction:', error);
            descriptionText.className = 'error';
            descriptionText.textContent = `${modelId}: Unable to get introduction - ${error.message}`;
            
            // Remove typewriter class on error
            const descriptionContent = descriptionText.parentElement;
            descriptionContent.classList.remove('typewriter');
        }
    }
}

window.AIServicesManager = AIServicesManager;
