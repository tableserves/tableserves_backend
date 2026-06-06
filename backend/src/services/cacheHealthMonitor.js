/**
 * Cache Health Monitor
 * Monitors Redis connection status and cache system performance
 */

const { logger } = require('../utils/logger');
const cacheConfig = require('../config/cacheConfig');

class CacheHealthMonitor {
  constructor() {
    this.config = cacheConfig.getMonitoringConfig();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    // Health status tracking
    this.status = {
      redis: {
        connected: false,
        lastConnected: null,
        connectionAttempts: 0,
        consecutiveFailures: 0,
        latency: null,
        lastError: null,
        circuitBreakerOpen: false
      },
      fallback: {
        active: false,
        type: null,
        size: 0,
        entries: 0,
        hitRate: 0,
        lastUsed: null
      },
      overall: {
        status: 'unknown',
        timestamp: new Date().toISOString(),
        uptime: 0,
        startTime: Date.now()
      }
    };

    // Performance metrics
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        avgLatency: 0,
        lastMinute: []
      },
      errors: {
        total: 0,
        byType: {},
        lastError: null,
        errorRate: 0
      },
      performance: {
        peakLatency: 0,
        avgLatency: 0,
        throughput: 0,
        lastMeasurement: Date.now()
      }
    };

    // Event listeners
    this.listeners = new Map();
    
    if (this.config.enabled) {
      this.startMonitoring();
      logger.info('Cache health monitor initialized', {
        interval: this.config.metricsInterval,
        alertThresholds: this.config.alertThresholds
      });
    }
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.status.overall.startTime = Date.now();

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlertConditions();
      this.cleanupOldMetrics();
    }, this.config.metricsInterval);

    logger.info('Cache health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Cache health monitoring stopped');
  }

  /**
   * Update Redis connection status
   */
  updateRedisStatus(connected, error = null, latency = null) {
    const now = Date.now();
    const wasConnected = this.status.redis.connected;

    this.status.redis.connected = connected;
    this.status.redis.latency = latency;

    if (connected) {
      this.status.redis.lastConnected = new Date().toISOString();
      this.status.redis.consecutiveFailures = 0;
      this.status.redis.lastError = null;
      this.status.redis.circuitBreakerOpen = false;

      if (!wasConnected) {
        logger.info('Redis connection restored', { latency });
        this.emit('redis:connected', { latency, timestamp: now });
      }
    } else {
      this.status.redis.connectionAttempts++;
      this.status.redis.consecutiveFailures++;
      this.status.redis.lastError = error ? error.message : null;

      // Check circuit breaker threshold
      if (this.status.redis.consecutiveFailures >= cacheConfig.getRedisConfig()?.circuitBreakerThreshold) {
        this.status.redis.circuitBreakerOpen = true;
      }

      if (wasConnected) {
        logger.warn('Redis connection lost', { error: error?.message });
        this.emit('redis:disconnected', { error: error?.message, timestamp: now });
      }
    }

    this.updateOverallStatus();
  }

  /**
   * Update fallback cache status
   */
  updateFallbackStatus(active, type = null, stats = {}) {
    const wasActive = this.status.fallback.active;

    this.status.fallback.active = active;
    this.status.fallback.type = type;
    this.status.fallback.size = stats.size || 0;
    this.status.fallback.entries = stats.entries || 0;
    this.status.fallback.hitRate = stats.hitRate || 0;

    if (active) {
      this.status.fallback.lastUsed = new Date().toISOString();

      if (!wasActive) {
        logger.info('Fallback cache activated', { type, stats });
        this.emit('fallback:activated', { type, stats, timestamp: Date.now() });
      }
    } else if (wasActive) {
      logger.info('Fallback cache deactivated', { type });
      this.emit('fallback:deactivated', { type, timestamp: Date.now() });
    }

    this.updateOverallStatus();
  }

  /**
   * Record cache operation metrics
   */
  recordOperation(operation, success, latency, error = null) {
    const now = Date.now();

    // Update request metrics
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
      this.metrics.errors.total++;

      if (error) {
        const errorType = error.code || error.name || 'unknown';
        this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
        this.metrics.errors.lastError = {
          message: error.message,
          type: errorType,
          timestamp: now
        };
      }
    }

    // Update latency metrics
    if (latency !== null && latency !== undefined) {
      this.metrics.performance.peakLatency = Math.max(this.metrics.performance.peakLatency, latency);
      
      // Calculate rolling average latency
      const totalLatency = this.metrics.performance.avgLatency * (this.metrics.requests.total - 1) + latency;
      this.metrics.performance.avgLatency = totalLatency / this.metrics.requests.total;
    }

    // Add to last minute tracking
    this.metrics.requests.lastMinute.push({
      timestamp: now,
      success,
      latency,
      operation
    });

    // Calculate error rate
    this.metrics.errors.errorRate = this.metrics.requests.total > 0 
      ? this.metrics.requests.failed / this.metrics.requests.total 
      : 0;
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    this.status.overall.uptime = Date.now() - this.status.overall.startTime;
    this.status.overall.timestamp = new Date().toISOString();

    return {
      ...this.status,
      metrics: this.getMetricsSummary()
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Calculate last minute metrics
    const lastMinuteRequests = this.metrics.requests.lastMinute.filter(
      req => req.timestamp > oneMinuteAgo
    );

    const lastMinuteSuccessful = lastMinuteRequests.filter(req => req.success).length;
    const lastMinuteThroughput = lastMinuteRequests.length;
    const lastMinuteErrorRate = lastMinuteRequests.length > 0 
      ? (lastMinuteRequests.length - lastMinuteSuccessful) / lastMinuteRequests.length 
      : 0;

    const lastMinuteLatencies = lastMinuteRequests
      .filter(req => req.latency !== null)
      .map(req => req.latency);
    
    const lastMinuteAvgLatency = lastMinuteLatencies.length > 0
      ? lastMinuteLatencies.reduce((sum, lat) => sum + lat, 0) / lastMinuteLatencies.length
      : 0;

    return {
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        successRate: this.metrics.requests.total > 0 
          ? this.metrics.requests.successful / this.metrics.requests.total 
          : 0
      },
      errors: {
        total: this.metrics.errors.total,
        rate: this.metrics.errors.errorRate,
        byType: { ...this.metrics.errors.byType },
        lastError: this.metrics.errors.lastError
      },
      performance: {
        avgLatency: Math.round(this.metrics.performance.avgLatency),
        peakLatency: this.metrics.performance.peakLatency,
        throughput: lastMinuteThroughput,
        lastMinute: {
          requests: lastMinuteThroughput,
          avgLatency: Math.round(lastMinuteAvgLatency),
          errorRate: Math.round(lastMinuteErrorRate * 100) / 100
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update overall system status
   */
  updateOverallStatus() {
    let status = 'healthy';

    // Check Redis status
    if (!this.status.redis.connected && cacheConfig.isRedisEnabled()) {
      if (this.status.fallback.active) {
        status = 'degraded'; // Redis down but fallback working
      } else {
        status = 'critical'; // Redis down and no fallback
      }
    }

    // Check error rates
    if (this.metrics.errors.errorRate > this.config.alertThresholds.errorRate) {
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check latency
    if (this.metrics.performance.avgLatency > this.config.alertThresholds.latency) {
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check fallback memory usage
    if (this.status.fallback.active && this.status.fallback.type === 'memory') {
      const memoryConfig = cacheConfig.getMemoryCacheConfig();
      const memoryUsage = memoryConfig.maxSize > 0 ? this.status.fallback.size / memoryConfig.maxSize : 0;
      
      if (memoryUsage > this.config.alertThresholds.memoryUsage) {
        status = status === 'healthy' ? 'degraded' : status;
      }
    }

    const oldStatus = this.status.overall.status;
    this.status.overall.status = status;

    if (oldStatus !== status) {
      logger.info('Cache system status changed', { from: oldStatus, to: status });
      this.emit('status:changed', { from: oldStatus, to: status, timestamp: Date.now() });
    }
  }

  /**
   * Check alert conditions and emit alerts
   */
  checkAlertConditions() {
    const metrics = this.getMetricsSummary();
    const thresholds = this.config.alertThresholds;

    // High error rate alert
    if (metrics.errors.rate > thresholds.errorRate) {
      this.emit('alert:high_error_rate', {
        current: metrics.errors.rate,
        threshold: thresholds.errorRate,
        timestamp: Date.now()
      });
    }

    // High latency alert
    if (metrics.performance.avgLatency > thresholds.latency) {
      this.emit('alert:high_latency', {
        current: metrics.performance.avgLatency,
        threshold: thresholds.latency,
        timestamp: Date.now()
      });
    }

    // Memory usage alert (for fallback cache)
    if (this.status.fallback.active && this.status.fallback.type === 'memory') {
      const memoryConfig = cacheConfig.getMemoryCacheConfig();
      const memoryUsage = memoryConfig.maxSize > 0 ? this.status.fallback.size / memoryConfig.maxSize : 0;
      
      if (memoryUsage > thresholds.memoryUsage) {
        this.emit('alert:high_memory_usage', {
          current: memoryUsage,
          threshold: thresholds.memoryUsage,
          timestamp: Date.now()
        });
      }
    }

    // Circuit breaker alert
    if (this.status.redis.circuitBreakerOpen) {
      this.emit('alert:circuit_breaker_open', {
        consecutiveFailures: this.status.redis.consecutiveFailures,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000; // 5 minutes

    // Keep only last 5 minutes of request data
    this.metrics.requests.lastMinute = this.metrics.requests.lastMinute.filter(
      req => req.timestamp > fiveMinutesAgo
    );
  }

  /**
   * Collect current metrics
   */
  collectMetrics() {
    // This method can be extended to collect additional metrics
    // from external sources or perform periodic health checks
    
    // Update throughput calculation
    const now = Date.now();
    const timeDiff = now - this.metrics.performance.lastMeasurement;
    
    if (timeDiff > 0) {
      const recentRequests = this.metrics.requests.lastMinute.filter(
        req => req.timestamp > now - 60000
      );
      this.metrics.performance.throughput = recentRequests.length;
      this.metrics.performance.lastMeasurement = now;
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        avgLatency: 0,
        lastMinute: []
      },
      errors: {
        total: 0,
        byType: {},
        lastError: null,
        errorRate: 0
      },
      performance: {
        peakLatency: 0,
        avgLatency: 0,
        throughput: 0,
        lastMeasurement: Date.now()
      }
    };

    logger.info('Cache health metrics reset');
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('Error in health monitor event listener', { event, error: error.message });
        }
      });
    }

    // Log important events
    if (event.startsWith('alert:') || event.includes('connected') || event.includes('status')) {
      logger.info(`Cache health event: ${event}`, data);
    }
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics() {
    return {
      monitoring: {
        enabled: this.config.enabled,
        isRunning: this.isMonitoring,
        interval: this.config.metricsInterval,
        uptime: Date.now() - this.status.overall.startTime
      },
      configuration: cacheConfig.getConfigSummary(),
      status: this.getHealthStatus(),
      alerts: {
        thresholds: this.config.alertThresholds,
        activeListeners: Array.from(this.listeners.keys())
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown health monitor
   */
  shutdown() {
    this.stopMonitoring();
    this.listeners.clear();
    logger.info('Cache health monitor shutdown');
  }
}

module.exports = CacheHealthMonitor;