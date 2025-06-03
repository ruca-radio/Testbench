// Main application entry point
class ChatApp {
    constructor() {
        this.currentAgent = 'default';
        this.models = [];
        this.settings = {
            temperature: 1.0,
            model: '',
            provider: ''
        };
        this.mcpContext = []; // Array of MCP resource URIs to include as context

        this.init();
    }

    async init() {
        console.log('Initializing ChatApp...');

        // Initialize UI components
        this.initializeUI();

        // Load initial data
        await this.loadModels();
        await this.loadAgents();

        // Setup event listeners
        this.setupEventListeners();

        // Setup drag and drop
        this.setupDragAndDrop();

        console.log('ChatApp initialized successfully');
    }

    initializeUI() {
        // Initialize chat interface
        ChatInterface.init();

        // Initialize settings modal
        SettingsModal.init();

        // Initialize quick config panel
        QuickConfig.init();

        // Initialize TestBench Agent Manager
        if (typeof TestBenchManager !== 'undefined') {
            TestBenchManager.init();
            console.log('TestBench Agent Manager initialized');
        }

        // Initialize Widget System (commented out for opt-in only)
        // if (typeof WidgetSystem !== 'undefined') {
        //     WidgetSystem.init();
        //     console.log('Widget System initialized');
        // }
    }

    setupEventListeners() {
        // Send message on Enter key
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Send button click
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }

