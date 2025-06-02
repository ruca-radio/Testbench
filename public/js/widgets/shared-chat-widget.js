// Shared Chat Widget - Collaborative chat interface for multiple users/agents
class SharedChatWidget extends BaseWidget {
    constructor(widgetData) {
        super(widgetData);
        this.messages = [];
        this.participants = new Map();
        this.currentModel = null;
        this.isTyping = false;
        this.sessionId = widgetData.config?.sessionId || `session-${Date.now()}`;
        this.currentUser = widgetData.config?.currentUser || 'User';
        this.collaborationMode = widgetData.config?.mode || 'realtime'; // realtime, turn-based
    }

    async onInit() {
        // Load participants
        await this.loadParticipants();
        
        // Set default model
        this.currentModel = localStorage.getItem('default_model') || 'gpt-3.5-turbo';
        
        // Load chat history if exists
        this.loadChatHistory();
        
        // Render the chat interface
        this.render();
        
        // Setup WebSocket for real-time collaboration
        if (this.collaborationMode === 'realtime') {
            this.setupWebSocket();
        }
    }

    async loadParticipants() {
        // Load agents as participants
        try {
            const response = await fetch('/api/agents/list/all');
            if (response.ok) {
                const data = await response.json();
                const agents = data.agents || [];
                
                // Add current user
                this.participants.set('user', {
                    id: 'user',
                    name: this.currentUser,
                    type: 'human',
                    avatar: '👤',
                    status: 'online'
                });
                
                // Add selected agents
                if (this.config?.selectedAgents) {
                    agents.forEach(agent => {
                        if (this.config.selectedAgents.includes(agent.id)) {
                            this.participants.set(agent.id, {
                                ...agent,
                                type: 'agent',
                                avatar: '🤖',
                                status: 'online'
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load participants:', error);
        }
    }

    render() {
        this.setContent(`
            <div class="shared-chat-container">
                <div class="shared-chat-header">
                    <div class="session-info">
                        <span class="session-name">${this.config?.title || 'Collaborative Session'}</span>
                        <span class="session-mode">${this.collaborationMode}</span>
                    </div>
                    <div class="participants-count">
                        <span class="participant-icon">👥</span>
                        <span class="count">${this.participants.size}</span>
                    </div>
                </div>
                
                <div class="shared-chat-body">
                    <div class="participants-sidebar">
                        <h4>Participants</h4>
                        <div class="participants-list" id="participants-${this.id}">
                            ${this.renderParticipants()}
                        </div>
                        <button class="btn small primary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').addParticipant()">
                            Add Participant
                        </button>
                    </div>
                    
                    <div class="chat-main-area">
                        <div class="shared-messages" id="shared-messages-${this.id}">
                            ${this.renderMessages()}
                        </div>
                        
                        <div class="shared-input-area">
                            ${this.renderInputArea()}
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Apply custom styles
        this.applyStyles();
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .shared-chat-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: #1f1f1f;
            }
            
            .shared-chat-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                background: #2a2a2a;
                border-bottom: 1px solid #444;
            }
            
            .session-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .session-name {
                font-weight: 500;
                color: #e0e0e0;
            }
            
            .session-mode {
                font-size: 12px;
                color: #999;
                text-transform: capitalize;
            }
            
            .participants-count {
                display: flex;
                align-items: center;
                gap: 5px;
                background: #333;
                padding: 5px 10px;
                border-radius: 15px;
            }
            
            .shared-chat-body {
                flex: 1;
                display: flex;
                overflow: hidden;
            }
            
            .participants-sidebar {
                width: 200px;
                background: #2a2a2a;
                border-right: 1px solid #444;
                padding: 15px;
                overflow-y: auto;
            }
            
            .participants-sidebar h4 {
                margin: 0 0 15px 0;
                color: #e0e0e0;
                font-size: 14px;
            }
            
            .participants-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 15px;
            }
            
            .participant-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #333;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .participant-item:hover {
                background: #3a3a3a;
            }
            
            .participant-item.typing {
                background: #3a3a3a;
                border: 1px solid #4299e1;
            }
            
            .participant-avatar {
                font-size: 20px;
            }
            
            .participant-info {
                flex: 1;
                overflow: hidden;
            }
            
            .participant-name {
                font-size: 13px;
                font-weight: 500;
                color: #e0e0e0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .participant-status {
                font-size: 11px;
                color: #999;
            }
            
            .status-indicator {
                width: 8px;
                height: 8px;
                background: #28a745;
                border-radius: 50%;
            }
            
            .status-indicator.offline {
                background: #666;
            }
            
            .status-indicator.typing {
                background: #4299e1;
                animation: pulse 1s infinite;
            }
            
            .chat-main-area {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .shared-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .shared-message {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                animation: slideIn 0.3s ease;
            }
            
            .shared-message.own-message {
                flex-direction: row-reverse;
            }
            
            .message-avatar {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .message-bubble {
                max-width: 70%;
                background: #2a2a2a;
                border-radius: 12px;
                padding: 10px 14px;
                border: 1px solid #444;
            }
            
            .shared-message.own-message .message-bubble {
                background: #0a84ff;
                border-color: #0a84ff;
            }
            
            .message-sender {
                font-size: 12px;
                font-weight: 500;
                margin-bottom: 4px;
                color: #999;
            }
            
            .shared-message.own-message .message-sender {
                color: rgba(255, 255, 255, 0.8);
            }
            
            .message-text {
                color: #e0e0e0;
                line-height: 1.4;
            }
            
            .shared-message.own-message .message-text {
                color: white;
            }
            
            .message-timestamp {
                font-size: 11px;
                color: #666;
                margin-top: 4px;
            }
            
            .shared-message.own-message .message-timestamp {
                color: rgba(255, 255, 255, 0.6);
            }
            
            .shared-input-area {
                padding: 15px;
                background: #2a2a2a;
                border-top: 1px solid #444;
            }
            
            .turn-indicator {
                text-align: center;
                padding: 8px;
                background: #333;
                border-radius: 6px;
                margin-bottom: 10px;
                font-size: 13px;
                color: #4299e1;
            }
            
            .input-wrapper {
                display: flex;
                gap: 10px;
                align-items: flex-end;
            }
            
            .input-wrapper textarea {
                flex: 1;
                background: #333;
                border: 1px solid #444;
                color: #fff;
                padding: 10px 14px;
                border-radius: 20px;
                resize: none;
                min-height: 40px;
                max-height: 120px;
                font-family: inherit;
            }
            
            .input-wrapper .send-btn {
                background: #0a84ff;
                border: none;
                color: white;
                padding: 10px;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .input-wrapper .send-btn:hover:not(:disabled) {
                background: #0056cc;
            }
            
            .input-wrapper .send-btn:disabled {
                background: #555;
                cursor: not-allowed;
            }
            
            .typing-indicators {
                display: flex;
                gap: 10px;
                padding: 5px 0;
                min-height: 20px;
            }
            
            .typing-indicator-item {
                font-size: 12px;
                color: #999;
                font-style: italic;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        
        if (this.element) {
            this.element.appendChild(style);
        }
    }

    renderParticipants() {
        if (this.participants.size === 0) {
            return '<p class="empty-state">No participants</p>';
        }
        
        return Array.from(this.participants.values()).map(participant => `
            <div class="participant-item" data-participant-id="${participant.id}">
                <span class="participant-avatar">${participant.avatar}</span>
                <div class="participant-info">
                    <div class="participant-name">${participant.name}</div>
                    <div class="participant-status">${participant.type}</div>
                </div>
                <div class="status-indicator ${participant.status}"></div>
            </div>
        `).join('');
    }

    renderMessages() {
        if (this.messages.length === 0) {
            return '<div class="empty-messages">No messages yet. Start the conversation!</div>';
        }
        
        return this.messages.map(msg => {
            const participant = this.participants.get(msg.senderId);
            const isOwnMessage = msg.senderId === 'user';
            
            return `
                <div class="shared-message ${isOwnMessage ? 'own-message' : ''}" data-message-id="${msg.id}">
                    <div class="message-avatar">${participant?.avatar || '👤'}</div>
                    <div class="message-bubble">
                        <div class="message-sender">${participant?.name || 'Unknown'}</div>
                        <div class="message-text">${this.formatMessage(msg.content)}</div>
                        <div class="message-timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderInputArea() {
        const isUserTurn = this.collaborationMode === 'turn-based' ? this.isCurrentUserTurn() : true;
        
        return `
            ${this.collaborationMode === 'turn-based' ? `
                <div class="turn-indicator">
                    ${isUserTurn ? 'Your turn to speak' : 'Waiting for others...'}
                </div>
            ` : ''}
            
            <div class="typing-indicators" id="typing-indicators-${this.id}">
                <!-- Typing indicators will appear here -->
            </div>
            
            <div class="input-wrapper">
                <textarea 
                    id="shared-input-${this.id}" 
                    placeholder="${isUserTurn ? 'Type your message...' : 'Wait for your turn...'}"
                    ${!isUserTurn ? 'disabled' : ''}
                    onkeydown="window.enhancedWidgetSystem.widgets.get('${this.id}').handleKeyDown(event)"
                    oninput="window.enhancedWidgetSystem.widgets.get('${this.id}').handleTyping()"
                ></textarea>
                <button 
                    class="send-btn" 
                    onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').sendMessage()"
                    ${!isUserTurn ? 'disabled' : ''}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                    </svg>
                </button>
            </div>
        `;
    }

    formatMessage(content) {
        // Escape HTML first
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Then apply formatting
        return escaped
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    setupEventHandlers() {
        // Auto-resize textarea
        const textarea = document.getElementById(`shared-input-${this.id}`);
        if (textarea) {
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            });
        }
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    handleTyping() {
        // Broadcast typing status
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'typing',
                sessionId: this.sessionId,
                participantId: 'user'
            }));
        }
        
        // Clear typing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Set new timeout
        this.typingTimeout = setTimeout(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'stop_typing',
                    sessionId: this.sessionId,
                    participantId: 'user'
                }));
            }
        }, 1000);
    }

    async sendMessage() {
        const input = document.getElementById(`shared-input-${this.id}`);
        const message = input.value.trim();
        
        if (!message) return;
        
        // Create message
        const msg = {
            id: `msg-${Date.now()}`,
            sessionId: this.sessionId,
            senderId: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        
        // Add to messages
        this.messages.push(msg);
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        
        // Update display
        this.updateMessagesDisplay();
        
        // Broadcast message
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'message',
                data: msg
            }));
        }
        
        // Save history
        this.saveChatHistory();
        
        // If turn-based, trigger next turn
        if (this.collaborationMode === 'turn-based') {
            this.nextTurn();
        }
        
        // Trigger agent responses if configured
        if (this.config?.autoRespond) {
            this.triggerAgentResponses(message);
        }
    }

    async triggerAgentResponses(userMessage) {
        // Get active agent participants
        const agents = Array.from(this.participants.values()).filter(p => p.type === 'agent');
        
        for (const agent of agents) {
            // Simulate agent thinking
            this.showAgentTyping(agent.id);
            
            try {
                // Call agent execute endpoint
                const response = await fetch('/api/agents/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentId: agent.id,
                        message: userMessage,
                        context: {
                            sessionId: this.sessionId,
                            previousMessages: this.messages.slice(-10), // Last 10 messages
                            participants: Array.from(this.participants.values())
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Add agent message
                    const agentMsg = {
                        id: `msg-${Date.now()}-${agent.id}`,
                        sessionId: this.sessionId,
                        senderId: agent.id,
                        content: data.message,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.messages.push(agentMsg);
                    this.updateMessagesDisplay();
                    
                    // Broadcast agent message
                    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                        this.websocket.send(JSON.stringify({
                            type: 'message',
                            data: agentMsg
                        }));
                    }
                }
            } catch (error) {
                console.error(`Error getting response from agent ${agent.name}:`, error);
            } finally {
                this.hideAgentTyping(agent.id);
            }
        }
        
        // Save updated history
        this.saveChatHistory();
    }

    showAgentTyping(agentId) {
        const participant = this.participants.get(agentId);
        if (!participant) return;
        
        // Update participant item
        const participantEl = this.element.querySelector(`[data-participant-id="${agentId}"]`);
        if (participantEl) {
            participantEl.classList.add('typing');
            const statusEl = participantEl.querySelector('.status-indicator');
            if (statusEl) {
                statusEl.classList.add('typing');
            }
        }
        
        // Add typing indicator
        const typingContainer = document.getElementById(`typing-indicators-${this.id}`);
        if (typingContainer) {
            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator-item';
            indicator.id = `typing-${agentId}`;
            indicator.textContent = `${participant.name} is typing...`;
            typingContainer.appendChild(indicator);
        }
    }

    hideAgentTyping(agentId) {
        // Update participant item
        const participantEl = this.element.querySelector(`[data-participant-id="${agentId}"]`);
        if (participantEl) {
            participantEl.classList.remove('typing');
            const statusEl = participantEl.querySelector('.status-indicator');
            if (statusEl) {
                statusEl.classList.remove('typing');
            }
        }
        
        // Remove typing indicator
        const indicator = document.getElementById(`typing-${agentId}`);
        if (indicator) {
            indicator.remove();
        }
    }

    updateMessagesDisplay() {
        const messagesContainer = document.getElementById(`shared-messages-${this.id}`);
        if (messagesContainer) {
            messagesContainer.innerHTML = this.renderMessages();
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    isCurrentUserTurn() {
        // Simple turn logic - alternates between user and agents
        const lastMessage = this.messages[this.messages.length - 1];
        return !lastMessage || lastMessage.senderId !== 'user';
    }

    nextTurn() {
        // Update turn state
        const inputArea = this.element.querySelector('.shared-input-area');
        if (inputArea) {
            inputArea.innerHTML = this.renderInputArea();
            this.setupEventHandlers();
        }
    }

    addParticipant() {
        // Show participant selection modal
        Utils.showInfo('Participant selection coming soon!');
    }

    loadChatHistory() {
        const saved = localStorage.getItem(`shared_chat_${this.sessionId}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.messages = data.messages || [];
                // Restore participants if saved
                if (data.participants) {
                    data.participants.forEach(p => {
                        this.participants.set(p.id, p);
                    });
                }
            } catch (e) {
                this.messages = [];
            }
        }
    }

    saveChatHistory() {
        const data = {
            messages: this.messages,
            participants: Array.from(this.participants.values()),
            sessionId: this.sessionId,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(`shared_chat_${this.sessionId}`, JSON.stringify(data));
    }

    setupWebSocket() {
        // WebSocket setup for real-time collaboration
        // This would connect to the collaboration engine
        console.log('WebSocket setup for shared chat:', this.sessionId);
    }

    async onDestroy() {
        // Cleanup
        if (this.websocket) {
            this.websocket.close();
        }
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Save final state
        this.saveChatHistory();
    }
}

// Register widget
window.SharedChatWidget = SharedChatWidget;