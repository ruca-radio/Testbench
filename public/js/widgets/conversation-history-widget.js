// Conversation History Widget - Enhanced conversation list and management
class ConversationHistoryWidget {
    constructor(id, config = {}) {
        this.id = id;
        this.config = config;
        this.title = config.title || 'Conversations';
        this.conversations = [];
        this.filteredConversations = [];
        this.currentWorkspace = null;
        this.searchTerm = '';
        this.sortBy = 'updated_at';
        this.sortOrder = 'desc';
    }

    getTitle() {
        return this.title;
    }

    getIcon() {
        return '📋';
    }

    render() {
        return `
            <div class="conversation-history-widget-content">
                <!-- Workspace Selector -->
                <div class="workspace-section">
                    <div class="workspace-header">
                        <h5>Workspace</h5>
                        <button class="btn tiny" onclick="ConversationHistoryWidget.createWorkspace('${this.id}')" title="New Workspace">+</button>
                    </div>
                    <select id="workspace-select-${this.id}" onchange="ConversationHistoryWidget.switchWorkspace('${this.id}')">
                        <option value="">Default Workspace</option>
                    </select>
                </div>

                <!-- Search and Filter -->
                <div class="search-section">
                    <div class="search-box">
                        <input type="text" id="conversation-search-${this.id}"
                               placeholder="Search conversations..."
                               oninput="ConversationHistoryWidget.searchConversations('${this.id}')"
                               onkeydown="ConversationHistoryWidget.handleSearchKeyDown(event, '${this.id}')">
                        <button class="search-clear" onclick="ConversationHistoryWidget.clearSearch('${this.id}')"
                                style="display: none;">×</button>
                    </div>
                    <div class="filter-controls">
                        <select id="sort-select-${this.id}" onchange="ConversationHistoryWidget.changeSorting('${this.id}')">
                            <option value="updated_at">Recent</option>
                            <option value="created_at">Created</option>
                            <option value="title">Title</option>
                            <option value="message_count">Messages</option>
                        </select>
                        <button class="btn tiny" onclick="ConversationHistoryWidget.toggleSortOrder('${this.id}')"
                                id="sort-order-btn-${this.id}" title="Sort Order">↓</button>
                    </div>
                </div>

                <!-- Conversation List -->
                <div class="conversations-section">
                    <div class="conversations-header">
                        <h5>Conversations</h5>
                        <div class="conversation-actions">
                            <button class="btn tiny primary" onclick="ConversationHistoryWidget.newConversation('${this.id}')" title="New Chat">💬</button>
                            <button class="btn tiny secondary" onclick="ConversationHistoryWidget.exportConversations('${this.id}')" title="Export">📤</button>
                        </div>
                    </div>
                    <div class="conversations-list" id="conversations-list-${this.id}">
                        ${this.renderExistingContent()}
                    </div>
                </div>

                <!-- Quick Stats -->
                <div class="stats-section">
                    <div class="stat-item">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value" id="total-conversations-${this.id}">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Today:</span>
                        <span class="stat-value" id="today-conversations-${this.id}">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Messages:</span>
                        <span class="stat-value" id="total-messages-${this.id}">0</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderExistingContent() {
        if (!this.config.existingContent) {
            return '<div class="empty-conversations">No conversations yet</div>';
        }

        return this.config.existingContent.map(el => el.outerHTML).join('');
    }

    onMounted(container) {
        this.container = container;
        this.loadWorkspaces();
        this.loadConversations();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auto-refresh conversations periodically
        this.refreshInterval = setInterval(() => {
            this.loadConversations();
        }, 30000); // 30 seconds
    }

    async loadWorkspaces() {
        try {
            const response = await fetch('/api/workspaces');
            if (response.ok) {
                const data = await response.json();
                this.updateWorkspaceSelect(data.workspaces || []);
            }
        } catch (error) {
            console.error('Error loading workspaces:', error);
        }
    }

    updateWorkspaceSelect(workspaces) {
        const select = document.getElementById(`workspace-select-${this.id}`);
        if (!select) return;

        select.innerHTML = '<option value="">Default Workspace</option>' +
            workspaces.map(ws =>
                `<option value="${ws.id}">${ws.name}</option>`
            ).join('');
    }

    async loadConversations() {
        try {
            const url = this.currentWorkspace
                ? `/api/conversations?workspace_id=${this.currentWorkspace}`
                : '/api/conversations';

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.conversations = data.conversations || [];
                this.filterAndSortConversations();
                this.renderConversations();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    filterAndSortConversations() {
        // Apply search filter
        this.filteredConversations = this.conversations.filter(conv => {
            if (!this.searchTerm) return true;
            const searchLower = this.searchTerm.toLowerCase();
            return (
                conv.title?.toLowerCase().includes(searchLower) ||
                conv.summary?.toLowerCase().includes(searchLower) ||
                conv.last_message?.toLowerCase().includes(searchLower)
            );
        });

        // Apply sorting
        this.filteredConversations.sort((a, b) => {
            let aVal, bVal;

            switch (this.sortBy) {
                case 'title':
                    aVal = a.title || 'Untitled';
                    bVal = b.title || 'Untitled';
                    break;
                case 'message_count':
                    aVal = a.message_count || 0;
                    bVal = b.message_count || 0;
                    break;
                case 'created_at':
                    aVal = new Date(a.created_at);
                    bVal = new Date(b.created_at);
                    break;
                default: // updated_at
                    aVal = new Date(a.updated_at || a.created_at);
                    bVal = new Date(b.updated_at || b.created_at);
            }

            if (this.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    renderConversations() {
        const listEl = document.getElementById(`conversations-list-${this.id}`);
        if (!listEl) return;

        if (this.filteredConversations.length === 0) {
            listEl.innerHTML = this.searchTerm
                ? '<div class="empty-conversations">No conversations match your search</div>'
                : '<div class="empty-conversations">No conversations yet</div>';
            return;
        }

        listEl.innerHTML = this.filteredConversations.map(conv => this.renderConversationItem(conv)).join('');
    }

    renderConversationItem(conv) {
        const updatedAt = new Date(conv.updated_at || conv.created_at);
        const isToday = this.isToday(updatedAt);
        const timeStr = isToday
            ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : updatedAt.toLocaleDateString();

        const title = conv.title || 'Untitled Conversation';
        const summary = conv.summary || conv.last_message || 'No messages';
        const messageCount = conv.message_count || 0;

        return `
            <div class="conversation-item" data-conversation-id="${conv.id}"
                 onclick="ConversationHistoryWidget.openConversation('${this.id}', '${conv.id}')">
                <div class="conversation-header">
                    <div class="conversation-title">${this.highlightSearchTerm(title)}</div>
                    <div class="conversation-time">${timeStr}</div>
                </div>
                <div class="conversation-summary">${this.highlightSearchTerm(this.truncateText(summary, 60))}</div>
                <div class="conversation-meta">
                    <span class="message-count">${messageCount} messages</span>
                    ${conv.agent_name ? `<span class="agent-name">${conv.agent_name}</span>` : ''}
                </div>
                <div class="conversation-actions" onclick="event.stopPropagation()">
                    <button class="btn micro" onclick="ConversationHistoryWidget.renameConversation('${this.id}', '${conv.id}')" title="Rename">✏️</button>
                    <button class="btn micro" onclick="ConversationHistoryWidget.duplicateConversation('${this.id}', '${conv.id}')" title="Duplicate">📋</button>
                    <button class="btn micro danger" onclick="ConversationHistoryWidget.deleteConversation('${this.id}', '${conv.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }

    highlightSearchTerm(text) {
        if (!this.searchTerm || !text) return text;
        const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    updateStats() {
        const totalEl = document.getElementById(`total-conversations-${this.id}`);
        const todayEl = document.getElementById(`today-conversations-${this.id}`);
        const messagesEl = document.getElementById(`total-messages-${this.id}`);

        if (totalEl) totalEl.textContent = this.conversations.length;

        if (todayEl) {
            const todayCount = this.conversations.filter(conv =>
                this.isToday(new Date(conv.created_at))
            ).length;
            todayEl.textContent = todayCount;
        }

        if (messagesEl) {
            const totalMessages = this.conversations.reduce((sum, conv) =>
                sum + (conv.message_count || 0), 0
            );
            messagesEl.textContent = totalMessages;
        }
    }

    // Static methods for UI interactions
    static switchWorkspace(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        const select = document.getElementById(`workspace-select-${widgetId}`);

        if (widget && select) {
            widget.currentWorkspace = select.value || null;
            widget.loadConversations();
        }
    }

    static searchConversations(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        const searchInput = document.getElementById(`conversation-search-${widgetId}`);
        const clearBtn = searchInput?.nextElementSibling;

        if (widget && searchInput) {
            widget.searchTerm = searchInput.value;
            widget.filterAndSortConversations();
            widget.renderConversations();

            // Show/hide clear button
            if (clearBtn) {
                clearBtn.style.display = widget.searchTerm ? 'block' : 'none';
            }
        }
    }

    static handleSearchKeyDown(event, widgetId) {
        if (event.key === 'Escape') {
            ConversationHistoryWidget.clearSearch(widgetId);
        }
    }

    static clearSearch(widgetId) {
        const searchInput = document.getElementById(`conversation-search-${widgetId}`);
        const clearBtn = searchInput?.nextElementSibling;

        if (searchInput) {
            searchInput.value = '';
            if (clearBtn) clearBtn.style.display = 'none';
            ConversationHistoryWidget.searchConversations(widgetId);
        }
    }

    static changeSorting(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        const select = document.getElementById(`sort-select-${widgetId}`);

        if (widget && select) {
            widget.sortBy = select.value;
            widget.filterAndSortConversations();
            widget.renderConversations();
        }
    }

    static toggleSortOrder(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        const btn = document.getElementById(`sort-order-btn-${widgetId}`);

        if (widget) {
            widget.sortOrder = widget.sortOrder === 'desc' ? 'asc' : 'desc';
            widget.filterAndSortConversations();
            widget.renderConversations();

            if (btn) {
                btn.textContent = widget.sortOrder === 'desc' ? '↓' : '↑';
                btn.title = `Sort ${widget.sortOrder === 'desc' ? 'Descending' : 'Ascending'}`;
            }
        }
    }

    static newConversation(widgetId) {
        // Trigger new conversation in main interface
        if (window.newConversation) {
            window.newConversation();
        } else {
            // Fallback: refresh the page or clear current conversation
            window.location.reload();
        }
    }

    static async createWorkspace(widgetId) {
        const name = prompt('Enter workspace name:');
        if (!name) return;

        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, description: `Workspace created from conversation widget` })
            });

            if (response.ok) {
                const widget = window.widgetSystem.widgets.get(widgetId);
                if (widget) {
                    await widget.loadWorkspaces();
                }
                Utils.showSuccess(`Workspace "${name}" created`);
            } else {
                throw new Error('Failed to create workspace');
            }
        } catch (error) {
            console.error('Error creating workspace:', error);
            Utils.showError('Failed to create workspace');
        }
    }

    static openConversation(widgetId, conversationId) {
        // Navigate to conversation in main interface
        if (window.loadConversation) {
            window.loadConversation(conversationId);
        } else {
            // Fallback: navigate with URL parameter
            const url = new URL(window.location);
            url.searchParams.set('conversation', conversationId);
            window.location.href = url.toString();
        }
    }

    static async renameConversation(widgetId, conversationId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        const conv = widget.conversations.find(c => c.id === conversationId);
        if (!conv) return;

        const newTitle = prompt('Enter new title:', conv.title || '');
        if (!newTitle) return;

        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });

            if (response.ok) {
                conv.title = newTitle;
                widget.renderConversations();
                Utils.showSuccess('Conversation renamed');
            } else {
                throw new Error('Failed to rename conversation');
            }
        } catch (error) {
            console.error('Error renaming conversation:', error);
            Utils.showError('Failed to rename conversation');
        }
    }

    static async duplicateConversation(widgetId, conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/duplicate`, {
                method: 'POST'
            });

            if (response.ok) {
                const widget = window.widgetSystem.widgets.get(widgetId);
                if (widget) {
                    await widget.loadConversations();
                }
                Utils.showSuccess('Conversation duplicated');
            } else {
                throw new Error('Failed to duplicate conversation');
            }
        } catch (error) {
            console.error('Error duplicating conversation:', error);
            Utils.showError('Failed to duplicate conversation');
        }
    }

    static async deleteConversation(widgetId, conversationId) {
        if (!confirm('Are you sure you want to delete this conversation?')) return;

        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const widget = window.widgetSystem.widgets.get(widgetId);
                if (widget) {
                    widget.conversations = widget.conversations.filter(c => c.id !== conversationId);
                    widget.filterAndSortConversations();
                    widget.renderConversations();
                    widget.updateStats();
                }
                Utils.showSuccess('Conversation deleted');
            } else {
                throw new Error('Failed to delete conversation');
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            Utils.showError('Failed to delete conversation');
        }
    }

    static async exportConversations(widgetId) {
        try {
            const widget = window.widgetSystem.widgets.get(widgetId);
            if (!widget) return;

            const response = await fetch('/api/conversations/export');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `conversations-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                Utils.showSuccess('Conversations exported');
            } else {
                throw new Error('Failed to export conversations');
            }
        } catch (error) {
            console.error('Error exporting conversations:', error);
            Utils.showError('Failed to export conversations');
        }
    }

    onDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Register the widget
if (window.widgetSystem) {
    window.widgetSystem.registerWidget('conversation-history-widget', ConversationHistoryWidget);
}
