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
            <h3>AI Service Providers</h3>
            <p class="tab-description">Configure your AI service providers and manage available models.</p>
            
            <div class="ai-services-container">
                <div class="provider-tabs-vertical">
                    <button class="provider-tab-btn active" data-provider="openai" onclick="SettingsModal.switchProviderTab('openai')">
                        <span class="provider-icon">🟢</span>
                        OpenAI
                    </button>
                    <button class="provider-tab-btn" data-provider="anthropic" onclick="SettingsModal.switchProviderTab('anthropic')">
                        <span class="provider-icon">🔵</span>
                        Anthropic
                    </button>
                    <button class="provider-tab-btn" data-provider="google" onclick="SettingsModal.switchProviderTab('google')">
                        <span class="provider-icon">🌈</span>
                        Google
                    </button>
                    <button class="provider-tab-btn" data-provider="openrouter" onclick="SettingsModal.switchProviderTab('openrouter')">
                        <span class="provider-icon">🔀</span>
                        OpenRouter
                    </button>
                    <button class="provider-tab-btn" data-provider="ollama" onclick="SettingsModal.switchProviderTab('ollama')">
                        <span class="provider-icon">🦙</span>
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
                            <input type="text" id="openai-api-key" placeholder="sk-..." autocomplete="off" data-lpignore="true"
                                   onchange="AIServicesManager.onApiKeyChange('openai')">
                            <button class="btn small test-btn" id="openai-test-btn" onclick="AIServicesManager.testConnection('openai')">Test Connection</button>
                            <div class="api-key-warning">Never share your API keys. Keys are stored locally and encrypted.</div>
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
                            <input type="text" id="anthropic-api-key" placeholder="sk-ant-..." autocomplete="off" data-lpignore="true"
                                   onchange="AIServicesManager.onApiKeyChange('anthropic')">
                            <button class="btn small test-btn" id="anthropic-test-btn" onclick="AIServicesManager.testConnection('anthropic')">Test Connection</button>
                            <div class="api-key-warning">Never share your API keys. Keys are stored locally and encrypted.</div>
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
                            <div class="api-key-warning">Never share your API keys. Keys are stored locally and encrypted.</div>
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
                            <input type="text" id="openrouter-api-key" placeholder="sk-or-..." autocomplete="off" data-lpignore="true"
                                   onchange="AIServicesManager.onApiKeyChange('openrouter')">
                            <button class="btn small test-btn" id="openrouter-test-btn" onclick="AIServicesManager.testConnection('openrouter')">Test Connection</button>
                            <div class="api-key-warning">Never share your API keys. Keys are stored locally and encrypted.</div>
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
                            <input type="url" id="ollama-endpoint" placeholder="http://localhost:11434" value="http://localhost:11434"
                                   onchange="AIServicesManager.onApiKeyChange('ollama')">
                            <button class="btn small test-btn" id="ollama-test-btn" onclick="AIServicesManager.testConnection('ollama')">Test Connection</button>
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

            <div class="knowledge-toolbar">
                <button class="btn primary" onclick="KnowledgeManager.addDatabase()">+ Add Knowledge Base</button>
                <button class="btn secondary" onclick="KnowledgeManager.importData()">Import Data</button>
                <button class="btn secondary" onclick="KnowledgeManager.exportData()">Export Data</button>
            </div>

            <div class="knowledge-bases">
                <h4>Knowledge Bases</h4>
                <div id="knowledge-base-list" class="knowledge-base-list">
                    <div class="knowledge-base-item">
                        <div class="kb-info">
                            <h5>Personal Documents</h5>
                            <p>1,234 documents • Vector embeddings enabled</p>
                        </div>
                        <div class="kb-actions">
                            <button class="btn small">Edit</button>
                            <button class="btn small danger">Delete</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="rag-settings">
                <h4>RAG Configuration</h4>
                <div class="settings-group">
                    <label for="embedding-model">Embedding Model:</label>
                    <select id="embedding-model">
                        <option value="text-embedding-ada-002">OpenAI Ada v2</option>
                        <option value="text-embedding-3-small">OpenAI v3 Small</option>
                        <option value="text-embedding-3-large">OpenAI v3 Large</option>
                        <option value="sentence-transformers">Local Sentence Transformers</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="chunk-size">Chunk Size:</label>
                    <input type="number" id="chunk-size" value="1000" min="100" max="4000">
                </div>
                <div class="settings-group">
                    <label for="chunk-overlap">Chunk Overlap:</label>
                    <input type="number" id="chunk-overlap" value="200" min="0" max="1000">
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
                    <label for="vector-store-type">Store Type:</label>
                    <select id="vector-store-type">
                        <option value="chromadb">ChromaDB</option>
                        <option value="pinecone">Pinecone</option>
                        <option value="weaviate">Weaviate</option>
                        <option value="qdrant">Qdrant</option>
                        <option value="local">Local SQLite + Vector</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="vector-store-endpoint">Endpoint:</label>
                    <input type="url" id="vector-store-endpoint" placeholder="http://localhost:8000">
                </div>
            </div>

            <div class="knowledge-graph">
                <h4>Knowledge Graph</h4>
                <div class="settings-group">
                    <label for="enable-knowledge-graph">Enable Knowledge Graph:</label>
                    <input type="checkbox" id="enable-knowledge-graph">
                </div>
                <div class="settings-group">
                    <label for="graph-database">Graph Database:</label>
                    <select id="graph-database">
                        <option value="neo4j">Neo4j</option>
                        <option value="arangodb">ArangoDB</option>
                        <option value="dgraph">Dgraph</option>
                        <option value="local">Local Graph</option>
                    </select>
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
        // Fallback localStorage loading
        const providers = ['openai', 'anthropic', 'openrouter'];

        providers.forEach(provider => {
            const savedKey = localStorage.getItem(`${provider}_api_key`);
            const keyField = document.getElementById(`${provider}-api-key`);

            if (savedKey && keyField) {
                keyField.value = savedKey;
                console.log(`Loaded saved API key for ${provider} from localStorage`);
            }
        });

        // Load Ollama endpoint
        const savedOllamaEndpoint = localStorage.getItem('ollama_endpoint');
        const ollamaField = document.getElementById('ollama-endpoint');
        if (savedOllamaEndpoint && ollamaField) {
            ollamaField.value = savedOllamaEndpoint;
        } else if (ollamaField) {
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
        // Fallback localStorage saving
        const providers = ['openai', 'anthropic', 'openrouter'];

        providers.forEach(provider => {
            const keyField = document.getElementById(`${provider}-api-key`);
            if (keyField && keyField.value.trim()) {
                localStorage.setItem(`${provider}_api_key`, keyField.value.trim());
            }
        });

        // Save Ollama endpoint
        const ollamaField = document.getElementById('ollama-endpoint');
        if (ollamaField && ollamaField.value.trim()) {
            localStorage.setItem('ollama_endpoint', ollamaField.value.trim());
        }
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