        // New chat button
        const newChatButton = document.getElementById('new-chat');
        if (newChatButton) {
            newChatButton.addEventListener('click', () => this.newChat());
        }
    }

    async loadModels() {
        try {
            const response = await Utils.apiCall('/api/models/refresh', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const models = response.models || {};

            // Convert grouped models to flat array
            this.models = [];
            Object.entries(models).forEach(([provider, providerModels]) => {
                if (Array.isArray(providerModels)) {
                    providerModels.forEach(model => {
                        this.models.push({
                            id: model.id,
                            name: model.name || model.id,
                            provider: provider,
                            data: model.data
                        });
                    });
                }
            });

            // Update both dropdowns
            this.updateMainModelDropdown(this.models);
            QuickConfig.updateModelList(this.models);
            console.log(`Models loaded: ${this.models.length}`);
        } catch (error) {
            console.error('Error loading models:', error);
            if (error.statusCode === 401) {
                Utils.showError('Authentication required. Please log in.');
                this.redirectToLogin();
            } else {
                Utils.showError('Failed to load models');
            }
        }
    }

    async loadAgents() {
        try {
            const response = await Utils.apiCall('/api/agents/list/all', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const agents = response.agents || [];
            QuickConfig.updateAgentList(agents);
            AgentManager.updateAgentList(agents);
            console.log(`Agents loaded: ${agents.length}`);
        } catch (error) {
            console.error('Error loading agents:', error);
            if (error.statusCode === 401) {
                Utils.showError('Authentication required. Please log in.');
                this.redirectToLogin();
            } else {
                Utils.showError('Failed to load agents');
            }
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput?.value.trim();

        if (!message) return;

        // Validate model is selected
        if (!this.settings.model) {
            Utils.showError('Please select a model first');
            return;
        }

        // Clear input
        messageInput.value = '';

        // Add user message to chat
        ChatInterface.addMessage('user', message);

        // Show typing indicator
        const typingId = ChatInterface.showTyping();

        // Set loading state
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.innerHTML = '<span class="loading-indicator"></span>';
        }

        try {
            // Format messages in the expected format
            const messages = [
                { role: 'user', content: message }
            ];

            // Get provider from model for correct config
            const provider = this.getProviderFromModel(this.settings.model);
            const config = {};

            // Add provider-specific configuration
            if (provider) {
                config[provider] = {}; // Will be filled from saved settings on backend
            }

            const response = await Utils.apiCall('/chat', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    messages: messages,
                    model: this.settings.model,
                    config: config,
                    temperature: this.settings.temperature || 1.0,
                    maxTokens: 4000,
                    topP: 1.0,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                    agent: this.currentAgent,
                    mcpContext: this.mcpContext
                }),
            });

            // Remove typing indicator
            ChatInterface.hideTyping(typingId);

            ChatInterface.addMessage('assistant', response.response);
        } catch (error) {
            ChatInterface.hideTyping(typingId);
            console.error('Error sending message:', error);
            ChatInterface.addMessage('assistant', `Error: ${error.message}`);
        } finally {
            // Reset button state
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                    </svg>
                `;
            }
        }
    }

    getProviderFromModel(model) {
        if (!model) return null;
        if (model.startsWith('claude-') || model.startsWith('anthropic/')) return 'anthropic';
        if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('openai/')) return 'openai';
        if (model.includes('/')) return 'openrouter';
        // Check if it's a known ollama model
        const ollamaModels = ['llama', 'mistral', 'phi', 'gemma', 'qwen', 'deepseek'];
        if (ollamaModels.some(m => model.toLowerCase().includes(m))) return 'ollama';
        return 'openai'; // Default fallback
    }

    newChat() {
        ChatInterface.clearChat();
        console.log('Started new chat');
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        // Don't log sensitive settings data
        console.log('Settings updated');
    }

    updateMainModelDropdown(models) {
        const modelSelect = document.getElementById('model-select');
        if (!modelSelect) return;

        // Clear existing options
        modelSelect.innerHTML = '';

        if (!models || models.length === 0) {
            modelSelect.innerHTML = '<option value="">No models available</option>';
            return;
        }

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

        // Select first model by default if no model is set
        if (models.length > 0 && !this.settings.model) {
            modelSelect.value = models[0].id;
            this.settings.model = models[0].id;
        } else if (this.settings.model) {
            modelSelect.value = this.settings.model;
        }
    }

    setCurrentAgent(agentId) {
        this.currentAgent = agentId;
        console.log('Current agent updated');
    }

    /**
     * Add an MCP resource to the chat context
     * @param {string} serverName - Name of the MCP server
     * @param {string} resourceUri - URI of the resource
     */
    addMCPContext(serverName, resourceUri) {
        const contextRef = `${serverName}://${resourceUri}`;

        // Check if already in context
        if (!this.mcpContext.includes(contextRef)) {
            this.mcpContext.push(contextRef);
            console.log(`Added MCP context: ${contextRef}`);
            return true;
        }

        return false;
    }

    /**
     * Remove an MCP resource from the chat context
     * @param {string} contextRef - Full context reference (server://uri)
     */
    removeMCPContext(contextRef) {
        const index = this.mcpContext.indexOf(contextRef);
        if (index !== -1) {
            this.mcpContext.splice(index, 1);
            console.log(`Removed MCP context: ${contextRef}`);
            return true;
        }

        return false;
    }

    /**
     * Clear all MCP context
     */
    clearMCPContext() {
        this.mcpContext = [];
        console.log('Cleared all MCP context');
    }

    /**
     * Get the current MCP context
     * @returns {Array} - Array of MCP context references
     */
    getMCPContext() {
        return this.mcpContext;
    }

    setupDragAndDrop() {
        const chatContainer = document.getElementById('chat-messages');
        const messageInput = document.getElementById('message-input');

        if (!chatContainer || !messageInput) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, preventDefaults, false);
            chatContainer.addEventListener(eventName, preventDefaults, false);
            messageInput.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            chatContainer.addEventListener(eventName, highlight, false);
            messageInput.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            chatContainer.addEventListener(eventName, unhighlight, false);
            messageInput.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            e.currentTarget.classList.add('drag-highlight');
        }

        function unhighlight(e) {
            e.currentTarget.classList.remove('drag-highlight');
        }

        // Handle dropped files
        chatContainer.addEventListener('drop', handleDrop, false);
        messageInput.addEventListener('drop', handleDrop, false);

        const self = this;

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;

            handleFiles(files);
        }

        function handleFiles(files) {
            ([...files]).forEach(uploadFile);
        }

        async function uploadFile(file) {
            // Handle text files
            if (file.type.startsWith('text/') ||
                file.name.endsWith('.txt') ||
                file.name.endsWith('.md') ||
                file.name.endsWith('.json') ||
                file.name.endsWith('.js') ||
                file.name.endsWith('.py') ||
                file.name.endsWith('.java') ||
                file.name.endsWith('.cpp') ||
                file.name.endsWith('.c') ||
                file.name.endsWith('.cs') ||
                file.name.endsWith('.html') ||
                file.name.endsWith('.css') ||
                file.name.endsWith('.xml') ||
                file.name.endsWith('.yaml') ||
                file.name.endsWith('.yml')) {

                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    const message = `File: ${file.name}\n\`\`\`\n${content}\n\`\`\``;
                    messageInput.value = message;
                    Utils.showInfo(`Added ${file.name} to message`);
                };
                reader.readAsText(file);
            }
            // Handle image files
            else if (file.type.startsWith('image/')) {
                // Validate image file size
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    Utils.showError(`Image file too large. Maximum size is 5MB.`);
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    const dataUrl = e.target.result;
                    const message = `[Image: ${file.name}]\n${dataUrl}`;
                    messageInput.value = message;
                    Utils.showInfo(`Added image ${file.name} to message`);
                };
                reader.readAsDataURL(file);
            }
            // Handle other files
            else {
                Utils.showError(`Unsupported file type: ${file.type || 'unknown'}`);
            }
        }
    }
}

