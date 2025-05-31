require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');


// Process Error Management - Added from index-old.js lines 11-19
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('Starting server initialization...');

const app = express();
const httpServer = createServer(app);

// WebSocket Foundation - Socket.io setup for future multi-agent communication
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "*",
    methods: ["GET", "POST"]
  }
});


// Simplified logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// CORS configuration
app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root Route Handler - Serve index.html for root path (from index-old.js lines 32-34)
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

console.log('Routes loaded successfully');


// Mount routes
app.use('/', chatRoutes);        // /chat, /session/title
app.use('/', modelsRoutes);      // /api/models/*
app.use('/', agentsRoutes);      // /api/agents/*
app.use('/', settingsRoutes);    // /api/settings/*
app.use('/', mcpRoutes);         // /api/mcp/*
app.use('/', knowledgeRoutes);   // /api/knowledge/*
app.use('/', toolsRoutes);       // /api/tools/*
app.use('/', testbenchRoutes);   // /api/testbench/*
app.use('/api/collaboration', collaborationRoutes); // /api/collaboration/*
app.use('/api/health', healthRoutes); // /api/health/*

// Legacy health endpoint for backward compatibility
app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// 404 handler - using a specific path instead of catch-all middleware
app.get('/404', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
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

const server = httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}. Frontend available at http://localhost:${port}`);
  console.log('WebSocket server ready for multi-agent communication');
  console.log('Server started successfully and should remain running...');
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

console.log('Server setup complete. Process should continue running...');
