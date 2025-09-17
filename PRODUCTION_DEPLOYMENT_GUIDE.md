# TableServe Backend - Production Deployment Guide

## 🚀 Production Readiness Checklist

This guide provides a comprehensive checklist and instructions for deploying the TableServe backend to production.

### ✅ Pre-Deployment Checklist

#### 1. Environment Configuration
- [ ] `.env.production` file created with all required variables
- [ ] JWT secrets are strong and unique (minimum 32 characters)
- [ ] Database connection string points to production MongoDB
- [ ] Email service configured with valid SMTP credentials
- [ ] Cloudinary configured for production image storage
- [ ] Payment gateway (Razorpay) configured with live keys
- [ ] Frontend URLs updated to production domains
- [ ] CORS origins configured for production domains

#### 2. Security Configuration
- [ ] Rate limiting enabled and configured appropriately
- [ ] Helmet security headers configured
- [ ] Input validation and sanitization enabled
- [ ] Authentication middleware properly configured
- [ ] Error handling doesn't expose sensitive information
- [ ] Logging configured for production (no sensitive data logged)

#### 3. Performance Optimization
- [ ] Database connection pooling configured
- [ ] Compression enabled
- [ ] Caching strategy implemented
- [ ] Log rotation configured
- [ ] Memory limits set appropriately

#### 4. Monitoring & Health Checks
- [ ] Health check endpoints configured
- [ ] Logging system operational
- [ ] Error tracking configured
- [ ] Performance monitoring ready

## 🔧 Environment Variables

### Required Variables

Create a `.env.production` file with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tableserve_production

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-characters
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM="TableServe <noreply@yourdomain.com>"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Payment Gateway
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Frontend URLs
FRONTEND_URL=https://yourdomain.com
ADMIN_PANEL_URL=https://admin.yourdomain.com
API_BASE_URL=https://api.yourdomain.com

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### Optional Variables

```bash
# Logging Configuration
LOG_LEVEL=info
LOG_HTTP_REQUESTS=true
LOG_AUTH_EVENTS=true
LOG_PAYMENT_EVENTS=true
LOG_EMAIL_EVENTS=true

# Performance
REQUEST_TIMEOUT=30000
COMPRESSION_LEVEL=6
CACHE_TTL=3600

# Clustering
CLUSTER_WORKERS=0
MAX_WORKER_RESTARTS=5
GRACEFUL_SHUTDOWN_TIMEOUT=30000
```

## 🛠️ Deployment Steps

### Step 1: Validate Environment

Run the environment validation script:

```bash
node scripts/validate-production-env.js
```

This will check all required variables and security configurations.

### Step 2: Install Dependencies

```bash
npm ci --only=production
```

### Step 3: Deploy with PM2 (Recommended)

#### Option A: Using the deployment script (Windows)
```cmd
scripts\deploy-production.bat
```

#### Option B: Using the deployment script (Linux/Mac)
```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

#### Option C: Manual PM2 deployment

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the application:
```bash
pm2 start production-server.js --name "tableserve-api" -i max
```

3. Save PM2 configuration:
```bash
pm2 save
pm2 startup
```

### Step 4: Verify Deployment

1. Check application status:
```bash
pm2 status
```

2. Test health endpoints:
```bash
curl http://localhost:8080/health
curl http://localhost:8080/health/ready
curl http://localhost:8080/health/live
```

3. Check logs:
```bash
pm2 logs tableserve-api
```

## 🔍 Health Check Endpoints

The application provides several health check endpoints:

- `GET /health` - Comprehensive health check with service status
- `GET /health/ready` - Readiness probe for load balancers
- `GET /health/live` - Liveness probe for container orchestration

## 📊 Monitoring

### PM2 Monitoring

```bash
# View real-time monitoring
pm2 monit

# View logs
pm2 logs tableserve-api

# Restart application
pm2 restart tableserve-api

# Stop application
pm2 stop tableserve-api
```

### Log Files

Logs are stored in the `logs/` directory:
- `combined.log` - All application logs
- `error.log` - Error logs only
- `http.log` - HTTP request logs (if enabled)
- `auth.log` - Authentication events (if enabled)
- `payment.log` - Payment events (if enabled)

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env.production` to version control
- Use strong, unique secrets for JWT tokens
- Rotate secrets regularly

### 2. Database Security
- Use MongoDB Atlas with IP whitelisting
- Enable authentication and authorization
- Use encrypted connections (SSL/TLS)

### 3. API Security
- CORS configured for production domains only
- Rate limiting enabled
- Input validation on all endpoints
- Secure headers via Helmet

### 4. Email Security
- Use app passwords for Gmail
- Validate email addresses
- Rate limit email sending

## 🚨 Troubleshooting

### Common Issues

1. **Application won't start**
   - Check environment variables with validation script
   - Verify database connection
   - Check PM2 logs: `pm2 logs tableserve-api`

2. **Database connection issues**
   - Verify MongoDB URI format
   - Check network connectivity
   - Ensure IP is whitelisted in MongoDB Atlas

3. **Email service not working**
   - Verify Gmail app password (16 characters)
   - Check SMTP configuration
   - Test email service: `node -e "require('./src/services/emailOTPService').testConfiguration()"`

4. **High memory usage**
   - Check for memory leaks in logs
   - Adjust PM2 memory restart limit
   - Monitor with `pm2 monit`

### Performance Issues

1. **Slow response times**
   - Check database query performance
   - Review rate limiting settings
   - Monitor with `pm2 monit`

2. **High CPU usage**
   - Check for infinite loops in logs
   - Review clustering configuration
   - Monitor process count

## 📋 Maintenance

### Regular Tasks

1. **Log Rotation**
   - Logs are automatically rotated if configured
   - Manual cleanup: `pm2 flush`

2. **Security Updates**
   - Regularly update dependencies: `npm audit`
   - Update Node.js version as needed

3. **Database Maintenance**
   - Monitor database performance
   - Review and optimize indexes
   - Backup database regularly

4. **SSL Certificate Renewal**
   - Monitor certificate expiration
   - Automate renewal process

## 🆘 Emergency Procedures

### Quick Rollback
```bash
pm2 stop tableserve-api
# Deploy previous version
pm2 start tableserve-api
```

### Emergency Shutdown
```bash
pm2 stop all
```

### View Critical Logs
```bash
pm2 logs tableserve-api --lines 100 | grep ERROR
```

## 📞 Support

For deployment issues:
1. Check this guide first
2. Review application logs
3. Run environment validation script
4. Check health endpoints

Remember to never share production credentials or sensitive information when seeking support.

---

**Last Updated:** 2024-01-XX  
**Version:** 1.0.0
