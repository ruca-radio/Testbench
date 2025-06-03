const Database = require('better-sqlite3');

function migrateAgentSwarm(db) {
    console.log('Running Agent Swarm migration...');

    try {
        // Create agent_swarms table for swarm management
        db.exec(`
            CREATE TABLE IF NOT EXISTS agent_swarms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'inactive', -- inactive, active, paused, stopped
                max_agents INTEGER DEFAULT 5,
                distribution_strategy TEXT DEFAULT 'auto', -- auto, load-balanced, specialized, round-robin
                communication_mode TEXT DEFAULT 'broadcast', -- broadcast, hierarchical, peer-to-peer
                auto_spawn INTEGER DEFAULT 1,
                auto_decompose INTEGER DEFAULT 1,
                created TEXT NOT NULL,
                updated TEXT NOT NULL,
                user_id INTEGER,
                config TEXT, -- JSON configuration
                metrics TEXT, -- JSON metrics data
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create swarm_agents table for agent instances within swarms
        db.exec(`
            CREATE TABLE IF NOT EXISTS swarm_agents (
                id TEXT PRIMARY KEY,
                swarm_id TEXT NOT NULL,
                name TEXT NOT NULL,
                model TEXT NOT NULL,
                provider TEXT NOT NULL,
                specialization TEXT DEFAULT 'general',
                status TEXT DEFAULT 'idle', -- spawning, idle, working, error, terminated
                current_task_id TEXT,
                tasks_completed INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 100.0,
                avg_response_time REAL DEFAULT 0.0,
                current_load INTEGER DEFAULT 0,
                capabilities TEXT, -- JSON array of capabilities
                configuration TEXT, -- JSON configuration
                created TEXT NOT NULL,
                last_active TEXT,
                FOREIGN KEY (swarm_id) REFERENCES agent_swarms(id) ON DELETE CASCADE,
                FOREIGN KEY (current_task_id) REFERENCES swarm_tasks(id) ON DELETE SET NULL
            )
        `);

        // Create swarm_tasks table for task management
        db.exec(`
            CREATE TABLE IF NOT EXISTS swarm_tasks (
                id TEXT PRIMARY KEY,
                swarm_id TEXT NOT NULL,
                parent_task_id TEXT, -- For subtasks
                title TEXT,
                description TEXT NOT NULL,
                priority TEXT DEFAULT 'normal', -- urgent, high, normal, low
                specialization TEXT DEFAULT 'general',
                status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, review, completed, failed
                assigned_agent_id TEXT,
                estimated_time INTEGER, -- in minutes
                actual_time INTEGER, -- in minutes
                progress INTEGER DEFAULT 0, -- 0-100
                retries INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                created TEXT NOT NULL,
                assigned_at TEXT,
                started_at TEXT,
                completed_at TEXT,
                task_data TEXT, -- JSON task configuration and requirements
                result_data TEXT, -- JSON task result
                error_data TEXT, -- JSON error information
                dependencies TEXT, -- JSON array of task IDs this task depends on
                tags TEXT, -- JSON array of tags
                FOREIGN KEY (swarm_id) REFERENCES agent_swarms(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_task_id) REFERENCES swarm_tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_agent_id) REFERENCES swarm_agents(id) ON DELETE SET NULL
            )
        `);

        // Create swarm_communications table for agent-to-agent communication
        db.exec(`
            CREATE TABLE IF NOT EXISTS swarm_communications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                swarm_id TEXT NOT NULL,
                from_agent_id TEXT,
                to_agent_id TEXT, -- NULL for broadcast
                message_type TEXT NOT NULL, -- task_assignment, status_update, coordination, broadcast, error
                message_content TEXT NOT NULL, -- JSON message content
                task_id TEXT, -- Related task if applicable
                timestamp TEXT NOT NULL,
                acknowledged INTEGER DEFAULT 0,
                FOREIGN KEY (swarm_id) REFERENCES agent_swarms(id) ON DELETE CASCADE,
                FOREIGN KEY (from_agent_id) REFERENCES swarm_agents(id) ON DELETE SET NULL,
                FOREIGN KEY (to_agent_id) REFERENCES swarm_agents(id) ON DELETE SET NULL,
                FOREIGN KEY (task_id) REFERENCES swarm_tasks(id) ON DELETE SET NULL
            )
        `);

        // Create swarm_analytics table for performance tracking
        db.exec(`
            CREATE TABLE IF NOT EXISTS swarm_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                swarm_id TEXT NOT NULL,
                metric_type TEXT NOT NULL, -- performance, efficiency, collaboration, throughput
                metric_value REAL NOT NULL,
                metric_data TEXT, -- JSON additional data
                recorded_at TEXT NOT NULL,
                period_start TEXT, -- For time-based metrics
                period_end TEXT,
                FOREIGN KEY (swarm_id) REFERENCES agent_swarms(id) ON DELETE CASCADE
            )
        `);

        // Create swarm_task_dependencies table for complex task relationships
        db.exec(`
            CREATE TABLE IF NOT EXISTS swarm_task_dependencies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                depends_on_task_id TEXT NOT NULL,
                dependency_type TEXT DEFAULT 'blocking', -- blocking, optional, parallel
                created TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES swarm_tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (depends_on_task_id) REFERENCES swarm_tasks(id) ON DELETE CASCADE,
                UNIQUE(task_id, depends_on_task_id)
            )
        `);

        // Create swarm_knowledge table for shared knowledge between agents
        db.exec(`
            CREATE TABLE IF NOT EXISTS swarm_knowledge (
                id TEXT PRIMARY KEY,
                swarm_id TEXT NOT NULL,
                knowledge_type TEXT NOT NULL, -- learned_pattern, shared_context, best_practice, error_solution
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source_agent_id TEXT,
                related_task_id TEXT,
                confidence_score REAL DEFAULT 0.5,
                usage_count INTEGER DEFAULT 0,
                created TEXT NOT NULL,
                updated TEXT NOT NULL,
                tags TEXT, -- JSON array
                FOREIGN KEY (swarm_id) REFERENCES agent_swarms(id) ON DELETE CASCADE,
                FOREIGN KEY (source_agent_id) REFERENCES swarm_agents(id) ON DELETE SET NULL,
                FOREIGN KEY (related_task_id) REFERENCES swarm_tasks(id) ON DELETE SET NULL
            )
        `);

        // Create indexes for better performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_swarm_agents_swarm_id ON swarm_agents(swarm_id);
            CREATE INDEX IF NOT EXISTS idx_swarm_agents_status ON swarm_agents(status);
            CREATE INDEX IF NOT EXISTS idx_swarm_tasks_swarm_id ON swarm_tasks(swarm_id);
            CREATE INDEX IF NOT EXISTS idx_swarm_tasks_status ON swarm_tasks(status);
            CREATE INDEX IF NOT EXISTS idx_swarm_tasks_assigned_agent ON swarm_tasks(assigned_agent_id);
            CREATE INDEX IF NOT EXISTS idx_swarm_tasks_parent ON swarm_tasks(parent_task_id);
            CREATE INDEX IF NOT EXISTS idx_swarm_communications_swarm_id ON swarm_communications(swarm_id);
            CREATE INDEX IF NOT EXISTS idx_swarm_communications_timestamp ON swarm_communications(timestamp);
            CREATE INDEX IF NOT EXISTS idx_swarm_analytics_swarm_id ON swarm_analytics(swarm_id);
            CREATE INDEX IF NOT EXISTS idx_swarm_analytics_metric_type ON swarm_analytics(metric_type);
            CREATE INDEX IF NOT EXISTS idx_swarm_knowledge_swarm_id ON swarm_knowledge(swarm_id);
        `);

        // Insert default swarm templates
        const insertSwarmTemplate = db.prepare(`
            INSERT OR IGNORE INTO agent_swarms 
            (id, name, description, status, max_agents, distribution_strategy, communication_mode, auto_spawn, auto_decompose, created, updated, config)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = new Date().toISOString();

        const defaultSwarms = [
            {
                id: 'template-research-swarm',
                name: 'Research Swarm Template',
                description: 'Specialized swarm for research and analysis tasks',
                status: 'inactive',
                max_agents: 4,
                distribution_strategy: 'specialized',
                communication_mode: 'hierarchical',
                auto_spawn: 1,
                auto_decompose: 1,
                config: JSON.stringify({
                    template: true,
                    specializations: ['research', 'analysis', 'writing', 'fact-checking'],
                    coordination_style: 'lead_agent',
                    quality_gates: true,
                    review_process: 'peer_review'
                })
            },
            {
                id: 'template-content-swarm',
                name: 'Content Creation Swarm Template',
                description: 'Swarm optimized for content creation and writing',
                status: 'inactive',
                max_agents: 3,
                distribution_strategy: 'specialized',
                communication_mode: 'peer-to-peer',
                auto_spawn: 1,
                auto_decompose: 1,
                config: JSON.stringify({
                    template: true,
                    specializations: ['creative', 'writing', 'editing'],
                    coordination_style: 'collaborative',
                    quality_gates: true,
                    review_process: 'iterative'
                })
            },
            {
                id: 'template-analysis-swarm',
                name: 'Data Analysis Swarm Template',
                description: 'Swarm for data processing and analysis tasks',
                status: 'inactive',
                max_agents: 5,
                distribution_strategy: 'load-balanced',
                communication_mode: 'broadcast',
                auto_spawn: 1,
                auto_decompose: 1,
                config: JSON.stringify({
                    template: true,
                    specializations: ['data', 'analysis', 'visualization', 'statistics', 'reporting'],
                    coordination_style: 'distributed',
                    quality_gates: true,
                    review_process: 'validation'
                })
            }
        ];

        defaultSwarms.forEach(swarm => {
            insertSwarmTemplate.run(
                swarm.id,
                swarm.name,
                swarm.description,
                swarm.status,
                swarm.max_agents,
                swarm.distribution_strategy,
                swarm.communication_mode,
                swarm.auto_spawn,
                swarm.auto_decompose,
                now,
                now,
                swarm.config
            );
        });

        // Insert sample agent specialization templates
        const insertKnowledge = db.prepare(`
            INSERT OR IGNORE INTO swarm_knowledge 
            (id, swarm_id, knowledge_type, title, content, confidence_score, created, updated, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const knowledgeTemplates = [
            {
                id: 'knowledge-task-decomposition',
                swarm_id: 'template-research-swarm',
                knowledge_type: 'best_practice',
                title: 'Task Decomposition Best Practices',
                content: 'When decomposing complex tasks: 1) Identify independent subtasks, 2) Define clear dependencies, 3) Estimate effort per subtask, 4) Assign based on agent specialization, 5) Set up checkpoints for coordination',
                confidence_score: 0.9,
                tags: JSON.stringify(['decomposition', 'planning', 'coordination'])
            },
            {
                id: 'knowledge-agent-collaboration',
                swarm_id: 'template-content-swarm',
                knowledge_type: 'learned_pattern',
                title: 'Effective Agent Collaboration Patterns',
                content: 'Successful collaboration patterns: 1) Clear role definition, 2) Regular status updates, 3) Shared context maintenance, 4) Conflict resolution protocols, 5) Quality validation checkpoints',
                confidence_score: 0.85,
                tags: JSON.stringify(['collaboration', 'communication', 'quality'])
            },
            {
                id: 'knowledge-error-recovery',
                swarm_id: 'template-analysis-swarm',
                knowledge_type: 'error_solution',
                title: 'Common Error Recovery Strategies',
                content: 'Error recovery approaches: 1) Task reassignment to different agent, 2) Decompose failed task further, 3) Request human intervention, 4) Use alternative approach, 5) Skip non-critical subtasks',
                confidence_score: 0.8,
                tags: JSON.stringify(['error_handling', 'recovery', 'resilience'])
            }
        ];

        knowledgeTemplates.forEach(knowledge => {
            insertKnowledge.run(
                knowledge.id,
                knowledge.swarm_id,
                knowledge.knowledge_type,
                knowledge.title,
                knowledge.content,
                knowledge.confidence_score,
                now,
                now,
                knowledge.tags
            );
        });

        console.log('Agent Swarm migration completed successfully');

    } catch (error) {
        console.error('Error in Agent Swarm migration:', error);
        throw error;
    }
}

module.exports = { migrateAgentSwarm };