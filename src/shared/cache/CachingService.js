/**
 * Enhanced Caching Service for TableServe Application
 * 
 * This service provides a sophisticated caching layer that:
 * 1. Reduces direct localStorage usage
 * 2. Works seamlessly with RTK Query
 * 3. Provides intelligent cache management
 * 4. Handles offline scenarios gracefully
 */

import { logger } from '../logging/logger';

class CachingService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheMetadata = new Map();
    this.maxMemoryCacheSize = 100; // Maximum number of items in memory cache
    this.defaultTTL = 15 * 60 * 1000; // 15 minutes default TTL
    this.persistentKeys = new Set(); // No localStorage persistence
    
    this.realTimeService = null;
    this.realTimeSubscriptions = new Map();
    
    this.init();
  }

  /**
   * Initialize the caching service
   */
  init() {
    try {
      // Load essential data from localStorage to memory cache
      this.loadEssentialData();
      
      // Set up periodic cleanup
      this.setupCleanup();
      
      // Set up before unload handler to save critical data
      this.setupBeforeUnload();
      
      logger.info('Caching service initialized', {
        memoryCacheSize: this.memoryCache.size,
        persistentKeysCount: this.persistentKeys.size
      }, 'CachingService');
    } catch (error) {
      logger.error('Failed to initialize caching service', error, 'CachingService');
    }
  }

  /**
   * Initialize real-time service integration
   * @param {RealTimeService} realTimeService - Instance of RealTimeService
   */
  initializeRealTime(realTimeService) {
    this.realTimeService = realTimeService;
    logger.info('Real-time service integration initialized', {}, 'CachingService');
  }

  /**
   * Subscribe to real-time updates for a key
   * @param {string} key - Cache key to subscribe to
   */
  subscribeToUpdates(key) {
    if (!this.realTimeService || this.realTimeSubscriptions.has(key)) return;

    const callback = (data) => {
      this.set(key, data);
      logger.debug('Cache updated from real-time event', { key }, 'CachingService');
    };

    this.realTimeService.subscribeToUpdates(key, callback);
    this.realTimeSubscriptions.set(key, callback);
  }

  /**
   * Unsubscribe from real-time updates for a key
   * @param {string} key - Cache key to unsubscribe from
   */
  unsubscribeFromUpdates(key) {
    const callback = this.realTimeSubscriptions.get(key);
    if (callback && this.realTimeService) {
      this.realTimeService.unsubscribeFromUpdates(key, callback);
      this.realTimeSubscriptions.delete(key);
      logger.debug('Unsubscribed from real-time updates', { key }, 'CachingService');
    }
  }

  /**
   * Get data from cache (memory first, then localStorage if persistent)
   * @param {string} key - Cache key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Cached value or default
   */
  async get(key, defaultValue = null) {
    try {
      // Try to fetch from real-time service first
      if (this.realTimeService?.isConnected) {
        try {
          const data = await this.realTimeService.fetchData(key);
          if (data !== undefined) {
            // Update cache with fresh data
            this.set(key, data);
            return data;
          }
        } catch (error) {
          logger.warn('Failed to fetch from real-time service', { key, error }, 'CachingService');
        }
      }

      // Check memory cache
      if (this.memoryCache.has(key)) {
        const item = this.memoryCache.get(key);
        
        // Check if expired
        if (this.isExpired(key)) {
          this.delete(key);
          return defaultValue;
        }
        
        // Update access time
        this.updateAccessTime(key);
        
        logger.debug('Cache hit (memory)', { key }, 'CachingService');
        return item.data;
      }
      
      // No localStorage persistence - memory cache only
      
      logger.debug('Cache miss', { key }, 'CachingService');
      return defaultValue;
    } catch (error) {
      logger.error('Failed to get from cache', error, 'CachingService');
      return defaultValue;
    }
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      // Try to update real-time service first
      if (this.realTimeService?.isConnected) {
        try {
          await this.realTimeService.updateData(key, data);
          logger.debug('Data updated in real-time service', { key }, 'CachingService');
        } catch (error) {
          logger.warn('Failed to update real-time service', { key, error }, 'CachingService');
        }
      }

      const expiresAt = Date.now() + ttl;
      
      // Set in memory cache only
      this.setMemoryCache(key, data, expiresAt);
      logger.debug('Cache set (memory only)', { key, ttl }, 'CachingService');
      
      // Clean up if memory cache is too large
      this.enforceMemoryCacheLimit();
    } catch (error) {
      logger.error('Failed to set cache', error, 'CachingService');
    }
  }

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      this.cacheMetadata.delete(key);
      
      // Remove from localStorage if persistent
      if (this.persistentKeys.has(key)) {
        localStorage.removeItem(`tableserve_cache_${key}`);
      }
      
      logger.debug('Cache deleted', { key }, 'CachingService');
    } catch (error) {
      logger.error('Failed to delete from cache', error, 'CachingService');
    }
  }

  /**
   * Clear all cache data
   * @param {boolean} includePersistent - Whether to clear persistent data too
   */
  clear(includePersistent = false) {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.cacheMetadata.clear();
      
      if (includePersistent) {
        // Clear persistent cache from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('tableserve_cache_')) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        logger.info('All cache cleared (including persistent)', {}, 'CachingService');
      } else {
        logger.info('Memory cache cleared', {}, 'CachingService');
      }
    } catch (error) {
      logger.error('Failed to clear cache', error, 'CachingService');
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists
   */
  has(key) {
    return this.memoryCache.has(key) || 
           (this.persistentKeys.has(key) && localStorage.getItem(`tableserve_cache_${key}`) !== null);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const memoryItems = this.memoryCache.size;
    let persistentItems = 0;
    let totalLocalStorageSize = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tableserve_cache_')) {
          persistentItems++;
          totalLocalStorageSize += new Blob([localStorage.getItem(key)]).size;
        }
      }
    } catch (error) {
      logger.warn('Failed to calculate localStorage stats', error, 'CachingService');
    }
    
    return {
      memoryItems,
      persistentItems,
      totalItems: memoryItems + persistentItems,
      localStorageSizeKB: Math.round(totalLocalStorageSize / 1024),
      memoryUsageEstimateKB: Math.round(memoryItems * 0.5), // Rough estimate
    };
  }

  /**
   * Manually trigger cache cleanup
   */
  cleanup() {
    try {
      let cleanedCount = 0;
      
      // Clean expired items from memory cache
      for (const [key] of this.memoryCache) {
        if (this.isExpired(key)) {
          this.delete(key);
          cleanedCount++;
        }
      }
      
      // Clean expired items from localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const storageKey = localStorage.key(i);
        if (storageKey && storageKey.startsWith('tableserve_cache_')) {
          try {
            const item = JSON.parse(localStorage.getItem(storageKey));
            if (item.expiresAt && Date.now() > item.expiresAt) {
              localStorage.removeItem(storageKey);
              cleanedCount++;
            }
          } catch (error) {
            // Remove corrupted items
            localStorage.removeItem(storageKey);
            cleanedCount++;
          }
        }
      }
      
      logger.info('Cache cleanup completed', { cleanedCount }, 'CachingService');
      return cleanedCount;
    } catch (error) {
      logger.error('Cache cleanup failed', error, 'CachingService');
      return 0;
    }
  }

  /**
   * Add a key to persistent storage
   * @param {string} key - Key to make persistent
   */
  makePersistent(key) {
    this.persistentKeys.add(key);
    
    // If the key is currently in memory cache, also save to localStorage
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      const metadata = this.cacheMetadata.get(key);
      
      const cacheItem = {
        data: item.data,
        expiresAt: metadata?.expiresAt,
        createdAt: metadata?.createdAt || Date.now()
      };
      
      localStorage.setItem(`tableserve_cache_${key}`, JSON.stringify(cacheItem));
    }
  }

  /**
   * Remove a key from persistent storage
   * @param {string} key - Key to make non-persistent
   */
  makeTemporary(key) {
    this.persistentKeys.delete(key);
    localStorage.removeItem(`tableserve_cache_${key}`);
  }

  // ===== PRIVATE METHODS =====

  setMemoryCache(key, data, expiresAt) {
    this.memoryCache.set(key, { data });
    this.cacheMetadata.set(key, {
      expiresAt,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 1
    });
  }

  isExpired(key) {
    const metadata = this.cacheMetadata.get(key);
    return metadata && metadata.expiresAt && Date.now() > metadata.expiresAt;
  }

  updateAccessTime(key) {
    const metadata = this.cacheMetadata.get(key);
    if (metadata) {
      metadata.accessedAt = Date.now();
      metadata.accessCount = (metadata.accessCount || 0) + 1;
    }
  }

  enforceMemoryCacheLimit() {
    if (this.memoryCache.size <= this.maxMemoryCacheSize) {
      return;
    }

    // Remove least recently accessed items
    const entries = Array.from(this.cacheMetadata.entries())
      .filter(([key]) => !this.persistentKeys.has(key)) // Don't remove persistent keys
      .sort(([, a], [, b]) => a.accessedAt - b.accessedAt);

    const itemsToRemove = entries.slice(0, this.memoryCache.size - this.maxMemoryCacheSize);
    
    itemsToRemove.forEach(([key]) => {
      this.memoryCache.delete(key);
      this.cacheMetadata.delete(key);
    });

    logger.debug('Memory cache limit enforced', { 
      removedCount: itemsToRemove.length,
      currentSize: this.memoryCache.size 
    }, 'CachingService');
  }

  loadEssentialData() {
    // Load persistent keys from localStorage to memory for faster access
    this.persistentKeys.forEach(key => {
      const stored = localStorage.getItem(`tableserve_cache_${key}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.expiresAt || Date.now() <= parsed.expiresAt) {
            this.setMemoryCache(key, parsed.data, parsed.expiresAt);
          }
        } catch (error) {
          logger.warn('Failed to load essential data', { key, error }, 'CachingService');
        }
      }
    });
  }

  setupCleanup() {
    // Clean up expired items every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      // Save critical memory-only data to localStorage before page unload
      const criticalKeys = ['ui_auth_token', 'ui_auth_user'];
      
      criticalKeys.forEach(key => {
        if (this.memoryCache.has(key) && !localStorage.getItem(`tableserve_cache_${key}`)) {
          const item = this.memoryCache.get(key);
          const metadata = this.cacheMetadata.get(key);
          
          const cacheItem = {
            data: item.data,
            expiresAt: metadata?.expiresAt,
            createdAt: metadata?.createdAt || Date.now()
          };
          
          localStorage.setItem(`tableserve_cache_${key}`, JSON.stringify(cacheItem));
        }
      });
    });
  }
}

// Create singleton instance
const cachingService = new CachingService();

export default cachingService;