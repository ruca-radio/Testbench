// Helper utility functions

/**
 * Determine provider from model name
 * @param {string} model - The model name
 * @returns {string} - The provider name
 */
function getProviderFromModel(model) {
    if (!model) return 'openai'; // Default provider if model is undefined
    if (model.startsWith('claude-') || model.startsWith('anthropic/')) return 'anthropic';
    if (model.startsWith('gpt-') || model.startsWith('openai/')) return 'openai';
    if (model.includes('/')) return 'openrouter'; // Catches models like 'google/gemini-pro'
    return 'ollama'; // Default to ollama if no other provider matches
}

/**
 * Validate message format for chat completions
 * @param {Array} messages - Array of messages
 * @returns {Object} - Validation result
 */
function validateMessages(messages) {
    if (!messages || !Array.isArray(messages)) {
        return { valid: false, error: 'messages (array) is required in the request body' };
    }

    if (messages.length === 0) {
        return { valid: false, error: 'messages array cannot be empty' };
    }

    for (const message of messages) {
        if (typeof message.role !== 'string' || typeof message.content !== 'string') {
            return { valid: false, error: 'Each message must have role (string) and content (string)' };
        }
        if (!['system', 'user', 'assistant'].includes(message.role)) {
            return { valid: false, error: 'Message role must be one of: system, user, assistant' };
        }
    }

    return { valid: true };
}

/**
 * Validate and clean model parameters
 * @param {Object} params - Raw parameters object
 * @returns {Object} - Cleaned parameters
 */
function validateModelParams(params) {
    const cleanParams = {};

    // Temperature validation (0-2 for most providers)
    if (params.temperature !== undefined) {
        const temp = parseFloat(params.temperature);
        if (!isNaN(temp) && temp >= 0 && temp <= 2) {
            cleanParams.temperature = temp;
        }
    }

    // Max tokens validation
    if (params.maxTokens !== undefined || params.max_tokens !== undefined) {
        const maxTokens = parseInt(params.maxTokens || params.max_tokens);
        if (!isNaN(maxTokens) && maxTokens > 0) {
            cleanParams.max_tokens = maxTokens;
        }
    }

    // Top P validation (0-1)
    if (params.topP !== undefined || params.top_p !== undefined) {
        const topP = parseFloat(params.topP || params.top_p);
        if (!isNaN(topP) && topP >= 0 && topP <= 1) {
            cleanParams.top_p = topP;
        }
    }

    // Frequency penalty validation (-2 to 2)
    if (params.frequencyPenalty !== undefined || params.frequency_penalty !== undefined) {
        const freqPenalty = parseFloat(params.frequencyPenalty || params.frequency_penalty);
        if (!isNaN(freqPenalty) && freqPenalty >= -2 && freqPenalty <= 2) {
            cleanParams.frequency_penalty = freqPenalty;
        }
    }

    // Presence penalty validation (-2 to 2)
    if (params.presencePenalty !== undefined || params.presence_penalty !== undefined) {
        const presPenalty = parseFloat(params.presencePenalty || params.presence_penalty);
        if (!isNaN(presPenalty) && presPenalty >= -2 && presPenalty <= 2) {
            cleanParams.presence_penalty = presPenalty;
        }
    }

    return cleanParams;
}

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {string} details - Additional error details
 * @returns {Object} - Error object
 */
function createError(message, status = 500, details = null) {
    const error = new Error(message);
    error.status = status;
    if (details) error.details = details;
    return error;
}

module.exports = {
    getProviderFromModel,
    validateMessages,
    validateModelParams,
    createError
};
