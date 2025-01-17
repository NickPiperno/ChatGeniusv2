# Deployment Guide

This guide covers deploying ChatGenius to production environments.

## Prerequisites

- Node.js 18+
- PM2 for process management
- Git
- AWS Account with DynamoDB access
- MongoDB Atlas Account

## Production Setup

1. Clone the repository:
```bash
git clone https://github.com/yourdisplayname/ChatGenius.git
cd ChatGenius
```

2. Install dependencies:
```bash
npm install --production
```

3. Build the application:
```bash
npm run build
```

4. Set up environment variables:
Create a `.env` file with production values:
```env
NODE_ENV=production

# AWS Configuration
AWS_REGION=<YOUR_AWS_REGION>
AWS_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_KEY>

# MongoDB Configuration
MONGODB_URI=<YOUR_MONGODB_URI>

# DynamoDB Tables
DYNAMODB_MESSAGES_TABLE=<YOUR_MESSAGES_TABLE>
DYNAMODB_GROUPS_TABLE=<YOUR_GROUPS_TABLE>
DYNAMODB_USERS_TABLE=<YOUR_USERS_TABLE>

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<YOUR_CLERK_PUBLISHABLE_KEY>
CLERK_SECRET_KEY=<YOUR_CLERK_SECRET_KEY>

# API Configuration
NEXT_PUBLIC_API_URL=<YOUR_PRODUCTION_URL>  # e.g., https://your-domain.com
```

## Process Management with PM2

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Create a PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'chatgenius',
    script: 'server/start.ts',
    instances: 1,           // Single instance as Socket.IO requires sticky sessions
    exec_mode: 'fork',      // Fork mode for WebSocket support
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

3. Start the application with PM2:
```bash
pm2 start ecosystem.config.js
```

4. Save the PM2 process list:
```bash
pm2 save
```

5. Set up PM2 to start on system boot:
```bash
pm2 startup
```

## Monitoring

1. Monitor the application:
```bash
pm2 monit
```

2. View logs:
```bash
pm2 logs chatgenius
```

3. Check the health endpoint:
```bash
curl http://your-domain/api/health
```

## Scaling

The application uses a single server instance to handle both HTTP and WebSocket connections. For scaling:

1. Vertical Scaling:
   - Increase server resources (CPU, memory)
   - Adjust PM2 memory limit in ecosystem config

2. Horizontal Scaling (Advanced):
   - Requires additional setup for Socket.IO clustering
   - Use Redis adapter for Socket.IO
   - Configure load balancer with sticky sessions
   - Update PM2 config for multiple instances

## SSL/TLS Configuration

If using a reverse proxy like Nginx:

1. Install Nginx:
```bash
sudo apt install nginx
```

2. Create Nginx configuration:
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;     # Increased timeout for WebSocket
        proxy_send_timeout 86400s;     # Increased timeout for WebSocket
    }
}
```

## Backup and Recovery

1. DynamoDB Backup:
   - Enable point-in-time recovery (PITR)
   - Schedule regular backups using AWS Backup

2. MongoDB Backup:
   - Use MongoDB Atlas continuous backup
   - Schedule regular snapshots

## Maintenance

1. Update dependencies:
```bash
npm audit
npm update
```

2. Rotate credentials regularly:
   - AWS access keys
   - MongoDB connection strings
   - Clerk API keys

3. Monitor logs and metrics:
   - PM2 logs
   - Health check endpoint
   - AWS CloudWatch metrics
   - MongoDB Atlas metrics
   - Socket connection stats

## Troubleshooting

1. Check application logs:
```bash
pm2 logs chatgenius
```

2. Verify health status:
```bash
curl http://your-domain/api/health
```

3. Common issues:
   - Connection timeouts: Check Nginx proxy timeouts
   - Memory issues: Monitor with `pm2 monit`
   - Socket disconnects: Check for network stability
   - CORS errors: Verify NEXT_PUBLIC_API_URL matches your domain
   - WebSocket errors: Check proxy WebSocket configuration
``` 