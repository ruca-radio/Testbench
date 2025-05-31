/**
 * Health Check and Monitoring API Routes
 * Provides deployment monitoring and system status endpoints
 */

const express = require('express');
const router = express.Router();
const database = require('../database');
const collaborationEngine = require('../services/collaborationEngine');
const fs = require('fs');
const os = require('os');

/**
 * Basic health check endpoint
 * GET /api/health
 */
router.get('/', async (req, res) => {
    try {
        const healthStatus = await getHealthStatus();

        // Return 200 if all critical services are healthy, 503 if any are down
        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

        res.status(statusCode).json({
            status: healthStatus.status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: healthStatus.services,
            summary: healthStatus.summary
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
        });
    }
});

/**
 * Detailed system status endpoint
 * GET /api/health/status
 */
router.get('/status', async (req, res) => {
    try {
        const healthStatus = await getHealthStatus();
        const systemMetrics = getSystemMetrics();
        const collaborationStats = getCollaborationStats();

        res.json({
            status: healthStatus.status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: healthStatus.services,
            system: systemMetrics,
            collaboration: collaborationStats,
            performance: getPerformanceMetrics()
        });
    } catch (error) {
        console.error('Status check failed:', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Status check failed',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
        });
    }
});

/**
 * Database connectivity check
 * GET /api/health/database
 */
router.get('/database', async (req, res) => {
    try {
        const dbHealth = await checkDatabaseHealth();
        const statusCode = dbHealth.status === 'healthy' ? 200 : 503;

        res.status(statusCode).json({
            timestamp: new Date().toISOString(),
            ...dbHealth
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database health check failed',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Database connection error'
        });
    }
});

/**
 * Redis connectivity check (with graceful fallback)
 * GET /api/health/redis
 */
router.get('/redis', async (req, res) => {
    try {
        const redisHealth = await checkRedisHealth();
        const statusCode = redisHealth.status === 'healthy' || redisHealth.status === 'fallback' ? 200 : 503;

        res.status(statusCode).json({
            timestamp: new Date().toISOString(),
            ...redisHealth
        });
    } catch (error) {
        console.error('Redis health check failed:', error);
        res.status(200).json({ // 200 because Redis is optional
            status: 'fallback',
            timestamp: new Date().toISOString(),
            message: 'Redis unavailable, using memory fallback',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Redis connection error'
        });
    }
});

/**
 * Collaboration engine status
 * GET /api/health/collaboration
 */
router.get('/collaboration', async (req, res) => {
    try {
        const collabHealth = getCollaborationStats();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            ...collabHealth
        });
    } catch (error) {
        console.error('Collaboration health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Collaboration engine check failed',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Collaboration engine error'
        });
    }
});

