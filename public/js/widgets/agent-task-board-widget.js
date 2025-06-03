class AgentTaskBoardWidget extends BaseWidget {
    constructor(containerId, config = {}) {
        super(containerId, config);
        this.type = 'agent-task-board';
        this.name = config.title || 'Task Board';
        this.showProgress = config.showProgress !== false;
        this.allowReassignment = config.allowReassignment !== false;
        
        // Task management state
        this.tasks = new Map(); // taskId -> task object
        this.taskColumns = {
            pending: 'Pending',
            assigned: 'Assigned', 
            in_progress: 'In Progress',
            review: 'Review',
            completed: 'Completed',
            failed: 'Failed'
        };
        
        this.filters = {
            priority: 'all',
            agent: 'all',
            status: 'all'
        };
        
        this.init();
    }

    async init() {
        await this.loadTasks();
        this.render();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupAutoRefresh();
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/agent-swarm/tasks');
            const data = await response.json();
            
            // Convert to Map for efficient lookup
            this.tasks.clear();
            (data.tasks || []).forEach(task => {
                this.tasks.set(task.id, task);
            });
            
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="agent-task-board">
                <div class="task-board-header">
                    <div class="board-title">
                        <h3><i class="fas fa-tasks"></i> Task Board</h3>
                        <div class="task-stats">
                            <span class="stat total">${this.tasks.size} Total</span>
                            <span class="stat active">${this.getTasksByStatus(['assigned', 'in_progress']).length} Active</span>
                            <span class="stat completed">${this.getTasksByStatus(['completed']).length} Done</span>
                        </div>
                    </div>
                    
                    <div class="board-controls">
                        <div class="filters">
                            <select id="priorityFilter" class="filter-select">
                                <option value="all">All Priorities</option>
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                            </select>
                            
                            <select id="agentFilter" class="filter-select">
                                <option value="all">All Agents</option>
                                ${this.getUniqueAgents().map(agent => 
                                    `<option value="${agent}">${agent}</option>`
                                ).join('')}
                            </select>
                            
                            <input type="text" id="searchTasks" placeholder="Search tasks..." class="search-input">
                        </div>
                        
                        <div class="board-actions">
                            <button class="btn btn-sm btn-primary" id="addTask">
                                <i class="fas fa-plus"></i> Add Task
                            </button>
                            <button class="btn btn-sm btn-secondary" id="refreshBoard">
                                <i class="fas fa-sync"></i> Refresh
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" id="exportTasks">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                </div>

                <div class="task-board-content">
                    <div class="task-columns" id="taskColumns">
                        ${this.renderTaskColumns()}
                    </div>
                </div>

                <div class="task-board-footer">
                    <div class="board-legend">
                        <div class="legend-item">
                            <span class="priority-indicator urgent"></span> Urgent
                        </div>
                        <div class="legend-item">
                            <span class="priority-indicator high"></span> High
                        </div>
                        <div class="legend-item">
                            <span class="priority-indicator normal"></span> Normal
                        </div>
                        <div class="legend-item">
                            <span class="priority-indicator low"></span> Low
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTaskColumns() {
        return Object.entries(this.taskColumns).map(([status, title]) => {
            const tasks = this.getTasksByStatus([status]);
            return `
                <div class="task-column" data-status="${status}">
                    <div class="column-header">
                        <h4>${title}</h4>
                        <span class="task-count">${tasks.length}</span>
                    </div>
                    <div class="column-content" data-status="${status}">
                        ${tasks.map(task => this.renderTaskCard(task)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTaskCard(task) {
        const createdDate = new Date(task.created).toLocaleDateString();
        const timeAgo = this.getTimeAgo(task.created);
        
        return `
            <div class="task-card" data-task-id="${task.id}" draggable="true">
                <div class="task-header">
                    <div class="task-priority priority-${task.priority}">
                        <span class="priority-indicator ${task.priority}"></span>
                        ${task.priority}
                    </div>
                    <div class="task-actions">
                        <button class="btn-icon" onclick="this.closest('.agent-task-board').parentWidget.editTask('${task.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="this.closest('.agent-task-board').parentWidget.deleteTask('${task.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="task-content">
                    <div class="task-title">${task.title || task.description.substring(0, 50) + '...'}</div>
                    <div class="task-description">${task.description}</div>
                </div>
                
                <div class="task-meta">
                    ${task.assignedTo ? `
                        <div class="assigned-agent">
                            <i class="fas fa-robot"></i>
                            <span>${task.assignedTo}</span>
                        </div>
                    ` : ''}
                    
                    ${task.specialization ? `
                        <div class="task-specialization">
                            <i class="fas fa-tag"></i>
                            <span>${task.specialization}</span>
                        </div>
                    ` : ''}
                    
                    <div class="task-timestamp">
                        <i class="fas fa-clock"></i>
                        <span title="${createdDate}">${timeAgo}</span>
                    </div>
                </div>
                
                ${this.showProgress && task.progress ? `
                    <div class="task-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${task.progress}%"></div>
                        </div>
                        <span class="progress-text">${task.progress}%</span>
                    </div>
                ` : ''}
                
                ${task.subtasks && task.subtasks.length > 0 ? `
                    <div class="task-subtasks">
                        <i class="fas fa-list"></i>
                        <span>${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} subtasks</span>
                    </div>
                ` : ''}
                
                ${task.estimatedTime ? `
                    <div class="task-estimate">
                        <i class="fas fa-hourglass-half"></i>
                        <span>~${task.estimatedTime}min</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getTasksByStatus(statuses) {
        const filteredTasks = Array.from(this.tasks.values()).filter(task => {
            // Status filter
            if (!statuses.includes(task.status)) return false;
            
            // Priority filter
            if (this.filters.priority !== 'all' && task.priority !== this.filters.priority) return false;
            
            // Agent filter
            if (this.filters.agent !== 'all' && task.assignedTo !== this.filters.agent) return false;
            
            return true;
        });
        
        // Sort by priority and creation date
        return filteredTasks.sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
            const aPriority = priorityOrder[a.priority] || 2;
            const bPriority = priorityOrder[b.priority] || 2;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            return new Date(b.created) - new Date(a.created);
        });
    }

    getUniqueAgents() {
        const agents = new Set();
        Array.from(this.tasks.values()).forEach(task => {
            if (task.assignedTo) {
                agents.add(task.assignedTo);
            }
        });
        return Array.from(agents);
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    setupEventListeners() {
        // Filter controls
        this.container.querySelector('#priorityFilter').addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.applyFilters();
        });

        this.container.querySelector('#agentFilter').addEventListener('change', (e) => {
            this.filters.agent = e.target.value;
            this.applyFilters();
        });

        this.container.querySelector('#searchTasks').addEventListener('input', (e) => {
            this.searchTasks(e.target.value);
        });

        // Action buttons
        this.container.querySelector('#addTask').addEventListener('click', () => {
            this.showAddTaskModal();
        });

        this.container.querySelector('#refreshBoard').addEventListener('click', () => {
            this.refreshBoard();
        });

        this.container.querySelector('#exportTasks').addEventListener('click', () => {
            this.exportTasks();
        });

        // Store reference for task card actions
        this.container.parentWidget = this;
    }

    setupDragAndDrop() {
        const columns = this.container.querySelectorAll('.column-content');
        
        // Add drag event listeners to task cards
        this.container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.taskId);
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        // Add drop event listeners to columns
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = column.dataset.status;
                
                await this.moveTask(taskId, newStatus);
            });
        });
    }

    async moveTask(taskId, newStatus) {
        try {
            const response = await fetch(`/api/agent-swarm/tasks/${taskId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Update local state
                const task = this.tasks.get(taskId);
                if (task) {
                    task.status = newStatus;
                    task.updated = new Date().toISOString();
                }
                
                this.render();
                this.broadcastTaskEvent('task:moved', { taskId, newStatus });
            } else {
                throw new Error('Failed to update task status');
            }

        } catch (error) {
            console.error('Error moving task:', error);
            this.showError('Failed to move task');
        }
    }

    applyFilters() {
        this.render();
    }

    searchTasks(query) {
        const cards = this.container.querySelectorAll('.task-card');
        const searchLower = query.toLowerCase();
        
        cards.forEach(card => {
            const taskId = card.dataset.taskId;
            const task = this.tasks.get(taskId);
            
            if (!task) return;
            
            const searchText = `${task.title || ''} ${task.description} ${task.assignedTo || ''}`.toLowerCase();
            const matches = searchText.includes(searchLower);
            
            card.style.display = matches ? '' : 'none';
        });
    }

    showAddTaskModal() {
        // Create and show task creation modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content task-modal">
                <div class="modal-header">
                    <h3>Add New Task</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addTaskForm">
                        <div class="form-group">
                            <label>Task Title:</label>
                            <input type="text" id="taskTitle" required>
                        </div>
                        <div class="form-group">
                            <label>Description:</label>
                            <textarea id="taskDescription" rows="4" required></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Priority:</label>
                                <select id="taskPriority">
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Specialization:</label>
                                <select id="taskSpecialization">
                                    <option value="general">General</option>
                                    <option value="research">Research</option>
                                    <option value="writing">Writing</option>
                                    <option value="coding">Coding</option>
                                    <option value="creative">Creative</option>
                                    <option value="data">Data Processing</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Estimated Time (minutes):</label>
                            <input type="number" id="taskEstimate" min="1" value="30">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal">Cancel</button>
                    <button class="btn btn-primary" id="saveTask">Create Task</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#saveTask').addEventListener('click', () => {
            this.createTask(modal);
        });
    }

    async createTask(modal) {
        const formData = {
            title: modal.querySelector('#taskTitle').value,
            description: modal.querySelector('#taskDescription').value,
            priority: modal.querySelector('#taskPriority').value,
            specialization: modal.querySelector('#taskSpecialization').value,
            estimatedTime: parseInt(modal.querySelector('#taskEstimate').value),
            status: 'pending',
            created: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/agent-swarm/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newTask = await response.json();
                this.tasks.set(newTask.id, newTask);
                this.render();
                document.body.removeChild(modal);
                this.broadcastTaskEvent('task:created', { taskId: newTask.id });
            } else {
                throw new Error('Failed to create task');
            }

        } catch (error) {
            console.error('Error creating task:', error);
            this.showError('Failed to create task');
        }
    }

    async editTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        // Similar modal to addTask but pre-filled with task data
        console.log('Editing task:', taskId);
        // Implementation would be similar to showAddTaskModal but with edit functionality
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(`/api/agent-swarm/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.tasks.delete(taskId);
                this.render();
                this.broadcastTaskEvent('task:deleted', { taskId });
            } else {
                throw new Error('Failed to delete task');
            }

        } catch (error) {
            console.error('Error deleting task:', error);
            this.showError('Failed to delete task');
        }
    }

    async refreshBoard() {
        await this.loadTasks();
        this.render();
        this.setupDragAndDrop();
    }

    exportTasks() {
        const tasks = Array.from(this.tasks.values());
        const data = {
            exportDate: new Date().toISOString(),
            totalTasks: tasks.length,
            tasks: tasks
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-board-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    setupAutoRefresh() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refreshBoard();
        }, 30000);
    }

    broadcastTaskEvent(eventType, data) {
        if (window.EventBus) {
            window.EventBus.emit(eventType, {
                boardId: this.id,
                timestamp: new Date().toISOString(),
                ...data
            });
        }
    }

    // Event handlers for external events
    onTaskAssigned(data) {
        if (this.tasks.has(data.taskId)) {
            const task = this.tasks.get(data.taskId);
            task.status = 'assigned';
            task.assignedTo = data.agentName || data.agentId;
            task.updated = new Date().toISOString();
            this.render();
        }
    }

    onTaskCompleted(data) {
        if (this.tasks.has(data.taskId)) {
            const task = this.tasks.get(data.taskId);
            task.status = 'completed';
            task.progress = 100;
            task.completed = new Date().toISOString();
            this.render();
        }
    }

    onTaskFailed(data) {
        if (this.tasks.has(data.taskId)) {
            const task = this.tasks.get(data.taskId);
            task.status = 'failed';
            task.error = data.error;
            task.updated = new Date().toISOString();
            this.render();
        }
    }

    showError(message) {
        console.error('Task Board Error:', message);
        // Could implement toast notifications
    }

    destroy() {
        // Cleanup when widget is destroyed
        super.destroy();
    }
}

// Register widget
if (window.WidgetFactory) {
    window.WidgetFactory.register('agent-task-board', AgentTaskBoardWidget);
}