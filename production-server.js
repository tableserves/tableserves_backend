#!/usr/bin/env node

/**
 * TableServe Production Server
 * High-performance clustered server with monitoring and health checks
 */

const ClusterManager = require('./src/server/cluster');
const { logger } = require('./src/utils/logger');

// Load environment variables
require('dotenv').config();

// Production configuration
const config = {
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'production',
  workers: parseInt(process.env.CLUSTER_WORKERS) || undefined,
  maxRestarts: parseInt(process.env.MAX_WORKER_RESTARTS) || 5,
  gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT) || 30000,
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  memoryLimit: parseInt(process.env.MEMORY_LIMIT_MB) || 512
};

// Enhanced environment validation for production
function validateEnvironment() {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'SMTP_USER',
    'SMTP_PASS',
    'FRONTEND_URL',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ];

  const optional = [
    'REDIS_URL',
    'ADMIN_PANEL_URL',
    'API_BASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  const missingOptional = optional.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    console.error('❌ CRITICAL: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these variables in your .env.production file');
    process.exit(1);
  }

  if (missingOptional.length > 0) {
    logger.warn('Missing optional environment variables', { missingOptional });
    console.warn('⚠️  WARNING: Missing optional environment variables:');
    missingOptional.forEach(key => console.warn(`   - ${key}`));
  }

  // Validate JWT secrets are strong enough
  if (process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET is too short. Must be at least 32 characters.');
    process.exit(1);
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    logger.error('JWT_REFRESH_SECRET is too short. Must be at least 32 characters.');
    process.exit(1);
  }

  // Validate email configuration
  if (process.env.SMTP_HOST === 'smtp.gmail.com' && process.env.SMTP_PASS.length !== 16) {
    logger.error('Gmail app password must be exactly 16 characters.');
    process.exit(1);
  }

  logger.info('✅ Environment validation passed');
  console.log('✅ All required environment variables are set');
}

// Set up production optimizations
function setupProductionOptimizations() {
  // Set NODE_ENV if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }
  
  // Optimize garbage collection
  if (process.env.NODE_ENV === 'production') {
    // Enable optimized GC settings
    process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';
    
    // Memory optimization flags
    const nodeOptions = [
      '--max-old-space-size=512',
      '--gc-interval=100',
      '--optimize-for-size'
    ];
    
    if (!process.env.NODE_OPTIONS) {
      process.env.NODE_OPTIONS = nodeOptions.join(' ');
    }
  }
  
  // Set maximum listeners to handle clustering
  require('events').EventEmitter.defaultMaxListeners = 20;
  
  logger.info('Production optimizations applied', {
    nodeEnv: process.env.NODE_ENV,
    nodeOptions: process.env.NODE_OPTIONS,
    uvThreadPoolSize: process.env.UV_THREADPOOL_SIZE
  });
}

// Performance monitoring
function setupPerformanceMonitoring() {
  const monitoring = {
    startTime: Date.now(),
    requests: 0,
    errors: 0,
    avgResponseTime: 0,
    peakMemory: 0
  };
  
  // Monitor memory usage
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    
    if (memMB > monitoring.peakMemory) {
      monitoring.peakMemory = memMB;
    }
    
    // Log memory warning if approaching limit
    if (memMB > config.memoryLimit * 0.8) {
      logger.warn('High memory usage detected', {
        currentMB: memMB,
        limitMB: config.memoryLimit,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      });
    }
    
    // Force restart if memory limit exceeded
    if (memMB > config.memoryLimit) {
      logger.error('Memory limit exceeded, forcing restart', {
        currentMB: memMB,
        limitMB: config.memoryLimit
      });
      process.exit(1);
    }
  }, 60000); // Check every minute
  
  // Log performance metrics periodically
  setInterval(() => {
    const uptime = Date.now() - monitoring.startTime;
    logger.info('Performance metrics', {
      uptimeMinutes: Math.round(uptime / 60000),
      totalRequests: monitoring.requests,
      totalErrors: monitoring.errors,
      errorRate: monitoring.requests > 0 ? (monitoring.errors / monitoring.requests * 100).toFixed(2) + '%' : '0%',
      avgResponseTimeMs: monitoring.avgResponseTime,
      peakMemoryMB: monitoring.peakMemory,
      currentMemoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
    });
  }, 300000); // Every 5 minutes
}

// Health check endpoint for load balancers
function setupHealthEndpoint() {
  const express = require('express');
  const healthApp = express();
  const healthPort = parseInt(process.env.HEALTH_PORT) || (config.port + 1000);
  
  healthApp.get('/health', (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(health);
  });
  
  healthApp.get('/metrics', (req, res) => {
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      system: {
        loadAverage: require('os').loadavg(),
        freeMem: require('os').freemem(),
        totalMem: require('os').totalmem(),
        platform: require('os').platform(),
        arch: require('os').arch()
      }
    };
    
    res.json(metrics);
  });
  
  healthApp.listen(healthPort, () => {
    logger.info(`Health check server listening on port ${healthPort}`);
  });
}

// Graceful shutdown handler
function setupGracefulShutdown() {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}, initiating graceful shutdown`);
    
    // Close health server
    if (global.healthServer) {
      global.healthServer.close();
    }
    
    // Exit process
    setTimeout(() => {
      logger.info('Graceful shutdown completed');
      process.exit(0);
    }, 1000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions in production
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    process.exit(1);
  });
}

// Main startup function
async function start() {
  try {
    logger.info('Starting TableServe Production Server', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      config
    });
    
    // Validate environment
    validateEnvironment();
    
    // Setup production optimizations
    setupProductionOptimizations();
    
    // Setup monitoring
    setupPerformanceMonitoring();
    
    // Setup health endpoints
    if (process.env.ENABLE_HEALTH_SERVER !== 'false') {
      setupHealthEndpoint();
    }
    
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Start cluster manager
    const clusterManager = new ClusterManager({
      workers: config.workers,
      maxRestarts: config.maxRestarts,
      gracefulShutdownTimeout: config.gracefulShutdownTimeout,
      healthCheckInterval: config.healthCheckInterval
    });
    
    clusterManager.start();
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  start();
}

module.exports = { start };