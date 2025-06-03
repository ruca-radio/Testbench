// Focused Chat Widget for Focus Mode
class FocusedChatWidget extends BaseWidget {
    constructor(id, config) {
        super(id, config);
        this.type = 'focused-chat';
        this.messages = [];
        this.conversationBranches = new Map();
        this.currentBranch = 'main';
        this.compressionEnabled = config.compressionEnabled || true;
        this.branchingEnabled = config.branchingEnabled || true;
        this.distractionFree = config.distractionFree || true;
        this.contextWindow = config.contextWindow || 4000; // tokens
        this.autoSave = true;
        this.conversationId = config.conversationId || null;
        
        // Initialize conversation branches
        this.conversationBranches.set('main', []);
        
        // Bind methods
        this.sendMessage = this.sendMessage.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.createBranch = this.createBranch.bind(this);
        this.switchBranch = this.switchBranch.bind(this);
        this.compressContext = this.compressContext.bind(this);
    }

    render() {
        const distractionFreeClass = this.distractionFree ? 'distraction-free' : '';
        
        return `
            <div class="focused-chat-widget ${distractionFreeClass}" data-widget-id="${this.id}">
                <div class="focused-chat-header">
                    <div class="conversation-info">
                        <h3>${this.config.title}</h3>
                        <div class="conversation-meta">
                            <span class="branch-indicator">Branch: ${this.currentBranch}</span>
                            <span class="message-count">${this.getCurrentMessages().length} messages</span>
                            <span class="context-usage" id="context-usage-${this.id}">0/${this.contextWindow} tokens</span>
                        </div>
                    </div>
                    <div class="focused-chat-controls">
                        ${this.branchingEnabled ? `<button class="btn small" onclick="window.widgets['${this.id}'].createBranch()" title="Create new conversation branch">🌿 Branch</button>` : ''}
                        ${this.compressionEnabled ? `<button class="btn small" onclick="window.widgets['${this.id}'].compressContext()" title="Compress conversation context">🗜️ Compress</button>` : ''}
                        <button class="btn small" onclick="window.widgets['${this.id}'].clearConversation()" title="Clear conversation">🗑️ Clear</button>
                    </div>
                </div>
                
                ${this.branchingEnabled ? this.renderBranchSelector() : ''}
                
                <div class="focused-chat-messages" id="messages-${this.id}">
                    ${this.renderMessages()}
                </div>
                
                <div class="focused-chat-input">
                    <div class="input-container">
                        <textarea 
                            id="input-${this.id}" 
                            placeholder="Type your message here... (Shift+Enter for new line, Enter to send)"
                            onkeydown="window.widgets['${this.id}'].handleKeyPress(event)"
                            class="focused-input"></textarea>
                        <div class="input-controls">
                            <button class="btn primary send-btn" onclick="window.widgets['${this.id}'].sendMessage()">
                                <span class="send-icon">➤</span> Send
                            </button>
                        </div>
                    </div>
                    <div class="input-suggestions" id="suggestions-${this.id}" style="display: none;">
                        <!-- Dynamic suggestions will be populated here -->
                    </div>
                </div>
                
                <div class="focused-chat-status" id="status-${this.id}">
                    Ready
                </div>
            </div>
        `;
    }

    renderBranchSelector() {
        const branches = Array.from(this.conversationBranches.keys());
        return `
            <div class="branch-selector">
                <select id="branch-select-${this.id}" onchange="window.widgets['${this.id}'].switchBranch(this.value)">
                    ${branches.map(branch => 
                        `<option value="${branch}" ${branch === this.currentBranch ? 'selected' : ''}>${branch}</option>`
                    ).join('')}
                </select>
                <span class="branch-info">${branches.length} branches</span>
            </div>
        `;
    }

