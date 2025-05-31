// System Monitor Widget - System health and performance display
class SystemMonitorWidget {
    constructor(id, config = {}) {
        this.id = id;
        this.config = config;
        this.title = config.title || 'System Monitor';
        this.metrics = {};
        this.updateInterval = null;
        this.refreshRate = config.refreshRate || 15000; // 15 seconds
        this.alertThresholds = {
            cpu: 80,
            memory: 85,
            responseTime: 1000
        };
    }

    getTitle() {
        return this.title;
    }

    getIcon() {
        return '📊';
    }

    render() {
        return `
            <div class="system-monitor-widget-content">
                <!-- System Health Overview -->
                <div class="health-overview">
                    <div class="health-status" id="health-status-${this.id}">
                        <span class="status-indicator loading">⏳</span>
                        <span class="status-text">Checking system health...</span>
                    </div>
                    <button class="btn tiny" onclick="SystemMonitorWidget.refreshHealth('${this.id}')" title="Refresh">🔄</button>
                </div>

                <!-- Core Services Status -->
                <div class="services-section">
                    <h5>Core Services</h5>
                    <div class="service-grid" id="service-grid-${this.id}">
                        <div class="service-item">
                            <span class="service-name">Database</span>
                            <span class="service-status unknown" id="db-service-${this.id}">⏳</span>
                        </div>
                        <div class="service-item">
                            <span class="service-name">Collaboration</span>
                            <span class="service-status unknown" id="collab-service-${this.id}">⏳</span>
                        </div>
                        <div class="service-item">
                            <span class="service-name">Providers</span>
                            <span class="service-status unknown" id="providers-service-${this.id}">⏳</span>
                        </div>
                        <div class="service-item">
                            <span class="service-name">WebSocket</span>
                            <span class="service-status unknown" id="websocket-service-${this.id}">⏳</span>
                        </div>
                    </div>
                </div>

                <!-- Performance Metrics -->
                <div class="metrics-section">
                    <h5>Performance</h5>
                    <div class="metrics-grid" id="metrics-grid-${this.id}">
                        <div class="metric-item">
                            <div class="metric-label">Response Time</div>
                            <div class="metric-value" id="response-time-${this.id}">--</div>
                            <div class="metric-unit">ms</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Active Agents</div>
                            <div class="metric-value" id="active-agents-${this.id}">--</div>
                            <div class="metric-unit">count</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Memory Usage</div>
                            <div class="metric-value" id="memory-usage-${this.id}">--</div>
                            <div class="metric-unit">MB</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Uptime</div>
                            <div class="metric-value" id="uptime-${this.id}">--</div>
                            <div class="metric-unit">hrs</div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="actions-section">
                    <h5>Quick Actions</h5>
                    <div class="action-buttons">
                        <button class="btn tiny secondary" onclick="SystemMonitorWidget.viewLogs('${this.id}')">📋 Logs</button>
                        <button class="btn tiny secondary" onclick="SystemMonitorWidget.runDiagnostics('${this.id}')">🔧 Diagnostics</button>
                        <button class="btn tiny secondary" onclick="SystemMonitorWidget.exportReport('${this.id}')">📊 Report</button>
                    </div>
                </div>

                <!-- Alerts -->
                <div class="alerts-section" id="alerts-section-${this.id}" style="display: none;">
                    <h5>Alerts</h5>
                    <div class="alerts-list" id="alerts-list-${this.id}"></div>
                </div>

                <!-- Last Updated -->
                <div class="update-info">
                    <small>Last updated: <span id="last-updated-${this.id}">Never</span></small>
                </div>
            </div>
        `;
    }

    onMounted(container) {
        this.container = container;
        this.loadSystemMetrics();
        this.startPeriodicUpdates();
    }

    async loadSystemMetrics() {
        try {
            // Load comprehensive health data
            const response = await fetch('/api/health/status');
            if (response.ok) {
                const data = await response.json();
                this.updateHealthStatus(data);
                this.updateServiceStatus(data);
                this.updateMetrics(data);
                this.checkAlerts(data);
                this.updateLastUpdated();
            } else {
                this.showErrorState('Failed to load system metrics');
            }
        } catch (error) {
            console.error('Error loading system metrics:', error);
            this.showErrorState(`Error: ${error.message}`);
        }
    }

