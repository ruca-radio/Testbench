/**
 * Migration: Multi-Agent Collaboration Schema
 * Adds tables and columns needed for multi-agent workspace collaboration
 */

const Database = require('better-sqlite3');

function migrateMultiAgentCollaboration(db) {
    console.log('Running migration: Multi-Agent Collaboration Schema...');

    // 1. Create workspaces table
    db.exec(`
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            config JSON,
            thumbnail TEXT,
            is_default BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Create workspace_sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS workspace_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER REFERENCES workspaces(id),
            session_data JSON,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Create agent_conversations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER REFERENCES workspaces(id),
            conversation_id TEXT UNIQUE NOT NULL,
            participants JSON,
            orchestrator_id INTEGER REFERENCES agents(id),
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 4. Create agent_messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT REFERENCES agent_conversations(conversation_id),
            from_agent_id INTEGER REFERENCES agents(id),
            to_agent_id INTEGER REFERENCES agents(id),
            message_type TEXT,
            content JSON,
            parent_message_id INTEGER REFERENCES agent_messages(id),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 5. Create agent_tasks table
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT REFERENCES agent_conversations(conversation_id),
            assigner_id INTEGER REFERENCES agents(id),
            assignee_id INTEGER REFERENCES agents(id),
            task_description TEXT,
            task_data JSON,
            status TEXT DEFAULT 'pending',
            result JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        )
    `);

    // 6. Create workspace_context table
    db.exec(`
        CREATE TABLE IF NOT EXISTS workspace_context (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER REFERENCES workspaces(id),
            context_type TEXT,
            context_key TEXT,
            context_value JSON,
            created_by_agent INTEGER REFERENCES agents(id),
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(workspace_id, context_type, context_key)
        )
    `);

    // 7. Add role and capabilities columns to agents table
    const agentsTableInfo = db.prepare("PRAGMA table_info(agents)").all();
    const hasRoleColumn = agentsTableInfo.some(col => col.name === 'role');
    const hasCapabilitiesColumn = agentsTableInfo.some(col => col.name === 'capabilities');
    const hasEnabledColumn = agentsTableInfo.some(col => col.name === 'enabled');

    if (!hasRoleColumn) {
        db.exec(`ALTER TABLE agents ADD COLUMN role TEXT DEFAULT 'assistant'`);
    }
    if (!hasCapabilitiesColumn) {
        db.exec(`ALTER TABLE agents ADD COLUMN capabilities JSON DEFAULT '{}'`);
    }
    if (!hasEnabledColumn) {
        db.exec(`ALTER TABLE agents ADD COLUMN enabled BOOLEAN DEFAULT 1`);
    }

    // 8. Create workspace_agents table (junction table for many-to-many relationship)
    db.exec(`
        CREATE TABLE IF NOT EXISTS workspace_agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER REFERENCES workspaces(id),
            agent_id INTEGER REFERENCES agents(id),
            role TEXT DEFAULT 'participant',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(workspace_id, agent_id)
        )
    `);

    // 9. Create agent_tools table (for tool attachments)
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id INTEGER REFERENCES agents(id),
            tool_type TEXT NOT NULL,
            tool_identifier TEXT NOT NULL,
            tool_config JSON DEFAULT '{}',
            enabled BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(agent_id, tool_type, tool_identifier)
        )
    `);

    // 10. Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_workspace
        ON agent_conversations(workspace_id);

        CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation
        ON agent_messages(conversation_id);

        CREATE INDEX IF NOT EXISTS idx_agent_messages_timestamp
        ON agent_messages(timestamp);

        CREATE INDEX IF NOT EXISTS idx_agent_tasks_assignee
        ON agent_tasks(assignee_id);

        CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
        ON agent_tasks(status);

        CREATE INDEX IF NOT EXISTS idx_workspace_context_workspace
        ON workspace_context(workspace_id);

        CREATE INDEX IF NOT EXISTS idx_workspace_agents_workspace
        ON workspace_agents(workspace_id);
    `);

    console.log('Multi-Agent Collaboration migration completed successfully');
}

module.exports = {
    migrateMultiAgentCollaboration
};
