const fetch = require('node-fetch');

// Agent context and load balancing state
const agentMCPAssignments = new Map();
const mcpLoadMetrics = new Map();

async function executeMCPTool(serverName, toolName, toolArguments, providerConfig = {}, agentContext = null) {
    const startTime = Date.now();
    const endpoint = providerConfig.endpoint || process.env[`MCP_${serverName.toUpperCase()}_ENDPOINT`];
    const apiKey = providerConfig.key || process.env[`MCP_${serverName.toUpperCase()}_API_KEY`];

    if (!endpoint) throw new Error(`MCP endpoint not configured for ${serverName}`);

    // Add agent context if provided
    const payload = agentContext ?
        { ...toolArguments, _agentContext: agentContext } :
        toolArguments;

    try {
        const response = await fetch(`${endpoint}/tools/${toolName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            },
            body: JSON.stringify(payload),
            timeout: 30000
        });

        const data = await response.json();
        if (!response.ok) {
            updateMCPLoadMetrics(serverName, Date.now() - startTime, true);
            throw new Error(data.error || `Tool execution failed: ${response.status}`);
        }

        updateMCPLoadMetrics(serverName, Date.now() - startTime, false);
        if (agentContext) trackAgentMCPUsage(agentContext.agentId, serverName);

        return agentContext ?
            { ...data, agentMetadata: { agentId: agentContext.agentId, serverName } } :
            data;
    } catch (error) {
        updateMCPLoadMetrics(serverName, Date.now() - startTime, true);
        throw error;
    }
}

async function accessMCPResource(serverName, uri, providerConfig = {}) {
    const endpoint = providerConfig.endpoint || process.env[`MCP_${serverName.toUpperCase()}_ENDPOINT`];
    const apiKey = providerConfig.key || process.env[`MCP_${serverName.toUpperCase()}_API_KEY`];

    if (!endpoint) throw new Error(`MCP endpoint not configured for ${serverName}`);

    try {
        const response = await fetch(`${endpoint}/resources?uri=${encodeURIComponent(uri)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            },
            timeout: 30000
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Resource access failed: ${response.status}`);
        return data;
    } catch (error) {
        throw new Error(`MCP connection failed: ${error.message}`);
    }
}

// Load balancing functions remain unchanged
function trackAgentMCPUsage(agentId, serverName) {
    agentMCPAssignments.set(agentId, { serverName, assignedAt: Date.now() });
    updateAgentCount(serverName);
}

function updateMCPLoadMetrics(serverName, latency, isError) {
    const metrics = mcpLoadMetrics.get(serverName) || { requests: 0, errors: 0, avgLatency: 0 };
    metrics.requests++;
    if (isError) metrics.errors++;
    metrics.avgLatency = metrics.avgLatency ?
        (metrics.avgLatency * 0.8 + latency * 0.2) : latency;
    mcpLoadMetrics.set(serverName, metrics);
}

function updateAgentCount(serverName) {
    const agents = [...agentMCPAssignments.values()].filter(a => a.serverName === serverName);
    const metrics = mcpLoadMetrics.get(serverName) || { requests: 0, errors: 0, avgLatency: 0 };
    metrics.agentCount = agents.length;
    mcpLoadMetrics.set(serverName, metrics);
}

module.exports = {
    executeMCPTool,
    accessMCPResource,
    getMCPMetrics: () => Object.fromEntries(mcpLoadMetrics),
    getAgentAssignments: () => Object.fromEntries(agentMCPAssignments)
};
