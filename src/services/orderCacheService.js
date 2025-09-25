const CacheManager = require('./cacheManager');
const { logger } = require('../utils/logger');

class OrderCacheService {
  constructor() {
    // Use the new resilient cache manager
    this.cacheManager = new CacheManager();
    
    // Cache configuration
    this.TTL = {
      ORDER_TRACKING: 300, // 5 minutes
      ACTIVE_ORDERS: 180, // 3 minutes  
      ORDER_STATS: 600, // 10 minutes
      ZONE_ORDERS: 240 // 4 minutes
    };

    logger.info('OrderCacheService initialized with resilient cache manager');
  }

  /**
   * Get cache health status
   */
  async getHealthStatus() {
    try {
      return await this.cacheManager.healthCheck();
    } catch (error) {
      logger.error('Error getting cache health status', { error: error.message });
      return {
        status: 'error',
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

      const success = await this.cacheManager.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);

      // Also cache individual child orders for faster shop queries
      if (success && trackingData.childOrders) {
        for (const childOrder of trackingData.childOrders) {
          await this.cacheChildOrder(childOrder._id, childOrder);
        }
      }

      return success;
    } catch (error) {
      logger.error('Error caching order tracking', { orderId, error: error.message });
      return false;
    }
  }

  /**
   * Retrieve cached order tracking data
   */
  async getCachedOrderTracking(orderId) {
    try {
      const cacheKey = `order:tracking:${orderId}`;
      const cached = await this.cacheManager.get(cacheKey);
      
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
      logger.error('Error retrieving cached order tracking', { orderId, error: error.message });
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
      
      return await this.cacheManager.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);
    } catch (error) {
      logger.error('Error caching child order', { childOrderId, error: error.message });
      return false;
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

      const success = await this.cacheManager.set(cacheKey, cacheValue, this.TTL.ACTIVE_ORDERS);

      // Create index for quick status-based filtering
      if (success) {
        await this.createOrderStatusIndex(zoneId, orders);
      }

      return success;
    } catch (error) {
      logger.error('Error caching active zone orders', { zoneId, error: error.message });
      return false;
    }
  }

  /**
   * Get cached active zone orders with optional status filtering
   */
  async getCachedActiveZoneOrders(zoneId, statusFilter = null) {
    try {
      const cacheKey = `zone:active:${zoneId}`;
      const cached = await this.cacheManager.get(cacheKey);
      
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
        await this.cacheManager.set(indexKey, orderIds, this.TTL.ACTIVE_ORDERS);
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

      return await this.cacheManager.set(cacheKey, cacheValue, this.TTL.ORDER_STATS);
    } catch (error) {
      logger.error('Error caching order stats', { entityType, entityId, error: error.message });
      return false;
    }
  }

  /**
   * Invalidate cache when order status changes
   */
  async invalidateOrderCache(orderId, parentOrderId = null, zoneId = null, shopId = null) {
    try {
      const keysToDelete = [
        `order:tracking:${orderId}`,
        `order:child:${orderId}`
      ];

      if (parentOrderId) {
        keysToDelete.push(`order:tracking:${parentOrderId}`);
      }

      if (zoneId) {
        keysToDelete.push(`zone:active:${zoneId}`);
        // Clear status indexes for the zone
        await this.cacheManager.clear(`zone:status:${zoneId}:*`);
      }

      if (shopId) {
        keysToDelete.push(`shop:orders:${shopId}`);
      }

      // Delete all relevant cache keys
      let deletedCount = 0;
      for (const key of keysToDelete) {
        const deleted = await this.cacheManager.del(key);
        if (deleted) deletedCount++;
      }

      logger.debug('Cache invalidation completed', { 
        orderId, 
        parentOrderId, 
        zoneId, 
        shopId, 
        deletedCount 
      });

      return deletedCount > 0;
    } catch (error) {
      logger.error('Error invalidating order cache', { 
        orderId, 
        parentOrderId, 
        zoneId, 
        shopId, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Bulk cache multiple orders for efficiency  
   */
  async bulkCacheOrders(orders) {
    try {
      let successCount = 0;
      
      // Cache orders individually (cache manager handles the underlying optimization)
      for (const order of orders) {
        const cacheKey = `order:bulk:${order._id}`;
        const cacheValue = {
          ...order,
          cachedAt: new Date().toISOString()
        };
        
        const success = await this.cacheManager.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);
        if (success) successCount++;
      }

      logger.debug('Bulk cache operation completed', { 
        totalOrders: orders.length, 
        successCount 
      });

      return successCount > 0;
    } catch (error) {
      logger.error('Error bulk caching orders', { error: error.message });
      return false;
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
      
      return await this.cacheManager.set(cacheKey, cacheValue, this.TTL.ORDER_TRACKING);
    } catch (error) {
      logger.error('Error caching order timeline', { orderId, error: error.message });
      return false;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  async getCacheMetrics() {
    try {
      const cacheStatus = this.cacheManager.getStatus();
      const healthStatus = await this.cacheManager.healthCheck();
      
      return {
        status: cacheStatus,
        health: healthStatus,
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
      // The cache manager handles TTL automatically, but we can do additional cleanup
      const expiredPatterns = [
        'order:tracking:*',
        'zone:active:*',
        'zone:status:*'
      ];

      let totalCleaned = 0;
      for (const pattern of expiredPatterns) {
        const cleaned = await this.cacheManager.clear(pattern);
        totalCleaned += cleaned;
      }

      logger.info('Cache cleanup completed', { totalCleaned });
      return totalCleaned > 0;
    } catch (error) {
      logger.error('Error during cache cleanup', { error: error.message });
      return false;
    }
  }

  /**
   * Close cache connections properly
   */
  async close() {
    try {
      await this.cacheManager.shutdown();
      logger.info('OrderCacheService closed successfully');
    } catch (error) {
      logger.error('Error closing OrderCacheService', { error: error.message });
    }
  }

  /**
   * Health check for cache system
   */
  async healthCheck() {
    try {
      return await this.cacheManager.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OrderCacheService();