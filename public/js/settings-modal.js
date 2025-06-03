// Comprehensive Settings Modal with multiple tabs
class SettingsModal {
    static init() {
        this.createModal();
        this.setupEventListeners();
        console.log('SettingsModal initialized');
    }

    static createModal() {
        // Create modal HTML structure
        const modalHTML = `
        <div id="settings-modal" class="modal settings-modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Settings</h2>
                    <button class="modal-close" onclick="SettingsModal.close()">&times;</button>
                </div>

                <div class="modal-tabs">
                    <button class="tab-button active" data-tab="ai-services">AI Services</button>
                    <button class="tab-button" data-tab="agents">Agent Manager</button>
                    <button class="tab-button" data-tab="workspaces">Workspaces</button>
                    <button class="tab-button" data-tab="global">Global Settings</button>
                    <button class="tab-button" data-tab="knowledge">Knowledge Manager</button>
                    <button class="tab-button" data-tab="tools">Tool Manager</button>
                    <button class="tab-button" data-tab="mcp">MCP Servers</button>
                    <button class="tab-button" data-tab="testbench">TestBench</button>
                    <button class="tab-button" data-tab="users">Users</button>
                </div>

                <div class="modal-body">
                    ${this.createAIServicesTab()}
                    ${this.createAgentsTab()}
                    ${this.createWorkspacesTab()}
                    ${this.createGlobalTab()}
                    ${this.createKnowledgeTab()}
                    ${this.createToolsTab()}
                    ${this.createMCPTab()}
                    ${this.createTestBenchTab()}
                    ${this.createUsersTab()}
                </div>

                <div class="modal-footer">
                    <button class="btn secondary" onclick="SettingsModal.close()">Cancel</button>
                    <button class="btn primary" onclick="SettingsModal.save()">Save Changes</button>
                </div>
            </div>
        </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    static createAIServicesTab() {
        return `
        <div id="ai-services-tab" class="tab-content active">
            <div class="ai-services-header">
                <div class="header-left">
                    <h3>AI Service Providers</h3>
                    <p class="tab-description">Configure your AI service providers and manage available models.</p>
                </div>
                <!-- Model Description Scrolling Display -->
                <div id="model-description-display" class="model-description-scroll" style="display: none;">
                    <div class="description-content">
                        <span id="description-text"></span>
                    </div>
                </div>
            </div>

            <div class="ai-services-container">
                <div class="provider-tabs-vertical">
                    <button class="provider-tab-btn active" data-provider="openai" onclick="SettingsModal.switchProviderTab('openai')">
                        <img class="provider-logo" src="/images/openai-logo.png" alt="OpenAI">
                        OpenAI
                    </button>
                    <button class="provider-tab-btn" data-provider="anthropic" onclick="SettingsModal.switchProviderTab('anthropic')">
                        <img class="provider-logo" src="/images/anthropic-logo.png" alt="Anthropic">
                        Anthropic
                    </button>
                    <button class="provider-tab-btn" data-provider="google" onclick="SettingsModal.switchProviderTab('google')">
                        <img class="provider-logo" src="/images/google-ai-logo.png" alt="Google AI">
                        Google
                    </button>
                    <button class="provider-tab-btn" data-provider="openrouter" onclick="SettingsModal.switchProviderTab('openrouter')">
                        <img class="provider-logo" src="/images/openrouter-logo.png" alt="OpenRouter">
                        OpenRouter
                    </button>
                    <button class="provider-tab-btn" data-provider="ollama" onclick="SettingsModal.switchProviderTab('ollama')">
                        <img class="provider-logo" src="/images/ollama-logo.png" alt="Ollama">
                        Ollama
                    </button>
                    <button class="provider-tab-btn" data-provider="openai-compat" onclick="SettingsModal.switchProviderTab('openai-compat')">
                        <span class="provider-icon">🔧</span>
                        OpenAI Compat.
                    </button>
                </div>

                <div class="provider-content-area">
                    <!-- OpenAI Provider -->
                    <div class="provider-content active" id="provider-openai">
                        <h4>OpenAI Configuration
                            <div class="connection-status" id="openai-connection-status">
                                <span class="status-unknown">⚪ Not tested</span>
                            </div>
                        </h4>
                        <div class="settings-group">
                            <label for="openai-api-key">API Key:</label>
                            <div class="api-key-row">
                                <input type="text" id="openai-api-key" placeholder="sk-..." autocomplete="off" data-lpignore="true"
                                       onchange="AIServicesManager.onApiKeyChange('openai')">
                                <input type="text" id="openai-model-search" placeholder="Search models..." 
                                       onkeyup="AIServicesManager.handleModelSearch('openai', this.value)"
                                       class="search-input">
                                <button class="btn small test-btn" id="openai-test-btn" onclick="AIServicesManager.testConnection('openai')">Test Connection</button>
                            </div>
                            <div class="api-key-warning">Never share your API keys. Keys are stored securely on the server.</div>
                        </div>
                        <div class="settings-group">
                            <label for="openai-endpoint">Custom Endpoint (optional):</label>
                            <input type="url" id="openai-endpoint" placeholder="https://api.openai.com/v1">
                        </div>
                        <div class="model-list" id="openai-models">
                            <label>Available Models:</label>
                            <div class="model-grid" id="openai-model-grid">Loading...</div>
                            <button class="btn small secondary" onclick="AIServicesManager.refreshProviderModels('openai')">Refresh Models</button>
                        </div>
                    </div>

                    <!-- Anthropic Provider -->
                    <div class="provider-content" id="provider-anthropic">
                        <h4>Anthropic Configuration
                            <div class="connection-status" id="anthropic-connection-status">
                                <span class="status-unknown">⚪ Not tested</span>
                            </div>
                        </h4>
                        <div class="settings-group">
                            <label for="anthropic-api-key">API Key:</label>
                            <div class="api-key-row">
                                <input type="text" id="anthropic-api-key" placeholder="sk-ant-..." autocomplete="off" data-lpignore="true"
                                       onchange="AIServicesManager.onApiKeyChange('anthropic')">
                                <input type="text" id="anthropic-model-search" placeholder="Search models..." 
                                       onkeyup="AIServicesManager.handleModelSearch('anthropic', this.value)"
                                       class="search-input">
                                <button class="btn small test-btn" id="anthropic-test-btn" onclick="AIServicesManager.testConnection('anthropic')">Test Connection</button>
                            </div>
                            <div class="api-key-warning">Never share your API keys. Keys are stored securely on the server.</div>
                        </div>
                        <div class="model-list" id="anthropic-models">
                            <label>Available Models:</label>
                            <div class="model-grid" id="anthropic-model-grid">Loading...</div>
                            <button class="btn small secondary" onclick="AIServicesManager.refreshProviderModels('anthropic')">Refresh Models</button>
                        </div>
                    </div>

                    <!-- Google Provider -->
                    <div class="provider-content" id="provider-google">
                        <h4>Google AI Configuration
                            <div class="connection-status" id="google-connection-status">
                                <span class="status-unknown">⚪ Not tested</span>
                            </div>
                        </h4>
                        <div class="settings-group">
                            <label for="google-api-key">API Key:</label>
                            <input type="text" id="google-api-key" placeholder="AIza..." autocomplete="off" data-lpignore="true"
                                   onchange="AIServicesManager.onApiKeyChange('google')">
                            <button class="btn small test-btn" id="google-test-btn" onclick="AIServicesManager.testConnection('google')">Test Connection</button>
                            <div class="api-key-warning">Never share your API keys. Keys are stored securely on the server.</div>
                        </div>
                        <div class="settings-group">
                            <label for="google-project-id">Project ID (optional):</label>
                            <input type="text" id="google-project-id" placeholder="my-project-id">
                        </div>
                        <div class="model-list" id="google-models">
                            <label>Available Models:</label>
                            <div class="model-grid" id="google-model-grid">Loading...</div>
                            <button class="btn small secondary" onclick="AIServicesManager.refreshProviderModels('google')">Refresh Models</button>
                        </div>
                    </div>

                    <!-- OpenRouter Provider -->
                    <div class="provider-content" id="provider-openrouter">
                        <h4>OpenRouter Configuration
                            <div class="connection-status" id="openrouter-connection-status">
                                <span class="status-unknown">⚪ Not tested</span>
                            </div>
                        </h4>
                        <div class="settings-group">
                            <label for="openrouter-api-key">API Key:</label>
                            <div class="api-key-row">
                                <input type="text" id="openrouter-api-key" placeholder="sk-or-..." autocomplete="off" data-lpignore="true"
                                       onchange="AIServicesManager.onApiKeyChange('openrouter')">
                                <input type="text" id="openrouter-model-search" placeholder="Search models..." 
                                       onkeyup="AIServicesManager.handleModelSearch('openrouter', this.value)"
                                       class="search-input">
                                <button class="btn small test-btn" id="openrouter-test-btn" onclick="AIServicesManager.testConnection('openrouter')">Test Connection</button>
                            </div>
                            <div class="api-key-warning">Never share your API keys. Keys are stored securely on the server.</div>
                        </div>
                        <div class="model-list" id="openrouter-models">
                            <label>Available Models:</label>
                            <div class="model-grid" id="openrouter-model-grid">Loading...</div>
                            <button class="btn small secondary" onclick="AIServicesManager.refreshProviderModels('openrouter')">Refresh Models</button>
                        </div>
                    </div>

                    <!-- Ollama Provider -->
                    <div class="provider-content" id="provider-ollama">
                        <h4>Ollama Configuration
                            <div class="connection-status" id="ollama-connection-status">
                                <span class="status-unknown">⚪ Not tested</span>
                            </div>
                        </h4>
                        <div class="settings-group">
                            <label for="ollama-endpoint">Endpoint:</label>
                            <div class="api-key-row">
                                <input type="url" id="ollama-endpoint" placeholder="http://localhost:11434" value="http://localhost:11434"
                                       onchange="AIServicesManager.onApiKeyChange('ollama')">
                                <input type="text" id="ollama-model-search" placeholder="Search models..." 
                                       onkeyup="AIServicesManager.handleModelSearch('ollama', this.value)"
                                       class="search-input">
                                <button class="btn small test-btn" id="ollama-test-btn" onclick="AIServicesManager.testConnection('ollama')">Test Connection</button>
                            </div>
                        </div>
                        <div class="model-list" id="ollama-models">
                            <label>Available Models:</label>
                            <div class="model-grid" id="ollama-model-grid">Loading...</div>
                            <button class="btn small secondary" onclick="AIServicesManager.refreshProviderModels('ollama')">Refresh Models</button>
                        </div>
                    </div>

                    <!-- OpenAI Compatible Provider -->
                    <div class="provider-content" id="provider-openai-compat">
                        <h4>OpenAI Compatible Configuration
                            <div class="connection-status" id="openai-compat-connection-status">
                                <span class="status-unknown">⚪ Not tested</span>
                            </div>
                        </h4>
                        <div class="settings-group">
                            <label for="openai-compat-name">Provider Name:</label>
                            <input type="text" id="openai-compat-name" placeholder="Custom Provider">
                        </div>
                        <div class="settings-group">
                            <label for="openai-compat-endpoint">API Endpoint:</label>
                            <input type="url" id="openai-compat-endpoint" placeholder="https://api.example.com/v1"
                                   onchange="AIServicesManager.onApiKeyChange('openai-compat')">
                        </div>
                        <div class="settings-group">
                            <label for="openai-compat-api-key">API Key:</label>
                            <input type="text" id="openai-compat-api-key" placeholder="your-api-key" autocomplete="off" data-lpignore="true"
                                   onchange="AIServicesManager.onApiKeyChange('openai-compat')">
                            <button class="btn small test-btn" id="openai-compat-test-btn" onclick="AIServicesManager.testConnection('openai-compat')">Test Connection</button>
                        </div>
                        <div class="settings-group">
                            <label for="openai-compat-headers">Custom Headers (JSON):</label>
                            <textarea id="openai-compat-headers" placeholder='{"X-Custom-Header": "value"}' rows="3"></textarea>
                        </div>
                        <div class="model-list" id="openai-compat-models">
                            <label>Available Models:</label>
                            <div class="model-grid" id="openai-compat-model-grid">Loading...</div>
                            <button class="btn small secondary" onclick="AIServicesManager.refreshProviderModels('openai-compat')">Refresh Models</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button class="btn primary" id="refresh-all-models-btn" onclick="AIServicesManager.refreshAllModels()">Refresh All Models</button>
                <button class="btn secondary" onclick="SettingsModal.testAllConnections()">Test All Connections</button>
            </div>
        </div>
        `;
    }

    static createAgentsTab() {
        return `
        <div id="agents-tab" class="tab-content">
            <h3>Agent Manager</h3>

            <div class="agent-toolbar">
                <button class="btn primary" onclick="AgentManager.createAgent()">+ Create New Agent</button>
                <button class="btn secondary" onclick="AgentManager.importAgent()">Import Agent</button>
                <button class="btn secondary" onclick="AgentManager.exportSelected()">Export Selected</button>
            </div>

            <div class="agent-list" id="agent-list">
                <div class="agent-grid" id="agent-grid">Loading agents...</div>
            </div>

            <div id="agent-editor" class="agent-editor" style="display: none;">
                <h4 id="agent-editor-title">Create New Agent</h4>

                <div class="settings-group">
                    <label for="agent-name">Name:</label>
                    <input type="text" id="agent-name" placeholder="My Custom Agent">
                </div>

                <div class="settings-group">
                    <label for="agent-description">Description:</label>
                    <textarea id="agent-description" placeholder="Describe what this agent does..."></textarea>
                </div>

                <div class="settings-group">
                    <label for="agent-provider">Provider:</label>
                    <select id="agent-provider" onchange="AgentManager.updateModelOptions()">
                        <option value="">Select Provider</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="ollama">Ollama</option>
                    </select>
                </div>

                <div class="settings-group">
                    <label for="agent-model">Model:</label>
                    <select id="agent-model">
                        <option value="">Select a provider first</option>
                    </select>
                </div>

                <div class="settings-group">
                    <label for="agent-system-message">System Message:</label>
                    <textarea id="agent-system-message" rows="4" placeholder="You are a helpful assistant..."></textarea>
                </div>

                <div class="settings-row">
                    <div class="settings-group">
                        <label for="agent-temperature">Temperature:</label>
                        <input type="range" id="agent-temperature" min="0" max="2" step="0.1" value="1">
                        <span id="agent-temperature-value">1.0</span>
                    </div>
                    <div class="settings-group">
                        <label for="agent-max-tokens">Max Tokens:</label>
                        <input type="number" id="agent-max-tokens" min="1" max="32000" value="4000">
                    </div>
                </div>

                <div class="settings-group">
                    <label>Available Tools:</label>
                    <div class="tool-checkboxes" id="agent-tools">
                        <label><input type="checkbox" value="web-search"> Web Search</label>
                        <label><input type="checkbox" value="code-execution"> Code Execution</label>
                        <label><input type="checkbox" value="file-operations"> File Operations</label>
                        <label><input type="checkbox" value="calculator"> Calculator</label>
                    </div>
                </div>

                <div class="settings-group">
                    <label>MCP Servers:</label>
                    <div class="mcp-checkboxes" id="agent-mcp-servers">
                        <label><input type="checkbox" value="filesystem"> File System</label>
                        <label><input type="checkbox" value="database"> Database</label>
                        <label><input type="checkbox" value="git"> Git Operations</label>
                    </div>
                </div>

                <div class="agent-editor-actions">
                    <button class="btn secondary" onclick="AgentManager.cancelEdit()">Cancel</button>
                    <button class="btn primary" onclick="AgentManager.saveAgent()">Save Agent</button>
                </div>
            </div>
        </div>
        `;
    }

    static createWorkspacesTab() {
        return `
        <div id="workspaces-tab" class="tab-content">
            <h3>Workspace Manager</h3>

            <div class="workspace-toolbar">
                <button class="btn primary" onclick="WorkspaceManager.createWorkspace()">+ Create Workspace</button>
                <button class="btn secondary" onclick="WorkspaceManager.importWorkspace()">Import</button>
                <button class="btn secondary" onclick="WorkspaceManager.exportWorkspace()">Export Current</button>
            </div>

            <div class="current-workspace">
                <h4>Current Workspace</h4>
                <div class="workspace-info">
                    <span id="current-workspace-name">Default Workspace</span>
                    <button class="btn small" onclick="WorkspaceManager.editCurrent()">Edit</button>
                </div>
            </div>

            <div class="workspace-list">
                <h4>Available Workspaces</h4>
                <div id="workspace-grid" class="workspace-grid">Loading workspaces...</div>
            </div>

            <div class="workspace-settings">
                <h4>Workspace Settings</h4>
                <div class="settings-group">
                    <label for="workspace-auto-save">Auto-save conversations:</label>
                    <input type="checkbox" id="workspace-auto-save" checked>
                </div>
                <div class="settings-group">
                    <label for="workspace-context-limit">Context History Limit:</label>
                    <input type="number" id="workspace-context-limit" value="50" min="1" max="200">
                </div>
                <div class="settings-group">
                    <label for="workspace-default-agent">Default Agent:</label>
                    <select id="workspace-default-agent">
                        <option value="default">Default Assistant</option>
                    </select>
                </div>
            </div>
        </div>
        `;
    }

    static createGlobalTab() {
        return `
        <div id="global-tab" class="tab-content">
            <h3>Global Settings</h3>

            <div class="settings-section">
                <h4>Appearance</h4>
                <div class="settings-group">
                    <label for="theme-select">Theme:</label>
                    <select id="theme-select" onchange="GlobalSettings.changeTheme()">
                        <option value="dark">Dark (Default)</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto (System)</option>
                        <option value="high-contrast">High Contrast</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="font-size">Font Size:</label>
                    <select id="font-size">
                        <option value="small">Small</option>
                        <option value="medium" selected>Medium</option>
                        <option value="large">Large</option>
                        <option value="extra-large">Extra Large</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="compact-mode">Compact Mode:</label>
                    <input type="checkbox" id="compact-mode">
                </div>
            </div>

            <div class="settings-section">
                <h4>Memory & Summarization</h4>
                <div class="settings-group">
                    <label for="persistent-memory">Enable Persistent Memory:</label>
                    <input type="checkbox" id="persistent-memory">
                </div>
                <div class="settings-group">
                    <label for="auto-summarize">Auto-summarize long conversations:</label>
                    <input type="checkbox" id="auto-summarize" checked>
                </div>
                <div class="settings-group">
                    <label for="summary-threshold">Summarize after (messages):</label>
                    <input type="number" id="summary-threshold" value="50" min="10" max="200">
                </div>
                <div class="settings-group">
                    <label for="memory-retention">Memory Retention (days):</label>
                    <input type="number" id="memory-retention" value="30" min="1" max="365">
                </div>
                <div class="settings-group">
                    <label for="summary-model-provider">Summary Model Provider:</label>
                    <select id="summary-model-provider" onchange="GlobalSettings.updateSummaryModels()">
                        <option value="">Auto (use current model)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="ollama">Ollama</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="summary-model">Summary Model:</label>
                    <select id="summary-model">
                        <option value="">Auto (use current model)</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h4>Model Descriptions & Prompts</h4>
                <div class="settings-group">
                    <label for="model-description-prompt">Model Description Prompt:</label>
                    <textarea id="model-description-prompt" rows="3" placeholder="Prompt used to get model descriptions..."
                    >In 10 words or less, tell me who you are and what you can do.</textarea>
                    <small class="setting-note">This prompt is sent to models when generating their descriptions</small>
                </div>
                <div class="settings-group">
                    <label for="conversation-title-prompt">Conversation Title Prompt:</label>
                    <textarea id="conversation-title-prompt" rows="3" placeholder="Prompt used to generate conversation titles..."
                    >Generate a concise, descriptive title (5-7 words) for this conversation based on the content:</textarea>
                    <small class="setting-note">This prompt is used to auto-generate conversation titles</small>
                </div>
                <div class="settings-group">
                    <label for="title-model-provider">Title Generation Provider:</label>
                    <select id="title-model-provider" onchange="GlobalSettings.updateTitleModels()">
                        <option value="">Auto (use current model)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="ollama">Ollama</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="title-model">Title Generation Model:</label>
                    <select id="title-model">
                        <option value="">Auto (use current model)</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h4>Behavior</h4>
                <div class="settings-group">
                    <label for="auto-title">Auto-generate chat titles:</label>
                    <input type="checkbox" id="auto-title" checked>
                </div>
                <div class="settings-group">
                    <label for="streaming-responses">Stream responses:</label>
                    <input type="checkbox" id="streaming-responses" checked>
                </div>
                <div class="settings-group">
                    <label for="confirm-delete">Confirm before deleting:</label>
                    <input type="checkbox" id="confirm-delete" checked>
                </div>
                <div class="settings-group">
                    <label for="send-on-enter">Send message on Enter:</label>
                    <input type="checkbox" id="send-on-enter" checked>
                </div>
            </div>

            <div class="settings-section">
                <h4>TestBench Configuration</h4>
                <div class="settings-group">
                    <label for="testbench-enabled">Enable TestBench:</label>
                    <input type="checkbox" id="testbench-enabled">
                </div>
                <div class="settings-group">
                    <label for="testbench-provider">Default TestBench Provider:</label>
                    <select id="testbench-provider" onchange="GlobalSettings.updateTestBenchModels()">
                        <option value="">Select Provider</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="ollama">Ollama</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="testbench-model">Default TestBench Model:</label>
                    <select id="testbench-model">
                        <option value="">Select a provider first</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="testbench-parallel-tests">Max Parallel Tests:</label>
                    <input type="number" id="testbench-parallel-tests" value="3" min="1" max="10">
                </div>
            </div>

            <div class="settings-section">
                <h4>Persistent Memory Storage</h4>
                <div class="settings-group">
                    <label for="memory-storage-type">Storage Type:</label>
                    <select id="memory-storage-type" onchange="GlobalSettings.updateMemoryStorageOptions()">
                        <option value="database">Database (SQLite)</option>
                        <option value="postgresql">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                        <option value="file">File System</option>
                        <option value="memory">In-Memory (Session Only)</option>
                    </select>
                </div>
                <div class="settings-group" id="memory-storage-options">
                    <label for="memory-storage-path">Storage Path:</label>
                    <input type="text" id="memory-storage-path" placeholder="./data/memory" value="./data/memory">
                    <button class="btn small" onclick="GlobalSettings.testMemoryStorage()">Test Connection</button>
                </div>
                <div class="settings-group">
                    <label for="memory-auto-backup">Auto-backup memory:</label>
                    <input type="checkbox" id="memory-auto-backup" checked>
                </div>
                <div class="settings-group">
                    <label for="memory-backup-frequency">Backup Frequency (hours):</label>
                    <input type="number" id="memory-backup-frequency" value="24" min="1" max="168">
                </div>
            </div>

            <div class="settings-section">
                <h4>System Security</h4>
                <div class="settings-group">
                    <label for="auth-enabled">Enable Authentication:</label>
                    <input type="checkbox" id="auth-enabled" onchange="GlobalSettings.toggleAuth()">
                    <small class="setting-note">Requires server restart to take effect</small>
                </div>
                <div class="settings-group">
                    <label for="rate-limiting-enabled">Enable Rate Limiting:</label>
                    <input type="checkbox" id="rate-limiting-enabled" onchange="GlobalSettings.toggleRateLimiting()">
                    <small class="setting-note">Automatically disabled when auth is off</small>
                </div>
                <div class="settings-group">
                    <label for="session-timeout">Session Timeout (minutes):</label>
                    <input type="number" id="session-timeout" value="1440" min="5" max="10080">
                </div>
                <div class="settings-group">
                    <label for="max-login-attempts">Max Login Attempts:</label>
                    <input type="number" id="max-login-attempts" value="5" min="3" max="20">
                </div>
            </div>

            <div class="settings-section">
                <h4>Database Provisioning</h4>
                <div class="database-provisioning">
                    <div class="provision-item">
                        <div class="provision-info">
                            <h5>Knowledge Base Database</h5>
                            <p>Vector storage for embeddings and knowledge management</p>
                            <div class="provision-status" id="knowledge-db-status">Status: Not configured</div>
                        </div>
                        <div class="provision-actions">
                            <select id="knowledge-db-type">
                                <option value="chroma">ChromaDB</option>
                                <option value="pinecone">Pinecone</option>
                                <option value="weaviate">Weaviate</option>
                                <option value="qdrant">Qdrant</option>
                            </select>
                            <button class="btn primary" onclick="GlobalSettings.provisionDatabase('knowledge')">Provision</button>
                        </div>
                    </div>
                    <div class="provision-item">
                        <div class="provision-info">
                            <h5>Memory Database</h5>
                            <p>Long-term conversation memory and context storage</p>
                            <div class="provision-status" id="memory-db-status">Status: SQLite (Default)</div>
                        </div>
                        <div class="provision-actions">
                            <select id="memory-db-type">
                                <option value="sqlite">SQLite</option>
                                <option value="postgresql">PostgreSQL</option>
                                <option value="mysql">MySQL</option>
                            </select>
                            <button class="btn primary" onclick="GlobalSettings.provisionDatabase('memory')">Configure</button>
                        </div>
                    </div>
                    <div class="provision-item">
                        <div class="provision-info">
                            <h5>Analytics Database</h5>
                            <p>Usage analytics and performance metrics</p>
                            <div class="provision-status" id="analytics-db-status">Status: Disabled</div>
                        </div>
                        <div class="provision-actions">
                            <select id="analytics-db-type">
                                <option value="influxdb">InfluxDB</option>
                                <option value="postgresql">PostgreSQL</option>
                                <option value="clickhouse">ClickHouse</option>
                            </select>
                            <button class="btn primary" onclick="GlobalSettings.provisionDatabase('analytics')">Setup</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h4>Privacy & Data</h4>
                <div class="settings-group">
                    <label for="local-storage-only">Store data locally only:</label>
                    <input type="checkbox" id="local-storage-only">
                </div>
                <div class="settings-group">
                    <label for="analytics">Enable usage analytics:</label>
                    <input type="checkbox" id="analytics">
                </div>
                <div class="settings-group">
                    <label for="crash-reports">Send crash reports:</label>
                    <input type="checkbox" id="crash-reports">
                </div>
            </div>

            <div class="danger-zone">
                <h4>Danger Zone</h4>
                <button class="btn danger" onclick="GlobalSettings.clearAllData()">Clear All Data</button>
                <button class="btn danger" onclick="GlobalSettings.resetSettings()">Reset to Defaults</button>
            </div>
        </div>
        `;
    }

    static createKnowledgeTab() {
        return `
        <div id="knowledge-tab" class="tab-content">
            <h3>Knowledge Manager</h3>
            <p class="tab-description">Manage knowledge bases, embeddings, and document collections.</p>

            <div class="knowledge-layout">
                <!-- Left Panel: Knowledge Base Selector and File Tree -->
                <div class="knowledge-left-panel">
                    <div class="knowledge-bases">
                        <h4>Knowledge Bases</h4>
                        <div class="kb-selector">
                            <select id="active-knowledge-base" onchange="KnowledgeManager.switchKnowledgeBase(this.value)">
                                <option value="">Select Knowledge Base</option>
                                <option value="personal">Personal Documents</option>
                                <option value="projects">Project Documentation</option>
                                <option value="research">Research Papers</option>
                            </select>
                            <button class="btn small primary" onclick="KnowledgeManager.createKnowledgeBase()">+ New</button>
                        </div>
                    </div>

                    <!-- File Tree View -->
                    <div class="file-tree-container">
                        <div class="file-tree-header">
                            <h5>Contents</h5>
                            <div class="file-tree-actions">
                                <button class="btn tiny" onclick="KnowledgeManager.uploadFiles()" title="Upload Files">📁</button>
                                <button class="btn tiny" onclick="KnowledgeManager.createFolder()" title="Create Folder">📂</button>
                                <button class="btn tiny" onclick="KnowledgeManager.refreshFileTree()" title="Refresh">🔄</button>
                            </div>
                        </div>
                        <div class="file-tree" id="knowledge-file-tree">
                            <div class="file-tree-item folder expanded">
                                <div class="file-tree-icon">📂</div>
                                <span class="file-tree-name">Documents</span>
                                <div class="file-tree-actions">
                                    <button class="btn tiny" onclick="KnowledgeManager.addToFolder('documents')">+</button>
                                </div>
                            </div>
                            <div class="file-tree-children">
                                <div class="file-tree-item file">
                                    <div class="file-tree-icon">📄</div>
                                    <span class="file-tree-name">project-overview.pdf</span>
                                    <div class="file-tree-meta">2.3 MB • Indexed</div>
                                    <div class="file-tree-actions">
                                        <button class="btn tiny" onclick="KnowledgeManager.editFile('project-overview.pdf')">✏️</button>
                                        <button class="btn tiny" onclick="KnowledgeManager.deleteFile('project-overview.pdf')">🗑️</button>
                                    </div>
                                </div>
                                <div class="file-tree-item file">
                                    <div class="file-tree-icon">📝</div>
                                    <span class="file-tree-name">meeting-notes.md</span>
                                    <div class="file-tree-meta">45 KB • Processing</div>
                                    <div class="file-tree-actions">
                                        <button class="btn tiny" onclick="KnowledgeManager.editFile('meeting-notes.md')">✏️</button>
                                        <button class="btn tiny" onclick="KnowledgeManager.deleteFile('meeting-notes.md')">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Panel: Configuration -->
                <div class="knowledge-right-panel">
                    <div class="rag-settings">
                        <h4>Embedding Configuration</h4>
                        <div class="settings-group">
                            <label for="embedding-provider">Embedding Provider:</label>
                            <select id="embedding-provider" onchange="KnowledgeManager.updateEmbeddingModels()">
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="cohere">Cohere</option>
                                <option value="huggingface">Hugging Face</option>
                                <option value="local">Local Models</option>
                            </select>
                        </div>
                        <div class="settings-group">
                            <label for="embedding-model">Embedding Model:</label>
                            <select id="embedding-model">
                                <option value="text-embedding-3-large">text-embedding-3-large (Latest)</option>
                                <option value="text-embedding-3-small">text-embedding-3-small (Fast)</option>
                                <option value="text-embedding-ada-002">text-embedding-ada-002 (Legacy)</option>
                            </select>
                            <small class="setting-note">OpenAI's latest models offer better performance than Ada v2</small>
                        </div>
                        <div class="settings-group">
                            <label for="embedding-dimensions">Vector Dimensions:</label>
                            <select id="embedding-dimensions">
                                <option value="1536">1536 (Standard)</option>
                                <option value="3072">3072 (High Quality)</option>
                                <option value="512">512 (Fast)</option>
                                <option value="256">256 (Compact)</option>
                            </select>
                        </div>
                    </div>

                    <div class="chunking-settings">
                        <h4>Document Processing</h4>
                        <div class="settings-group">
                            <label for="chunk-size">Chunk Size (tokens):</label>
                            <input type="number" id="chunk-size" value="1000" min="100" max="4000">
                        </div>
                        <div class="settings-group">
                            <label for="chunk-overlap">Overlap (tokens):</label>
                            <input type="number" id="chunk-overlap" value="200" min="0" max="1000">
                        </div>
                        <div class="settings-group">
                            <label for="chunk-strategy">Chunking Strategy:</label>
                            <select id="chunk-strategy">
                                <option value="token">Token-based</option>
                                <option value="sentence">Sentence-based</option>
                                <option value="paragraph">Paragraph-based</option>
                                <option value="semantic">Semantic Chunking</option>
                            </select>
                        </div>
                        <div class="settings-group">
                            <label for="similarity-threshold">Similarity Threshold:</label>
                            <input type="range" id="similarity-threshold" min="0" max="1" step="0.01" value="0.7">
                            <span id="similarity-threshold-value">0.7</span>
                        </div>
                    </div>

                    <div class="vector-store-settings">
                        <h4>Vector Store</h4>
                        <div class="settings-group">
                            <label for="vector-store-type">Database Type:</label>
                            <select id="vector-store-type" onchange="KnowledgeManager.updateVectorStoreConfig()">
                                <option value="chroma">ChromaDB (Recommended)</option>
                                <option value="pinecone">Pinecone</option>
                                <option value="weaviate">Weaviate</option>
                                <option value="qdrant">Qdrant</option>
                                <option value="pgvector">PostgreSQL + pgvector</option>
                                <option value="local">Local SQLite + Vector</option>
                            </select>
                        </div>
                        <div class="settings-group" id="vector-store-config">
                            <label for="vector-store-endpoint">Endpoint:</label>
                            <input type="url" id="vector-store-endpoint" placeholder="http://localhost:8000">
                            <button class="btn small" onclick="KnowledgeManager.testVectorStore()">Test Connection</button>
                        </div>
                        <div class="vector-store-status" id="vector-store-status">
                            Status: Not configured
                        </div>
                    </div>

                    <div class="knowledge-graph">
                        <h4>Advanced Features</h4>
                        <div class="settings-group">
                            <label for="enable-knowledge-graph">Enable Knowledge Graph:</label>
                            <input type="checkbox" id="enable-knowledge-graph">
                            <small class="setting-note">Build relationships between documents and entities</small>
                        </div>
                        <div class="settings-group">
                            <label for="enable-auto-tagging">Auto-tagging:</label>
                            <input type="checkbox" id="enable-auto-tagging" checked>
                            <small class="setting-note">Automatically extract and assign tags</small>
                        </div>
                        <div class="settings-group">
                            <label for="enable-summary-generation">Generate Summaries:</label>
                            <input type="checkbox" id="enable-summary-generation" checked>
                            <small class="setting-note">Create summaries for long documents</small>
                        </div>
                    </div>

                    <!-- Knowledge Base Statistics -->
                    <div class="kb-statistics">
                        <h4>Statistics</h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-number" id="kb-documents">0</div>
                                <div class="stat-label">Documents</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number" id="kb-chunks">0</div>
                                <div class="stat-label">Chunks</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number" id="kb-vectors">0</div>
                                <div class="stat-label">Vectors</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number" id="kb-size">0 MB</div>
                                <div class="stat-label">Total Size</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bulk Operations Panel -->
            <div class="bulk-operations">
                <h4>Bulk Operations</h4>
                <div class="bulk-toolbar">
                    <button class="btn secondary" onclick="KnowledgeManager.reindexAll()">🔄 Reindex All</button>
                    <button class="btn secondary" onclick="KnowledgeManager.optimizeVectors()">⚡ Optimize Vectors</button>
                    <button class="btn secondary" onclick="KnowledgeManager.exportKnowledgeBase()">📤 Export</button>
                    <button class="btn secondary" onclick="KnowledgeManager.backupKnowledgeBase()">💾 Backup</button>
                </div>
            </div>
        </div>
        `;
    }

    static createToolsTab() {
        return `
        <div id="tools-tab" class="tab-content">
            <h3>Tool Manager</h3>

            <div class="tools-toolbar">
                <button class="btn primary" onclick="SettingsModal.openToolBuilder()">🤖 AI Tool Builder</button>
                <button class="btn secondary" onclick="ToolManager.addTool()">+ Add Custom Tool</button>
                <button class="btn secondary" onclick="ToolManager.importTool()">Import Tool</button>
                <button class="btn secondary" onclick="ToolManager.managePlugins()">Manage Plugins</button>
            </div>

            <div class="built-in-tools">
                <h4>Built-in Tools</h4>
                <div class="tool-grid">
                    <div class="tool-item">
                        <div class="tool-info">
                            <h5>Web Search</h5>
                            <p>Search the web for current information</p>
                        </div>
                        <div class="tool-controls">
                            <input type="checkbox" checked>
                            <button class="btn small">Configure</button>
                        </div>
                    </div>
                    <div class="tool-item">
                        <div class="tool-info">
                            <h5>Code Execution</h5>
                            <p>Execute Python, JavaScript, and other code</p>
                        </div>
                        <div class="tool-controls">
                            <input type="checkbox">
                            <button class="btn small">Configure</button>
                        </div>
                    </div>
                    <div class="tool-item">
                        <div class="tool-info">
                            <h5>File Operations</h5>
                            <p>Read, write, and manage files</p>
                        </div>
                        <div class="tool-controls">
                            <input type="checkbox">
                            <button class="btn small">Configure</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="custom-tools">
                <h4>Custom Tools</h4>
                <div id="custom-tool-list" class="tool-grid">
                    <p class="empty-state">No custom tools configured</p>
                </div>
            </div>

            <div class="tool-settings">
                <h4>Tool Settings</h4>
                <div class="settings-group">
                    <label for="tool-timeout">Default Tool Timeout (seconds):</label>
                    <input type="number" id="tool-timeout" value="30" min="5" max="300">
                </div>
                <div class="settings-group">
                    <label for="parallel-tools">Allow Parallel Tool Execution:</label>
                    <input type="checkbox" id="parallel-tools">
                </div>
                <div class="settings-group">
                    <label for="tool-confirmation">Require Confirmation for Destructive Tools:</label>
                    <input type="checkbox" id="tool-confirmation" checked>
                </div>
            </div>
        </div>
        `;
    }

    static createMCPTab() {
        return `
        <div id="mcp-tab" class="tab-content">
            <h3>MCP Server Manager</h3>

            <div class="mcp-toolbar">
                <button class="btn primary" onclick="MCPManager.addServer()">+ Add MCP Server</button>
                <button class="btn secondary" onclick="MCPManager.importConfig()">Import Config</button>
                <button class="btn secondary" onclick="MCPManager.exportConfig()">Export Config</button>
            </div>

            <div class="mcp-servers">
                <h4>Connected Servers</h4>
                <div id="mcp-server-list" class="mcp-server-list">
                    <div class="mcp-server-item">
                        <div class="mcp-info">
                            <h5>File System Server</h5>
                            <p>Local file system access • Status: Connected</p>
                            <span class="mcp-url">stdio://filesystem-server</span>
                        </div>
                        <div class="mcp-controls">
                            <button class="btn small">Configure</button>
                            <button class="btn small">Restart</button>
                            <button class="btn small danger">Remove</button>
                        </div>
                    </div>
                    <div class="mcp-server-item">
                        <div class="mcp-info">
                            <h5>Database Server</h5>
                            <p>SQLite database operations • Status: Disconnected</p>
                            <span class="mcp-url">stdio://database-server</span>
                        </div>
                        <div class="mcp-controls">
                            <button class="btn small">Configure</button>
                            <button class="btn small">Connect</button>
                            <button class="btn small danger">Remove</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mcp-marketplace">
                <h4>MCP Marketplace</h4>
                <div class="marketplace-search">
                    <input type="search" placeholder="Search MCP servers..." id="mcp-search">
                    <button class="btn">Search</button>
                </div>
                <div class="marketplace-grid">
                    <div class="marketplace-item">
                        <h5>Git Operations</h5>
                        <p>Comprehensive Git repository management</p>
                        <button class="btn small primary">Install</button>
                    </div>
                    <div class="marketplace-item">
                        <h5>Web Scraper</h5>
                        <p>Extract data from websites</p>
                        <button class="btn small primary">Install</button>
                    </div>
                    <div class="marketplace-item">
                        <h5>Email Client</h5>
                        <p>Send and receive emails</p>
                        <button class="btn small primary">Install</button>
                    </div>
                </div>
            </div>

            <div class="mcp-settings">
                <h4>MCP Settings</h4>
                <div class="settings-group">
                    <label for="mcp-auto-start">Auto-start servers on launch:</label>
                    <input type="checkbox" id="mcp-auto-start" checked>
                </div>
                <div class="settings-group">
                    <label for="mcp-timeout">Server Connection Timeout (seconds):</label>
                    <input type="number" id="mcp-timeout" value="10" min="5" max="60">
                </div>
                <div class="settings-group">
                    <label for="mcp-retry-attempts">Retry Attempts:</label>
                    <input type="number" id="mcp-retry-attempts" value="3" min="1" max="10">
                </div>
            </div>
        </div>
        `;
    }

    static createTestBenchTab() {
        return `
        <div id="testbench-tab" class="tab-content">
            <h3>TestBench Agent</h3>
            <p class="tab-description">System-level testing and configuration management agent with advanced capabilities.</p>

            <!-- Mini Chat Interface -->
            <div class="testbench-chat-section">
                <h4>TestBench Agent Chat</h4>
                <div class="testbench-chat-container">
                    <div class="testbench-chat-messages" id="testbench-chat-messages">
                        <div class="testbench-welcome-message">
                            <div class="agent-avatar">🧪</div>
                            <div class="message-content">
                                <p><strong>TestBench Agent Ready</strong></p>
                                <p>I can help you test system features, create agents, configure workspaces, and manage platform settings. What would you like to test or configure?</p>
                            </div>
                        </div>
                    </div>
                    <div class="testbench-chat-input-container">
                        <input type="text" id="testbench-chat-input" placeholder="Ask TestBench Agent..."
                               onkeypress="TestBenchManager.handleChatKeyPress(event)">
                        <button class="btn primary" onclick="TestBenchManager.sendMessage()">Send</button>
                    </div>
                </div>
            </div>

            <!-- System Capabilities -->
            <div class="testbench-capabilities">
                <h4>System Capabilities</h4>
                <div class="capability-grid">
                    <div class="capability-item">
                        <div class="capability-icon">🤖</div>
                        <h5>Agent Creation</h5>
                        <p>Create and configure AI agents with system-level permissions</p>
                        <button class="btn small" onclick="TestBenchManager.quickAction('create-agent')">Quick Create</button>
                    </div>
                    <div class="capability-item">
                        <div class="capability-icon">🏢</div>
                        <h5>Workspace Provisioning</h5>
                        <p>Set up complete workspaces with pre-configured agents</p>
                        <button class="btn small" onclick="TestBenchManager.quickAction('create-workspace')">Provision</button>
                    </div>
                    <div class="capability-item">
                        <div class="capability-icon">📚</div>
                        <h5>Knowledge Base Setup</h5>
                        <p>Configure and populate knowledge bases with sample data</p>
                        <button class="btn small" onclick="TestBenchManager.quickAction('setup-knowledge')">Setup</button>
                    </div>
                    <div class="capability-item">
                        <div class="capability-icon">⚙️</div>
                        <h5>System Configuration</h5>
                        <p>Modify platform settings and feature toggles</p>
                        <button class="btn small" onclick="TestBenchManager.quickAction('configure-system')">Configure</button>
                    </div>
                    <div class="capability-item">
                        <div class="capability-icon">🧪</div>
                        <h5>Feature Testing</h5>
                        <p>Run automated tests on platform features</p>
                        <button class="btn small" onclick="TestBenchManager.quickAction('run-tests')">Run Tests</button>
                    </div>
                    <div class="capability-item">
                        <div class="capability-icon">📊</div>
                        <h5>System Health</h5>
                        <p>Monitor system status and performance metrics</p>
                        <button class="btn small" onclick="TestBenchManager.quickAction('health-check')">Check Health</button>
                    </div>
                </div>
            </div>

            <!-- Configuration Templates -->
            <div class="testbench-templates">
                <h4>Configuration Templates</h4>
                <div class="template-list">
                    <div class="template-item">
                        <div class="template-info">
                            <h5>Development Setup</h5>
                            <p>Complete development environment with coding agents and tools</p>
                        </div>
                        <div class="template-actions">
                            <button class="btn small primary" onclick="TestBenchManager.applyTemplate('development')">Apply</button>
                            <button class="btn small secondary" onclick="TestBenchManager.previewTemplate('development')">Preview</button>
                        </div>
                    </div>
                    <div class="template-item">
                        <div class="template-info">
                            <h5>Research Workspace</h5>
                            <p>Research-focused agents with web search and analysis capabilities</p>
                        </div>
                        <div class="template-actions">
                            <button class="btn small primary" onclick="TestBenchManager.applyTemplate('research')">Apply</button>
                            <button class="btn small secondary" onclick="TestBenchManager.previewTemplate('research')">Preview</button>
                        </div>
                    </div>
                    <div class="template-item">
                        <div class="template-info">
                            <h5>Safe Testing Mode</h5>
                            <p>Limited-permission agents for safe experimentation</p>
                        </div>
                        <div class="template-actions">
                            <button class="btn small primary" onclick="TestBenchManager.applyTemplate('safe-mode')">Apply</button>
                            <button class="btn small secondary" onclick="TestBenchManager.previewTemplate('safe-mode')">Preview</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Backup & Restore -->
            <div class="testbench-backup">
                <h4>Backup & Restore</h4>
                <div class="backup-controls">
                    <div class="backup-actions">
                        <button class="btn secondary" onclick="TestBenchManager.createBackup()">Create Backup</button>
                        <button class="btn secondary" onclick="TestBenchManager.restoreBackup()">Restore Backup</button>
                        <button class="btn secondary" onclick="TestBenchManager.listBackups()">View Backups</button>
                    </div>
                    <div class="backup-info">
                        <p>Last backup: <span id="last-backup-date">Never</span></p>
                        <p>Available backups: <span id="backup-count">0</span></p>
                    </div>
                </div>
            </div>

            <!-- System Status -->
            <div class="testbench-status">
                <h4>System Status</h4>
                <div class="status-grid" id="testbench-status-grid">
                    <div class="status-item">
                        <div class="status-icon loading">⏳</div>
                        <div class="status-info">
                            <h5>Database</h5>
                            <p id="db-status">Checking...</p>
                        </div>
                    </div>
                    <div class="status-item">
                        <div class="status-icon loading">⏳</div>
                        <div class="status-info">
                            <h5>Collaboration Engine</h5>
                            <p id="collab-status">Checking...</p>
                        </div>
                    </div>
                    <div class="status-item">
                        <div class="status-icon loading">⏳</div>
                        <div class="status-info">
                            <h5>Providers</h5>
                            <p id="providers-status">Checking...</p>
                        </div>
                    </div>
                    <div class="status-item">
                        <div class="status-icon loading">⏳</div>
                        <div class="status-info">
                            <h5>TestBench Agent</h5>
                            <p id="testbench-agent-status">Checking...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="danger-zone">
                <h4>Danger Zone</h4>
                <div class="danger-actions">
                    <button class="btn danger" onclick="TestBenchManager.resetSystem()">Reset System</button>
                    <button class="btn danger" onclick="TestBenchManager.clearTestData()">Clear Test Data</button>
                    <button class="btn danger" onclick="TestBenchManager.factoryReset()">Factory Reset</button>
                </div>
                <p class="danger-warning">⚠️ These actions are irreversible and will affect system functionality.</p>
            </div>
        </div>
        `;
    }

    static setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal' || e.target.classList.contains('modal-close')) {
                this.close();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('settings-modal').style.display !== 'none') {
                this.close();
            }
        });

        // Load saved settings when modal opens
        this.loadSavedApiKeys();

        console.log('SettingsModal event listeners setup complete');
    }

    static createUsersTab() {
        return `
        <div id="users-tab" class="tab-content">
            <h3>User Management</h3>
            <p class="tab-description">Manage user accounts, roles, and permissions.</p>

            <div class="user-toolbar">
                <button class="btn primary" onclick="UserManager.createUser()">+ Add User</button>
                <button class="btn secondary" onclick="UserManager.importUsers()">Import Users</button>
                <button class="btn secondary" onclick="UserManager.exportUsers()">Export Users</button>
                <button class="btn secondary" onclick="UserManager.refreshUserList()">Refresh</button>
            </div>

            <div class="user-search">
                <input type="text" id="user-search" placeholder="Search users..." 
                       onkeyup="UserManager.filterUsers(this.value)">
            </div>

            <div class="user-list">
                <div class="user-list-header">
                    <div class="user-col">Username</div>
                    <div class="user-col">Email</div>
                    <div class="user-col">Role</div>
                    <div class="user-col">Status</div>
                    <div class="user-col">Last Login</div>
                    <div class="user-col">Actions</div>
                </div>
                <div id="user-list-body" class="user-list-body">
                    <div class="loading-placeholder">Loading users...</div>
                </div>
            </div>

            <!-- User Editor Modal -->
            <div id="user-editor" class="user-editor" style="display: none;">
                <div class="user-editor-content">
                    <h4 id="user-editor-title">Add New User</h4>
                    
                    <div class="settings-group">
                        <label for="user-username">Username:</label>
                        <input type="text" id="user-username" required>
                    </div>
                    
                    <div class="settings-group">
                        <label for="user-email">Email:</label>
                        <input type="email" id="user-email" required>
                    </div>
                    
                    <div class="settings-group">
                        <label for="user-password">Password:</label>
                        <input type="password" id="user-password" required>
                    </div>
                    
                    <div class="settings-group">
                        <label for="user-role">Role:</label>
                        <select id="user-role">
                            <option value="user">User</option>
                            <option value="admin">Administrator</option>
                            <option value="testbench">TestBench Agent</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                    
                    <div class="settings-group">
                        <label for="user-permissions">Permissions:</label>
                        <div class="permission-checkboxes">
                            <label><input type="checkbox" value="chat"> Chat Access</label>
                            <label><input type="checkbox" value="agents"> Agent Management</label>
                            <label><input type="checkbox" value="workspaces"> Workspace Management</label>
                            <label><input type="checkbox" value="settings"> Settings Access</label>
                            <label><input type="checkbox" value="knowledge"> Knowledge Base</label>
                            <label><input type="checkbox" value="tools"> Tool Management</label>
                            <label><input type="checkbox" value="mcp"> MCP Servers</label>
                            <label><input type="checkbox" value="testbench"> TestBench Access</label>
                            <label><input type="checkbox" value="users"> User Management</label>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <label for="user-active">Active:</label>
                        <input type="checkbox" id="user-active" checked>
                    </div>
                    
                    <div class="user-editor-actions">
                        <button class="btn secondary" onclick="UserManager.cancelUserEdit()">Cancel</button>
                        <button class="btn primary" onclick="UserManager.saveUser()">Save User</button>
                    </div>
                </div>
            </div>

            <!-- User Statistics -->
            <div class="user-stats">
                <h4>User Statistics</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number" id="total-users">0</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="active-users">0</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="admin-users">0</div>
                        <div class="stat-label">Administrators</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="online-users">0</div>
                        <div class="stat-label">Online Now</div>
                    </div>
                </div>
            </div>

            <!-- Role Management -->
            <div class="role-management">
                <h4>Role Management</h4>
                <div class="role-list">
                    <div class="role-item">
                        <div class="role-info">
                            <h5>Administrator</h5>
                            <p>Full system access including user management</p>
                        </div>
                        <button class="btn small" onclick="UserManager.editRole('admin')">Edit Permissions</button>
                    </div>
                    <div class="role-item">
                        <div class="role-info">
                            <h5>TestBench Agent</h5>
                            <p>Access to TestBench and automated testing features</p>
                        </div>
                        <button class="btn small" onclick="UserManager.editRole('testbench')">Edit Permissions</button>
                    </div>
                    <div class="role-item">
                        <div class="role-info">
                            <h5>User</h5>
                            <p>Standard user with chat and workspace access</p>
                        </div>
                        <button class="btn small" onclick="UserManager.editRole('user')">Edit Permissions</button>
                    </div>
                    <div class="role-item">
                        <div class="role-info">
                            <h5>Viewer</h5>
                            <p>Read-only access to conversations and data</p>
                        </div>
                        <button class="btn small" onclick="UserManager.editRole('viewer')">Edit Permissions</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    static async loadSavedApiKeys() {
        // Use AIServicesManager for proper backend integration
        if (window.AIServicesManager && typeof AIServicesManager.loadProviderSettings === 'function') {
            try {
                await AIServicesManager.loadProviderSettings();
            } catch (error) {
                console.warn('Failed to load provider settings from backend, falling back to localStorage:', error);
                this.loadFromLocalStorage();
            }
        } else {
            // Fallback to localStorage
            this.loadFromLocalStorage();
        }
    }

    static loadFromLocalStorage() {
        // SECURITY: Removed localStorage for API keys - use server-side storage only
        console.warn('localStorage loading disabled for security - API keys must be stored server-side');

        // Only load non-sensitive defaults
        const ollamaField = document.getElementById('ollama-endpoint');
        if (ollamaField && !ollamaField.value) {
            ollamaField.value = 'http://localhost:11434';
        }
    }

    static open(tabId = 'ai-services') {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.switchTab(tabId);
            // Load API keys every time modal opens
            setTimeout(() => {
                this.loadSavedApiKeys();
            }, 100);
        }
    }

