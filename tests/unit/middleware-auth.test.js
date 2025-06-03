const {
  authenticate,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword
} = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock database
jest.mock('../../database', () => ({
  db: {
    prepare: jest.fn(() => ({
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn()
    }))
  }
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword123';

      bcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123';
      const hash = 'hashedPassword123';

      bcrypt.compare.mockResolvedValue(true);

      const result = await comparePassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const hash = 'hashedPassword123';

      bcrypt.compare.mockResolvedValue(false);

      const result = await comparePassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token for user', () => {
      const user = {
        id: 1,
        username: 'testuser',
        role: 'user'
      };
      const token = 'generated.jwt.token';

      jwt.sign.mockReturnValue(token);

      const result = generateToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: user.id,
          username: user.username,
          role: user.role,
          iat: expect.any(Number)
        }),
        expect.any(String),
        { expiresIn: '24h' }
      );
      expect(result).toBe(token);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded token for valid token with active session', () => {
      const token = 'valid.jwt.token';
      const decoded = {
        id: 1,
        username: 'testuser',
        role: 'user'
      };
      const mockSession = { id: 1, session_token: token };

      jwt.verify.mockReturnValue(decoded);
      const mockPrepare = require('../../database').db.prepare;
      const mockGet = jest.fn().mockReturnValue(mockSession);
      mockPrepare.mockReturnValue({ get: mockGet });

      const result = verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(result).toEqual(decoded);
    });

    it('should return null for valid token without active session', () => {
      const token = 'valid.jwt.token';
      const decoded = {
        id: 1,
        username: 'testuser',
        role: 'user'
      };

      jwt.verify.mockReturnValue(decoded);
      const mockPrepare = require('../../database').db.prepare;
      const mockGet = jest.fn().mockReturnValue(null);
      mockPrepare.mockReturnValue({ get: mockGet });

      const result = verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      const token = 'invalid.jwt.token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = verifyToken(token);

      expect(result).toBeNull();
    });
  });

  describe('authenticate middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should call next() for valid token', () => {
      const token = 'valid.token';
      const decoded = {
        id: 1,
        username: 'testuser',
        role: 'user'
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decoded);

      const mockPrepare = require('../../database').db.prepare;
      const mockGet = jest.fn().mockReturnValue({ session_token: token });
      mockPrepare.mockReturnValue({ get: mockGet });

      const middleware = authenticate();
      middleware(req, res, next);

      expect(req.user).toEqual(decoded);
      expect(req.authenticated).toBe(true);
      expect(req.token).toBe(token);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when authentication is required and no token provided', () => {
      const middleware = authenticate({ required: true });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when authentication is not required and no token provided', () => {
      const middleware = authenticate({ required: false });
      middleware(req, res, next);

      expect(req.authenticated).toBe(false);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user role does not match required roles', () => {
      const token = 'valid.token';
      const decoded = {
        id: 1,
        username: 'testuser',
        role: 'user'
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decoded);

      const mockPrepare = require('../../database').db.prepare;
      const mockGet = jest.fn().mockReturnValue({ session_token: token });
      mockPrepare.mockReturnValue({ get: mockGet });

      const middleware = authenticate({ roles: ['admin'] });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: ['admin']
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when user role matches required roles', () => {
      const token = 'valid.token';
      const decoded = {
        id: 1,
        username: 'testuser',
        role: 'admin'
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decoded);

      const mockPrepare = require('../../database').db.prepare;
      const mockGet = jest.fn().mockReturnValue({ session_token: token });
      mockPrepare.mockReturnValue({ get: mockGet });

      const middleware = authenticate({ roles: ['admin', 'user'] });
      middleware(req, res, next);

      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
    });
  });
});
