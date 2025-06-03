/**
 * Enhanced Settings Manager
 * Integrates enhanced form components with the existing settings modal
 * Provides real-time validation, connection testing, and improved UX
 */

class EnhancedSettingsManager {
    constructor() {
        this.initialized = false;
        this.providers = ['openai', 'anthropic', 'google', 'openrouter', 'ollama', 'openai-compat'];
        this.connectionStates = new Map();
        this.validationStates = new Map();
        this.init();
    }

    init() {
        if (this.initialized) return;

        // Wait for SettingsModal to be ready
        if (!window.SettingsModal) {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.enhanceExistingModal();
        this.setupProviderEnhancements();
        this.initialized = true;
        console.log('EnhancedSettingsManager initialized');
    }

    /**
     * Enhance the existing settings modal with our enhanced form components
     */
    enhanceExistingModal() {
        // Override the original SettingsModal open method
        const originalOpen = SettingsModal.open;
        SettingsModal.open = async (tabId = 'ai-services') => {
            // Call original open method
            originalOpen.call(SettingsModal, tabId);

            // Add enhanced class to modal
            const modal = document.getElementById('settings-modal');
            if (modal) {
                modal.classList.add('enhanced-form');

                // Wait for modal to be visible, then enhance
                setTimeout(() => {
                    this.enhanceProviderInputs();
                    this.setupAdvancedSettings();
                }, 100);
            }
        };

        // Override the save method
        const originalSave = SettingsModal.save;
        SettingsModal.save = async () => {
            // Validate all forms first
            if (await this.validateAllSettings()) {
                await originalSave.call(SettingsModal);
            }
        };
    }

    /**
     * Enhance provider input fields
     */
    enhanceProviderInputs() {
        this.providers.forEach(provider => {
            this.enhanceProviderSection(provider);
        });
    }

    /**
     * Enhance a specific provider section
     */
    enhanceProviderSection(provider) {
        const providerSection = document.getElementById(`provider-${provider}`);
        if (!providerSection) return;

        // Find and enhance API key input
        const apiKeyInput = providerSection.querySelector(`#${provider}-api-key`);
        if (apiKeyInput) {
            this.enhanceApiKeyInput(provider, apiKeyInput);
        }

        // Find and enhance endpoint input
        const endpointInput = providerSection.querySelector(`#${provider}-endpoint`) ||
                             providerSection.querySelector(`#${provider}-endpoint`);
        if (endpointInput) {
            this.enhanceEndpointInput(provider, endpointInput);
        }

        // Add advanced settings section
        this.addAdvancedSettings(provider, providerSection);
    }

    /**
     * Enhance API key input with validation and testing
     */
    enhanceApiKeyInput(provider, input) {
        const parentGroup = input.closest('.settings-group');
        if (!parentGroup || parentGroup.classList.contains('enhanced')) return;

        parentGroup.classList.add('enhanced');

        // Convert to enhanced input group
        const label = parentGroup.querySelector('label');
        const testButton = parentGroup.querySelector('.test-btn');

        // Create enhanced input group
        const enhancedGroup = EnhancedForms.createInputGroup({
            id: input.id,
            label: label ? label.textContent : `${provider.toUpperCase()} API Key`,
            type: 'password',
            value: input.value,
            placeholder: this.getApiKeyPlaceholder(provider),
            required: true,
            validators: [
                EnhancedForms.validators.required,
                EnhancedForms.validators.apiKey
            ],
            testConnection: this.getConnectionTester(provider),
            showPasswordToggle: true,
            help: 'Your API key is stored securely and never shared.'
        });

        // Replace the original group content
        parentGroup.innerHTML = '';
        parentGroup.appendChild(enhancedGroup);

        // Store connection tester
        EnhancedForms.connectionTesters.set(input.id, this.getConnectionTester(provider));
    }

    /**
     * Enhance endpoint input with validation
     */
    enhanceEndpointInput(provider, input) {
        const parentGroup = input.closest('.settings-group');
        if (!parentGroup || parentGroup.classList.contains('enhanced')) return;

        parentGroup.classList.add('enhanced');

        const label = parentGroup.querySelector('label');

        // Create enhanced input group
        const enhancedGroup = EnhancedForms.createInputGroup({
            id: input.id,
            label: label ? label.textContent : 'Endpoint URL',
            type: 'url',
            value: input.value,
            placeholder: this.getEndpointPlaceholder(provider),
            validators: [
                EnhancedForms.validators.url
            ],
            testConnection: async (url) => {
                return await this.testEndpointConnection(provider, url);
            },
            help: `${provider} service endpoint URL`
        });

        // Replace the original group content
        parentGroup.innerHTML = '';
        parentGroup.appendChild(enhancedGroup);
    }

    /**
     * Add advanced settings section for each provider
     */
    addAdvancedSettings(provider, providerSection) {
        // Check if advanced settings already exist
        if (providerSection.querySelector('.advanced-settings-section')) return;

        const advancedSettings = document.createElement('div');
        advancedSettings.className = 'advanced-settings-section';
        advancedSettings.innerHTML = `
            <div class="advanced-settings-toggle" onclick="this.classList.toggle('expanded'); this.nextElementSibling.style.display = this.classList.contains('expanded') ? 'block' : 'none';">
                Advanced Settings
            </div>
            <div class="advanced-settings-content" style="display: none;">
                ${this.createAdvancedSettingsContent(provider)}
            </div>
        `;

        // Append to provider section
        providerSection.appendChild(advancedSettings);
    }

    /**
     * Create advanced settings content for a provider
     */
    createAdvancedSettingsContent(provider) {
        const providerConfigs = {
            openai: {
                'Default Model': {
                    id: `${provider}-default-model`,
                    type: 'select',
                    options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                    value: 'gpt-4o'
                },
                'Request Timeout (seconds)': {
                    id: `${provider}-timeout`,
                    type: 'number',
                    min: 10,
                    max: 300,
                    value: 60
                },
                'Max Retries': {
                    id: `${provider}-max-retries`,
                    type: 'number',
                    min: 0,
                    max: 5,
                    value: 3
                }
            },
            anthropic: {
                'Default Model': {
                    id: `${provider}-default-model`,
                    type: 'select',
                    options: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
                    value: 'claude-3-5-sonnet-20241022'
                },
                'Request Timeout (seconds)': {
                    id: `${provider}-timeout`,
                    type: 'number',
                    min: 10,
                    max: 300,
                    value: 60
                }
            },
            ollama: {
                'Keep Alive (minutes)': {
                    id: `${provider}-keep-alive`,
                    type: 'number',
                    min: 0,
                    max: 60,
                    value: 5
                },
                'Request Timeout (seconds)': {
                    id: `${provider}-timeout`,
                    type: 'number',
                    min: 10,
                    max: 300,
                    value: 120
                }
            }
        };

        const config = providerConfigs[provider] || {
            'Request Timeout (seconds)': {
                id: `${provider}-timeout`,
                type: 'number',
                min: 10,
                max: 300,
                value: 60
            }
        };

        let html = '<div class="settings-row">';
        Object.entries(config).forEach(([label, field], index) => {
            if (index > 0 && index % 2 === 0) {
                html += '</div><div class="settings-row">';
            }

            html += `<div class="enhanced-input-group">`;
            html += `<label class="enhanced-label" for="${field.id}">${label}:</label>`;

            if (field.type === 'select') {
                html += `<select id="${field.id}" class="enhanced-input">`;
                field.options.forEach(option => {
                    html += `<option value="${option}" ${option === field.value ? 'selected' : ''}>${option}</option>`;
                });
                html += `</select>`;
            } else {
                html += `<input type="${field.type}" id="${field.id}" class="enhanced-input"
                         value="${field.value}" min="${field.min || ''}" max="${field.max || ''}">`;
            }

            html += `</div>`;
        });
        html += '</div>';

        return html;
    }

    /**
     * Setup advanced settings functionality
     */
    setupAdvancedSettings() {
        // Enhance any remaining form inputs
        document.querySelectorAll('.advanced-settings-section .enhanced-input').forEach(input => {
            if (!input.hasAttribute('data-enhanced')) {
                const group = input.closest('.enhanced-input-group');
                if (group) {
                    EnhancedForms.enhanceInputGroup(group);
                }
            }
        });
    }

    /**
     * Setup provider-specific enhancements
     */
    setupProviderEnhancements() {
        // Override provider tab switching to re-enhance inputs
        const originalSwitchProviderTab = SettingsModal.switchProviderTab;
        SettingsModal.switchProviderTab = (providerId) => {
            originalSwitchProviderTab.call(SettingsModal, providerId);

            // Re-enhance the active provider after switching
            setTimeout(() => {
                this.enhanceProviderSection(providerId);
            }, 50);
        };
    }

    /**
     * Get API key placeholder for provider
     */
    getApiKeyPlaceholder(provider) {
        const placeholders = {
            openai: 'sk-...',
            anthropic: 'sk-ant-...',
            google: 'AIza...',
            openrouter: 'sk-or-...',
            ollama: 'Not required',
            'openai-compat': 'your-api-key'
        };
        return placeholders[provider] || 'Enter API key';
    }

    /**
     * Get endpoint placeholder for provider
     */
    getEndpointPlaceholder(provider) {
        const placeholders = {
            openai: 'https://api.openai.com/v1',
            ollama: 'http://localhost:11434',
            'openai-compat': 'https://api.example.com/v1'
        };
        return placeholders[provider] || 'https://api.example.com';
    }

    /**
     * Get connection tester for provider
     */
    getConnectionTester(provider) {
        return async (apiKey, input) => {
            if (provider === 'ollama') {
                // For Ollama, test the endpoint instead of API key
                const endpointInput = document.getElementById('ollama-endpoint');
                const endpoint = endpointInput ? endpointInput.value : 'http://localhost:11434';
                return await this.testProviderConnection(provider, { endpoint });
            } else {
                return await this.testProviderConnection(provider, { apiKey });
            }
        };
    }

    /**
     * Test provider connection
     */
    async testProviderConnection(provider, config) {
        this.connectionStates.set(provider, 'testing');

        try {
            const response = await Utils.apiCall('/api/models/test-connection', {
                method: 'POST',
                body: {
                    provider,
                    ...config
                }
            });

            this.connectionStates.set(provider, response.success ? 'connected' : 'failed');

            return {
                success: response.success,
                message: response.message || (response.success ? 'Connection successful' : 'Connection failed')
            };
        } catch (error) {
            this.connectionStates.set(provider, 'failed');
            return {
                success: false,
                message: `Connection failed: ${error.message}`
            };
        }
    }

    /**
     * Test endpoint connection
     */
    async testEndpointConnection(provider, url) {
        if (!url) {
            return { success: false, message: 'URL is required' };
        }

        try {
            // For local endpoints, try a simple fetch
            if (url.includes('localhost') || url.includes('127.0.0.1')) {
                const response = await fetch(url, {
                    method: 'HEAD',
                    timeout: 5000
                }).catch(() => ({ ok: false }));

                return {
                    success: response.ok,
                    message: response.ok ? 'Endpoint accessible' : 'Endpoint not reachable'
                };
            } else {
                // For external endpoints, use our backend to test
                return await this.testProviderConnection(provider, { endpoint: url });
            }
        } catch (error) {
            return {
                success: false,
                message: `Endpoint test failed: ${error.message}`
            };
        }
    }

    /**
     * Validate all settings before saving
     */
    async validateAllSettings() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return true;

        // Use enhanced forms validation
        const isValid = EnhancedForms.validateForm(modal);

        if (!isValid) {
            Utils.showError('Please fix validation errors before saving.');
            EnhancedForms.focusFirstInvalidInput(modal);
            return false;
        }

        return true;
    }

