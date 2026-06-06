import { logger } from '../logging/logger';

/**
 * Frontend Cache Service
 * Provides client-side caching with TTL and storage management
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlTimers = new Map();
    this.maxSize = 1000; // Maximum number of cache entries
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    this.init();
  }

  init() {
    // Clean up expired entries periodically
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute

    logger.debug(
      'CacheService initialized',
      {
        maxSize: this.maxSize,
        defaultTTL: this.defaultTTL
      },
      'CacheService'
    );
  }

  /**
   * Get value from cache
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      logger.debug('Cache miss', { key }, 'CacheService');
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      this.metrics.misses++;
      logger.debug('Cache miss (expired)', { key }, 'CacheService');
      return null;
    }

    // Update access time
    entry.lastAccessed = Date.now();

    this.metrics.hits++;
    logger.debug('Cache hit', { key }, 'CacheService');

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    try {
      // Check cache size and evict if necessary
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      const cacheTTL = ttl || this.defaultTTL;
      const expiresAt = cacheTTL > 0 ? Date.now() + cacheTTL : null;

      const entry = {
        value,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt
      };

      // Clear existing TTL timer if exists
      if (this.ttlTimers.has(key)) {
        clearTimeout(this.ttlTimers.get(key));
      }

      // Set new TTL timer
      if (expiresAt) {
        const timer = setTimeout(() => {
          this.delete(key);
        }, cacheTTL);

        this.ttlTimers.set(key, timer);
      }

      this.cache.set(key, entry);
      this.metrics.sets++;

      logger.debug(
        'Cache set',
        {
          key,
          ttl: cacheTTL,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
        },
        'CacheService'
      );

      return true;
    } catch (error) {
      logger.error('Cache set failed', { key, error }, 'CacheService');
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    const existed = this.cache.delete(key);

    if (existed) {
      this.metrics.deletes++;

      // Clear TTL timer
      if (this.ttlTimers.has(key)) {
        clearTimeout(this.ttlTimers.get(key));
        this.ttlTimers.delete(key);
      }

      logger.debug('Cache delete', { key }, 'CacheService');
    }

    return existed;
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;

    // Clear all TTL timers
    this.ttlTimers.forEach((timer) => clearTimeout(timer));
    this.ttlTimers.clear();

    this.cache.clear();

    logger.debug('Cache cleared', { entriesCleared: size }, 'CacheService');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.metrics.hits + this.metrics.misses > 0
        ? (
            (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) *
            100
          ).toFixed(2)
        : '0.00';

    return {
      ...this.metrics,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache) {
      // Rough estimation
      totalSize += key.length * 2; // Assuming 2 bytes per character
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64; // Overhead for entry object
    }

    return {
      bytes: totalSize,
      mb: (totalSize / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.metrics.evictions++;
      logger.debug('Cache LRU eviction', { key: lruKey }, 'CacheService');
    }
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(
        'Cache cleanup',
        { expiredKeys: expiredKeys.length },
        'CacheService'
      );
    }
  }

  /**
   * Cache with automatic refresh
   */
  async getOrSet(key, fetchFunction, ttl = null) {
    // Try to get from cache first
    let value = this.get(key);

    if (value !== null) {
      return value;
    }

    try {
      // Fetch from source
      logger.debug('Cache miss, fetching from source', { key }, 'CacheService');
      value = await fetchFunction();

      if (value !== null && value !== undefined) {
        // Cache the result
        this.set(key, value, ttl);
      }

      return value;
    } catch (error) {
      logger.error('Cache getOrSet failed', { key, error }, 'CacheService');
      throw error;
    }
  }

  /**
   * Cache with tags for bulk invalidation
   */
  setWithTags(key, value, tags = [], ttl = null) {
    // Set the main value
    this.set(key, value, ttl);

    // Maintain tag associations
    tags.forEach((tag) => {
      const tagKey = `__tag__${tag}`;
      let taggedKeys = this.get(tagKey) || new Set();

      if (!(taggedKeys instanceof Set)) {
        taggedKeys = new Set(taggedKeys);
      }

      taggedKeys.add(key);
      this.set(tagKey, taggedKeys, ttl);
    });

    logger.debug('Cache set with tags', { key, tags }, 'CacheService');
  }

  /**
   * Invalidate cache by tags
   */
  invalidateByTag(tag) {
    const tagKey = `__tag__${tag}`;
    const taggedKeys = this.get(tagKey);

    if (taggedKeys) {
      const keysArray = Array.from(taggedKeys);
      keysArray.forEach((key) => this.delete(key));
      this.delete(tagKey);

      logger.debug(
        'Cache invalidated by tag',
        {
          tag,
          keysInvalidated: keysArray.length
        },
        'CacheService'
      );

      return keysArray.length;
    }

    return 0;
  }

  /**
   * Bulk delete keys by pattern
   */
  deletePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));

    logger.debug(
      'Cache pattern delete',
      {
        pattern,
        keysDeleted: keysToDelete.length
      },
      'CacheService'
    );

    return keysToDelete.length;
  }

  /**
   * Export cache for debugging
   */
  export() {
    const exported = {};

    for (const [key, entry] of this.cache) {
      exported[key] = {
        value: entry.value,
        createdAt: new Date(entry.createdAt).toISOString(),
        lastAccessed: new Date(entry.lastAccessed).toISOString(),
        expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString() : null
      };
    }

    return exported;
  }
}

// Cache key generators
export const CacheKeys = {
  // Orders
  liveOrders: (filters = {}) => {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `live-orders${filterStr ? `|${filterStr}` : ''}`;
  },

  orderHistory: (filters = {}, page = 1, limit = 20) => {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `order-history|${filterStr}|page:${page}|limit:${limit}`;
  },

  order: (orderId) => `order:${orderId}`,
  orderStats: (filters = {}) => {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `order-stats${filterStr ? `|${filterStr}` : ''}`;
  },

  // Menu
  menu: (entityType, entityId) => `menu:${entityType}:${entityId}`,
  menuItem: (itemId) => `menu-item:${itemId}`,

  // User data
  user: (userId) => `user:${userId}`,
  userProfile: (userId) => `user-profile:${userId}`,

  // Analytics
  analytics: (entityType, entityId, period) =>
    `analytics:${entityType}:${entityId}:${period}`,

  // Restaurant/Zone data
  restaurant: (restaurantId) => `restaurant:${restaurantId}`,
  zone: (zoneId) => `zone:${zoneId}`,
  shop: (shopId) => `shop:${shopId}`
};

// TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  DAILY: 24 * 60 * 60 * 1000 // 24 hours
};

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
export { CacheService };
