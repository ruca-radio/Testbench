const fetch = require('node-fetch');
const { createError } = require('../utils/helpers');

// Agent context and load balancing state
const agentProviderMap = new Map(); // agentId -> assigned provider config
const loadMetrics = new Map(); // provider -> { requests: number, errors: number, avgLatency: number }
const providerConfigs = new Map(); // config hash -> provider configuration

/**
 * Handle OpenRouter chat completion requests with agent awareness
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
 * @returns {Object} - OpenRouter response (OpenAI compatible) with agent metadata
 */
async function handleOpenRouter(messages, model, providerConfig, modelParams = {}, endpointOverride, agentContext = null) {
    const startTime = Date.now();

    // Backward compatibility: if agentContext is not provided, use standard flow
    if (!agentContext) {
        return await executeOpenRouterRequest(messages, model, providerConfig, modelParams, endpointOverride);
    }

    // Agent-aware flow with load balancing and failover
    const { agentId, conversationId, role, priority = 3 } = agentContext;

    // Inject agent context into messages for better AI understanding
    const enhancedMessages = injectAgentContext(messages, agentContext);

    // Get or assign optimal provider configuration for this agent
    const providerInstance = await getOptimalProvider(agentId, providerConfig, endpointOverride);

    try {
        const response = await executeOpenRouterRequest(enhancedMessages, model, providerInstance.config, modelParams, providerInstance.endpoint);

        // Track successful request metrics
        updateLoadMetrics(providerInstance.instanceKey, Date.now() - startTime, false);

        // Add agent metadata to response
        response.agentMetadata = {
            agentId,
            conversationId,
            role,
            priority,
            providerInstance: providerInstance.instanceKey,
            responseTime: Date.now() - startTime
        };

        return response;
    } catch (error) {
        // Track error metrics
        updateLoadMetrics(providerInstance.instanceKey, Date.now() - startTime, true);

        // Attempt failover if error indicates provider issue
        if (shouldAttemptFailover(error) && priority >= 4) {
            console.warn(`OpenRouter provider failover attempted for agent ${agentId}:`, error.message);
            return await attemptFailover(enhancedMessages, model, providerConfig, modelParams, endpointOverride, agentContext, error);
        }

        throw error;
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
    const apiKey = providerConfig.key || process.env.OPENROUTER_API_KEY;
    const baseURL = endpointOverride || providerConfig.endpoint || 'https://openrouter.ai/api/v1';

    // Create instance key for caching
    const instanceKey = `openrouter_${apiKey?.substring(0, 8)}...${baseURL}`;

    // Check if agent already has assigned provider
    if (agentProviderMap.has(agentId)) {
        const assignedKey = agentProviderMap.get(agentId);
        if (providerConfigs.has(assignedKey)) {
            return {
                instanceKey: assignedKey,
                config: providerConfigs.get(assignedKey).config,
                endpoint: providerConfigs.get(assignedKey).endpoint
            };
        }
    }

    // Store provider configuration
    if (!providerConfigs.has(instanceKey)) {
        providerConfigs.set(instanceKey, {
            config: providerConfig,
            endpoint: endpointOverride
        });
        loadMetrics.set(instanceKey, { requests: 0, errors: 0, avgLatency: 0 });
    }

    // Assign provider to agent
    agentProviderMap.set(agentId, instanceKey);

    return {
        instanceKey,
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
    return error.status === 429 || error.status >= 500 || error.name === 'FetchError';
}

/**
 * Attempt failover to alternative provider configuration
 */
async function attemptFailover(messages, model, providerConfig, modelParams, endpointOverride, agentContext, originalError) {
    // For OpenRouter, try with fallback API key or different endpoint
    const fallbackConfig = {
        ...providerConfig,
        key: process.env.OPENROUTER_API_KEY_FALLBACK || providerConfig.key,
        endpoint: process.env.OPENROUTER_ENDPOINT_FALLBACK || providerConfig.endpoint
    };

    // Only attempt failover if we have alternative configuration
    if (fallbackConfig.key === providerConfig.key && fallbackConfig.endpoint === providerConfig.endpoint) {
        throw originalError; // No alternative configuration available
    }

    try {
        console.log(`Attempting OpenRouter failover for agent ${agentContext.agentId}`);
        const response = await executeOpenRouterRequest(messages, model, fallbackConfig, modelParams, endpointOverride);

        // Add failover metadata
        response.agentMetadata = {
            ...agentContext,
            failover: true,
            originalError: originalError.message,
            responseTime: Date.now() - Date.now() // Will be overwritten by caller
        };

        return response;
    } catch (failoverError) {
        console.error(`OpenRouter failover failed for agent ${agentContext.agentId}:`, failoverError.message);
        throw originalError; // Return original error if failover fails
    }
}

/**
 * Execute OpenRouter request (internal function for both standard and agent flows)
 */
async function executeOpenRouterRequest(messages, model, providerConfig, modelParams = {}, endpointOverride) {
    const apiKey = providerConfig.key || process.env.OPENROUTER_API_KEY;
    const baseURL = endpointOverride || providerConfig.endpoint || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
        throw createError('OpenRouter API key not configured. Please set it in .env or provide it in settings.', 400);
    }

    // OpenRouter uses OpenAI's chat completions format directly
    const body = {
        model: model, // e.g., 'anthropic/claude-3-opus'
        messages: messages,
        ...modelParams
    };

    const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            // Required headers for OpenRouter identification
            'HTTP-Referer': providerConfig.referer || process.env.OPENROUTER_REFERER || 'http://localhost:3000', // Your app's URL
            'X-Title': providerConfig.title || process.env.OPENROUTER_TITLE || 'Chat Framework' // Your app's name
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('OpenRouter API Error:', data);
        const errorMsg = data.error?.message || `OpenRouter API error (${response.status})`;
        throw createError(errorMsg, response.status);
    }
    return data; // OpenRouter response is already in OpenAI format
}

