/**
 * Enhanced Frontend Utilities
 * Provides standardized API calls, error handling, and user notifications
 */

class Utils {
    /**
     * Make an API call with standardized error handling
     * @param {string} url - API endpoint URL
     * @param {object} options - Fetch options
     * @returns {Promise<any>} API response data
     */
    static async apiCall(url, options = {}) {
        const startTime = Date.now();

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();
            const duration = Date.now() - startTime;

            // Log API calls in development
            if (this.isDevelopment()) {
                console.log(`API Call: ${options.method || 'GET'} ${url} (${duration}ms)`, {
                    status: response.status,
                    success: response.ok,
                    data: data
                });
            }

            if (!response.ok) {
                const error = new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
                error.statusCode = response.status;
                error.details = data.details;
                error.response = data;
                throw error;
            }

            return data;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`API call failed for ${url} (${duration}ms):`, error);

            // Enhance error with additional context
            if (!error.statusCode) {
                error.isNetworkError = true;
                error.message = `Network error: ${error.message}`;
            }

            throw error;
        }
    }

    /**
     * Show error notification to user
     * @param {string} message - Error message
     * @param {string|object} details - Error details (optional)
     * @param {number} duration - Display duration in ms (default: 5000)
     */
    static showError(message, details = null, duration = 5000) {
        this.removeExistingNotifications('error');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification notification';
        errorDiv.setAttribute('data-type', 'error');

        let detailsHtml = '';
        if (details) {
            const detailsText = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
            // Create details elements safely
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'error-details';
            detailsDiv.style.display = 'none';
            const pre = document.createElement('pre');
            pre.textContent = detailsText;
            detailsDiv.appendChild(pre);

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'error-details-toggle';
            toggleBtn.textContent = 'Show Details';
            toggleBtn.onclick = () => {
                detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
                toggleBtn.textContent = detailsDiv.style.display === 'none' ? 'Show Details' : 'Hide Details';
            };

            detailsHtml = detailsDiv.outerHTML + toggleBtn.outerHTML;
        }

        // Create notification elements safely
        const notificationContent = document.createElement('div');
        notificationContent.className = 'notification-content';

        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.textContent = '❌';

        const body = document.createElement('div');
        body.className = 'notification-body';

        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = 'Error';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification-message';
        messageDiv.textContent = message;

        body.appendChild(title);
        body.appendChild(messageDiv);

        if (details) {
            body.insertAdjacentHTML('beforeend', detailsHtml);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => errorDiv.remove();

        notificationContent.appendChild(icon);
        notificationContent.appendChild(body);
        notificationContent.appendChild(closeBtn);

        errorDiv.appendChild(notificationContent);

        this.addNotificationStyles();
        document.body.appendChild(errorDiv);

        // Auto-dismiss
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, duration);

        // Animate in
        setTimeout(() => errorDiv.classList.add('show'), 10);
    }

    /**
     * Show success notification to user
     * @param {string} message - Success message
     * @param {number} duration - Display duration in ms (default: 3000)
     */
    static showSuccess(message, duration = 3000) {
        this.removeExistingNotifications('success');

        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification notification';
        successDiv.setAttribute('data-type', 'success');

        // Create notification elements safely
        const notificationContent = document.createElement('div');
        notificationContent.className = 'notification-content';

        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.textContent = '✅';

        const body = document.createElement('div');
        body.className = 'notification-body';

        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = 'Success';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification-message';
        messageDiv.textContent = message;

        body.appendChild(title);
        body.appendChild(messageDiv);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => successDiv.remove();

        notificationContent.appendChild(icon);
        notificationContent.appendChild(body);
        notificationContent.appendChild(closeBtn);

        successDiv.appendChild(notificationContent);

        this.addNotificationStyles();
        document.body.appendChild(successDiv);

        // Auto-dismiss
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.remove();
            }
        }, duration);

        // Animate in
        setTimeout(() => successDiv.classList.add('show'), 10);
    }

    /**
     * Show info notification to user
     * @param {string} message - Info message
     * @param {number} duration - Display duration in ms (default: 4000)
     */
    static showInfo(message, duration = 4000) {
        this.removeExistingNotifications('info');

        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-notification notification';
        infoDiv.setAttribute('data-type', 'info');

        // Create notification elements safely
        const notificationContent = document.createElement('div');
        notificationContent.className = 'notification-content';

        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.textContent = 'ℹ️';

        const body = document.createElement('div');
        body.className = 'notification-body';

        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = 'Info';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification-message';
        messageDiv.textContent = message;

        body.appendChild(title);
        body.appendChild(messageDiv);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => infoDiv.remove();

        notificationContent.appendChild(icon);
        notificationContent.appendChild(body);
        notificationContent.appendChild(closeBtn);

        infoDiv.appendChild(notificationContent);

        this.addNotificationStyles();
        document.body.appendChild(infoDiv);

        // Auto-dismiss
        setTimeout(() => {
            if (infoDiv.parentElement) {
                infoDiv.remove();
            }
        }, duration);

        // Animate in
        setTimeout(() => infoDiv.classList.add('show'), 10);
    }

    /**
     * Show loading notification
     * @param {string} message - Loading message
     * @returns {object} Object with dismiss() method
     */
    static showLoading(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-notification notification';
        loadingDiv.setAttribute('data-type', 'loading');

        // Create notification elements safely
        const notificationContent = document.createElement('div');
        notificationContent.className = 'notification-content';

        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        icon.appendChild(spinner);

        const body = document.createElement('div');
        body.className = 'notification-body';

        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = 'Loading';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification-message';
        messageDiv.textContent = message;

        body.appendChild(title);
        body.appendChild(messageDiv);

        notificationContent.appendChild(icon);
        notificationContent.appendChild(body);

        loadingDiv.appendChild(notificationContent);

        this.addNotificationStyles();
        document.body.appendChild(loadingDiv);

        // Animate in
        setTimeout(() => loadingDiv.classList.add('show'), 10);

        return {
            dismiss: () => {
                if (loadingDiv.parentElement) {
                    loadingDiv.remove();
                }
            }
        };
    }

    /**
     * Remove existing notifications of a specific type
     * @param {string} type - Notification type to remove
     */
    static removeExistingNotifications(type) {
        const existing = document.querySelectorAll(`.notification[data-type="${type}"]`);
        existing.forEach(notification => notification.remove());
    }

    /**
     * Add notification styles to page (only once)
     */
    static addNotificationStyles() {
        if (document.getElementById('utils-notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'utils-notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                min-width: 300px;
                background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #ddd);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            }

            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .notification-content {
                display: flex;
                align-items: flex-start;
                padding: 16px;
                gap: 12px;
            }

            .notification-icon {
                font-size: 20px;
                line-height: 1;
                flex-shrink: 0;
            }

            .notification-body {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: var(--text-color, #333);
            }

            .notification-message {
                color: var(--text-muted, #666);
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: var(--text-muted, #666);
                flex-shrink: 0;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }

            .notification-close:hover {
                background: var(--hover-bg, #f5f5f5);
                color: var(--text-color, #333);
            }

            .error-notification {
                border-left: 4px solid #ef4444;
            }

            .success-notification {
                border-left: 4px solid #10b981;
            }

            .info-notification {
                border-left: 4px solid #3b82f6;
            }

            .loading-notification {
                border-left: 4px solid #f59e0b;
            }

            .error-details {
                margin-top: 8px;
                padding: 8px;
                background: var(--code-bg, #f5f5f5);
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                max-height: 200px;
                overflow-y: auto;
            }

            .error-details pre {
                margin: 0;
                white-space: pre-wrap;
            }

            .error-details-toggle {
                margin-top: 8px;
                background: none;
                border: 1px solid var(--border-color, #ddd);
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                color: var(--text-muted, #666);
            }

            .error-details-toggle:hover {
                background: var(--hover-bg, #f5f5f5);
            }

            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid var(--border-color, #ddd);
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Stack multiple notifications */
            .notification:nth-child(n+2) {
                top: calc(20px + (80px * var(--notification-index, 1)));
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Check if running in development mode
     * @returns {boolean} True if in development
     */
    static isDevelopment() {
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';
    }

    /**
     * Format file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
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

    /**
     * Show modal dialog
     * @param {string} title - Modal title
     * @param {string} content - Modal content (HTML)
     * @param {object} options - Modal options
     */
    static showModal(title, content, options = {}) {
        const {
            closable = true,
            size = 'medium',
            onClose = null
        } = options;

        const modal = document.createElement('div');
        modal.className = `utils-modal modal-${size}`;
        modal.style.display = 'flex';

        // Create modal elements safely
        const modalContent = document.createElement('div');
        modalContent.className = 'utils-modal-content';

        const header = document.createElement('div');
        header.className = 'utils-modal-header';

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        header.appendChild(titleElement);

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'utils-modal-close';
            closeBtn.textContent = '×';
            header.appendChild(closeBtn);
        }

        const bodyElement = document.createElement('div');
        bodyElement.className = 'utils-modal-body';
        // Content might contain HTML, so we need to handle it carefully
        // If it's user-generated, it should be sanitized
        bodyElement.innerHTML = content;

        modalContent.appendChild(header);
        modalContent.appendChild(bodyElement);

        modal.appendChild(modalContent);

        // Add modal styles
        this.addModalStyles();

        // Add close functionality
        if (closable) {
            const closeBtn = modal.querySelector('.utils-modal-close');
            const closeModal = () => {
                modal.remove();
                if (onClose) onClose();
            };

            closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            // ESC key to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Add modal styles (only once)
     */
    static addModalStyles() {
        if (document.getElementById('utils-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'utils-modal-styles';
        style.textContent = `
            .utils-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .utils-modal-content {
                background: var(--card-bg, #fff);
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                max-height: 90vh;
                overflow-y: auto;
                width: 100%;
            }

            .modal-small .utils-modal-content { max-width: 400px; }
            .modal-medium .utils-modal-content { max-width: 600px; }
            .modal-large .utils-modal-content { max-width: 800px; }
            .modal-full .utils-modal-content { max-width: 95vw; }

            .utils-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--border-color, #ddd);
            }

            .utils-modal-header h3 {
                margin: 0;
                color: var(--text-color, #333);
            }

            .utils-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-muted, #666);
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }

            .utils-modal-close:hover {
                background: var(--hover-bg, #f5f5f5);
                color: var(--text-color, #333);
            }

            .utils-modal-body {
                padding: 20px;
            }
        `;

        document.head.appendChild(style);
    }
}

// Make available globally
window.Utils = Utils;
