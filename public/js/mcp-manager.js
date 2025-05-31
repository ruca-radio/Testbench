/**
 * MCP Context Selector
 * Handles MCP resource selection in chat interface
 */
class MCPManager {
    static init() {
        console.log('MCP Context Selector initialized');
        this.setupEventListeners();
    }

    static setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mcp-resource-item')) {
                this.selectResource(e.target.dataset.server, e.target.dataset.uri);
            }
        });
    }

    static async selectResource(serverName, uri) {
        const contextInput = document.getElementById('mcp-context-input');
        if (contextInput) {
            contextInput.value = `${serverName}://${uri}`;
            Utils.showSuccess(`Selected resource: ${serverName}://${uri}`);
        }
    }

    /**
     * Fetch resources from MCP server
     * @param {string} serverName
     * @param {string} endpoint
     * @param {string} apiKey
     */
    static async fetchResources(serverName, endpoint, apiKey) {
        try {
            const response = await fetch(`${endpoint}/resources`, {
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            return data.resources || [];
        } catch (error) {
            console.error(`Error fetching resources from ${serverName}:`, error);
            Utils.showError(`Failed to fetch resources: ${error.message}`);
            return [];
        }
    }

    /**
     * Show resource selector
     * @param {string} serverName
     * @param {string} endpoint
     * @param {string} apiKey
     */
    static async showResourceSelector(serverName, endpoint, apiKey) {
        // Create selector if it doesn't exist
        if (!document.getElementById('mcp-resource-selector')) {
            const selectorHTML = `
            <div id="mcp-resource-selector" class="modal">
                <div class="modal-content">
                    <h4>Select Resource from ${serverName}</h4>
                    <div id="mcp-resource-list" class="resource-list"></div>
                    <div class="modal-actions">
                        <button class="btn secondary" onclick="document.getElementById('mcp-resource-selector').remove()">Cancel</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', selectorHTML);
        }

        // Fetch and display resources
        const resourceList = document.getElementById('mcp-resource-list');
        resourceList.innerHTML = '<p>Loading resources...</p>';

        const resources = await this.fetchResources(serverName, endpoint, apiKey);
        resourceList.innerHTML = resources.length
            ? resources.map(r => `<div class="mcp-resource-item" data-server="${serverName}" data-uri="${r.uri}">${r.uri}</div>`).join('')
            : '<p>No resources available</p>';

        document.getElementById('mcp-resource-selector').style.display = 'block';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    MCPManager.init();
});
