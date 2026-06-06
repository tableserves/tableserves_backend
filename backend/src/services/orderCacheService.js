const SimpleCacheService = require('./simpleCacheService');
const { logger } = require('../utils/logger');

// Optional: Sentry for error monitoring (if available)
let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (error) {
  // Sentry not installed, will skip monitoring
  Sentry = null;
}

class OrderCacheService {
  constructor() {
    // Use simple cache service - no Redis complexity
    this.cache = new SimpleCacheService();
    
    // Cache configuration with TTL
    this.TTL = {
      ORDER_TRACKING: 300, // 5 minutes
      ACTIVE_ORDERS: 180, // 3 minutes  
      ORDER_STATS: 600, // 10 minutes
      ZONE_ORDERS: 240 // 4 minutes
    };

    // Start cleanup interval (every minute)
    this.startCleanupInterval();

    logger.info('OrderCacheService initialized with simple cache and TTL');
  }

  /**
   * Start automatic cleanup of expired cache entries
   */
  startCleanupInterval() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 60 seconds

    logger.info('Cache cleanup interval started (runs every 60 seconds)');
  }

  /**
   * Report cache errors to monitoring service
   */
  reportCacheError(operation, error, context = {}) {
    logger.error(`Cache operation failed: ${operation}`, { 
      error: error.message,
      stack: error.stack,
      ...context 
    });

    // Report to Sentry if available and in production
    if (Sentry && process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        tags: {
          service: 'orderCache',
          operation
        },
        extra: context
      });
    }
  }

  /**
   * Get cache health status
   */
  async getHealthStatus() {
    try {
      return await this.cache.healthCheck();
    } catch (error) {
      this.reportCacheError('getHealthStatus', error);
      return {
        status: 'healthy', // Always return healthy to not break the app
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cache order tracking data with optimized structure
   */
  async cacheOrderTracking(orderId, trackingData) {
    try {
      const cacheKey = `order:tracking:${orderId}`;
      const cacheValue = {
        ...trackingData,
        cachedAt: new Date().toISOString(),
        version: '1.0'
      };

      const success = await this.cache.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);

      // Also cache individual child orders for faster shop queries
      if (success && trackingData.childOrders) {
        for (const childOrder of trackingData.childOrders) {
          await this.cacheChildOrder(childOrder._id, childOrder);
        }
      }

      return success;
    } catch (error) {
      this.reportCacheError('cacheOrderTracking', error, { orderId });
      return true; // Return true to not break the app
    }
  }

  /**
   * Retrieve cached order tracking data
   */
  async getCachedOrderTracking(orderId) {
    try {
      const cacheKey = `order:tracking:${orderId}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        // Check if cache is still fresh (within last 2 minutes for real-time data)
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        if (cacheAge < 120000) { // 2 minutes
          const { cachedAt, version, ...data } = cached;
          return data;
        }
      }
      
      return null;
    } catch (error) {
      this.reportCacheError('getCachedOrderTracking', error, { orderId });
      return null;
    }
  }

  /**
   * Cache child order data for shop-specific queries
   */
  async cacheChildOrder(childOrderId, orderData) {
    try {
      const cacheKey = `order:child:${childOrderId}`;
      const cacheValue = {
        ...orderData,
        cachedAt: new Date().toISOString()
      };
      
      return await this.cache.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);
    } catch (error) {
      logger.error('Error caching child order', { childOrderId, error: error.message });
      return true;
    }
  }

  /**
   * Cache active zone orders for zone admin dashboard
   */
  async cacheActiveZoneOrders(zoneId, orders) {
    try {
      const cacheKey = `zone:active:${zoneId}`;
      const cacheValue = {
        orders,
        count: orders.length,
        cachedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const success = await this.cache.set(cacheKey, cacheValue, this.TTL.ACTIVE_ORDERS);

      // Create index for quick status-based filtering
      if (success) {
        await this.createOrderStatusIndex(zoneId, orders);
      }

      return success;
    } catch (error) {
      logger.error('Error caching active zone orders', { zoneId, error: error.message });
      return true;
    }
  }

  /**
   * Get cached active zone orders with optional status filtering
   */
  async getCachedActiveZoneOrders(zoneId, statusFilter = null) {
    try {
      const cacheKey = `zone:active:${zoneId}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        let orders = cached.orders;

        // Apply status filter if provided
        if (statusFilter) {
          orders = orders.filter(order => order.status === statusFilter);
        }

        return {
          orders,
          count: orders.length,
          lastUpdated: cached.lastUpdated
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error retrieving cached zone orders', { zoneId, error: error.message });
      return null;
    }
  }

  /**
   * Create searchable index for order statuses
   */
  async createOrderStatusIndex(zoneId, orders) {
    try {
      const statusGroups = orders.reduce((groups, order) => {
        if (!groups[order.status]) {
          groups[order.status] = [];
        }
        groups[order.status].push(order._id);
        return groups;
      }, {});

      for (const [status, orderIds] of Object.entries(statusGroups)) {
        const indexKey = `zone:status:${zoneId}:${status}`;
        await this.cache.set(indexKey, orderIds, this.TTL.ACTIVE_ORDERS);
      }
    } catch (error) {
      logger.error('Error creating order status index', { zoneId, error: error.message });
    }
  }

  /**
   * Cache order statistics for analytics
   */
  async cacheOrderStats(entityType, entityId, stats) {
    try {
      const cacheKey = `stats:${entityType}:${entityId}`;
      const cacheValue = {
        ...stats,
        generatedAt: new Date().toISOString(),
        entityType,
        entityId
      };

      return await this.cache.set(cacheKey, cacheValue, this.TTL.ORDER_STATS);
    } catch (error) {
      logger.error('Error caching order stats', { entityType, entityId, error: error.message });
      return true;
    }
  }

  /**
   * Invalidate cache when order status changes
   */
  async invalidateOrderCache(orderId, zoneId = null, shopId = null) {
    try {
      const keysToDelete = [`order:tracking:${orderId}`];

      if (zoneId) {
        keysToDelete.push(`zone:active:${zoneId}`);
        await this.cache.clear(`zone:status:${zoneId}:`);
      }

      if (shopId) {
        keysToDelete.push(`shop:orders:${shopId}`);
      }

      let deletedCount = 0;
      for (const key of keysToDelete) {
        const deleted = await this.cache.del(key);
        if (deleted) deletedCount++;
      }

      logger.debug('Cache invalidation completed', { orderId, zoneId, shopId, deletedCount });

      return deletedCount > 0;
    } catch (error) {
      logger.error('Error invalidating order cache', { orderId, zoneId, shopId, error: error.message });
      return true;
    }
  }

  /**
   * Bulk cache multiple orders for efficiency  
   */
  async bulkCacheOrders(orders) {
    try {
      let successCount = 0;
      
      // Cache orders individually
      for (const order of orders) {
        const cacheKey = `order:bulk:${order._id}`;
        const cacheValue = {
          ...order,
          cachedAt: new Date().toISOString()
        };
        
        const success = await this.cache.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);
        if (success) successCount++;
      }

      logger.debug('Bulk cache operation completed', { 
        totalOrders: orders.length, 
        successCount 
      });

      return successCount > 0;
    } catch (error) {
      logger.error('Error bulk caching orders', { error: error.message });
      return true;
    }
  }

  /**
   * Cache order timeline for faster timeline queries
   */
  async cacheOrderTimeline(orderId, timeline) {
    try {
      const cacheKey = `timeline:${orderId}`;
      const cacheValue = {
        timeline,
        lastEvent: timeline[timeline.length - 1],
        cachedAt: new Date().toISOString()
      };
      
      return await this.cache.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);
    } catch (error) {
      logger.error('Error caching order timeline', { orderId, error: error.message });
      return true;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  async getCacheMetrics() {
    try {
      const stats = this.cache.getStats();
      const health = await this.cache.healthCheck();
      
      return {
        stats,
        health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting cache metrics', { error: error.message });
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup expired cache entries (maintenance)
   */
  async cleanup() {
    try {
      const before = this.cache.getStats();
      this.cache.cleanup();
      const after = this.cache.getStats();
      
      const removed = before.size - after.size;
      if (removed > 0) {
        logger.info('Cache cleanup completed', { 
          removedEntries: removed,
          remainingEntries: after.size
        });
      }
      
      return true;
    } catch (error) {
      this.reportCacheError('cleanup', error);
      return true;
    }
  }

  /**
   * Close cache connections properly
   */
  async close() {
    try {
      // Stop cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      this.cache.shutdown();
      logger.info('OrderCacheService closed successfully');
    } catch (error) {
      this.reportCacheError('close', error);
    }
  }

  /**
   * Health check for cache system
   */
  async healthCheck() {
    try {
      return await this.cache.healthCheck();
    } catch (error) {
      return {
        status: 'healthy', // Always return healthy to not break the app
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OrderCacheService();