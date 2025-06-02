// Widget Factory - Creates and manages different widget types
class WidgetFactory {
    static widgetTypes = {
        // Chat Widgets
        'chat': {
            name: 'Chat',
            category: 'communication',
            icon: '💬',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 8 },
            resizable: true,
            component: 'ChatWidget'
        },
        'agent-chat': {
            name: 'Agent Chat',
            category: 'communication',
            icon: '🤖',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 6 },
            resizable: true,
            component: 'AgentChatWidget'
        },
        'shared-chat': {
            name: 'Shared Chat',
            category: 'communication',
            icon: '👥',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 8 },
            resizable: true,
            component: 'SharedChatWidget'
        },

        // Agent Widgets
        'agent-orchestrator': {
            name: 'Agent Orchestrator',
            category: 'agents',
            icon: '🎭',
            minSize: { w: 6, h: 6 },
            defaultSize: { w: 8, h: 8 },
            resizable: true,
            component: 'AgentOrchestratorWidget'
        },
        'agent-status': {
            name: 'Agent Status',
            category: 'agents',
            icon: '📊',
            minSize: { w: 3, h: 3 },
            defaultSize: { w: 4, h: 4 },
            resizable: true,
            component: 'AgentStatusWidget'
        },
        'human-review': {
            name: 'Human Review',
            category: 'agents',
            icon: '👁️',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 4 },
            resizable: true,
            component: 'HumanReviewWidget'
        },

        // Testing Widgets
        'model-comparison': {
            name: 'Model Comparison',
            category: 'testing',
            icon: '⚖️',
            minSize: { w: 6, h: 4 },
            defaultSize: { w: 8, h: 6 },
            resizable: true,
            component: 'ModelComparisonWidget'
        },
        'test-console': {
            name: 'Test Console',
            category: 'testing',
            icon: '🖥️',
            minSize: { w: 3, h: 3 },
            defaultSize: { w: 4, h: 6 },
            resizable: true,
            component: 'TestConsoleWidget'
        },
        'metrics-dashboard': {
            name: 'Metrics Dashboard',
            category: 'testing',
            icon: '📈',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 6 },
            resizable: true,
            component: 'MetricsDashboardWidget'
        },
        'test-history': {
            name: 'Test History',
            category: 'testing',
            icon: '📜',
            minSize: { w: 4, h: 3 },
            defaultSize: { w: 6, h: 4 },
            resizable: true,
            component: 'TestHistoryWidget'
        },

        // Knowledge Widgets
        'knowledge-browser': {
            name: 'Knowledge Browser',
            category: 'knowledge',
            icon: '📚',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 6 },
            resizable: true,
            component: 'KnowledgeBrowserWidget'
        },
        'document-viewer': {
            name: 'Document Viewer',
            category: 'knowledge',
            icon: '📄',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 8 },
            resizable: true,
            component: 'DocumentViewerWidget'
        },
        'knowledge-graph': {
            name: 'Knowledge Graph',
            category: 'knowledge',
            icon: '🕸️',
            minSize: { w: 6, h: 4 },
            defaultSize: { w: 8, h: 6 },
            resizable: true,
            component: 'KnowledgeGraphWidget'
        },
        'citation-manager': {
            name: 'Citation Manager',
            category: 'knowledge',
            icon: '📎',
            minSize: { w: 3, h: 3 },
            defaultSize: { w: 4, h: 4 },
            resizable: true,
            component: 'CitationManagerWidget'
        },

        // Development Widgets
        'code-editor': {
            name: 'Code Editor',
            category: 'development',
            icon: '⌨️',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 8 },
            resizable: true,
            component: 'CodeEditorWidget'
        },
        'terminal': {
            name: 'Terminal',
            category: 'development',
            icon: '🖥️',
            minSize: { w: 4, h: 3 },
            defaultSize: { w: 6, h: 4 },
            resizable: true,
            component: 'TerminalWidget'
        },
        'code-review': {
            name: 'Code Review',
            category: 'development',
            icon: '🔍',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 6 },
            resizable: true,
            component: 'CodeReviewWidget'
        },

        // Utility Widgets
        'quick-config': {
            name: 'Quick Config',
            category: 'utility',
            icon: '⚙️',
            minSize: { w: 3, h: 3 },
            defaultSize: { w: 4, h: 4 },
            resizable: true,
            component: 'QuickConfigWidget'
        },
        'system-monitor': {
            name: 'System Monitor',
            category: 'utility',
            icon: '📊',
            minSize: { w: 3, h: 3 },
            defaultSize: { w: 4, h: 4 },
            resizable: true,
            component: 'SystemMonitorWidget'
        },
        'conversation-history': {
            name: 'Conversation History',
            category: 'utility',
            icon: '🕐',
            minSize: { w: 3, h: 4 },
            defaultSize: { w: 4, h: 6 },
            resizable: true,
            component: 'ConversationHistoryWidget'
        },
        'shared-notes': {
            name: 'Shared Notes',
            category: 'utility',
            icon: '📝',
            minSize: { w: 4, h: 3 },
            defaultSize: { w: 6, h: 4 },
            resizable: true,
            component: 'SharedNotesWidget'
        },
        'team-presence': {
            name: 'Team Presence',
            category: 'utility',
            icon: '👥',
            minSize: { w: 3, h: 3 },
            defaultSize: { w: 4, h: 4 },
            resizable: true,
            component: 'TeamPresenceWidget'
        },
        'ai-assistant': {
            name: 'AI Assistant',
            category: 'utility',
            icon: '🤖',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 6 },
            resizable: true,
            component: 'AIAssistantWidget'
        },
        'research-chat': {
            name: 'Research Assistant',
            category: 'knowledge',
            icon: '🔬',
            minSize: { w: 4, h: 4 },
            defaultSize: { w: 6, h: 8 },
            resizable: true,
            component: 'ResearchChatWidget'
        }
    };

    static createWidget(type, config = {}) {
        const widgetDef = this.widgetTypes[type];
        if (!widgetDef) {
            console.error(`Unknown widget type: ${type}`);
            return null;
        }

        const widget = {
            id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            component: widgetDef.component,
            position: config.position || { x: 0, y: 0, ...widgetDef.defaultSize },
            config: {
                title: config.title || widgetDef.name,
                icon: widgetDef.icon,
                ...config
            },
            state: {
                minimized: false,
                maximized: false,
                locked: false
            }
        };

        return widget;
    }

    static getWidgetComponent(componentName) {
        // Dynamically load widget components
        if (window[componentName]) {
            return window[componentName];
        }
        
        // Return base widget if component not found
        console.warn(`Widget component ${componentName} not found, using base widget`);
        return BaseWidget;
    }

    static getWidgetsByCategory(category) {
        return Object.entries(this.widgetTypes)
            .filter(([_, widget]) => widget.category === category)
            .map(([type, widget]) => ({ type, ...widget }));
    }

    static getAllCategories() {
        const categories = new Set();
        Object.values(this.widgetTypes).forEach(widget => {
            categories.add(widget.category);
        });
        return Array.from(categories);
    }

    static getWidgetDefinition(type) {
        return this.widgetTypes[type];
    }

    static validateWidgetPosition(position, gridSize = { cols: 12, rows: 12 }) {
        const { x, y, w, h } = position;
        
        // Ensure position is within grid bounds
        const validated = {
            x: Math.max(0, Math.min(x, gridSize.cols - 1)),
            y: Math.max(0, Math.min(y, gridSize.rows - 1)),
            w: Math.max(1, Math.min(w, gridSize.cols - x)),
            h: Math.max(1, Math.min(h, gridSize.rows - y))
        };

        return validated;
    }

    static canPlaceWidget(widget, widgets, gridSize = { cols: 12, rows: 12 }) {
        const pos = widget.position;
        
        // Check if widget fits in grid
        if (pos.x + pos.w > gridSize.cols || pos.y + pos.h > gridSize.rows) {
            return false;
        }

        // Check for overlaps with other widgets
        for (const other of widgets) {
            if (other.id === widget.id) continue;
            
            const otherPos = other.position;
            if (!(pos.x + pos.w <= otherPos.x || 
                  otherPos.x + otherPos.w <= pos.x ||
                  pos.y + pos.h <= otherPos.y ||
                  otherPos.y + otherPos.h <= pos.y)) {
                return false;
            }
        }

        return true;
    }

    static findFreePosition(widgetType, widgets, gridSize = { cols: 12, rows: 12 }) {
        const widgetDef = this.widgetTypes[widgetType];
        if (!widgetDef) return null;

        const size = widgetDef.defaultSize;

        // Try to find a free position
        for (let y = 0; y <= gridSize.rows - size.h; y++) {
            for (let x = 0; x <= gridSize.cols - size.w; x++) {
                const testWidget = {
                    position: { x, y, w: size.w, h: size.h }
                };
                
                if (this.canPlaceWidget(testWidget, widgets, gridSize)) {
                    return testWidget.position;
                }
            }
        }

        return null; // No free position found
    }
}

// Export for use
window.WidgetFactory = WidgetFactory;