    /**
     * Show provider connection status
     */
    showProviderStatus(provider, status, message) {
        const statusElement = document.getElementById(`${provider}-connection-status`);
        if (!statusElement) return;

        const statusConfig = {
            connected: { icon: '🟢', text: 'Connected', class: 'status-connected' },
            disconnected: { icon: '🔴', text: 'Disconnected', class: 'status-disconnected' },
            testing: { icon: '🟡', text: 'Testing...', class: 'status-testing' },
            unknown: { icon: '⚪', text: 'Not tested', class: 'status-unknown' }
        };

        const config = statusConfig[status] || statusConfig.unknown;
        statusElement.innerHTML = `<span class="${config.class}">${config.icon} ${message || config.text}</span>`;
    }

    /**
     * Export enhanced settings
     */
    async exportSettings() {
        try {
            const settings = await Utils.apiCall('/api/settings/export');

            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `testbench-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showSuccess('Settings exported successfully');
        } catch (error) {
            Utils.showError(`Failed to export settings: ${error.message}`);
        }
    }

    /**
     * Import enhanced settings
     */
    async importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const settings = JSON.parse(text);

                await Utils.apiCall('/api/settings/import', {
                    method: 'POST',
                    body: { settings }
                });

                Utils.showSuccess('Settings imported successfully');

                // Reload the modal
                SettingsModal.close();
                setTimeout(() => SettingsModal.open(), 500);
            } catch (error) {
                Utils.showError(`Failed to import settings: ${error.message}`);
            }
        };

        input.click();
    }
}

// Create global instance
window.EnhancedSettingsManager = new EnhancedSettingsManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSettingsManager;
}