    updateHealthStatus(data) {
        const statusEl = document.getElementById(`health-status-${this.id}`);
        if (!statusEl) return;

        const indicator = statusEl.querySelector('.status-indicator');
        const text = statusEl.querySelector('.status-text');

        if (data.overall_status === 'healthy') {
            indicator.textContent = '✅';
            indicator.className = 'status-indicator healthy';
            text.textContent = 'All systems operational';
        } else if (data.overall_status === 'warning') {
            indicator.textContent = '⚠️';
            indicator.className = 'status-indicator warning';
            text.textContent = 'Some issues detected';
        } else {
            indicator.textContent = '❌';
            indicator.className = 'status-indicator error';
            text.textContent = 'System issues detected';
        }
    }

    updateServiceStatus(data) {
        const services = {
            'db-service': data.database,
            'collab-service': data.collaboration,
            'providers-service': data.providers,
            'websocket-service': data.websocket
        };

        Object.entries(services).forEach(([serviceId, status]) => {
            const element = document.getElementById(`${serviceId}-${this.id}`);
            if (element) {
                if (typeof status === 'string') {
                    if (status.toLowerCase().includes('healthy') || status.toLowerCase().includes('connected')) {
                        element.textContent = '✅';
                        element.className = 'service-status healthy';
                    } else if (status.toLowerCase().includes('warning')) {
                        element.textContent = '⚠️';
                        element.className = 'service-status warning';
                    } else {
                        element.textContent = '❌';
                        element.className = 'service-status error';
                    }
                } else {
                    element.textContent = '❓';
                    element.className = 'service-status unknown';
                }
            }
        });
    }

    updateMetrics(data) {
        // Response Time
        const responseTimeEl = document.getElementById(`response-time-${this.id}`);
        if (responseTimeEl && data.metrics?.response_time) {
            responseTimeEl.textContent = Math.round(data.metrics.response_time);
            if (data.metrics.response_time > this.alertThresholds.responseTime) {
                responseTimeEl.classList.add('metric-alert');
            } else {
                responseTimeEl.classList.remove('metric-alert');
            }
        }

        // Active Agents
        const activeAgentsEl = document.getElementById(`active-agents-${this.id}`);
        if (activeAgentsEl && data.metrics?.active_agents !== undefined) {
            activeAgentsEl.textContent = data.metrics.active_agents;
        }

        // Memory Usage
        const memoryEl = document.getElementById(`memory-usage-${this.id}`);
        if (memoryEl && data.metrics?.memory_usage) {
            memoryEl.textContent = Math.round(data.metrics.memory_usage);
            if (data.metrics.memory_usage > this.alertThresholds.memory) {
                memoryEl.classList.add('metric-alert');
            } else {
                memoryEl.classList.remove('metric-alert');
            }
        }

        // Uptime
        const uptimeEl = document.getElementById(`uptime-${this.id}`);
        if (uptimeEl && data.metrics?.uptime) {
            const hours = Math.round(data.metrics.uptime / 3600);
            uptimeEl.textContent = hours;
        }

        this.metrics = data.metrics || {};
    }

    checkAlerts(data) {
        const alerts = [];

        // Check response time
        if (data.metrics?.response_time > this.alertThresholds.responseTime) {
            alerts.push({
                type: 'warning',
                message: `High response time: ${Math.round(data.metrics.response_time)}ms`
            });
        }

        // Check memory usage
        if (data.metrics?.memory_usage > this.alertThresholds.memory) {
            alerts.push({
                type: 'warning',
                message: `High memory usage: ${Math.round(data.metrics.memory_usage)}MB`
            });
        }

        // Check service health
        Object.entries(data).forEach(([service, status]) => {
            if (typeof status === 'string' && status.toLowerCase().includes('error')) {
                alerts.push({
                    type: 'error',
                    message: `${service} service error`
                });
            }
        });

        this.displayAlerts(alerts);
    }

