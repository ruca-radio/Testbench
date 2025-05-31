// TestBench Agent Manager - System-level testing and configuration management
class TestBenchManager {
    constructor() {
        this.chatHistory = [];
        this.isInitialized = false;
        this.systemStatus = {};
        this.backupInfo = { lastBackup: 'Never', count: 0 };
    }

    static async init() {
        if (!window.testBenchManager) {
            window.testBenchManager = new TestBenchManager();
        }

        await window.testBenchManager.initialize();
        console.log('TestBenchManager initialized');
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.loadSystemStatus();
            await this.loadBackupInfo();
            this.setupEventListeners();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize TestBench Manager:', error);
        }
    }

    setupEventListeners() {
        // Chat input enter key handler
        const chatInput = document.getElementById('testbench-chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }

    // === CHAT INTERFACE ===
    static handleChatKeyPress(event) {
        if (event.key === 'Enter') {
            TestBenchManager.sendMessage();
        }
    }

    static async sendMessage() {
        const input = document.getElementById('testbench-chat-input');
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';

        // Add user message to chat
        TestBenchManager.addChatMessage('user', message);

        try {
            Utils.showInfo('TestBench Agent is processing your request...');

            // Send message to TestBench Agent backend
            const response = await fetch('/api/testbench/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    context: 'settings-modal'
                })
            });

            if (response.ok) {
                const data = await response.json();
                TestBenchManager.addChatMessage('agent', data.response);

                // Handle any actions the agent requested
                if (data.actions && data.actions.length > 0) {
                    await TestBenchManager.executeAgentActions(data.actions);
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error sending message to TestBench Agent:', error);
            TestBenchManager.addChatMessage('agent',
                'I encountered an error processing your request. Please check the system status and try again.');
            Utils.showError('Failed to communicate with TestBench Agent');
        }
    }

    static addChatMessage(sender, content) {
        const messagesContainer = document.getElementById('testbench-chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `testbench-message ${sender}-message`;

        if (sender === 'agent') {
            messageDiv.innerHTML = `
                <div class="agent-avatar">🧪</div>
                <div class="message-content">
                    <p>${content}</p>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content user-content">
                    <p>${content}</p>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    static async executeAgentActions(actions) {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'refresh_status':
                        await TestBenchManager.loadSystemStatus();
                        break;
                    case 'create_agent':
                        await TestBenchManager.quickAction('create-agent');
                        break;
                    case 'create_workspace':
                        await TestBenchManager.quickAction('create-workspace');
                        break;
                    case 'run_tests':
                        await TestBenchManager.quickAction('run-tests');
                        break;
                    case 'health_check':
                        await TestBenchManager.quickAction('health-check');
                        break;
                    default:
                        console.warn('Unknown agent action:', action.type);
                }
            } catch (error) {
                console.error(`Error executing agent action ${action.type}:`, error);
            }
        }
    }

    // === QUICK ACTIONS ===
    static async quickAction(actionType) {
        Utils.showInfo(`Executing ${actionType}...`);

        try {
            switch (actionType) {
                case 'create-agent':
                    await TestBenchManager.createTestAgent();
                    break;
                case 'create-workspace':
                    await TestBenchManager.createTestWorkspace();
                    break;
                case 'setup-knowledge':
                    await TestBenchManager.setupKnowledgeBase();
                    break;
                case 'configure-system':
                    await TestBenchManager.configureSystem();
                    break;
                case 'run-tests':
                    await TestBenchManager.runFeatureTests();
                    break;
                case 'health-check':
                    await TestBenchManager.performHealthCheck();
                    break;
                default:
                    throw new Error(`Unknown action: ${actionType}`);
            }
        } catch (error) {
            console.error(`Error executing ${actionType}:`, error);
            Utils.showError(`Failed to execute ${actionType}`);
        }
    }

    static async createTestAgent() {
        const response = await fetch('/api/testbench/agents/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'TestBench Assistant',
                description: 'System testing and configuration assistant',
                provider: 'openai',
                model: 'gpt-4o',
                role: 'testbench',
                capabilities: ['system_modify', 'agent_create', 'workspace_manage', 'knowledge_provision', 'feature_test']
            })
        });

        if (response.ok) {
            const data = await response.json();
            Utils.showSuccess(`Created TestBench Agent: ${data.agent.name}`);
            TestBenchManager.addChatMessage('agent',
                `✅ Successfully created TestBench Agent "${data.agent.name}" with system-level capabilities.`);
        } else {
            throw new Error(`Failed to create agent: ${response.statusText}`);
        }
    }

    static async createTestWorkspace() {
        const response = await fetch('/api/testbench/workspaces/provision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'TestBench Workspace',
                description: 'System testing and validation workspace',
                agents: ['testbench', 'coder', 'reviewer'],
                tools: ['web-search', 'code-execution', 'file-operations'],
                template: 'testbench'
            })
        });

        if (response.ok) {
            const data = await response.json();
            Utils.showSuccess(`Created workspace: ${data.workspace.name}`);
            TestBenchManager.addChatMessage('agent',
                `✅ Successfully provisioned TestBench Workspace with ${data.agents_created} agents and ${data.tools_configured} tools.`);
        } else {
            throw new Error(`Failed to create workspace: ${response.statusText}`);
        }
    }

    static async setupKnowledgeBase() {
        const response = await fetch('/api/testbench/knowledge/provision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'TestBench Knowledge Base',
                description: 'System documentation and test cases',
                embeddings: true,
                sample_data: true
            })
        });

        if (response.ok) {
            const data = await response.json();
            Utils.showSuccess(`Setup knowledge base: ${data.knowledge_base.name}`);
            TestBenchManager.addChatMessage('agent',
                `✅ Successfully setup knowledge base with ${data.documents_added} sample documents and vector embeddings enabled.`);
        } else {
            throw new Error(`Failed to setup knowledge base: ${response.statusText}`);
        }
    }

    static async configureSystem() {
        Utils.showModal('System Configuration', `
            <div class="system-config-form">
                <h4>System Configuration Options</h4>
                <div class="settings-group">
                    <label for="enable-collaboration">Enable Multi-Agent Collaboration:</label>
                    <input type="checkbox" id="enable-collaboration" checked>
                </div>
                <div class="settings-group">
                    <label for="debug-mode">Enable Debug Mode:</label>
                    <input type="checkbox" id="debug-mode">
                </div>
                <div class="settings-group">
                    <label for="rate-limit">API Rate Limiting:</label>
                    <select id="rate-limit">
                        <option value="low">Low (Development)</option>
                        <option value="medium" selected>Medium (Testing)</option>
                        <option value="high">High (Production)</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label for="logging-level">Logging Level:</label>
                    <select id="logging-level">
                        <option value="error">Error Only</option>
                        <option value="warn">Warning</option>
                        <option value="info" selected>Info</option>
                        <option value="debug">Debug</option>
                    </select>
                </div>
            </div>
        `, async () => {
            await TestBenchManager.applySystemConfiguration();
        });
    }

    static async applySystemConfiguration() {
        const config = {
            collaboration_enabled: document.getElementById('enable-collaboration').checked,
            debug_mode: document.getElementById('debug-mode').checked,
            rate_limit_level: document.getElementById('rate-limit').value,
            logging_level: document.getElementById('logging-level').value
        };

        const response = await fetch('/api/settings/testbench/system-modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: config })
        });

        if (response.ok) {
            Utils.showSuccess('System configuration updated successfully');
            TestBenchManager.addChatMessage('agent',
                '✅ System configuration has been updated. Changes will take effect immediately.');
        } else {
            throw new Error(`Failed to update configuration: ${response.statusText}`);
        }
    }

    static async runFeatureTests() {
        const response = await fetch('/api/testbench/tests/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                test_suites: ['agent_creation', 'workspace_collaboration', 'provider_connectivity'],
                generate_report: true
            })
        });

        if (response.ok) {
            const data = await response.json();
            Utils.showSuccess(`Tests completed: ${data.passed}/${data.total} passed`);
            TestBenchManager.addChatMessage('agent',
                `✅ Feature tests completed: ${data.passed}/${data.total} passed, ${data.failed} failed. Test report: ${data.report_url || 'Available in logs'}`);
        } else {
            throw new Error(`Failed to run tests: ${response.statusText}`);
        }
    }

    static async performHealthCheck() {
        const response = await fetch('/api/testbench/health/comprehensive');

        if (response.ok) {
            const data = await response.json();
            await TestBenchManager.updateSystemStatus(data);
            Utils.showSuccess('Health check completed');
            TestBenchManager.addChatMessage('agent',
                `✅ System health check completed. Overall status: ${data.overall_status}. ${data.healthy_components}/${data.total_components} components healthy.`);
        } else {
            throw new Error(`Failed to perform health check: ${response.statusText}`);
        }
    }

    // === TEMPLATE MANAGEMENT ===
    static async applyTemplate(templateName) {
        const confirmMessage = `Apply the ${templateName} template? This will create agents, workspaces, and configure settings according to the template.`;

        if (!confirm(confirmMessage)) return;

        try {
            Utils.showInfo(`Applying ${templateName} template...`);

            const response = await fetch('/api/settings/testbench/templates/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template_name: templateName })
            });

            if (response.ok) {
                const data = await response.json();
                Utils.showSuccess(`${templateName} template applied successfully`);
                TestBenchManager.addChatMessage('agent',
                    `✅ Successfully applied ${templateName} template. Created: ${data.agents_created} agents, ${data.workspaces_created} workspaces, ${data.settings_updated} settings updated.`);
            } else {
                throw new Error(`Failed to apply template: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error applying template:', error);
            Utils.showError(`Failed to apply ${templateName} template`);
        }
    }

    static async previewTemplate(templateName) {
        try {
            const response = await fetch(`/api/settings/testbench/templates/${templateName}`);

            if (response.ok) {
                const template = await response.json();
                Utils.showModal(`${templateName} Template Preview`, `
                    <div class="template-preview">
                        <h4>${template.name}</h4>
                        <p>${template.description}</p>

                        <h5>Agents to be created:</h5>
                        <ul>
                            ${template.agents.map(agent => `<li>${agent.name} (${agent.role})</li>`).join('')}
                        </ul>

                        <h5>Workspaces to be created:</h5>
                        <ul>
                            ${template.workspaces.map(ws => `<li>${ws.name}</li>`).join('')}
                        </ul>

                        <h5>Settings to be configured:</h5>
                        <ul>
                            ${Object.keys(template.settings).map(key => `<li>${key}: ${template.settings[key]}</li>`).join('')}
                        </ul>
                    </div>
                `);
            } else {
                throw new Error(`Failed to load template: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error previewing template:', error);
            Utils.showError(`Failed to preview ${templateName} template`);
        }
    }

    // === BACKUP & RESTORE ===
    static async createBackup() {
        try {
            Utils.showInfo('Creating system backup...');

            const response = await fetch('/api/settings/testbench/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    include_agents: true,
                    include_workspaces: true,
                    include_settings: true,
                    include_knowledge: true
                })
            });

            if (response.ok) {
                const data = await response.json();
                await TestBenchManager.loadBackupInfo();
                Utils.showSuccess(`Backup created: ${data.backup_id}`);
                TestBenchManager.addChatMessage('agent',
                    `✅ System backup created successfully. Backup ID: ${data.backup_id}. Size: ${data.backup_size}.`);
            } else {
                throw new Error(`Failed to create backup: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            Utils.showError('Failed to create backup');
        }
    }

    static async restoreBackup() {
        try {
            const response = await fetch('/api/settings/testbench/backup/list');

            if (response.ok) {
                const backups = await response.json();

                if (backups.length === 0) {
                    Utils.showError('No backups available');
                    return;
                }

                const backupOptions = backups.map(backup =>
                    `<option value="${backup.id}">${backup.created_at} - ${backup.description}</option>`
                ).join('');

                Utils.showModal('Restore Backup', `
                    <div class="backup-restore-form">
                        <h4>Select Backup to Restore</h4>
                        <div class="settings-group">
                            <label for="backup-select">Available Backups:</label>
                            <select id="backup-select">
                                ${backupOptions}
                            </select>
                        </div>
                        <p class="warning">⚠️ This will replace current system configuration with the selected backup.</p>
                    </div>
                `, async () => {
                    await TestBenchManager.performBackupRestore();
                });
            } else {
                throw new Error(`Failed to load backups: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading backups:', error);
            Utils.showError('Failed to load backups');
        }
    }

    static async performBackupRestore() {
        const backupId = document.getElementById('backup-select').value;

        if (!confirm('Are you sure you want to restore this backup? This action cannot be undone.')) {
            return;
        }

        try {
            Utils.showInfo('Restoring backup...');

            const response = await fetch('/api/settings/testbench/backup/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backup_id: backupId })
            });

            if (response.ok) {
                const data = await response.json();
                Utils.showSuccess('Backup restored successfully');
                TestBenchManager.addChatMessage('agent',
                    `✅ Backup restored successfully. Restored: ${data.agents_restored} agents, ${data.workspaces_restored} workspaces, ${data.settings_restored} settings.`);

                // Refresh system status after restore
                await TestBenchManager.loadSystemStatus();
            } else {
                throw new Error(`Failed to restore backup: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            Utils.showError('Failed to restore backup');
        }
    }

    static async listBackups() {
        try {
            const response = await fetch('/api/settings/testbench/backup/list');

            if (response.ok) {
                const backups = await response.json();

                const backupList = backups.map(backup => `
                    <div class="backup-item">
                        <div class="backup-info">
                            <h5>${backup.created_at}</h5>
                            <p>${backup.description}</p>
                            <span class="backup-size">Size: ${backup.size}</span>
                        </div>
                        <div class="backup-actions">
                            <button class="btn small" onclick="TestBenchManager.downloadBackup('${backup.id}')">Download</button>
                            <button class="btn small danger" onclick="TestBenchManager.deleteBackup('${backup.id}')">Delete</button>
                        </div>
                    </div>
                `).join('');

                Utils.showModal('Available Backups', `
                    <div class="backup-list">
                        ${backupList || '<p>No backups available</p>'}
                    </div>
                `);
            } else {
                throw new Error(`Failed to load backups: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading backups:', error);
            Utils.showError('Failed to load backups');
        }
    }

    static async downloadBackup(backupId) {
        try {
            const response = await fetch(`/api/settings/testbench/backup/download/${backupId}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `testbench-backup-${backupId}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                Utils.showSuccess('Backup downloaded successfully');
            } else {
                throw new Error(`Failed to download backup: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error downloading backup:', error);
            Utils.showError('Failed to download backup');
        }
    }

    static async deleteBackup(backupId) {
        if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/settings/testbench/backup/${backupId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Utils.showSuccess('Backup deleted successfully');
                await TestBenchManager.loadBackupInfo();
                // Refresh the backup list if it's currently open
                await TestBenchManager.listBackups();
            } else {
                throw new Error(`Failed to delete backup: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            Utils.showError('Failed to delete backup');
        }
    }

    // === SYSTEM STATUS ===
    static async loadTestBenchData() {
        await TestBenchManager.loadSystemStatus();
        await TestBenchManager.loadBackupInfo();
    }

    static async loadSystemStatus() {
        try {
            const response = await fetch('/api/health/status');

            if (response.ok) {
                const status = await response.json();
                await TestBenchManager.updateSystemStatus(status);
            } else {
                console.error('Failed to load system status');
            }
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    }

    static async updateSystemStatus(status) {
        const components = {
            'db-status': status.database || 'Unknown',
            'collab-status': status.collaboration || 'Unknown',
            'providers-status': status.providers || 'Unknown',
            'testbench-agent-status': status.testbench || 'Unknown'
        };

        Object.entries(components).forEach(([elementId, statusText]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = statusText;

                // Update status icon
                const iconElement = element.parentElement.previousElementSibling;
                if (iconElement) {
                    iconElement.className = 'status-icon';
                    if (statusText.toLowerCase().includes('healthy') || statusText.toLowerCase().includes('connected')) {
                        iconElement.textContent = '✅';
                        iconElement.classList.add('healthy');
                    } else if (statusText.toLowerCase().includes('warning')) {
                        iconElement.textContent = '⚠️';
                        iconElement.classList.add('warning');
                    } else if (statusText.toLowerCase().includes('error') || statusText.toLowerCase().includes('disconnected')) {
                        iconElement.textContent = '❌';
                        iconElement.classList.add('error');
                    } else {
                        iconElement.textContent = '⏳';
                        iconElement.classList.add('loading');
                    }
                }
            }
        });
    }

    static async loadBackupInfo() {
        try {
            const response = await fetch('/api/settings/testbench/backup/info');

            if (response.ok) {
                const info = await response.json();

                const lastBackupElement = document.getElementById('last-backup-date');
                if (lastBackupElement) {
                    lastBackupElement.textContent = info.last_backup || 'Never';
                }

                const backupCountElement = document.getElementById('backup-count');
                if (backupCountElement) {
                    backupCountElement.textContent = info.backup_count || '0';
                }
            }
        } catch (error) {
            console.error('Error loading backup info:', error);
        }
    }

    // === DANGER ZONE ===
    static async resetSystem() {
        const confirmation = prompt('This will reset all system settings to defaults. Type "RESET" to confirm:');

        if (confirmation !== 'RESET') {
            Utils.showInfo('Reset cancelled');
            return;
        }

        try {
            Utils.showInfo('Resetting system...');

            const response = await fetch('/api/settings/testbench/system-modify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_to_defaults' })
            });

            if (response.ok) {
                Utils.showSuccess('System reset completed');
                TestBenchManager.addChatMessage('agent',
                    '⚠️ System has been reset to default settings. Please review and reconfigure as needed.');
                await TestBenchManager.loadSystemStatus();
            } else {
                throw new Error(`Failed to reset system: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error resetting system:', error);
            Utils.showError('Failed to reset system');
        }
    }

    static async clearTestData() {
        const confirmation = prompt('This will delete all test data including agents, workspaces, and test results. Type "CLEAR" to confirm:');

        if (confirmation !== 'CLEAR') {
            Utils.showInfo('Clear cancelled');
            return;
        }

        try {
            Utils.showInfo('Clearing test data...');

            const response = await fetch('/api/testbench/data/clear', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clear_test_data: true })
            });

            if (response.ok) {
                const data = await response.json();
                Utils.showSuccess('Test data cleared successfully');
                TestBenchManager.addChatMessage('agent',
                    `⚠️ Test data cleared. Removed: ${data.agents_removed} test agents, ${data.workspaces_removed} test workspaces, ${data.test_results_removed} test results.`);
            } else {
                throw new Error(`Failed to clear test data: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error clearing test data:', error);
            Utils.showError('Failed to clear test data');
        }
    }

    static async factoryReset() {
        const confirmation1 = prompt('⚠️ FACTORY RESET will delete ALL data and reset the entire system. Type "FACTORY" to continue:');

        if (confirmation1 !== 'FACTORY') {
            Utils.showInfo('Factory reset cancelled');
            return;
        }

        const confirmation2 = prompt('This action is IRREVERSIBLE. All agents, workspaces, settings, and data will be lost. Type "CONFIRM" to proceed:');

        if (confirmation2 !== 'CONFIRM') {
            Utils.showInfo('Factory reset cancelled');
            return;
        }

        try {
            Utils.showInfo('Performing factory reset...');

            const response = await fetch('/api/settings/testbench/system-modify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'factory_reset' })
            });

            if (response.ok) {
                Utils.showSuccess('Factory reset completed - System will restart');
                TestBenchManager.addChatMessage('agent',
                    '🔄 Factory reset completed. The system has been restored to its initial state. All data has been cleared.');

                // Reload the page after a delay
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                throw new Error(`Failed to perform factory reset: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error performing factory reset:', error);
            Utils.showError('Failed to perform factory reset');
        }
    }
}

// Initialize TestBenchManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    TestBenchManager.init();
});

// Export for global access
window.TestBenchManager = TestBenchManager;
