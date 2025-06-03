/**
 * Standardized API Response Helpers
 * Provides consistent response formats across all endpoints
 */

class ResponseHelpers {
    /**
     * Success response format
     * @param {any} data - The response data
     * @param {string} message - Optional success message
     * @param {object} meta - Optional metadata
     * @returns {object} Standardized success response
     */
    static success(data, message = null, meta = {}) {
        return {
            success: true,
            data,
            message,
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        };
    }

    /**
     * Error response format
     * @param {string|Error} error - Error message or Error object
     * @param {number} statusCode - HTTP status code
     * @param {object} details - Optional error details
     * @returns {object} Standardized error response
     */
    static error(error, statusCode = 500, details = null) {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const response = {
            success: false,
            error: errorMessage,
            statusCode,
            meta: {
                timestamp: new Date().toISOString()
            }
        };

        if (details) {
            response.details = details;
        }

        // Add stack trace in development
        if (process.env.NODE_ENV === 'development' && typeof error === 'object' && error.stack) {
            response.meta.stack = error.stack;
        }

        return response;
    }

    /**
     * Paginated response format
     * @param {Array} data - Array of data items
     * @param {number} page - Current page number
     * @param {number} limit - Items per page
     * @param {number} total - Total number of items
     * @param {object} meta - Optional metadata
     * @returns {object} Standardized paginated response
     */
    static pagination(data, page, limit, total, meta = {}) {
        return {
            success: true,
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        };
    }

    /**
     * Connection test response format
     * @param {string} provider - Provider name
     * @param {boolean} connected - Connection status
     * @param {string} message - Status message
     * @param {object} details - Additional details (modelCount, latency, etc.)
     * @returns {object} Standardized connection test response
     */
    static connectionTest(provider, connected, message, details = {}) {
        return {
            provider,
            connected,
            message,
            ...details,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validation error response format
     * @param {Array} errors - Array of validation errors
     * @param {string} message - Main validation message
     * @returns {object} Standardized validation error response
     */
    static validationError(errors, message = 'Validation failed') {
        return {
            success: false,
            error: message,
            statusCode: 400,
            validation: {
                errors: Array.isArray(errors) ? errors : [errors],
                count: Array.isArray(errors) ? errors.length : 1
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Express middleware for handling async route errors
     * @param {Function} fn - Async route handler function
     * @returns {Function} Express middleware function
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Express error handler middleware
     * @param {Error} error - Error object
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {Function} next - Express next function
     */
    static errorHandler(error, req, res, next) {
        console.error('API Error:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });

        const statusCode = error.statusCode || error.status || 500;
        const response = ResponseHelpers.error(error, statusCode, {
            url: req.url,
            method: req.method,
            userAgent: req.get('User-Agent')
        });

        res.status(statusCode).json(response);
    }
}

module.exports = ResponseHelpers;
