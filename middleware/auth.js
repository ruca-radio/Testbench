const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../database');

// JWT secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Prepared statements for database operations
const statements = {
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  createSession: db.prepare(`
    INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `),
  getSession: db.prepare('SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > datetime(\'now\')'),
  deleteSession: db.prepare('DELETE FROM user_sessions WHERE session_token = ?'),
  updateLastLogin: db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'),
  incrementLoginAttempts: db.prepare('UPDATE users SET login_attempts = login_attempts + 1 WHERE id = ?'),
  resetLoginAttempts: db.prepare('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?'),
  lockAccount: db.prepare('UPDATE users SET locked_until = datetime(\'now\', \'+15 minutes\') WHERE id = ?'),
  logAuthEvent: db.prepare(`
    INSERT INTO auth_audit_log (user_id, event_type, ip_address, user_agent, details, success)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
};

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Password hash
 * @returns {Promise<boolean>} - True if password matches
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id, username, and role
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    iat: Date.now()
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Create a session in the database
 * @param {number} userId - User ID
 * @param {string} token - Session token
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 */
function createSession(userId, token, ipAddress, userAgent) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  statements.createSession.run(
    userId,
    token,
    expiresAt.toISOString(),
    ipAddress,
    userAgent
  );
}

/**
 * Verify JWT token and check session
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if session exists in database
    const session = statements.getSession.get(token);
    if (!session) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Log authentication event
 * @param {number|null} userId - User ID (null for failed logins with unknown user)
 * @param {string} eventType - Type of event (login, logout, failed_login, etc.)
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @param {Object} details - Additional event details
 * @param {boolean} success - Whether the event was successful
 */
function logAuthEvent(userId, eventType, ipAddress, userAgent, details, success = true) {
  statements.logAuthEvent.run(
    userId,
    eventType,
    ipAddress,
    userAgent,
    JSON.stringify(details || {}),
    success ? 1 : 0
  );
}

/**
 * Authentication middleware
 * @param {Object} options - Middleware options
 * @param {boolean} options.required - Whether authentication is required (default: true)
 * @param {Array<string>} options.roles - Required roles for access
 */
function authenticate(options = {}) {
  const { required = true, roles = [] } = options;

  return (req, res, next) => {
    // Skip authentication if DISABLE_AUTH is set
    if (process.env.DISABLE_AUTH === 'true') {
      req.authenticated = false;
      req.user = { role: 'admin' }; // Default admin role for testing
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    // Verify token
    const decoded = token ? verifyToken(token) : null;

    if (required && !decoded) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check role requirements
    if (decoded && roles.length > 0 && !roles.includes(decoded.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: roles
      });
    }

    // Attach user to request
    if (decoded) {
      req.user = decoded;
      req.authenticated = true;
      req.token = token;
    } else {
      req.authenticated = false;
    }

    next();
  };
}

/**
 * Login endpoint handler
 */
async function login(req, res) {
  const { username, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required'
    });
  }

  try {
    // Get user from database
    const user = statements.getUserByUsername.get(username);

    if (!user) {
      logAuthEvent(null, 'failed_login', ipAddress, userAgent, { username }, false);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      logAuthEvent(user.id, 'login_attempt_locked', ipAddress, userAgent, {}, false);
      return res.status(401).json({
        error: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment login attempts
      statements.incrementLoginAttempts.run(user.id);

      // Lock account after 5 failed attempts
      if (user.login_attempts >= 4) {
        statements.lockAccount.run(user.id);
      }

      logAuthEvent(user.id, 'failed_login', ipAddress, userAgent, {}, false);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      logAuthEvent(user.id, 'login_inactive_account', ipAddress, userAgent, {}, false);
      return res.status(401).json({
        error: 'Account is inactive'
      });
    }

    // Reset login attempts on successful login
    statements.resetLoginAttempts.run(user.id);
    statements.updateLastLogin.run(user.id);

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    // Create session
    createSession(user.id, token, ipAddress, userAgent);

    // Log successful login
    logAuthEvent(user.id, 'login', ipAddress, userAgent, {}, true);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'An error occurred during login'
    });
  }
}

/**
 * Logout endpoint handler
 */
async function logout(req, res) {
  const token = req.token;
  const userId = req.user?.id;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  if (token) {
    // Delete session from database
    statements.deleteSession.run(token);
  }

  if (userId) {
    logAuthEvent(userId, 'logout', ipAddress, userAgent, {}, true);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * Get current user info
 */
async function getCurrentUser(req, res) {
  if (!req.authenticated) {
    return res.status(401).json({
      error: 'Not authenticated'
    });
  }

  // Get fresh user data from database
  const user = statements.getUserById.get(req.user.id);

  if (!user || !user.is_active) {
    return res.status(401).json({
      error: 'User not found or inactive'
    });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }
  });
}

/**
 * Create initial admin user if none exists
 * This should only be used during initial setup
 */
async function createInitialAdminUser() {
  try {
    const adminUser = statements.getUserByUsername.get('admin');

    if (!adminUser) {
      console.log('Creating initial admin user...');

      const hashedPassword = await hashPassword(process.env.INITIAL_ADMIN_PASSWORD || 'changeme123!');

      db.prepare(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `).run('admin', 'admin@example.com', hashedPassword, 'admin');

      console.log('Initial admin user created. Please change the password immediately!');
      console.log('Default credentials: admin / changeme123!');
    }
  } catch (error) {
    console.error('Error creating initial admin user:', error);
  }
}

// Clean up expired sessions periodically
setInterval(() => {
  try {
    db.prepare('DELETE FROM user_sessions WHERE expires_at < datetime(\'now\')').run();
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = {
  authenticate,
  generateToken,
  verifyToken,
  login,
  logout,
  getCurrentUser,
  hashPassword,
  comparePassword,
  createInitialAdminUser
};
