const crypto = require('crypto');
const { createError } = require('./helpers');

/**
 * Encryption key management
 * Uses environment variables for the encryption key or generates a secure one
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
                       crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Encrypt sensitive data
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text (format: iv:encrypted)
 */
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted data
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text (format: iv:encrypted)
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return null;
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

/**
 * Validate API key format and strength
 * @param {string} apiKey - API key to validate
 * @returns {Object} - Validation result
 */
function validateApiKey(apiKey) {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  
  // Check minimum length (32 characters is a common minimum for secure API keys)
  if (apiKey.length < 32) {
    return { valid: false, error: 'API key must be at least 32 characters long' };
  }
  
  // Check for sufficient complexity (must contain letters and numbers)
  if (!/[a-zA-Z]/.test(apiKey) || !/[0-9]/.test(apiKey)) {
    return { valid: false, error: 'API key must contain both letters and numbers' };
  }
  
  return { valid: true };
}

/**
 * Generate a secure API key
 * @returns {string} - Generated API key
 */
function generateApiKey() {
  // Generate a random 48-byte hex string
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Validate server name format
 * @param {string} name - Server name to validate
 * @returns {Object} - Validation result
 */
function validateServerName(name) {
  if (!name) {
    return { valid: false, error: 'Server name is required' };
  }
  
  // Alphanumeric, dashes, and underscores only
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { 
      valid: false, 
      error: 'Server name must contain only letters, numbers, dashes, and underscores' 
    };
  }
  
  return { valid: true };
}

/**
 * Validate server endpoint URL
 * @param {string} endpoint - Server endpoint URL to validate
 * @returns {Object} - Validation result
 */
function validateEndpoint(endpoint) {
  if (!endpoint) {
    return { valid: false, error: 'Server endpoint is required' };
  }
  
  try {
    const url = new URL(endpoint);
    
    // Ensure protocol is https (except for localhost or 127.0.0.1 for development)
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !isLocalhost) {
      return { 
        valid: false, 
        error: 'Server endpoint must use HTTPS for security (except localhost)' 
      };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format for server endpoint' };
  }
}

/**
 * Validate and sanitize MCP tool arguments
 * @param {Object} arguments - Tool arguments to validate
 * @param {Object} inputSchema - Tool input schema
 * @returns {Object} - Validated and sanitized arguments
 */
function validateToolArguments(arguments, inputSchema) {
  if (!arguments) {
    return { valid: false, error: 'Tool arguments are required' };
  }
  
  if (!inputSchema || typeof inputSchema !== 'object') {
    return { valid: false, error: 'Input schema is required for validation' };
  }
  
  // Basic validation based on schema type
  const properties = inputSchema.properties || {};
  const required = inputSchema.required || [];
  const sanitizedArgs = {};
  const errors = [];
  
  // Check required properties
  for (const prop of required) {
    if (arguments[prop] === undefined) {
      errors.push(`Missing required argument: ${prop}`);
    }
  }
  
  // Validate and sanitize each property
  for (const [key, value] of Object.entries(arguments)) {
    const propSchema = properties[key];
    
    // Skip if property is not in schema
    if (!propSchema) continue;
    
    // Validate based on type
    if (propSchema.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
      } else {
        // Sanitize string (remove control characters, limit length)
        sanitizedArgs[key] = value
          .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
          .substring(0, 10000); // Limit length
      }
    } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`${key} must be a number`);
      } else {
        sanitizedArgs[key] = num;
      }
    } else if (propSchema.type === 'boolean') {
      sanitizedArgs[key] = Boolean(value);
    } else if (propSchema.type === 'object' && typeof value === 'object') {
      // For objects, we just do a basic check and JSON sanitization
      try {
        sanitizedArgs[key] = JSON.parse(JSON.stringify(value));
      } catch (e) {
        errors.push(`${key} contains invalid JSON`);
      }
    } else if (propSchema.type === 'array' && Array.isArray(value)) {
      // For arrays, we just do a basic check and JSON sanitization
      try {
        sanitizedArgs[key] = JSON.parse(JSON.stringify(value));
      } catch (e) {
        errors.push(`${key} contains invalid JSON`);
      }
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }
  
  return { valid: true, sanitized: sanitizedArgs };
}

/**
 * Validate and sanitize resource URI
 * @param {string} uri - Resource URI to validate
 * @returns {Object} - Validation result
 */
