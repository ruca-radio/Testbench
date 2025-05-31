const express = require('express');
const router = express.Router();
const { validateMessages, validateModelParams, getProviderFromModel } = require('../utils/helpers');
const { handleOpenAI } = require('../providers/openai');
const { handleAnthropic } = require('../providers/anthropic');
const { handleOpenRouter } = require('../providers/openrouter');
const { handleOllama } = require('../providers/ollama');
const { accessMCPResource } = require('../providers/mcp');
const database = require('../database');

// Main chat endpoint for frontend requests
router.post('/chat', async (req, res) => {
    const startTime = Date.now();
    // Destructure with defaults and ensure config is an object
    const {
        messages,
        model = 'gpt-4o',
        config = {},
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        agent,
        mcpContext = []
    } = req.body;

    // Enhanced validation
    const messageValidation = validateMessages(messages);
    if (!messageValidation.valid) {
        return res.status(400).json({ error: messageValidation.error });
    }

    console.log(`Chat request: ${messages.length} messages, model: ${model}`);
    const provider = getProviderFromModel(model);
    console.log(`Using provider: ${provider}`);
    // Merge persisted provider settings with client-supplied config
    const dbSettings = database.getProviderSettings(provider) || {};
    const clientProviderConfig = config[provider] || {};
    const providerConfig = { ...dbSettings, ...clientProviderConfig };
    const endpointOverride = clientProviderConfig.endpoint || dbSettings.endpoint;

    // Process MCP context if provided
    let processedMessages = [...messages];
    if (mcpContext && mcpContext.length > 0) {
        try {
            // Fetch MCP resources and add to context
            const mcpResources = await processMCPContext(mcpContext, config);

            // Add MCP context as system message if there are resources
            if (mcpResources.length > 0) {
                // Find existing system message or create a new one
                const systemMessageIndex = processedMessages.findIndex(m => m.role === 'system');
                const contextMessage = `Available context:\n\n${mcpResources.join('\n\n')}`;

                if (systemMessageIndex >= 0) {
                    // Append to existing system message
                    processedMessages[systemMessageIndex].content += `\n\n${contextMessage}`;
                } else {
                    // Add new system message at the beginning
                    processedMessages.unshift({
                        role: 'system',
                        content: contextMessage
                    });
                }

                console.log(`Added ${mcpResources.length} MCP resources to chat context`);
            }
        } catch (error) {
            console.error('Error processing MCP context:', error);
            // Continue without MCP context if there's an error
        }
    }

    // Validate and clean model parameters
    const modelParams = validateModelParams({
        temperature,
        maxTokens,
        max_tokens: maxTokens,
        topP,
        top_p: topP,
        frequencyPenalty,
        frequency_penalty: frequencyPenalty,
        presencePenalty,
        presence_penalty: presencePenalty
    });

    try {
        let completion;
        // Ensure provider specific config from the main config object is passed
        const providerConfig = config[provider] || {}; // e.g., config.openai, config.anthropic

        switch (provider) {
            case 'openai':
                completion = await handleOpenAI(processedMessages, model, providerConfig, modelParams, endpointOverride);
                break;
            case 'anthropic':
                completion = await handleAnthropic(processedMessages, model, providerConfig, modelParams, endpointOverride);
                break;
            case 'openrouter':
                completion = await handleOpenRouter(processedMessages, model, providerConfig, modelParams, endpointOverride);
                break;
            case 'ollama':
                completion = await handleOllama(processedMessages, model, providerConfig, modelParams, endpointOverride);
                break;
            default:
                return res.status(400).json({ error: 'Unsupported model provider' });
        }

        console.log(`Chat completed in ${Date.now() - startTime}ms`);

        // Extract the response content
        const responseContent = completion.choices?.[0]?.message?.content || '';

        // Send a simplified response format for the frontend
        res.json({
            response: responseContent,
            model: model,
            provider: provider,
            responseTime: Date.now() - startTime
        });

    } catch (error) {
        console.error('Chat completion error:', error.message, error.stack);
        res.status(error.status || 500).json({
            error: error.message,
            details: "Failed to process chat request"
        });
    }
});

