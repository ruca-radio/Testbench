// Conversation Tools Widget for Focus Mode
class ConversationToolsWidget extends BaseWidget {
    constructor(id, config) {
        super(id, config);
        this.type = 'conversation-tools';
        this.tools = config.tools || ['export', 'branch', 'compress', 'analyze'];
        this.linkedChatWidget = null;
        this.stats = {
            totalMessages: 0,
            totalTokens: 0,
            conversationDuration: 0,
            topicsDiscussed: []
        };
    }

    render() {
        return `
            <div class="conversation-tools-widget" data-widget-id="${this.id}">
                <div class="tools-header">
                    <h3>${this.config.title}</h3>
                    <div class="tools-status" id="tools-status-${this.id}">Ready</div>
                </div>

                <div class="tools-content">
                    ${this.renderQuickActions()}
                    ${this.renderExportTools()}
                    ${this.renderAnalysisTools()}
                    ${this.renderConversationStats()}
                    ${this.renderTemplates()}
                </div>
            </div>
        `;
    }

    renderQuickActions() {
        return `
            <div class="tool-section">
                <h4>Quick Actions</h4>
                <div class="tool-buttons">
                    <button class="btn tool-btn" onclick="window.widgets['${this.id}'].createBranch()" title="Create new conversation branch">
                        🌿 New Branch
                    </button>
                    <button class="btn tool-btn" onclick="window.widgets['${this.id}'].compressConversation()" title="Compress conversation context">
                        🗜️ Compress
                    </button>
                    <button class="btn tool-btn" onclick="window.widgets['${this.id}'].analyzeConversation()" title="Analyze conversation">
                        📊 Analyze
                    </button>
                    <button class="btn tool-btn" onclick="window.widgets['${this.id}'].clearConversation()" title="Clear conversation">
                        🗑️ Clear
                    </button>
                </div>
            </div>
        `;
    }

