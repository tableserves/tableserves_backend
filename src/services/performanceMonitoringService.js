const os = require('os');
const mongoose = require('mongoose');
const orderCacheService = require('./orderCacheService');
const { logger } = require('../utils/logger');

/**
 * Performance Monitoring Service for Multi-Shop Zone Orders
 * 
 * Monitors system performance, database queries, cache efficiency,
 * and provides optimization recommendations
 */
class PerformanceMonitoringService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      queries: new Map(),
      cache: new Map(),
      system: new Map()
    };
    
    this.thresholds = {
      queryTime: 1000, // 1 second
      requestTime: 2000, // 2 seconds
      memoryUsage: 80, // 80%
      cacheHitRate: 70 // 70%
    };

    this.startTime = Date.now();
    this.enableMetrics = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
  }

  /**
   * Record request performance metrics
   */
  recordRequest(endpoint, method, duration, statusCode) {
    if (!this.enableMetrics) return;

    const key = `${method}:${endpoint}`;
    const existing = this.metrics.requests.get(key) || {
      count: 0,
      totalDuration: 0,
      errors: 0,
      minDuration: Infinity,
      maxDuration: 0
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    
    if (statusCode >= 400) {
      existing.errors++;
    }

    existing.avgDuration = existing.totalDuration / existing.count;
    existing.errorRate = (existing.errors / existing.count) * 100;

    this.metrics.requests.set(key, existing);

    // Alert on slow requests
    if (duration > this.thresholds.requestTime) {
      logger.warn('Slow request detected', {
        endpoint,
        method,
        duration,
        threshold: this.thresholds.requestTime
      });
    }
  }

  /**
   * Record database query performance
   */
  recordQuery(collection, operation, duration, resultCount = 0) {
    if (!this.enableMetrics) return;

    const key = `${collection}:${operation}`;
    const existing = this.metrics.queries.get(key) || {
      count: 0,
      totalDuration: 0,
      totalResults: 0,
      minDuration: Infinity,
      maxDuration: 0
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.totalResults += resultCount;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.avgResults = existing.totalResults / existing.count;

    this.metrics.queries.set(key, existing);

    // Alert on slow queries
    if (duration > this.thresholds.queryTime) {
      logger.warn('Slow query detected', {
        collection,
        operation,
        duration,
        resultCount,
        threshold: this.thresholds.queryTime
      });
    }
  }

  /**
   * Record cache performance metrics
   */
  recordCacheAccess(operation, hit, duration = 0) {
    if (!this.enableMetrics) return;

    const key = `cache:${operation}`;
    const existing = this.metrics.cache.get(key) || {
      hits: 0,
      misses: 0,
      totalDuration: 0,
      count: 0
    };

    existing.count++;
    existing.totalDuration += duration;

    if (hit) {
      existing.hits++;
    } else {
      existing.misses++;
    }

    existing.hitRate = (existing.hits / existing.count) * 100;
    existing.avgDuration = existing.totalDuration / existing.count;

    this.metrics.cache.set(key, existing);

    // Alert on low cache hit rate
    if (existing.count > 10 && existing.hitRate < this.thresholds.cacheHitRate) {
      logger.warn('Low cache hit rate detected', {
        operation,
        hitRate: existing.hitRate,
        threshold: this.thresholds.cacheHitRate
      });
    }
  }

  /**
   * Monitor system resources
   */
  async recordSystemMetrics() {
    if (!this.enableMetrics) return;

    try {
      const memoryUsage = process.memoryUsage();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem()
      };
      
      const cpuUsage = process.cpuUsage();
      const loadAverage = os.loadavg();

      // Database connection status
      const dbStats = await this.getDatabaseStats();
      
      // Cache statistics
      const cacheStats = await orderCacheService.getCacheMetrics();

      const systemMetrics = {
        timestamp: new Date().toISOString(),
        memory: {
          heap: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) // %
          },
          system: {
            total: Math.round(systemMemory.total / 1024 / 1024), // MB
            free: Math.round(systemMemory.free / 1024 / 1024), // MB
            usage: Math.round(((systemMemory.total - systemMemory.free) / systemMemory.total) * 100) // %
          }
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          loadAverage: loadAverage
        },
        database: dbStats,
        cache: cacheStats,
        uptime: Math.round((Date.now() - this.startTime) / 1000) // seconds
      };

      this.metrics.system.set('latest', systemMetrics);

      // Alert on high memory usage
      if (systemMetrics.memory.system.usage > this.thresholds.memoryUsage) {
        logger.warn('High memory usage detected', {
          usage: systemMetrics.memory.system.usage,
          threshold: this.thresholds.memoryUsage
        });
      }

      return systemMetrics;

    } catch (error) {
      logger.error('Failed to record system metrics', { error: error.message });
      return null;
    }
  }

  /**
   * Get database performance statistics
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db;
      const admin = db.admin();
      
      const [serverStatus, dbStats] = await Promise.all([
        admin.serverStatus(),
        db.stats()
      ]);

      return {
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0,
          totalCreated: serverStatus.connections?.totalCreated || 0
        },
        operations: {
          insert: serverStatus.opcounters?.insert || 0,
          query: serverStatus.opcounters?.query || 0,
          update: serverStatus.opcounters?.update || 0,
          delete: serverStatus.opcounters?.delete || 0
        },
        storage: {
          dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // MB
          indexSize: Math.round(dbStats.indexSize / 1024 / 1024), // MB
          totalSize: Math.round(dbStats.storageSize / 1024 / 1024) // MB
        },
        performance: {
          avgInsertTime: serverStatus.metrics?.commands?.insert?.total || 0,
          avgQueryTime: serverStatus.metrics?.commands?.find?.total || 0
        }
      };

    } catch (error) {
      logger.error('Failed to get database stats', { error: error.message });
      return { error: 'Unable to retrieve database statistics' };
    }
  }

  /**
   * Generate performance report
   */
  getPerformanceReport() {
    if (!this.enableMetrics) {
      return { message: 'Performance monitoring is disabled' };
    }

    const report = {
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      requests: this.getRequestSummary(),
      queries: this.getQuerySummary(),
      cache: this.getCacheSummary(),
      system: this.metrics.system.get('latest'),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Get request performance summary
   */
  getRequestSummary() {
    const summary = {
      totalEndpoints: this.metrics.requests.size,
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      slowestEndpoints: []
    };

    let totalDuration = 0;

    for (const [endpoint, metrics] of this.metrics.requests.entries()) {
      summary.totalRequests += metrics.count;
      summary.totalErrors += metrics.errors;
      totalDuration += metrics.totalDuration;

      if (metrics.avgDuration > 1000) { // Slower than 1 second
        summary.slowestEndpoints.push({
          endpoint,
          avgDuration: Math.round(metrics.avgDuration),
          count: metrics.count,
          errorRate: Math.round(metrics.errorRate * 100) / 100
        });
      }
    }

    summary.avgResponseTime = summary.totalRequests > 0 
      ? Math.round(totalDuration / summary.totalRequests) 
      : 0;
    summary.errorRate = summary.totalRequests > 0 
      ? Math.round((summary.totalErrors / summary.totalRequests) * 100 * 100) / 100 
      : 0;

    summary.slowestEndpoints.sort((a, b) => b.avgDuration - a.avgDuration);
    summary.slowestEndpoints = summary.slowestEndpoints.slice(0, 5);

    return summary;
  }

  /**
   * Get query performance summary
   */
  getQuerySummary() {
    const summary = {
      totalCollections: this.metrics.queries.size,
      totalQueries: 0,
      avgQueryTime: 0,
      slowestQueries: []
    };

    let totalDuration = 0;

    for (const [operation, metrics] of this.metrics.queries.entries()) {
      summary.totalQueries += metrics.count;
      totalDuration += metrics.totalDuration;

      if (metrics.avgDuration > 500) { // Slower than 500ms
        summary.slowestQueries.push({
          operation,
          avgDuration: Math.round(metrics.avgDuration),
          count: metrics.count,
          avgResults: Math.round(metrics.avgResults)
        });
      }
    }

    summary.avgQueryTime = summary.totalQueries > 0 
      ? Math.round(totalDuration / summary.totalQueries) 
      : 0;

    summary.slowestQueries.sort((a, b) => b.avgDuration - a.avgDuration);
    summary.slowestQueries = summary.slowestQueries.slice(0, 5);

    return summary;
  }

  /**
   * Get cache performance summary
   */
  getCacheSummary() {
    const summary = {
      operations: this.metrics.cache.size,
      totalAccesses: 0,
      totalHits: 0,
      overallHitRate: 0,
      performanceByOperation: []
    };

    for (const [operation, metrics] of this.metrics.cache.entries()) {
      summary.totalAccesses += metrics.count;
      summary.totalHits += metrics.hits;

      summary.performanceByOperation.push({
        operation,
        hitRate: Math.round(metrics.hitRate * 100) / 100,
        count: metrics.count,
        avgDuration: Math.round(metrics.avgDuration * 100) / 100
      });
    }

    summary.overallHitRate = summary.totalAccesses > 0 
      ? Math.round((summary.totalHits / summary.totalAccesses) * 100 * 100) / 100
      : 0;

    summary.performanceByOperation.sort((a, b) => a.hitRate - b.hitRate);

    return summary;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const requests = this.getRequestSummary();
    const queries = this.getQuerySummary();
    const cache = this.getCacheSummary();

    // Request optimization recommendations
    if (requests.avgResponseTime > this.thresholds.requestTime) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: `Average response time (${requests.avgResponseTime}ms) exceeds threshold`,
        suggestion: 'Consider implementing request caching or query optimization'
      });
    }

    if (requests.errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        message: `High error rate (${requests.errorRate}%) detected`,
        suggestion: 'Review error logs and implement better error handling'
      });
    }

    // Query optimization recommendations
    if (queries.avgQueryTime > this.thresholds.queryTime) {
      recommendations.push({
        type: 'database',
        severity: 'medium',
        message: `Average query time (${queries.avgQueryTime}ms) is high`,
        suggestion: 'Consider adding database indexes or optimizing queries'
      });
    }

    // Cache optimization recommendations
    if (cache.overallHitRate < this.thresholds.cacheHitRate) {
      recommendations.push({
        type: 'cache',
        severity: 'medium',
        message: `Cache hit rate (${cache.overallHitRate}%) is below optimal`,
        suggestion: 'Review caching strategy and TTL settings'
      });
    }

    // System recommendations
    const systemMetrics = this.metrics.system.get('latest');
    if (systemMetrics?.memory?.system?.usage > this.thresholds.memoryUsage) {
      recommendations.push({
        type: 'system',
        severity: 'high',
        message: `Memory usage (${systemMetrics.memory.system.usage}%) is high`,
        suggestion: 'Consider scaling up or optimizing memory usage'
      });
    }

    return recommendations;
  }

  /**
   * Reset all metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics.requests.clear();
    this.metrics.queries.clear();
    this.metrics.cache.clear();
    this.metrics.system.clear();
    this.startTime = Date.now();
    
    logger.info('Performance metrics reset');
  }

  /**
   * Start periodic system monitoring
   */
  startMonitoring(intervalMs = 60000) { // Default: 1 minute
    if (!this.enableMetrics) return;

    this.monitoringInterval = setInterval(async () => {
      await this.recordSystemMetrics();
    }, intervalMs);

    logger.info('Performance monitoring started', { interval: intervalMs });
  }

  /**
   * Stop periodic monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Performance monitoring stopped');
    }
  }
}

module.exports = new PerformanceMonitoringService();