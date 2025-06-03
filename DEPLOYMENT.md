# AI Inference Platform - Deployment Guide

## 🚀 Production Deployment Instructions

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (recommended)
- Redis (optional, for optimal performance)
- SSL certificate (for production)

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# Application Settings
NODE_ENV=production
PORT=3000

# API Keys (Required)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Database
DATABASE_PATH=./data/workspace.db

# Redis Configuration (REQUIRED for collaboration features)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# Security Settings (REQUIRED)
SESSION_SECRET=your_secure_session_secret
JWT_SECRET=your_secure_jwt_secret
CSRF_SECRET=your_secure_csrf_secret
CORS_ORIGIN=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Monitoring (Optional)
GRAFANA_PASSWORD=your_secure_grafana_password
```

## Deployment Methods

### Method 1: Docker Compose (Recommended)

```bash
# 1. Clone and prepare
git clone <repository>
cd framework

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Deploy with Redis
docker-compose up -d

# 4. Deploy with full monitoring stack
docker-compose --profile monitoring up -d

# 5. Deploy with Nginx reverse proxy
docker-compose --profile production up -d
```

### Method 2: Manual Deployment

```bash
# 1. Install dependencies
npm install --production

# 2. Install security dependency
npm install helmet

# 3. Set environment
export NODE_ENV=production

# 4. Start application
npm start
```

### Method 3: PM2 Process Manager

```bash
# 1. Install PM2
npm install -g pm2

# 2. Start with PM2
pm2 start ecosystem.config.js

# 3. Save PM2 configuration
pm2 save
pm2 startup
```

## Health Monitoring

### Health Check Endpoints

- **Basic Health**: `GET /api/health`
- **Detailed Status**: `GET /api/health/status`
- **Database Check**: `GET /api/health/database`
- **Redis Check**: `GET /api/health/redis`
- **Collaboration Engine**: `GET /api/health/collaboration`
- **Performance Metrics**: `GET /api/health/metrics`

### Expected Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": { "status": "healthy", "message": "Database operational" },
    "redis": { "status": "healthy", "mode": "redis" },
    "collaboration": { "status": "healthy", "activeConversations": 5 },
    "filesystem": { "status": "healthy", "dataDirectory": "./data" }
  }
}
```

## Performance Optimization

### Rate Limiting Configuration

The platform includes comprehensive rate limiting:

- **General API**: 100 requests per 15 minutes
- **Agent Communication**: 100 requests per minute
- **Authentication**: 5 attempts per 15 minutes
- **Workspace Operations**: 10 requests per 5 minutes
- **Health Checks**: 60 requests per minute

### Redis Performance Benefits

- **Message Broker**: <100ms agent-to-agent latency
- **Caching**: Reduced database load
- **Scalability**: Support for 10+ simultaneous agents
- **Reliability**: 99.9% message delivery

### Database Optimization

- **SQLite**: Optimized indexes for collaboration queries
- **Connection Pooling**: Efficient database connections
- **Foreign Key Constraints**: Data integrity enforcement
- **Performance Monitoring**: Query execution tracking

## Security Features

### Production Security Stack

- **Helmet**: Security headers protection
- **Rate Limiting**: DDoS and abuse prevention
- **CORS**: Cross-origin request security
- **Input Validation**: Request size and format limits
- **Error Handling**: Information leak prevention

### Security Headers (Production)

```http
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Monitoring & Observability

### Application Metrics

- **Response Times**: Request latency tracking
- **Error Rates**: 4xx/5xx error monitoring
- **Agent Performance**: Collaboration metrics
- **Resource Usage**: Memory and CPU monitoring

### Log Management

```bash
# Application logs
tail -f logs/app.log

# Docker logs
docker-compose logs -f app

# PM2 logs
pm2 logs
```

### Grafana Dashboards (Optional)

Access monitoring at `http://localhost:3001` with configured dashboards for:

- **System Overview**: CPU, memory, network
- **Application Metrics**: Response times, error rates
- **Collaboration Engine**: Agent activity, message latency
- **Database Performance**: Query execution, connection pool

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check database file permissions
ls -la data/workspace.db

# Recreate database if corrupted
rm data/workspace.db
npm start
```

#### 2. Redis Connection Issues

```bash
# Check Redis status
docker-compose logs redis

# Test Redis connection
redis-cli ping
```

#### 3. Rate Limit Exceeded

```bash
# Check rate limit status via health endpoint
curl http://localhost:3000/api/health/metrics

# Reset rate limits (admin action)
# Implementation available in middleware/rateLimiting.js
```

#### 4. Agent Communication Failures

```bash
# Check collaboration engine status
curl http://localhost:3000/api/health/collaboration

# Monitor WebSocket connections
# Check browser developer tools for WebSocket activity
```

### Performance Tuning

#### Memory Optimization

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory usage
curl http://localhost:3000/api/health/metrics
```

#### Database Performance

```bash
# Monitor database metrics
curl http://localhost:3000/api/health/database

# Check collaboration table sizes
# Use database health endpoint for statistics
```

## Testing Deployment

### 1. Basic Health Check

```bash
curl http://localhost:3000/api/health
```

### 2. Collaboration Engine Test

```bash
# Run integration test
node test-collaboration-api.js
```

### 3. Load Testing (Optional)

```bash
# Install Apache Bench
apt-get install apache2-utils

# Test API performance
ab -n 1000 -c 10 http://localhost:3000/api/health
```

## Scaling Considerations

### Horizontal Scaling

- **Load Balancer**: Nginx or cloud load balancer
- **Redis Cluster**: For high-availability message broker
- **Database**: Consider PostgreSQL for multi-instance deployments

### Vertical Scaling

- **Memory**: 4GB+ recommended for production
- **CPU**: 2+ cores for optimal performance
- **Storage**: SSD recommended for database performance

## Backup Strategy

### Database Backup

```bash
# SQLite backup
cp data/workspace.db data/workspace_backup_$(date +%Y%m%d).db

# Automated backup script
./scripts/backup-database.sh
```

### Redis Backup

```bash
# Redis persistence is enabled by default
# Backup files are stored in Redis data volume
docker-compose exec redis redis-cli BGSAVE
```

## Security Checklist

- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] HTTPS enabled with valid certificates
- [ ] Rate limiting configured appropriately
- [ ] CORS origins restricted to known domains
- [ ] Database file permissions secured
- [ ] Redis password authentication enabled
- [ ] Log files secured and rotated
- [ ] Health endpoints accessible to monitoring only
- [ ] Application running as non-root user

## Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Check health endpoints and logs
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review performance metrics and optimize
4. **As needed**: Rotate API keys and certificates

### Emergency Procedures

1. **Service Down**: Check health endpoints, restart if needed
2. **High CPU/Memory**: Scale resources or restart application
3. **Database Corruption**: Restore from backup
4. **Security Breach**: Rotate all credentials immediately

For additional support, refer to the application logs and health monitoring endpoints for detailed diagnostic information.
