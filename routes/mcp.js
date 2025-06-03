const express = require('express');
const router = express.Router();
const { executeMCPTool, accessMCPResource } = require('../providers/mcp');
const { validateServerName, validateToolArguments, validateResourceUri, sanitizeErrorMessage } = require('../utils/security');
const { authenticate } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimiter');
const database = require('../database');

// Allowed MCP servers whitelist
const ALLOWED_MCP_SERVERS = process.env.ALLOWED_MCP_SERVERS
    ? process.env.ALLOWED_MCP_SERVERS.split(',')
    : ['conport', 'weather', 'filesystem', 'time'];

// Execute MCP tool
router.post('/api/mcp/execute/:server/:tool',
    authenticate({ required: true }),
    dynamicRateLimiter('mcpExecute'),
    async (req, res) => {
        try {
            const { server, tool } = req.params;
            const { arguments: toolArguments = {}, config = {} } = req.body;

            // Validate server name
            const serverValidation = validateServerName(server);
            if (!serverValidation.valid) {
                return res.status(400).json({ error: serverValidation.error });
            }

            // Check if server is in whitelist
            if (!ALLOWED_MCP_SERVERS.includes(server)) {
                return res.status(403).json({
                    error: 'Server not allowed',
                    allowed: ALLOWED_MCP_SERVERS
                });
            }

            // Validate tool name format (alphanumeric with underscores)
            if (!/^[a-zA-Z0-9_]+$/.test(tool)) {
                return res.status(400).json({
                    error: 'Invalid tool name format'
                });
            }

            // Get MCP server info from database to check tool exists
            const mcpServer = database.getMCPServer(server);
            if (!mcpServer) {
                return res.status(404).json({ error: 'MCP server not found' });
            }

            // Get tool schema if available
            const tools = database.getMCPServerTools(server);
            const toolInfo = tools.find(t => t.name === tool);

            // Validate tool arguments if schema is available
            if (toolInfo && toolInfo.inputSchema) {
                const argValidation = validateToolArguments(toolArguments, toolInfo.inputSchema);
                if (!argValidation.valid) {
                    return res.status(400).json({ error: argValidation.error });
                }
                // Use sanitized arguments
                toolArguments = argValidation.sanitized || toolArguments;
            }

            // Log MCP access
            database.logMCPAccess(mcpServer.id, 'execute_tool', `${server}/${tool}`, {
                userId: req.user.id,
                ipAddress: req.ip,
                statusCode: 200
            });

            // Execute tool with user context
            const result = await executeMCPTool(server, tool, toolArguments, config, {
                agentId: req.user.id,
                role: req.user.role
            });

            res.json(result);
        } catch (error) {
            console.error('MCP tool execution error:', error);
            const sanitized = sanitizeErrorMessage(error);
            res.status(sanitized.status).json(sanitized);
        }
});

// Access MCP resource
router.post('/api/mcp/access/:server',
    authenticate({ required: true }),
    dynamicRateLimiter('mcpExecute'),
    async (req, res) => {
        try {
            const { server } = req.params;
            const { uri, config = {} } = req.body;

            // Validate server name
            const serverValidation = validateServerName(server);
            if (!serverValidation.valid) {
                return res.status(400).json({ error: serverValidation.error });
            }

            // Check if server is in whitelist
            if (!ALLOWED_MCP_SERVERS.includes(server)) {
                return res.status(403).json({
                    error: 'Server not allowed',
                    allowed: ALLOWED_MCP_SERVERS
                });
            }

            if (!uri) {
                return res.status(400).json({ error: 'Resource URI is required' });
            }

            // Validate and sanitize URI
            const uriValidation = validateResourceUri(uri);
            if (!uriValidation.valid) {
                return res.status(400).json({ error: uriValidation.error });
            }
            const sanitizedUri = uriValidation.sanitized || uri;

            // Get MCP server info from database
            const mcpServer = database.getMCPServer(server);
            if (!mcpServer) {
                return res.status(404).json({ error: 'MCP server not found' });
            }

            // Log MCP access
            database.logMCPAccess(mcpServer.id, 'access_resource', sanitizedUri, {
                userId: req.user.id,
                ipAddress: req.ip,
                statusCode: 200
            });

            const result = await accessMCPResource(server, sanitizedUri, config);
            res.json(result);
        } catch (error) {
            console.error('MCP resource access error:', error);
            const sanitized = sanitizeErrorMessage(error);
            res.status(sanitized.status).json(sanitized);
        }
});

// List available MCP servers
router.get('/api/mcp/servers',
    authenticate({ required: false }),
    dynamicRateLimiter('api'),
    async (req, res) => {
        try {
            const servers = database.getAllMCPServers();

            // Filter based on user permissions
            const filteredServers = servers.map(server => ({
                name: server.name,
                displayName: server.displayName,
                serverType: server.serverType,
                status: server.status,
                capabilities: server.capabilities
                // Don't expose sensitive data like endpoints or API keys
            }));

            res.json({ servers: filteredServers });
        } catch (error) {
            console.error('Error listing MCP servers:', error);
            const sanitized = sanitizeErrorMessage(error);
            res.status(sanitized.status).json(sanitized);
        }
});

module.exports = router;
