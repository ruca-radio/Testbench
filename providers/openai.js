const { OpenAI } = require('openai');
const { createError } = require('../utils/helpers');

// Agent context and load balancing state
const agentProviderMap = new Map(); // agentId -> assigned provider instance
const loadMetrics = new Map(); // provider -> { requests: number, errors: number, avgLatency: number }
const providerInstances = new Map(); // config hash -> OpenAI client instance

/**
 * Handle OpenAI chat completion requests with agent awareness
 * @param {Array} messages - Chat messages
 * @param {string} model - Model name
 * @param {Object} providerConfig - Provider configuration
 * @param {Object} modelParams - Model parameters
 * @param {string} endpointOverride - Custom endpoint URL
 * @param {Object} agentContext - Agent context for multi-agent scenarios
 * @param {string} agentContext.agentId - Unique agent identifier
 * @param {string} agentContext.conversationId - Conversation identifier
 * @param {string} agentContext.role - Agent role (orchestrator, specialist, reviewer, etc.)
 * @param {number} agentContext.priority - Message priority (1-5, 5 being highest)
 * @returns {Object} - OpenAI response with agent metadata
 */
async function handleOpenAI(messages, model, providerConfig, modelParams = {}, endpointOverride, agentContext = null) {
    const startTime = Date.now();

    // Backward compatibility: if agentContext is not provided, use standard flow
    if (!agentContext) {
        return await executeOpenAIRequest(messages, model, providerConfig, modelParams, endpointOverride);
    }

    // Agent-aware flow with load balancing and failover
    const { agentId, conversationId, role, priority = 3 } = agentContext;

    // Inject agent context into messages for better AI understanding
    const enhancedMessages = injectAgentContext(messages, agentContext);

    // Get or assign optimal provider instance for this agent
    const clientConfig = await getOptimalProvider(agentId, providerConfig, endpointOverride);

    try {
        const response = await executeOpenAIRequest(enhancedMessages, model, clientConfig.config, modelParams, clientConfig.endpoint, clientConfig.client);

        // Track successful request metrics
        updateLoadMetrics(clientConfig.instanceKey, Date.now() - startTime, false);

        // Add agent metadata to response
        response.agentMetadata = {
            agentId,
            conversationId,
            role,
            priority,
            providerInstance: clientConfig.instanceKey,
            responseTime: Date.now() - startTime
        };

        return response;
    } catch (error) {
        // Track error metrics
        updateLoadMetrics(clientConfig.instanceKey, Date.now() - startTime, true);

        // Attempt failover if error indicates provider issue
        if (shouldAttemptFailover(error) && priority >= 4) {
            console.warn(`OpenAI provider failover attempted for agent ${agentId}:`, error.message);
            return await attemptFailover(enhancedMessages, model, providerConfig, modelParams, endpointOverride, agentContext, error);
        }

        throw error;
    }
}

/**
 * Execute OpenAI request (internal function for both standard and agent flows)
 */
async function executeOpenAIRequest(messages, model, providerConfig, modelParams = {}, endpointOverride, clientInstance = null) {
    const apiKey = providerConfig.key || process.env.OPENAI_API_KEY;
    const baseURL = endpointOverride || providerConfig.endpoint || 'https://api.openai.com/v1';

    if (!apiKey) {
        throw createError('OpenAI API key not configured. Please set it in .env or provide it in settings.', 400);
    }

    const client = clientInstance || new OpenAI({
        apiKey,
        baseURL,
        timeout: 30000, // 30 second timeout
        maxRetries: 2   // Retry up to 2 times on transient errors
    });

    try {
        return await client.chat.completions.create({
            model,
            messages,
            ...modelParams // Spread validated model parameters
        });
    } catch (error) {
        console.error('OpenAI API Error:', error);
        // Create a new error to ensure consistent structure and add status
        const newError = createError(error.message || 'OpenAI API request failed');
        newError.status = error.status || 500;
        if (error.status === 401) newError.message = 'Invalid OpenAI API key provided.';
        if (error.status === 429) newError.message = 'OpenAI API rate limit exceeded. Please try again later.';
        if (error.status === 503) newError.message = 'OpenAI API is temporarily unavailable. Please try again later.';
        throw newError;
    }
}

