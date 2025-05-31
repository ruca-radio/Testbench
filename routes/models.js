const express = require('express');
const router = express.Router();
const database = require('../database');
const { fetchOpenAIModels } = require('../providers/openai');
const { fetchAnthropicModels } = require('../providers/anthropic');
const { fetchOpenRouterModels } = require('../providers/openrouter');
const { fetchOllamaModels } = require('../providers/ollama');

// Provider connection testing functions
async function testProviderConnection(provider, config) {
    try {
        let models;
        switch (provider) {
            case 'openai':
                models = await fetchOpenAIModels(config);
                break;
            case 'anthropic':
                models = await fetchAnthropicModels(config);
                break;
            case 'openrouter':
                models = await fetchOpenRouterModels(config);
                break;
            case 'ollama':
                models = await fetchOllamaModels(config);
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        return {
            connected: true,
            modelCount: models ? models.length : 0,
            message: `Successfully connected to ${provider}`
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message,
            message: `Failed to connect to ${provider}: ${error.message}`
        };
    }
}

// Model listing endpoints
router.post('/api/models/fetch/openai', async (req, res) => {
    try {
        const { config = {} } = req.body;
        const models = await fetchOpenAIModels(config.openai || {});
        res.json({ models });
    } catch (error) {
        console.error('Error fetching OpenAI models:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.post('/api/models/fetch/openrouter', async (req, res) => {
    try {
        const { config = {} } = req.body;
        const models = await fetchOpenRouterModels(config.openrouter || {});
        res.json({ models });
    } catch (error) {
        console.error('Error fetching OpenRouter models:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.post('/api/models/fetch/ollama', async (req, res) => {
    try {
        const { config = {} } = req.body;
        const models = await fetchOllamaModels(config.ollama || {});
        res.json({ models });
    } catch (error) {
        console.error('Error fetching Ollama models:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// Enhanced model management endpoints
router.post('/api/models/action/refresh', async (req, res) => {
    const { provider, config = {} } = req.body;

    // If no provider is specified, refresh all providers
    if (!provider) {
        try {
            const results = {};
            const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];

            for (const providerName of providers) {
                try {
                    const providerConfig = config[providerName] || {};
                    const models = await fetchModelsForProvider(providerName, providerConfig);
                    database.saveAvailableModels(providerName, models);
                    results[providerName] = {
                        count: models.length,
                        success: true
                    };
                } catch (error) {
                    console.error(`Error refreshing ${providerName} models:`, error.message);
                    results[providerName] = {
                        error: error.message,
                        success: false
                    };
                }
            }

            return res.json({
                results,
                message: 'Completed models refresh for all providers'
            });
        } catch (error) {
            console.error('Error in bulk model refresh:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    try {
        let models = [];
        const providerConfig = config[provider] || {};

        // Fetch models from the appropriate provider
        switch (provider) {
            case 'openai':
                models = await fetchOpenAIModels(providerConfig);
                break;

            case 'anthropic':
                models = await fetchAnthropicModels();
                break;

            case 'openrouter':
                models = await fetchOpenRouterModels(providerConfig);
                break;

            case 'ollama':
                models = await fetchOllamaModels(providerConfig);
                break;

            default:
                return res.status(400).json({ error: 'Unsupported provider' });
        }

        // Save models to database
        database.saveAvailableModels(provider, models);

        res.json({
            provider,
            models,
            count: models.length,
            message: `Successfully refreshed ${models.length} models for ${provider}`
        });

    } catch (error) {
        console.error(`Error refreshing ${provider} models:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to fetch models for a specific provider
async function fetchModelsForProvider(provider, providerConfig) {
    switch (provider) {
        case 'openai':
            return await fetchOpenAIModels(providerConfig);
        case 'anthropic':
            return await fetchAnthropicModels(providerConfig);
        case 'openrouter':
            return await fetchOpenRouterModels(providerConfig);
        case 'ollama':
            return await fetchOllamaModels(providerConfig);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

router.get('/api/models/list/:provider', async (req, res) => {
    const { provider } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    try {
        const result = database.getAvailableModels(provider, page, pageSize);
        res.json({
            provider,
            models: result.models,
            pagination: result.pagination
        });
    } catch (error) {
        console.error(`Error getting available models for ${provider}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get('/api/models/list/enabled/:provider', async (req, res) => {
    const { provider } = req.params;

    try {
        const models = database.getEnabledModels(provider);
        res.json({ provider, models });
    } catch (error) {
        console.error(`Error getting enabled models for ${provider}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/models/action/toggle', async (req, res) => {
    const { provider, modelId, enabled } = req.body;

    if (!provider || !modelId || enabled === undefined) {
        return res.status(400).json({ error: 'Provider, modelId, and enabled status are required' });
    }

    try {
        database.setModelEnabled(provider, modelId, enabled);
        res.json({
            message: `Model ${modelId} ${enabled ? 'enabled' : 'disabled'} for ${provider}`,
            provider,
            modelId,
            enabled
        });
    } catch (error) {
        console.error(`Error toggling model ${modelId} for ${provider}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get('/api/models/list/workspace', async (req, res) => {
    try {
        const models = database.getWorkspaceModels();
        res.json({ models });
    } catch (error) {
        console.error('Error getting workspace models:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Add the missing GET endpoint that the frontend expects
router.get('/api/models/refresh', async (req, res) => {
    try {
        const models = database.getWorkspaceModels();
        res.json({ models });
    } catch (error) {
        console.error('Error getting workspace models:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Provider connection status endpoints
router.post('/api/models/test-connection/:provider', async (req, res) => {
    const { provider } = req.params;
    const { config = {} } = req.body;

    try {
        const result = await testProviderConnection(provider, config);
        res.json({
            provider,
            ...result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error testing ${provider} connection:`, error.message);
        res.status(500).json({
            provider,
            connected: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test all provider connections
router.post('/api/models/test-connections', async (req, res) => {
    const { config = {} } = req.body;
    const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];
    const results = {};

    for (const provider of providers) {
        const providerConfig = config[provider] || {};
        try {
            results[provider] = await testProviderConnection(provider, providerConfig);
        } catch (error) {
            results[provider] = {
                connected: false,
                error: error.message,
                message: `Failed to test ${provider}: ${error.message}`
            };
        }
    }

    res.json({
        results,
        timestamp: new Date().toISOString(),
        summary: {
            total: providers.length,
            connected: Object.values(results).filter(r => r.connected).length,
            failed: Object.values(results).filter(r => !r.connected).length
        }
    });
});

module.exports = router;
