const express = require('express');
const mongoose = require('mongoose');
const { checkDatabaseConnection } = require('../config/database');
const { logger, checkLoggerHealth } = require('../utils/logger');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const emailOTPService = require('../services/emailOTPService');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

/**
 * @route   GET /health
 * @desc    Enhanced health check endpoint for production
 * @access  Public
 */
router.get('/', wrapAsync(async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };

  try {
    // Check database connection with enhanced details
    try {
      if (mongoose.connection.readyState === 1) {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        const responseTime = Date.now() - start;

        healthCheck.services.database = {
          status: 'healthy',
          connection: 'connected',
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          responseTime: `${responseTime}ms`
        };
      } else {
        healthCheck.services.database = {
          status: 'unhealthy',
          connection: 'disconnected',
          readyState: mongoose.connection.readyState
        };
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.services.database = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.status = 'degraded';
    }

    // Check email service
    try {
      const emailValidation = await emailOTPService.validateConfiguration();
      healthCheck.services.email = {
        status: emailValidation.success ? 'healthy' : 'degraded',
        configured: emailValidation.success
      };
      if (!emailValidation.success && process.env.NODE_ENV === 'production') {
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.services.email = {
        status: 'unhealthy',
        error: error.message
      };
      if (process.env.NODE_ENV === 'production') {
        healthCheck.status = 'degraded';
      }
    }

    // Check logger health
    const loggerHealth = checkLoggerHealth();
    healthCheck.services.logger = loggerHealth;
    if (loggerHealth.status !== 'healthy') {
      healthCheck.status = 'degraded';
    }

    // Set appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;

    logger.info('Health check completed', {
      status: healthCheck.status,
      services: Object.keys(healthCheck.services)
    });

    return res.status(statusCode).json({
      success: healthCheck.status === 'healthy',
      data: healthCheck
    });
  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.error = error.message;
    healthCheck.database.status = 'error';
    healthCheck.database.message = 'Failed to check database connection';
    
    logger.error('Health check error', { error: error.stack });
    return res.status(503).json(healthCheck);
  }
}, 'healthCheck'));

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for Kubernetes/Docker
 * @access  Public
 */
router.get('/ready', wrapAsync(async (req, res) => {
  try {
    // Check if all critical services are ready
    const isDbReady = mongoose.connection.readyState === 1;

    if (isDbReady) {
      res.status(200).json({
        success: true,
        status: 'ready',
        message: 'Service is ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'not_ready',
        message: 'Service is not ready - database not connected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not_ready',
      message: 'Readiness check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}, 'readinessCheck'));

/**
 * @route   GET /health/live
 * @desc    Liveness probe for Kubernetes/Docker
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    message: 'Service is alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  });
});

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;
