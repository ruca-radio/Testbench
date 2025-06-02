const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database setup
const dbPath = path.join(__dirname, 'data', 'workspace.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create tables
function initializeDatabase() {
    // Settings table for storing provider configurations
    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, key)
    )
  `);

    // Available models table
    db.exec(`
    CREATE TABLE IF NOT EXISTS available_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      model_data JSON,
      last_fetched DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, model_id)
    )
  `);

    // Enabled models table (controls which models appear in workspace)
    db.exec(`
    CREATE TABLE IF NOT EXISTS enabled_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model_id TEXT NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, model_id)
    )
  `);

    // Agents table
    db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      settings JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // MCP Servers table
    db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      api_key TEXT,
      api_key_encrypted BOOLEAN DEFAULT 0,
      api_key_last_rotated DATETIME,
      server_type TEXT NOT NULL,
      status TEXT DEFAULT 'disconnected',
      capabilities JSON,
      metadata JSON,
      allowed_ips TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // MCP Server Tools table
    db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_server_tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      input_schema JSON,
      output_schema JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id, tool_name),
      FOREIGN KEY(server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    )
  `);

    // MCP Server Resources table
    db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_server_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      resource_uri TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      resource_type TEXT NOT NULL,
      metadata JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id, resource_uri),
      FOREIGN KEY(server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    )
  `);

    // MCP API Key Rotation History table
    db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_api_key_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      key_hash TEXT NOT NULL,
      rotated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      created_by TEXT,
      FOREIGN KEY(server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    )
  `);

    // MCP Access Log table
    db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      resource_path TEXT,
      user_id TEXT,
      ip_address TEXT,
      status_code INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    )
  `);

    // Knowledge bases table
    db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'documents',
      vector_enabled BOOLEAN DEFAULT 1,
      embedding_model TEXT DEFAULT 'text-embedding-ada-002',
      chunk_size INTEGER DEFAULT 1000,
      chunk_overlap INTEGER DEFAULT 200,
      document_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Knowledge base documents table
    db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      knowledge_base_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT,
      mimetype TEXT,
      size INTEGER,
      content TEXT,
      processed BOOLEAN DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
    )
  `);

    // Tools table
    db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Utility',
      enabled BOOLEAN DEFAULT 1,
      config JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    console.log('Database initialized successfully');
}

/**
 * Migrate database to latest schema
 * This function handles schema changes for existing databases
 */
function migrateDatabase() {
    // Run multi-agent collaboration migration
    const { migrateMultiAgentCollaboration } = require('./migrations/001_multi_agent_collaboration');
    migrateMultiAgentCollaboration(db);

    // Run TestBench agent migration
    const { migrateTestBenchAgent } = require('./migrations/002_testbench_agent');
    migrateTestBenchAgent(db);

    // Check if api_key_encrypted column exists in mcp_servers table
    const tableInfo = db.prepare("PRAGMA table_info(mcp_servers)").all();
    const hasEncryptedColumn = tableInfo.some(col => col.name === 'api_key_encrypted');

    if (!hasEncryptedColumn) {
        // Add new columns to mcp_servers table
        db.exec(`
        ALTER TABLE mcp_servers ADD COLUMN api_key_encrypted BOOLEAN DEFAULT 0;
        ALTER TABLE mcp_servers ADD COLUMN api_key_last_rotated DATETIME;
        ALTER TABLE mcp_servers ADD COLUMN allowed_ips TEXT;
        `);

        console.log('Added encryption and security columns to mcp_servers table');
    }

    // Check if mcp_api_key_history table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mcp_api_key_history'").all();
    if (tables.length === 0) {
        // Create mcp_api_key_history table
        db.exec(`
        CREATE TABLE IF NOT EXISTS mcp_api_key_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id INTEGER NOT NULL,
          key_hash TEXT NOT NULL,
          rotated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          created_by TEXT,
          FOREIGN KEY(server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
        )
      `);

        console.log('Created mcp_api_key_history table');
    }

    // Check if mcp_access_log table exists
    const accessLogTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mcp_access_log'").all();
    if (accessLogTable.length === 0) {
        // Create mcp_access_log table
        db.exec(`
        CREATE TABLE IF NOT EXISTS mcp_access_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id INTEGER NOT NULL,
          action_type TEXT NOT NULL,
          resource_path TEXT,
          user_id TEXT,
          ip_address TEXT,
          status_code INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
        )
      `);

        console.log('Created mcp_access_log table');
    }
}

// Settings functions
function getSetting(provider, key) {
    const stmt = db.prepare('SELECT value FROM settings WHERE provider = ? AND key = ?');
    const row = stmt.get(provider, key);
    return row ? row.value : null;
}

function setSetting(provider, key, value) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (provider, key, value, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
    return stmt.run(provider, key, value);
}

function getProviderSettings(provider) {
    const stmt = db.prepare('SELECT key, value FROM settings WHERE provider = ?');
    const rows = stmt.all(provider);
    const settings = {};
    rows.forEach(row => {
        settings[row.key] = row.value;
    });
    return settings;
}

// Model management functions
function saveAvailableModels(provider, models) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO available_models (provider, model_id, model_name, model_data, last_fetched)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

    const transaction = db.transaction((models) => {
        for (const model of models) {
            stmt.run(
                provider,
                model.id,
                model.name || model.id,
                JSON.stringify(model)
            );
        }
    });

    transaction(models);
}