    renderExportTools() {
        return `
            <div class="tool-section">
                <h4>Export Options</h4>
                <div class="export-tools">
                    <div class="export-format">
                        <select id="export-format-${this.id}" class="export-select">
                            <option value="markdown">📝 Markdown</option>
                            <option value="pdf">📄 PDF</option>
                            <option value="json">🔧 JSON</option>
                            <option value="txt">📋 Plain Text</option>
                            <option value="html">🌐 HTML</option>
                        </select>
                        <button class="btn primary" onclick="window.widgets['${this.id}'].exportConversation()">
                            📤 Export
                        </button>
                    </div>
                    <div class="export-options">
                        <label class="checkbox-label">
                            <input type="checkbox" id="include-metadata-${this.id}" checked>
                            Include metadata
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="include-timestamps-${this.id}" checked>
                            Include timestamps
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="all-branches-${this.id}">
                            Export all branches
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    renderAnalysisTools() {
        return `
            <div class="tool-section">
                <h4>Analysis Tools</h4>
                <div class="analysis-tools">
                    <button class="btn secondary analysis-btn" onclick="window.widgets['${this.id}'].analyzeSentiment()" title="Analyze conversation sentiment">
                        😊 Sentiment
                    </button>
                    <button class="btn secondary analysis-btn" onclick="window.widgets['${this.id}'].extractTopics()" title="Extract main topics">
                        🏷️ Topics
                    </button>
                    <button class="btn secondary analysis-btn" onclick="window.widgets['${this.id}'].generateSummary()" title="Generate conversation summary">
                        📋 Summary
                    </button>
                    <button class="btn secondary analysis-btn" onclick="window.widgets['${this.id}'].findKeyPoints()" title="Find key points">
                        🎯 Key Points
                    </button>
                </div>
                <div class="analysis-results" id="analysis-results-${this.id}" style="display: none;">
                    <!-- Analysis results will be shown here -->
                </div>
            </div>
        `;
    }

    renderConversationStats() {
        return `
            <div class="tool-section">
                <h4>Conversation Stats</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value" id="msg-count-${this.id}">${this.stats.totalMessages}</div>
                        <div class="stat-label">Messages</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="token-count-${this.id}">${this.stats.totalTokens}</div>
                        <div class="stat-label">Tokens</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="duration-${this.id}">${this.formatDuration(this.stats.conversationDuration)}</div>
                        <div class="stat-label">Duration</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="topics-count-${this.id}">${this.stats.topicsDiscussed.length}</div>
                        <div class="stat-label">Topics</div>
                    </div>
                </div>
                <button class="btn small" onclick="window.widgets['${this.id}'].refreshStats()">🔄 Refresh</button>
            </div>
        `;
    }

    renderTemplates() {
        return `
            <div class="tool-section">
                <h4>Quick Templates</h4>
                <div class="template-buttons">
                    <button class="btn template-btn" onclick="window.widgets['${this.id}'].insertTemplate('brainstorm')" title="Start a brainstorming session">
                        💡 Brainstorm
                    </button>
                    <button class="btn template-btn" onclick="window.widgets['${this.id}'].insertTemplate('explain')" title="Ask for explanation">
                        📚 Explain
                    </button>
                    <button class="btn template-btn" onclick="window.widgets['${this.id}'].insertTemplate('problem-solve')" title="Problem-solving template">
                        🔧 Problem Solve
                    </button>
                    <button class="btn template-btn" onclick="window.widgets['${this.id}'].insertTemplate('creative')" title="Creative writing prompt">
                        🎨 Creative
                    </button>
                </div>
            </div>
        `;
    }

    // Link to the focused chat widget
    linkToChatWidget(chatWidgetId) {
        this.linkedChatWidget = chatWidgetId;
        this.refreshStats();
    }

    getChatWidget() {
        if (this.linkedChatWidget && window.widgets[this.linkedChatWidget]) {
            return window.widgets[this.linkedChatWidget];
        }
        
        // Try to find focused-chat widget in the same workspace
        const workspace = WorkspaceManager.getCurrentWorkspace();
        if (workspace?.layout?.widgets) {
            for (const widget of workspace.layout.widgets) {
                if (widget.type === 'focused-chat' && window.widgets[widget.id]) {
                    this.linkedChatWidget = widget.id;
                    return window.widgets[widget.id];
                }
            }
        }
        return null;
    }

    createBranch() {
        const chatWidget = this.getChatWidget();
        if (chatWidget && typeof chatWidget.createBranch === 'function') {
            chatWidget.createBranch();
            this.updateStatus('Branch created');
        } else {
            this.updateStatus('No chat widget found');
        }
    }

    compressConversation() {
        const chatWidget = this.getChatWidget();
        if (chatWidget && typeof chatWidget.compressContext === 'function') {
            chatWidget.compressContext();
            this.updateStatus('Compressing conversation...');
        } else {
            this.updateStatus('No chat widget found');
        }
    }

    clearConversation() {
        const chatWidget = this.getChatWidget();
        if (chatWidget && typeof chatWidget.clearConversation === 'function') {
            chatWidget.clearConversation();
            this.updateStatus('Conversation cleared');
            this.refreshStats();
        } else {
            this.updateStatus('No chat widget found');
        }
    }

    async exportConversation() {
        const chatWidget = this.getChatWidget();
        if (!chatWidget) {
            this.updateStatus('No chat widget found');
            return;
        }

        const format = document.getElementById(`export-format-${this.id}`).value;
        const includeMetadata = document.getElementById(`include-metadata-${this.id}`).checked;
        const includeTimestamps = document.getElementById(`include-timestamps-${this.id}`).checked;
        const allBranches = document.getElementById(`all-branches-${this.id}`).checked;

        this.updateStatus('Exporting...');

        try {
            const exportData = this.prepareExportData(chatWidget, {
                includeMetadata,
                includeTimestamps,
                allBranches
            });

            let exportContent;
            let filename;
            let mimeType;

            switch (format) {
                case 'markdown':
                    exportContent = this.formatAsMarkdown(exportData);
                    filename = `conversation-${Date.now()}.md`;
                    mimeType = 'text/markdown';
                    break;
                case 'json':
                    exportContent = JSON.stringify(exportData, null, 2);
                    filename = `conversation-${Date.now()}.json`;
                    mimeType = 'application/json';
                    break;
                case 'txt':
                    exportContent = this.formatAsText(exportData);
                    filename = `conversation-${Date.now()}.txt`;
                    mimeType = 'text/plain';
                    break;
                case 'html':
                    exportContent = this.formatAsHTML(exportData);
                    filename = `conversation-${Date.now()}.html`;
                    mimeType = 'text/html';
                    break;
                case 'pdf':
                    await this.exportAsPDF(exportData);
                    this.updateStatus('PDF exported');
                    return;
            }

            // Download file
            this.downloadFile(exportContent, filename, mimeType);
            this.updateStatus('Export completed');

        } catch (error) {
            console.error('Export error:', error);
            this.updateStatus('Export failed');
        }
    }

    prepareExportData(chatWidget, options) {
        const data = {
            title: `Focus Mode Conversation - ${new Date().toLocaleDateString()}`,
            created: new Date().toISOString(),
            options: options
        };

        if (options.allBranches) {
            data.branches = {};
            for (const [branchName, messages] of chatWidget.conversationBranches) {
                data.branches[branchName] = this.processMessages(messages, options);
            }
        } else {
            data.messages = this.processMessages(chatWidget.getCurrentMessages(), options);
            data.currentBranch = chatWidget.currentBranch;
        }

        return data;
    }

    processMessages(messages, options) {
        return messages.map(msg => {
            const processed = {
                role: msg.role,
                content: msg.content
            };

            if (options.includeTimestamps && msg.timestamp) {
                processed.timestamp = msg.timestamp;
            }

            if (options.includeMetadata && msg.metadata) {
                processed.metadata = msg.metadata;
            }

            return processed;
        });
    }

    formatAsMarkdown(data) {
        let md = `# ${data.title}\n\n`;
        md += `**Created:** ${new Date(data.created).toLocaleString()}\n\n`;

        if (data.branches) {
            for (const [branchName, messages] of Object.entries(data.branches)) {
                md += `## Branch: ${branchName}\n\n`;
                md += this.messagesToMarkdown(messages);
                md += '\n---\n\n';
            }
        } else {
            if (data.currentBranch) {
                md += `**Branch:** ${data.currentBranch}\n\n`;
            }
            md += this.messagesToMarkdown(data.messages);
        }

        return md;
    }

