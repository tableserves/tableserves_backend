/**
 * Simple Cache Service - No Redis, No Complexity
 * Just a basic in-memory cache that never fails
 */

const { logger } = require('../utils/logger');

class SimpleCacheService {
  constructor() {
    this.cache = new Map();
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    
    logger.info('Simple cache service initialized', { enabled: this.enabled });
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.enabled) return null;
    
    try {
      const entry = this.cache.get(key);
      if (!entry) return null;
      
      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
      }
      
      return entry.value;
    } catch (error) {
      logger.debug('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttlSeconds = 300) {
    if (!this.enabled) return true;
    
    try {
      const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
      this.cache.set(key, { value, expiresAt });
      return true;
    } catch (error) {
      logger.debug('Cache set error', { key, error: error.message });
      return true; // Always return true to not break the app
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.enabled) return true;
    
    try {
      return this.cache.delete(key);
    } catch (error) {
      logger.debug('Cache delete error', { key, error: error.message });
      return true;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.enabled) return false;
    
    try {
      const entry = this.cache.get(key);
      if (!entry) return false;
      
      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.debug('Cache exists error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear cache
   */
  async clear(pattern = '*') {
    if (!this.enabled) return 0;
    
    try {
      if (pattern === '*') {
        const size = this.cache.size;
        this.cache.clear();
        return size;
      }
      
      // Simple pattern matching for keys starting with pattern (without *)
      const searchPattern = pattern.replace('*', '');
      let deleted = 0;
      
      for (const key of this.cache.keys()) {
        if (key.startsWith(searchPattern)) {
          this.cache.delete(key);
          deleted++;
        }
      }
      
      return deleted;
    } catch (error) {
      logger.debug('Cache clear error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      enabled: this.enabled,
      entries: this.cache.size,
      type: 'simple-memory'
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      enabled: this.enabled,
      entries: this.cache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    if (!this.enabled) return;
    
    try {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      logger.debug('Cache cleanup error', { error: error.message });
    }
  }

  /**
   * Shutdown
   */
  shutdown() {
    this.cache.clear();
    logger.info('Simple cache service shutdown');
  }
}

module.exports = SimpleCacheService;