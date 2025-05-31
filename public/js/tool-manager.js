/**
 * Tool Manager
 * Handles tool management in the settings modal
 */
class ToolManager {
    static init() {
        this.tools = [];
        this.customTools = [];
        this.selectedTool = null;
        console.log('ToolManager initialized');
    }

    /**
     * Load tools from the backend
     */
    static async loadTools() {
        try {
            const response = await fetch('/api/tools');
            if (response.ok) {
                const data = await response.json();
                const allTools = data.tools || [];

                // Separate built-in and custom tools
                this.tools = allTools.filter(tool =>
                    ['web-search', 'code-execution', 'file-analysis', 'calculator', 'image-generation', 'email-sender'].includes(tool.id)
                );
                this.customTools = allTools.filter(tool =>
                    !['web-search', 'code-execution', 'file-analysis', 'calculator', 'image-generation', 'email-sender'].includes(tool.id)
                );

                this.updateToolLists();
                console.log('Tools loaded:', this.tools.length + this.customTools.length);
                return { builtIn: this.tools, custom: this.customTools };
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to load tools');
            }
        } catch (error) {
            console.error('Error loading tools:', error);
            // Initialize default tools if backend is not available
            await this.initializeDefaultTools();
            return { builtIn: this.tools, custom: this.customTools };
        }
    }

