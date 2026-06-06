const os = require('os');
const { performance } = require('perf_hooks');
const logger = require('../utils/logger');
const { cacheService } = require('./cacheService');
const { databaseManager } = require('../config/database');

/**
 * Production Monitoring Service
 * Comprehensive monitoring, health checks, and performance tracking
 */
class MonitoringService {
  constructor() {
    this.startTime = Date.now();
    this.healthChecks = new Map();
    this.metrics = [];
    this.alerts = [];
    this.systemInfo = this.getSystemInfo();
  }

  /**
   * Initialize monitoring service
   */
  async init() {
    try {
      // Register default health checks
      this.registerHealthCheck('database', this.checkDatabaseHealth);
      this.registerHealthCheck('cache', this.checkCacheHealth);
      this.registerHealthCheck('memory', this.checkMemoryUsage);
      
      // Start periodic monitoring
      this.startPeriodicMonitoring();
      
      logger.info('Monitoring service initialized');
    } catch (error) {
      logger.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }
  
  /**
   * Register a health check
   */
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, {
      name,
      check: checkFunction,
      lastRun: null,
      lastResult: null,
      errors: 0
    });
  }
  
  /**
   * Start periodic monitoring
   */
  startPeriodicMonitoring() {
    // Health checks every 30 seconds
    setInterval(() => {
      this.runHealthChecks();
    }, 30000);
    
    // Metrics collection every 10 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 10000);
    
    // Alert checking every minute
    setInterval(() => {
      this.checkAlerts();
    }, 60000);
    
    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 3600000);
  }
  
  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const startTime = performance.now();
        const result = await healthCheck.check();
        const duration = performance.now() - startTime;
        
        healthCheck.lastRun = Date.now();
        healthCheck.lastResult = {
          healthy: result.healthy,
          message: result.message,
          duration,
          timestamp: new Date().toISOString(),
          metadata: result.metadata || {}
        };
        
        if (!result.healthy) {
          healthCheck.errors++;
          logger.warn(`Health check failed: ${name}`, {
            message: result.message,
            duration,
            metadata: result.metadata
          });
        } else {
          // Reset error count on successful check
          healthCheck.errors = 0;
        }
        
        results[name] = healthCheck.lastResult;
      } catch (error) {
        logger.error(`Health check error (${name}):`, error);
        healthCheck.errors++;
        healthCheck.lastResult = {
          healthy: false,
          message: `Error: ${error.message}`,
          timestamp: new Date().toISOString(),
          error: error.toString()
        };
        results[name] = healthCheck.lastResult;
      }
    }
    
    return results;
  }
  
  /**
   * Collect system and application metrics
   */
  collectMetrics() {
    try {
      const timestamp = Date.now();
      const memoryUsage = process.memoryUsage();
      
      const metrics = {
        timestamp,
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        },
        cpu: {
          load: os.loadavg(),
          uptime: os.uptime(),
          cpus: os.cpus().length
        },
        process: {
          uptime: process.uptime(),
          memory: memoryUsage,
          cpu: process.cpuUsage()
        }
      };
      
      this.metrics.push(metrics);
      
      // Keep only last 24 hours of metrics (assuming collection every 10s = 8640 data points)
      if (this.metrics.length > 8640) {
        this.metrics = this.metrics.slice(-8640);
      }
      
      return metrics;
    } catch (error) {
      logger.error('Error collecting metrics:', error);
      throw error;
    }
  }
  
  /**
   * Check for any alert conditions
   */
  checkAlerts() {
    const alerts = [];
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 0.9; // 90% memory usage
    
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > memoryThreshold) {
      alerts.push({
        type: 'high_memory',
        message: `High memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB used of ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for failed health checks
    for (const [name, healthCheck] of this.healthChecks) {
      if (healthCheck.errors > 3) {
        alerts.push({
          type: 'health_check_failure',
          name,
          message: `Health check '${name}' has failed ${healthCheck.errors} times`,
          severity: 'critical',
          timestamp: new Date().toISOString(),
          lastResult: healthCheck.lastResult
        });
      }
    }
    
    // Add new alerts
    alerts.forEach(alert => {
      this.alerts.push(alert);
      logger.warn(`Alert: ${alert.message}`, alert);
    });
    
    return alerts;
  }
  
  /**
   * Clean up old metrics and alerts
   */
  cleanOldMetrics() {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Keep only metrics from the last week
    this.metrics = this.metrics.filter(m => m.timestamp > oneWeekAgo);
    
    // Keep only unresolved alerts or those from the last 24 hours
    this.alerts = this.alerts.filter(
      a => !a.resolved || new Date(a.timestamp) > new Date(now - 24 * 60 * 60 * 1000)
    );
  }
  
  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus(),
      networkInterfaces: os.networkInterfaces(),
      nodeVersion: process.version,
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development'
    };
  }
  
  // Default health checks
  async checkDatabaseHealth() {
    try {
      await databaseManager.authenticate();
      return { healthy: true, message: 'Database connection is healthy' };
    } catch (error) {
      return { 
        healthy: false, 
        message: `Database connection error: ${error.message}`,
        metadata: { error: error.toString() }
      };
    }
  }
  
  async checkCacheHealth() {
    try {
      await cacheService.ping();
      return { healthy: true, message: 'Cache service is healthy' };
    } catch (error) {
      return { 
        healthy: false, 
        message: `Cache service error: ${error.message}`,
        metadata: { error: error.toString() }
      };
    }
  }
  
  async checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const used = memoryUsage.heapUsed / 1024 / 1024;
    const total = memoryUsage.heapTotal / 1024 / 1024;
    const percent = (used / total) * 100;
    
    return {
      healthy: percent < 90,
      message: `Memory usage: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB (${percent.toFixed(1)}%)`,
      metadata: {
        usedMB: used,
        totalMB: total,
        percentUsed: percent
      }
    };
  }
  
  /**
   * Get current status
   */
  getStatus() {
    const healthChecks = {};
    for (const [name, check] of this.healthChecks) {
      healthChecks[name] = check.lastResult;
    }
    
    return {
      status: 'operational',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      healthChecks,
      metrics: this.metrics.slice(-1)[0], // Latest metrics
      alerts: this.alerts.filter(a => !a.resolved),
      system: this.systemInfo
    };
  }
}

// Export singleton instance
const monitoringService = new MonitoringService();
module.exports = { monitoringService };
