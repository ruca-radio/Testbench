// Quick Config Widget - Quick access to settings and configuration
class QuickConfigWidget {
    constructor(id, config = {}) {
        this.id = id;
        this.config = config;
        this.title = config.title || 'Quick Config';
        this.isCollapsed = false;
        this.currentSettings = {};
    }

    getTitle() {
        return this.title;
    }

    getIcon() {
        return '⚙️';
    }

    render() {
        return `
            <div class="quick-config-widget-content">
                <!-- Quick Model Selection -->
                <div class="quick-section">
                    <div class="section-header" onclick="QuickConfigWidget.toggleSection('model-section-${this.id}')">
                        <h5>Model Selection</h5>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="section-content" id="model-section-${this.id}">
                        <div class="config-group">
                            <label for="quick-model-select-${this.id}">Active Model:</label>
                            <select id="quick-model-select-${this.id}" onchange="QuickConfigWidget.changeModel('${this.id}')">
                                <option value="">Select Model...</option>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </select>
                        </div>
                        <div class="config-group">
                            <label for="quick-provider-${this.id}">Provider:</label>
                            <select id="quick-provider-${this.id}" onchange="QuickConfigWidget.changeProvider('${this.id}')">
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="openrouter">OpenRouter</option>
                                <option value="ollama">Ollama</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Model Parameters -->
                <div class="quick-section">
                    <div class="section-header" onclick="QuickConfigWidget.toggleSection('params-section-${this.id}')">
                        <h5>Parameters</h5>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="section-content" id="params-section-${this.id}">
                        <div class="config-group">
                            <label for="quick-temperature-${this.id}">Temperature:</label>
                            <div class="range-input-group">
                                <input type="range" id="quick-temperature-${this.id}"
                                       min="0" max="2" step="0.1" value="1"
                                       oninput="QuickConfigWidget.updateRangeValue('${this.id}', 'temperature')">
                                <span class="range-value" id="quick-temperature-value-${this.id}">1.0</span>
                            </div>
                        </div>
                        <div class="config-group">
                            <label for="quick-max-tokens-${this.id}">Max Tokens:</label>
                            <div class="range-input-group">
                                <input type="range" id="quick-max-tokens-${this.id}"
                                       min="100" max="32000" step="100" value="4000"
                                       oninput="QuickConfigWidget.updateRangeValue('${this.id}', 'max-tokens')">
                                <span class="range-value" id="quick-max-tokens-value-${this.id}">4000</span>
                            </div>
                        </div>
                        <div class="config-group">
                            <label for="quick-top-p-${this.id}">Top P:</label>
                            <div class="range-input-group">
                                <input type="range" id="quick-top-p-${this.id}"
                                       min="0" max="1" step="0.05" value="1"
                                       oninput="QuickConfigWidget.updateRangeValue('${this.id}', 'top-p')">
                                <span class="range-value" id="quick-top-p-value-${this.id}">1.0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-section">
                    <div class="section-header" onclick="QuickConfigWidget.toggleSection('actions-section-${this.id}')">
                        <h5>Quick Actions</h5>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="section-content" id="actions-section-${this.id}">
                        <div class="action-buttons">
                            <button class="btn small primary" onclick="QuickConfigWidget.openSettings('${this.id}')">
                                🔧 Full Settings
                            </button>
                            <button class="btn small secondary" onclick="QuickConfigWidget.savePreset('${this.id}')">
                                💾 Save Preset
                            </button>
                            <button class="btn small secondary" onclick="QuickConfigWidget.loadPreset('${this.id}')">
                                📁 Load Preset
                            </button>
                            <button class="btn small secondary" onclick="QuickConfigWidget.resetToDefaults('${this.id}')">
                                🔄 Reset
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Connection Status -->
                <div class="quick-section">
                    <div class="section-header" onclick="QuickConfigWidget.toggleSection('status-section-${this.id}')">
                        <h5>Status</h5>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="section-content" id="status-section-${this.id}">
                        <div class="status-grid">
                            <div class="status-item">
                                <span class="status-label">Provider:</span>
                                <span class="status-value" id="provider-status-${this.id}">✅ Connected</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Model:</span>
                                <span class="status-value" id="model-status-${this.id}">✅ Ready</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Agent:</span>
                                <span class="status-value" id="agent-status-${this.id}">✅ Active</span>
                            </div>
                        </div>
                        <button class="btn tiny" onclick="QuickConfigWidget.testConnection('${this.id}')">
                            🔍 Test Connection
                        </button>
                    </div>
                </div>

                <!-- Presets -->
                <div class="quick-section">
                    <div class="section-header" onclick="QuickConfigWidget.toggleSection('presets-section-${this.id}')">
                        <h5>Presets</h5>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="section-content" id="presets-section-${this.id}">
                        <div class="preset-buttons">
                            <button class="btn tiny preset-btn" onclick="QuickConfigWidget.applyPreset('${this.id}', 'creative')">
                                🎨 Creative
                            </button>
                            <button class="btn tiny preset-btn" onclick="QuickConfigWidget.applyPreset('${this.id}', 'balanced')">
                                ⚖️ Balanced
                            </button>
                            <button class="btn tiny preset-btn" onclick="QuickConfigWidget.applyPreset('${this.id}', 'precise')">
                                🎯 Precise
                            </button>
                            <button class="btn tiny preset-btn" onclick="QuickConfigWidget.applyPreset('${this.id}', 'coding')">
                                💻 Coding
                            </button>
                        </div>
                    </div>
                </div>

                ${this.renderExistingContent()}
            </div>
        `;
    }