function getAvailableModels(provider, page = 1, pageSize = 20) {
    // Validate pagination parameters
    page = Math.max(1, parseInt(page) || 1); // Ensure page is at least 1
    pageSize = Math.max(1, Math.min(100, parseInt(pageSize) || 20)); // Limit page size between 1 and 100

    const offset = (page - 1) * pageSize;

    // Get total count for pagination metadata
    const countStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM available_models
        WHERE provider = ?
    `);
    const { total } = countStmt.get(provider);

    // Get paginated results
    const stmt = db.prepare(`
        SELECT model_id, model_name, model_data, last_fetched
        FROM available_models
        WHERE provider = ?
        ORDER BY model_name
        LIMIT ? OFFSET ?
    `);

    const models = stmt.all(provider, pageSize, offset).map(row => ({
        id: row.model_id,
        name: row.model_name,
        data: JSON.parse(row.model_data),
        lastFetched: row.last_fetched
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
        models,
        pagination: {
            total,
            page,
            pageSize,
            totalPages,
            hasNextPage,
            hasPrevPage
        }
    };
}

function getEnabledModels(provider) {
    const stmt = db.prepare(`
    SELECT am.model_id, am.model_name, am.model_data,
           COALESCE(em.enabled, 0) as enabled
    FROM available_models am
    LEFT JOIN enabled_models em ON am.provider = em.provider AND am.model_id = em.model_id
    WHERE am.provider = ?
    ORDER BY am.model_name
  `);
    return stmt.all(provider).map(row => ({
        id: row.model_id,
        name: row.model_name,
        data: JSON.parse(row.model_data),
        enabled: Boolean(row.enabled)
    }));
}

function setModelEnabled(provider, modelId, enabled) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO enabled_models (provider, model_id, enabled)
    VALUES (?, ?, ?)
  `);
    return stmt.run(provider, modelId, enabled ? 1 : 0);
}

function getWorkspaceModels() {
    const stmt = db.prepare(`
    SELECT am.provider, am.model_id, am.model_name, am.model_data
    FROM available_models am
    INNER JOIN enabled_models em ON am.provider = em.provider AND am.model_id = em.model_id
    WHERE em.enabled = 1
    ORDER BY am.provider, am.model_name
  `);

    const models = stmt.all();
    const grouped = {};

    models.forEach(row => {
        if (!grouped[row.provider]) {
            grouped[row.provider] = [];
        }
        grouped[row.provider].push({
            id: row.model_id,
            name: row.model_name,
            data: JSON.parse(row.model_data)
        });
    });

    return grouped;
}

// Agent management functions
function saveAgent(agent) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO agents (name, provider, model, settings, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
    return stmt.run(agent.name, agent.provider, agent.model, JSON.stringify(agent.settings));
}

