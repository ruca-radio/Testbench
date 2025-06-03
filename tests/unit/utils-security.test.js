const {
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
} = require('../../utils/security');

describe('Security Utilities', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plainText = 'sensitive data';
      const encrypted = encrypt(plainText);

      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':'); // Should contain IV separator

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it('should handle null inputs', () => {
      expect(encrypt(null)).toBeNull();
      expect(decrypt(null)).toBeNull();
    });

    it('should return null for invalid encrypted format', () => {
      expect(decrypt('invalid')).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key format', () => {
      const result1 = validateApiKey('a'.repeat(32));
      expect(result1.valid).toBe(true);

      const result2 = validateApiKey('short');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('at least 32 characters');

      const result3 = validateApiKey('1'.repeat(32));
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('letters and numbers');

      const result4 = validateApiKey('abc123'.repeat(6));
      expect(result4.valid).toBe(true);
    });

    it('should handle missing API key', () => {
      const result = validateApiKey(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is required');
    });
  });

  describe('generateApiKey', () => {
    it('should generate a 96-character hex string', () => {
      const apiKey = generateApiKey();
      expect(apiKey).toHaveLength(96);
      expect(apiKey).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('validateServerName', () => {
    it('should validate server name format', () => {
      const result1 = validateServerName('test-server');
      expect(result1.valid).toBe(true);

      const result2 = validateServerName('test_server');
      expect(result2.valid).toBe(true);

      const result3 = validateServerName('test server');
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('letters, numbers, dashes, and underscores');

      const result4 = validateServerName('test@server');
      expect(result4.valid).toBe(false);
    });

    it('should handle missing server name', () => {
      const result = validateServerName(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server name is required');
    });
  });

  describe('validateEndpoint', () => {
    it('should validate HTTPS endpoints', () => {
      const result1 = validateEndpoint('https://api.example.com');
      expect(result1.valid).toBe(true);

      const result2 = validateEndpoint('http://api.example.com');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('must use HTTPS');
    });

    it('should allow HTTP for localhost', () => {
      const result1 = validateEndpoint('http://localhost:3000');
      expect(result1.valid).toBe(true);

      const result2 = validateEndpoint('http://127.0.0.1:3000');
      expect(result2.valid).toBe(true);
    });

    it('should handle invalid URLs', () => {
      const result = validateEndpoint('not a url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should handle missing endpoint', () => {
      const result = validateEndpoint(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server endpoint is required');
    });
  });

  describe('validateToolArguments', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
        data: { type: 'object' },
        tags: { type: 'array' }
      },
      required: ['name']
    };

    it('should validate and sanitize arguments', () => {
      const args = {
        name: 'Test User',
        age: '25',
        active: 1,
        data: { key: 'value' },
        tags: ['tag1', 'tag2']
      };

      const result = validateToolArguments(args, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({
        name: 'Test User',
        age: 25,
        active: true,
        data: { key: 'value' },
        tags: ['tag1', 'tag2']
      });
    });

    it('should remove control characters from strings', () => {
      const args = {
        name: 'Test\x00User\x1F'
      };

      const result = validateToolArguments(args, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.name).toBe('TestUser');
    });

    it('should enforce required fields', () => {
      const args = { age: 25 };

      const result = validateToolArguments(args, schema);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required argument: name');
    });

    it('should validate type constraints', () => {
      const args = {
        name: 'Test',
        age: 'not a number'
      };

      const result = validateToolArguments(args, schema);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('age must be a number');
    });

    it('should handle missing arguments', () => {
      const result = validateToolArguments(null, schema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tool arguments are required');
    });

    it('should handle missing schema', () => {
      const result = validateToolArguments({}, null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Input schema is required for validation');
    });
  });

  describe('validateResourceUri', () => {
    it('should validate URI format', () => {
      const result1 = validateResourceUri('weather://city/forecast');
      expect(result1.valid).toBe(true);
      expect(result1.sanitized).toBe('weather://city/forecast');

      const result2 = validateResourceUri('test://resource');
      expect(result2.valid).toBe(true);
    });

    it('should reject invalid URI format', () => {
      const result = validateResourceUri('invalid uri');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URI format');
    });

    it('should sanitize control characters', () => {
      const result = validateResourceUri('test://resource\x00\x1F');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('test://resource');
    });

    it('should handle missing URI', () => {
      const result = validateResourceUri(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Resource URI is required');
    });
  });

  describe('validateContentType', () => {
    it('should validate allowed content types', () => {
      const result1 = validateContentType('application/json');
      expect(result1.valid).toBe(true);

      const result2 = validateContentType('text/plain');
      expect(result2.valid).toBe(true);

      const result3 = validateContentType('text/html');
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('not allowed');
    });

    it('should handle content type with charset', () => {
      const result = validateContentType('application/json; charset=utf-8');
      expect(result.valid).toBe(true);
    });

    it('should validate against custom allowed types', () => {
      const result = validateContentType('text/html', ['text/html', 'text/xml']);
      expect(result.valid).toBe(true);
    });

    it('should handle missing content type', () => {
      const result = validateContentType(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Content type is required');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should sanitize error messages with generic messages', () => {
      const error = new Error('Database connection failed with password xyz');
      error.status = 500;

      const sanitized = sanitizeErrorMessage(error);
      expect(sanitized.error).toBe('Internal server error: Something went wrong on the server');
      expect(sanitized.status).toBe(500);
      expect(sanitized.ref).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle different status codes', () => {
      const testCases = [
        { status: 400, expected: 'Bad request: The server could not process the request' },
        { status: 401, expected: 'Unauthorized: Authentication required' },
        { status: 403, expected: 'Forbidden: You do not have permission to access this resource' },
        { status: 404, expected: 'Not found: The requested resource does not exist' },
        { status: 503, expected: 'Service unavailable: The server is temporarily unavailable' }
      ];

      testCases.forEach(({ status, expected }) => {
        const error = new Error('Detailed error');
        error.status = status;
        const sanitized = sanitizeErrorMessage(error);
        expect(sanitized.error).toBe(expected);
      });
    });

    it('should handle unknown status codes', () => {
      const error = new Error('Some error');
      error.status = 999;
      const sanitized = sanitizeErrorMessage(error);
      expect(sanitized.error).toBe('An error occurred');
    });
  });

  describe('verifyTls', () => {
    it('should enforce TLS verification', () => {
      const options = {
        someOption: 'value'
      };

      const secured = verifyTls(options);
      expect(secured.agent).toBeDefined();
      expect(secured.agent.rejectUnauthorized).toBe(true);
      expect(secured.agent.secureOptions).toBeDefined();
    });

    it('should not modify original options', () => {
      const options = {
        agent: { rejectUnauthorized: false }
      };

      const secured = verifyTls(options);
      expect(options.agent.rejectUnauthorized).toBe(false);
      expect(secured.agent.rejectUnauthorized).toBe(true);
    });
  });

  describe('isIpAllowed', () => {
    it('should allow all IPs when allowlist is empty', () => {
      expect(isIpAllowed('192.168.1.1')).toBe(true);
      expect(isIpAllowed('10.0.0.1', [])).toBe(true);
    });

    it('should check exact IP matches', () => {
      const allowlist = ['192.168.1.1', '10.0.0.1'];
      expect(isIpAllowed('192.168.1.1', allowlist)).toBe(true);
      expect(isIpAllowed('192.168.1.2', allowlist)).toBe(false);
    });

    it('should support CIDR notation', () => {
      const allowlist = ['192.168.1.0/24'];
      expect(isIpAllowed('192.168.1.1', allowlist)).toBe(true);
      expect(isIpAllowed('192.168.1.255', allowlist)).toBe(true);
      expect(isIpAllowed('192.168.2.1', allowlist)).toBe(false);
    });
  });
});
