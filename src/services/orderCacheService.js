const redis = require('redis');
const { promisify } = require('util');

class OrderCacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    
    // Cache configuration
    this.TTL = {
      ORDER_TRACKING: 300, // 5 minutes
      ACTIVE_ORDERS: 180, // 3 minutes  
      ORDER_STATS: 600, // 10 minutes
      ZONE_ORDERS: 240 // 4 minutes
    };

    // Initialize connection
    this.connect();
  }

  /**
   * Initialize Redis connection with proper error handling
   */
  async connect() {
    if (this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;

    try {
      // Create Redis client with v4+ syntax
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          reconnectStrategy: (retries) => {
            console.log(`Redis reconnection attempt ${retries}`);
            if (retries > 10) {
              console.error('Redis reconnection failed after 10 attempts');
              return false;
            }
            return Math.min(retries * 50, 500);
          }
        },
        password: process.env.REDIS_PASSWORD || undefined
      });

      // Set up event handlers
      this.client.on('error', (err) => {
        console.error('Redis Cache Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Cache Service connecting...');
      });

      this.client.on('ready', () => {
        console.log('Redis Cache Service connected and ready');
        this.isConnected = true;
        this.isConnecting = false;
      });

      this.client.on('end', () => {
        console.log('Redis Cache Service connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis Cache Service reconnecting...');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();

    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnecting = false;
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Ensure Redis connection is available
   */
  async ensureConnection() {
    if (!this.client || !this.isConnected) {
      console.log('Redis not connected, attempting to reconnect...');
      await this.connect();
    }
    
    if (!this.client || !this.isConnected) {
      throw new Error('Redis connection unavailable');
    }
  }

  /**
   * Cache order tracking data with optimized structure
   */
  async cacheOrderTracking(orderId, trackingData) {
    try {
      await this.ensureConnection();
      
      const cacheKey = `order:tracking:${orderId}`;
      const cacheValue = {
        ...trackingData,
        cachedAt: new Date().toISOString(),
        version: '1.0'
      };

      await this.client.setEx(
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
      await this.ensureConnection();
      
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
      await this.ensureConnection();
      
      const cacheKey = `order:child:${childOrderId}`;
      await this.client.setEx(
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
      await this.ensureConnection();
      
      const cacheKey = `zone:active:${zoneId}`;
      const cacheValue = {
        orders,
        count: orders.length,
        cachedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await this.client.setEx(
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
      await this.ensureConnection();
      
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
      await this.ensureConnection();
      
      const statusGroups = orders.reduce((groups, order) => {
        if (!groups[order.status]) {
          groups[order.status] = [];
        }
        groups[order.status].push(order._id);
        return groups;
      }, {});

      for (const [status, orderIds] of Object.entries(statusGroups)) {
        const indexKey = `zone:status:${zoneId}:${status}`;
        await this.client.setEx(
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
      await this.ensureConnection();
      
      const cacheKey = `stats:${entityType}:${entityId}`;
      const cacheValue = {
        ...stats,
        generatedAt: new Date().toISOString(),
        entityType,
        entityId
      };

      await this.client.setEx(
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
      await this.ensureConnection();
      
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
      await this.ensureConnection();
      
      // Use multi for atomic batch operations in Redis v4+
      const multi = this.client.multi();
      
      for (const order of orders) {
        const cacheKey = `order:bulk:${order._id}`;
        const cacheValue = JSON.stringify({
          ...order,
          cachedAt: new Date().toISOString()
        });
        
        multi.setEx(cacheKey, this.TTL.ORDER_TRACKING, cacheValue);
      }

      await multi.exec();
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
      await this.ensureConnection();
      
      const cacheKey = `timeline:${orderId}`;
      await this.client.setEx(
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
      await this.ensureConnection();
      
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        timestamp: new Date().toISOString(),
        connectionStatus: this.isConnected
      };
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return {
        error: error.message,
        connectionStatus: this.isConnected,
        timestamp: new Date().toISOString()
      };
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
      await this.ensureConnection();
      
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
   * Close Redis connection properly
   */
  async close() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
      }
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck() {
    try {
      await this.ensureConnection();
      await this.client.ping();
      return {
        status: 'healthy',
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OrderCacheService();