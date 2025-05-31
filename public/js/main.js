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

        // Initialize Widget System
        if (typeof WidgetSystem !== 'undefined') {
            WidgetSystem.init();
            console.log('Widget System initialized');
        }
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
            const response = await fetch('/api/models/refresh');
            if (response.ok) {
                const data = await response.json();
                const models = data.models || {};
                
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
                console.log('Models loaded:', this.models.length);
            }
        } catch (error) {
            console.error('Error loading models:', error);
            Utils.showError('Failed to load models');
        }
    }

    async loadAgents() {
        try {
            const response = await fetch('/api/agents/list/all');
            if (response.ok) {
                const data = await response.json();
                const agents = data.agents || [];
                QuickConfig.updateAgentList(agents);
                AgentManager.updateAgentList(agents);
                console.log('Agents loaded:', agents.length);
            }
        } catch (error) {
            console.error('Error loading agents:', error);
            Utils.showError('Failed to load agents');
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput?.value.trim();

        if (!message) return;

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

            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages,
                    model: this.settings.model || 'gpt-4o', // Fallback to default model
                    config: {},
                    temperature: this.settings.temperature,
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

            if (response.ok) {
                const data = await response.json();
                ChatInterface.addMessage('assistant', data.response);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response');
            }
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

    newChat() {
        ChatInterface.clearChat();
        console.log('Started new chat');
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('Settings updated:', this.settings);
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
        console.log('Current agent set to:', agentId);
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new ChatApp();
});

// Export for use in other modules
window.ChatApp = ChatApp;
