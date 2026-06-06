/**
 * Cache Manager
 * Central orchestrator for all caching operations with intelligent fallback logic
 */

const { logger } = require('../utils/logger');
const cacheConfig = require('../config/cacheConfig');
const EnhancedRedisService = require('./enhancedRedisService');
const MemoryCacheService = require('./memoryCache');
const CacheHealthMonitor = require('./cacheHealthMonitor');

class CacheManager {
  constructor() {
    // Initialize health monitor first
    this.healthMonitor = new CacheHealthMonitor();
    
    // Initialize cache services
    this.redisService = null;
    this.memoryCache = null;
    this.currentProvider = null;
    
    // Cache state
    this.state = {
      redisAvailable: false,
      fallbackActive: false,
      fallbackType: null,
      lastRedisCheck: null,
      operationCount: 0
    };

    // Configuration
    this.config = {
      redis: cacheConfig.getRedisConfig(),
      memory: cacheConfig.getMemoryCacheConfig(),
      policies: cacheConfig.getPolicies()
    };

    this.initialize();
  }

  /**
   * Initialize cache services
   */
  async initialize() {
    try {
      // Initialize Redis service if enabled
      if (cacheConfig.isRedisEnabled()) {
        this.redisService = new EnhancedRedisService(this.healthMonitor);
        
        try {
          await this.redisService.connect();
          this.state.redisAvailable = true;
          this.currentProvider = 'redis';
          logger.info('Cache manager initialized with Redis as primary provider');
        } catch (error) {
          logger.warn('Redis initialization failed, falling back to memory cache', { 
            error: error.message 
          });
          this.activateFallback();
        }
      } else {
        logger.info('Redis is disabled, using memory cache only');
        this.activateFallback();
      }

      // Initialize memory cache if enabled
      if (cacheConfig.isMemoryFallbackEnabled()) {
        this.memoryCache = new MemoryCacheService(this.config.memory);
        
        if (!this.currentProvider) {
          this.currentProvider = 'memory';
        }
      }

      // Ensure we have at least one cache provider
      if (!this.currentProvider) {
        throw new Error('No cache providers available');
      }

      // Set up health monitoring
      this.setupHealthMonitoring();

      logger.info('Cache manager initialized successfully', {
        primaryProvider: this.currentProvider,
        redisEnabled: cacheConfig.isRedisEnabled(),
        memoryFallbackEnabled: cacheConfig.isMemoryFallbackEnabled()
      });

    } catch (error) {
      logger.error('Failed to initialize cache manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Set up health monitoring and event handlers
   */
  setupHealthMonitoring() {
    // Listen for Redis connection events
    this.healthMonitor.on('redis:connected', () => {
      this.onRedisConnected();
    });

    this.healthMonitor.on('redis:disconnected', () => {
      this.onRedisDisconnected();
    });

    this.healthMonitor.on('circuit_breaker:opened', () => {
      this.activateFallback();
    });

    this.healthMonitor.on('circuit_breaker:closed', () => {
      this.onRedisConnected();
    });
  }

  /**
   * Handle Redis connection restored
   */
  onRedisConnected() {
    if (this.redisService && !this.state.redisAvailable) {
      this.state.redisAvailable = true;
      this.currentProvider = 'redis';
      this.deactivateFallback();
      
      logger.info('Redis connection restored, switching back from fallback cache');
    }
  }

  /**
   * Handle Redis connection lost
   */
  onRedisDisconnected() {
    if (this.state.redisAvailable) {
      this.state.redisAvailable = false;
      this.activateFallback();
      
      logger.warn('Redis connection lost, activating fallback cache');
    }
  }

  /**
   * Activate fallback cache
   */
  activateFallback() {
    if (this.memoryCache) {
      this.currentProvider = 'memory';
      this.state.fallbackActive = true;
      this.state.fallbackType = 'memory';
      
      // Update health monitor
      const stats = this.memoryCache.getStats();
      this.healthMonitor.updateFallbackStatus(true, 'memory', stats);
      
      logger.info('Fallback cache activated', { type: 'memory' });
    } else {
      logger.error('No fallback cache available');
      throw new Error('No fallback cache available');
    }
  }

  /**
   * Deactivate fallback cache
   */
  deactivateFallback() {
    this.state.fallbackActive = false;
    this.state.fallbackType = null;
    
    // Update health monitor
    this.healthMonitor.updateFallbackStatus(false);
    
    logger.info('Fallback cache deactivated');
  }

  /**
   * Get value from cache with fallback logic
   */
  async get(key, options = {}) {
    this.validateKey(key);
    
    const startTime = Date.now();
    let result = null;
    let provider = null;
    let error = null;

    try {
      // Try Redis first if available
      if (this.currentProvider === 'redis' && this.state.redisAvailable) {
        try {
          result = await this.redisService.get(key);
          provider = 'redis';
        } catch (redisError) {
          logger.debug('Redis get failed, trying fallback', { key, error: redisError.message });
          error = redisError;
          
          // Try fallback if Redis fails
          if (this.memoryCache) {
            result = await this.memoryCache.get(key);
            provider = 'memory';
            this.activateFallback();
          }
        }
      } else if (this.currentProvider === 'memory' && this.memoryCache) {
        result = await this.memoryCache.get(key);
        provider = 'memory';
      }

      // Record metrics
      const latency = Date.now() - startTime;
      this.recordOperation('get', result !== null, latency, provider, error);

      return result;

    } catch (err) {
      const latency = Date.now() - startTime;
      this.recordOperation('get', false, latency, provider, err);
      
      if (options.throwOnError) {
        throw err;
      }
      
      logger.error('Cache get operation failed', { key, error: err.message });
      return null;
    }
  }

  /**
   * Set value in cache with fallback logic
   */
  async set(key, value, ttl = null, options = {}) {
    this.validateKey(key);
    this.validateValue(value);
    
    const finalTTL = ttl || this.config.policies.defaultTTL;
    const startTime = Date.now();
    let success = false;
    let provider = null;
    let error = null;

    try {
      // Try Redis first if available
      if (this.currentProvider === 'redis' && this.state.redisAvailable) {
        try {
          await this.redisService.set(key, JSON.stringify(value), { ttl: finalTTL });
          success = true;
          provider = 'redis';
        } catch (redisError) {
          logger.debug('Redis set failed, trying fallback', { key, error: redisError.message });
          error = redisError;
          
          // Try fallback if Redis fails
          if (this.memoryCache) {
            success = await this.memoryCache.set(key, value, finalTTL);
            provider = 'memory';
            this.activateFallback();
          }
        }
      } else if (this.currentProvider === 'memory' && this.memoryCache) {
        success = await this.memoryCache.set(key, value, finalTTL);
        provider = 'memory';
      }

      // Record metrics
      const latency = Date.now() - startTime;
      this.recordOperation('set', success, latency, provider, error);

      return success;

    } catch (err) {
      const latency = Date.now() - startTime;
      this.recordOperation('set', false, latency, provider, err);
      
      if (options.throwOnError) {
        throw err;
      }
      
      logger.error('Cache set operation failed', { key, error: err.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key, options = {}) {
    this.validateKey(key);
    
    const startTime = Date.now();
    let success = false;
    let provider = null;
    let error = null;

    try {
      // Try both Redis and memory cache to ensure deletion
      const promises = [];
      
      if (this.redisService && this.state.redisAvailable) {
        promises.push(
          this.redisService.del(key).then(() => {
            provider = provider || 'redis';
            return true;
          }).catch(err => {
            error = err;
            return false;
          })
        );
      }

      if (this.memoryCache) {
        promises.push(
          this.memoryCache.del(key).then(() => {
            provider = provider || 'memory';
            return true;
          }).catch(err => {
            error = error || err;
            return false;
          })
        );
      }

      const results = await Promise.allSettled(promises);
      success = results.some(result => result.status === 'fulfilled' && result.value);

      // Record metrics
      const latency = Date.now() - startTime;
      this.recordOperation('del', success, latency, provider, error);

      return success;

    } catch (err) {
      const latency = Date.now() - startTime;
      this.recordOperation('del', false, latency, provider, err);
      
      if (options.throwOnError) {
        throw err;
      }
      
      logger.error('Cache delete operation failed', { key, error: err.message });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key, options = {}) {
    this.validateKey(key);
    
    const startTime = Date.now();
    let exists = false;
    let provider = null;
    let error = null;

    try {
      // Try Redis first if available
      if (this.currentProvider === 'redis' && this.state.redisAvailable) {
        try {
          const result = await this.redisService.exists(key);
          exists = result > 0;
          provider = 'redis';
        } catch (redisError) {
          error = redisError;
          
          // Try fallback if Redis fails
          if (this.memoryCache) {
            exists = await this.memoryCache.exists(key);
            provider = 'memory';
            this.activateFallback();
          }
        }
      } else if (this.currentProvider === 'memory' && this.memoryCache) {
        exists = await this.memoryCache.exists(key);
        provider = 'memory';
      }

      // Record metrics
      const latency = Date.now() - startTime;
      this.recordOperation('exists', true, latency, provider, error);

      return exists;

    } catch (err) {
      const latency = Date.now() - startTime;
      this.recordOperation('exists', false, latency, provider, err);
      
      if (options.throwOnError) {
        throw err;
      }
      
      logger.error('Cache exists operation failed', { key, error: err.message });
      return false;
    }
  }

  /**
   * Clear cache with optional pattern matching
   */
  async clear(pattern = '*', options = {}) {
    const startTime = Date.now();
    let totalCleared = 0;
    let provider = null;
    let error = null;

    try {
      const promises = [];

      // Clear from Redis if available
      if (this.redisService && this.state.redisAvailable) {
        promises.push(
          this.clearRedis(pattern).then(count => {
            provider = provider || 'redis';
            return count;
          }).catch(err => {
            error = err;
            return 0;
          })
        );
      }

      // Clear from memory cache
      if (this.memoryCache) {
        promises.push(
          this.memoryCache.clear(pattern).then(count => {
            provider = provider || 'memory';
            return count;
          }).catch(err => {
            error = error || err;
            return 0;
          })
        );
      }

      const results = await Promise.allSettled(promises);
      totalCleared = results.reduce((sum, result) => {
        return sum + (result.status === 'fulfilled' ? result.value : 0);
      }, 0);

      // Record metrics
      const latency = Date.now() - startTime;
      this.recordOperation('clear', totalCleared > 0, latency, provider, error);

      return totalCleared;

    } catch (err) {
      const latency = Date.now() - startTime;
      this.recordOperation('clear', false, latency, provider, err);
      
      if (options.throwOnError) {
        throw err;
      }
      
      logger.error('Cache clear operation failed', { pattern, error: err.message });
      return 0;
    }
  }

  /**
   * Clear Redis cache with pattern
   */
  async clearRedis(pattern) {
    if (pattern === '*') {
      // Use FLUSHDB for clearing all keys (more efficient)
      await this.redisService.executeOperation('flushDb');
      return 1; // Return 1 to indicate success
    } else {
      // Get keys matching pattern and delete them
      const keys = await this.redisService.keys(pattern);
      if (keys.length > 0) {
        await this.redisService.del(keys);
        return keys.length;
      }
      return 0;
    }
  }

  /**
   * Get cache health status
   */
  async healthCheck() {
    try {
      const redisHealth = this.redisService ? await this.redisService.healthCheck() : null;
      const memoryHealth = this.memoryCache ? await this.memoryCache.healthCheck() : null;
      const overallHealth = this.healthMonitor.getHealthStatus();

      return {
        status: overallHealth.overall.status,
        providers: {
          redis: redisHealth,
          memory: memoryHealth
        },
        current: {
          provider: this.currentProvider,
          fallbackActive: this.state.fallbackActive,
          fallbackType: this.state.fallbackType
        },
        overall: overallHealth,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Cache health check failed', { error: error.message });
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get cache status and statistics
   */
  getStatus() {
    const redisStatus = this.redisService ? this.redisService.getStatus() : null;
    const memoryStats = this.memoryCache ? this.memoryCache.getStats() : null;
    const healthStatus = this.healthMonitor.getHealthStatus();

    return {
      state: { ...this.state },
      currentProvider: this.currentProvider,
      providers: {
        redis: redisStatus,
        memory: memoryStats
      },
      health: healthStatus,
      configuration: {
        redisEnabled: cacheConfig.isRedisEnabled(),
        memoryFallbackEnabled: cacheConfig.isMemoryFallbackEnabled(),
        policies: this.config.policies
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record operation metrics
   */
  recordOperation(operation, success, latency, provider, error) {
    this.state.operationCount++;
    
    // Record in health monitor
    this.healthMonitor.recordOperation(operation, success, latency, error);
    
    // Log operation details
    logger.debug('Cache operation completed', {
      operation,
      success,
      latency,
      provider,
      error: error?.message
    });
  }

  /**
   * Validate cache key
   */
  validateKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a non-empty string');
    }
    
    if (key.length > this.config.policies.maxKeyLength) {
      throw new Error(`Cache key too long (max ${this.config.policies.maxKeyLength} characters)`);
    }
  }

  /**
   * Validate cache value
   */
  validateValue(value) {
    if (value === undefined) {
      throw new Error('Cache value cannot be undefined');
    }
    
    const serialized = JSON.stringify(value);
    if (serialized.length > this.config.policies.maxValueSize) {
      throw new Error(`Cache value too large (max ${this.config.policies.maxValueSize} bytes)`);
    }
  }

  /**
   * Force fallback activation (for testing/admin)
   */
  forceFallback() {
    this.activateFallback();
    logger.info('Fallback cache manually activated');
  }

  /**
   * Force Redis reconnection attempt
   */
  async forceRedisReconnect() {
    if (this.redisService) {
      try {
        await this.redisService.connect();
        logger.info('Redis reconnection forced successfully');
      } catch (error) {
        logger.error('Forced Redis reconnection failed', { error: error.message });
        throw error;
      }
    } else {
      throw new Error('Redis service not available');
    }
  }

  /**
   * Shutdown cache manager
   */
  async shutdown() {
    logger.info('Shutting down cache manager...');

    try {
      // Stop health monitoring
      if (this.healthMonitor) {
        this.healthMonitor.shutdown();
      }

      // Close Redis connection
      if (this.redisService) {
        await this.redisService.close();
      }

      // Shutdown memory cache
      if (this.memoryCache) {
        this.memoryCache.shutdown();
      }

      logger.info('Cache manager shutdown completed');

    } catch (error) {
      logger.error('Error during cache manager shutdown', { error: error.message });
      throw error;
    }
  }
}

module.exports = CacheManager;