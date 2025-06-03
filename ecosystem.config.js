module.exports = {
  apps: [{
    name: 'ai-inference-platform',
    script: './index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',

    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,

    // Advanced PM2 configuration
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,

    // Performance monitoring
    instance_var: 'INSTANCE_ID',
    merge_logs: true,

    // Node.js flags
    node_args: '--max-old-space-size=2048',

    // Deployment hooks
    post_update: ['npm install', 'npm run build'],

    // Health check
    health_check: {
      interval: 30000,
      path: '/api/health',
      port: 3000,
      timeout: 5000,
      max_consecutive_failures: 3
    }
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/ai-inference-platform.git',
      path: '/var/www/ai-inference-platform',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no'
    },
    staging: {
      user: 'deploy',
      host: 'staging.your-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/ai-inference-platform.git',
      path: '/var/www/ai-inference-platform-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      ssh_options: 'StrictHostKeyChecking=no'
    }
  }
};