    renderMessages() {
        const messages = this.getCurrentMessages();
        if (messages.length === 0) {
            return `
                <div class="empty-conversation">
                    <div class="empty-icon">🎯</div>
                    <h4>Welcome to Focus Mode</h4>
                    <p>Start a distraction-free conversation with your AI assistant.</p>
                    <div class="focus-tips">
                        <div class="tip">💡 Context compression keeps your conversation efficient</div>
                        <div class="tip">🌿 Branch conversations to explore different topics</div>
                        <div class="tip">📊 Export your conversation in multiple formats</div>
                    </div>
                </div>
            `;
        }

        return messages.map((message, index) => this.renderMessage(message, index)).join('');
    }

    renderMessage(message, index) {
        const isUser = message.role === 'user';
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        return `
            <div class="message ${isUser ? 'user-message' : 'assistant-message'}" data-message-id="${index}">
                <div class="message-header">
                    <span class="message-role">${isUser ? 'You' : 'Assistant'}</span>
                    <span class="message-timestamp">${timestamp}</span>
                    <div class="message-actions">
                        ${!isUser ? `<button class="btn tiny" onclick="window.widgets['${this.id}'].branchFromMessage(${index})" title="Branch from this message">🌿</button>` : ''}
                        <button class="btn tiny" onclick="window.widgets['${this.id}'].copyMessage(${index})" title="Copy message">📋</button>
                        <button class="btn tiny" onclick="window.widgets['${this.id}'].editMessage(${index})" title="Edit message">✏️</button>
                    </div>
                </div>
                <div class="message-content">
                    ${this.formatMessageContent(message.content)}
                </div>
                ${message.metadata ? this.renderMessageMetadata(message.metadata) : ''}
            </div>
        `;
    }

    renderMessageMetadata(metadata) {
        return `
            <div class="message-metadata">
                ${metadata.model ? `<span class="meta-item">Model: ${metadata.model}</span>` : ''}
                ${metadata.tokens ? `<span class="meta-item">Tokens: ${metadata.tokens}</span>` : ''}
                ${metadata.branch ? `<span class="meta-item">Branch: ${metadata.branch}</span>` : ''}
            </div>
        `;
    }

