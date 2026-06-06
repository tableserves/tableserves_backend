/**
 * Centralized Data Access Layer for TableServe Application
 * 
 * This service provides a unified interface for all data operations,
 * with real-time synchronization and fallback mechanisms.
 * 
 * Features:
 * - Real-time data synchronization
 * - Centralized data storage and retrieval
 * - Automatic Redux synchronization
 * - Data validation and transformation
 * - Caching and performance optimization
 * - Error handling and logging
 * - Transaction support for complex operations
 */

import { store } from '../store';
import { setVendors } from '../store/slices/vendorsSlice';
import logger from './LoggingService';
import cachingService from '../shared/cache/CachingService';

// Storage key configuration
const STORAGE_KEYS = {
  // Core entities
  RESTAURANTS: 'tableserve_restaurants',
  ZONES: 'tableserve_zones',
  CUSTOMERS: 'tableserve_customers',
  
  // Authentication & Sessions
  SHOP_CREDENTIALS: 'tableserve_shop_credentials',
  OTP_SESSIONS: 'tableserve_otp_sessions',
  SUBSCRIPTION: 'tableserve_subscription',
  
  // Dynamic keys (functions)
  zoneVendors: (zoneId) => `tableserve_zone_vendors_${zoneId}`,
  adminVendors: (zoneId) => `tableserve_admin_vendors_${zoneId}`,
  zoneShops: (zoneId) => `tableserve_zone_shops_${zoneId}`,
  zoneOrders: (zoneId) => `zone_orders_${zoneId}`,
  zoneLiveOrders: (zoneId) => `zone_live_orders_${zoneId}`,
  zoneAnalytics: (zoneId) => `zone_analytics_${zoneId}`,
  zoneMenuCategories: (zoneId) => `zone_menu_categories_${zoneId}`,
  
  restaurantOrders: (restaurantId) => `restaurant_orders_${restaurantId}`,
  restaurantLiveOrders: (restaurantId) => `live_orders_${restaurantId}`,
  restaurantAnalytics: (restaurantId) => `restaurant_analytics_${restaurantId}`,
  restaurantMenuItems: (restaurantId) => `restaurant_menu_items_${restaurantId}`,
  restaurantMenuCategories: (restaurantId) => `restaurant_menu_categories_${restaurantId}`,
  
  vendorOrders: (vendorId) => `vendor_orders_${vendorId}`,
  vendorLiveOrders: (vendorId) => `vendor_live_orders_${vendorId}`,
  vendorMenuItems: (vendorId) => `vendor_menu_items_${vendorId}`,
  vendorAnalytics: (vendorId) => `vendor_analytics_${vendorId}`,
  
  // Activity & Logging
  ADMIN_ACTIVITY_LOGS: 'adminActivityLogs',
  PLATFORM_ANALYTICS: 'tableserve_analytics'
};

// Data entity types
const ENTITY_TYPES = {
  RESTAURANT: 'restaurant',
  ZONE: 'zone',
  VENDOR: 'vendor',
  CUSTOMER: 'customer',
  ORDER: 'order',
  MENU_ITEM: 'menu_item',
  CATEGORY: 'category',
  ANALYTICS: 'analytics'
};

