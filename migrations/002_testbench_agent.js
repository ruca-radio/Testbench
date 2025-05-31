/**
 * Migration: TestBench Agent System
 * Adds tables and permissions for TestBench Agent with system-level capabilities
 */

const Database = require('better-sqlite3');

function migrateTestBenchAgent(db) {
    console.log('Running migration: TestBench Agent System...');

    // 1. Create system_permissions table for TestBench role permissions
    db.exec(`
        CREATE TABLE IF NOT EXISTS system_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            permission_type TEXT NOT NULL,
            permission_scope TEXT NOT NULL,
            permission_actions JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role, permission_type, permission_scope)
        )
    `);

    // 2. Create audit_log table for TestBench operations
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id INTEGER REFERENCES agents(id),
            action_type TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            action_details JSON,
            success BOOLEAN,
            error_message TEXT,
            ip_address TEXT,
            user_agent TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Create testbench_configurations table for system templates
    db.exec(`
        CREATE TABLE IF NOT EXISTS testbench_configurations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            config_type TEXT NOT NULL,
            config_data JSON NOT NULL,
            version TEXT DEFAULT '1.0.0',
            is_template BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_by_agent INTEGER REFERENCES agents(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 4. Create backup_snapshots table for configuration rollback
    db.exec(`
        CREATE TABLE IF NOT EXISTS backup_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            snapshot_type TEXT NOT NULL,
            snapshot_data JSON NOT NULL,
            created_by_agent INTEGER REFERENCES agents(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 5. Create feature_tests table for TestBench testing capabilities
    db.exec(`
        CREATE TABLE IF NOT EXISTS feature_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_name TEXT NOT NULL,
            test_type TEXT NOT NULL,
            test_config JSON NOT NULL,
            test_results JSON,
            status TEXT DEFAULT 'pending',
            started_by_agent INTEGER REFERENCES agents(id),
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            success_rate REAL,
            total_assertions INTEGER DEFAULT 0,
            passed_assertions INTEGER DEFAULT 0
        )
    `);

    // 6. Insert default TestBench system permissions
    const insertPermission = db.prepare(`
        INSERT OR IGNORE INTO system_permissions (role, permission_type, permission_scope, permission_actions)
        VALUES (?, ?, ?, ?)
    `);

    // TestBench Agent system permissions
    const testbenchPermissions = [
        // System Settings Management
        {
            role: 'testbench',
            type: 'system',
            scope: 'settings',
            actions: ['read', 'write', 'delete', 'backup', 'restore']
        },
        // Agent Management
        {
            role: 'testbench',
            type: 'agent',
            scope: 'management',
            actions: ['create', 'read', 'update', 'delete', 'assign_roles', 'modify_permissions']
        },
        // Workspace Management
        {
            role: 'testbench',
            type: 'workspace',
            scope: 'management',
            actions: ['create', 'read', 'update', 'delete', 'provision', 'configure']
        },
        // Knowledge Base Management
        {
            role: 'testbench',
            type: 'knowledge',
            scope: 'management',
            actions: ['create', 'read', 'update', 'delete', 'provision', 'configure']
        },
        // Feature Testing
        {
            role: 'testbench',
            type: 'testing',
            scope: 'features',
            actions: ['create', 'execute', 'monitor', 'analyze', 'report']
        },
        // System Health & Monitoring
        {
            role: 'testbench',
            type: 'system',
            scope: 'health',
            actions: ['read', 'monitor', 'diagnose', 'report']
        },
        // Configuration Templates
        {
            role: 'testbench',
            type: 'configuration',
            scope: 'templates',
            actions: ['create', 'read', 'update', 'delete', 'apply', 'validate']
        }
    ];

    for (const perm of testbenchPermissions) {
        insertPermission.run(perm.role, perm.type, perm.scope, JSON.stringify(perm.actions));
    }

    // 7. Insert default TestBench configuration templates
    const insertConfig = db.prepare(`
        INSERT OR IGNORE INTO testbench_configurations (name, description, config_type, config_data, is_template)
        VALUES (?, ?, ?, ?, ?)
    `);

    const defaultTemplates = [
        {
            name: 'default-testbench-agent',
            description: 'Default TestBench Agent Configuration',
            type: 'agent',
            data: {
                role: 'testbench',
                capabilities: {
                    system_management: true,
                    agent_creation: true,
                    workspace_provisioning: true,
                    knowledge_management: true,
                    feature_testing: true,
                    system_monitoring: true
                },
                settings: {
                    temperature: 0.3,
                    max_tokens: 4000,
                    system_prompt: 'You are a TestBench Agent with system-level capabilities. You can modify settings, create agents and workspaces, provision knowledge bases, implement and test features, and control system functions.',
                    safety_mode: true,
                    auto_backup: true
                },
                preferred_models: ['gpt-4o', 'claude-4-sonnet']
            }
        },
        {
            name: 'safe-mode-testbench',
            description: 'TestBench Agent with Safe Mode Restrictions',
            type: 'agent',
            data: {
                role: 'testbench',
                capabilities: {
                    system_management: false,
                    agent_creation: true,
                    workspace_provisioning: true,
                    knowledge_management: true,
                    feature_testing: true,
                    system_monitoring: true
                },
                settings: {
                    temperature: 0.1,
                    max_tokens: 2000,
                    system_prompt: 'You are a TestBench Agent in safe mode. You can create agents, workspaces, and knowledge bases, but cannot modify critical system settings.',
                    safety_mode: true,
                    auto_backup: true,
                    require_confirmation: true
                }
            }
        },
        {
            name: 'production-workspace',
            description: 'Production-Ready Multi-Agent Workspace Template',
            type: 'workspace',
            data: {
                config: {
                    collaboration_enabled: true,
                    max_agents: 10,
                    message_retention: '30d',
                    auto_scaling: true,
                    monitoring: true
                },
                default_agents: [
                    { role: 'orchestrator', model: 'gpt-4o' },
                    { role: 'specialist', model: 'claude-4-sonnet' },
                    { role: 'reviewer', model: 'gpt-4o-mini' }
                ]
            }
        }
    ];

    for (const template of defaultTemplates) {
        insertConfig.run(
            template.name,
            template.description,
            template.type,
            JSON.stringify(template.data),
            1
        );
    }

    // 8. Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_system_permissions_role
        ON system_permissions(role);

        CREATE INDEX IF NOT EXISTS idx_audit_log_agent
        ON audit_log(agent_id);

        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
        ON audit_log(timestamp);

        CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
        ON audit_log(action_type);

        CREATE INDEX IF NOT EXISTS idx_testbench_configurations_type
        ON testbench_configurations(config_type);

        CREATE INDEX IF NOT EXISTS idx_feature_tests_status
        ON feature_tests(status);

        CREATE INDEX IF NOT EXISTS idx_backup_snapshots_type
        ON backup_snapshots(snapshot_type);
    `);

    console.log('TestBench Agent System migration completed successfully');
}

module.exports = {
    migrateTestBenchAgent
};
