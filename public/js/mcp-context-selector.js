/**
 * MCP Context Selector
 * Provides UI for selecting MCP resources to include in chat context
 */
class MCPContextSelector {
    static init() {
        this.selectedResources = [];
        this.createUI();
        this.setupEventListeners();
        console.log('MCPContextSelector initialized');
    }

    /**
     * Create the UI elements
     */
    static createUI() {
        // Create the context selector button in the chat input area
        const chatInputWrapper = document.querySelector('.chat-input-wrapper');
        if (!chatInputWrapper) return;

        const contextButton = document.createElement('button');
        contextButton.id = 'mcp-context-button';
        contextButton.className = 'mcp-context-button';
        contextButton.title = 'Add MCP Context';
        contextButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v4h4v2h-4v4h-2v-4H7v-2h4z"/>
            </svg>
        `;

        // Insert before the send button
        const sendButton = chatInputWrapper.querySelector('.send-button');
        if (sendButton) {
            chatInputWrapper.insertBefore(contextButton, sendButton);
        } else {
            chatInputWrapper.appendChild(contextButton);
        }

        // Create the context selector modal
        const modalHTML = `
        <div id="mcp-context-modal" class="modal mcp-context-modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Select MCP Context</h2>
                    <button class="modal-close" onclick="MCPContextSelector.close()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="server-selector">
                        <label for="mcp-server-select">MCP Server:</label>
                        <select id="mcp-server-select" onchange="MCPContextSelector.loadServerResources()">
                            <option value="">Select a server</option>
                        </select>
                    </div>
                    
                    <div class="resource-list" id="mcp-resource-list">
                        <p class="empty-state">Select a server to view available resources</p>
                    </div>
                    
                    <div class="selected-resources">
                        <h3>Selected Resources</h3>
                        <div id="selected-resources-list" class="selected-resources-list">
                            <p class="empty-state">No resources selected</p>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn secondary" onclick="MCPContextSelector.close()">Cancel</button>
                    <button class="btn primary" onclick="MCPContextSelector.applyContext()">Apply Context</button>
                </div>
            </div>
        </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add styles if not already in CSS
        if (!document.getElementById('mcp-context-styles')) {
            const styles = document.createElement('style');
            styles.id = 'mcp-context-styles';
            styles.textContent = `
                .mcp-context-button {
                    background: none;
                    border: none;
                    color: var(--text-color);
                    cursor: pointer;
                    padding: 5px;
                    margin-right: 5px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }
                
                .mcp-context-button:hover {
                    background-color: var(--hover-color);
                }
                
                .mcp-context-button.active {
                    color: var(--primary-color);
                }
                
                .mcp-context-modal .modal-content {
                    max-width: 600px;
                }
                
                .server-selector {
                    margin-bottom: 20px;
                }
                
                .resource-list {
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 10px;
                    margin-bottom: 20px;
                }
                
                .resource-item {
                    display: flex;
                    align-items: center;
                    padding: 8px;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .resource-item:last-child {
                    border-bottom: none;
                }
                
                .resource-item input[type="checkbox"] {
                    margin-right: 10px;
                }
                
                .selected-resources {
                    margin-top: 20px;
                }
                
                .selected-resources-list {
                    max-height: 150px;
                    overflow-y: auto;
                }
                
                .selected-resource {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    background-color: var(--bg-secondary);
                    border-radius: 4px;
                    margin-bottom: 5px;
                }
                
                .selected-resource button {
                    background: none;
                    border: none;
                    color: var(--text-color);
                    cursor: pointer;
                }
                
                .empty-state {
                    color: var(--text-secondary);
                    text-align: center;
                    padding: 20px;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    /**
     * Set up event listeners
     */
    static setupEventListeners() {
        // Context button click
        const contextButton = document.getElementById('mcp-context-button');
        if (contextButton) {
            contextButton.addEventListener('click', () => this.open());
        }

        // Modal close on background click
        const modal = document.getElementById('mcp-context-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close();
                }
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('mcp-context-modal');
                if (modal && modal.style.display !== 'none') {
                    this.close();
                }
            }
        });
    }

    /**
     * Open the context selector modal
     */
    static open() {
        const modal = document.getElementById('mcp-context-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Load servers
            this.loadServers();
            
            // Update selected resources list
            this.updateSelectedResourcesList();
        }
    }

    /**
     * Close the context selector modal
     */
    static close() {
        const modal = document.getElementById('mcp-context-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Load available MCP servers
     */
    static async loadServers() {
        try {
            const response = await fetch('/api/mcp/servers');
            if (response.ok) {
                const data = await response.json();
                const servers = data.servers || [];
                
                // Populate server select
                const serverSelect = document.getElementById('mcp-server-select');
                if (serverSelect) {
                    // Save current selection
                    const currentValue = serverSelect.value;
                    
                    // Clear options except the first one
                    while (serverSelect.options.length > 1) {
                        serverSelect.remove(1);
                    }
                    
                    // Add server options
                    servers.forEach(server => {
                        const option = document.createElement('option');
                        option.value = server.name;
                        option.textContent = server.displayName || server.name;
                        serverSelect.appendChild(option);
                    });
                    
                    // Restore selection if possible
                    if (currentValue) {
                        serverSelect.value = currentValue;
                    }
                    
                    // Load resources if a server is selected
                    if (serverSelect.value) {
                        this.loadServerResources();
                    }
                }
            }
        } catch (error) {
            console.error('Error loading MCP servers:', error);
        }
    }

    /**
     * Load resources for the selected server
     */
    static async loadServerResources() {
        const serverSelect = document.getElementById('mcp-server-select');
        const resourceList = document.getElementById('mcp-resource-list');
        
        if (!serverSelect || !resourceList) return;
        
        const serverName = serverSelect.value;
        if (!serverName) {
            resourceList.innerHTML = '<p class="empty-state">Select a server to view available resources</p>';
            return;
        }
        
        try {
            // Show loading state
            resourceList.innerHTML = '<p class="empty-state">Loading resources...</p>';
            
            const response = await fetch(`/api/mcp/servers/${serverName}/resources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config: {} })
            });
            
            if (response.ok) {
                const data = await response.json();
                const resources = data.resources || [];
                
                if (resources.length === 0) {
                    resourceList.innerHTML = '<p class="empty-state">No resources available</p>';
                    return;
                }
                
                // Build resource list
                let html = '';
                resources.forEach(resource => {
                    const isSelected = this.selectedResources.some(r => 
                        r.server === serverName && r.uri === resource.uri);
                    
                    html += `
                    <div class="resource-item">
                        <input type="checkbox" id="resource-${serverName}-${resource.uri}" 
                               data-server="${serverName}" data-uri="${resource.uri}"
                               ${isSelected ? 'checked' : ''}
                               onchange="MCPContextSelector.toggleResource(this)">
                        <label for="resource-${serverName}-${resource.uri}">
                            <strong>${resource.displayName || resource.uri}</strong>
                            <div class="resource-description">${resource.description || ''}</div>
                        </label>
                    </div>
                    `;
                });
                
                resourceList.innerHTML = html;
            } else {
                const error = await response.json();
                resourceList.innerHTML = `<p class="empty-state">Error: ${error.error || 'Failed to load resources'}</p>`;
            }
        } catch (error) {
            console.error('Error loading server resources:', error);
            resourceList.innerHTML = `<p class="empty-state">Error: ${error.message}</p>`;
        }
    }

    /**
     * Toggle a resource selection
     * @param {HTMLElement} checkbox - The checkbox element
     */
    static toggleResource(checkbox) {
        const server = checkbox.dataset.server;
        const uri = checkbox.dataset.uri;
        
        if (checkbox.checked) {
            // Add to selected resources
            this.selectedResources.push({
                server,
                uri,
                displayName: checkbox.nextElementSibling.querySelector('strong').textContent
            });
        } else {
            // Remove from selected resources
            this.selectedResources = this.selectedResources.filter(r => 
                !(r.server === server && r.uri === uri));
        }
        
        // Update selected resources list
        this.updateSelectedResourcesList();
    }

    /**
     * Update the selected resources list
     */
    static updateSelectedResourcesList() {
        const selectedList = document.getElementById('selected-resources-list');
        if (!selectedList) return;
        
        if (this.selectedResources.length === 0) {
            selectedList.innerHTML = '<p class="empty-state">No resources selected</p>';
            return;
        }
        
        let html = '';
        this.selectedResources.forEach(resource => {
            html += `
            <div class="selected-resource">
                <span>${resource.displayName || `${resource.server}://${resource.uri}`}</span>
                <button onclick="MCPContextSelector.removeResource('${resource.server}', '${resource.uri}')">
                    &times;
                </button>
            </div>
            `;
        });
        
        selectedList.innerHTML = html;
    }

    /**
     * Remove a resource from the selected list
     * @param {string} server - Server name
     * @param {string} uri - Resource URI
     */
    static removeResource(server, uri) {
        // Remove from selected resources
        this.selectedResources = this.selectedResources.filter(r => 
            !(r.server === server && r.uri === uri));
        
        // Update checkbox if visible
        const checkbox = document.getElementById(`resource-${server}-${uri}`);
        if (checkbox) {
            checkbox.checked = false;
        }
        
        // Update selected resources list
        this.updateSelectedResourcesList();
    }

    /**
     * Apply the selected context to the chat
     */
    static applyContext() {
        // Clear existing context
        app.clearMCPContext();
        
        // Add selected resources
        this.selectedResources.forEach(resource => {
            app.addMCPContext(resource.server, resource.uri);
        });
        
        // Update button state
        this.updateContextButton();
        
        // Close modal
        this.close();
        
        // Show notification
        if (this.selectedResources.length > 0) {
            Utils.showSuccess(`Added ${this.selectedResources.length} resources to chat context`);
        }
    }

    /**
     * Update the context button state
     */
    static updateContextButton() {
        const contextButton = document.getElementById('mcp-context-button');
        if (contextButton) {
            const mcpContext = app.getMCPContext();
            if (mcpContext.length > 0) {
                contextButton.classList.add('active');
                contextButton.setAttribute('data-count', mcpContext.length);
            } else {
                contextButton.classList.remove('active');
                contextButton.removeAttribute('data-count');
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    MCPContextSelector.init();
});