    /**
     * Initialize default tools in the backend
     */
    static async initializeDefaultTools() {
        try {
            const response = await fetch('/api/tools/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Default tools initialized:', data.initialized);
                await this.loadTools(); // Reload after initialization
            } else {
                // If backend is not available, load frontend defaults
                this.loadDefaultTools();
            }
        } catch (error) {
            console.error('Error initializing default tools:', error);
            this.loadDefaultTools();
        }
    }

    /**
     * Load default tools when backend is not available
     */
    static loadDefaultTools() {
        this.tools = [
            {
                id: 'web-search',
                name: 'Web Search',
                description: 'Search the web for current information',
                category: 'Research',
                enabled: true,
                config: {
                    apiKey: '',
                    engine: 'google',
                    maxResults: 10
                }
            },
            {
                id: 'code-execution',
                name: 'Code Execution',
                description: 'Execute Python, JavaScript, and other code',
                category: 'Development',
                enabled: false,
                config: {
                    allowedLanguages: ['python', 'javascript', 'bash'],
                    timeout: 30,
                    sandbox: true
                }
            },
            {
                id: 'file-operations',
                name: 'File Operations',
                description: 'Read, write, and manage files',
                category: 'System',
                enabled: false,
                config: {
                    allowedPaths: ['/tmp', '/uploads'],
                    maxFileSize: 10485760
                }
            },
            {
                id: 'calculator',
                name: 'Calculator',
                description: 'Perform mathematical calculations',
                category: 'Utility',
                enabled: true,
                config: {
                    precision: 10,
                    allowComplexNumbers: false
                }
            },
            {
                id: 'image-generation',
                name: 'Image Generation',
                description: 'Generate images using AI models',
                category: 'Creative',
                enabled: false,
                config: {
                    provider: 'dalle',
                    defaultSize: '1024x1024',
                    maxImages: 5
                }
            },
            {
                id: 'email-sender',
                name: 'Email Sender',
                description: 'Send emails through configured providers',
                category: 'Communication',
                enabled: false,
                config: {
                    provider: 'smtp',
                    host: '',
                    port: 587,
                    secure: true
                }
            }
        ];
        this.customTools = [];
        this.updateToolLists();
    }

    /**
     * Update tool lists in the UI
     */
    static updateToolLists() {
        this.updateBuiltInTools();
        this.updateCustomTools();
    }

    /**
     * Update built-in tools list
     */
    static updateBuiltInTools() {
        const toolGrid = document.querySelector('.built-in-tools .tool-grid');
        if (!toolGrid) return;

        if (this.tools.length === 0) {
            toolGrid.innerHTML = '<p class="empty-state">No built-in tools available</p>';
            return;
        }

        let html = '';
        this.tools.forEach(tool => {
            html += `
            <div class="tool-item" data-tool-id="${tool.id}">
                <div class="tool-info">
                    <h5>${tool.name}</h5>
                    <p>${tool.description}</p>
                    <span class="tool-category">${tool.category}</span>
                </div>
                <div class="tool-controls">
                    <label class="switch">
                        <input type="checkbox" ${tool.enabled ? 'checked' : ''}
                               onchange="ToolManager.toggleTool('${tool.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <button class="btn small" onclick="ToolManager.configureTool('${tool.id}')">Configure</button>
                </div>
            </div>
            `;
        });

        toolGrid.innerHTML = html;
    }

    /**
     * Update custom tools list
     */
    static updateCustomTools() {
        const customToolList = document.getElementById('custom-tool-list');
        if (!customToolList) return;

        if (this.customTools.length === 0) {
            customToolList.innerHTML = '<p class="empty-state">No custom tools configured</p>';
            return;
        }

        let html = '';
        this.customTools.forEach(tool => {
            html += `
            <div class="tool-item" data-tool-id="${tool.id}">
                <div class="tool-info">
                    <h5>${tool.name}</h5>
                    <p>${tool.description}</p>
                    <span class="tool-meta">Type: ${tool.type} • Created: ${new Date(tool.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="tool-controls">
                    <label class="switch">
                        <input type="checkbox" ${tool.enabled ? 'checked' : ''}
                               onchange="ToolManager.toggleTool('${tool.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <button class="btn small" onclick="ToolManager.editTool('${tool.id}')">Edit</button>
                    <button class="btn small danger" onclick="ToolManager.deleteTool('${tool.id}')">Delete</button>
                </div>
            </div>
            `;
        });

        customToolList.innerHTML = html;
    }

    /**
     * Toggle a tool on/off
     */
    static async toggleTool(toolId, enabled) {
        try {
            // Get the current tool configuration
            const builtInTool = this.tools.find(t => t.id === toolId);
            const customTool = this.customTools.find(t => t.id === toolId);
            const currentTool = builtInTool || customTool;

            if (!currentTool) {
                throw new Error('Tool not found');
            }

            // Update the tool with the new enabled state
            const updatedTool = {
                ...currentTool,
                enabled,
                updatedAt: new Date().toISOString()
            };

            const response = await fetch(`/api/tools/${toolId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config: { ...currentTool.config, enabled } })
            });

            if (response.ok) {
                // Update local state
                if (builtInTool) {
                    builtInTool.enabled = enabled;
                } else if (customTool) {
                    customTool.enabled = enabled;
                }

                console.log(`Tool ${toolId} ${enabled ? 'enabled' : 'disabled'}`);
            } else {
                // Revert checkbox state on error
                const checkbox = document.querySelector(`[data-tool-id="${toolId}"] input[type="checkbox"]`);
                if (checkbox) {
                    checkbox.checked = !enabled;
                }
                const error = await response.json();
                throw new Error(error.error || 'Failed to toggle tool');
            }
        } catch (error) {
            console.error('Error toggling tool:', error);
            Utils.showError(`Failed to update tool status: ${error.message}`);

            // Revert checkbox state on error
            const checkbox = document.querySelector(`[data-tool-id="${toolId}"] input[type="checkbox"]`);
            if (checkbox) {
                checkbox.checked = !enabled;
            }
        }
    }

    /**
     * Configure a built-in tool
     */
    static configureTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (tool) {
            this.showToolConfigEditor(tool);
        }
    }

    /**
     * Edit a custom tool
     */
    static editTool(toolId) {
        const tool = this.customTools.find(t => t.id === toolId);
        if (tool) {
            this.showToolEditor(tool);
        }
    }

    /**
     * Add a new custom tool
     */
    static addTool() {
        this.showToolEditor();
    }

    /**
     * Show tool editor for custom tools
     */
    static showToolEditor(tool = null) {
        // Create editor if it doesn't exist
        if (!document.getElementById('tool-editor')) {
            const editorHTML = `
            <div id="tool-editor" class="tool-editor modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="tool-editor-title">Create Custom Tool</h3>
                        <button class="modal-close" onclick="ToolManager.closeEditor()">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div class="settings-group">
                            <label for="tool-name">Name:</label>
                            <input type="text" id="tool-name" placeholder="My Custom Tool">
                        </div>

                        <div class="settings-group">
                            <label for="tool-description">Description:</label>
                            <textarea id="tool-description" placeholder="Describe what this tool does..."></textarea>
                        </div>

                        <div class="settings-group">
                            <label for="tool-type">Type:</label>
                            <select id="tool-type">
                                <option value="api">API Integration</option>
                                <option value="script">Custom Script</option>
                                <option value="webhook">Webhook</option>
                                <option value="plugin">Plugin</option>
                            </select>
                        </div>

                        <div class="settings-group">
                            <label for="tool-category">Category:</label>
                            <select id="tool-category">
                                <option value="Utility">Utility</option>
                                <option value="Research">Research</option>
                                <option value="Development">Development</option>
                                <option value="Communication">Communication</option>
                                <option value="Creative">Creative</option>
                                <option value="System">System</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>

                        <div class="settings-group">
                            <label for="tool-endpoint">Endpoint/Script:</label>
                            <input type="text" id="tool-endpoint" placeholder="https://api.example.com/tool or /path/to/script.py">
                        </div>

                        <div class="settings-group">
                            <label for="tool-method">HTTP Method (for APIs):</label>
                            <select id="tool-method">
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>

                        <div class="settings-group">
                            <label for="tool-headers">Headers (JSON):</label>
                            <textarea id="tool-headers" placeholder='{"Authorization": "Bearer YOUR_TOKEN", "Content-Type": "application/json"}'></textarea>
                        </div>

                        <div class="settings-group">
                            <label for="tool-parameters">Parameters Schema (JSON):</label>
                            <textarea id="tool-parameters" placeholder='{"type": "object", "properties": {"input": {"type": "string", "description": "Input text"}}}'></textarea>
                        </div>

                        <div class="settings-group">
                            <label for="tool-timeout">Timeout (seconds):</label>
                            <input type="number" id="tool-timeout" value="30" min="1" max="300">
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn secondary" onclick="ToolManager.closeEditor()">Cancel</button>
                        <button class="btn primary" onclick="ToolManager.saveTool()">Save Tool</button>
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', editorHTML);
        }

        // Show editor
        const editor = document.getElementById('tool-editor');
        const title = document.getElementById('tool-editor-title');

        if (tool) {
            title.textContent = 'Edit Custom Tool';
            document.getElementById('tool-name').value = tool.name;
            document.getElementById('tool-description').value = tool.description || '';
            document.getElementById('tool-type').value = tool.type || 'api';
            document.getElementById('tool-category').value = tool.category || 'Custom';
            document.getElementById('tool-endpoint').value = tool.endpoint || '';
            document.getElementById('tool-method').value = tool.method || 'POST';
            document.getElementById('tool-headers').value = JSON.stringify(tool.headers || {}, null, 2);
            document.getElementById('tool-parameters').value = JSON.stringify(tool.parameters || {}, null, 2);
            document.getElementById('tool-timeout').value = tool.timeout || 30;
            this.selectedTool = tool;
        } else {
            title.textContent = 'Create Custom Tool';
            document.getElementById('tool-name').value = '';
            document.getElementById('tool-description').value = '';
            document.getElementById('tool-type').value = 'api';
            document.getElementById('tool-category').value = 'Custom';
            document.getElementById('tool-endpoint').value = '';
            document.getElementById('tool-method').value = 'POST';
            document.getElementById('tool-headers').value = '{}';
            document.getElementById('tool-parameters').value = '{}';
            document.getElementById('tool-timeout').value = 30;
            this.selectedTool = null;
        }

        editor.style.display = 'flex';
    }

    /**
     * Show tool configuration editor for built-in tools
     */
    static showToolConfigEditor(tool) {
        // Create config editor if it doesn't exist
        if (!document.getElementById('tool-config-editor')) {
            const editorHTML = `
            <div id="tool-config-editor" class="tool-config-editor modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="tool-config-title">Configure Tool</h3>
                        <button class="modal-close" onclick="ToolManager.closeConfigEditor()">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div id="tool-config-fields">
                            <!-- Dynamic fields will be inserted here -->
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn secondary" onclick="ToolManager.closeConfigEditor()">Cancel</button>
                        <button class="btn primary" onclick="ToolManager.saveToolConfig()">Save Configuration</button>
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', editorHTML);
        }

        // Show editor and populate with tool-specific config fields
        const editor = document.getElementById('tool-config-editor');
        const title = document.getElementById('tool-config-title');
        const fieldsContainer = document.getElementById('tool-config-fields');

        title.textContent = `Configure ${tool.name}`;
        this.selectedTool = tool;

        // Generate config fields based on tool type
        let fieldsHTML = this.generateConfigFields(tool);
        fieldsContainer.innerHTML = fieldsHTML;

        editor.style.display = 'flex';
    }

    /**
     * Generate configuration fields for a tool
     */
    static generateConfigFields(tool) {
        const config = tool.config || {};
        let html = '';

        switch (tool.id) {
            case 'web-search':
                html = `
                <div class="settings-group">
                    <label for="search-engine">Search Engine:</label>
                    <select id="search-engine" onchange="ToolManager.onSearchEngineChange()">
                        <option value="duckduckgo" ${config.engine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo (Free)</option>
                        <option value="google" ${config.engine === 'google' ? 'selected' : ''}>Google Custom Search</option>
                        <option value="bing" ${config.engine === 'bing' ? 'selected' : ''}>Bing Search</option>
                    </select>
                    <div class="input-hint">DuckDuckGo requires no API key but has limited results</div>
                </div>
                <div class="settings-group" id="google-config" style="${config.engine === 'google' ? 'display: block' : 'display: none'}">
                    <label for="search-api-key">Google API Key:</label>
                    <input type="password" id="search-api-key" value="${config.apiKey || ''}" placeholder="Your Google Custom Search API key">
                    <div class="input-hint">Get from <a href="https://console.developers.google.com" target="_blank">Google Cloud Console</a></div>
                </div>
                <div class="settings-group" id="google-cx-config" style="${config.engine === 'google' ? 'display: block' : 'display: none'}">
                    <label for="search-cx-id">Custom Search Engine ID (CX):</label>
                    <input type="text" id="search-cx-id" value="${config.cxId || ''}" placeholder="Your Google Custom Search Engine ID">
                    <div class="input-hint">Get from <a href="https://cse.google.com" target="_blank">Google Custom Search</a></div>
                </div>
                <div class="settings-group" id="bing-config" style="${config.engine === 'bing' ? 'display: block' : 'display: none'}">
                    <label for="bing-api-key">Bing API Key:</label>
                    <input type="password" id="bing-api-key" value="${config.bingApiKey || ''}" placeholder="Your Bing Search API key">
                    <div class="input-hint">Get from <a href="https://azure.microsoft.com/en-us/services/cognitive-services/bing-web-search-api/" target="_blank">Azure Cognitive Services</a></div>
                </div>
                <div class="settings-group">
                    <label for="search-max-results">Max Results:</label>
                    <input type="number" id="search-max-results" value="${config.maxResults || 10}" min="1" max="50">
                </div>
                <div class="settings-group">
                    <button class="btn secondary" onclick="ToolManager.testSearchTool()">Test Search Connection</button>
                    <div id="search-test-result" class="test-result"></div>
                </div>
                `;
                break;

            case 'code-execution':
                html = `
                <div class="settings-group">
                    <label>Allowed Languages:</label>
                    <div class="checkbox-group">
                        <label><input type="checkbox" value="python" ${config.allowedLanguages?.includes('python') ? 'checked' : ''}> Python</label>
                        <label><input type="checkbox" value="javascript" ${config.allowedLanguages?.includes('javascript') ? 'checked' : ''}> JavaScript</label>
                        <label><input type="checkbox" value="bash" ${config.allowedLanguages?.includes('bash') ? 'checked' : ''}> Bash</label>
                        <label><input type="checkbox" value="sql" ${config.allowedLanguages?.includes('sql') ? 'checked' : ''}> SQL</label>
                    </div>
                </div>
                <div class="settings-group">
                    <label for="code-timeout">Timeout (seconds):</label>
                    <input type="number" id="code-timeout" value="${config.timeout || 30}" min="5" max="300">
                </div>
                <div class="settings-group">
                    <label for="code-sandbox">Enable Sandbox:</label>
                    <input type="checkbox" id="code-sandbox" ${config.sandbox ? 'checked' : ''}>
                </div>
                `;
                break;

            case 'file-operations':
                html = `
                <div class="settings-group">
                    <label for="file-allowed-paths">Allowed Paths (one per line):</label>
                    <textarea id="file-allowed-paths">${config.allowedPaths?.join('\n') || '/tmp\n/uploads'}</textarea>
                </div>
                <div class="settings-group">
                    <label for="file-max-size">Max File Size (bytes):</label>
                    <input type="number" id="file-max-size" value="${config.maxFileSize || 10485760}" min="1024">
                </div>
                `;
                break;

            case 'calculator':
                html = `
                <div class="settings-group">
                    <label for="calc-precision">Precision (decimal places):</label>
                    <input type="number" id="calc-precision" value="${config.precision || 10}" min="1" max="20">
                </div>
                <div class="settings-group">
                    <label for="calc-complex">Allow Complex Numbers:</label>
                    <input type="checkbox" id="calc-complex" ${config.allowComplexNumbers ? 'checked' : ''}>
                </div>
                `;
                break;

            case 'image-generation':
                html = `
                <div class="settings-group">
                    <label for="image-provider">Provider:</label>
                    <select id="image-provider">
                        <option value="dalle" ${config.provider === 'dalle' ? 'selected' : ''}>DALL-E</option>
                        <option value="midjourney" ${config.provider === 'midjourney' ? 'selected' : ''}>Midjourney</option>
                        <option value="stable-diffusion" ${config.provider === 'stable-diffusion' ? 'selected' : ''}>Stable Diffusion</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="image-default-size">Default Size:</label>
                    <select id="image-default-size">
                        <option value="512x512" ${config.defaultSize === '512x512' ? 'selected' : ''}>512x512</option>
                        <option value="1024x1024" ${config.defaultSize === '1024x1024' ? 'selected' : ''}>1024x1024</option>
                        <option value="1792x1024" ${config.defaultSize === '1792x1024' ? 'selected' : ''}>1792x1024</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="image-max-images">Max Images per Request:</label>
                    <input type="number" id="image-max-images" value="${config.maxImages || 5}" min="1" max="10">
                </div>
                `;
                break;

            case 'email-sender':
                html = `
                <div class="settings-group">
                    <label for="email-provider">Provider:</label>
                    <select id="email-provider">
                        <option value="smtp" ${config.provider === 'smtp' ? 'selected' : ''}>SMTP</option>
                        <option value="sendgrid" ${config.provider === 'sendgrid' ? 'selected' : ''}>SendGrid</option>
                        <option value="mailgun" ${config.provider === 'mailgun' ? 'selected' : ''}>Mailgun</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="email-host">SMTP Host:</label>
                    <input type="text" id="email-host" value="${config.host || ''}" placeholder="smtp.gmail.com">
                </div>
                <div class="settings-group">
                    <label for="email-port">Port:</label>
                    <input type="number" id="email-port" value="${config.port || 587}" min="1" max="65535">
                </div>
                <div class="settings-group">
                    <label for="email-secure">Use TLS:</label>
                    <input type="checkbox" id="email-secure" ${config.secure ? 'checked' : ''}>
                </div>
                `;
                break;

            default:
                html = '<p>No configuration options available for this tool.</p>';
        }

        return html;
    }

    /**
     * Close tool editor
     */
    static closeEditor() {
        const editor = document.getElementById('tool-editor');
        if (editor) {
            editor.style.display = 'none';
        }
        this.selectedTool = null;
    }

    /**
     * Close tool config editor
     */
    static closeConfigEditor() {
        const editor = document.getElementById('tool-config-editor');
        if (editor) {
            editor.style.display = 'none';
        }
        this.selectedTool = null;
    }

    /**
     * Save custom tool
     */
    static async saveTool() {
        const name = document.getElementById('tool-name').value.trim();
        const description = document.getElementById('tool-description').value.trim();
        const type = document.getElementById('tool-type').value;
        const category = document.getElementById('tool-category').value;
        const endpoint = document.getElementById('tool-endpoint').value.trim();
        const method = document.getElementById('tool-method').value;
        const headersText = document.getElementById('tool-headers').value.trim();
        const parametersText = document.getElementById('tool-parameters').value.trim();
        const timeout = parseInt(document.getElementById('tool-timeout').value) || 30;

        if (!name) {
            Utils.showError('Tool name is required');
            return;
        }

        if (!endpoint) {
            Utils.showError('Endpoint or script path is required');
            return;
        }

        // Parse JSON fields
        let headers = {};
        let parameters = {};

        try {
            if (headersText) {
                headers = JSON.parse(headersText);
            }
        } catch (e) {
            Utils.showError('Invalid JSON in headers field');
            return;
        }

        try {
            if (parametersText) {
                parameters = JSON.parse(parametersText);
            }
        } catch (e) {
            Utils.showError('Invalid JSON in parameters field');
            return;
        }

        const toolData = {
            name,
            description,
            type,
            category,
            endpoint,
            method,
            headers,
            parameters,
            timeout,
            enabled: true
        };

        try {
            const url = this.selectedTool
                ? `/api/tools/${this.selectedTool.id}`
                : '/api/tools';

            const method_req = this.selectedTool ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method_req,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(toolData)
            });

            if (response.ok) {
                this.closeEditor();
                await this.loadTools();
                Utils.showSuccess(`Tool '${name}' ${this.selectedTool ? 'updated' : 'created'} successfully`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save tool');
            }
        } catch (error) {
            console.error('Error saving tool:', error);
            Utils.showError(error.message);
        }
    }

    /**
     * Save tool configuration
     */
    static async saveToolConfig() {
        if (!this.selectedTool) return;

        const config = this.extractConfigFromForm(this.selectedTool);

        try {
            // Use the correct backend endpoint for updating tool configuration
            const response = await fetch(`/api/tools/${this.selectedTool.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            });

            if (response.ok) {
                const data = await response.json();

                // Update local state
                this.selectedTool.config = config;

                // Update the tool in the correct array
                const builtInIndex = this.tools.findIndex(t => t.id === this.selectedTool.id);
                const customIndex = this.customTools.findIndex(t => t.id === this.selectedTool.id);

                if (builtInIndex >= 0) {
                    this.tools[builtInIndex].config = config;
                } else if (customIndex >= 0) {
                    this.customTools[customIndex].config = config;
                }

                this.closeConfigEditor();
                Utils.showSuccess(`Configuration for '${this.selectedTool.name}' saved successfully`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving tool configuration:', error);
            Utils.showError(`Failed to save configuration: ${error.message}`);
        }
    }

    /**
     * Extract configuration from form based on tool type
     */
    static extractConfigFromForm(tool) {
        const config = {};

        switch (tool.id) {
            case 'web-search':
                const engine = document.getElementById('search-engine')?.value || 'duckduckgo';
                config.engine = engine;
                config.maxResults = parseInt(document.getElementById('search-max-results')?.value) || 10;

                // Google-specific config
                if (engine === 'google') {
                    config.apiKey = document.getElementById('search-api-key')?.value || '';
                    config.cxId = document.getElementById('search-cx-id')?.value || '';
                }

                // Bing-specific config
                if (engine === 'bing') {
                    config.bingApiKey = document.getElementById('bing-api-key')?.value || '';
                }
                break;

            case 'code-execution':
                const langCheckboxes = document.querySelectorAll('input[type="checkbox"][value]');
                config.allowedLanguages = Array.from(langCheckboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.value);
                config.timeout = parseInt(document.getElementById('code-timeout')?.value) || 30;
                config.sandbox = document.getElementById('code-sandbox')?.checked || false;
                break;

            case 'file-operations':
                const pathsText = document.getElementById('file-allowed-paths')?.value || '';
                config.allowedPaths = pathsText.split('\n').filter(p => p.trim());
                config.maxFileSize = parseInt(document.getElementById('file-max-size')?.value) || 10485760;
                break;

            case 'calculator':
                config.precision = parseInt(document.getElementById('calc-precision')?.value) || 10;
                config.allowComplexNumbers = document.getElementById('calc-complex')?.checked || false;
                break;

            case 'image-generation':
                config.provider = document.getElementById('image-provider')?.value || 'dalle';
                config.defaultSize = document.getElementById('image-default-size')?.value || '1024x1024';
                config.maxImages = parseInt(document.getElementById('image-max-images')?.value) || 5;
                break;

            case 'email-sender':
                config.provider = document.getElementById('email-provider')?.value || 'smtp';
                config.host = document.getElementById('email-host')?.value || '';
                config.port = parseInt(document.getElementById('email-port')?.value) || 587;
                config.secure = document.getElementById('email-secure')?.checked || false;
                break;
        }

        return config;
    }

    /**
     * Handle search engine selection change
     */
    static onSearchEngineChange() {
        const engine = document.getElementById('search-engine')?.value;
        const googleConfig = document.getElementById('google-config');
        const googleCxConfig = document.getElementById('google-cx-config');
        const bingConfig = document.getElementById('bing-config');

        // Hide all provider-specific configs
        if (googleConfig) googleConfig.style.display = 'none';
        if (googleCxConfig) googleCxConfig.style.display = 'none';
        if (bingConfig) bingConfig.style.display = 'none';

        // Show relevant config based on selected engine
        if (engine === 'google') {
            if (googleConfig) googleConfig.style.display = 'block';
            if (googleCxConfig) googleCxConfig.style.display = 'block';
        } else if (engine === 'bing') {
            if (bingConfig) bingConfig.style.display = 'block';
        }
    }

    /**
     * Test search tool configuration
     */
    static async testSearchTool() {
        const engine = document.getElementById('search-engine')?.value || 'duckduckgo';
        const resultDiv = document.getElementById('search-test-result');

        if (resultDiv) {
            resultDiv.innerHTML = '<span class="testing">🔄 Testing search connection...</span>';
        }

        try {
            const testData = {
                engine: engine,
                query: 'test search query'
            };

            // Add API credentials based on engine
            if (engine === 'google') {
                const apiKey = document.getElementById('search-api-key')?.value;
                const cxId = document.getElementById('search-cx-id')?.value;

                if (!apiKey || !cxId) {
                    throw new Error('Google Custom Search requires both API key and CX ID');
                }

                testData.apiKey = apiKey;
                testData.cxId = cxId;
            } else if (engine === 'bing') {
                const apiKey = document.getElementById('bing-api-key')?.value;

                if (!apiKey) {
                    throw new Error('Bing Search requires an API key');
                }

                testData.apiKey = apiKey;
            }

            const response = await fetch('/api/tools/search/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });

            const result = await response.json();

            if (resultDiv) {
                if (result.connected) {
                    resultDiv.innerHTML = `<span class="success">✅ ${result.message}</span>`;
                    if (result.resultCount !== undefined) {
                        resultDiv.innerHTML += `<span class="result-count"> (${result.resultCount} results found)</span>`;
                    }
                    Utils.showSuccess(`${engine} search connection successful!`);
                } else {
                    resultDiv.innerHTML = `<span class="error">❌ ${result.message || result.error}</span>`;
                    if (result.blocked && result.retryAfter) {
                        resultDiv.innerHTML += `<span class="retry-info"> (Retry in ${result.retryAfter} seconds)</span>`;
                    }
                    Utils.showError(`${engine} search connection failed`);
                }
            }
        } catch (error) {
            console.error('Error testing search tool:', error);
            if (resultDiv) {
                resultDiv.innerHTML = `<span class="error">❌ Test failed: ${error.message}</span>`;
            }
            Utils.showError(`Search test failed: ${error.message}`);
        }
    }

    /**
     * Delete a custom tool
     */
    static async deleteTool(toolId) {
        const tool = this.customTools.find(t => t.id === toolId);
        if (!tool) return;

        if (!confirm(`Are you sure you want to delete the tool '${tool.name}'? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/tools/${toolId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadTools();
                Utils.showSuccess(`Tool '${tool.name}' deleted successfully`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete tool');
            }
        } catch (error) {
            console.error('Error deleting tool:', error);
            Utils.showError(error.message);
        }
    }

    /**
     * Import a tool
     */
    static importTool() {
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
                        const toolData = JSON.parse(event.target.result);

                        if (!toolData.name || !toolData.endpoint) {
                            throw new Error('Invalid tool format');
                        }

                        const response = await fetch('/api/tools', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(toolData)
                        });

                        if (response.ok) {
                            await this.loadTools();
                            Utils.showSuccess(`Tool '${toolData.name}' imported successfully`);
                        } else {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to import tool');
                        }
                    } catch (parseError) {
                        console.error('Error parsing tool:', parseError);
                        Utils.showError('Invalid tool file format');
                    }
                };
                reader.readAsText(file);
            } catch (error) {
                console.error('Error importing tool:', error);
                Utils.showError('Failed to import tool');
            }
        };

        input.click();
    }

    /**
     * Manage plugins - placeholder for future plugin system
     */
    static managePlugins() {
        Utils.showInfo('Plugin management coming soon!');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ToolManager.init();
});

window.ToolManager = ToolManager;