/**
 * Fetch available OpenRouter models
 * @param {Object} config - Provider configuration
 * @returns {Array} - Array of models
 */
async function fetchOpenRouterModels(config) {
    const apiKey = config.key || process.env.OPENROUTER_API_KEY;
    const baseURL = config.endpoint || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
        throw createError('OpenRouter API key not configured', 400);
    }

    const response = await fetch(`${baseURL}/models`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': config.referer || process.env.OPENROUTER_REFERER || 'http://localhost:3000',
            'X-Title': config.title || process.env.OPENROUTER_TITLE || 'Chat Framework'
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw createError(data.error?.message || 'OpenRouter API error', response.status);
    }

    // Sort models, perhaps by popularity or name for better UX
    const sortedModels = data.data.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    return sortedModels.map(model => ({
        id: model.id,
        name: model.name || model.id,
        ...model
    }));
}

/**
 * Enhanced fetchOpenRouterModels with agent context support
 */
async function fetchOpenRouterModelsWithContext(config, agentContext = null) {
    // If agent context provided, use load-balanced provider
    if (agentContext && agentContext.agentId) {
        const optimalProvider = await getOptimalProvider(agentContext.agentId, config);

        try {
            // Use the optimal provider's configuration
            const configWithOptimalSettings = {
                ...config,
                ...optimalProvider.config
            };
            const models = await fetchOpenRouterModels(configWithOptimalSettings);

            // Track the request for metrics
            updateLoadMetrics(optimalProvider.instanceKey, 50, false); // Moderate latency for API call

            return models;
        } catch (error) {
            // Fallback to standard model fetching on error
            console.warn(`Agent-aware OpenRouter model fetching failed for ${agentContext.agentId}, falling back to standard fetch:`, error.message);
            return await fetchOpenRouterModels(config);
        }
    }

    return await fetchOpenRouterModels(config);
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
    handleOpenRouter,
    fetchOpenRouterModels,
    fetchOpenRouterModelsWithContext,
    getProviderMetrics,
    resetAgentAssignments,
    // Internal functions exposed for testing
    injectAgentContext,
    updateLoadMetrics
};