/**
 * Inject agent context into messages for better AI understanding
 */
function injectAgentContext(messages, agentContext) {
    const { agentId, conversationId, role, priority } = agentContext;

    // Clone messages to avoid mutation
    const enhancedMessages = [...messages];

    // Find system message or create one
    let systemMessageIndex = enhancedMessages.findIndex(msg => msg.role === 'system');
    let systemContent = '';

    if (systemMessageIndex !== -1) {
        systemContent = enhancedMessages[systemMessageIndex].content;
    } else {
        systemMessageIndex = 0;
        enhancedMessages.unshift({ role: 'system', content: '' });
    }

    // Inject agent context
    const agentContextText = `

[AGENT_CONTEXT]
Agent ID: ${agentId}
Conversation ID: ${conversationId}
Agent Role: ${role}
Message Priority: ${priority}
[/AGENT_CONTEXT]`;

    enhancedMessages[systemMessageIndex].content = systemContent + agentContextText;

    return enhancedMessages;
}

/**
 * Get optimal provider instance for agent with load balancing
 */
async function getOptimalProvider(agentId, providerConfig, endpointOverride) {
    const apiKey = providerConfig.key || process.env.OPENAI_API_KEY;
    const baseURL = endpointOverride || providerConfig.endpoint || 'https://api.openai.com/v1';

    // Create instance key for caching
    const instanceKey = `${apiKey?.substring(0, 8)}...${baseURL}`;

    // Check if agent already has assigned provider
    if (agentProviderMap.has(agentId)) {
        const assignedKey = agentProviderMap.get(agentId);
        if (providerInstances.has(assignedKey)) {
            return {
                instanceKey: assignedKey,
                client: providerInstances.get(assignedKey),
                config: providerConfig,
                endpoint: endpointOverride
            };
        }
    }

    // Get or create provider instance
    if (!providerInstances.has(instanceKey)) {
        const client = new OpenAI({
            apiKey,
            baseURL,
            timeout: 30000,
            maxRetries: 2
        });
        providerInstances.set(instanceKey, client);
        loadMetrics.set(instanceKey, { requests: 0, errors: 0, avgLatency: 0 });
    }

    // Assign provider to agent
    agentProviderMap.set(agentId, instanceKey);

    return {
        instanceKey,
        client: providerInstances.get(instanceKey),
        config: providerConfig,
        endpoint: endpointOverride
    };
}

/**
 * Update load metrics for provider instance
 */
function updateLoadMetrics(instanceKey, latency, isError) {
    if (!loadMetrics.has(instanceKey)) {
        loadMetrics.set(instanceKey, { requests: 0, errors: 0, avgLatency: 0 });
    }

    const metrics = loadMetrics.get(instanceKey);
    metrics.requests++;
    if (isError) metrics.errors++;

    // Update average latency (exponential moving average)
    metrics.avgLatency = metrics.avgLatency === 0
        ? latency
        : (metrics.avgLatency * 0.8) + (latency * 0.2);

    loadMetrics.set(instanceKey, metrics);
}

/**
 * Determine if failover should be attempted based on error type
 */
function shouldAttemptFailover(error) {
    // Attempt failover for rate limits, server errors, and timeouts
    return error.status === 429 || error.status >= 500 || error.name === 'AbortError';
}

/**
 * Attempt failover to alternative provider configuration
 */
