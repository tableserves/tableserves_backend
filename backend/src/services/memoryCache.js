/**
 * In-Memory Cache Service
 * LRU cache implementation with TTL support for fallback caching
 */

const { logger } = require('../utils/logger');

class MemoryCacheService {
  constructor(config = {}) {
    this.config = {
      maxSize: config.maxSize || 100 * 1024 * 1024, // 100MB
      maxEntries: config.maxEntries || 10000,
      ttlCheckInterval: config.ttlCheckInterval || 60000, // 1 minute
      cleanupThreshold: config.cleanupThreshold || 0.8, // 80%
      enabled: config.enabled !== false
    };

    // Cache storage
    this.cache = new Map();
    this.accessOrder = new Map(); // For LRU tracking
    this.sizeTracker = 0;
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;

    // TTL cleanup interval
    this.ttlInterval = null;
    
    if (this.config.enabled) {
      this.startTTLCleanup();
      logger.info('Memory cache service initialized', {
        maxSize: this.config.maxSize,
        maxEntries: this.config.maxEntries
      });
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    entry.accessedAt = Date.now();
    this.hitCount++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = null) {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const serializedValue = this.serialize(value);
      const valueSize = this.calculateSize(serializedValue);
      
      // Check if single value exceeds max size
      if (valueSize > this.config.maxSize) {
        logger.warn('Value too large for memory cache', { key, size: valueSize });
        return false;
      }

      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        this.delete(key);
      }

      // Ensure we have space
      await this.ensureSpace(valueSize);

      const now = Date.now();
      const entry = {
        value: serializedValue,
        size: valueSize,
        createdAt: now,
        accessedAt: now,
        expiresAt: ttl ? now + (ttl * 1000) : null
      };

      this.cache.set(key, entry);
      this.updateAccessOrder(key);
      this.sizeTracker += valueSize;

      return true;
    } catch (error) {
      logger.error('Error setting memory cache value', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    return this.delete(key);
  }

  /**
   * Delete value from cache (internal method)
   */
  delete(key) {
    if (!this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.sizeTracker -= entry.size;
      return true;
    }
    return false;
  }

  /**
   * Check if key exists in cache
   */
  async exists(key) {
    if (!this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear cache with optional pattern matching
   */
  async clear(pattern = '*') {
    if (!this.config.enabled) {
      return 0;
    }

    let deletedCount = 0;

    if (pattern === '*') {
      // Clear all
      deletedCount = this.cache.size;
      this.cache.clear();
      this.accessOrder.clear();
      this.sizeTracker = 0;
    } else {
      // Pattern matching (simple glob support)
      const regex = this.globToRegex(pattern);
      const keysToDelete = [];

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        if (this.delete(key)) {
          deletedCount++;
        }
      }
    }

    logger.debug('Memory cache cleared', { pattern, deletedCount });
    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      enabled: this.config.enabled,
      entries: this.cache.size,
      size: this.sizeTracker,
      maxSize: this.config.maxSize,
      maxEntries: this.config.maxEntries,
      hitCount: this.hitCount,
      missCount: this.missCount,
      evictionCount: this.evictionCount,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.config.maxSize > 0 ? this.sizeTracker / this.config.maxSize : 0,
      entryUsage: this.config.maxEntries > 0 ? this.cache.size / this.config.maxEntries : 0
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.config.enabled) {
      return {
        status: 'disabled',
        timestamp: new Date().toISOString()
      };
    }

    const stats = this.getStats();
    const isHealthy = stats.memoryUsage < 0.95 && stats.entryUsage < 0.95;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Serialize value for storage
   */
  serialize(value) {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Deserialize value from storage
   */
  deserialize(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not valid JSON
      }
    }
    return value;
  }

  /**
   * Calculate approximate size of value in bytes
   */
  calculateSize(value) {
    if (typeof value === 'string') {
      return Buffer.byteLength(value, 'utf8');
    }
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  }

  /**
   * Check if entry is expired
   */
  isExpired(entry) {
    return entry.expiresAt && Date.now() > entry.expiresAt;
  }

  /**
   * Update access order for LRU
   */
  updateAccessOrder(key) {
    // Remove from current position
    this.accessOrder.delete(key);
    // Add to end (most recently used)
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Ensure we have enough space for new entry
   */
  async ensureSpace(requiredSize) {
    // Check if we need to make space
    while (
      (this.sizeTracker + requiredSize > this.config.maxSize) ||
      (this.cache.size >= this.config.maxEntries)
    ) {
      if (!this.evictLRU()) {
        // If we can't evict anything, we're at capacity
        throw new Error('Cannot make space in memory cache');
      }
    }

    // Trigger cleanup if we're above threshold
    if (this.sizeTracker / this.config.maxSize > this.config.cleanupThreshold) {
      this.cleanupExpired();
    }
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    if (this.accessOrder.size === 0) {
      return false;
    }

    // Get the least recently used key (first in the Map)
    const lruKey = this.accessOrder.keys().next().value;
    
    if (this.delete(lruKey)) {
      this.evictionCount++;
      logger.debug('Evicted LRU entry from memory cache', { key: lruKey });
      return true;
    }

    return false;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired entries from memory cache', { count: cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Start TTL cleanup interval
   */
  startTTLCleanup() {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
    }

    this.ttlInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.config.ttlCheckInterval);
  }

  /**
   * Stop TTL cleanup interval
   */
  stopTTLCleanup() {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
      this.ttlInterval = null;
    }
  }

  /**
   * Convert glob pattern to regex
   */
  globToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .
    
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Shutdown cache service
   */
  shutdown() {
    this.stopTTLCleanup();
    this.cache.clear();
    this.accessOrder.clear();
    this.sizeTracker = 0;
    logger.info('Memory cache service shutdown');
  }

  /**
   * Get all keys (for debugging - use with caution)
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size info
   */
  getSizeInfo() {
    return {
      entries: this.cache.size,
      sizeBytes: this.sizeTracker,
      maxSizeBytes: this.config.maxSize,
      maxEntries: this.config.maxEntries,
      utilizationPercent: {
        size: Math.round((this.sizeTracker / this.config.maxSize) * 100),
        entries: Math.round((this.cache.size / this.config.maxEntries) * 100)
      }
    };
  }
}

module.exports = MemoryCacheService;