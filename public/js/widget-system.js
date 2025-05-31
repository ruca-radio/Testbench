// Widget System - Drag-and-drop customizable interface components
class WidgetSystem {
    constructor() {
        this.widgets = new Map();
        this.widgetRegistry = new Map();
        this.layouts = new Map();
        this.currentLayout = 'default';
        this.draggedWidget = null;
        this.isInitialized = false;
        this.widgetAreas = ['left-sidebar', 'main-area', 'right-sidebar'];
        this.testBenchIntegration = false;
        this.editMode = false;
    }

    static async init() {
        if (!window.widgetSystem) {
            window.widgetSystem = new WidgetSystem();
        }

        await window.widgetSystem.initialize();
        console.log('WidgetSystem initialized');
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.loadCoreWidgets();
            await this.setupWidgetAreas();
            await this.loadSavedLayout();
            this.setupEventListeners();
            this.setupTestBenchIntegration();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Widget System:', error);
        }
    }

    // === WIDGET REGISTRATION ===
    registerWidget(name, widgetClass) {
        if (!widgetClass.prototype || typeof widgetClass.prototype.render !== 'function') {
            throw new Error(`Widget ${name} must have a render method`);
        }

        this.widgetRegistry.set(name, widgetClass);
        console.log(`Registered widget: ${name}`);
    }

    async loadCoreWidgets() {
        // Core widgets will be loaded dynamically
        const coreWidgets = [
            'chat-widget',
            'agent-status-widget',
            'system-monitor-widget',
            'quick-config-widget',
            'conversation-history-widget'
        ];

        for (const widgetName of coreWidgets) {
            try {
                await this.loadWidget(widgetName);
            } catch (error) {
                console.warn(`Failed to load core widget ${widgetName}:`, error);
            }
        }
    }

    async loadWidget(widgetName) {
        try {
            // For now, we'll register placeholder widgets since the actual widget files will be created next
            this.registerPlaceholderWidget(widgetName);
        } catch (error) {
            console.error(`Error loading widget ${widgetName}:`, error);
        }
    }

    registerPlaceholderWidget(widgetName) {
        // Create a temporary widget class until the actual widgets are implemented
        class PlaceholderWidget {
            constructor(id, config = {}) {
                this.id = id;
                this.config = config;
                this.title = config.title || widgetName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            }

            getTitle() { return this.title; }
            getIcon() { return '🧩'; }

            render() {
                return `
                    <div class="widget-content placeholder-widget">
                        <h4>${this.title}</h4>
                        <p>Widget implementation coming soon...</p>
                        ${this.config.existingContent ? this.renderExistingContent() : ''}
                    </div>
                `;
            }

            renderExistingContent() {
                if (!this.config.existingContent) return '';
                const contentHTML = this.config.existingContent.map(el => el.outerHTML).join('');
                return `<div class="existing-content">${contentHTML}</div>`;
            }

            onMounted(container) {
                // Placeholder for widget-specific initialization
            }

            onDestroy() {
                // Cleanup when widget is removed
            }
        }

        this.registerWidget(widgetName, PlaceholderWidget);
    }

    // === WIDGET AREAS SETUP ===
    async setupWidgetAreas() {
        // Convert existing layout to widget areas
        const mainContainer = document.querySelector('.main-container');
        if (!mainContainer) {
            console.error('Main container not found - cannot setup widget areas');
            return;
        }

        // Add widget toolbar
        this.createWidgetToolbar();

        // Make existing areas widget-compatible
        this.setupWidgetArea('left-sidebar', document.querySelector('.workspace-sidebar'));
        this.setupWidgetArea('main-area', document.querySelector('.chat-main'));
        this.setupWidgetArea('right-sidebar', document.querySelector('.config-sidebar'));

        // Add widget drop zones
        this.addDropZones();
    }

    setupWidgetArea(areaId, element) {
        if (!element) return;

        element.classList.add('widget-area');
        element.setAttribute('data-widget-area', areaId);
        element.addEventListener('dragover', this.handleDragOver.bind(this));
        element.addEventListener('drop', this.handleDrop.bind(this));

        // Wrap existing content in widget containers
        this.wrapExistingContent(element, areaId);
    }

    wrapExistingContent(element, areaId) {
        const existingContent = Array.from(element.children);
        element.innerHTML = '';

        // Create default widgets based on existing content
        switch (areaId) {
            case 'left-sidebar':
                this.createWidget('conversation-history-widget', areaId, {
                    title: 'Conversations',
                    existingContent: existingContent
                });
                break;
            case 'main-area':
                this.createWidget('chat-widget', areaId, {
                    title: 'Chat',
                    existingContent: existingContent
                });
                break;
            case 'right-sidebar':
                this.createWidget('agent-status-widget', areaId, {
                    title: 'Agents',
                    existingContent: existingContent.slice(0, Math.ceil(existingContent.length / 2))
                });
                this.createWidget('quick-config-widget', areaId, {
                    title: 'Quick Config',
                    existingContent: existingContent.slice(Math.ceil(existingContent.length / 2))
                });
                break;
        }
    }

    addDropZones() {
        this.widgetAreas.forEach(areaId => {
            const area = document.querySelector(`[data-widget-area="${areaId}"]`);
            if (area) {
                const dropZone = document.createElement('div');
                dropZone.className = 'widget-drop-zone';
                dropZone.innerHTML = '<span>Drop widgets here</span>';
                dropZone.style.display = 'none'; // Hidden by default
                area.appendChild(dropZone);
            }
        });
    }

    createWidgetToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'widget-toolbar';
        toolbar.innerHTML = `
            <div class="widget-toolbar-content">
                <h4>🧩 Widget System</h4>
                <div class="widget-controls">
                    <button class="btn small" onclick="WidgetSystem.showWidgetLibrary()">+ Add Widget</button>
                    <button class="btn small" onclick="WidgetSystem.saveLayout()">💾 Save Layout</button>
                    <button class="btn small" onclick="WidgetSystem.loadLayout()">📁 Load Layout</button>
                    <button class="btn small" onclick="WidgetSystem.resetLayout()">🔄 Reset</button>
                    <button class="btn small" onclick="WidgetSystem.toggleEditMode()" id="edit-mode-btn">✏️ Edit Mode</button>
                </div>
            </div>
        `;

        // Insert toolbar at the top of the main container
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.insertBefore(toolbar, mainContainer.firstChild);
        }
    }

    // === WIDGET CREATION & MANAGEMENT ===
    createWidget(widgetType, areaId, config = {}) {
        const widgetClass = this.widgetRegistry.get(widgetType);
        if (!widgetClass) {
            console.error(`Widget type not registered: ${widgetType}`);
            return null;
        }

        const widgetId = this.generateWidgetId(widgetType);
        const widget = new widgetClass(widgetId, config);

        this.widgets.set(widgetId, widget);

        // Create widget container
        const container = this.createWidgetContainer(widgetId, widget);

        // Add to specified area
        const area = document.querySelector(`[data-widget-area="${areaId}"]`);
        if (area) {
            const dropZone = area.querySelector('.widget-drop-zone');
            if (dropZone) {
                area.insertBefore(container, dropZone);
            } else {
                area.appendChild(container);
            }
            widget.onMounted(container);
        }

        return widget;
    }

    createWidgetContainer(widgetId, widget) {
        const container = document.createElement('div');
        container.className = 'widget-container';
        container.setAttribute('data-widget-id', widgetId);
        container.draggable = true;

        container.innerHTML = `
            <div class="widget-header">
                <div class="widget-title">
                    <span class="widget-icon">${widget.getIcon()}</span>
                    <span class="widget-name">${widget.getTitle()}</span>
                </div>
                <div class="widget-controls">
                    <button class="widget-btn minimize" onclick="WidgetSystem.minimizeWidget('${widgetId}')" title="Minimize">−</button>
                    <button class="widget-btn configure" onclick="WidgetSystem.configureWidget('${widgetId}')" title="Configure">⚙️</button>
                    <button class="widget-btn remove" onclick="WidgetSystem.removeWidget('${widgetId}')" title="Remove">×</button>
                </div>
            </div>
            <div class="widget-body">
                ${widget.render()}
            </div>
        `;

        // Add drag event listeners
        container.addEventListener('dragstart', this.handleDragStart.bind(this));
        container.addEventListener('dragend', this.handleDragEnd.bind(this));

        return container;
    }

    generateWidgetId(widgetType) {
        const timestamp = Date.now();
        return `${widgetType}-${timestamp}`;
    }

    // === DRAG & DROP ===
    handleDragStart(e) {
        this.draggedWidget = e.target.closest('.widget-container');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.draggedWidget.outerHTML);
        this.draggedWidget.classList.add('dragging');

        // Show drop zones
        document.querySelectorAll('.widget-drop-zone').forEach(zone => {
            zone.style.display = 'block';
        });
    }

    handleDragEnd(e) {
        this.draggedWidget?.classList.remove('dragging');
        this.draggedWidget = null;

        // Hide drop zones
        document.querySelectorAll('.widget-drop-zone').forEach(zone => {
            zone.style.display = 'none';
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const area = e.currentTarget;
        area.classList.add('drag-over');

        setTimeout(() => area.classList.remove('drag-over'), 100);
    }

    handleDrop(e) {
        e.preventDefault();

        if (!this.draggedWidget) return;

        const targetArea = e.currentTarget;
        const areaId = targetArea.getAttribute('data-widget-area');

        // Move the widget to the new area
        const dropZone = targetArea.querySelector('.widget-drop-zone');
        if (dropZone) {
            targetArea.insertBefore(this.draggedWidget, dropZone);
        } else {
            targetArea.appendChild(this.draggedWidget);
        }

        // Update widget location in memory
        const widgetId = this.draggedWidget.getAttribute('data-widget-id');
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.areaId = areaId;
        }

        this.saveLayoutToStorage();
    }

    // === WIDGET ACTIONS ===
    static minimizeWidget(widgetId) {
        const container = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (container) {
            const body = container.querySelector('.widget-body');
            const minimizeBtn = container.querySelector('.minimize');

            if (body.style.display === 'none') {
                body.style.display = 'block';
                minimizeBtn.textContent = '−';
                container.classList.remove('minimized');
            } else {
                body.style.display = 'none';
                minimizeBtn.textContent = '+';
                container.classList.add('minimized');
            }
        }
    }

    static configureWidget(widgetId) {
        const widget = window.widgetSystem.widgets.get(widgetId);
        if (!widget) return;

        Utils.showModal(`Configure ${widget.getTitle()}`, `
            <div class="widget-config-form">
                <div class="settings-group">
                    <label for="widget-title">Widget Title:</label>
                    <input type="text" id="widget-title" value="${widget.getTitle()}">
                </div>
                <div class="settings-group">
                    <label for="widget-refresh-rate">Refresh Rate (seconds):</label>
                    <input type="number" id="widget-refresh-rate" value="30" min="5" max="300">
                </div>
                <div class="settings-group">
                    <label for="widget-auto-update">Auto Update:</label>
                    <input type="checkbox" id="widget-auto-update" checked>
                </div>
            </div>
        `, () => {
            WidgetSystem.applyWidgetConfig(widgetId);
        });
    }

    static applyWidgetConfig(widgetId) {
        const newTitle = document.getElementById('widget-title').value;
        const refreshRate = document.getElementById('widget-refresh-rate').value;
        const autoUpdate = document.getElementById('widget-auto-update').checked;

        const container = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (container) {
            const titleElement = container.querySelector('.widget-name');
            if (titleElement) {
                titleElement.textContent = newTitle;
            }
        }

        const widget = window.widgetSystem.widgets.get(widgetId);
        if (widget) {
            widget.title = newTitle;
            widget.refreshRate = refreshRate;
            widget.autoUpdate = autoUpdate;
        }

        Utils.showSuccess('Widget configuration updated');
    }

    static removeWidget(widgetId) {
        if (!confirm('Are you sure you want to remove this widget?')) return;

        const container = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (container) {
            const widget = window.widgetSystem.widgets.get(widgetId);
            if (widget && typeof widget.onDestroy === 'function') {
                widget.onDestroy();
            }

            container.remove();
            window.widgetSystem.widgets.delete(widgetId);
            window.widgetSystem.saveLayoutToStorage();
        }
    }

    // === LAYOUT MANAGEMENT ===
    static saveLayout() {
        const layoutName = prompt('Enter layout name:');
        if (!layoutName) return;

        const layout = window.widgetSystem.getCurrentLayout();
        window.widgetSystem.layouts.set(layoutName, layout);

        // Save to localStorage
        localStorage.setItem('widgetLayouts', JSON.stringify([...window.widgetSystem.layouts]));

        Utils.showSuccess(`Layout "${layoutName}" saved`);
    }

    static loadLayout() {
        const layouts = [...window.widgetSystem.layouts.keys()];
        if (layouts.length === 0) {
            Utils.showError('No saved layouts available');
            return;
        }

        const layoutOptions = layouts.map(name =>
            `<option value="${name}">${name}</option>`
        ).join('');

        Utils.showModal('Load Layout', `
            <div class="layout-load-form">
                <div class="settings-group">
                    <label for="layout-select">Available Layouts:</label>
                    <select id="layout-select">
                        ${layoutOptions}
                    </select>
                </div>
                <p class="warning">⚠️ This will replace the current layout.</p>
            </div>
        `, () => {
            WidgetSystem.applyLayout();
        });
    }

    static applyLayout() {
        const layoutName = document.getElementById('layout-select').value;
        const layout = window.widgetSystem.layouts.get(layoutName);

        if (layout) {
            window.widgetSystem.applyLayoutData(layout);
            Utils.showSuccess(`Layout "${layoutName}" applied`);
        }
    }

    static resetLayout() {
        if (!confirm('Reset to default layout? This will remove all custom widgets.')) return;

        // Clear all widgets
        window.widgetSystem.widgets.clear();

        // Clear widget areas
        document.querySelectorAll('.widget-area').forEach(area => {
            area.innerHTML = '';
        });

        // Recreate default layout
        window.widgetSystem.setupWidgetAreas();

        Utils.showSuccess('Layout reset to default');
    }

    static toggleEditMode() {
        window.widgetSystem.editMode = !window.widgetSystem.editMode;
        const btn = document.getElementById('edit-mode-btn');

        if (window.widgetSystem.editMode) {
            btn.textContent = '👁️ View Mode';
            btn.classList.add('active');
            document.body.classList.add('widget-edit-mode');

            // Show widget controls
            document.querySelectorAll('.widget-controls').forEach(controls => {
                controls.style.display = 'flex';
            });
        } else {
            btn.textContent = '✏️ Edit Mode';
            btn.classList.remove('active');
            document.body.classList.remove('widget-edit-mode');

            // Hide widget controls
            document.querySelectorAll('.widget-controls').forEach(controls => {
                controls.style.display = 'none';
            });
        }
    }

    static showWidgetLibrary() {
        const availableWidgets = [...window.widgetSystem.widgetRegistry.keys()];

        const widgetList = availableWidgets.map(widgetName => `
            <div class="widget-library-item">
                <div class="widget-info">
                    <h5>${widgetName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
                    <p>Widget description coming soon...</p>
                </div>
                <button class="btn small primary" onclick="WidgetSystem.addWidgetFromLibrary('${widgetName}')">Add</button>
            </div>
        `).join('');

        Utils.showModal('Widget Library', `
            <div class="widget-library">
                <h4>Available Widgets</h4>
                <div class="widget-library-grid">
                    ${widgetList}
                </div>
            </div>
        `);
    }

    static addWidgetFromLibrary(widgetType) {
        const areas = window.widgetSystem.widgetAreas;

        const areaOptions = areas.map(area =>
            `<option value="${area}">${area.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`
        ).join('');

        Utils.showModal('Add Widget', `
            <div class="add-widget-form">
                <div class="settings-group">
                    <label for="widget-area">Add to Area:</label>
                    <select id="widget-area">
                        ${areaOptions}
                    </select>
                </div>
                <div class="settings-group">
                    <label for="widget-custom-title">Custom Title (optional):</label>
                    <input type="text" id="widget-custom-title" placeholder="Leave blank for default">
                </div>
            </div>
        `, () => {
            WidgetSystem.finalizeAddWidget(widgetType);
        });
    }

    static finalizeAddWidget(widgetType) {
        const areaId = document.getElementById('widget-area').value;
        const customTitle = document.getElementById('widget-custom-title').value;

        const config = {};
        if (customTitle) {
            config.title = customTitle;
        }

        const widget = window.widgetSystem.createWidget(widgetType, areaId, config);
        if (widget) {
            Utils.showSuccess(`Widget added to ${areaId}`);
            window.widgetSystem.saveLayoutToStorage();
        }
    }

    // === LAYOUT PERSISTENCE ===
    getCurrentLayout() {
        const layout = {
            areas: {},
            widgets: {}
        };

        this.widgetAreas.forEach(areaId => {
            const area = document.querySelector(`[data-widget-area="${areaId}"]`);
            if (area) {
                const widgets = Array.from(area.querySelectorAll('.widget-container')).map(container => {
                    return container.getAttribute('data-widget-id');
                });
                layout.areas[areaId] = widgets;
            }
        });

        this.widgets.forEach((widget, widgetId) => {
            layout.widgets[widgetId] = {
                type: widget.constructor.name,
                config: widget.config,
                title: widget.title
            };
        });

        return layout;
    }

    applyLayoutData(layout) {
        // Clear current widgets
        this.widgets.clear();
        document.querySelectorAll('.widget-area').forEach(area => {
            area.innerHTML = '';
        });

        // Recreate widgets from layout
        Object.entries(layout.areas).forEach(([areaId, widgetIds]) => {
            widgetIds.forEach(widgetId => {
                const widgetData = layout.widgets[widgetId];
                if (widgetData) {
                    this.createWidget(widgetData.type, areaId, widgetData.config);
                }
            });
        });

        // Re-add drop zones
        this.addDropZones();
    }

    saveLayoutToStorage() {
        const layout = this.getCurrentLayout();
        localStorage.setItem('currentWidgetLayout', JSON.stringify(layout));
    }

    async loadSavedLayout() {
        try {
            // Load saved layouts
            const savedLayouts = localStorage.getItem('widgetLayouts');
            if (savedLayouts) {
                this.layouts = new Map(JSON.parse(savedLayouts));
            }

            // Load current layout
            const currentLayout = localStorage.getItem('currentWidgetLayout');
            if (currentLayout) {
                this.applyLayoutData(JSON.parse(currentLayout));
            }
        } catch (error) {
            console.error('Error loading saved layout:', error);
        }
    }

    // === TESTBENCH INTEGRATION ===
    setupTestBenchIntegration() {
        // Listen for TestBench commands
        if (window.TestBenchManager) {
            this.testBenchIntegration = true;

            // Add TestBench widget control methods
            this.registerTestBenchCommands();
        }
    }

    registerTestBenchCommands() {
        // Register TestBench-specific widget commands
        window.TestBenchManager.addWidgetCommand = (command, params) => {
            this.handleTestBenchCommand(command, params);
        };
    }

    handleTestBenchCommand(command, params) {
        switch (command) {
            case 'create_widget':
                this.createWidget(params.type, params.area, params.config);
                break;
            case 'remove_widget':
                WidgetSystem.removeWidget(params.widgetId);
                break;
            case 'save_layout':
                WidgetSystem.saveLayout();
                break;
            case 'load_layout':
                if (params.layoutName && this.layouts.has(params.layoutName)) {
                    this.applyLayoutData(this.layouts.get(params.layoutName));
                }
                break;
            case 'reset_layout':
                WidgetSystem.resetLayout();
                break;
            default:
                console.warn('Unknown TestBench widget command:', command);
        }
    }

    // === EVENT LISTENERS ===
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'e':
                        e.preventDefault();
                        WidgetSystem.toggleEditMode();
                        break;
                    case 's':
                        if (e.shiftKey) {
                            e.preventDefault();
                            WidgetSystem.saveLayout();
                        }
                        break;
                    case 'l':
                        if (e.shiftKey) {
                            e.preventDefault();
                            WidgetSystem.loadLayout();
                        }
                        break;
                }
            }
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    handleWindowResize() {
        // Adjust widget layouts for responsive design
        const widgets = document.querySelectorAll('.widget-container');
        widgets.forEach(widget => {
            // Add responsive adjustments if needed
        });
    }
}

// Initialize WidgetSystem when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    WidgetSystem.init();
});

// Export for global access
window.WidgetSystem = WidgetSystem;
