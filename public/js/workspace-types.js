// Workspace Types Configuration
class WorkspaceTypes {
    static types = {
        chat: {
            id: 'chat',
            name: 'Chat',
            description: 'Simple chat interface for single model interactions',
            icon: '💬',
            defaultLayout: {
                widgets: [
                    {
                        type: 'chat',
                        position: { x: 0, y: 0, w: 8, h: 12 },
                        config: { title: 'Chat' }
                    },
                    {
                        type: 'quick-config',
                        position: { x: 8, y: 0, w: 4, h: 6 },
                        config: { title: 'Quick Config' }
                    },
                    {
                        type: 'conversation-history',
                        position: { x: 8, y: 6, w: 4, h: 6 },
                        config: { title: 'History' }
                    }
                ]
            },
            features: ['single-model', 'history', 'quick-config']
        },
        agentic: {
            id: 'agentic',
            name: 'Agentic',
            description: 'Multi-agent collaboration with human-in-the-loop',
            icon: '🤖',
            defaultLayout: {
                widgets: [
                    {
                        type: 'agent-orchestrator',
                        position: { x: 0, y: 0, w: 6, h: 8 },
                        config: { title: 'Agent Orchestrator' }
                    },
                    {
                        type: 'agent-status',
                        position: { x: 6, y: 0, w: 6, h: 4 },
                        config: { title: 'Active Agents' }
                    },
                    {
                        type: 'human-review',
                        position: { x: 6, y: 4, w: 6, h: 4 },
                        config: { title: 'Human Review Queue' }
                    },
                    {
                        type: 'agent-chat',
                        position: { x: 0, y: 8, w: 12, h: 4 },
                        config: { title: 'Agent Communication' }
                    }
                ]
            },
            features: ['multi-agent', 'orchestration', 'human-in-loop', 'task-management']
        },
        testing: {
            id: 'testing',
            name: 'Testing Lab',
            description: 'Test and compare models, prompts, and configurations',
            icon: '🧪',
            defaultLayout: {
                widgets: [
                    {
                        type: 'model-comparison',
                        position: { x: 0, y: 0, w: 8, h: 6 },
                        config: { title: 'Model Comparison' }
                    },
                    {
                        type: 'test-console',
                        position: { x: 8, y: 0, w: 4, h: 6 },
                        config: { title: 'Test Console' }
                    },
                    {
                        type: 'metrics-dashboard',
                        position: { x: 0, y: 6, w: 6, h: 6 },
                        config: { title: 'Performance Metrics' }
                    },
                    {
                        type: 'test-history',
                        position: { x: 6, y: 6, w: 6, h: 6 },
                        config: { title: 'Test History' }
                    }
                ]
            },
            features: ['model-comparison', 'benchmarking', 'metrics', 'a-b-testing']
        },
        collaborative: {
            id: 'collaborative',
            name: 'Collaborative',
            description: 'Team collaboration with shared context and knowledge',
            icon: '👥',
            defaultLayout: {
                widgets: [
                    {
                        type: 'shared-chat',
                        position: { x: 0, y: 0, w: 6, h: 8 },
                        config: { title: 'Shared Workspace' }
                    },
                    {
                        type: 'knowledge-browser',
                        position: { x: 6, y: 0, w: 6, h: 4 },
                        config: { title: 'Knowledge Base' }
                    },
                    {
                        type: 'team-presence',
                        position: { x: 6, y: 4, w: 6, h: 4 },
                        config: { title: 'Team Activity' }
                    },
                    {
                        type: 'shared-notes',
                        position: { x: 0, y: 8, w: 12, h: 4 },
                        config: { title: 'Collaborative Notes' }
                    }
                ]
            },
            features: ['multi-user', 'shared-context', 'knowledge-base', 'real-time-sync']
        },
        research: {
            id: 'research',
            name: 'Research',
            description: 'Research-focused workspace with RAG and knowledge management',
            icon: '📚',
            defaultLayout: {
                widgets: [
                    {
                        type: 'research-chat',
                        position: { x: 0, y: 0, w: 6, h: 8 },
                        config: { title: 'Research Assistant' }
                    },
                    {
                        type: 'document-viewer',
                        position: { x: 6, y: 0, w: 6, h: 8 },
                        config: { title: 'Document Viewer' }
                    },
                    {
                        type: 'citation-manager',
                        position: { x: 0, y: 8, w: 4, h: 4 },
                        config: { title: 'Citations' }
                    },
                    {
                        type: 'knowledge-graph',
                        position: { x: 4, y: 8, w: 8, h: 4 },
                        config: { title: 'Knowledge Graph' }
                    }
                ]
            },
            features: ['rag', 'document-analysis', 'citation-tracking', 'knowledge-graph']
        },
        development: {
            id: 'development',
            name: 'Development',
            description: 'Code development with AI assistance',
            icon: '💻',
            defaultLayout: {
                widgets: [
                    {
                        type: 'code-editor',
                        position: { x: 0, y: 0, w: 6, h: 8 },
                        config: { title: 'Code Editor' }
                    },
                    {
                        type: 'ai-assistant',
                        position: { x: 6, y: 0, w: 6, h: 6 },
                        config: { title: 'AI Assistant' }
                    },
                    {
                        type: 'terminal',
                        position: { x: 0, y: 8, w: 6, h: 4 },
                        config: { title: 'Terminal' }
                    },
                    {
                        type: 'code-review',
                        position: { x: 6, y: 6, w: 6, h: 6 },
                        config: { title: 'Code Review' }
                    }
                ]
            },
            features: ['code-editing', 'ai-assistance', 'terminal', 'code-review']
        }
    };

    static getType(typeId) {
        return this.types[typeId] || this.types.chat;
    }

    static getAllTypes() {
        return Object.values(this.types);
    }

    static createWorkspace(typeId, name) {
        const type = this.getType(typeId);
        return {
            id: `workspace-${Date.now()}`,
            name: name || `${type.name} Workspace`,
            type: typeId,
            layout: JSON.parse(JSON.stringify(type.defaultLayout)), // Deep clone
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            settings: {
                features: type.features,
                theme: 'default'
            }
        };
    }

    static getDefaultWidgetsForType(typeId) {
        const type = this.getType(typeId);
        return type.defaultLayout.widgets;
    }

    static validateWorkspaceType(workspace) {
        if (!workspace.type || !this.types[workspace.type]) {
            return false;
        }
        return true;
    }

    static migrateWorkspace(workspace) {
        // Migrate old workspace formats to new type-based format
        if (!workspace.type) {
            // Guess type based on widgets
            if (workspace.layout?.widgets?.some(w => w.type === 'agent-orchestrator')) {
                workspace.type = 'agentic';
            } else if (workspace.layout?.widgets?.some(w => w.type === 'model-comparison')) {
                workspace.type = 'testing';
            } else {
                workspace.type = 'chat';
            }
        }
        return workspace;
    }
}

// Export for use
window.WorkspaceTypes = WorkspaceTypes;