const redis = require('redis');
const { promisify } = require('util');

class OrderCacheService {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    });

    this.client.on('error', (err) => {
      console.error('Redis Cache Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Cache Service connected');
    });

    // Cache configuration
    this.TTL = {
      ORDER_TRACKING: 300, // 5 minutes
      ACTIVE_ORDERS: 180, // 3 minutes  
      ORDER_STATS: 600, // 10 minutes
      ZONE_ORDERS: 240 // 4 minutes
    };
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

      await this.client.setex(
        cacheKey, 
        this.TTL.ORDER_TRACKING, 
        JSON.stringify(cacheValue)
      );

      // Also cache individual child orders for faster shop queries
      if (trackingData.childOrders) {
        for (const childOrder of trackingData.childOrders) {
          await this.cacheChildOrder(childOrder._id, childOrder);
        }
      }

      return true;
    } catch (error) {
      console.error('Error caching order tracking:', error);
      return false;
    }
  }

  /**
   * Retrieve cached order tracking data
   */
  async getCachedOrderTracking(orderId) {
    try {
      const cacheKey = `order:tracking:${orderId}`;
      const cached = await this.client.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still fresh (within last 2 minutes for real-time data)
        const cacheAge = Date.now() - new Date(data.cachedAt).getTime();
        if (cacheAge < 120000) { // 2 minutes
          delete data.cachedAt;
          delete data.version;
          return data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving cached order tracking:', error);
      return null;
    }
  }

  /**
   * Cache child order data for shop-specific queries
   */
  async cacheChildOrder(childOrderId, orderData) {
    try {
      const cacheKey = `order:child:${childOrderId}`;
      await this.client.setex(
        cacheKey, 
        this.TTL.ORDER_TRACKING, 
        JSON.stringify({
          ...orderData,
          cachedAt: new Date().toISOString()
        })
      );
      return true;
    } catch (error) {
      console.error('Error caching child order:', error);
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

      await this.client.setex(
        cacheKey, 
        this.TTL.ACTIVE_ORDERS, 
        JSON.stringify(cacheValue)
      );

      // Create index for quick status-based filtering
      await this.createOrderStatusIndex(zoneId, orders);

      return true;
    } catch (error) {
      console.error('Error caching active zone orders:', error);
      return false;
    }
  }

  /**
   * Get cached active zone orders with optional status filtering
   */
  async getCachedActiveZoneOrders(zoneId, statusFilter = null) {
    try {
      const cacheKey = `zone:active:${zoneId}`;
      const cached = await this.client.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        let orders = data.orders;

        // Apply status filter if provided
        if (statusFilter) {
          orders = orders.filter(order => order.status === statusFilter);
        }

        return {
          orders,
          count: orders.length,
          lastUpdated: data.lastUpdated
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving cached zone orders:', error);
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
        await this.client.setex(
          indexKey, 
          this.TTL.ACTIVE_ORDERS, 
          JSON.stringify(orderIds)
        );
      }
    } catch (error) {
      console.error('Error creating order status index:', error);
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

      await this.client.setex(
        cacheKey, 
        this.TTL.ORDER_STATS, 
        JSON.stringify(cacheValue)
      );

      return true;
    } catch (error) {
      console.error('Error caching order stats:', error);
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
        // Also invalidate status indexes
        const statusKeys = await this.client.keys(`zone:status:${zoneId}:*`);
        keysToDelete.push(...statusKeys);
      }

      if (shopId) {
        keysToDelete.push(`shop:orders:${shopId}`);
      }

      // Delete all relevant cache keys
      if (keysToDelete.length > 0) {
        await this.client.del(keysToDelete);
      }

      return true;
    } catch (error) {
      console.error('Error invalidating order cache:', error);
      return false;
    }
  }

  /**
   * Bulk cache multiple orders for efficiency
   */
  async bulkCacheOrders(orders) {
    try {
      const pipeline = this.client.pipeline();
      
      for (const order of orders) {
        const cacheKey = `order:bulk:${order._id}`;
        const cacheValue = JSON.stringify({
          ...order,
          cachedAt: new Date().toISOString()
        });
        
        pipeline.setex(cacheKey, this.TTL.ORDER_TRACKING, cacheValue);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Error bulk caching orders:', error);
      return false;
    }
  }

  /**
   * Cache order timeline for faster timeline queries
   */
  async cacheOrderTimeline(orderId, timeline) {
    try {
      const cacheKey = `timeline:${orderId}`;
      await this.client.setex(
        cacheKey, 
        this.TTL.ORDER_TRACKING, 
        JSON.stringify({
          timeline,
          lastEvent: timeline[timeline.length - 1],
          cachedAt: new Date().toISOString()
        })
      );
      return true;
    } catch (error) {
      console.error('Error caching order timeline:', error);
      return false;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  async getCacheMetrics() {
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return null;
    }
  }

  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(infoString) {
    const lines = infoString.split('\r\n');
    const result = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(value) ? value : Number(value);
      }
    }
    
    return result;
  }

  /**
   * Cleanup expired cache entries (maintenance)
   */
  async cleanup() {
    try {
      // Redis handles TTL automatically, but we can do additional cleanup
      const expiredPatterns = [
        'order:tracking:*',
        'zone:active:*',
        'zone:status:*'
      ];

      for (const pattern of expiredPatterns) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 1000) { // If too many keys, clean older ones
          const toDelete = keys.slice(0, Math.floor(keys.length * 0.1));
          if (toDelete.length > 0) {
            await this.client.del(toDelete);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error during cache cleanup:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      await this.client.quit();
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

module.exports = new OrderCacheService();