/**
 * Performance metrics endpoint
 * GET /api/health/metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        const metrics = {
            timestamp: new Date().toISOString(),
            system: getSystemMetrics(),
            performance: getPerformanceMetrics(),
            collaboration: getCollaborationStats(),
            database: await getDatabaseMetrics(),
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            }
        };

        res.json(metrics);
    } catch (error) {
        console.error('Metrics collection failed:', error);
        res.status(500).json({
            error: 'Metrics collection failed',
            timestamp: new Date().toISOString(),
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
        });
    }
});


// Health check helper functions

async function getHealthStatus() {
    const services = {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        collaboration: checkCollaborationHealth(),
        filesystem: checkFilesystemHealth()
    };

    // Determine overall status
    const criticalServices = ['database', 'collaboration', 'filesystem'];
    const criticalHealthy = criticalServices.every(service =>
        services[service].status === 'healthy'
    );

    const status = criticalHealthy ? 'healthy' : 'unhealthy';

    const summary = {
        healthy: Object.values(services).filter(s => s.status === 'healthy').length,
        unhealthy: Object.values(services).filter(s => s.status === 'unhealthy').length,
        warning: Object.values(services).filter(s => s.status === 'warning' || s.status === 'fallback').length
    };

    return { status, services, summary };
}

async function checkDatabaseHealth() {
    try {
        // Test basic database connectivity
        const testQuery = database.db.prepare('SELECT 1 as test').get();

        if (testQuery.test !== 1) {
            throw new Error('Database test query failed');
        }

        // Check critical tables exist
        const tables = database.db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type='table' AND name IN ('workspaces', 'agents', 'agent_conversations')
        `).all();

        if (tables.length < 3) {
            return {
                status: 'warning',
                message: 'Some database tables missing',
                tables: tables.map(t => t.name)
            };
        }

        // Test write capability
        const testTime = Date.now();
        database.db.prepare('CREATE TEMP TABLE health_test (id INTEGER, timestamp INTEGER)').run();
        database.db.prepare('INSERT INTO health_test (id, timestamp) VALUES (?, ?)').run(1, testTime);
        const readBack = database.db.prepare('SELECT timestamp FROM health_test WHERE id = 1').get();
        database.db.prepare('DROP TABLE health_test').run();

        if (readBack.timestamp !== testTime) {
            throw new Error('Database write/read test failed');
        }

        return {
            status: 'healthy',
            message: 'Database operational',
            version: database.db.pragma('user_version'),
            tables: tables.length
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            message: 'Database connection failed',
            error: error.message
        };
    }
}

async function checkRedisHealth() {
    try {
        // Check if Redis is configured and available
        if (!collaborationEngine.isRedisConfigured()) {
            return {
                status: 'fallback',
                message: 'Redis not configured, using memory fallback',
                mode: 'memory'
            };
        }

        // Test Redis connectivity if it's configured
        const redisHealthy = await collaborationEngine.testRedisConnection();

        if (redisHealthy) {
            return {
                status: 'healthy',
                message: 'Redis operational',
                mode: 'redis'
            };
        } else {
            return {
                status: 'fallback',
                message: 'Redis unavailable, using memory fallback',
                mode: 'memory'
            };
        }
    } catch (error) {
        return {
            status: 'fallback',
            message: 'Redis check failed, using memory fallback',
            mode: 'memory',
            error: error.message
        };
    }
}

function checkCollaborationHealth() {
    try {
        // Check if collaboration engine is initialized
        if (!collaborationEngine) {
            return {
                status: 'unhealthy',
                message: 'Collaboration engine not initialized'
            };
        }

        // Get collaboration engine status
        const stats = getCollaborationStats();

        return {
            status: 'healthy',
            message: 'Collaboration engine operational',
            ...stats
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            message: 'Collaboration engine check failed',
            error: error.message
        };
    }
}

function checkFilesystemHealth() {
    try {
        // Check if data directory is writable
        const dataDir = './data';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Test write capability
        const testFile = `${dataDir}/health_test_${Date.now()}.tmp`;
        fs.writeFileSync(testFile, 'health_test');
        const content = fs.readFileSync(testFile, 'utf8');
        fs.unlinkSync(testFile);

        if (content !== 'health_test') {
            throw new Error('Filesystem write/read test failed');
        }

        return {
            status: 'healthy',
            message: 'Filesystem operational',
            dataDirectory: dataDir
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            message: 'Filesystem check failed',
            error: error.message
        };
    }
}

function getSystemMetrics() {
    return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
            process: process.memoryUsage()
        },
        cpu: {
            cores: os.cpus().length,
            loadavg: os.loadavg()
        }
    };
}

function getCollaborationStats() {
    try {
        return {
            activeConversations: collaborationEngine.activeConversations ? collaborationEngine.activeConversations.size : 0,
            queuedMessages: collaborationEngine.messageQueue ?
                Array.from(collaborationEngine.messageQueue.values()).reduce((total, queue) => total + queue.length, 0) : 0,
            queuedTasks: collaborationEngine.taskQueue ?
                Array.from(collaborationEngine.taskQueue.values()).reduce((total, queue) => total + queue.length, 0) : 0,
            connectedAgents: collaborationEngine.connectedAgents ? collaborationEngine.connectedAgents.size : 0
        };
    } catch (error) {
        return {
            activeConversations: 0,
            queuedMessages: 0,
            queuedTasks: 0,
            connectedAgents: 0,
            error: 'Failed to get collaboration stats'
        };
    }
}

function getPerformanceMetrics() {
    // Get global performance metrics if they exist
    const metrics = global.performanceMetrics || [];

    if (metrics.length === 0) {
        return {
            requests: 0,
            averageResponseTime: 0,
            errorRate: 0
        };
    }

    // Calculate metrics from last 100 requests
    const recentMetrics = metrics.slice(-100);
    const totalRequests = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    return {
        requests: totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
    };
}

async function getDatabaseMetrics() {
    try {
        // Get database size and table counts
        const tables = database.db.prepare(`
            SELECT name, COUNT(*) as count
            FROM sqlite_master
            WHERE type='table'
            GROUP BY name
        `).all();

        const counts = {
            workspaces: 0,
            agents: 0,
            conversations: 0,
            messages: 0,
            tasks: 0
        };

        try {
            counts.workspaces = database.db.prepare('SELECT COUNT(*) as count FROM workspaces').get().count;
            counts.agents = database.db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
            counts.conversations = database.db.prepare('SELECT COUNT(*) as count FROM agent_conversations').get().count;
            counts.messages = database.db.prepare('SELECT COUNT(*) as count FROM agent_messages').get().count;
            counts.tasks = database.db.prepare('SELECT COUNT(*) as count FROM agent_tasks').get().count;
        } catch (error) {
            // Some tables might not exist yet
        }

        return {
            tables: tables.length,
            records: counts
        };
    } catch (error) {
        return {
            error: 'Failed to get database metrics'
        };
    }
}

module.exports = router;