// Global app instance
let app;

// Widget mode state
window.widgetModeEnabled = false;

// Widget mode toggle function
window.toggleWidgetMode = function() {
    const toggleBtn = document.getElementById('toggle-widget-mode');
    const widgetToolbar = document.getElementById('widget-toolbar');

    if (!window.widgetModeEnabled) {
        // Enable widget mode
        window.widgetModeEnabled = true;

        // Update button
        if (toggleBtn) {
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                </svg>
                Exit Widgets
            `;
            toggleBtn.classList.add('danger');
            toggleBtn.title = 'Disable widget mode';
        }

        // Show widget toolbar
        if (widgetToolbar) {
            widgetToolbar.style.display = 'block';
        }

        // Initialize widget systems
        if (typeof WidgetSystem !== 'undefined') {
            WidgetSystem.init();
            console.log('Widget System enabled');
        }

        if (typeof window.enhancedWidgetSystem !== 'undefined') {
            window.enhancedWidgetSystem.init();
            console.log('Enhanced Widget System enabled');
        }

        Utils.showInfo('Widget mode enabled! You can now add and arrange widgets.');

    } else {
        // Disable widget mode
        window.widgetModeEnabled = false;

        // Update button
        if (toggleBtn) {
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A0.5,0.5 0 0,0 7,13.5A0.5,0.5 0 0,0 7.5,14A0.5,0.5 0 0,0 8,13.5A0.5,0.5 0 0,0 7.5,13M16.5,13A0.5,0.5 0 0,0 16,13.5A0.5,0.5 0 0,0 16.5,14A0.5,0.5 0 0,0 17,13.5A0.5,0.5 0 0,0 16.5,13Z"/>
                </svg>
                🧩 Widgets
            `;
            toggleBtn.classList.remove('danger');
            toggleBtn.title = 'Enable widget mode (experimental)';
        }

        // Hide widget toolbar
        if (widgetToolbar) {
            widgetToolbar.style.display = 'none';
        }

        // Clear any widgets and restore original content
        if (window.widgetSystem) {
            window.widgetSystem.widgets.clear();

            // Restore original content by removing widget wrappers
            document.querySelectorAll('.widget-area').forEach(area => {
                if (!area.getAttribute('data-preserve-content')) {
                    // Reset widget areas that were modified
                    const widgets = area.querySelectorAll('.widget-container');
                    widgets.forEach(widget => widget.remove());

                    const dropZones = area.querySelectorAll('.widget-drop-zone');
                    dropZones.forEach(zone => zone.style.display = 'none');
                }
            });
        }

        Utils.showInfo('Widget mode disabled. Chat interface restored.');
    }
};

// Add authentication helper methods
ChatApp.prototype.getAuthHeaders = function() {
    const token = this.getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

ChatApp.prototype.getAuthToken = function() {
    // Get token from secure storage (cookie or sessionStorage)
    return this.getCookie('auth_token') || sessionStorage.getItem('auth_token');
};

ChatApp.prototype.getCookie = function(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

ChatApp.prototype.redirectToLogin = function() {
    // Redirect to login page after a short delay
    setTimeout(() => {
        window.location.href = '/login';
    }, 2000);
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new ChatApp();
});

// Export for use in other modules
window.ChatApp = ChatApp;

// Global functions for UI interactions
window.newWorkspace = function() {
    if (window.WorkspaceManager) {
        WorkspaceManager.createWorkspace();
    } else {
        Utils.showInfo('Opening workspace creator...');
        SettingsModal.open('workspaces');
    }
};

window.newConversation = function() {
    if (window.app) {
        window.app.newChat();
    }
};

// Make sure new workspace button works
document.addEventListener('DOMContentLoaded', () => {
    const newWorkspaceBtn = document.getElementById('new-workspace');
    if (newWorkspaceBtn) {
        newWorkspaceBtn.addEventListener('click', () => {
            window.newWorkspace();
        });
    }

    const newChatBtn = document.getElementById('new-chat');
    if (newChatBtn && !newChatBtn.hasAttribute('data-initialized')) {
        newChatBtn.setAttribute('data-initialized', 'true');
        newChatBtn.addEventListener('click', () => {
            window.newConversation();
        });
    }
});