class DataAccessLayer {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    // Real-time service disabled for database-only mode
    this.realTimeService = null;
    // Don't initialize real-time sync
  }

  /**
   * Initialize real-time synchronization (disabled for database-only mode)
   */
  async initializeRealTimeSync() {
    // Real-time service disabled - using database-only mode
    logger.info('Real-time synchronization disabled - using database-only mode', null, 'DataAccessLayer');
  }

  /**
   * Setup real-time event handlers (disabled for database-only mode)
   */
  setupRealTimeEventHandlers() {
    // Real-time event handlers disabled - using database-only mode
    logger.debug('Real-time event handlers disabled', null, 'DataAccessLayer');
  }

  /**
   * Handle real-time data updates (disabled for database-only mode)
   */
  async handleRealTimeUpdate(key, data) {
    // Real-time updates disabled - using database-only mode
    logger.debug('Real-time update ignored - database-only mode', { key }, 'DataAccessLayer');
  }

  /**
   * Handle real-time data deletions (disabled for database-only mode)
   */
  async handleRealTimeDelete(key) {
    // Real-time deletions disabled - using database-only mode
    logger.debug('Real-time deletion ignored - database-only mode', { key }, 'DataAccessLayer');
  }

  /**
   * Update Redux store based on key
   */
  updateReduxStore(key, data) {
    try {
      if (key.includes('vendors')) {
        store.dispatch(setVendors(Array.isArray(data) ? data : []));
      }
      // Add more Redux updates as needed
    } catch (error) {
      logger.error('Failed to update Redux store', error, 'DataAccessLayer');
    }
  }

  // ===== CORE DATA ACCESS METHODS =====

  /**
   * Generic method to get data directly from API
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @param {boolean} useCache - Whether to use caching
   * @returns {Promise<*>} Retrieved data
   */
  async getData(key, defaultValue = null, useCache = true) {
    try {
      // Check cache first if enabled
      if (useCache) {
        const cachedData = cachingService.get(key, null);
        if (cachedData !== null) {
          logger.debug('Data retrieved from cache', { key }, 'DataAccessLayer');
          return cachedData;
        }
      }

      // No local storage - return default value and let API calls handle data fetching
      logger.debug('No cached data found, returning default value', { key, defaultValue }, 'DataAccessLayer');
      return defaultValue;
    } catch (error) {
      logger.error(`Failed to get data for key: ${key}`, error, 'DataAccessLayer');
      return defaultValue;
    }
  }

  /**
   * Generic method to set data in cache only (no local storage)
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   * @param {boolean} useCache - Whether to use caching
   * @param {number} ttl - Time to live for cache
   * @returns {Promise<boolean>} Success status
   */
  async setData(key, data, useCache = true, ttl = 15 * 60 * 1000) {
    try {
      // Only update cache - no local storage or real-time service
      if (useCache) {
        cachingService.set(key, data, ttl);
        logger.debug('Data cached successfully', { key }, 'DataAccessLayer');
      }

      return true;
    } catch (error) {
      logger.error(`Failed to cache data for key: ${key}`, error, 'DataAccessLayer');
      return false;
    }
  }

  /**
   * Delete data using enhanced caching
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  deleteData(key) {
    try {
      // Remove from enhanced cache only
      cachingService.delete(key);
      
      // Also remove from legacy cache for backward compatibility
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      
      logger.debug('Data deleted from cache successfully', { key }, 'DataAccessLayer');
      return true;
    } catch (error) {
      logger.error(`Failed to delete cached data for key: ${key}`, error, 'DataAccessLayer');
      return false;
    }
  }

  // ===== CACHE MANAGEMENT =====

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
    this.cacheTimestamps.set(key, Date.now());
  }

  getCache(key) {
    if (!this.cache.has(key) || !this.isCacheValid(key)) {
      return null;
    }
    
    return this.cache.get(key);
  }

  isCacheValid(key) {
    if (!this.cache.has(key) || !this.cacheTimestamps.has(key)) {
      return false;
    }
    
    const timestamp = this.cacheTimestamps.get(key);
    return (Date.now() - timestamp) < this.cacheTimeout;
  }

  /**
   * Clear cache using enhanced caching service
   * @param {string} pattern - Optional pattern to match keys
   */
  clearCache(pattern = null) {
    try {
      if (pattern) {
        // Clear legacy cache entries matching pattern
        for (const [key] of this.cache) {
          if (key.includes(pattern)) {
            this.cache.delete(key);
            this.cacheTimestamps.delete(key);
          }
        }
        
        // Enhanced caching service doesn't support pattern-based clearing yet
        // For now, log this as a feature request
        logger.debug('Pattern-based cache clearing requested', { pattern }, 'DataAccessLayer');
      } else {
        // Clear all cache - both legacy and enhanced
        this.cache.clear();
        this.cacheTimestamps.clear();
        cachingService.clear();
      }
      
      logger.debug('Cache cleared', { pattern }, 'DataAccessLayer');
    } catch (error) {
      logger.error('Failed to clear cache', error, 'DataAccessLayer');
    }
  }

  // ===== RESTAURANT OPERATIONS =====

  async getRestaurants() {
    return await this.getData(STORAGE_KEYS.RESTAURANTS, []);
  }

  async getRestaurant(restaurantId) {
    const restaurants = await this.getRestaurants();
    return restaurants.find(r => r.id == restaurantId) || null;
  }

  async saveRestaurants(restaurants) {
    const success = await this.setData(STORAGE_KEYS.RESTAURANTS, restaurants);
    if (success) {
      this.clearCache('restaurant');
    }
    return success;
  }

  async addRestaurant(restaurantData) {
    try {
      const restaurants = await this.getRestaurants();
      const newRestaurant = {
        ...restaurantData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'restaurant_owner'
      };
      
      restaurants.push(newRestaurant);
      const success = await this.saveRestaurants(restaurants);
      
      if (success) {
        logger.info('Restaurant added successfully', { restaurantId: newRestaurant.id }, 'DataAccessLayer');
        return newRestaurant;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to add restaurant', error, 'DataAccessLayer');
      return null;
    }
  }

  async updateRestaurant(restaurantId, updates) {
    try {
      const restaurants = await this.getRestaurants();
      const index = restaurants.findIndex(r => r.id == restaurantId);
      
      if (index !== -1) {
        restaurants[index] = {
          ...restaurants[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        const success = await this.saveRestaurants(restaurants);
        if (success) {
          logger.info('Restaurant updated successfully', { restaurantId }, 'DataAccessLayer');
          return restaurants[index];
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to update restaurant', error, 'DataAccessLayer');
      return null;
    }
  }

  async deleteRestaurant(restaurantId) {
    try {
      const restaurants = await this.getRestaurants();
      const filtered = restaurants.filter(r => r.id !== restaurantId);
      const removed = filtered.length < restaurants.length;
      
      if (removed) {
        await this.saveRestaurants(filtered);
        // Clean up related data
        this.deleteData(STORAGE_KEYS.restaurantOrders(restaurantId));
        this.deleteData(STORAGE_KEYS.restaurantAnalytics(restaurantId));
        this.deleteData(STORAGE_KEYS.restaurantMenuItems(restaurantId));
        this.deleteData(STORAGE_KEYS.restaurantMenuCategories(restaurantId));
        
        logger.info('Restaurant deleted successfully', { restaurantId }, 'DataAccessLayer');
      }
      
      return removed;
    } catch (error) {
      logger.error('Failed to delete restaurant', error, 'DataAccessLayer');
      return false;
    }
  }

  // ===== ZONE OPERATIONS =====

  async getZones() {
    return await this.getData(STORAGE_KEYS.ZONES, []);
  }

  async getZone(zoneId) {
    const zones = await this.getZones();
    const zonesArray = Array.isArray(zones) ? zones : [];
    return zonesArray.find(z => z && z.id == zoneId) || null;
  }

  async saveZones(zones) {
    const success = await this.setData(STORAGE_KEYS.ZONES, zones);
    if (success) {
      this.clearCache('zone');
    }
    return success;
  }

  addZone(zoneData) {
    try {
      const zones = this.getZones();
      const newZone = {
        ...zoneData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      zones.push(newZone);
      const success = this.saveZones(zones);
      
      if (success) {
        logger.info('Zone added successfully', { zoneId: newZone.id }, 'DataAccessLayer');
        return newZone;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to add zone', error, 'DataAccessLayer');
      return null;
    }
  }

  updateZone(zoneId, updates) {
    try {
      const zones = this.getZones();
      const index = zones.findIndex(z => z.id == zoneId);
      
      if (index !== -1) {
        zones[index] = {
          ...zones[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        const success = this.saveZones(zones);
        if (success) {
          logger.info('Zone updated successfully', { zoneId }, 'DataAccessLayer');
          return zones[index];
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to update zone', error, 'DataAccessLayer');
      return null;
    }
  }

  deleteZone(zoneId) {
    try {
      const zones = this.getZones();
      const filtered = zones.filter(z => z.id !== zoneId);
      const removed = filtered.length < zones.length;
      
      if (removed) {
        this.saveZones(filtered);
        // Clean up related data
        this.deleteData(STORAGE_KEYS.zoneVendors(zoneId));
        this.deleteData(STORAGE_KEYS.adminVendors(zoneId));
        this.deleteData(STORAGE_KEYS.zoneShops(zoneId));
        this.deleteData(STORAGE_KEYS.zoneOrders(zoneId));
        this.deleteData(STORAGE_KEYS.zoneAnalytics(zoneId));
        
        logger.info('Zone deleted successfully', { zoneId }, 'DataAccessLayer');
      }
      
      return removed;
    } catch (error) {
      logger.error('Failed to delete zone', error, 'DataAccessLayer');
      return false;
    }
  }

  // ===== VENDOR OPERATIONS =====

  async getVendors(zoneId) {
    try {
      // Check cache first
      const cachedVendors = cachingService.get(STORAGE_KEYS.zoneVendors(zoneId), null);
      if (cachedVendors && Array.isArray(cachedVendors)) {
        logger.debug('Vendors retrieved from cache', { zoneId, count: cachedVendors.length }, 'DataAccessLayer');
        return cachedVendors;
      }
      
      // No cached data - return empty array, let API calls handle data fetching
      logger.debug('No cached vendors found', { zoneId }, 'DataAccessLayer');
      return [];
    } catch (error) {
      logger.error('Failed to get vendors', error, 'DataAccessLayer');
      return [];
    }
  }

  async saveVendors(zoneId, vendors) {
    try {
      const safeVendors = Array.isArray(vendors) ? vendors : [];
      const processedVendors = safeVendors.map(vendor => ({
        ...vendor,
        zoneId,
        status: vendor.status || 'active',
        updatedAt: vendor.updatedAt || new Date().toISOString()
      }));
      
      // Cache the vendors data
      cachingService.set(STORAGE_KEYS.zoneVendors(zoneId), processedVendors, 15 * 60 * 1000); // 15 minutes
      
      // Update Redux store
      store.dispatch(setVendors(processedVendors));
      
      logger.info('Vendors cached successfully', { zoneId, count: processedVendors.length }, 'DataAccessLayer');
      return true;
    } catch (error) {
      logger.error('Failed to cache vendors', error, 'DataAccessLayer');
      return false;
    }
  }

  // ===== MENU OPERATIONS =====

  async getMenuItems({ restaurantId, shopId, zoneId }) {
    try {
      if (restaurantId) {
        return await this.getData(STORAGE_KEYS.restaurantMenuItems(restaurantId), []);
      }

      if (shopId && zoneId) {
        return await this.getData(STORAGE_KEYS.vendorMenuItems(shopId), []);
      }

      return [];
    } catch (error) {
      logger.error('Failed to get menu items', error, 'DataAccessLayer');
      return [];
    }
  }

  async saveMenuItems(entityId, menuItems, entityType = 'restaurant') {
    try {
      let key;
      if (entityType === 'restaurant') {
        key = STORAGE_KEYS.restaurantMenuItems(entityId);
      } else if (entityType === 'vendor') {
        key = STORAGE_KEYS.vendorMenuItems(entityId);
      } else {
        throw new Error(`Invalid entity type: ${entityType}`);
      }

      const success = await this.setData(key, menuItems);
      if (success) {
        logger.info('Menu items saved successfully', { entityId, entityType, count: menuItems.length }, 'DataAccessLayer');
      }

      return success;
    } catch (error) {
      logger.error('Failed to save menu items', error, 'DataAccessLayer');
      return false;
    }
  }

  // ===== TRANSACTION SUPPORT =====

  /**
   * Execute multiple operations as a transaction
   * @param {Function} operations - Function containing operations to execute
   * @returns {Object} Transaction result
   */
  async transaction(operations) {
    const startTime = performance.now();
    const transactionId = `tx_${Date.now()}`;
    
    try {
      logger.debug('Starting transaction', { transactionId }, 'DataAccessLayer');
      
      // Create backup of current cache state
      const cacheBackup = new Map(this.cache);
      const timestampBackup = new Map(this.cacheTimestamps);
      
      // Execute operations
      const result = await operations(this);
      
      logger.debug('Transaction completed successfully', { 
        transactionId, 
        duration: performance.now() - startTime 
      }, 'DataAccessLayer');
      
      return { success: true, result, transactionId };
    } catch (error) {
      logger.error('Transaction failed, rolling back', error, 'DataAccessLayer');
      
      // Note: localStorage operations can't be rolled back easily
      // In a real implementation, you might want to implement a more sophisticated rollback mechanism
      
      return { success: false, error: error.message, transactionId };
    }
  }

  // ===== BULK OPERATIONS =====

  /**
   * Import data from multiple sources
   * @param {Object} dataPackage - Object containing different data types
   * @returns {Object} Import result
   */
  importData(dataPackage) {
    try {
      const results = {};
      
      if (dataPackage.restaurants) {
        results.restaurants = this.saveRestaurants(dataPackage.restaurants);
      }
      
      if (dataPackage.zones) {
        results.zones = this.saveZones(dataPackage.zones);
      }
      
      if (dataPackage.customers) {
        results.customers = this.setData(STORAGE_KEYS.CUSTOMERS, dataPackage.customers);
      }
      
      logger.info('Data import completed', { results }, 'DataAccessLayer');
      return { success: true, results };
    } catch (error) {
      logger.error('Data import failed', error, 'DataAccessLayer');
      return { success: false, error: error.message };
    }
  }

  /**
   * Export all data for backup
   * @returns {Object} Exported data
   */
  exportData() {
    try {
      const exportData = {
        restaurants: this.getRestaurants(),
        zones: this.getZones(),
        customers: this.getData(STORAGE_KEYS.CUSTOMERS, []),
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      logger.info('Data export completed', { 
        restaurantCount: exportData.restaurants.length,
        zoneCount: exportData.zones.length,
        customerCount: exportData.customers.length
      }, 'DataAccessLayer');
      
      return exportData;
    } catch (error) {
      logger.error('Data export failed', error, 'DataAccessLayer');
      return null;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Clear all application data (for testing/reset)
   */
  clearAllData() {
    try {
      // Clear main storage keys
      Object.values(STORAGE_KEYS).forEach(key => {
        if (typeof key === 'string') {
          this.deleteData(key);
        }
      });
      
      // Clear cache
      this.clearCache();
      
      logger.warn('All data cleared', {}, 'DataAccessLayer');
      return true;
    } catch (error) {
      logger.error('Failed to clear all data', error, 'DataAccessLayer');
      return false;
    }
  }

  /**
   * Get enhanced storage usage statistics including cache stats
   * @returns {Object} Storage statistics
   */
  getStorageStats() {
    try {
      const cacheStats = cachingService.getStats();
      
      // Calculate localStorage usage
      let localStorageSize = 0;
      let localStorageItems = 0;
      const keyStats = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          const size = new Blob([key + value]).size;
          localStorageSize += size;
          localStorageItems++;
          
          if (key.startsWith('tableserve_')) {
            keyStats[key] = { size, length: value.length };
          }
        }
      }
      
      return {
        localStorage: {
          items: localStorageItems,
          sizeKB: Math.round(localStorageSize / 1024),
          percentUsed: Math.round((localStorageSize / (5 * 1024 * 1024)) * 100), // Assuming 5MB limit
          keyStats
        },
        enhancedCache: cacheStats,
        legacyCache: {
          items: this.cache.size,
          sizeKB: Math.round(this.cache.size * 0.5), // Rough estimate
        },
        total: {
          items: localStorageItems + cacheStats.memoryItems + this.cache.size,
          sizeKB: Math.round(localStorageSize / 1024) + cacheStats.memoryUsageEstimateKB + Math.round(this.cache.size * 0.5),
        }
      };
    } catch (error) {
      logger.error('Failed to get storage stats', error, 'DataAccessLayer');
      return null;
    }
  }
}

// Create singleton instance
const dataAccessLayer = new DataAccessLayer();

export default dataAccessLayer;