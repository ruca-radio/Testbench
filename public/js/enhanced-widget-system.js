// Enhanced Widget System with Workspace Types
class EnhancedWidgetSystem {
    constructor() {
        this.widgets = new Map();
        this.currentWorkspace = null;
        this.gridSize = 50; // pixels per grid unit
        this.gridCols = 12;
        this.gridRows = 12;
        this.isEditMode = false;
        this.widgetContainer = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        console.log('Initializing Enhanced Widget System...');

        // Load required scripts
        await this.loadDependencies();

        // Setup UI
        this.setupUI();

        // Load saved workspace or create default
        await this.loadWorkspace();

        // Setup event listeners
        this.setupEventListeners();

        this.initialized = true;
        console.log('Enhanced Widget System initialized');
    }

    async loadDependencies() {
        // Scripts to load
        const scripts = [
            '/js/workspace-types.js',
            '/js/widget-factory.js',
            '/js/widgets/base-widget.js',
            '/js/widgets/agent-orchestrator-widget.js',
            '/js/widgets/model-comparison-widget.js'
        ];

        // Load scripts in sequence
        for (const script of scripts) {
            try {
                await this.loadScript(script);
            } catch (error) {
                console.warn(`Failed to load ${script}:`, error);
            }
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    setupUI() {
        // Find or create widget container
        this.widgetContainer = document.getElementById('widget-container');
        if (!this.widgetContainer) {
            // Create main widget container
            this.widgetContainer = document.createElement('div');
            this.widgetContainer.id = 'widget-container';
            this.widgetContainer.className = 'widget-container';

            // Find main content area
            const mainContent = document.querySelector('.chat-main') || document.body;
            mainContent.appendChild(this.widgetContainer);
        }

        // Add workspace selector
        this.addWorkspaceSelector();

        // Add widget mode toggle
        this.addWidgetModeToggle();
    }

    addWorkspaceSelector() {
        const selector = document.getElementById('workspace-type-selector');
        if (selector) return;

        const selectorHTML = `
            <div id="workspace-type-selector" class="workspace-type-selector">
                <label>Workspace Type:</label>
                <select id="workspace-type-select" onchange="window.enhancedWidgetSystem.changeWorkspaceType(this.value)">
                    ${Object.entries(WorkspaceTypes.types).map(([id, type]) => `
                        <option value="${id}">${type.icon} ${type.name}</option>
                    `).join('')}
                </select>
                <button class="btn small" onclick="window.enhancedWidgetSystem.toggleEditMode()">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/>
                    </svg>
                    Edit Layout
                </button>
            </div>
        `;

        const header = document.querySelector('.model-bar') || document.querySelector('.app-container');
        if (header) {
            header.insertAdjacentHTML('afterbegin', selectorHTML);
        }
    }

    addWidgetModeToggle() {
        const toolbar = document.getElementById('widget-toolbar');
        if (!toolbar) return;

        // Update toolbar visibility based on edit mode
        toolbar.style.display = this.isEditMode ? 'block' : 'none';
    }

    setupEventListeners() {
        // Add widget button
        const addWidgetBtn = document.getElementById('add-widget-btn');
        if (addWidgetBtn) {
            addWidgetBtn.addEventListener('click', () => this.showAddWidgetDialog());
        }

        // Save/Load layout buttons
        const saveLayoutBtn = document.getElementById('save-layout-btn');
        if (saveLayoutBtn) {
            saveLayoutBtn.addEventListener('click', () => this.saveLayout());
        }

        const loadLayoutBtn = document.getElementById('load-layout-btn');
        if (loadLayoutBtn) {
            loadLayoutBtn.addEventListener('click', () => this.loadLayout());
        }

        // Reset layout button
        const resetLayoutBtn = document.getElementById('reset-layout-btn');
        if (resetLayoutBtn) {
            resetLayoutBtn.addEventListener('click', () => this.resetLayout());
        }

        // Exit widget mode button
        const exitBtn = document.getElementById('exit-widget-mode-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.toggleEditMode());
        }
    }

    async loadWorkspace(workspaceId = null) {
        try {
            // Load from localStorage or create new
            const savedWorkspace = localStorage.getItem('current_workspace');

            if (savedWorkspace) {
                this.currentWorkspace = JSON.parse(savedWorkspace);
                // Migrate old format if needed
                this.currentWorkspace = WorkspaceTypes.migrateWorkspace(this.currentWorkspace);
            } else {
                // Create default chat workspace
                this.currentWorkspace = WorkspaceTypes.createWorkspace('chat', 'Default Workspace');
            }

            // Update UI
            const typeSelect = document.getElementById('workspace-type-select');
            if (typeSelect) {
                typeSelect.value = this.currentWorkspace.type;
            }

            // Load widgets
            await this.loadWidgets();
        } catch (error) {
            console.error('Error loading workspace:', error);
            // Create fallback workspace
            this.currentWorkspace = WorkspaceTypes.createWorkspace('chat', 'Fallback Workspace');
            await this.loadWidgets();
        }
    }

    async loadWidgets() {
        // Clear existing widgets
        this.clearWidgets();

        // Update container layout
        this.updateContainerLayout();

        // Load widgets from workspace
        const widgets = this.currentWorkspace.layout?.widgets || [];

        for (const widgetData of widgets) {
            await this.addWidget(widgetData.type, widgetData);
        }
    }

    updateContainerLayout() {
        if (!this.widgetContainer) return;

        // Set grid layout
        this.widgetContainer.style.display = 'grid';
        this.widgetContainer.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
        this.widgetContainer.style.gridTemplateRows = `repeat(${this.gridRows}, ${this.gridSize}px)`;
        this.widgetContainer.style.gap = '10px';
        this.widgetContainer.style.padding = '10px';
        this.widgetContainer.className = `widget-container ${this.isEditMode ? 'edit-mode' : ''}`;
    }

    async addWidget(type, config = {}) {
        try {
            // Create widget instance
            const widgetData = WidgetFactory.createWidget(type, config);
            if (!widgetData) return null;

            // Get widget component
            const WidgetComponent = WidgetFactory.getWidgetComponent(widgetData.component);

            // Create widget instance
            const widget = new WidgetComponent(widgetData);

            // Create DOM element
            const element = widget.createElement();
            this.widgetContainer.appendChild(element);

            // Initialize widget
            await widget.init();

            // Store widget
            this.widgets.set(widgetData.id, widget);

            // Update workspace
            this.updateWorkspaceLayout();

            return widget;
        } catch (error) {
            console.error('Error adding widget:', error);
            Utils.showError(`Failed to add widget: ${error.message}`);
            return null;
        }
    }

    removeWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;

        // Call cleanup
        widget.onDestroy();

        // Remove from DOM
        if (widget.element) {
            widget.element.remove();
        }

        // Remove from map
        this.widgets.delete(widgetId);

        // Update workspace
        this.updateWorkspaceLayout();
    }

    clearWidgets() {
        // Remove all widgets
        this.widgets.forEach(widget => {
            widget.onDestroy();
            if (widget.element) {
                widget.element.remove();
            }
        });
        this.widgets.clear();
    }

    updateWorkspaceLayout() {
        if (!this.currentWorkspace) return;

        // Update widget layout in workspace
        this.currentWorkspace.layout.widgets = Array.from(this.widgets.values()).map(widget => ({
            type: widget.type,
            position: widget.position,
            config: widget.config,
            state: widget.state
        }));

        // Save to localStorage
        this.saveWorkspace();
    }

    saveWorkspace() {
        if (!this.currentWorkspace) return;

        this.currentWorkspace.modified = new Date().toISOString();
        localStorage.setItem('current_workspace', JSON.stringify(this.currentWorkspace));
    }

    changeWorkspaceType(typeId) {
        if (this.currentWorkspace.type === typeId) return;

        if (confirm(`Change workspace type to ${WorkspaceTypes.getType(typeId).name}? This will reset your layout.`)) {
            // Create new workspace of selected type
            const newWorkspace = WorkspaceTypes.createWorkspace(typeId, this.currentWorkspace.name);
            this.currentWorkspace = newWorkspace;

            // Reload widgets
            this.loadWidgets();
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;

        // Update UI
        this.updateContainerLayout();

        // Update toolbar
        const toolbar = document.getElementById('widget-toolbar');
        if (toolbar) {
            toolbar.style.display = this.isEditMode ? 'block' : 'none';
        }

        // Update widgets
        this.widgets.forEach(widget => {
            widget.element.classList.toggle('edit-mode', this.isEditMode);
        });

        // Update button text
        const editBtn = document.querySelector('.workspace-type-selector button');
        if (editBtn) {
            editBtn.innerHTML = this.isEditMode ?
                '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg> Exit Edit' :
                '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/></svg> Edit Layout';
        }
    }

    showAddWidgetDialog() {
        const modal = document.createElement('div');
        modal.className = 'widget-add-modal modal';
        modal.style.display = 'flex';

        const categories = WidgetFactory.getAllCategories();

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Widget</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="widget-categories">
                        ${categories.map(category => `
                            <div class="widget-category">
                                <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                                <div class="widget-grid">
                                    ${WidgetFactory.getWidgetsByCategory(category).map(widget => `
                                        <div class="widget-option" onclick="window.enhancedWidgetSystem.addWidgetFromDialog('${widget.type}')">
                                            <div class="widget-icon">${widget.icon}</div>
                                            <div class="widget-name">${widget.name}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async addWidgetFromDialog(type) {
        // Close dialog
        document.querySelector('.widget-add-modal')?.remove();

        // Find free position
        const position = WidgetFactory.findFreePosition(type, Array.from(this.widgets.values()));

        if (!position) {
            Utils.showError('No free space for widget. Please remove or rearrange existing widgets.');
            return;
        }

        // Add widget
        await this.addWidget(type, { position });
    }

    handleWidgetDrop(widgetId, clientX, clientY) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;

        // Calculate grid position from client coordinates
        const containerRect = this.widgetContainer.getBoundingClientRect();
        const relX = clientX - containerRect.left;
        const relY = clientY - containerRect.top;

        const newX = Math.floor(relX / (containerRect.width / this.gridCols));
        const newY = Math.floor(relY / this.gridSize);

        // Validate and update position
        const newPosition = {
            x: Math.max(0, Math.min(newX, this.gridCols - widget.position.w)),
            y: Math.max(0, Math.min(newY, this.gridRows - widget.position.h)),
            w: widget.position.w,
            h: widget.position.h
        };

        // Check if position is valid
        if (WidgetFactory.canPlaceWidget({ ...widget, position: newPosition },
            Array.from(this.widgets.values()).filter(w => w.id !== widgetId))) {
            widget.position = newPosition;
            widget.updatePosition();
            this.updateWorkspaceLayout();
        }
    }

    updateWidgetPosition(widgetId, position) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;

        widget.position = position;
        this.updateWorkspaceLayout();
    }

    saveWidgetSettings(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;

        // Get settings from modal
        const titleInput = document.getElementById('widget-title');
        if (titleInput) {
            widget.updateConfig({ title: titleInput.value });
        }

        // Close modal
        document.querySelector('.widget-settings-modal')?.remove();

        // Save workspace
        this.updateWorkspaceLayout();
    }

    saveLayout() {
        const layoutName = prompt('Enter layout name:');
        if (!layoutName) return;

        const layouts = JSON.parse(localStorage.getItem('saved_layouts') || '{}');
        layouts[layoutName] = {
            workspace: this.currentWorkspace,
            saved: new Date().toISOString()
        };

        localStorage.setItem('saved_layouts', JSON.stringify(layouts));
        Utils.showSuccess(`Layout "${layoutName}" saved`);
    }

    loadLayout() {
        const layouts = JSON.parse(localStorage.getItem('saved_layouts') || '{}');
        const layoutNames = Object.keys(layouts);

        if (layoutNames.length === 0) {
            Utils.showInfo('No saved layouts found');
            return;
        }

        const layoutName = prompt(`Select layout:\n${layoutNames.join('\n')}`);
        if (!layoutName || !layouts[layoutName]) return;

        this.currentWorkspace = layouts[layoutName].workspace;
        this.loadWidgets();
        Utils.showSuccess(`Layout "${layoutName}" loaded`);
    }

    resetLayout() {
        if (!confirm('Reset to default layout for this workspace type?')) return;

        const type = this.currentWorkspace.type;
        this.currentWorkspace = WorkspaceTypes.createWorkspace(type, this.currentWorkspace.name);
        this.loadWidgets();
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedWidgetSystem = new EnhancedWidgetSystem();

    // Auto-initialize only if explicitly enabled (opt-in only)
    // setTimeout(() => {
    //     if (document.querySelector('.chat-main') || document.getElementById('widget-container')) {
    //         window.enhancedWidgetSystem.init();
    //     }
    // }, 1000);
});

// Export for global access
window.EnhancedWidgetSystem = EnhancedWidgetSystem;
