/**
 * Storage Initialization Service for TableServe Application
 * 
 * This service handles the initialization and setup of the enhanced storage system,
 * including migration from legacy localStorage usage to the new caching service.
 */

import storageMigrationService from './StorageMigrationService';
import cachingService from './CachingService';
import dataAccessLayer from './DataAccessLayer';
import logger from './LoggingService';

class StorageInitializationService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the storage system
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, alreadyInitialized: true };
    }

    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return await this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  async performInitialization() {
    const startTime = performance.now();
    
    try {
      logger.info('Starting storage system initialization', {}, 'StorageInitializationService');

      // Step 1: Check and perform migration if needed
      const migrationResult = await storageMigrationService.migrate();
      
      // Step 2: Initialize caching service (already done in constructor)
      // The caching service is already initialized when imported
      
      // Step 3: Pre-warm cache with essential data
      await this.prewarmCache();
      
      // Step 4: Set up periodic maintenance
      this.setupMaintenance();
      
      // Step 5: Set up performance monitoring
      this.setupPerformanceMonitoring();

      const duration = performance.now() - startTime;
      
      this.isInitialized = true;
      
      const result = {
        success: true,
        duration,
        migration: migrationResult,
        cacheStats: cachingService.getStats(),
        storageStats: dataAccessLayer.getStorageStats()
      };

      logger.info('Storage system initialization completed', result, 'StorageInitializationService');
      
      return result;
    } catch (error) {
      logger.error('Storage system initialization failed', error, 'StorageInitializationService');
      return { success: false, error: error.message };
    }
  }

  /**
   * Pre-warm cache with essential data
   */
  async prewarmCache() {
    try {
      logger.debug('Pre-warming cache with essential data', {}, 'StorageInitializationService');
      
      // Pre-load critical data that's frequently accessed
      const criticalData = [
        { key: 'tableserve_restaurants', method: () => dataAccessLayer.getRestaurants() },
        { key: 'tableserve_zones', method: () => dataAccessLayer.getZones() },
        { key: 'tableserve_shop_credentials', method: () => dataAccessLayer.getData('tableserve_preserved_shop_credentials', {}) },
      ];

      for (const { key, method } of criticalData) {
        try {
          const data = method();
          if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            // Data is already cached by the getData call
            logger.debug('Pre-warmed cache', { key, hasData: true }, 'StorageInitializationService');
          }
        } catch (error) {
          logger.warn('Failed to pre-warm cache item', { key, error }, 'StorageInitializationService');
        }
      }
    } catch (error) {
      logger.error('Cache pre-warming failed', error, 'StorageInitializationService');
    }
  }

  /**
   * Set up periodic maintenance tasks
   */
  setupMaintenance() {
    try {
      // Clean up cache every 10 minutes
      setInterval(() => {
        try {
          const cleanedCount = cachingService.cleanup();
          if (cleanedCount > 0) {
            logger.debug('Periodic cache cleanup completed', { cleanedCount }, 'StorageInitializationService');
          }
        } catch (error) {
          logger.warn('Periodic cache cleanup failed', error, 'StorageInitializationService');
        }
      }, 10 * 60 * 1000);

      // Generate storage report every 30 minutes
      setInterval(() => {
        try {
          const stats = dataAccessLayer.getStorageStats();
          if (stats) {
            logger.debug('Storage usage report', stats, 'StorageInitializationService');
            
            // Warn if localStorage usage is getting high
            if (stats.localStorage.percentUsed > 80) {
              logger.warn('localStorage usage is high', { 
                percentUsed: stats.localStorage.percentUsed,
                sizeKB: stats.localStorage.sizeKB 
              }, 'StorageInitializationService');
            }
          }
        } catch (error) {
          logger.warn('Storage report generation failed', error, 'StorageInitializationService');
        }
      }, 30 * 60 * 1000);

      logger.debug('Maintenance tasks set up successfully', {}, 'StorageInitializationService');
    } catch (error) {
      logger.error('Failed to set up maintenance tasks', error, 'StorageInitializationService');
    }
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    try {
      // Monitor cache hit rates
      let cacheHits = 0;
      let cacheMisses = 0;
      
      // Log cache performance every 5 minutes
      setInterval(() => {
        try {
          const stats = cachingService.getStats();
          const hitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0;
          
          logger.debug('Cache performance report', {
            hitRate: Math.round(hitRate),
            hits: cacheHits,
            misses: cacheMisses,
            ...stats
          }, 'StorageInitializationService');
          
          // Reset counters
          cacheHits = 0;
          cacheMisses = 0;
        } catch (error) {
          logger.warn('Performance monitoring failed', error, 'StorageInitializationService');
        }
      }, 5 * 60 * 1000);

      logger.debug('Performance monitoring set up successfully', {}, 'StorageInitializationService');
    } catch (error) {
      logger.error('Failed to set up performance monitoring', error, 'StorageInitializationService');
    }
  }

  /**
   * Get initialization status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: !!this.initializationPromise && !this.isInitialized,
      migrationStatus: storageMigrationService.getMigrationStatus(),
      cacheStats: cachingService.getStats(),
      storageStats: dataAccessLayer.getStorageStats()
    };
  }

  /**
   * Force re-initialization (for testing or troubleshooting)
   */
  async reinitialize() {
    logger.info('Forcing storage system re-initialization', {}, 'StorageInitializationService');
    
    this.isInitialized = false;
    this.initializationPromise = null;
    
    return await this.initialize();
  }

  /**
   * Perform a health check on the storage system
   * @returns {Object} Health check results
   */
  healthCheck() {
    try {
      const results = {
        overall: 'healthy',
        checks: {},
        timestamp: new Date().toISOString()
      };

      // Check localStorage availability
      try {
        localStorage.setItem('__health_check__', 'test');
        localStorage.removeItem('__health_check__');
        results.checks.localStorage = 'ok';
      } catch (error) {
        results.checks.localStorage = 'error';
        results.overall = 'unhealthy';
      }

      // Check caching service
      try {
        cachingService.set('__health_check__', 'test', 1000);
        const retrieved = cachingService.get('__health_check__');
        cachingService.delete('__health_check__');
        results.checks.cachingService = retrieved === 'test' ? 'ok' : 'error';
      } catch (error) {
        results.checks.cachingService = 'error';
        results.overall = 'unhealthy';
      }

      // Check data access layer
      try {
        const testData = { test: true };
        dataAccessLayer.setData('__health_check__', testData);
        const retrieved = dataAccessLayer.getData('__health_check__');
        dataAccessLayer.deleteData('__health_check__');
        results.checks.dataAccessLayer = retrieved?.test === true ? 'ok' : 'error';
      } catch (error) {
        results.checks.dataAccessLayer = 'error';
        results.overall = 'unhealthy';
      }

      // Check storage usage
      const stats = dataAccessLayer.getStorageStats();
      if (stats) {
        results.checks.storageUsage = stats.localStorage.percentUsed < 90 ? 'ok' : 'warning';
        if (stats.localStorage.percentUsed >= 95) {
          results.checks.storageUsage = 'critical';
          results.overall = 'unhealthy';
        }
      }

      logger.debug('Storage health check completed', results, 'StorageInitializationService');
      return results;
    } catch (error) {
      logger.error('Storage health check failed', error, 'StorageInitializationService');
      return {
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const storageInitializationService = new StorageInitializationService();

export default storageInitializationService;