    formatMessageContent(content) {
        // Enhanced markdown formatting
        return content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    getCurrentMessages() {
        return this.conversationBranches.get(this.currentBranch) || [];
    }

    async sendMessage() {
        const inputElement = document.getElementById(`input-${this.id}`);
        const message = inputElement.value.trim();
        
        if (!message) return;

        // Add user message
        this.addMessage({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            branch: this.currentBranch
        });

        // Clear input
        inputElement.value = '';
        this.updateStatus('Sending...');

        try {
            // Get current model configuration
            const modelConfig = await this.getCurrentModelConfig();
            
            // Prepare messages for API
            const messages = this.prepareMessagesForAPI();
            
            // Send to chat API
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    model: modelConfig.model,
                    provider: modelConfig.provider,
                    config: modelConfig.config,
                    metadata: {
                        widgetId: this.id,
                        branch: this.currentBranch,
                        focusMode: true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content || data.response || 'No response received';

            // Add assistant response
            this.addMessage({
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date().toISOString(),
                branch: this.currentBranch,
                metadata: {
                    model: modelConfig.model,
                    tokens: data.usage?.total_tokens,
                    branch: this.currentBranch
                }
            });

            this.updateStatus('Ready');
            this.updateContextUsage();

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage({
                role: 'system',
                content: `Error: ${error.message}`,
                timestamp: new Date().toISOString(),
                branch: this.currentBranch,
                isError: true
            });
            this.updateStatus('Error occurred');
        }

        // Auto-save if enabled
        if (this.autoSave) {
            this.saveConversation();
        }
    }

    addMessage(message) {
        const currentMessages = this.getCurrentMessages();
        currentMessages.push(message);
        this.conversationBranches.set(this.currentBranch, currentMessages);
        this.refreshMessages();
    }

    refreshMessages() {
        const messagesContainer = document.getElementById(`messages-${this.id}`);
        if (messagesContainer) {
            messagesContainer.innerHTML = this.renderMessages();
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        this.updateConversationMeta();
    }

    updateConversationMeta() {
        const messages = this.getCurrentMessages();
        const messageCountEl = this.element?.querySelector('.message-count');
        if (messageCountEl) {
            messageCountEl.textContent = `${messages.length} messages`;
        }
    }

    updateStatus(status) {
        const statusElement = document.getElementById(`status-${this.id}`);
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    updateContextUsage() {
        // Estimate token usage (rough calculation)
        const messages = this.getCurrentMessages();
        const estimatedTokens = messages.reduce((total, msg) => {
            return total + Math.ceil(msg.content.length / 4); // Rough estimate: 4 chars per token
        }, 0);

        const contextUsageEl = document.getElementById(`context-usage-${this.id}`);
        if (contextUsageEl) {
            const percentage = (estimatedTokens / this.contextWindow) * 100;
            contextUsageEl.textContent = `${estimatedTokens}/${this.contextWindow} tokens`;
            contextUsageEl.className = percentage > 80 ? 'context-high' : percentage > 60 ? 'context-medium' : 'context-low';
        }
    }

    async getCurrentModelConfig() {
        // Get current model configuration from workspace settings or use defaults
        const workspace = WorkspaceManager.getCurrentWorkspace();
        return {
            model: workspace?.settings?.defaultModel || 'gpt-4o',
            provider: workspace?.settings?.defaultProvider || 'openai',
            config: {}
        };
    }

    prepareMessagesForAPI() {
        const messages = this.getCurrentMessages();
        
        // If compression is enabled and we're near the context limit, compress
        if (this.compressionEnabled && this.shouldCompress(messages)) {
            return this.getCompressedMessages(messages);
        }
        
        return messages.filter(msg => msg.role !== 'system' || !msg.isError);
    }

    shouldCompress(messages) {
        const estimatedTokens = messages.reduce((total, msg) => {
            return total + Math.ceil(msg.content.length / 4);
        }, 0);
        return estimatedTokens > (this.contextWindow * 0.8);
    }

    getCompressedMessages(messages) {
        // Keep the first message (context) and last few messages, compress the middle
        if (messages.length <= 6) return messages;
        
        const keep = 3; // Keep last 3 exchanges
        const recentMessages = messages.slice(-keep * 2);
        const contextMessage = messages[0];
        
        // Create compression summary
        const compressedContent = `[Previous conversation compressed: ${messages.length - recentMessages.length - 1} messages about ${this.extractTopics(messages.slice(1, -keep * 2))}]`;
        
        return [
            contextMessage,
            { role: 'system', content: compressedContent, timestamp: new Date().toISOString() },
            ...recentMessages
        ];
    }

    extractTopics(messages) {
        // Simple topic extraction - in reality, this could use AI
        const content = messages.map(m => m.content).join(' ');
        const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
        const freq = {};
        words.forEach(word => freq[word] = (freq[word] || 0) + 1);
        return Object.entries(freq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([word]) => word)
            .join(', ');
    }

    handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    createBranch() {
        const branchName = prompt('Enter branch name:', `branch-${Date.now()}`);
        if (!branchName || this.conversationBranches.has(branchName)) {
            return;
        }

        // Create new branch from current conversation
        const currentMessages = [...this.getCurrentMessages()];
        this.conversationBranches.set(branchName, currentMessages);
        this.currentBranch = branchName;
        
        this.refreshBranchSelector();
        this.updateStatus(`Switched to branch: ${branchName}`);
    }

    switchBranch(branchName) {
        if (this.conversationBranches.has(branchName)) {
            this.currentBranch = branchName;
            this.refreshMessages();
            this.updateStatus(`Switched to branch: ${branchName}`);
        }
    }

    branchFromMessage(messageIndex) {
        const branchName = prompt('Enter branch name:', `branch-${Date.now()}`);
        if (!branchName || this.conversationBranches.has(branchName)) {
            return;
        }

        // Create new branch from messages up to the specified index
        const currentMessages = this.getCurrentMessages();
        const branchMessages = currentMessages.slice(0, messageIndex + 1);
        this.conversationBranches.set(branchName, branchMessages);
        this.currentBranch = branchName;
        
        this.refreshBranchSelector();
        this.refreshMessages();
        this.updateStatus(`Created branch: ${branchName}`);
    }

    refreshBranchSelector() {
        const widget = document.querySelector(`[data-widget-id="${this.id}"]`);
        if (widget) {
            const branchSelectorContainer = widget.querySelector('.branch-selector');
            if (branchSelectorContainer) {
                branchSelectorContainer.innerHTML = this.renderBranchSelector().replace(/<div class="branch-selector">|<\/div>/g, '');
            }
        }
    }

    async compressContext() {
        const messages = this.getCurrentMessages();
        if (messages.length < 4) {
            this.updateStatus('Not enough messages to compress');
            return;
        }

        this.updateStatus('Compressing context...');
        
        try {
            // Use AI to create a better compression
            const compressionPrompt = `Please create a concise summary of this conversation while preserving key context and information:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;
            
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: compressionPrompt }],
                    model: 'gpt-4o',
                    provider: 'openai'
                })
            });

            const data = await response.json();
            const summary = data.choices?.[0]?.message?.content || 'Conversation compressed';

            // Replace with compressed version
            const compressedMessages = [
                { 
                    role: 'system', 
                    content: `[Conversation Summary: ${summary}]`,
                    timestamp: new Date().toISOString(),
                    isCompressed: true
                },
                ...messages.slice(-2) // Keep last 2 messages
            ];

            this.conversationBranches.set(this.currentBranch, compressedMessages);
            this.refreshMessages();
            this.updateStatus('Context compressed successfully');
            this.updateContextUsage();

        } catch (error) {
            console.error('Error compressing context:', error);
            this.updateStatus('Failed to compress context');
        }
    }

    clearConversation() {
        if (confirm('Are you sure you want to clear this conversation?')) {
            this.conversationBranches.set(this.currentBranch, []);
            this.refreshMessages();
            this.updateStatus('Conversation cleared');
        }
    }

    copyMessage(messageIndex) {
        const messages = this.getCurrentMessages();
        const message = messages[messageIndex];
        if (message) {
            navigator.clipboard.writeText(message.content);
            this.updateStatus('Message copied to clipboard');
        }
    }

    editMessage(messageIndex) {
        // Implementation for editing messages
        const messages = this.getCurrentMessages();
        const message = messages[messageIndex];
        if (message) {
            const newContent = prompt('Edit message:', message.content);
            if (newContent !== null) {
                message.content = newContent;
                message.edited = true;
                message.editedAt = new Date().toISOString();
                this.refreshMessages();
                this.updateStatus('Message edited');
            }
        }
    }

    async saveConversation() {
        if (!this.conversationId) {
            this.conversationId = `focus-${Date.now()}`;
        }

        const conversationData = {
            id: this.conversationId,
            type: 'focus',
            branches: Object.fromEntries(this.conversationBranches),
            currentBranch: this.currentBranch,
            created: this.created || new Date().toISOString(),
            updated: new Date().toISOString(),
            metadata: {
                contextWindow: this.contextWindow,
                compressionEnabled: this.compressionEnabled,
                branchingEnabled: this.branchingEnabled
            }
        };

        try {
            const response = await fetch('/api/conversations/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(conversationData)
            });

            if (response.ok) {
                this.updateStatus('Conversation saved');
            }
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }

    destroy() {
        // Clean up event listeners and save conversation
        if (this.autoSave) {
            this.saveConversation();
        }
        super.destroy();
    }

    // Widget lifecycle methods
    onResize() {
        // Handle widget resize
        this.updateContextUsage();
    }

    getExportData() {
        return {
            type: this.type,
            conversations: Object.fromEntries(this.conversationBranches),
            currentBranch: this.currentBranch,
            settings: {
                compressionEnabled: this.compressionEnabled,
                branchingEnabled: this.branchingEnabled,
                contextWindow: this.contextWindow
            }
        };
    }
}

// Register the widget
if (typeof WidgetFactory !== 'undefined') {
    WidgetFactory.registerWidget('focused-chat', FocusedChatWidget);
}

window.FocusedChatWidget = FocusedChatWidget;