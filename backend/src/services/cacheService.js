const Redis = require('ioredis');
const { logger } = require('../utils/logger');

/**
 * Production-ready Redis caching service
 * Provides high-performance caching with clustering, persistence, and monitoring
 */
class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000;
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      averageResponseTime: 0,
      connectionTime: null
    };
    
    // Cache configurations
    this.defaultTTL = parseInt(process.env.CACHE_DEFAULT_TTL) || 3600; // 1 hour
    this.keyPrefix = process.env.CACHE_KEY_PREFIX || 'tableserve:';
    
    this.initializeConnection();
  }
  
  /**
   * Initialize Redis connection with production optimizations
   */
  initializeConnection() {
    try {
      const redisConfig = this.getRedisConfig();
      
      // Create Redis instance with optimized configuration
      this.redis = new Redis(redisConfig);
      
      this.setupEventHandlers();
      
    } catch (error) {
      logger.error('Failed to initialize Redis connection', error);
      this.handleConnectionError(error);
    }
  }
  
  /**
   * Get Redis configuration based on environment
   */
  getRedisConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Check for Redis cluster configuration
    if (process.env.REDIS_CLUSTER_NODES) {
      return {
        // Cluster configuration
        nodes: process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
          const [host, port] = node.trim().split(':');
          return { host, port: parseInt(port) || 6379 };
        }),
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
          tls: isProduction ? {} : undefined,
          connectTimeout: 10000,
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableOfflineQueue: false
        },
        enableReadyCheck: true,
        redisOptions: {
          // Connection pool settings
          family: 4,
          keepAlive: true,
          maxRetriesPerRequest: 3
        }
      };
    }
    
    // Single Redis instance configuration
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      
      // Connection settings
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      
      // TLS for production
      ...(isProduction && process.env.REDIS_TLS === 'true' && {
        tls: {
          servername: process.env.REDIS_HOST
        }
      }),
      
      // Connection pool settings
      family: 4,
      keepAlive: true,
      
      // Retry configuration
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      
      // Reconnect configuration
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      }
    };
  }
  
  /**
   * Setup Redis event handlers
   */
  setupEventHandlers() {
    const startTime = Date.now();
    
    this.redis.on('connect', () => {
      logger.info('Redis connecting...');
    });
    
    this.redis.on('ready', () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.metrics.connectionTime = Date.now() - startTime;
      
      logger.info('Redis connected successfully', {
        connectionTime: this.metrics.connectionTime,
        host: this.redis.options.host,
        port: this.redis.options.port
      });
      
      // Start health monitoring
      this.startHealthMonitoring();
    });
    
    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.metrics.errors++;
      logger.error('Redis connection error', error);
      this.handleConnectionError(error);
    });
    
    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
    
    this.redis.on('reconnecting', (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms...`);
    });
    
    this.redis.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection ended');
    });
  }
  
  /**
   * Handle connection errors with retry logic
   */
  handleConnectionError(error) {
    this.connectionAttempts++;
    
    if (this.connectionAttempts < this.maxRetries) {
      const delay = this.retryDelay * Math.pow(2, this.connectionAttempts - 1);
      
      setTimeout(() => {
        logger.info(`Retrying Redis connection (attempt ${this.connectionAttempts}/${this.maxRetries})`);
        this.redis.connect().catch(() => {
          // Error will be handled by error event
        });
      }, delay);
    } else {
      logger.error('Redis connection failed after maximum retries');
      // Continue without cache - don't crash the app
    }
  }
  
  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      try {
        const start = Date.now();
        await this.redis.ping();
        const pingTime = Date.now() - start;
        
        // Log health metrics periodically
        if (Math.random() < 0.1) { // 10% of the time
          logger.debug('Redis health check', {
            pingTime,
            connected: this.isConnected,
            metrics: this.getMetrics()
          });
        }
        
      } catch (error) {
        logger.error('Redis health check failed', error);
      }
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Build cache key with prefix
   */
  buildKey(key) {
    return `${this.keyPrefix}${key}`;
  }
  
  /**
   * Get value from cache
   */
  async get(key, parseJSON = true) {
    if (!this.isConnected) {
      this.metrics.misses++;
      return null;
    }
    
    try {
      const start = Date.now();
      const cacheKey = this.buildKey(key);
      const value = await this.redis.get(cacheKey);
      
      this.updateMetrics('get', Date.now() - start);
      
      if (value === null) {
        this.metrics.misses++;
        logger.debug('Cache miss', { key: cacheKey });
        return null;
      }
      
      this.metrics.hits++;
      logger.debug('Cache hit', { key: cacheKey });
      
      return parseJSON ? JSON.parse(value) : value;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache get error', { key, error });
      return null;
    }
  }
  
  /**
   * Set value in cache
   */
  async set(key, value, ttl = null) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const start = Date.now();
      const cacheKey = this.buildKey(key);
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      const cacheTTL = ttl || this.defaultTTL;
      
      await this.redis.setex(cacheKey, cacheTTL, serializedValue);
      
      this.updateMetrics('set', Date.now() - start);
      this.metrics.sets++;
      
      logger.debug('Cache set', { key: cacheKey, ttl: cacheTTL });
      return true;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache set error', { key, error });
      return false;
    }
  }
  
  /**
   * Delete key from cache
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const start = Date.now();
      const cacheKey = this.buildKey(key);
      const result = await this.redis.del(cacheKey);
      
      this.updateMetrics('del', Date.now() - start);
      this.metrics.deletes++;
      
      logger.debug('Cache delete', { key: cacheKey, deleted: result > 0 });
      return result > 0;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }
  
  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }
    
    try {
      const cachePattern = this.buildKey(pattern);
      const keys = await this.redis.keys(cachePattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.redis.del(...keys);
      this.metrics.deletes += result;
      
      logger.debug('Cache pattern delete', { pattern: cachePattern, deleted: result });
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache pattern delete error', { pattern, error });
      return 0;
    }
  }
  
  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const cacheKey = this.buildKey(key);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }
  
  /**
   * Set TTL for existing key
   */
  async expire(key, ttl) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const cacheKey = this.buildKey(key);
      const result = await this.redis.expire(cacheKey, ttl);
      return result === 1;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache expire error', { key, ttl, error });
      return false;
    }
  }
  
  /**
   * Get TTL for key
   */
  async ttl(key) {
    if (!this.isConnected) {
      return -1;
    }
    
    try {
      const cacheKey = this.buildKey(key);
      return await this.redis.ttl(cacheKey);
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache TTL error', { key, error });
      return -1;
    }
  }
  
  /**
   * Increment counter
   */
  async incr(key, amount = 1) {
    if (!this.isConnected) {
      return null;
    }
    
    try {
      const cacheKey = this.buildKey(key);
      const result = amount === 1 
        ? await this.redis.incr(cacheKey)
        : await this.redis.incrby(cacheKey, amount);
      
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache incr error', { key, amount, error });
      return null;
    }
  }
  
  /**
   * Cache with automatic refresh
   */
  async getOrSet(key, fetchFunction, ttl = null) {
    try {
      // Try to get from cache first
      let value = await this.get(key);
      
      if (value !== null) {
        return value;
      }
      
      // Fetch from source
      logger.debug('Cache miss, fetching from source', { key });
      value = await fetchFunction();
      
      if (value !== null && value !== undefined) {
        // Cache the result
        await this.set(key, value, ttl);
      }
      
      return value;
      
    } catch (error) {
      logger.error('Cache getOrSet error', { key, error });
      // If cache fails, still try to fetch from source
      try {
        return await fetchFunction();
      } catch (fetchError) {
        logger.error('Fetch function error', { key, error: fetchError });
        throw fetchError;
      }
    }
  }
  
  /**
   * Cached data with tags for invalidation
   */
  async setWithTags(key, value, tags = [], ttl = null) {
    try {
      // Set the main value
      await this.set(key, value, ttl);
      
      // Set tag associations
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await this.redis.sadd(this.buildKey(tagKey), this.buildKey(key));
        
        // Set TTL for tag if specified
        if (ttl) {
          await this.expire(tagKey, ttl + 300); // Tag TTL slightly longer
        }
      }
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache setWithTags error', { key, tags, error });
      return false;
    }
  }
  
  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag) {
    try {
      const tagKey = this.buildKey(`tag:${tag}`);
      const keys = await this.redis.smembers(tagKey);
      
      if (keys.length > 0) {
        // Delete all keys associated with this tag
        await this.redis.del(...keys);
        
        // Delete the tag itself
        await this.redis.del(tagKey);
        
        logger.info('Cache invalidated by tag', { tag, keysDeleted: keys.length });
        return keys.length;
      }
      
      return 0;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache invalidateByTag error', { tag, error });
      return 0;
    }
  }
  
  /**
   * Flush all cache
   */
  async flush() {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.redis.flushdb();
      logger.warn('Cache flushed');
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache flush error', error);
      return false;
    }
  }
  
  /**
   * Update performance metrics
   */
  updateMetrics(operation, responseTime) {
    this.metrics.totalOperations++;
    
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + responseTime) / 2;
    }
  }
  
  /**
   * Get cache metrics
   */
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      errorRate: this.metrics.totalOperations > 0 
        ? (this.metrics.errors / this.metrics.totalOperations * 100).toFixed(2) + '%'
        : '0.00%'
    };
  }
  
  /**
   * Get Redis info
   */
  async getInfo() {
    if (!this.isConnected) {
      return null;
    }
    
    try {
      const info = await this.redis.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      logger.error('Failed to get Redis info', error);
      return null;
    }
  }
  
  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(info) {
    const sections = {};
    const lines = info.split('\r\n');
    let currentSection = null;
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        currentSection = line.substring(2).toLowerCase();
        sections[currentSection] = {};
      } else if (line.includes(':') && currentSection) {
        const [key, value] = line.split(':');
        sections[currentSection][key] = isNaN(value) ? value : Number(value);
      }
    }
    
    return sections;
  }
  
  /**
   * Close Redis connection
   */
  async close() {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.isConnected = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection', error);
    }
  }
}

// Cache key generators for different data types
const CacheKeys = {
  user: (userId) => `user:${userId}`,
  restaurant: (restaurantId) => `restaurant:${restaurantId}`,
  zone: (zoneId) => `zone:${zoneId}`,
  shop: (shopId) => `shop:${shopId}`,
  menu: (entityType, entityId) => `menu:${entityType}:${entityId}`,
  menuItem: (itemId) => `menu_item:${itemId}`,
  order: (orderId) => `order:${orderId}`,
  ordersByRestaurant: (restaurantId, status) => `orders:restaurant:${restaurantId}:${status}`,
  analytics: (entityType, entityId, period) => `analytics:${entityType}:${entityId}:${period}`,
  session: (sessionId) => `session:${sessionId}`,
  rateLimit: (ip, endpoint) => `rate_limit:${ip}:${endpoint}`
};

// TTL constants (in seconds)
const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  DAILY: 86400,    // 24 hours
  WEEKLY: 604800   // 7 days
};

// Create singleton instance
const cacheService = new CacheService();

module.exports = {
  cacheService,
  CacheKeys,
  CacheTTL
};
