// Base Widget Class - All widgets inherit from this
class BaseWidget {
    constructor(widgetData) {
        this.id = widgetData.id;
        this.type = widgetData.type;
        this.position = widgetData.position;
        this.config = widgetData.config || {};
        this.state = widgetData.state || {
            minimized: false,
            maximized: false,
            locked: false
        };
        this.element = null;
        this.contentElement = null;
        this.isResizing = false;
        this.isDragging = false;
    }

    // Create the widget element
    createElement() {
        const widget = document.createElement('div');
        widget.className = 'widget';
        widget.id = this.id;
        widget.dataset.widgetType = this.type;
        widget.style.gridColumn = `${this.position.x + 1} / span ${this.position.w}`;
        widget.style.gridRow = `${this.position.y + 1} / span ${this.position.h}`;

        // Add state classes
        if (this.state.minimized) widget.classList.add('minimized');
        if (this.state.maximized) widget.classList.add('maximized');
        if (this.state.locked) widget.classList.add('locked');

        // Create widget structure safely
        const header = document.createElement('div');
        header.className = 'widget-header';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'widget-title';

        const icon = document.createElement('span');
        icon.className = 'widget-icon';
        icon.textContent = this.config.icon || '📦';

        const name = document.createElement('span');
        name.className = 'widget-name';
        name.textContent = this.config.title || 'Widget';

        titleDiv.appendChild(icon);
        titleDiv.appendChild(name);

        const controls = document.createElement('div');
        controls.className = 'widget-controls';

        if (!this.state.locked) {
            // Create control buttons safely
            const minimizeBtn = this.createControlButton('minimize-btn', 'Minimize', 'M19 13H5v-2h14v2z');
            const maximizeBtn = this.createControlButton('maximize-btn', 'Maximize', 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z');
            const settingsBtn = this.createControlButton('settings-btn', 'Settings', 'M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z');
            const closeBtn = this.createControlButton('close-btn', 'Close', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');

            controls.appendChild(minimizeBtn);
            controls.appendChild(maximizeBtn);
            controls.appendChild(settingsBtn);
            controls.appendChild(closeBtn);
        }

        header.appendChild(titleDiv);
        header.appendChild(controls);

        const content = document.createElement('div');
        content.className = 'widget-content';

        const loading = document.createElement('div');
        loading.className = 'widget-loading';
        loading.style.display = 'flex';

        const spinner = document.createElement('div');
        spinner.className = 'spinner';

        const loadingText = document.createElement('p');
        loadingText.textContent = 'Loading widget...';

        loading.appendChild(spinner);
        loading.appendChild(loadingText);

        content.appendChild(loading);

        widget.appendChild(header);
        widget.appendChild(content);

        if (!this.state.locked) {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'widget-resize-handle';
            widget.appendChild(resizeHandle);
        }

        this.element = widget;
        this.contentElement = widget.querySelector('.widget-content');
        this.setupEventListeners();

        return widget;
    }

    // Setup event listeners
    setupEventListeners() {
        if (!this.element || this.state.locked) return;

        const header = this.element.querySelector('.widget-header');
        const minimizeBtn = this.element.querySelector('.minimize-btn');
        const maximizeBtn = this.element.querySelector('.maximize-btn');
        const settingsBtn = this.element.querySelector('.settings-btn');
        const closeBtn = this.element.querySelector('.close-btn');
        const resizeHandle = this.element.querySelector('.widget-resize-handle');

        // Drag functionality
        if (header) {
            header.addEventListener('mousedown', (e) => this.startDrag(e));
        }

        // Control buttons
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        }
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => this.toggleMaximize());
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Resize functionality
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        }
    }

    // Initialize widget content
    async init() {
        try {
            // Show loading
            this.showLoading();

            // Initialize widget-specific content
            await this.onInit();

            // Hide loading
            this.hideLoading();
        } catch (error) {
            console.error(`Error initializing widget ${this.id}:`, error);
            this.showError('Failed to initialize widget');
        }
    }

    // Helper method to create control buttons
    createControlButton(className, title, svgPath) {
        const btn = document.createElement('button');
        btn.className = `widget-btn ${className}`;
        btn.title = title;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '12');
        svg.setAttribute('height', '12');
        svg.setAttribute('viewBox', '0 0 24 24');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', svgPath);
        path.setAttribute('fill', 'currentColor');

        svg.appendChild(path);
        btn.appendChild(svg);

        return btn;
    }

    // Widget lifecycle methods (to be overridden by subclasses)
    async onInit() {
        // Override in subclass
        const p = document.createElement('p');
        p.textContent = 'Base widget initialized';
        this.contentElement.appendChild(p);
    }

    async onDestroy() {
        // Override in subclass for cleanup
    }

    async onResize() {
        // Override in subclass to handle resize
    }

    async onSettingsChange(newSettings) {
        // Override in subclass to handle settings changes
        Object.assign(this.config, newSettings);
    }

    // UI Helper methods
    showLoading() {
        const loading = this.element.querySelector('.widget-loading');
        if (loading) loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = this.element.querySelector('.widget-loading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        // Clear content safely
        this.contentElement.innerHTML = '';

        const errorDiv = document.createElement('div');
        errorDiv.className = 'widget-error';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '48');
        svg.setAttribute('height', '48');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z');

        svg.appendChild(path);

        const p = document.createElement('p');
        p.textContent = message;

        errorDiv.appendChild(svg);
        errorDiv.appendChild(p);

        this.contentElement.appendChild(errorDiv);
    }

    setContent(content) {
        // Clear existing content
        this.contentElement.innerHTML = '';

        // If content is a string, create a text node to prevent XSS
        if (typeof content === 'string') {
            const div = document.createElement('div');
            div.textContent = content;
            this.contentElement.appendChild(div);
        } else if (content instanceof HTMLElement) {
            // If it's already a DOM element, append it
            this.contentElement.appendChild(content);
        }
    }

    // New safe method for setting HTML content when absolutely necessary
    setHTMLContent(html) {
        // This method should only be used with trusted content
        console.warn('setHTMLContent called - ensure content is sanitized');
        this.contentElement.innerHTML = html;
    }

    // Widget control methods
    toggleMinimize() {
        this.state.minimized = !this.state.minimized;
        this.element.classList.toggle('minimized');

        if (!this.state.minimized) {
            this.onResize();
        }
    }

    toggleMaximize() {
        this.state.maximized = !this.state.maximized;
        this.element.classList.toggle('maximized');

        if (this.state.maximized) {
            // Store original position
            this.originalPosition = { ...this.position };
            this.element.style.gridColumn = '1 / -1';
            this.element.style.gridRow = '1 / -1';
        } else {
            // Restore original position
            this.position = { ...this.originalPosition };
            this.updatePosition();
        }

        this.onResize();
    }

    openSettings() {
        // Create settings modal safely
        const modal = document.createElement('div');
        modal.className = 'widget-settings-modal';

        const content = document.createElement('div');
        content.className = 'widget-settings-content';

        const h3 = document.createElement('h3');
        h3.textContent = 'Widget Settings';

        const form = document.createElement('div');
        form.className = 'settings-form';

        const label = document.createElement('label');
        label.textContent = 'Title: ';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'widget-title';
        input.value = this.config.title || '';

        label.appendChild(input);
        form.appendChild(label);

        const actions = document.createElement('div');
        actions.className = 'settings-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => modal.remove();

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn primary';
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => {
            if (window.WidgetSystem) {
                window.WidgetSystem.saveWidgetSettings(this.id);
            }
        };

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);

        content.appendChild(h3);
        content.appendChild(form);
        content.appendChild(actions);

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    close() {
        if (confirm('Are you sure you want to close this widget?')) {
            this.onDestroy();
            if (window.WidgetSystem) {
                window.WidgetSystem.removeWidget(this.id);
            }
        }
    }

    // Drag and resize functionality
    startDrag(e) {
        if (this.state.locked || this.state.maximized) return;

        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        const rect = this.element.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        this.element.classList.add('dragging');

        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
    }

    handleDrag(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        // Update visual position (actual grid position updated on drop)
        this.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }

    endDrag(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.element.classList.remove('dragging');
        this.element.style.transform = '';

        // Calculate new grid position
        if (window.WidgetSystem) {
            window.WidgetSystem.handleWidgetDrop(this.id, e.clientX, e.clientY);
        }

        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.endDrag);
    }

    startResize(e) {
        if (this.state.locked) return;

        this.isResizing = true;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.resizeStartW = this.position.w;
        this.resizeStartH = this.position.h;

        this.element.classList.add('resizing');

        document.addEventListener('mousemove', this.handleResize.bind(this));
        document.addEventListener('mouseup', this.endResize.bind(this));

        e.preventDefault();
    }

    handleResize(e) {
        if (!this.isResizing) return;

        const gridSize = window.WidgetSystem?.gridSize || 50;
        const deltaX = Math.round((e.clientX - this.resizeStartX) / gridSize);
        const deltaY = Math.round((e.clientY - this.resizeStartY) / gridSize);

        const widgetDef = window.WidgetFactory?.getWidgetDefinition(this.type);
        const minSize = widgetDef?.minSize || { w: 2, h: 2 };

        this.position.w = Math.max(minSize.w, this.resizeStartW + deltaX);
        this.position.h = Math.max(minSize.h, this.resizeStartH + deltaY);

        this.updatePosition();
    }

    endResize(e) {
        if (!this.isResizing) return;

        this.isResizing = false;
        this.element.classList.remove('resizing');

        // Notify system of resize
        if (window.WidgetSystem) {
            window.WidgetSystem.updateWidgetPosition(this.id, this.position);
        }

        this.onResize();

        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.endResize);
    }

    updatePosition() {
        this.element.style.gridColumn = `${this.position.x + 1} / span ${this.position.w}`;
        this.element.style.gridRow = `${this.position.y + 1} / span ${this.position.h}`;
    }

    // Update widget state
    updateState(newState) {
        Object.assign(this.state, newState);

        // Update classes
        this.element.classList.toggle('minimized', this.state.minimized);
        this.element.classList.toggle('maximized', this.state.maximized);
        this.element.classList.toggle('locked', this.state.locked);
    }

    // Update widget config
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);

        // Update title if changed
        const titleElement = this.element.querySelector('.widget-name');
        if (titleElement && newConfig.title) {
            titleElement.textContent = newConfig.title;
        }

        this.onSettingsChange(newConfig);
    }
}

// Export for use
window.BaseWidget = BaseWidget;