    static close() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    static switchTab(tabId) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and button
        const button = document.querySelector(`[data-tab="${tabId}"]`);
        const content = document.getElementById(`${tabId}-tab`);

        if (button) button.classList.add('active');
        if (content) content.classList.add('active');
    }

    static switchProviderTab(providerId) {
        // Remove active class from all provider tabs and content
        document.querySelectorAll('.provider-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.provider-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected provider tab and content
        const button = document.querySelector(`[data-provider="${providerId}"]`);
        const content = document.getElementById(`provider-${providerId}`);

        if (button) button.classList.add('active');
        if (content) content.classList.add('active');
    }

    static async save() {
        try {
            // Use AIServicesManager for proper backend integration
            if (window.AIServicesManager && typeof AIServicesManager.saveSettings === 'function') {
                await AIServicesManager.saveSettings();
                this.close();
            } else {
                // Fallback to localStorage for compatibility
                this.saveToLocalStorage();
                this.close();
                if (window.Utils && typeof Utils.showSuccess === 'function') {
                    Utils.showSuccess('Settings saved successfully');
                }
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            if (window.Utils && typeof Utils.showError === 'function') {
                Utils.showError('Failed to save settings');
            }
        }
    }

    static saveToLocalStorage() {
        // SECURITY: Removed localStorage for API keys - use server-side storage only
        console.warn('localStorage saving disabled for security - API keys must be stored server-side');

        // API keys should only be saved through the backend API
        // This method is kept for compatibility but does nothing
    }

    static async refreshAllModels() {
        // Delegate to AIServicesManager which has the proper implementation
        if (window.AIServicesManager && typeof AIServicesManager.refreshAllModels === 'function') {
            await AIServicesManager.refreshAllModels();
        } else {
            console.error('AIServicesManager not available');
            Utils.showError('AIServicesManager not available');
        }
    }

    static async testAllConnections() {
        // Delegate to AIServicesManager which has the proper implementation
        if (window.AIServicesManager && typeof AIServicesManager.testAllConnections === 'function') {
            Utils.showInfo('Testing all provider connections...');
            await AIServicesManager.testAllConnections();
        } else {
            console.error('AIServicesManager not available');
            Utils.showError('AIServicesManager not available');
        }
    }

    static async testConnections() {
        // This is for backwards compatibility
        await this.testAllConnections();
    }

    static async openToolBuilder() {
        // Initialize Tool Builder if not already done
        if (!window.ToolBuilder) {
            // Load the tool builder script dynamically
            const script = document.createElement('script');
            script.src = '/js/tool-builder.js';
            document.head.appendChild(script);

            // Wait for script to load
            await new Promise((resolve) => {
                script.onload = resolve;
            });
        }

        // Initialize Tool Builder
        await ToolBuilder.init();

        // Create and show the tool builder modal
        const modalHTML = `
        <div id="tool-builder-modal" class="modal tool-builder-modal" style="display: flex;">
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h2>AI Tool Builder</h2>
                    <button class="modal-close" onclick="SettingsModal.closeToolBuilder()">&times;</button>
                </div>
                <div class="modal-body">
                    ${ToolBuilder.createToolBuilderUI()}
                </div>
            </div>
        </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('tool-builder-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Update saved tools list
        if (window.toolBuilder) {
            ToolBuilder.updateSavedToolsList();
        }
    }

    static closeToolBuilder() {
        const modal = document.getElementById('tool-builder-modal');
        if (modal) {
            modal.remove();
        }
        // Reload tools in the main tool manager
        if (window.ToolManager) {
            ToolManager.loadTools();
        }
    }
}

// Initialize the AI Services Manager when the modal is opened
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.AIServicesManager) {
            AIServicesManager.loadProviderSettings();
        }
    }, 1000);
});

// Global function for onclick handlers
window.openSettingsModal = function () {
    SettingsModal.open();
};

window.SettingsModal = SettingsModal;