function getAgent(name) {
    const stmt = db.prepare('SELECT * FROM agents WHERE name = ?');
    const row = stmt.get(name);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        provider: row.provider,
        model: row.model,
        settings: JSON.parse(row.settings),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getAllAgents() {
    const stmt = db.prepare('SELECT * FROM agents ORDER BY name');
    return stmt.all().map(row => ({
        id: row.id,
        name: row.name,
        provider: row.provider,
        model: row.model,
        settings: JSON.parse(row.settings),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

function deleteAgent(name) {
    const stmt = db.prepare('DELETE FROM agents WHERE name = ?');
    return stmt.run(name);
}

// MCP Server management functions
function saveMCPServer(server) {
    const { encrypt } = require('./utils/security');

    // Encrypt API key if provided
    let encryptedKey = null;
    let isEncrypted = 0;

    if (server.apiKey) {
        encryptedKey = encrypt(server.apiKey);
        isEncrypted = 1;
    }

    const stmt = db.prepare(`
    INSERT OR REPLACE INTO mcp_servers (
        name, display_name, endpoint, api_key, api_key_encrypted,
        api_key_last_rotated, server_type, status, capabilities,
        metadata, allowed_ips, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

    const result = stmt.run(
        server.name,
        server.displayName,
        server.endpoint,
        encryptedKey,
        isEncrypted,
        server.apiKeyLastRotated || null,
        server.serverType,
        server.status || 'disconnected',
        JSON.stringify(server.capabilities || {}),
        JSON.stringify(server.metadata || {}),
        server.allowedIps || null
    );

    // If this is a new API key, add it to the rotation history
    if (encryptedKey && (!server.id || server.apiKeyLastRotated)) {
        const serverId = server.id || result.lastInsertRowid;
        const keyHash = require('crypto').createHash('sha256').update(server.apiKey).digest('hex');

        const historyStmt = db.prepare(`
        INSERT INTO mcp_api_key_history (
            server_id, key_hash, rotated_at, expires_at, created_by
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
      `);

        historyStmt.run(
            serverId,
            keyHash,
            server.apiKeyExpires || null,
            server.userId || 'system'
        );
    }

    return result;
}

function getMCPServer(name) {
    const { decrypt } = require('./utils/security');

    const stmt = db.prepare('SELECT * FROM mcp_servers WHERE name = ?');
    const row = stmt.get(name);
    if (!row) return null;

    // Decrypt API key if encrypted
    let apiKey = row.api_key;
    if (row.api_key && row.api_key_encrypted) {
        apiKey = decrypt(row.api_key);
    }

    return {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        endpoint: row.endpoint,
        apiKey: apiKey,
        apiKeyEncrypted: Boolean(row.api_key_encrypted),
        apiKeyLastRotated: row.api_key_last_rotated,
        serverType: row.server_type,
        status: row.status,
        capabilities: JSON.parse(row.capabilities || '{}'),
        metadata: JSON.parse(row.metadata || '{}'),
        allowedIps: row.allowed_ips,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getAllMCPServers() {
    const stmt = db.prepare('SELECT * FROM mcp_servers ORDER BY name');
    return stmt.all().map(row => {
        // Don't decrypt API keys when returning all servers
        // Just indicate if they are encrypted
        return {
            id: row.id,
            name: row.name,
            displayName: row.display_name,
            endpoint: row.endpoint,
            apiKey: row.api_key ? '••••••' : null,
            apiKeyEncrypted: Boolean(row.api_key_encrypted),
            apiKeyLastRotated: row.api_key_last_rotated,
            serverType: row.server_type,
            status: row.status,
            capabilities: JSON.parse(row.capabilities || '{}'),
            metadata: JSON.parse(row.metadata || '{}'),
            allowedIps: row.allowed_ips,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    });
}

function deleteMCPServer(name) {
    const stmt = db.prepare('DELETE FROM mcp_servers WHERE name = ?');
    return stmt.run(name);
}

function updateMCPServerStatus(name, status, capabilities = null) {
    const stmt = db.prepare(`
    UPDATE mcp_servers
    SET status = ?,
        capabilities = COALESCE(?, capabilities),
        updated_at = CURRENT_TIMESTAMP
    WHERE name = ?
  `);

    return stmt.run(
        status,
        capabilities ? JSON.stringify(capabilities) : null,
        name
    );
}

function saveMCPServerTool(serverName, tool) {
    const server = getMCPServer(serverName);
    if (!server) {
        throw new Error(`MCP server '${serverName}' not found`);
    }

    const stmt = db.prepare(`
    INSERT OR REPLACE INTO mcp_server_tools (
        server_id, tool_name, display_name, description,
        input_schema, output_schema, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

    return stmt.run(
        server.id,
        tool.name,
        tool.displayName || tool.name,
        tool.description || '',
        JSON.stringify(tool.inputSchema || {}),
        JSON.stringify(tool.outputSchema || {})
    );
}

function getMCPServerTools(serverName) {
    const server = getMCPServer(serverName);
    if (!server) {
        throw new Error(`MCP server '${serverName}' not found`);
    }

    const stmt = db.prepare(`
    SELECT * FROM mcp_server_tools
    WHERE server_id = ?
    ORDER BY tool_name
  `);

    return stmt.all(server.id).map(row => ({
        id: row.id,
        name: row.tool_name,
        displayName: row.display_name,
        description: row.description,
        inputSchema: JSON.parse(row.input_schema || '{}'),
        outputSchema: JSON.parse(row.output_schema || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

function saveMCPServerResource(serverName, resource) {
    const server = getMCPServer(serverName);
    if (!server) {
        throw new Error(`MCP server '${serverName}' not found`);
    }

    const stmt = db.prepare(`
    INSERT OR REPLACE INTO mcp_server_resources (
        server_id, resource_uri, display_name, description,
        resource_type, metadata, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

    return stmt.run(
        server.id,
        resource.uri,
        resource.displayName || resource.uri,
        resource.description || '',
        resource.resourceType,
        JSON.stringify(resource.metadata || {})
    );
}

function getMCPServerResources(serverName) {
    const server = getMCPServer(serverName);
    if (!server) {
        throw new Error(`MCP server '${serverName}' not found`);
    }

    const stmt = db.prepare(`
    SELECT * FROM mcp_server_resources
    WHERE server_id = ?
    ORDER BY resource_uri
  `);

    return stmt.all(server.id).map(row => ({
        id: row.id,
        uri: row.resource_uri,
        displayName: row.display_name,
        description: row.description,
        resourceType: row.resource_type,
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

/**
 * Rotate MCP server API key
 * @param {string} serverName - Name of the MCP server
 * @param {string} newApiKey - New API key
 * @param {Object} options - Additional options
 * @returns {Object} - Result of the operation
 */
function rotateMCPServerApiKey(serverName, newApiKey, options = {}) {
    const { encrypt, validateApiKey } = require('./utils/security');

    // Validate the new API key
    const validation = validateApiKey(newApiKey);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Get the server
    const server = getMCPServer(serverName);
    if (!server) {
        throw new Error(`MCP server '${serverName}' not found`);
    }

    // Encrypt the new API key
    const encryptedKey = encrypt(newApiKey);

    // Update the server with the new API key
    const stmt = db.prepare(`
    UPDATE mcp_servers
    SET api_key = ?,
        api_key_encrypted = 1,
        api_key_last_rotated = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE name = ?
  `);

    const result = stmt.run(encryptedKey, serverName);

    // Add the new key to the rotation history
    const keyHash = require('crypto').createHash('sha256').update(newApiKey).digest('hex');

    const historyStmt = db.prepare(`
    INSERT INTO mcp_api_key_history (
        server_id, key_hash, rotated_at, expires_at, created_by
    ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
  `);

    historyStmt.run(
        server.id,
        keyHash,
        options.expiresAt || null,
        options.userId || 'system'
    );

    return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'API key rotated successfully' : 'Failed to rotate API key'
    };
}

/**
 * Log MCP server access
 * @param {number} serverId - ID of the MCP server
 * @param {string} actionType - Type of action (execute_tool, access_resource, etc.)
 * @param {string} resourcePath - Path of the resource being accessed
 * @param {Object} options - Additional options
 * @returns {Object} - Result of the operation
 */
function logMCPAccess(serverId, actionType, resourcePath, options = {}) {
    const stmt = db.prepare(`
    INSERT INTO mcp_access_log (
        server_id, action_type, resource_path, user_id, ip_address, status_code
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

    return stmt.run(
        serverId,
        actionType,
        resourcePath,
        options.userId || null,
        options.ipAddress || null,
        options.statusCode || 200
    );
}

/**
 * Get MCP server access logs
 * @param {number} serverId - ID of the MCP server
 * @param {Object} options - Query options
 * @returns {Array} - Array of access logs
 */
function getMCPAccessLogs(serverId, options = {}) {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const stmt = db.prepare(`
    SELECT * FROM mcp_access_log
    WHERE server_id = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

    return stmt.all(serverId, limit, offset);
}

// Multi-Agent Collaboration Functions

// Workspace management
function createWorkspace(workspace) {
    const stmt = db.prepare(`
        INSERT INTO workspaces (name, description, config, thumbnail, is_default)
        VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
        workspace.name,
        workspace.description || null,
        JSON.stringify(workspace.config || {}),
        workspace.thumbnail || null,
        workspace.isDefault || 0
    );
}

function getWorkspace(id) {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        config: JSON.parse(row.config || '{}'),
        thumbnail: row.thumbnail,
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getAllWorkspaces() {
    const stmt = db.prepare('SELECT * FROM workspaces ORDER BY is_default DESC, name');
    return stmt.all().map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        config: JSON.parse(row.config || '{}'),
        thumbnail: row.thumbnail,
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

function updateWorkspace(id, updates) {
    const stmt = db.prepare(`
        UPDATE workspaces
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            config = COALESCE(?, config),
            thumbnail = COALESCE(?, thumbnail),
            is_default = COALESCE(?, is_default),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(
        updates.name || null,
        updates.description || null,
        updates.config ? JSON.stringify(updates.config) : null,
        updates.thumbnail || null,
        updates.isDefault !== undefined ? updates.isDefault : null,
        id
    );
}

function deleteWorkspace(id) {
    const stmt = db.prepare('DELETE FROM workspaces WHERE id = ?');
    return stmt.run(id);
}

// Agent conversation management
function createAgentConversation(conversation) {
    const stmt = db.prepare(`
        INSERT INTO agent_conversations (workspace_id, conversation_id, participants, orchestrator_id, status)
        VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
        conversation.workspaceId,
        conversation.conversationId,
        JSON.stringify(conversation.participants || []),
        conversation.orchestratorId || null,
        conversation.status || 'active'
    );
}

function getAgentConversation(conversationId) {
    const stmt = db.prepare('SELECT * FROM agent_conversations WHERE conversation_id = ?');
    const row = stmt.get(conversationId);
    if (!row) return null;

    return {
        id: row.id,
        workspaceId: row.workspace_id,
        conversationId: row.conversation_id,
        participants: JSON.parse(row.participants || '[]'),
        orchestratorId: row.orchestrator_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getWorkspaceConversations(workspaceId) {
    const stmt = db.prepare('SELECT * FROM agent_conversations WHERE workspace_id = ? ORDER BY created_at DESC');
    return stmt.all(workspaceId).map(row => ({
        id: row.id,
        workspaceId: row.workspace_id,
        conversationId: row.conversation_id,
        participants: JSON.parse(row.participants || '[]'),
        orchestratorId: row.orchestrator_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

// Agent message handling
function sendAgentMessage(message) {
    const stmt = db.prepare(`
        INSERT INTO agent_messages (conversation_id, from_agent_id, to_agent_id, message_type, content, parent_message_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        message.conversationId,
        message.fromAgentId,
        message.toAgentId || null,
        message.messageType,
        JSON.stringify(message.content),
        message.parentMessageId || null
    );
}

function getConversationMessages(conversationId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
        SELECT * FROM agent_messages
        WHERE conversation_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    `);
    return stmt.all(conversationId, limit, offset).map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        fromAgentId: row.from_agent_id,
        toAgentId: row.to_agent_id,
        messageType: row.message_type,
        content: JSON.parse(row.content || '{}'),
        parentMessageId: row.parent_message_id,
        timestamp: row.timestamp
    }));
}

// Task assignment and management
function assignTask(task) {
    const stmt = db.prepare(`
        INSERT INTO agent_tasks (conversation_id, assigner_id, assignee_id, task_description, task_data, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        task.conversationId,
        task.assignerId,
        task.assigneeId,
        task.description,
        JSON.stringify(task.data || {}),
        task.status || 'pending'
    );
}

function updateTaskStatus(taskId, status, result = null) {
    const stmt = db.prepare(`
        UPDATE agent_tasks
        SET status = ?, result = ?, completed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = ?
    `);
    return stmt.run(status, result ? JSON.stringify(result) : null, status, taskId);
}

function getAgentTasks(agentId, status = null) {
    let query = 'SELECT * FROM agent_tasks WHERE assignee_id = ?';
    let params = [agentId];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params).map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        assignerId: row.assigner_id,
        assigneeId: row.assignee_id,
        description: row.task_description,
        data: JSON.parse(row.task_data || '{}'),
        status: row.status,
        result: row.result ? JSON.parse(row.result) : null,
        createdAt: row.created_at,
        completedAt: row.completed_at
    }));
}

// Get tasks for a specific conversation
function getConversationTasks(conversationId) {
    const stmt = db.prepare(`
        SELECT * FROM agent_tasks
        WHERE conversation_id = ?
        ORDER BY created_at DESC
    `);
    return stmt.all(conversationId).map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        assignerId: row.assigner_id,
        assigneeId: row.assignee_id,
        description: row.task_description,
        data: JSON.parse(row.task_data || '{}'),
        status: row.status,
        result: row.result ? JSON.parse(row.result) : null,
        createdAt: row.created_at,
        completedAt: row.completed_at
    }));
}

// Shared context management
function setWorkspaceContext(workspaceId, contextType, key, value, agentId) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO workspace_context (workspace_id, context_type, context_key, context_value, created_by_agent, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(workspaceId, contextType, key, JSON.stringify(value), agentId);
}

function getWorkspaceContext(workspaceId, contextType = null) {
    let query = 'SELECT * FROM workspace_context WHERE workspace_id = ?';
    let params = [workspaceId];

    if (contextType) {
        query += ' AND context_type = ?';
        params.push(contextType);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params).map(row => ({
        id: row.id,
        workspaceId: row.workspace_id,
        contextType: row.context_type,
        key: row.context_key,
        value: JSON.parse(row.context_value || '{}'),
        createdByAgent: row.created_by_agent,
        updatedAt: row.updated_at
    }));
}

// Workspace-agent relationships
function addAgentToWorkspace(workspaceId, agentId, role = 'participant') {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO workspace_agents (workspace_id, agent_id, role, joined_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(workspaceId, agentId, role);
}

function removeAgentFromWorkspace(workspaceId, agentId) {
    const stmt = db.prepare('DELETE FROM workspace_agents WHERE workspace_id = ? AND agent_id = ?');
    return stmt.run(workspaceId, agentId);
}

function getWorkspaceAgents(workspaceId) {
    const stmt = db.prepare(`
        SELECT wa.*, a.name, a.provider, a.model, a.role as agent_role, a.capabilities, a.enabled
        FROM workspace_agents wa
        JOIN agents a ON wa.agent_id = a.id
        WHERE wa.workspace_id = ?
        ORDER BY wa.joined_at
    `);
    return stmt.all(workspaceId).map(row => ({
        id: row.id,
        workspaceId: row.workspace_id,
        agentId: row.agent_id,
        role: row.role,
        joinedAt: row.joined_at,
        agent: {
            id: row.agent_id,
            name: row.name,
            provider: row.provider,
            model: row.model,
            role: row.agent_role,
            capabilities: JSON.parse(row.capabilities || '{}'),
            enabled: Boolean(row.enabled)
        }
    }));
}

// Agent tools management
function attachToolToAgent(agentId, toolType, toolIdentifier, config = {}) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO agent_tools (agent_id, tool_type, tool_identifier, tool_config, enabled)
        VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(agentId, toolType, toolIdentifier, JSON.stringify(config), 1);
}

function detachToolFromAgent(agentId, toolType, toolIdentifier) {
    const stmt = db.prepare('DELETE FROM agent_tools WHERE agent_id = ? AND tool_type = ? AND tool_identifier = ?');
    return stmt.run(agentId, toolType, toolIdentifier);
}

function getAgentTools(agentId) {
    const stmt = db.prepare('SELECT * FROM agent_tools WHERE agent_id = ? AND enabled = 1');
    return stmt.all(agentId).map(row => ({
        id: row.id,
        agentId: row.agent_id,
        toolType: row.tool_type,
        toolIdentifier: row.tool_identifier,
        config: JSON.parse(row.tool_config || '{}'),
        enabled: Boolean(row.enabled),
        createdAt: row.created_at
    }));
}

// Enhanced agent functions with collaboration features
function saveAgentEnhanced(agent) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO agents (name, provider, model, settings, role, capabilities, enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
        agent.name,
        agent.provider,
        agent.model,
        JSON.stringify(agent.settings),
        agent.role || 'assistant',
        JSON.stringify(agent.capabilities || {}),
        agent.enabled !== undefined ? (agent.enabled ? 1 : 0) : 1
    );
}

function getAgentEnhanced(name) {
    const stmt = db.prepare('SELECT * FROM agents WHERE name = ?');
    const row = stmt.get(name);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        provider: row.provider,
        model: row.model,
        settings: JSON.parse(row.settings),
        role: row.role || 'assistant',
        capabilities: JSON.parse(row.capabilities || '{}'),
        enabled: Boolean(row.enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// Knowledge Base Functions
function createKnowledgeBase(knowledgeBase) {
    const stmt = db.prepare(`
        INSERT INTO knowledge_bases (id, name, description, type, vector_enabled, embedding_model, chunk_size, chunk_overlap, document_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        knowledgeBase.id,
        knowledgeBase.name,
        knowledgeBase.description || null,
        knowledgeBase.type || 'documents',
        knowledgeBase.vectorEnabled ? 1 : 0,
        knowledgeBase.embeddingModel || 'text-embedding-ada-002',
        knowledgeBase.chunkSize || 1000,
        knowledgeBase.chunkOverlap || 200,
        knowledgeBase.documentCount || 0,
        knowledgeBase.createdAt || new Date().toISOString(),
        knowledgeBase.updatedAt || new Date().toISOString()
    );
}

function getKnowledgeBase(id) {
    const stmt = db.prepare('SELECT * FROM knowledge_bases WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        vectorEnabled: Boolean(row.vector_enabled),
        embeddingModel: row.embedding_model,
        chunkSize: row.chunk_size,
        chunkOverlap: row.chunk_overlap,
        documentCount: row.document_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getAllKnowledgeBases() {
    const stmt = db.prepare('SELECT * FROM knowledge_bases ORDER BY name');
    return stmt.all().map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        vectorEnabled: Boolean(row.vector_enabled),
        embeddingModel: row.embedding_model,
        chunkSize: row.chunk_size,
        chunkOverlap: row.chunk_overlap,
        documentCount: row.document_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

function updateKnowledgeBase(id, updates) {
    const stmt = db.prepare(`
        UPDATE knowledge_bases
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            type = COALESCE(?, type),
            vector_enabled = COALESCE(?, vector_enabled),
            embedding_model = COALESCE(?, embedding_model),
            chunk_size = COALESCE(?, chunk_size),
            chunk_overlap = COALESCE(?, chunk_overlap),
            document_count = COALESCE(?, document_count),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(
        updates.name || null,
        updates.description || null,
        updates.type || null,
        updates.vectorEnabled !== undefined ? (updates.vectorEnabled ? 1 : 0) : null,
        updates.embeddingModel || null,
        updates.chunkSize || null,
        updates.chunkOverlap || null,
        updates.documentCount || null,
        id
    );
}

function deleteKnowledgeBase(id) {
    const stmt = db.prepare('DELETE FROM knowledge_bases WHERE id = ?');
    return stmt.run(id);
}

function addDocumentToKnowledgeBase(knowledgeBaseId, document) {
    const stmt = db.prepare(`
        INSERT INTO knowledge_documents (id, knowledge_base_id, filename, filepath, mimetype, size, content, processed, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        document.id,
        knowledgeBaseId,
        document.filename,
        document.filepath || null,
        document.mimetype || null,
        document.size || null,
        document.content || null,
        document.processed ? 1 : 0,
        document.uploadedAt || new Date().toISOString()
    );
}

function getKnowledgeBaseDocuments(knowledgeBaseId) {
    const stmt = db.prepare('SELECT * FROM knowledge_documents WHERE knowledge_base_id = ? ORDER BY uploaded_at DESC');
    return stmt.all(knowledgeBaseId).map(row => ({
        id: row.id,
        knowledgeBaseId: row.knowledge_base_id,
        filename: row.filename,
        filepath: row.filepath,
        mimetype: row.mimetype,
        size: row.size,
        content: row.content,
        processed: Boolean(row.processed),
        uploadedAt: row.uploaded_at
    }));
}

// Tools Functions
function createTool(tool) {
    const stmt = db.prepare(`
        INSERT INTO tools (id, name, description, category, enabled, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        tool.id,
        tool.name,
        tool.description || null,
        tool.category || 'Utility',
        tool.enabled !== undefined ? (tool.enabled ? 1 : 0) : 1,
        JSON.stringify(tool.config || {}),
        tool.createdAt || new Date().toISOString(),
        tool.updatedAt || new Date().toISOString()
    );
}

function getTool(id) {
    const stmt = db.prepare('SELECT * FROM tools WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        enabled: Boolean(row.enabled),
        config: JSON.parse(row.config || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getAllTools() {
    const stmt = db.prepare('SELECT * FROM tools ORDER BY name');
    return stmt.all().map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        enabled: Boolean(row.enabled),
        config: JSON.parse(row.config || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

function updateTool(id, updates) {
    const stmt = db.prepare(`
        UPDATE tools
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            category = COALESCE(?, category),
            enabled = COALESCE(?, enabled),
            config = COALESCE(?, config),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(
        updates.name || null,
        updates.description || null,
        updates.category || null,
        updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : null,
        updates.config ? JSON.stringify(updates.config) : null,
        id
    );
}

function deleteTool(id) {
    const stmt = db.prepare('DELETE FROM tools WHERE id = ?');
    return stmt.run(id);
}

// TestBench Agent Functions

// System Permissions Management
function getSystemPermissions(role) {
    const stmt = db.prepare('SELECT * FROM system_permissions WHERE role = ?');
    return stmt.all(role).map(row => ({
        id: row.id,
        role: row.role,
        permissionType: row.permission_type,
        permissionScope: row.permission_scope,
        permissionActions: JSON.parse(row.permission_actions || '[]'),
        createdAt: row.created_at
    }));
}

function hasPermission(role, permissionType, permissionScope, action) {
    const stmt = db.prepare(`
        SELECT permission_actions FROM system_permissions
        WHERE role = ? AND permission_type = ? AND permission_scope = ?
    `);
    const row = stmt.get(role, permissionType, permissionScope);

    if (!row) return false;

    const actions = JSON.parse(row.permission_actions || '[]');
    return actions.includes(action);
}

function addSystemPermission(role, permissionType, permissionScope, actions) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO system_permissions (role, permission_type, permission_scope, permission_actions)
        VALUES (?, ?, ?, ?)
    `);
    return stmt.run(role, permissionType, permissionScope, JSON.stringify(actions));
}

// Audit Logging
function logTestBenchAction(agentId, actionType, resourceType, resourceId, actionDetails, success, errorMessage = null, ipAddress = null, userAgent = null) {
    const stmt = db.prepare(`
        INSERT INTO audit_log (agent_id, action_type, resource_type, resource_id, action_details, success, error_message, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        agentId,
        actionType,
        resourceType,
        resourceId,
        JSON.stringify(actionDetails),
        success ? 1 : 0,
        errorMessage,
        ipAddress,
        userAgent
    );
}

function getAuditLogs(filters = {}) {
    let query = 'SELECT * FROM audit_log';
    let params = [];
    let conditions = [];

    if (filters.agentId) {
        conditions.push('agent_id = ?');
        params.push(filters.agentId);
    }
    if (filters.actionType) {
        conditions.push('action_type = ?');
        params.push(filters.actionType);
    }
    if (filters.resourceType) {
        conditions.push('resource_type = ?');
        params.push(filters.resourceType);
    }
    if (filters.success !== undefined) {
        conditions.push('success = ?');
        params.push(filters.success ? 1 : 0);
    }
    if (filters.since) {
        conditions.push('timestamp >= ?');
        params.push(filters.since);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params).map(row => ({
        id: row.id,
        agentId: row.agent_id,
        actionType: row.action_type,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        actionDetails: JSON.parse(row.action_details || '{}'),
        success: Boolean(row.success),
        errorMessage: row.error_message,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp
    }));
}

// TestBench Configurations
function createTestBenchConfiguration(config) {
    const stmt = db.prepare(`
        INSERT INTO testbench_configurations (name, description, config_type, config_data, version, is_template, is_active, created_by_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        config.name,
        config.description || null,
        config.configType,
        JSON.stringify(config.configData),
        config.version || '1.0.0',
        config.isTemplate ? 1 : 0,
        config.isActive !== undefined ? (config.isActive ? 1 : 0) : 1,
        config.createdByAgent || null
    );
}

function getTestBenchConfiguration(id) {
    const stmt = db.prepare('SELECT * FROM testbench_configurations WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        configType: row.config_type,
        configData: JSON.parse(row.config_data || '{}'),
        version: row.version,
        isTemplate: Boolean(row.is_template),
        isActive: Boolean(row.is_active),
        createdByAgent: row.created_by_agent,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getTestBenchConfigurationByName(name) {
    const stmt = db.prepare('SELECT * FROM testbench_configurations WHERE name = ?');
    const row = stmt.get(name);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        configType: row.config_type,
        configData: JSON.parse(row.config_data || '{}'),
        version: row.version,
        isTemplate: Boolean(row.is_template),
        isActive: Boolean(row.is_active),
        createdByAgent: row.created_by_agent,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getAllTestBenchConfigurations(configType = null, templatesOnly = false) {
    let query = 'SELECT * FROM testbench_configurations';
    let params = [];
    let conditions = [];

    if (configType) {
        conditions.push('config_type = ?');
        params.push(configType);
    }
    if (templatesOnly) {
        conditions.push('is_template = 1');
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name';

    const stmt = db.prepare(query);
    return stmt.all(...params).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        configType: row.config_type,
        configData: JSON.parse(row.config_data || '{}'),
        version: row.version,
        isTemplate: Boolean(row.is_template),
        isActive: Boolean(row.is_active),
        createdByAgent: row.created_by_agent,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

function updateTestBenchConfiguration(id, updates) {
    const stmt = db.prepare(`
        UPDATE testbench_configurations
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            config_type = COALESCE(?, config_type),
            config_data = COALESCE(?, config_data),
            version = COALESCE(?, version),
            is_template = COALESCE(?, is_template),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(
        updates.name || null,
        updates.description || null,
        updates.configType || null,
        updates.configData ? JSON.stringify(updates.configData) : null,
        updates.version || null,
        updates.isTemplate !== undefined ? (updates.isTemplate ? 1 : 0) : null,
        updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
        id
    );
}

function deleteTestBenchConfiguration(id) {
    const stmt = db.prepare('DELETE FROM testbench_configurations WHERE id = ?');
    return stmt.run(id);
}

// Backup Snapshots
function createBackupSnapshot(snapshot) {
    const stmt = db.prepare(`
        INSERT INTO backup_snapshots (name, description, snapshot_type, snapshot_data, created_by_agent)
        VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
        snapshot.name,
        snapshot.description || null,
        snapshot.snapshotType,
        JSON.stringify(snapshot.snapshotData),
        snapshot.createdByAgent || null
    );
}

function getBackupSnapshot(id) {
    const stmt = db.prepare('SELECT * FROM backup_snapshots WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        snapshotType: row.snapshot_type,
        snapshotData: JSON.parse(row.snapshot_data || '{}'),
        createdByAgent: row.created_by_agent,
        createdAt: row.created_at
    };
}

function getAllBackupSnapshots(snapshotType = null) {
    let query = 'SELECT * FROM backup_snapshots';
    let params = [];

    if (snapshotType) {
        query += ' WHERE snapshot_type = ?';
        params.push(snapshotType);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        snapshotType: row.snapshot_type,
        snapshotData: JSON.parse(row.snapshot_data || '{}'),
        createdByAgent: row.created_by_agent,
        createdAt: row.created_at
    }));
}

function deleteBackupSnapshot(id) {
    const stmt = db.prepare('DELETE FROM backup_snapshots WHERE id = ?');
    return stmt.run(id);
}

// Feature Tests
function createFeatureTest(test) {
    const stmt = db.prepare(`
        INSERT INTO feature_tests (test_name, test_type, test_config, status, started_by_agent, total_assertions)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        test.testName,
        test.testType,
        JSON.stringify(test.testConfig),
        test.status || 'pending',
        test.startedByAgent || null,
        test.totalAssertions || 0
    );
}

function getFeatureTest(id) {
    const stmt = db.prepare('SELECT * FROM feature_tests WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    return {
        id: row.id,
        testName: row.test_name,
        testType: row.test_type,
        testConfig: JSON.parse(row.test_config || '{}'),
        testResults: row.test_results ? JSON.parse(row.test_results) : null,
        status: row.status,
        startedByAgent: row.started_by_agent,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        successRate: row.success_rate,
        totalAssertions: row.total_assertions,
        passedAssertions: row.passed_assertions
    };
}

function updateFeatureTest(id, updates) {
    const stmt = db.prepare(`
        UPDATE feature_tests
        SET test_results = COALESCE(?, test_results),
            status = COALESCE(?, status),
            completed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
            success_rate = COALESCE(?, success_rate),
            total_assertions = COALESCE(?, total_assertions),
            passed_assertions = COALESCE(?, passed_assertions)
        WHERE id = ?
    `);
    return stmt.run(
        updates.testResults ? JSON.stringify(updates.testResults) : null,
        updates.status || null,
        updates.status || '',
        updates.successRate || null,
        updates.totalAssertions || null,
        updates.passedAssertions || null,
        id
    );
}

function getAllFeatureTests(status = null) {
    let query = 'SELECT * FROM feature_tests';
    let params = [];

    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }

    query += ' ORDER BY started_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params).map(row => ({
        id: row.id,
        testName: row.test_name,
        testType: row.test_type,
        testConfig: JSON.parse(row.test_config || '{}'),
        testResults: row.test_results ? JSON.parse(row.test_results) : null,
        status: row.status,
        startedByAgent: row.started_by_agent,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        successRate: row.success_rate,
        totalAssertions: row.total_assertions,
        passedAssertions: row.passed_assertions
    }));
}

function deleteFeatureTest(id) {
    const stmt = db.prepare('DELETE FROM feature_tests WHERE id = ?');
    return stmt.run(id);
}

// Initialize database on module load
initializeDatabase();

// Migrate database to latest schema
migrateDatabase();

module.exports = {
    db,
    getSetting,
    setSetting,
    getProviderSettings,
    saveAvailableModels,
    getAvailableModels,
    getEnabledModels,
    setModelEnabled,
    getWorkspaceModels,
    saveAgent,
    getAgent,
    getAllAgents,
    migrateDatabase,
    deleteAgent,
    // MCP Server functions
    saveMCPServer,
    getMCPServer,
    getAllMCPServers,
    deleteMCPServer,
    updateMCPServerStatus,
    saveMCPServerTool,
    getMCPServerTools,
    saveMCPServerResource,
    getMCPServerResources,
    rotateMCPServerApiKey,
    logMCPAccess,
    getMCPAccessLogs,
    // Multi-Agent Collaboration functions
    createWorkspace,
    getWorkspace,
    getAllWorkspaces,
    updateWorkspace,
    deleteWorkspace,
    createAgentConversation,
    getAgentConversation,
    getWorkspaceConversations,
    sendAgentMessage,
    getConversationMessages,
    getConversationTasks,
    assignTask,
    updateTaskStatus,
    getAgentTasks,
    setWorkspaceContext,
    getWorkspaceContext,
    addAgentToWorkspace,
    removeAgentFromWorkspace,
    getWorkspaceAgents,
    attachToolToAgent,
    detachToolFromAgent,
    getAgentTools,
    saveAgentEnhanced,
    getAgentEnhanced,
    // Knowledge Base functions
    createKnowledgeBase,
    getKnowledgeBase,
    getAllKnowledgeBases,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    addDocumentToKnowledgeBase,
    getKnowledgeBaseDocuments,
    // Tools functions
    createTool,
    getTool,
    getAllTools,
    updateTool,
    deleteTool,
    // TestBench Agent functions
    getSystemPermissions,
    hasPermission,
    addSystemPermission,
    logTestBenchAction,
    getAuditLogs,
    createTestBenchConfiguration,
    getTestBenchConfiguration,
    getTestBenchConfigurationByName,
    getAllTestBenchConfigurations,
    updateTestBenchConfiguration,
    deleteTestBenchConfiguration,
    createBackupSnapshot,
    getBackupSnapshot,
    getAllBackupSnapshots,
    deleteBackupSnapshot,
    createFeatureTest,
    getFeatureTest,
    updateFeatureTest,
    getAllFeatureTests,
    deleteFeatureTest,
    // Aliases for function name compatibility
    getWorkspaces: getAllWorkspaces,
    getAgentConversations: getWorkspaceConversations,
    getAgentMessages: getConversationMessages
};
