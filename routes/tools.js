const express = require('express');
const router = express.Router();
const database = require('../database');
const axios = require('axios');

// Get all tools configuration
router.get('/api/tools', async (req, res) => {
    try {
        const tools = database.getAllTools() || [];
        res.json({
            tools,
            count: tools.length
        });
    } catch (error) {
        console.error('Error getting tools:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get specific tool configuration
router.get('/api/tools/:toolId', async (req, res) => {
    const { toolId } = req.params;

    try {
        const tool = database.getTool(toolId);
        if (!tool) {
            return res.status(404).json({ error: 'Tool not found' });
        }
        res.json({ tool });
    } catch (error) {
        console.error(`Error getting tool ${toolId}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Update tool configuration
router.put('/api/tools/:toolId', async (req, res) => {
    const { toolId } = req.params;
    const { config } = req.body;

    if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Tool configuration is required' });
    }

    try {
        const existingTool = database.getTool(toolId);
        if (!existingTool) {
            return res.status(404).json({ error: 'Tool not found' });
        }

        const updatedTool = {
            ...existingTool,
            config: {
                ...existingTool.config,
                ...config
            },
            updatedAt: new Date().toISOString()
        };

        database.updateTool(toolId, updatedTool);

        res.json({
            tool: updatedTool,
            message: `Tool '${toolId}' configuration updated successfully`
        });
    } catch (error) {
        console.error(`Error updating tool ${toolId}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Test search tool configuration
router.post('/api/tools/search/test', async (req, res) => {
    const { engine, apiKey, cxId, query = 'test search' } = req.body;

    if (!engine) {
        return res.status(400).json({ error: 'Search engine is required' });
    }

    try {
        let result;

        switch (engine) {
            case 'google':
                result = await testGoogleSearch(apiKey, cxId, query);
                break;
            case 'duckduckgo':
                result = await testDuckDuckGoSearch(query);
                break;
            case 'bing':
                result = await testBingSearch(apiKey, query);
                break;
            default:
                return res.status(400).json({ error: `Unsupported search engine: ${engine}` });
        }

        res.json({
            engine,
            connected: result.success,
            message: result.message,
            resultCount: result.resultCount || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error testing ${engine} search:`, error.message);
        res.status(500).json({
            engine,
            connected: false,
            error: error.message,
            message: `Failed to test ${engine} search: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
});

// Perform search using configured tool
router.post('/api/tools/search', async (req, res) => {
    const { query, engine = 'duckduckgo', maxResults = 10 } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        // Get search tool configuration
        const searchTool = database.getTool('web-search');
        const config = searchTool?.config || {};

        const searchEngine = engine || config.engine || 'duckduckgo';
        let results;

        switch (searchEngine) {
            case 'google':
                results = await performGoogleSearch(
                    config.apiKey,
                    config.cxId,
                    query,
                    maxResults
                );
                break;
            case 'duckduckgo':
                results = await performDuckDuckGoSearch(query, maxResults);
                break;
            case 'bing':
                results = await performBingSearch(config.apiKey, query, maxResults);
                break;
            default:
                return res.status(400).json({ error: `Unsupported search engine: ${searchEngine}` });
        }

        res.json({
            query,
            engine: searchEngine,
            results: results.results || [],
            count: results.count || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error performing search:', error.message);
        res.status(500).json({
            error: error.message,
            query,
            engine: engine || 'unknown',
            timestamp: new Date().toISOString()
        });
    }
});

// Initialize default tools
router.post('/api/tools/initialize', async (req, res) => {
    try {
        const defaultTools = [
            {
                id: 'web-search',
                name: 'Web Search',
                description: 'Search the web for current information',
                category: 'Research',
                enabled: true,
                config: {
                    engine: 'duckduckgo',
                    maxResults: 10,
                    apiKey: '',
                    cxId: ''
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'code-execution',
                name: 'Code Execution',
                description: 'Execute code snippets safely',
                category: 'Development',
                enabled: false,
                config: {
                    allowedLanguages: ['python', 'javascript', 'bash'],
                    timeout: 30000,
                    memoryLimit: '128MB'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'file-analysis',
                name: 'File Analysis',
                description: 'Analyze and process uploaded files',
                category: 'Utility',
                enabled: true,
                config: {
                    maxFileSize: '50MB',
                    allowedTypes: ['pdf', 'docx', 'txt', 'csv', 'json']
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        const initialized = [];
        for (const tool of defaultTools) {
            const existing = database.getTool(tool.id);
            if (!existing) {
                database.createTool(tool);
                initialized.push(tool.id);
            }
        }

        res.json({
            message: `Initialized ${initialized.length} default tools`,
            initialized,
            tools: defaultTools
        });
    } catch (error) {
        console.error('Error initializing tools:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Helper functions for search engines
async function testGoogleSearch(apiKey, cxId, query) {
    if (!apiKey || !cxId) {
        throw new Error('Google Custom Search requires both API key and Custom Search Engine ID (CX)');
    }

    const url = 'https://www.googleapis.com/customsearch/v1';
    const response = await axios.get(url, {
        params: {
            key: apiKey,
            cx: cxId,
            q: query,
            num: 1
        },
        timeout: 10000
    });

    return {
        success: true,
        message: 'Google Custom Search connection successful',
        resultCount: response.data.searchInformation?.totalResults || 0
    };
}

async function testDuckDuckGoSearch(query) {
    try {
        // DuckDuckGo Instant Answer API (free, no API key required)
        const url = 'https://api.duckduckgo.com/';
        const response = await axios.get(url, {
            params: {
                q: query,
                format: 'json',
                no_html: 1,
                skip_disambig: 1
            },
            timeout: 10000,
            headers: {
                'User-Agent': 'AI-Inference-Platform-Search/1.0'
            }
        });

        return {
            success: true,
            message: 'DuckDuckGo search connection successful',
            resultCount: response.data ? 1 : 0
        };
    } catch (error) {
        if (error.response?.status === 403 || error.message?.includes('IP temporarily blocked')) {
            return {
                success: false,
                message: 'DuckDuckGo API is currently blocking requests from this IP address. This is temporary and typically resolves within a few minutes. Consider using Google Custom Search or Bing as alternatives.',
                blocked: true,
                retryAfter: extractRetryAfter(error)
            };
        }
        throw error;
    }
}

// Helper function to extract retry-after time from error response
function extractRetryAfter(error) {
    try {
        if (error.response?.data?.retryAfter) {
            return error.response.data.retryAfter;
        }
        if (error.response?.data?.blockedUntil) {
            const blockedUntil = new Date(error.response.data.blockedUntil);
            const now = new Date();
            return Math.max(0, Math.ceil((blockedUntil - now) / 1000));
        }
        return 300; // Default 5 minutes
    } catch {
        return 300;
    }
}

async function testBingSearch(apiKey, query) {
    if (!apiKey) {
        throw new Error('Bing Search requires an API key');
    }

    const url = 'https://api.bing.microsoft.com/v7.0/search';
    const response = await axios.get(url, {
        params: {
            q: query,
            count: 1
        },
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey
        },
        timeout: 10000
    });

    return {
        success: true,
        message: 'Bing Search connection successful',
        resultCount: response.data.webPages?.totalEstimatedMatches || 0
    };
}

async function performGoogleSearch(apiKey, cxId, query, maxResults) {
    if (!apiKey || !cxId) {
        throw new Error('Google Custom Search requires both API key and Custom Search Engine ID');
    }

    const url = 'https://www.googleapis.com/customsearch/v1';
    const response = await axios.get(url, {
        params: {
            key: apiKey,
            cx: cxId,
            q: query,
            num: Math.min(maxResults, 10)
        },
        timeout: 15000
    });

    const results = (response.data.items || []).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        displayUrl: item.displayLink
    }));

    return {
        results,
        count: results.length,
        totalResults: response.data.searchInformation?.totalResults
    };
}

async function performDuckDuckGoSearch(query, maxResults) {
    try {
        // Note: DuckDuckGo's free API is limited. For production, consider using
        // a more robust solution or implementing web scraping with proper rate limiting
        const url = 'https://api.duckduckgo.com/';
        const response = await axios.get(url, {
            params: {
                q: query,
                format: 'json',
                no_html: 1,
                skip_disambig: 1
            },
            timeout: 15000,
            headers: {
                'User-Agent': 'AI-Inference-Platform-Search/1.0'
            }
        });

        const results = [];

        // Process instant answer
        if (response.data.AbstractText) {
            results.push({
                title: response.data.Heading || 'Instant Answer',
                url: response.data.AbstractURL || '#',
                snippet: response.data.AbstractText,
                displayUrl: response.data.AbstractSource || 'DuckDuckGo'
            });
        }

        // Process related topics
        if (response.data.RelatedTopics) {
            const topics = response.data.RelatedTopics
                .filter(topic => topic.Text && topic.FirstURL)
                .slice(0, maxResults - results.length)
                .map(topic => ({
                    title: topic.Text.split(' - ')[0],
                    url: topic.FirstURL,
                    snippet: topic.Text,
                    displayUrl: new URL(topic.FirstURL).hostname
                }));
            results.push(...topics);
        }

        return {
            results: results.slice(0, maxResults),
            count: results.length
        };
    } catch (error) {
        if (error.response?.status === 403 || error.message?.includes('IP temporarily blocked')) {
            throw new Error('DuckDuckGo search temporarily unavailable due to IP blocking or rate limiting. This typically resolves within a few minutes. Please try Google Custom Search or Bing as alternatives, or try again later.');
        }
        throw error;
    }
}

async function performBingSearch(apiKey, query, maxResults) {
    if (!apiKey) {
        throw new Error('Bing Search requires an API key');
    }

    const url = 'https://api.bing.microsoft.com/v7.0/search';
    const response = await axios.get(url, {
        params: {
            q: query,
            count: Math.min(maxResults, 50)
        },
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey
        },
        timeout: 15000
    });

    const results = (response.data.webPages?.value || []).map(item => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet,
        displayUrl: item.displayUrl
    }));

    return {
        results,
        count: results.length,
        totalResults: response.data.webPages?.totalEstimatedMatches
    };
}

module.exports = router;