    messagesToMarkdown(messages) {
        return messages.map(msg => {
            let content = `### ${msg.role === 'user' ? 'User' : 'Assistant'}\n\n`;
            if (msg.timestamp) {
                content += `*${new Date(msg.timestamp).toLocaleString()}*\n\n`;
            }
            content += `${msg.content}\n\n`;
            return content;
        }).join('');
    }

    formatAsText(data) {
        let txt = `${data.title}\n`;
        txt += `Created: ${new Date(data.created).toLocaleString()}\n`;
        txt += '='.repeat(50) + '\n\n';

        if (data.branches) {
            for (const [branchName, messages] of Object.entries(data.branches)) {
                txt += `Branch: ${branchName}\n`;
                txt += '-'.repeat(20) + '\n\n';
                txt += this.messagesToText(messages);
                txt += '\n' + '='.repeat(50) + '\n\n';
            }
        } else {
            if (data.currentBranch) {
                txt += `Branch: ${data.currentBranch}\n\n`;
            }
            txt += this.messagesToText(data.messages);
        }

        return txt;
    }

    messagesToText(messages) {
        return messages.map(msg => {
            let content = `${msg.role.toUpperCase()}:`;
            if (msg.timestamp) {
                content += ` [${new Date(msg.timestamp).toLocaleString()}]`;
            }
            content += `\n${msg.content}\n\n`;
            return content;
        }).join('');
    }

