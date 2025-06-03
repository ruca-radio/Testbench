require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');


// Process Error Management - Graceful error handling without crashing
process.on('uncaughtException', (error) => {
  console.error('CRITICAL: Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Log to file if logging is set up
  if (global.errorLogger) {
    global.errorLogger.error('Uncaught Exception', error);
  }

  // Attempt graceful shutdown if error is severe
  if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
    console.error('Fatal error, initiating graceful shutdown...');
    gracefulShutdown();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('WARNING: Unhandled Promise Rejection:', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });

  // Convert unhandled rejections to exceptions in development
  if (process.env.NODE_ENV === 'development') {
    throw reason;
  }
});

// Graceful shutdown handler
let isShuttingDown = false;
function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('Initiating graceful shutdown...');

  // Close server to stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');

      // Close database connections
      if (require('./database').db) {
        require('./database').db.close();
        console.log('Database connections closed');
      }

      // Exit after cleanup
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

console.log('Starting server initialization...');

const app = express();
const httpServer = createServer(app);

// Import middleware
const { authenticate, login, logout, getCurrentUser } = require('./middleware/auth');
const { globalRateLimiter, dynamicRateLimiter } = require('./middleware/rateLimiter');

// WebSocket Foundation - Socket.io setup for future multi-agent communication
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "*",
    methods: ["GET", "POST"]
  }
});

// Apply global rate limiter first (unless auth is disabled)
if (process.env.DISABLE_AUTH !== 'true') {
  app.use(globalRateLimiter);
}

// Request logging middleware with timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// CORS configuration
app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authentication endpoints (public - no auth required)
app.post('/api/auth/login', dynamicRateLimiter('auth'), login);
app.post('/api/auth/logout', authenticate({ required: false }), logout);
app.get('/api/auth/user', authenticate({ required: false }), getCurrentUser);

// Serve static files (public - no auth required)
app.use(express.static(path.join(__dirname, 'public')));

// Root Route Handler - Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('Loading routes...');

// Import and use route modules with error handling
const chatRoutes = require('./routes/chat');
const modelsRoutes = require('./routes/models');
const agentsRoutes = require('./routes/agents');
const settingsRoutes = require('./routes/settings');
const mcpRoutes = require('./routes/mcp');
const collaborationRoutes = require('./routes/collaboration');
const healthRoutes = require('./routes/health');
const knowledgeRoutes = require('./routes/knowledge');
const toolsRoutes = require('./routes/tools');
const testbenchRoutes = require('./routes/testbench');
const focusRoutes = require('./routes/focus');
const agentSwarmRoutes = require('./routes/agent-swarm');

console.log('Routes loaded successfully');


// Mount routes with authentication and rate limiting
// Note: Some routes like health check don't require auth

// Chat routes - require authentication
app.use('/', authenticate({ required: true }), dynamicRateLimiter('chat'), chatRoutes);

// Model routes - mixed auth (some endpoints public for initial setup)
app.use('/', modelsRoutes);  // Will add auth per-endpoint in models.js

// Agent routes - require authentication
app.use('/', authenticate({ required: true }), dynamicRateLimiter('api'), agentsRoutes);

// Settings routes - require authentication with admin role for most
app.use('/', authenticate({ required: true }), dynamicRateLimiter('settings'), settingsRoutes);

// MCP routes - already have auth in the route file
app.use('/', mcpRoutes);

// Knowledge routes - require authentication
app.use('/', authenticate({ required: true }), dynamicRateLimiter('api'), knowledgeRoutes);

// Tools routes - require authentication
app.use('/', authenticate({ required: true }), dynamicRateLimiter('api'), toolsRoutes);

// TestBench routes - require authentication with special permissions
app.use('/', authenticate({ required: true }), dynamicRateLimiter('testbench'), testbenchRoutes);

// Collaboration routes - require authentication
app.use('/api/collaboration', authenticate({ required: true }), dynamicRateLimiter('api'), collaborationRoutes);

// Health routes - public, no auth required
app.use('/api/health', dynamicRateLimiter('api'), healthRoutes);

// Focus Mode routes
app.use('/', authenticate({ required: false }), dynamicRateLimiter('api'), focusRoutes);

// Agent Swarm routes
app.use('/', authenticate({ required: false }), dynamicRateLimiter('api'), agentSwarmRoutes);

// Legacy health endpoint for backward compatibility
app.get('/health', dynamicRateLimiter('api'), (req, res) => {
  res.redirect('/api/health');
});

// 404 handler - using a specific path instead of catch-all middleware
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Enhanced Error Handler - Improved error response formatting patterns
app.use((error, req, res, next) => {
  const responseTime = req.startTime ? Date.now() - req.startTime : 0;
  console.error('Express error handler:', error);

  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    responseTime,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.details || undefined
    })
  });
});

// Load collaboration engine for WebSocket integration
const collaborationEngine = require('./services/collaborationEngine');

// WebSocket Connection Management - Enhanced multi-agent communication
collaborationEngine.setWebSocketServer(io);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Removed legacy agent handlers

  // Collaboration status endpoint
  socket.on('collaboration:status', () => {
    const metrics = collaborationEngine.getMetrics();
    socket.emit('collaboration:status:response', metrics);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.agentName || socket.id}`);
  });
});

const port = process.env.PORT || 3000;

console.log('Attempting to start server on port:', port);

// Declare server variable at module scope for graceful shutdown
let server;

server = httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}. Frontend available at http://localhost:${port}`);
  console.log('WebSocket server ready for multi-agent communication');
  console.log('Authentication enabled - use /api/auth/login to authenticate');
  console.log('Server started successfully and should remain running...');
});

server.on('error', (error) => {
  console.error('Server error:', error);

  // Handle specific errors
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please use a different port.`);
  } else if (error.code === 'EACCES') {
    console.error(`Port ${port} requires elevated privileges.`);
  }
});

console.log('Server setup complete. Process should continue running...');
