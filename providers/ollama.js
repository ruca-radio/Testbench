const fetch = require('node-fetch');
const { createError } = require('../utils/helpers');

// Agent context and load balancing state
const agentProviderMap = new Map(); // agentId -> assigned provider config
const loadMetrics = new Map(); // provider -> { requests: number, errors: number, avgLatency: number }
const providerConfigs = new Map(); // config hash -> provider configuration

/**
 * Handle Ollama chat completion requests with agent awareness
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
 * @returns {Object} - Standardized response with agent metadata
 */
async function handleOllama(messages, model, providerConfig, modelParams = {}, endpointOverride, agentContext = null) {
    const startTime = Date.now();

    // Backward compatibility: if agentContext is not provided, use standard flow
    if (!agentContext) {
        return await executeOllamaRequest(messages, model, providerConfig, modelParams, endpointOverride);
    }

    // Agent-aware flow with load balancing and failover
    const { agentId, conversationId, role, priority = 3 } = agentContext;

    // Inject agent context into messages for better AI understanding
    const enhancedMessages = injectAgentContext(messages, agentContext);

    // Get or assign optimal provider configuration for this agent
    const providerInstance = await getOptimalProvider(agentId, providerConfig, endpointOverride);

    try {
        const response = await executeOllamaRequest(enhancedMessages, model, providerInstance.config, modelParams, providerInstance.endpoint);

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
            console.warn(`Ollama provider failover attempted for agent ${agentId}:`, error.message);
            return await attemptFailover(enhancedMessages, model, providerConfig, modelParams, endpointOverride, agentContext, error);
        }

        throw error;
    }
}

/**
 * Execute Ollama request (internal function for both standard and agent flows)
 */
async function executeOllamaRequest(messages, model, providerConfig, modelParams = {}, endpointOverride) {
    let baseURL = endpointOverride || providerConfig.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    // Ensure URL has protocol
    if (!/^https?:\/\//i.test(baseURL)) {
        baseURL = 'http://' + baseURL;
    }

    // Ollama has its own parameter structure within an 'options' object
    const ollamaParams = {
        model: model,
        messages: messages,
        stream: false, // Explicitly false for non-streaming chat
        options: { // Ollama uses an 'options' object for parameters like temperature
            ...(modelParams.temperature !== undefined && { temperature: modelParams.temperature }),
            ...(modelParams.top_p !== undefined && { top_p: modelParams.top_p }),
            ...(modelParams.max_tokens !== undefined && { num_predict: modelParams.max_tokens }), // Ollama uses num_predict for max_tokens
            // Add other Ollama specific parameters if needed, e.g., mirostat, top_k
        }
    };

    // Remove undefined options to avoid sending them
    Object.keys(ollamaParams.options).forEach(key => {
        if (ollamaParams.options[key] === undefined) {
            delete ollamaParams.options[key];
        }
    });

    const response = await fetch(`${baseURL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ollamaParams)
    });

    const data = await response.json();

    if (!response.ok || data.error) { // Ollama might return 200 OK with an error in the JSON
        console.error('Ollama API Error:', data);
        const errorMsg = data.error || `Ollama API error (${response.status})`;
        throw createError(errorMsg, response.status);
    }

    // Convert Ollama response to OpenAI-like format
    return {
        choices: [{
            message: {
                role: 'assistant',
                content: data.message?.content || "" // Ensure message and content exist
            },
            finish_reason: data.done ? 'stop' : 'incomplete' // 'done' indicates completion
        }],
        usage: { // Ollama provides token counts in response
            prompt_tokens: data.prompt_eval_count || 0,
            completion_tokens: data.eval_count || 0,
            total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
    };
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
    const baseURL = endpointOverride || providerConfig.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

    // Create instance key for caching
    const instanceKey = `ollama_${baseURL}`;

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
    // Attempt failover for connection errors and server errors
    return error.status >= 500 || error.name === 'FetchError' || error.message.includes('ECONNREFUSED');
}

/**
 * Attempt failover to alternative provider configuration
 */
async function attemptFailover(messages, model, providerConfig, modelParams, endpointOverride, agentContext, originalError) {
    // For Ollama, try fallback endpoint
    const fallbackEndpoint = process.env.OLLAMA_ENDPOINT_FALLBACK || 'http://localhost:11435'; // Different port

    // Only attempt failover if we have alternative endpoint
    const currentEndpoint = endpointOverride || providerConfig.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    if (fallbackEndpoint === currentEndpoint) {
        throw originalError; // No alternative configuration available
    }

    try {
        console.log(`Attempting Ollama failover for agent ${agentContext.agentId} to ${fallbackEndpoint}`);
        const response = await executeOllamaRequest(messages, model, providerConfig, modelParams, fallbackEndpoint);

        // Add failover metadata
        response.agentMetadata = {
            ...agentContext,
            failover: true,
            originalError: originalError.message,
            fallbackEndpoint: fallbackEndpoint,
            responseTime: Date.now() - Date.now() // Will be overwritten by caller
        };

        return response;
    } catch (failoverError) {
        console.error(`Ollama failover failed for agent ${agentContext.agentId}:`, failoverError.message);
        throw originalError; // Return original error if failover fails
    }
}

/**
 * Fetch available Ollama models
 * @param {Object} config - Provider configuration
 * @returns {Array} - Array of models
 */
async function fetchOllamaModels(config) {
    const baseURL = config.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

    const response = await fetch(`${baseURL}/api/tags`); // Ollama uses /api/tags to list local models

    if (!response.ok) {
        // More specific error for connection failure
        throw createError(`Failed to connect to Ollama at ${baseURL}. Ensure Ollama is running and accessible.`, response.status);
    }

    const data = await response.json();
    // Ollama models are in data.models array, sort them by name
    const sortedModels = data.models.sort((a, b) => a.name.localeCompare(b.name));

    return sortedModels.map(model => ({
        id: model.name,
        name: model.name,
        ...model
    }));
}

/**
 * Enhanced fetchOllamaModels with agent context support
 */
async function fetchOllamaModelsWithContext(config, agentContext = null) {
    // If agent context provided, use load-balanced provider
    if (agentContext && agentContext.agentId) {
        const optimalProvider = await getOptimalProvider(agentContext.agentId, config);

        try {
            // Use the optimal provider's endpoint
            const configWithEndpoint = {
                ...config,
                endpoint: optimalProvider.endpoint || config.endpoint
            };
            const models = await fetchOllamaModels(configWithEndpoint);

            // Track the request for metrics
            updateLoadMetrics(optimalProvider.instanceKey, 10, false); // Minimal latency for local operation

            return models;
        } catch (error) {
            // Fallback to standard model fetching on error
            console.warn(`Agent-aware Ollama model fetching failed for ${agentContext.agentId}, falling back to standard fetch:`, error.message);
            return await fetchOllamaModels(config);
        }
    }

    return await fetchOllamaModels(config);
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
    handleOllama,
    fetchOllamaModels,
    fetchOllamaModelsWithContext,
    getProviderMetrics,
    resetAgentAssignments,
    // Internal functions exposed for testing
    injectAgentContext,
    updateLoadMetrics
};