// Enhanced chat completion endpoint
router.post('/api/chat/completion', async (req, res) => {
    const startTime = Date.now();
    // Destructure with defaults and ensure config is an object
    const {
        messages,
        model = 'gpt-4o',
        config = {},
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        mcpContext = []
    } = req.body;

    // Enhanced validation
    const messageValidation = validateMessages(messages);
    if (!messageValidation.valid) {
        return res.status(400).json({ error: messageValidation.error });
    }

    console.log(`Chat request: ${messages.length} messages, model: ${model}`);
    const provider = getProviderFromModel(model);
    console.log(`Using provider: ${provider}`);
    // Merge persisted provider settings with client-supplied config
    const dbSettings = database.getProviderSettings(provider) || {};
    const clientProviderConfig = config[provider] || {};
    const providerConfigMerged = { ...dbSettings, ...clientProviderConfig };
    const endpointOverride = clientProviderConfig.endpoint || dbSettings.endpoint;
    // Process MCP context if provided
    let processedMessages = [...messages];
    if (mcpContext && mcpContext.length > 0) {
        try {
            // Fetch MCP resources and add to context
            const mcpResources = await processMCPContext(mcpContext, config);

            // Add MCP context as system message if there are resources
            if (mcpResources.length > 0) {
                // Find existing system message or create a new one
                const systemMessageIndex = processedMessages.findIndex(m => m.role === 'system');
                const contextMessage = `Available context:\n\n${mcpResources.join('\n\n')}`;

                if (systemMessageIndex >= 0) {
                    // Append to existing system message
                    processedMessages[systemMessageIndex].content += `\n\n${contextMessage}`;
                } else {
                    // Add new system message at the beginning
                    processedMessages.unshift({
                        role: 'system',
                        content: contextMessage
                    });
                }

                console.log(`Added ${mcpResources.length} MCP resources to chat context`);
            }
        } catch (error) {
            console.error('Error processing MCP context:', error);
            // Continue without MCP context if there's an error
        }
    }

    // Validate and clean model parameters
    const modelParams = validateModelParams({
        temperature,
        maxTokens,
        max_tokens: maxTokens,
        topP,
        top_p: topP,
        frequencyPenalty,
        frequency_penalty: frequencyPenalty,
        presencePenalty,
        presence_penalty: presencePenalty
    });

    try {
        let completion;
        // Ensure provider specific config from the main config object is passed
        switch (provider) {
            case 'openai':
                completion = await handleOpenAI(processedMessages, model, providerConfigMerged, modelParams, endpointOverride);
                break;
            case 'anthropic':
                completion = await handleAnthropic(processedMessages, model, providerConfigMerged, modelParams, endpointOverride);
                break;
            case 'openrouter':
                completion = await handleOpenRouter(processedMessages, model, providerConfigMerged, modelParams, endpointOverride);
                break;
            case 'ollama':
                completion = await handleOllama(processedMessages, model, providerConfigMerged, modelParams, endpointOverride);
                break;
            default:
                return res.status(400).json({ error: 'Unsupported model provider' });
        }

        console.log(`Chat completed in ${Date.now() - startTime}ms`);
        res.json(completion);

    } catch (error) {
        console.error('Chat completion error:', error.message, error.stack);
        res.status(error.status || 500).json({
            error: error.message,
            details: "Failed to process chat request"
        });
    }
});

// Session title generation endpoint
router.post('/api/chat/action/generate-title', async (req, res) => {
    const { messages, model = 'gpt-4o-mini', config = {} } = req.body; // Default to a fast model

    const messageValidation = validateMessages(messages);
    if (!messageValidation.valid) {
        return res.status(400).json({ error: messageValidation.error });
    }

    const provider = getProviderFromModel(model);
    // Merge persisted provider settings with client config for title generation
    const dbSettings = database.getProviderSettings(provider) || {};
    const clientProviderConfig = config[provider] || {};
    const providerConfigMerged = { ...dbSettings, ...clientProviderConfig };
    const endpointOverride = clientProviderConfig.endpoint || dbSettings.endpoint;
    let completion;

    try {
        // Use a small max_tokens for title generation
        const titleParams = { max_tokens: 50 };

    switch (provider) {
      case 'openai':
        completion = await handleOpenAI(messages, model, providerConfigMerged, titleParams, endpointOverride);
        break;
      case 'anthropic':
        completion = await handleAnthropic(messages, model, providerConfigMerged, titleParams, endpointOverride);
        break;
      case 'openrouter':
        completion = await handleOpenRouter(messages, model, providerConfigMerged, titleParams, endpointOverride);
        break;
      case 'ollama':
        completion = await handleOllama(messages, model, providerConfigMerged, titleParams, endpointOverride);
        break;
            default:
                // Fallback to OpenAI with environment key if specific provider fails or is not configured
                console.warn(`Unsupported provider '${provider}' for title generation, falling back to OpenAI.`);
                if (!process.env.OPENAI_API_KEY) {
                    return res.status(500).json({ error: 'No API key configured for title generation fallback (OpenAI)' });
                }
                const { OpenAI } = require('openai');
                const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Uses default endpoint
                const openAICompletion = await client.chat.completions.create({ model: 'gpt-4o-mini', messages, ...titleParams });
                completion = openAICompletion;
                break;
        }

        let title = completion.choices?.[0]?.message?.content?.trim() || 'New Chat';
        title = title.replace(/^['"]+|['"]+$/g, ''); // Remove surrounding quotes
        title = title.substring(0, 100); // Limit title length for display
        res.json({ title });

    } catch (error) {
        console.error('Error generating title:', error.message, error.stack);
        res.status(error.status || 500).json({ error: error.message, details: "Failed to generate title" });
    }
});

/**
 * Process MCP context references and fetch the actual content
 * @param {Array} mcpContext - Array of MCP context references
 * @param {Object} config - Configuration object
 * @returns {Array} - Array of formatted context strings
 */
async function processMCPContext(mcpContext, config = {}) {
    const results = [];

    for (const contextRef of mcpContext) {
        try {
            const [serverName, uri] = contextRef.split('://');
            if (!serverName || !uri) {
                console.warn(`Invalid MCP context reference format: ${contextRef}`);
                continue;
            }

            const resource = await accessMCPResource(serverName, uri, config);
            if (resource && resource.content) {
                results.push(`[${serverName}] ${uri}:\n${resource.content}`);
            }
        } catch (error) {
            console.error(`Error accessing MCP resource ${contextRef}:`, error);
        }
    }

    return results;
}

module.exports = router;
