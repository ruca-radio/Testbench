// Utility functions and helpers
class Utils {
    static showSuccess(message) {
        this.showNotification(message, 'success');
    }

    static showError(message) {
        this.showNotification(message, 'error');
    }

    static showInfo(message) {
        this.showNotification(message, 'info');
    }

    static showWarning(message) {
        this.showNotification(message, 'warning');
    }

    static showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        // Add to page
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);

        // Add slide-in animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }

    static async fetchWithErrorHandling(url, options = {}) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            throw error;
        }
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showSuccess('Copied to clipboard');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(text);
            });
        } else {
            this.fallbackCopyTextToClipboard(text);
        }
    }

    static fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showSuccess('Copied to clipboard');
            } else {
                this.showError('Failed to copy to clipboard');
            }
        } catch (err) {
            this.showError('Failed to copy to clipboard');
        }

        document.body.removeChild(textArea);
    }

    static sanitizeHtml(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    static isValidJson(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    static createLoadingSpinner(size = 'medium') {
        const spinner = document.createElement('div');
        spinner.className = `loading-spinner ${size}`;
        spinner.innerHTML = '<div class="spinner"></div>';
        return spinner;
    }

    static showConfirmDialog(message, onConfirm, onCancel) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog-overlay';
        dialog.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-content">
                    <p>${message}</p>
                    <div class="confirm-dialog-actions">
                        <button class="btn secondary" id="confirm-cancel">Cancel</button>
                        <button class="btn danger" id="confirm-ok">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const okBtn = dialog.querySelector('#confirm-ok');
        const cancelBtn = dialog.querySelector('#confirm-cancel');

        okBtn.onclick = () => {
            dialog.remove();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            dialog.remove();
            if (onCancel) onCancel();
        };

        // Close on background click
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                dialog.remove();
                if (onCancel) onCancel();
            }
        };

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                dialog.remove();
                document.removeEventListener('keydown', escapeHandler);
                if (onCancel) onCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    static localStorage = {
        get(key, defaultValue = null) {
            try {
                const item = window.localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },

        remove(key) {
            try {
                window.localStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        },

        clear() {
            try {
                window.localStorage.clear();
                return true;
            } catch {
                return false;
            }
        }
    };
}

// Global Functions for HTML onclick handlers
function switchWorkspace(workspaceId) {
    console.log('Switching to workspace:', workspaceId);
    Utils.showInfo(`Switched to workspace: ${workspaceId}`);
    // TODO: Implement workspace switching logic
}

function switchModel(modelId) {
    console.log('Switching to model:', modelId);
    if (window.app) {
        window.app.updateSettings({ model: modelId });
        Utils.showSuccess(`Model changed to: ${modelId}`);
    }
}

function openSettingsModal() {
    console.log('Opening settings modal');
    if (window.SettingsModal && window.SettingsModal.open) {
        window.SettingsModal.open();
    } else {
        // Fallback: Create and show a basic modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>Settings</h2>
                <p>Settings modal functionality will be implemented here.</p>
                <div class="button-group">
                    <button class="btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function openAgentManager() {
    console.log('Opening agent manager');
    if (window.AgentManager && window.AgentManager.open) {
        window.AgentManager.open();
    } else {
        // Fallback: Open settings modal and switch to agents tab
        openSettingsModal();
        Utils.showInfo('Agent management will be available in settings');
    }
}

function openMCPManager() {
    console.log('Opening MCP manager');
    if (window.MCPManager && window.MCPManager.open) {
        window.MCPManager.open();
    } else {
        // Fallback: Open settings modal
        openSettingsModal();
        Utils.showInfo('MCP management will be available in settings');
    }
}

function toggleModelSettings() {
    const content = document.getElementById('model-settings-content');
    const icon = document.querySelector('.collapse-icon');

    if (content && icon) {
        const isExpanded = content.style.display === 'block' || content.hasAttribute('hidden') === false;

        if (isExpanded) {
            content.style.display = 'none';
            content.setAttribute('hidden', '');
            icon.style.transform = 'rotate(0deg)';
            icon.setAttribute('aria-expanded', 'false');
        } else {
            content.style.display = 'block';
            content.removeAttribute('hidden');
            icon.style.transform = 'rotate(90deg)';
            icon.setAttribute('aria-expanded', 'true');
        }

        console.log('Toggled model settings:', !isExpanded);
    }
}

function updateQuickSettings() {
    const temperature = document.getElementById('quick-temperature')?.value;
    const maxTokens = document.getElementById('quick-max-tokens')?.value;
    const model = document.getElementById('quick-model-select')?.value;

    // Update display values
    const tempValue = document.getElementById('quick-temperature-value');
    const tokensValue = document.getElementById('quick-max-tokens-value');

    if (tempValue && temperature) {
        tempValue.textContent = parseFloat(temperature).toFixed(1);
    }

    if (tokensValue && maxTokens) {
        tokensValue.textContent = maxTokens;
    }

    // Update app settings
    if (window.app) {
        const settings = {};
        if (temperature) settings.temperature = parseFloat(temperature);
        if (maxTokens) settings.maxTokens = parseInt(maxTokens);
        if (model) settings.model = model;

        window.app.updateSettings(settings);
        console.log('Updated quick settings:', settings);
    }
}

function loadQuickAgent() {
    const agentSelect = document.getElementById('quick-agent-select');
    if (agentSelect && window.app) {
        const agentId = agentSelect.value;
        window.app.setCurrentAgent(agentId);
        Utils.showSuccess(`Loaded agent: ${agentId}`);
        console.log('Loaded quick agent:', agentId);
    }
}

// Auto-update range slider values
document.addEventListener('DOMContentLoaded', () => {
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        const valueElement = document.getElementById(input.id + '-value');
        if (valueElement) {
            input.addEventListener('input', () => {
                valueElement.textContent = parseFloat(input.value).toFixed(1);
            });
        }
    });
});

window.Utils = Utils;

// Export global functions
window.switchWorkspace = switchWorkspace;
window.switchModel = switchModel;
window.openSettingsModal = openSettingsModal;
window.openAgentManager = openAgentManager;
window.openMCPManager = openMCPManager;
window.toggleModelSettings = toggleModelSettings;
window.updateQuickSettings = updateQuickSettings;
window.loadQuickAgent = loadQuickAgent;
