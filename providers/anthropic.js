const fetch = require('node-fetch');
const { createError } = require('../utils/helpers');

// Agent context and load balancing state
const agentProviderMap = new Map(); // agentId -> assigned provider config
const loadMetrics = new Map(); // provider -> { requests: number, errors: number, avgLatency: number }
const providerConfigs = new Map(); // config hash -> provider configuration

/**
 * Handle Anthropic chat completion requests with agent awareness
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
async function handleAnthropic(messages, model, providerConfig, modelParams = {}, endpointOverride, agentContext = null) {
    const startTime = Date.now();

    // Backward compatibility: if agentContext is not provided, use standard flow
    if (!agentContext) {
        return await executeAnthropicRequest(messages, model, providerConfig, modelParams, endpointOverride);
    }

    // Agent-aware flow with load balancing and failover
    const { agentId, conversationId, role, priority = 3 } = agentContext;

    // Inject agent context into messages for better AI understanding
    const enhancedMessages = injectAgentContext(messages, agentContext);

    // Get or assign optimal provider configuration for this agent
    const providerInstance = await getOptimalProvider(agentId, providerConfig, endpointOverride);

    try {
        const response = await executeAnthropicRequest(enhancedMessages, model, providerInstance.config, modelParams, providerInstance.endpoint);

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
            console.warn(`Anthropic provider failover attempted for agent ${agentId}:`, error.message);
            return await attemptFailover(enhancedMessages, model, providerConfig, modelParams, endpointOverride, agentContext, error);
        }

        throw error;
    }
}

/**
 * Execute Anthropic request (internal function for both standard and agent flows)
 */
async function executeAnthropicRequest(messages, model, providerConfig, modelParams = {}, endpointOverride) {
    const apiKey = providerConfig.key || process.env.ANTHROPIC_API_KEY;
    const baseURL = endpointOverride || providerConfig.endpoint || 'https://api.anthropic.com';

    if (!apiKey) {
        throw createError('Anthropic API key not configured. Please set it in .env or provide it in settings.', 400);
    }

    // Anthropic expects 'system' prompt separately and messages as user/assistant turns.
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user', // Ensure roles are 'user' or 'assistant'
        content: m.content
    }));

    // Anthropic requires at least one user message. If only system message, add a benign user message.
    if (conversationMessages.length === 0 && systemMessage) {
        conversationMessages.push({ role: "user", content: "Understood." }); // Or some other neutral starter
    }

    const anthropicParams = {
        model: model, // e.g., 'claude-3-opus-20240229'
        max_tokens: modelParams.max_tokens || 4096, // Default for Anthropic
        messages: conversationMessages,
        ...(systemMessage && { system: systemMessage.content }), // Add system prompt if present
        ...(modelParams.temperature !== undefined && { temperature: modelParams.temperature }),
        ...(modelParams.top_p !== undefined && { top_p: modelParams.top_p }),
        // Note: Anthropic uses top_k instead of frequency/presence penalty directly in the same way
    };

    const response = await fetch(`${baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01' // Required header
        },
        body: JSON.stringify(anthropicParams)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Anthropic API Error:', data);
        const errorMsg = data.error?.message || `Anthropic API error (${response.status})`;
        throw createError(errorMsg, response.status);
    }

    // Convert Anthropic response back to OpenAI-like format for consistency
    return {
        choices: [{
            message: {
                role: 'assistant',
                content: data.content?.[0]?.text || "" // Ensure content and text exist
            },
            finish_reason: data.stop_reason // e.g., 'end_turn', 'max_tokens'
        }],
        usage: { // Attempt to map usage data if available
            prompt_tokens: data.usage?.input_tokens || 0,
            completion_tokens: data.usage?.output_tokens || 0,
            total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
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

    // Inject agent context (Claude handles system prompts well)
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
    const apiKey = providerConfig.key || process.env.ANTHROPIC_API_KEY;
    const baseURL = endpointOverride || providerConfig.endpoint || 'https://api.anthropic.com';

    // Create instance key for caching
    const instanceKey = `anthropic_${apiKey?.substring(0, 8)}...${baseURL}`;

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
    // For failover, try with different API key or fallback to environment variables
    const fallbackConfig = {
        ...providerConfig,
        key: process.env.ANTHROPIC_API_KEY_FALLBACK || providerConfig.key,
        endpoint: process.env.ANTHROPIC_ENDPOINT_FALLBACK || providerConfig.endpoint
    };

    // Only attempt failover if we have alternative configuration
    if (fallbackConfig.key === providerConfig.key && fallbackConfig.endpoint === providerConfig.endpoint) {
        throw originalError; // No alternative configuration available
    }

    try {
        console.log(`Attempting Anthropic failover for agent ${agentContext.agentId}`);
        const response = await executeAnthropicRequest(messages, model, fallbackConfig, modelParams, endpointOverride);

        // Add failover metadata
        response.agentMetadata = {
            ...agentContext,
            failover: true,
            originalError: originalError.message,
            responseTime: Date.now() - Date.now() // Will be overwritten by caller
        };

        return response;
    } catch (failoverError) {
        console.error(`Anthropic failover failed for agent ${agentContext.agentId}:`, failoverError.message);
        throw originalError; // Return original error if failover fails
    }
}

/**
 * Get predefined Anthropic models (no API endpoint available)
 * @returns {Array} - Array of models
 */
async function fetchAnthropicModels() {
    // Anthropic doesn't have a models endpoint, so we'll use a predefined list
    return [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
    ];
}

/**
 * Enhanced fetchAnthropicModels with agent context support
 */
async function fetchAnthropicModelsWithContext(config, agentContext = null) {
    // Anthropic doesn't have a models API, so agent context doesn't change the result
    // But we track the request for consistency
    if (agentContext && agentContext.agentId) {
        const optimalProvider = await getOptimalProvider(agentContext.agentId, config);
        // Log that we're providing models for this agent (for metrics)
        updateLoadMetrics(optimalProvider.instanceKey, 1, false); // Minimal latency for local operation
    }

    return await fetchAnthropicModels();
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
    handleAnthropic,
    fetchAnthropicModels,
    fetchAnthropicModelsWithContext,
    getProviderMetrics,
    resetAgentAssignments,
    // Internal functions exposed for testing
    injectAgentContext,
    updateLoadMetrics
};
