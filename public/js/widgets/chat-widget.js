// Chat Widget - Main chat interface widget
class ChatWidget {
    constructor(id, config = {}) {
        this.id = id;
        this.config = config;
        this.title = config.title || 'Chat';
        this.messages = [];
        this.currentModel = null;
        this.isStreaming = false;
    }

    getTitle() {
        return this.title;
    }

    getIcon() {
        return '💬';
    }

    render() {
        return `
            <div class="chat-widget-content">
                <!-- Model Selection -->
                <div class="chat-model-selector">
                    <select id="chat-model-select-${this.id}" onchange="ChatWidget.changeModel('${this.id}')">
                        <option value="">Select Model...</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                    </select>
                </div>

                <!-- Chat Messages -->
                <div class="chat-messages" id="chat-messages-${this.id}">
                    ${this.renderExistingContent()}
                </div>

                <!-- Chat Input -->
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea id="chat-input-${this.id}"
                                placeholder="Type your message..."
                                rows="3"
                                onkeydown="ChatWidget.handleKeyDown(event, '${this.id}')"
                                oninput="ChatWidget.adjustTextareaHeight(this)"></textarea>
                        <button class="chat-send-btn" onclick="ChatWidget.sendMessage('${this.id}')" id="send-btn-${this.id}">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="chat-status" id="chat-status-${this.id}"></div>
                </div>
            </div>
        `;
    }

    renderExistingContent() {
        if (!this.config.existingContent) {
            return '<div class="welcome-message">Welcome! Select a model and start chatting.</div>';
        }

        // Extract existing chat content
        return this.config.existingContent.map(el => el.outerHTML).join('');
    }

    onMounted(container) {
        this.container = container;
        this.setupEventListeners();
        this.loadSavedMessages();
        this.adjustTextareaHeight(document.getElementById(`chat-input-${this.id}`));
    }

    setupEventListeners() {
        // Auto-resize textarea
        const textarea = document.getElementById(`chat-input-${this.id}`);
        if (textarea) {
            textarea.addEventListener('input', () => this.adjustTextareaHeight(textarea));
        }
    }

    static adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    static handleKeyDown(event, widgetId) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            ChatWidget.sendMessage(widgetId);
        }
    }

    static changeModel(widgetId) {
        const select = document.getElementById(`chat-model-select-${widgetId}`);
        const widget = window.widgetSystem.widgets.get(widgetId);

        if (widget && select) {
            widget.currentModel = select.value;
            ChatWidget.updateStatus(widgetId, `Model changed to ${select.value}`);
        }
    }

    static async sendMessage(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        const input = document.getElementById(`chat-input-${widgetId}`);
        const sendBtn = document.getElementById(`send-btn-${widgetId}`);

        if (!widget || !input || !input.value.trim()) return;

        if (!widget.currentModel) {
            ChatWidget.updateStatus(widgetId, 'Please select a model first', 'error');
            return;
        }

        const message = input.value.trim();
        input.value = '';
        ChatWidget.adjustTextareaHeight(input);

        // Add user message
        ChatWidget.addMessage(widgetId, 'user', message);

        // Show loading state
        sendBtn.disabled = true;
        widget.isStreaming = true;
        ChatWidget.updateStatus(widgetId, 'Sending message...');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    model: widget.currentModel,
                    conversation_id: widget.conversationId || null
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Update conversation ID
                if (data.conversation_id) {
                    widget.conversationId = data.conversation_id;
                }

                // Add assistant response
                ChatWidget.addMessage(widgetId, 'assistant', data.response);
                ChatWidget.updateStatus(widgetId, 'Message sent successfully', 'success');

                // Save conversation
                widget.saveMessages();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            ChatWidget.addMessage(widgetId, 'error', `Error: ${error.message}`);
            ChatWidget.updateStatus(widgetId, 'Failed to send message', 'error');
        } finally {
            sendBtn.disabled = false;
            widget.isStreaming = false;
            setTimeout(() => ChatWidget.updateStatus(widgetId, ''), 3000);
        }
    }

    static addMessage(widgetId, sender, content) {
        const messagesContainer = document.getElementById(`chat-messages-${widgetId}`);
        const widget = window.widgetSystem.widgets.get(widgetId);

        if (!messagesContainer || !widget) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;

        const timestamp = new Date().toLocaleTimeString();

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${sender.charAt(0).toUpperCase() + sender.slice(1)}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">
                ${ChatWidget.formatMessage(content, sender)}
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store message
        widget.messages.push({
            sender: sender,
            content: content,
            timestamp: Date.now()
        });
    }

    static formatMessage(content, sender) {
        if (sender === 'error') {
            return `<div class="error-message">${content}</div>`;
        }

        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    static updateStatus(widgetId, message, type = '') {
        const statusEl = document.getElementById(`chat-status-${widgetId}`);
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `chat-status ${type}`;
        }
    }

    loadSavedMessages() {
        try {
            const saved = localStorage.getItem(`chat-widget-${this.id}-messages`);
            if (saved) {
                this.messages = JSON.parse(saved);
                this.renderSavedMessages();
            }
        } catch (error) {
            console.error('Error loading saved messages:', error);
        }
    }

    renderSavedMessages() {
        const messagesContainer = document.getElementById(`chat-messages-${this.id}`);
        if (!messagesContainer) return;

        this.messages.forEach(msg => {
            ChatWidget.addMessage(this.id, msg.sender, msg.content);
        });
    }

    saveMessages() {
        try {
            localStorage.setItem(`chat-widget-${this.id}-messages`, JSON.stringify(this.messages));
        } catch (error) {
            console.error('Error saving messages:', error);
        }
    }

    onDestroy() {
        this.saveMessages();
    }
}

// Register the widget
if (window.widgetSystem) {
    window.widgetSystem.registerWidget('chat-widget', ChatWidget);
}
