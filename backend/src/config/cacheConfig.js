/**
 * Cache Configuration Manager
 * Centralized configuration for Redis and fallback caching systems
 */

const { logger } = require('../utils/logger');

class CacheConfigManager {
  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Load configuration from environment variables with sensible defaults
   */
  loadConfiguration() {
    const config = {
      redis: {
        enabled: this.parseBoolean(process.env.REDIS_ENABLED, true),
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        url: process.env.REDIS_URL || undefined,
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY) || 1000,
        circuitBreakerThreshold: parseInt(process.env.REDIS_CIRCUIT_BREAKER_THRESHOLD) || 5,
        connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT) || 5000,
        commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 3000,
        reconnectOnFailover: this.parseBoolean(process.env.REDIS_RECONNECT_ON_FAILOVER, true),
        lazyConnect: this.parseBoolean(process.env.REDIS_LAZY_CONNECT, true)
      },
      fallback: {
        memory: {
          enabled: this.parseBoolean(process.env.FALLBACK_MEMORY_ENABLED, true),
          maxSize: parseInt(process.env.FALLBACK_MEMORY_MAX_SIZE) || 100 * 1024 * 1024, // 100MB
          maxEntries: parseInt(process.env.FALLBACK_MEMORY_MAX_ENTRIES) || 10000,
          ttlCheckInterval: parseInt(process.env.FALLBACK_MEMORY_TTL_CHECK_INTERVAL) || 60000, // 1 minute
          cleanupThreshold: parseFloat(process.env.FALLBACK_MEMORY_CLEANUP_THRESHOLD) || 0.8 // 80%
        },
        file: {
          enabled: this.parseBoolean(process.env.FALLBACK_FILE_ENABLED, false),
          directory: process.env.FALLBACK_FILE_DIRECTORY || './cache',
          maxSize: parseInt(process.env.FALLBACK_FILE_MAX_SIZE) || 500 * 1024 * 1024, // 500MB
          cleanupInterval: parseInt(process.env.FALLBACK_FILE_CLEANUP_INTERVAL) || 3600000 // 1 hour
        }
      },
      policies: {
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 300, // 5 minutes
        fallbackTTL: parseInt(process.env.CACHE_FALLBACK_TTL) || 180, // 3 minutes
        healthCheckInterval: parseInt(process.env.CACHE_HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
        maxKeyLength: parseInt(process.env.CACHE_MAX_KEY_LENGTH) || 250,
        maxValueSize: parseInt(process.env.CACHE_MAX_VALUE_SIZE) || 1024 * 1024, // 1MB
        compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD) || 1024 // 1KB
      },
      monitoring: {
        enabled: this.parseBoolean(process.env.CACHE_MONITORING_ENABLED, true),
        metricsInterval: parseInt(process.env.CACHE_METRICS_INTERVAL) || 60000, // 1 minute
        logLevel: process.env.CACHE_LOG_LEVEL || 'info',
        alertThresholds: {
          errorRate: parseFloat(process.env.CACHE_ALERT_ERROR_RATE) || 0.1, // 10%
          latency: parseInt(process.env.CACHE_ALERT_LATENCY) || 1000, // 1 second
          memoryUsage: parseFloat(process.env.CACHE_ALERT_MEMORY_USAGE) || 0.9 // 90%
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
        isProduction: (process.env.NODE_ENV || 'development') === 'production',
        isTest: (process.env.NODE_ENV || 'development') === 'test'
      }
    };

    // Disable Redis in test environment by default unless explicitly enabled
    if (config.environment.isTest && process.env.REDIS_ENABLED === undefined) {
      config.redis.enabled = false;
    }