function validateResourceUri(uri) {
  if (!uri) {
    return { valid: false, error: 'Resource URI is required' };
  }
  
  // Basic URI format validation
  // Allow custom schemes like weather://city/forecast
  if (!/^[a-zA-Z0-9_-]+:\/\/[^\s]+$/.test(uri)) {
    return { 
      valid: false, 
      error: 'Invalid URI format. Must follow scheme://path pattern' 
    };
  }
  
  // Sanitize URI by removing control characters
  const sanitizedUri = uri.replace(/[\x00-\x1F\x7F]/g, '');
  
  return { valid: true, sanitized: sanitizedUri };
}

/**
 * Validate content type
 * @param {string} contentType - Content type to validate
 * @param {Array} allowedTypes - Allowed content types
 * @returns {Object} - Validation result
 */
function validateContentType(contentType, allowedTypes = ['application/json', 'text/plain']) {
  if (!contentType) {
    return { valid: false, error: 'Content type is required' };
  }
  
  // Check if content type is allowed
  const baseType = contentType.split(';')[0].trim().toLowerCase();
  if (!allowedTypes.includes(baseType)) {
    return { 
      valid: false, 
      error: `Content type ${baseType} is not allowed. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Sanitize error messages for external consumption
 * @param {Error} error - Original error
 * @returns {Object} - Sanitized error object
 */
function sanitizeErrorMessage(error) {
  // Generic error messages by status code
  const genericMessages = {
    400: 'Bad request: The server could not process the request',
    401: 'Unauthorized: Authentication required',
    403: 'Forbidden: You do not have permission to access this resource',
    404: 'Not found: The requested resource does not exist',
    500: 'Internal server error: Something went wrong on the server',
    503: 'Service unavailable: The server is temporarily unavailable'
  };
  
  const status = error.status || 500;
  const genericMessage = genericMessages[status] || 'An error occurred';
  
  // Log the detailed error for debugging
  console.error('Detailed error:', {
    message: error.message,
    status: status,
    details: error.details || '',
    stack: error.stack
  });
  
  // Return sanitized error for external consumption
  return {
    error: genericMessage,
    status: status,
    // Include a reference ID for tracking in logs
    ref: crypto.randomBytes(4).toString('hex')
  };
}

/**
 * Verify TLS certificate
 * @param {Object} options - Fetch options
 * @returns {Object} - Updated fetch options with TLS verification
 */
function verifyTls(options = {}) {
  // In Node.js, TLS verification is enabled by default
  // This function ensures it's not disabled and adds additional security options
  
  // Create a new options object to avoid modifying the original
  const secureOptions = { ...options };
  
  // Ensure agent options exist
  secureOptions.agent = secureOptions.agent || {};
  
  // Force TLS verification (prevent rejectUnauthorized: false)
  secureOptions.agent.rejectUnauthorized = true;
  
  // Set secure TLS options
  secureOptions.agent.secureOptions = crypto.constants.SSL_OP_NO_SSLv2 | 
                                     crypto.constants.SSL_OP_NO_SSLv3 | 
                                     crypto.constants.SSL_OP_NO_TLSv1 |
                                     crypto.constants.SSL_OP_NO_TLSv1_1;
  
  return secureOptions;
}

/**
 * Check if IP is in allowlist
 * @param {string} ip - IP address to check
 * @param {Array} allowlist - List of allowed IP addresses or CIDR ranges
 * @returns {boolean} - True if IP is allowed, false otherwise
 */
function isIpAllowed(ip, allowlist = []) {
  // If allowlist is empty, allow all IPs
  if (!allowlist || allowlist.length === 0) {
    return true;
  }
  
  // Check if IP is in allowlist
  return allowlist.some(allowed => {
    // Exact match
    if (allowed === ip) return true;
    
    // CIDR match (simplified implementation)
    if (allowed.includes('/')) {
      const [network, bits] = allowed.split('/');
      const mask = ~(2 ** (32 - parseInt(bits)) - 1);
      
      // Convert IP addresses to integers for comparison
      const ipInt = ipToInt(ip);
      const networkInt = ipToInt(network);
      
      // Check if IP is in network range
      return (ipInt & mask) === (networkInt & mask);
    }
    
    return false;
  });
}

/**
 * Convert IP address to integer
 * @param {string} ip - IP address
 * @returns {number} - Integer representation of IP
 */
function ipToInt(ip) {
  return ip.split('.')
    .reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
}

module.exports = {
  encrypt,
  decrypt,
  validateApiKey,
  generateApiKey,
  validateServerName,
  validateEndpoint,
  validateToolArguments,
  validateResourceUri,
  validateContentType,
  sanitizeErrorMessage,
  verifyTls,
  isIpAllowed
};