    renderExistingContent() {
        if (!this.config.existingContent) return '';

        return `
            <div class="existing-content-section">
                <div class="section-header">
                    <h5>Legacy Controls</h5>
                </div>
                <div class="existing-content">
                    ${this.config.existingContent.map(el => el.outerHTML).join('')}
                </div>
            </div>
        `;
    }

    onMounted(container) {
        this.container = container;
        this.loadCurrentSettings();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auto-save settings when changed
        const inputs = this.container.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveCurrentSettings();
            });
        });
    }

    loadCurrentSettings() {
        try {
            const saved = localStorage.getItem(`quick-config-${this.id}`);
            if (saved) {
                this.currentSettings = JSON.parse(saved);
                this.applySettings(this.currentSettings);
            }
        } catch (error) {
            console.error('Error loading quick config settings:', error);
        }
    }

    saveCurrentSettings() {
        this.currentSettings = {
            model: document.getElementById(`quick-model-select-${this.id}`)?.value,
            provider: document.getElementById(`quick-provider-${this.id}`)?.value,
            temperature: document.getElementById(`quick-temperature-${this.id}`)?.value,
            maxTokens: document.getElementById(`quick-max-tokens-${this.id}`)?.value,
            topP: document.getElementById(`quick-top-p-${this.id}`)?.value
        };

        try {
            localStorage.setItem(`quick-config-${this.id}`, JSON.stringify(this.currentSettings));
        } catch (error) {
            console.error('Error saving quick config settings:', error);
        }
    }

    applySettings(settings) {
        if (settings.model) {
            const modelSelect = document.getElementById(`quick-model-select-${this.id}`);
            if (modelSelect) modelSelect.value = settings.model;
        }

        if (settings.provider) {
            const providerSelect = document.getElementById(`quick-provider-${this.id}`);
            if (providerSelect) providerSelect.value = settings.provider;
        }

        if (settings.temperature) {
            const tempRange = document.getElementById(`quick-temperature-${this.id}`);
            const tempValue = document.getElementById(`quick-temperature-value-${this.id}`);
            if (tempRange) tempRange.value = settings.temperature;
            if (tempValue) tempValue.textContent = parseFloat(settings.temperature).toFixed(1);
        }

        if (settings.maxTokens) {
            const tokensRange = document.getElementById(`quick-max-tokens-${this.id}`);
            const tokensValue = document.getElementById(`quick-max-tokens-value-${this.id}`);
            if (tokensRange) tokensRange.value = settings.maxTokens;
            if (tokensValue) tokensValue.textContent = settings.maxTokens;
        }

        if (settings.topP) {
            const topPRange = document.getElementById(`quick-top-p-${this.id}`);
            const topPValue = document.getElementById(`quick-top-p-value-${this.id}`);
            if (topPRange) topPRange.value = settings.topP;
            if (topPValue) topPValue.textContent = parseFloat(settings.topP).toFixed(2);
        }
    }

    // Static methods for UI interactions
    static toggleSection(sectionId) {
        const section = document.getElementById(sectionId);
        const header = section?.previousElementSibling;
        const icon = header?.querySelector('.toggle-icon');

        if (section) {
            if (section.style.display === 'none') {
                section.style.display = 'block';
                if (icon) icon.textContent = '▼';
            } else {
                section.style.display = 'none';
                if (icon) icon.textContent = '▶';
            }
        }
    }

    static updateRangeValue(widgetId, paramType) {
        const range = document.getElementById(`quick-${paramType}-${widgetId}`);
        const value = document.getElementById(`quick-${paramType}-value-${widgetId}`);

        if (range && value) {
            if (paramType === 'temperature' || paramType === 'top-p') {
                value.textContent = parseFloat(range.value).toFixed(paramType === 'top-p' ? 2 : 1);
            } else {
                value.textContent = range.value;
            }

            // Auto-save
            const widget = window.widgetSystem.widgets.get(widgetId);
            if (widget) {
                widget.saveCurrentSettings();
            }

            // Apply to main interface if possible
            QuickConfigWidget.applyToMainInterface(widgetId, paramType, range.value);
        }
    }

    static applyToMainInterface(widgetId, paramType, value) {
        // Try to apply settings to main chat interface
        if (window.updateQuickSettings) {
            window.updateQuickSettings(paramType, value);
        }
    }

    static changeModel(widgetId) {
        const select = document.getElementById(`quick-model-select-${widgetId}`);
        if (select && window.switchModel) {
            window.switchModel(select.value);
        }

        const widget = window.widgetSystem.widgets.get(widgetId);
        if (widget) {
            widget.saveCurrentSettings();
        }

        QuickConfigWidget.updateModelStatus(widgetId, select?.value);
    }

    static changeProvider(widgetId) {
        const select = document.getElementById(`quick-provider-${widgetId}`);
        if (select) {
            QuickConfigWidget.updateProviderStatus(widgetId, select.value);
        }

        const widget = window.widgetSystem.widgets.get(widgetId);
        if (widget) {
            widget.saveCurrentSettings();
        }
    }

    static updateProviderStatus(widgetId, provider) {
        const statusEl = document.getElementById(`provider-status-${widgetId}`);
        if (statusEl) {
            statusEl.textContent = `✅ ${provider}`;
        }
    }

    static updateModelStatus(widgetId, model) {
        const statusEl = document.getElementById(`model-status-${widgetId}`);
        if (statusEl) {
            statusEl.textContent = model ? `✅ ${model}` : '❌ No model';
        }
    }

    static openSettings(widgetId) {
        if (window.SettingsModal) {
            SettingsModal.open();
        } else if (window.openSettingsModal) {
            window.openSettingsModal();
        }
    }

    static savePreset(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        const presetName = prompt('Enter preset name:');
        if (!presetName) return;

        try {
            const presets = JSON.parse(localStorage.getItem('quick-config-presets') || '{}');
            presets[presetName] = widget.currentSettings;
            localStorage.setItem('quick-config-presets', JSON.stringify(presets));

            Utils.showSuccess(`Preset "${presetName}" saved`);
        } catch (error) {
            console.error('Error saving preset:', error);
            Utils.showError('Failed to save preset');
        }
    }

    static loadPreset(widgetId) {
        try {
            const presets = JSON.parse(localStorage.getItem('quick-config-presets') || '{}');
            const presetNames = Object.keys(presets);

            if (presetNames.length === 0) {
                Utils.showError('No saved presets found');
                return;
            }

            const presetOptions = presetNames.map(name =>
                `<option value="${name}">${name}</option>`
            ).join('');

            Utils.showModal('Load Preset', `
                <div class="preset-load-form">
                    <div class="settings-group">
                        <label for="preset-select">Available Presets:</label>
                        <select id="preset-select">
                            ${presetOptions}
                        </select>
                    </div>
                </div>
            `, () => {
                QuickConfigWidget.applySelectedPreset(widgetId);
            });
        } catch (error) {
            console.error('Error loading presets:', error);
            Utils.showError('Failed to load presets');
        }
    }

    static applySelectedPreset(widgetId) {
        const presetName = document.getElementById('preset-select')?.value;
        if (!presetName) return;

        try {
            const presets = JSON.parse(localStorage.getItem('quick-config-presets') || '{}');
            const preset = presets[presetName];

            if (preset) {
                const widget = window.widgetSystem.widgets.get(widgetId);
                if (widget) {
                    widget.applySettings(preset);
                    widget.saveCurrentSettings();
                }
                Utils.showSuccess(`Preset "${presetName}" applied`);
            }
        } catch (error) {
            console.error('Error applying preset:', error);
            Utils.showError('Failed to apply preset');
        }
    }

    static applyPreset(widgetId, presetType) {
        const presets = {
            creative: {
                temperature: '1.2',
                maxTokens: '4000',
                topP: '0.9'
            },
            balanced: {
                temperature: '1.0',
                maxTokens: '4000',
                topP: '1.0'
            },
            precise: {
                temperature: '0.3',
                maxTokens: '4000',
                topP: '0.8'
            },
            coding: {
                temperature: '0.1',
                maxTokens: '8000',
                topP: '0.95'
            }
        };

        const preset = presets[presetType];
        if (preset) {
            const widget = window.widgetSystem.widgets.get(widgetId);
            if (widget) {
                widget.applySettings(preset);
                widget.saveCurrentSettings();
            }
            Utils.showSuccess(`${presetType} preset applied`);
        }
    }

    static resetToDefaults(widgetId) {
        if (!confirm('Reset all settings to defaults?')) return;

        const defaults = {
            temperature: '1.0',
            maxTokens: '4000',
            topP: '1.0'
        };

        const widget = window.widgetSystem.widgets.get(widgetId);
        if (widget) {
            widget.applySettings(defaults);
            widget.saveCurrentSettings();
        }

        Utils.showSuccess('Settings reset to defaults');
    }

    static async testConnection(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        try {
            Utils.showInfo('Testing connection...');

            const provider = document.getElementById(`quick-provider-${widgetId}`)?.value;
            if (!provider) {
                throw new Error('No provider selected');
            }

            const response = await fetch(`/api/models/test-connection/${provider}`);
            if (response.ok) {
                const data = await response.json();
                Utils.showSuccess('Connection successful');

                // Update status
                QuickConfigWidget.updateProviderStatus(widgetId, provider);
            } else {
                throw new Error(`Connection failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            Utils.showError(`Connection test failed: ${error.message}`);

            // Update status
            const statusEl = document.getElementById(`provider-status-${widgetId}`);
            if (statusEl) {
                statusEl.textContent = '❌ Failed';
            }
        }
    }

    onDestroy() {
        this.saveCurrentSettings();
    }
}

// Register the widget
if (window.widgetSystem) {
    window.widgetSystem.registerWidget('quick-config-widget', QuickConfigWidget);
}
