const { createRateLimiter } = require('../../middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      path: '/api/test',
      method: 'GET'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn()
    };
    next = jest.fn();

    // Clear any rate limiter stores between tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within the rate limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 5
      });

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        limiter(req, res, next);
        expect(next).toHaveBeenCalledTimes(i + 1);
        expect(res.status).not.toHaveBeenCalled();
      }
    });

    it('should block requests exceeding the rate limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 3
      });

      // Make 3 requests (reach limit)
      for (let i = 0; i < 3; i++) {
        limiter(req, res, next);
      }

      // 4th request should be blocked
      limiter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
      expect(next).toHaveBeenCalledTimes(3);
    });

    it('should reset the limit after window expires', () => {
      const limiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 2
      });

      // Make 2 requests (reach limit)
      limiter(req, res, next);
      limiter(req, res, next);

      // 3rd request should be blocked
      limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);

      // Advance time past the window
      jest.advanceTimersByTime(61000);

      // Clear previous mock calls
      res.status.mockClear();
      res.json.mockClear();
      next.mockClear();

      // Request should now be allowed
      limiter(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should track different IPs separately', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2
      });

      // Make 2 requests from first IP
      limiter(req, res, next);
      limiter(req, res, next);

      // Change IP
      req.ip = '192.168.1.1';

      // Request from new IP should be allowed
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);

      // Change back to first IP
      req.ip = '127.0.0.1';

      // Request from first IP should be blocked
      limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should set appropriate headers', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
        standardHeaders: true
      });

      limiter(req, res, next);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '4'
        })
      );
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom rate limit message';
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        message: customMessage
      });

      // First request passes
      limiter(req, res, next);

      // Second request should be blocked with custom message
      limiter(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: customMessage,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    });

    it('should skip rate limiting when skip function returns true', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        skip: (req) => req.ip === '127.0.0.1'
      });

      // Make multiple requests - all should pass due to skip
      for (let i = 0; i < 5; i++) {
        limiter(req, res, next);
        expect(next).toHaveBeenCalledTimes(i + 1);
      }

      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use custom key generator when provided', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => req.path // Use path instead of IP
      });

      // Make 2 requests to same path
      limiter(req, res, next);
      limiter(req, res, next);

      // 3rd request to same path should be blocked
      limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);

      // Change path
      req.path = '/api/other';
      res.status.mockClear();

      // Request to different path should be allowed
      limiter(req, res, next);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle x-forwarded-for header', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2
      });

      // Add x-forwarded-for header
      req.headers = {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1'
      };

      // Make 2 requests
      limiter(req, res, next);
      limiter(req, res, next);

      // 3rd request should be blocked
      limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should apply rate limiting to websocket upgrade requests', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        skipSuccessfulRequests: true
      });

      req.headers = { upgrade: 'websocket' };

      // First websocket request passes
      limiter(req, res, next);
      expect(next).toHaveBeenCalled();

      // Second websocket request should be blocked
      limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Predefined rate limiters', () => {
    it('should export apiLimiter with correct configuration', () => {
      const { apiLimiter } = require('../../middleware/rateLimiter');
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    it('should export authLimiter with correct configuration', () => {
      const { authLimiter } = require('../../middleware/rateLimiter');
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    it('should export uploadLimiter with correct configuration', () => {
      const { uploadLimiter } = require('../../middleware/rateLimiter');
      expect(uploadLimiter).toBeDefined();
      expect(typeof uploadLimiter).toBe('function');
    });
  });
});
