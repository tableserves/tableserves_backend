/**
 * Data Service for TableServe Application
 * 
 * This service provides higher-level business logic operations on top of the DataAccessLayer.
 * It handles complex data operations, validation, and coordination between different data entities.
 */

import dataAccessLayer from './DataAccessLayer';
import subscriptionService from './SubscriptionService';
import vendorService from './VendorService';
import { analyticsAPI } from '../shared/api/api';
import logger from './LoggingService';
import restaurantDataService from '../features/owner/services/RestaurantDataService';

class DataService {
  // ===== RESTAURANT BUSINESS LOGIC =====

  /**
   * Create a new restaurant with validation and setup
   * @param {Object} restaurantData - Restaurant data
   * @returns {Object} Result with created restaurant or error
   */
  async createRestaurant(restaurantData) {
    try {
      // Validate required fields
      const validation = this.validateRestaurantData(restaurantData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check for duplicate email/phone
      const duplicate = this.findDuplicateRestaurant(restaurantData);
      if (duplicate) {
        return { success: false, error: 'Restaurant with this email or phone already exists' };
      }

      // Create restaurant
      const restaurant = await dataAccessLayer.transaction(async (dal) => {
        const newRestaurant = dal.addRestaurant(restaurantData);
        
        if (newRestaurant) {
          // Initialize default menu categories
          await this.initializeRestaurantDefaults(newRestaurant.id);
          
          // Save credentials if provided
          if (restaurantData.loginCredentials) {
            this.saveRestaurantCredentials(newRestaurant);
          }
        }
        
        return newRestaurant;
      });

      if (restaurant.success) {
        logger.info('Restaurant created successfully', { restaurantId: restaurant.result.id }, 'DataService');
        return { success: true, restaurant: restaurant.result };
      }

      return { success: false, error: 'Failed to create restaurant' };
    } catch (error) {
      logger.error('Restaurant creation failed', error, 'DataService');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get complete restaurant profile with menu data
   * @param {string} restaurantId - Restaurant ID
   * @returns {Object} Complete restaurant profile
   */
  async getRestaurantProfile(restaurantId) {
    try {
      // Try to fetch from database first
      const databaseResult = await restaurantDataService.getRestaurantProfile(restaurantId);

      if (databaseResult.success) {
        logger.info('Restaurant profile retrieved from database', {
          restaurantId,
          menuItemCount: databaseResult.profile.menuItemsCount,
          categoryCount: databaseResult.profile.categoriesCount
        }, 'DataService');
        return databaseResult;
      }

      // Fallback to localStorage if database fails
      logger.warn('Database fetch failed, falling back to localStorage', { restaurantId }, 'DataService');

      // Cache key for restaurant profile
      const cacheKey = `restaurant_profile_${restaurantId}`;
      const cacheTimeout = 60000; // 1 minute cache

      // Check cache first
      const cached = dataAccessLayer.getCache(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTimeout) {
        logger.debug('Restaurant profile served from cache', { restaurantId }, 'DataService');
        return cached.data;
      }

      const restaurant = dataAccessLayer.getRestaurant(restaurantId);
      if (!restaurant) {
        return { success: false, error: 'Restaurant not found' };
      }

      // Get menu items and categories efficiently - await async calls
      const menuItems = dataAccessLayer.getMenuItems({ restaurantId });
      const menuCategories = await dataAccessLayer.getData(
        dataAccessLayer.constructor.STORAGE_KEYS?.restaurantMenuCategories?.(restaurantId) ||
        `restaurant_menu_categories_${restaurantId}`,
        []
      );

      // Get analytics data - await async call
      const analytics = await dataAccessLayer.getData(
        `restaurant_analytics_${restaurantId}`,
        { totalOrders: 0, totalRevenue: 0, averageRating: 0 }
      );

      // Ensure all data is serializable (no Promises)
      const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
      const safeMenuCategories = Array.isArray(menuCategories) ? menuCategories : [];
      const safeAnalytics = analytics && typeof analytics === 'object' && !analytics.then
        ? analytics
        : { totalOrders: 0, totalRevenue: 0, averageRating: 0 };

      const result = {
        success: true,
        profile: {
          ...restaurant,
          menuItems: safeMenuItems,
          menuCategories: safeMenuCategories,
          analytics: safeAnalytics,
          menuItemCount: safeMenuItems.length,
          categoryCount: safeMenuCategories.length
        }
      };

      // Cache the result
      dataAccessLayer.setCache(cacheKey, result);

      logger.debug('Restaurant profile fetched from localStorage and cached', {
        restaurantId,
        menuItemCount: safeMenuItems.length,
        categoryCount: safeMenuCategories.length
      }, 'DataService');

      return result;
    } catch (error) {
      logger.error('Failed to get restaurant profile', error, 'DataService');
      return { success: false, error: error.message };
    }
  }

  // ===== ZONE BUSINESS LOGIC =====

  /**
   * Create a new zone with validation and setup
   * @param {Object} zoneData - Zone data
   * @returns {Object} Result with created zone or error
   */
  async createZone(zoneData) {
    try {
      // Validate required fields
      const validation = this.validateZoneData(zoneData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create zone
      const zone = await dataAccessLayer.transaction(async (dal) => {
        const newZone = dal.addZone(zoneData);
        
        if (newZone) {
          // Initialize default zone setup
          await this.initializeZoneDefaults(newZone.id);
        }
        
        return newZone;
      });

      if (zone.success) {
        logger.info('Zone created successfully', { zoneId: zone.result.id }, 'DataService');
        return { success: true, zone: zone.result };
      }

      return { success: false, error: 'Failed to create zone' };
    } catch (error) {
      logger.error('Zone creation failed', error, 'DataService');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get complete zone profile with vendors and analytics
   * @param {string} zoneId - Zone ID
   * @returns {Object} Complete zone profile
   */
  async getZoneProfile(zoneId) {
    try {
      const zone = dataAccessLayer.getZone(zoneId);
      if (!zone) {
        return { success: false, error: 'Zone not found' };
      }

      // Get vendors using the unified method
      const vendorsResult = await dataAccessLayer.getVendors(zoneId);
      const vendors = Array.isArray(vendorsResult) ? vendorsResult : [];
      
      // Get zone analytics - ensure it's awaited and serializable
      const analytics = await dataAccessLayer.getData(
        `zone_analytics_${zoneId}`,
        { totalOrders: 0, totalRevenue: 0, activeVendors: 0 }
      );

      // Ensure analytics is serializable (not a Promise)
      const safeAnalytics = analytics && typeof analytics === 'object' && !analytics.then
        ? analytics
        : { totalOrders: 0, totalRevenue: 0, activeVendors: 0 };

      // Get subscription limits
      const subscriptionLimits = subscriptionService.checkVendorLimit(zoneId, vendors.length);

      return {
        success: true,
        profile: {
          ...zone,
          vendors,
          analytics: safeAnalytics,
          vendorCount: vendors.length,
          activeVendors: vendors.filter(v => v && v.status === 'active').length,
          subscriptionLimits
        }
      };
    } catch (error) {
      logger.error('Failed to get zone profile', error, 'DataService');
      return { success: false, error: error.message };
    }
  }

  // ===== VENDOR BUSINESS LOGIC =====

  /**
   * Add a vendor to a zone with validation
   * @param {string} zoneId - Zone ID
   * @param {Object} vendorData - Vendor data
   * @returns {Object} Result with created vendor or error
   */
  async addVendorToZone(zoneId, vendorData) {
    try {
      // Check subscription limits
      const currentVendors = dataAccessLayer.getVendors(zoneId);
      const limitCheck = subscriptionService.checkVendorLimit(zoneId, currentVendors.length);
      
      if (!limitCheck.allowed) {
        return { 
          success: false, 
          error: 'Vendor limit reached. Please upgrade your subscription.',
          limitInfo: limitCheck
        };
      }

      // Validate vendor data
      const validation = this.validateVendorData(vendorData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Add vendor
      const result = await dataAccessLayer.transaction(async (dal) => {
        const vendors = dal.getVendors(zoneId);
        
        const newVendor = {
          ...vendorData,
          id: Date.now().toString(),
          zoneId,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          monthlyRevenue: 0,
          totalOrders: 0,
          rating: 0
        };
        
        vendors.push(newVendor);
        const success = dal.saveVendors(zoneId, vendors);
        
        if (success) {
          // Initialize vendor defaults
          await this.initializeVendorDefaults(newVendor.id);
          
          // Update zone statistics
          await this.updateZoneStats(zoneId);
        }
        
        return success ? newVendor : null;
      });

      if (result.success) {
        logger.info('Vendor added to zone successfully', { 
          zoneId, 
          vendorId: result.result.id 
        }, 'DataService');
        
        return { success: true, vendor: result.result };
      }

      return { success: false, error: 'Failed to add vendor' };
    } catch (error) {
      logger.error('Failed to add vendor to zone', error, 'DataService');
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchronize vendor data across all storage locations
   * @param {string} zoneId - Zone ID
   * @returns {Object} Synchronization result
   */
  async synchronizeVendorData(zoneId) {
    try {
      // Use the vendor service for synchronization
      const result = vendorService.synchronizeVendorData(zoneId);
      
      if (result.success) {
        // Ensure data access layer cache is updated
        dataAccessLayer.clearCache(`vendor_${zoneId}`);
        
        logger.info('Vendor data synchronized', { 
          zoneId, 
          vendorCount: result.mergedVendorsCount 
        }, 'DataService');
      }
      
      return result;
    } catch (error) {
      logger.error('Vendor synchronization failed', error, 'DataService');
      return { success: false, error: error.message };
    }
  }

  // ===== MENU OPERATIONS =====

  /**
   * Save menu items with validation
   * @param {string} entityId - Restaurant or vendor ID
   * @param {Array} menuItems - Menu items array
   * @param {string} entityType - 'restaurant' or 'vendor'
   * @returns {Object} Save result
   */
  async saveMenuItems(entityId, menuItems, entityType = 'restaurant') {
    try {
      // Validate menu items
      const validation = this.validateMenuItems(menuItems);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Process menu items
      const processedItems = menuItems.map(item => ({
        ...item,
        updatedAt: new Date().toISOString(),
        available: item.available !== false // Default to true
      }));

      const success = dataAccessLayer.saveMenuItems(entityId, processedItems, entityType);
      
      if (success) {
        logger.info('Menu items saved successfully', { 
          entityId, 
          entityType, 
          itemCount: processedItems.length 
        }, 'DataService');
      }
      
      return { success, itemCount: processedItems.length };
    } catch (error) {
      logger.error('Failed to save menu items', error, 'DataService');
      return { success: false, error: error.message };
    }
  }

  // ===== ANALYTICS OPERATIONS =====

  /**
   * Update zone statistics
   * @param {string} zoneId - Zone ID
   */
  async updateZoneStats(zoneId) {
    try {
      const vendors = dataAccessLayer.getVendors(zoneId);
      const zone = dataAccessLayer.getZone(zoneId);
      
      if (zone) {
        const updates = {
          vendorCount: vendors.length,
          activeVendors: vendors.filter(v => v.status === 'active').length,
          lastUpdated: new Date().toISOString()
        };
        
        dataAccessLayer.updateZone(zoneId, updates);
        logger.debug('Zone stats updated', { zoneId, updates }, 'DataService');
      }
    } catch (error) {
      logger.error('Failed to update zone stats', error, 'DataService');
    }
  }

  // ===== VALIDATION METHODS =====

  validateRestaurantData(data) {
    if (!data.name || data.name.trim().length < 2) {
      return { valid: false, error: 'Restaurant name must be at least 2 characters' };
    }
    
    if (!data.ownerName || data.ownerName.trim().length < 2) {
      return { valid: false, error: 'Owner name must be at least 2 characters' };
    }
    
    if (!data.phone || !/^\d{10,}$/.test(data.phone.replace(/\D/g, ''))) {
      return { valid: false, error: 'Valid phone number is required' };
    }
    
    if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
      return { valid: false, error: 'Valid email address is required' };
    }
    
    return { valid: true };
  }

  validateZoneData(data) {
    if (!data.name || data.name.trim().length < 2) {
      return { valid: false, error: 'Zone name must be at least 2 characters' };
    }
    
    if (!data.ownerName || data.ownerName.trim().length < 2) {
      return { valid: false, error: 'Owner name must be at least 2 characters' };
    }
    
    if (!data.city || data.city.trim().length < 2) {
      return { valid: false, error: 'City is required' };
    }
    
    return { valid: true };
  }

  validateVendorData(data) {
    if (!data.name || data.name.trim().length < 2) {
      return { valid: false, error: 'Vendor name must be at least 2 characters' };
    }
    
    if (!data.ownerName || data.ownerName.trim().length < 2) {
      return { valid: false, error: 'Owner name must be at least 2 characters' };
    }
    
    if (!data.cuisine || data.cuisine.trim().length < 2) {
      return { valid: false, error: 'Cuisine type is required' };
    }
    
    return { valid: true };
  }

  validateMenuItems(items) {
    if (!Array.isArray(items)) {
      return { valid: false, error: 'Menu items must be an array' };
    }
    
    for (const item of items) {
      if (!item.name || item.name.trim().length < 2) {
        return { valid: false, error: 'All menu items must have a name (min 2 characters)' };
      }
      
      if (!item.price || item.price <= 0) {
        return { valid: false, error: 'All menu items must have a valid price' };
      }
    }
    
    return { valid: true };
  }

  // ===== INITIALIZATION METHODS =====

  async initializeRestaurantDefaults(restaurantId) {
    try {
      // Create default menu categories
      const defaultCategories = [
        { id: 'cat_1', name: 'Appetizers', description: 'Start your meal right', active: true },
        { id: 'cat_2', name: 'Main Course', description: 'Hearty main dishes', active: true },
        { id: 'cat_3', name: 'Beverages', description: 'Refreshing drinks', active: true },
        { id: 'cat_4', name: 'Desserts', description: 'Sweet endings', active: true }
      ];
      
      dataAccessLayer.setData(`restaurant_menu_categories_${restaurantId}`, defaultCategories);
      
      logger.debug('Restaurant defaults initialized', { restaurantId }, 'DataService');
    } catch (error) {
      logger.error('Failed to initialize restaurant defaults', error, 'DataService');
    }
  }

  async initializeZoneDefaults(zoneId) {
    try {
      // Create default zone menu categories
      const defaultCategories = [
        { id: 'cat_1', name: 'All', description: 'View all items', active: true },
        { id: 'cat_2', name: 'Food', description: 'Food items', active: true },
        { id: 'cat_3', name: 'Beverages', description: 'Drinks and beverages', active: true }
      ];
      
      dataAccessLayer.setData(`zone_menu_categories_${zoneId}`, defaultCategories);
      
      logger.debug('Zone defaults initialized', { zoneId }, 'DataService');
    } catch (error) {
      logger.error('Failed to initialize zone defaults', error, 'DataService');
    }
  }

  async initializeVendorDefaults(vendorId) {
    try {
      // Initialize empty menu items
      dataAccessLayer.setData(`vendor_menu_items_${vendorId}`, []);
      
      // Initialize analytics
      const defaultAnalytics = {
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        lastOrderDate: null,
        createdAt: new Date().toISOString()
      };
      
      dataAccessLayer.setData(`vendor_analytics_${vendorId}`, defaultAnalytics);
      
      logger.debug('Vendor defaults initialized', { vendorId }, 'DataService');
    } catch (error) {
      logger.error('Failed to initialize vendor defaults', error, 'DataService');
    }
  }

  // ===== UTILITY METHODS =====

  async findDuplicateRestaurant(restaurantData) {
    const restaurants = await dataAccessLayer.getRestaurants();
    return restaurants.find(r => 
      r.email === restaurantData.email || 
      r.phone === restaurantData.phone
    );
  }

  saveRestaurantCredentials(restaurant) {
    try {
      if (restaurant.loginCredentials) {
        const credentials = dataAccessLayer.getData('tableserve_shop_credentials', {});
        
        credentials[restaurant.loginCredentials.username] = {
          shopId: restaurant.id,
          password: restaurant.loginCredentials.password,
          shopName: restaurant.name,
          ownerName: restaurant.ownerName,
          type: 'restaurant_owner',
          status: restaurant.status || 'active',
          createdAt: restaurant.createdAt
        };
        
        dataAccessLayer.setData('tableserve_shop_credentials', credentials);
      }
    } catch (error) {
      logger.error('Failed to save restaurant credentials', error, 'DataService');
    }
  }

  /**
   * Get system-wide statistics
   * @returns {Object} System statistics
   */
  getSystemStats() {
    return analyticsAPI.getPlatformAnalytics();
  }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;