    return config;
  }

  /**
   * Parse boolean environment variables with default fallback
   */
  parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    const stringValue = String(value).toLowerCase().trim();
    return ['true', '1', 'yes', 'on', 'enabled'].includes(stringValue);
  }

  /**
   * Validate configuration and log warnings for potential issues
   */
  validateConfiguration() {
    const warnings = [];
    const errors = [];

    // Redis validation
    if (this.config.redis.enabled) {
      if (!this.config.redis.url && (!this.config.redis.host || !this.config.redis.port)) {
        errors.push('Redis is enabled but neither REDIS_URL nor REDIS_HOST/REDIS_PORT are properly configured');
      }

      if (this.config.redis.maxRetries < 0) {
        warnings.push('Redis maxRetries is negative, setting to 0');
        this.config.redis.maxRetries = 0;
      }

      if (this.config.redis.retryDelay < 100) {
        warnings.push('Redis retryDelay is very low, consider increasing for production');
      }
    }

    // Fallback validation
    if (!this.config.fallback.memory.enabled && !this.config.fallback.file.enabled) {
      if (this.config.redis.enabled) {
        warnings.push('No fallback cache enabled - application may fail if Redis becomes unavailable');
      } else {
        errors.push('Redis is disabled and no fallback cache is enabled - caching will not work');
      }
    }

    // Memory fallback validation
    if (this.config.fallback.memory.enabled) {
      if (this.config.fallback.memory.maxSize < 1024 * 1024) { // 1MB
        warnings.push('Memory cache maxSize is very small, consider increasing');
      }

      if (this.config.fallback.memory.maxEntries < 100) {
        warnings.push('Memory cache maxEntries is very small, consider increasing');
      }
    }

    // Policy validation
    if (this.config.policies.defaultTTL <= 0) {
      warnings.push('Default TTL is zero or negative, cached items will expire immediately');
    }

    if (this.config.policies.maxValueSize > 10 * 1024 * 1024) { // 10MB
      warnings.push('Max value size is very large, this may impact performance');
    }

    // Log validation results
    if (errors.length > 0) {
      logger.error('Cache configuration errors:', { errors });
      throw new Error(`Cache configuration errors: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      logger.warn('Cache configuration warnings:', { warnings });
    }

    logger.info('Cache configuration loaded successfully', {
      redisEnabled: this.config.redis.enabled,
      memoryFallbackEnabled: this.config.fallback.memory.enabled,
      fileFallbackEnabled: this.config.fallback.file.enabled,
      environment: this.config.environment.nodeEnv
    });
  }

  /**
   * Get Redis connection configuration
   */
  getRedisConfig() {
    if (!this.config.redis.enabled) {
      return null;
    }

    const redisConfig = {
      socket: {
        host: this.config.redis.host,
        port: this.config.redis.port,
        connectTimeout: this.config.redis.connectionTimeout,
        commandTimeout: this.config.redis.commandTimeout,
        reconnectStrategy: (retries) => {
          if (retries >= this.config.redis.maxRetries) {
            logger.warn(`Redis reconnection failed after ${retries} attempts`);
            return false;
          }
          
          const delay = Math.min(
            this.config.redis.retryDelay * Math.pow(2, retries), // Exponential backoff
            30000 // Max 30 seconds
          );
          
          logger.info(`Redis reconnection attempt ${retries + 1} in ${delay}ms`);
          return delay;
        }
      },
      password: this.config.redis.password,
      lazyConnect: this.config.redis.lazyConnect,
      reconnectOnFailover: this.config.redis.reconnectOnFailover
    };

    // Use URL if provided (takes precedence)
    if (this.config.redis.url) {
      return {
        url: this.config.redis.url,
        socket: {
          connectTimeout: this.config.redis.connectionTimeout,
          commandTimeout: this.config.redis.commandTimeout,
          reconnectStrategy: redisConfig.socket.reconnectStrategy
        },
        lazyConnect: this.config.redis.lazyConnect,
        reconnectOnFailover: this.config.redis.reconnectOnFailover
      };
    }

    return redisConfig;
  }

  /**
   * Get memory cache configuration
   */
  getMemoryCacheConfig() {
    return this.config.fallback.memory;
  }

  /**
   * Get file cache configuration
   */
  getFileCacheConfig() {
    return this.config.fallback.file;
  }

  /**
   * Get cache policies
   */
  getPolicies() {
    return this.config.policies;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return this.config.monitoring;
  }

  /**
   * Check if Redis is enabled
   */
  isRedisEnabled() {
    return this.config.redis.enabled;
  }

  /**
   * Check if memory fallback is enabled
   */
  isMemoryFallbackEnabled() {
    return this.config.fallback.memory.enabled;
  }

  /**
   * Check if file fallback is enabled
   */
  isFileFallbackEnabled() {
    return this.config.fallback.file.enabled;
  }

  /**
   * Get environment information
   */
  getEnvironment() {
    return this.config.environment;
  }

  /**
   * Update configuration at runtime (for specific settings)
   */
  updateConfig(path, value) {
    const pathArray = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    const oldValue = current[pathArray[pathArray.length - 1]];
    current[pathArray[pathArray.length - 1]] = value;
    
    logger.info('Cache configuration updated', {
      path,
      oldValue,
      newValue: value
    });

    // Re-validate after update
    this.validateConfiguration();
  }

  /**
   * Get full configuration (for debugging/monitoring)
   */
  getFullConfig() {
    // Return a deep copy to prevent external modifications
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get configuration summary for health checks
   */
  getConfigSummary() {
    return {
      redis: {
        enabled: this.config.redis.enabled,
        host: this.config.redis.enabled ? this.config.redis.host : null,
        port: this.config.redis.enabled ? this.config.redis.port : null
      },
      fallback: {
        memory: this.config.fallback.memory.enabled,
        file: this.config.fallback.file.enabled
      },
      environment: this.config.environment.nodeEnv,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new CacheConfigManager();