async function attemptFailover(messages, model, providerConfig, modelParams, endpointOverride, agentContext, originalError) {
    // For failover, try with different endpoint or fallback to environment variables
    const fallbackConfig = {
        ...providerConfig,
        key: process.env.OPENAI_API_KEY_FALLBACK || providerConfig.key,
        endpoint: process.env.OPENAI_ENDPOINT_FALLBACK || providerConfig.endpoint
    };

    // Only attempt failover if we have alternative configuration
    if (fallbackConfig.key === providerConfig.key && fallbackConfig.endpoint === providerConfig.endpoint) {
        throw originalError; // No alternative configuration available
    }

    try {
        console.log(`Attempting OpenAI failover for agent ${agentContext.agentId}`);
        const response = await executeOpenAIRequest(messages, model, fallbackConfig, modelParams, endpointOverride);

        // Add failover metadata
        response.agentMetadata = {
            ...agentContext,
            failover: true,
            originalError: originalError.message,
            responseTime: Date.now() - Date.now() // Will be overwritten by caller
        };

        return response;
    } catch (failoverError) {
        console.error(`OpenAI failover failed for agent ${agentContext.agentId}:`, failoverError.message);
        throw originalError; // Return original error if failover fails
    }
}

/**
 * Fetch available OpenAI models
 * @param {Object} config - Provider configuration
 * @returns {Array} - Array of models
 */
async function fetchOpenAIModels(config) {
    const apiKey = config.key || process.env.OPENAI_API_KEY;
    const baseURL = config.endpoint || 'https://api.openai.com/v1';

    if (!apiKey) {
        throw createError('OpenAI API key not configured', 400);
    }

    const client = new OpenAI({ apiKey, baseURL });
    const models = await client.models.list();

    // Filter for chat-compatible models and sort them, putting GPT-4 models first for prominence
    const chatModels = models.data
        .filter(model => model.id.includes('gpt') || model.id.includes('text-davinci') || model.id.includes('claude'))
        .sort((a, b) => {
            const aIsGpt4 = a.id.startsWith('gpt-4');
            const bIsGpt4 = b.id.startsWith('gpt-4');
            if (aIsGpt4 && !bIsGpt4) return -1;
            if (!aIsGpt4 && bIsGpt4) return 1;
            return a.id.localeCompare(b.id); // Alphabetical for others
        });

    return chatModels.map(model => ({
        id: model.id,
        name: model.id,
        ...model
    }));
}

/**
 * Enhanced fetchOpenAIModels with agent context support
 */
async function fetchOpenAIModelsWithContext(config, agentContext = null) {
    // If agent context provided, use load-balanced provider
    if (agentContext && agentContext.agentId) {
        const optimalProvider = await getOptimalProvider(agentContext.agentId, config);

        try {
            const models = await optimalProvider.client.models.list();
            return processModelList(models);
        } catch (error) {
            // Fallback to standard model fetching on error
            console.warn(`Agent-aware model fetching failed for ${agentContext.agentId}, falling back to standard fetch:`, error.message);
            return await fetchOpenAIModels(config);
        }
    }

    return await fetchOpenAIModels(config);
}

/**
 * Process model list into standardized format
 */
function processModelList(models) {
    // Filter for chat-compatible models and sort them, putting GPT-4 models first for prominence
    const chatModels = models.data
        .filter(model => model.id.includes('gpt') || model.id.includes('text-davinci') || model.id.includes('claude'))
        .sort((a, b) => {
            const aIsGpt4 = a.id.startsWith('gpt-4');
            const bIsGpt4 = b.id.startsWith('gpt-4');
            if (aIsGpt4 && !bIsGpt4) return -1;
            if (!aIsGpt4 && bIsGpt4) return 1;
            return a.id.localeCompare(b.id); // Alphabetical for others
        });

    return chatModels.map(model => ({
        id: model.id,
        name: model.id,
        ...model
    }));
}

/**
 * Get provider performance metrics for monitoring
 */
function getProviderMetrics() {
    const metrics = {};
    for (const [instanceKey, data] of loadMetrics.entries()) {
        metrics[instanceKey] = {
            ...data,
            errorRate: data.requests > 0 ? (data.errors / data.requests) * 100 : 0
        };
    }
    return metrics;
}

/**
 * Reset agent provider assignments (useful for testing or rebalancing)
 */
function resetAgentAssignments() {
    agentProviderMap.clear();
}

module.exports = {
    handleOpenAI,
    fetchOpenAIModels,
    fetchOpenAIModelsWithContext,
    getProviderMetrics,
    resetAgentAssignments,
    // Internal functions exposed for testing
    injectAgentContext,
    updateLoadMetrics
};
