const rateLimit = require('express-rate-limit');

/**
 * Create rate limiter with specified options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: req.rateLimit.resetTime
      });
    }
  };

  return rateLimit({ ...defaults, ...options });
}

// Specific rate limiters for different endpoints
const rateLimiters = {
  // Strict limit for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    skipSuccessfulRequests: true // Don't count successful logins
  }),

  // Moderate limit for chat endpoints
  chat: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Chat rate limit exceeded. Please slow down.'
  }),

  // Strict limit for MCP tool execution
  mcpExecute: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 tool executions per minute
    message: 'MCP tool execution rate limit exceeded.'
  }),

  // Moderate limit for settings modifications
  settings: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 settings changes per 5 minutes
    message: 'Settings modification rate limit exceeded.'
  }),

  // General API limit
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes
    message: 'API rate limit exceeded.'
  }),

  // Very strict limit for TestBench operations
  testbench: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 TestBench operations per 5 minutes
    message: 'TestBench operation rate limit exceeded.',
    skipFailedRequests: true // Only count successful TestBench operations
  }),

  // Model refresh operations
  modelRefresh: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 model refreshes per hour
    message: 'Model refresh rate limit exceeded.'
  }),

  // File operations (for future file upload endpoints)
  fileOps: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 file operations per 5 minutes
    message: 'File operation rate limit exceeded.'
  })
};

/**
 * Dynamic rate limiter that adjusts based on user role
 * @param {string} limiterName - Name of the rate limiter to use
 * @returns {Function} Express middleware
 */
function dynamicRateLimiter(limiterName) {
  return (req, res, next) => {
    // Skip rate limiting if DISABLE_AUTH is set
    if (process.env.DISABLE_AUTH === 'true') {
      return next();
    }

    // Get the base rate limiter
    let baseLimiter = rateLimiters[limiterName] || rateLimiters.api;
    
    if (!baseLimiter) {
        console.error('Base Limiter is undefined. Disabling rate limiting for this request.');
        return next();
    }

    // Use base limiter for all requests
    return baseLimiter(req, res, next);
  };
}

/**
 * Global rate limiter to prevent extreme abuse
 */
const globalRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute absolute maximum
  message: 'Global rate limit exceeded. Your IP has been temporarily blocked.'
});

module.exports = {
  createRateLimiter,
  rateLimiters,
  dynamicRateLimiter,
  globalRateLimiter
};