    displayAlerts(alerts) {
        const alertsSection = document.getElementById(`alerts-section-${this.id}`);
        const alertsList = document.getElementById(`alerts-list-${this.id}`);

        if (!alertsSection || !alertsList) return;

        if (alerts.length === 0) {
            alertsSection.style.display = 'none';
            return;
        }

        alertsSection.style.display = 'block';
        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <span class="alert-icon">${alert.type === 'error' ? '❌' : '⚠️'}</span>
                <span class="alert-message">${alert.message}</span>
            </div>
        `).join('');
    }

    updateLastUpdated() {
        const element = document.getElementById(`last-updated-${this.id}`);
        if (element) {
            element.textContent = new Date().toLocaleTimeString();
        }
    }

    showErrorState(message) {
        const statusEl = document.getElementById(`health-status-${this.id}`);
        if (statusEl) {
            const indicator = statusEl.querySelector('.status-indicator');
            const text = statusEl.querySelector('.status-text');

            indicator.textContent = '❌';
            indicator.className = 'status-indicator error';
            text.textContent = message;
        }
    }

    startPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.loadSystemMetrics();
        }, this.refreshRate);
    }

    // Static methods for UI interactions
    static async refreshHealth(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (widget) {
            await widget.loadSystemMetrics();
        }
    }

    static async viewLogs(widgetId) {
        try {
            const response = await fetch('/api/health/logs?limit=50');
            if (response.ok) {
                const logs = await response.json();

                const logContent = logs.map(log =>
                    `<div class="log-entry ${log.level}">
                        <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
                        <span class="log-level">[${log.level.toUpperCase()}]</span>
                        <span class="log-message">${log.message}</span>
                    </div>`
                ).join('');

                Utils.showModal('System Logs', `
                    <div class="logs-viewer">
                        <div class="logs-header">
                            <h4>Recent System Logs</h4>
                            <button class="btn small" onclick="SystemMonitorWidget.downloadLogs()">Download All</button>
                        </div>
                        <div class="logs-content">
                            ${logContent || '<p>No logs available</p>'}
                        </div>
                    </div>
                `);
            } else {
                throw new Error('Failed to load logs');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            Utils.showError('Failed to load system logs');
        }
    }

    static async runDiagnostics(widgetId) {
        try {
            Utils.showInfo('Running system diagnostics...');

            const response = await fetch('/api/health/diagnostics', {
                method: 'POST'
            });

            if (response.ok) {
                const diagnostics = await response.json();

                const diagnosticContent = Object.entries(diagnostics).map(([test, result]) =>
                    `<div class="diagnostic-result ${result.status}">
                        <span class="diagnostic-name">${test}</span>
                        <span class="diagnostic-status">${result.status === 'pass' ? '✅' : '❌'}</span>
                        <span class="diagnostic-message">${result.message}</span>
                    </div>`
                ).join('');

                Utils.showModal('System Diagnostics', `
                    <div class="diagnostics-results">
                        <h4>Diagnostic Results</h4>
                        ${diagnosticContent}
                    </div>
                `);
            } else {
                throw new Error('Failed to run diagnostics');
            }
        } catch (error) {
            console.error('Error running diagnostics:', error);
            Utils.showError('Failed to run system diagnostics');
        }
    }

    static async exportReport(widgetId) {
        try {
            const response = await fetch('/api/health/report');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system-report-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                Utils.showSuccess('System report downloaded');
            } else {
                throw new Error('Failed to generate report');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            Utils.showError('Failed to export system report');
        }
    }

    static async downloadLogs() {
        try {
            const response = await fetch('/api/health/logs/download');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system-logs-${new Date().toISOString().split('T')[0]}.log`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                Utils.showSuccess('System logs downloaded');
            } else {
                throw new Error('Failed to download logs');
            }
        } catch (error) {
            console.error('Error downloading logs:', error);
            Utils.showError('Failed to download logs');
        }
    }

    onDestroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Register the widget
if (window.widgetSystem) {
    window.widgetSystem.registerWidget('system-monitor-widget', SystemMonitorWidget);
}
