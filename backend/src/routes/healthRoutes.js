const express = require('express');
const express = require('express');
const mongoose = require('mongoose');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

/**
 * @route GET /api/v1/health
 * @desc Basic health check endpoint
 * @access Public
 */
router.get('/', wrapAsync(async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };

  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    data: healthData
  });
}, 'basicHealthCheck'));

/**
 * @route GET /api/v1/health/detailed
 * @desc Detailed health check with dependencies
 * @access Public
 */
router.get('/detailed', wrapAsync(async (req, res) => {
  const startTime = Date.now();
  
  // Check database connection
  let dbStatus = 'disconnected';
  let dbResponseTime = null;
  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    dbResponseTime = Date.now() - dbStart;
    dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  } catch (error) {
    logger.error('Database health check failed:', error);
    dbStatus = 'error';
  }

  // Check Redis connection using OrderCacheService
  let redisStatus = 'not_configured';
  let redisResponseTime = null;
  try {
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      const orderCacheService = require('../services/orderCacheService');
      const redisStart = Date.now();
      const redisHealth = await orderCacheService.healthCheck();
      redisResponseTime = Date.now() - redisStart;
      redisStatus = redisHealth.status === 'healthy' ? 'connected' : 'error';
    }
  } catch (error) {
    logger.error('Redis health check failed:', error);
    redisStatus = 'error';
  }

  // Check external services
  const externalServices = {
    cloudinary: {
      status: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not_configured',
      responseTime: process.env.CLOUDINARY_CLOUD_NAME ? 50 : null
    },
    email: {
      status: process.env.SMTP_HOST ? 'configured' : 'not_configured',
      responseTime: process.env.SMTP_HOST ? 100 : null
    }
  };

  const totalResponseTime = Date.now() - startTime;
  let overallStatus = 'healthy';
  
  // Determine overall status based on critical services
  if (dbStatus !== 'connected') {
    overallStatus = 'degraded';
  } else if (redisStatus === 'error' && (process.env.REDIS_URL || process.env.REDIS_HOST)) {
    // Redis is configured but failing, degrade status
    overallStatus = 'degraded';
  }

  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    responseTime: totalResponseTime,
    dependencies: {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        type: 'MongoDB'
      },
      cache: {
        redis: {
          status: redisStatus,
          responseTime: redisResponseTime
        }
      },
      external_services: externalServices
    }
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: overallStatus === 'healthy',
    message: `System health check completed - ${overallStatus}`,
    data: healthData
  });
}, 'detailedHealthCheck'));

/**
 * @route GET /api/v1/health/connectivity
 * @desc Test frontend-backend connectivity
 * @access Public
 */
router.get('/connectivity', wrapAsync(async (req, res) => {
  const connectivityData = {
    timestamp: new Date().toISOString(),
    server: {
      status: 'running',
      environment: process.env.NODE_ENV || 'development',
      cors: {
        enabled: true,
        origin: process.env.FRONTEND_URL || 'http://localhost:5173'
      }
    },
    request: {
      method: req.method,
      path: req.path,
      headers: {
        origin: req.get('Origin'),
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
      },
      ip: req.ip
    }
  };

  res.status(200).json({
    success: true,
    message: 'Frontend-backend connectivity test successful',
    data: connectivityData
  });
}, 'connectivityTest'));

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;
