const express = require('express');
const router = express.Router();
const { executeMCPTool, accessMCPResource } = require('../providers/mcp');

// Execute MCP tool
router.post('/api/mcp/execute/:server/:tool', async (req, res) => {
    try {
        const { server, tool } = req.params;
        const { arguments: toolArguments = {}, config = {} } = req.body;

        const result = await executeMCPTool(server, tool, toolArguments, config);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Access MCP resource
router.post('/api/mcp/access/:server', async (req, res) => {
    try {
        const { server } = req.params;
        const { uri, config = {} } = req.body;

        if (!uri) {
            return res.status(400).json({ error: 'Resource URI is required' });
        }

        const result = await accessMCPResource(server, uri, config);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