    formatAsHTML(data) {
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${data.title}</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
                    .user { background-color: #e3f2fd; }
                    .assistant { background-color: #f3e5f5; }
                    .timestamp { color: #666; font-size: 0.9em; }
                    .branch { border-top: 2px solid #ddd; margin-top: 30px; padding-top: 20px; }
                    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <h1>${data.title}</h1>
                <p><strong>Created:</strong> ${new Date(data.created).toLocaleString()}</p>
        `;

        if (data.branches) {
            for (const [branchName, messages] of Object.entries(data.branches)) {
                html += `<div class="branch"><h2>Branch: ${branchName}</h2>`;
                html += this.messagesToHTML(messages);
                html += '</div>';
            }
        } else {
            if (data.currentBranch) {
                html += `<p><strong>Branch:</strong> ${data.currentBranch}</p>`;
            }
            html += this.messagesToHTML(data.messages);
        }

        html += '</body></html>';
        return html;
    }

    messagesToHTML(messages) {
        return messages.map(msg => {
            let content = `<div class="message ${msg.role}">`;
            content += `<h3>${msg.role === 'user' ? 'User' : 'Assistant'}</h3>`;
            if (msg.timestamp) {
                content += `<div class="timestamp">${new Date(msg.timestamp).toLocaleString()}</div>`;
            }
            content += `<div class="content">${msg.content.replace(/\n/g, '<br>')}</div>`;
            content += '</div>';
            return content;
        }).join('');
    }

    async exportAsPDF(data) {
        // For PDF export, we'll send the data to the server to generate PDF
        try {
            const response = await fetch('/api/focus/export/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const blob = await response.blob();
                this.downloadFile(blob, `conversation-${Date.now()}.pdf`, 'application/pdf');
            } else {
                throw new Error('PDF generation failed');
            }
        } catch (error) {
            console.error('PDF export error:', error);
            // Fallback to HTML export
            const htmlContent = this.formatAsHTML(data);
            this.downloadFile(htmlContent, `conversation-${Date.now()}.html`, 'text/html');
        }
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async analyzeConversation() {
        const chatWidget = this.getChatWidget();
        if (!chatWidget) {
            this.updateStatus('No chat widget found');
            return;
        }

        const messages = chatWidget.getCurrentMessages();
        if (messages.length === 0) {
            this.updateStatus('No messages to analyze');
            return;
        }

        this.updateStatus('Analyzing conversation...');
        this.showAnalysisResults('Running comprehensive analysis...');

        try {
            const analysisPrompt = `Analyze this conversation and provide insights on:
1. Main topics discussed
2. Conversation sentiment
3. Key points and decisions
4. Areas that need follow-up
5. Overall conversation quality

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;

            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: analysisPrompt }],
                    model: 'gpt-4o',
                    provider: 'openai'
                })
            });

            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content || 'Analysis failed';
            
            this.showAnalysisResults(analysis);
            this.updateStatus('Analysis completed');

        } catch (error) {
            console.error('Analysis error:', error);
            this.updateStatus('Analysis failed');
            this.showAnalysisResults('Failed to analyze conversation');
        }
    }

    async analyzeSentiment() {
        await this.runAnalysis('sentiment', 'Analyze the sentiment of this conversation. Provide an overall sentiment score and identify emotional patterns.');
    }

    async extractTopics() {
        await this.runAnalysis('topics', 'Extract and list the main topics discussed in this conversation. Organize them by importance and frequency.');
    }

    async generateSummary() {
        await this.runAnalysis('summary', 'Create a concise summary of this conversation, highlighting key points, decisions, and outcomes.');
    }

    async findKeyPoints() {
        await this.runAnalysis('keypoints', 'Identify and list the key points, important insights, and actionable items from this conversation.');
    }

    async runAnalysis(type, prompt) {
        const chatWidget = this.getChatWidget();
        if (!chatWidget) {
            this.updateStatus('No chat widget found');
            return;
        }

        const messages = chatWidget.getCurrentMessages();
        if (messages.length === 0) {
            this.updateStatus('No messages to analyze');
            return;
        }

        this.updateStatus(`Running ${type} analysis...`);
        this.showAnalysisResults(`Analyzing ${type}...`);

        try {
            const fullPrompt = `${prompt}\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;

            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: fullPrompt }],
                    model: 'gpt-4o',
                    provider: 'openai'
                })
            });

            const data = await response.json();
            const result = data.choices?.[0]?.message?.content || 'Analysis failed';
            
            this.showAnalysisResults(result);
            this.updateStatus(`${type} analysis completed`);

        } catch (error) {
            console.error(`${type} analysis error:`, error);
            this.updateStatus(`${type} analysis failed`);
            this.showAnalysisResults(`Failed to run ${type} analysis`);
        }
    }

    showAnalysisResults(content) {
        const resultsEl = document.getElementById(`analysis-results-${this.id}`);
        if (resultsEl) {
            resultsEl.style.display = 'block';
            resultsEl.innerHTML = `
                <div class="analysis-content">
                    <div class="analysis-header">
                        <h5>Analysis Results</h5>
                        <button class="btn tiny" onclick="this.parentElement.parentElement.parentElement.style.display='none'">✕</button>
                    </div>
                    <div class="analysis-text">${content.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }
    }

    insertTemplate(templateType) {
        const templates = {
            brainstorm: "Let's brainstorm ideas about [topic]. Please help me explore different angles and creative solutions.",
            explain: "Can you explain [concept/topic] in detail? I'd like to understand the key principles and practical applications.",
            'problem-solve': "I'm facing a challenge with [describe problem]. Can you help me break it down and find potential solutions?",
            creative: "I need help with creative writing about [theme/topic]. Can you provide inspiration and help develop ideas?"
        };

        const template = templates[templateType];
        if (template) {
            // Try to insert into the linked chat widget
            const chatWidget = this.getChatWidget();
            if (chatWidget) {
                const inputElement = document.getElementById(`input-${chatWidget.id}`);
                if (inputElement) {
                    inputElement.value = template;
                    inputElement.focus();
                    this.updateStatus(`${templateType} template inserted`);
                }
            } else {
                // Copy to clipboard as fallback
                navigator.clipboard.writeText(template);
                this.updateStatus(`${templateType} template copied to clipboard`);
            }
        }
    }

    refreshStats() {
        const chatWidget = this.getChatWidget();
        if (!chatWidget) return;

        const messages = chatWidget.getCurrentMessages();
        this.stats.totalMessages = messages.length;
        
        // Estimate tokens
        this.stats.totalTokens = messages.reduce((total, msg) => {
            return total + Math.ceil(msg.content.length / 4);
        }, 0);

        // Calculate duration
        if (messages.length > 1) {
            const first = new Date(messages[0].timestamp);
            const last = new Date(messages[messages.length - 1].timestamp);
            this.stats.conversationDuration = last - first;
        }

        // Update display
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const elements = {
            [`msg-count-${this.id}`]: this.stats.totalMessages,
            [`token-count-${this.id}`]: this.stats.totalTokens,
            [`duration-${this.id}`]: this.formatDuration(this.stats.conversationDuration),
            [`topics-count-${this.id}`]: this.stats.topicsDiscussed.length
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    }

    formatDuration(ms) {
        if (!ms) return '0m';
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }

    updateStatus(status) {
        const statusEl = document.getElementById(`tools-status-${this.id}`);
        if (statusEl) {
            statusEl.textContent = status;
            setTimeout(() => {
                if (statusEl.textContent === status) {
                    statusEl.textContent = 'Ready';
                }
            }, 3000);
        }
    }

    // Auto-link to chat widget when both widgets are present
    onMount() {
        super.onMount();
        
        // Auto-detect and link to focused chat widget
        setTimeout(() => {
            const chatWidget = this.getChatWidget();
            if (chatWidget) {
                this.linkToChatWidget(chatWidget.id);
            }
        }, 1000);

        // Refresh stats periodically
        this.statsInterval = setInterval(() => {
            this.refreshStats();
        }, 30000); // Every 30 seconds
    }

    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        super.destroy();
    }
}

// Register the widget
if (typeof WidgetFactory !== 'undefined') {
    WidgetFactory.registerWidget('conversation-tools', ConversationToolsWidget);
}

window.ConversationToolsWidget = ConversationToolsWidget;