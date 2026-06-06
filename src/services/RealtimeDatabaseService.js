/**
 * Real-time Database Service for TableServe Application
 * 
 * Handles all real-time data fetching from backend
 * Completely replaces localStorage with live database queries
 */

import api from '../shared/api/api';
import logger from './LoggingService';
import { mapBackendToFrontendPlanKey, RESTAURANT_PLANS, ZONE_PLANS } from '../features/subscription/constants/plans';

class RealtimeDatabaseService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
    this.subscribers = new Set();
  }

  // ===== SUBSCRIPTION METHODS =====

  /**
   * Get current user's subscription from backend (real-time)
   * @returns {Object|null} Subscription data or null if not found
   */
  async getCurrentSubscription() {
    try {
      logger.info('Fetching current subscription from backend', {}, 'RealtimeDatabaseService');
      
      const response = await api.get('/subscriptions/current');
      
      if (response.data.success && response.data.data) {
        const subscription = response.data.data;
        
        // Apply plan key mapping if subscription has backend plan keys
        if (subscription && subscription.planKey && subscription.planType) {
          const frontendPlanKey = mapBackendToFrontendPlanKey(subscription.planKey, subscription.planType);

          // Get the plan label from constants
          const planSource = subscription.planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
          const planData = planSource[frontendPlanKey];
          const planLabel = planData?.label || frontendPlanKey;

          // Return normalized subscription with frontend plan key and label
          const normalizedSubscription = {
            ...subscription,
            key: frontendPlanKey,
            planKey: frontendPlanKey,
            plan: frontendPlanKey, // Also set 'plan' for compatibility
            label: planLabel // Add proper label for display
          };
          
          logger.info('Subscription fetched and normalized', {
            userId: subscription.userId,
            backendPlanKey: subscription.planKey,
            frontendPlanKey,
            planType: subscription.planType
          }, 'RealtimeDatabaseService');
          
          // Cache the result
          this.cache.set('current', {
            data: normalizedSubscription,
            timestamp: Date.now()
          });
          
          // Notify subscribers
          this.notifySubscribers(normalizedSubscription);
          
          return normalizedSubscription;
        }
        
        return subscription;
      }
      
      logger.warn('No subscription data found', {}, 'RealtimeDatabaseService');
      return null;
    } catch (error) {
      logger.error('Failed to fetch subscription data', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }, 'RealtimeDatabaseService');
      
      // Return cached data if available
      const cached = this.cache.get('current');
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        logger.info('Returning cached subscription data', {}, 'RealtimeDatabaseService');
        return cached.data;
      }
      
      // Return a default subscription if user is not authenticated
      if (error.response?.status === 401) {
        logger.info('User not authenticated, returning null subscription', {}, 'RealtimeDatabaseService');
        return null;
      }
      
      return null;
    }
  }

  /**
   * Get subscription limits for current user (real-time)
   * UPDATED: Now checks cache first, then fetches from subscription
   * @returns {Object} Subscription limits
   */
  async getSubscriptionLimits() {
    try {
      // Check cache first
      const cached = this.cache.get('limits');
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        logger.info('Returning cached subscription limits', cached.data, 'RealtimeDatabaseService');
        return cached.data;
      }

      const subscription = await this.getCurrentSubscription();
      
      if (!subscription) {
        // Determine plan type from user context or default to restaurant
        const planType = subscription?.planType || 'restaurant';
        return this.getDefaultLimits(planType);
      }
      
      // Get limits from subscription, with NO hardcoded fallbacks
      // If a limit is null, it means unlimited
      const limits = {
        maxTables: subscription.limits?.maxTables ?? subscription.maxTables ?? null,
        maxVendors: subscription.limits?.maxVendors ?? subscription.maxVendors ?? null,
        maxShops: subscription.limits?.maxShops ?? subscription.maxShops ?? null,
        maxCategories: subscription.limits?.maxCategories ?? subscription.maxCategories ?? null,
        maxMenuItems: subscription.limits?.maxMenuItems ?? subscription.maxMenuItems ?? null,
        maxUsers: subscription.limits?.maxUsers ?? subscription.maxUsers ?? 1,
        maxOrdersPerMonth: subscription.limits?.maxOrdersPerMonth ?? subscription.maxOrdersPerMonth ?? null,
        maxStorageGB: subscription.limits?.maxStorageGB ?? subscription.maxStorageGB ?? 1,
        unlimited: subscription.features?.unlimited || false
      };

      // Cache the limits
      this.cache.set('limits', {
        data: limits,
        timestamp: Date.now()
      });

      return limits;
    } catch (error) {
      logger.error('Failed to get subscription limits', error, 'RealtimeDatabaseService');
      // On error, return default limits based on plan type
      return this.getDefaultLimits('restaurant');
    }
  }

  /**
   * Get current usage counts from backend (real-time)
   * UPDATED: Now also caches limits from the API response
   * @returns {Object} Current usage counts
   */
  async getCurrentCounts() {
    try {
      logger.info('Fetching current usage counts from backend', {}, 'RealtimeDatabaseService');
      
      const response = await api.get('/subscriptions/limits/check');
      
      if (response.data.success && response.data.data) {
        const counts = response.data.data.currentCounts || {};
        const limits = response.data.data.limits || null; // ✅ NOW CAPTURES LIMITS
        
        logger.info('Usage counts and limits fetched', { counts, limits }, 'RealtimeDatabaseService');
        
        // Cache limits if available
        if (limits) {
          this.cache.set('limits', {
            data: limits,
            timestamp: Date.now()
          });
        }
        
        return {
          tables: counts.tables || 0,
          vendors: counts.vendors || 0,
          categories: counts.categories || 0,
          menuItems: counts.menuItems || 0,
          users: counts.users || 0,
          ordersThisMonth: counts.ordersThisMonth || 0,
          storageUsedGB: counts.storageUsedGB || 0
        };
      }
      
      return this.getDefaultCounts();
    } catch (error) {
      logger.error('Failed to get current counts', error, 'RealtimeDatabaseService');
      return this.getDefaultCounts();
    }
  }

  /**
   * Check if user can perform an action based on subscription limits (real-time)
   * @param {string} action - Action to check (tables, vendors, categories, etc.)
   * @returns {boolean} Whether action is allowed
   */
  async checkLimit(action) {
    try {
      const [subscription, counts] = await Promise.all([
        this.getCurrentSubscription(),
        this.getCurrentCounts()
      ]);
      
      if (!subscription) {
        return false;
      }
      
      // If unlimited plan, allow everything
      if (subscription.features?.unlimited) {
        return true;
      }
      
      const limits = await this.getSubscriptionLimits();
      
      switch (action) {
        case 'tables':
          return counts.tables < limits.maxTables;
        case 'vendors':
          return counts.vendors < limits.maxVendors;
        case 'categories':
          return counts.categories < limits.maxCategories;
        case 'menuItems':
          return counts.menuItems < limits.maxMenuItems;
        case 'users':
          return counts.users < limits.maxUsers;
        default:
          return true;
      }
    } catch (error) {
      logger.error('Failed to check limit', error, 'RealtimeDatabaseService');
      return false;
    }
  }

  // ===== RESTAURANT DATA METHODS =====

  /**
   * Get all restaurants from backend (real-time)
   * @returns {Array} Array of restaurants
   */
  async getRestaurants() {
    try {
      logger.info('Fetching restaurants from backend', {}, 'RealtimeDatabaseService');
      const response = await api.get('/restaurants');
      
      if (response.data.success && response.data.data) {
        const restaurants = response.data.data;
        logger.info('Restaurants fetched successfully', { count: restaurants.length }, 'RealtimeDatabaseService');
        return restaurants;
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to fetch restaurants', error, 'RealtimeDatabaseService');
      return [];
    }
  }

  /**
   * Get restaurant by ID from backend (real-time)
   * @param {string} restaurantId - Restaurant ID
   * @returns {Object|null} Restaurant data or null
   */
  async getRestaurant(restaurantId) {
    try {
      logger.info('Fetching restaurant from backend', { restaurantId }, 'RealtimeDatabaseService');
      const response = await api.get(`/restaurants/${restaurantId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to fetch restaurant', error, 'RealtimeDatabaseService');
      return null;
    }
  }

  /**
   * Create restaurant in backend (real-time)
   * @param {Object} restaurantData - Restaurant data
   * @returns {Object|null} Created restaurant or null
   */
  async createRestaurant(restaurantData) {
    try {
      logger.info('Creating restaurant in backend', { restaurantData }, 'RealtimeDatabaseService');
      const response = await api.post('/restaurants', restaurantData);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to create restaurant', error, 'RealtimeDatabaseService');
      return null;
    }
  }

  /**
   * Update restaurant in backend (real-time)
   * @param {string} restaurantId - Restaurant ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated restaurant or null
   */
  async updateRestaurant(restaurantId, updateData) {
    try {
      logger.info('Updating restaurant in backend', { restaurantId, updateData }, 'RealtimeDatabaseService');
      const response = await api.put(`/restaurants/${restaurantId}`, updateData);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to update restaurant', error, 'RealtimeDatabaseService');
      return null;
    }
  }

  // ===== ZONE DATA METHODS =====

  /**
   * Get all zones from backend (real-time)
   * @returns {Array} Array of zones
   */
  async getZones() {
    try {
      logger.info('Fetching zones from backend', {}, 'RealtimeDatabaseService');
      const response = await api.get('/zones');
      
      if (response.data.success && response.data.data) {
        const zones = response.data.data;
        logger.info('Zones fetched successfully', { count: zones.length }, 'RealtimeDatabaseService');
        return zones;
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to fetch zones', error, 'RealtimeDatabaseService');
      return [];
    }
  }

  /**
   * Get zone by ID from backend (real-time)
   * @param {string} zoneId - Zone ID
   * @returns {Object|null} Zone data or null
   */
  async getZone(zoneId) {
    try {
      logger.info('Fetching zone from backend', { zoneId }, 'RealtimeDatabaseService');
      const response = await api.get(`/zones/${zoneId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to fetch zone', error, 'RealtimeDatabaseService');
      return null;
    }
  }

  // ===== MENU DATA METHODS =====

  /**
   * Get menu categories from backend (real-time)
   * @param {string} ownerType - Owner type (restaurant/vendor)
   * @param {string} ownerId - Owner ID
   * @returns {Array} Array of categories
   */
  async getMenuCategories(ownerType, ownerId) {
    try {
      logger.info('Fetching menu categories from backend', { ownerType, ownerId }, 'RealtimeDatabaseService');
      const response = await api.get(`/menus/${ownerType}/${ownerId}/categories`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch menu categories', error, 'RealtimeDatabaseService');
      return [];
    }
  }

  /**
   * Get menu items from backend (real-time)
   * @param {string} ownerType - Owner type (restaurant/vendor)
   * @param {string} ownerId - Owner ID
   * @returns {Array} Array of menu items
   */
  async getMenuItems(ownerType, ownerId) {
    try {
      logger.info('Fetching menu items from backend', { ownerType, ownerId }, 'RealtimeDatabaseService');
      const response = await api.get(`/menus/${ownerType}/${ownerId}/items`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch menu items', error, 'RealtimeDatabaseService');
      return [];
    }
  }

  /**
   * Create menu category in backend (real-time)
   * @param {string} ownerType - Owner type (restaurant/vendor)
   * @param {string} ownerId - Owner ID
   * @param {Object} categoryData - Category data
   * @returns {Object|null} Created category or null
   */
  async createMenuCategory(ownerType, ownerId, categoryData) {
    try {
      logger.info('Creating menu category in backend', { ownerType, ownerId, categoryData }, 'RealtimeDatabaseService');
      const response = await api.post(`/menus/${ownerType}/${ownerId}/categories`, categoryData);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to create menu category', error, 'RealtimeDatabaseService');
      return null;
    }
  }

  /**
   * Create menu item in backend (real-time)
   * @param {string} ownerType - Owner type (restaurant/vendor)
   * @param {string} ownerId - Owner ID
   * @param {Object} itemData - Item data
   * @returns {Object|null} Created item or null
   */
  async createMenuItem(ownerType, ownerId, itemData) {
    try {
      logger.info('Creating menu item in backend', { ownerType, ownerId, itemData }, 'RealtimeDatabaseService');
      const response = await api.post(`/menus/${ownerType}/${ownerId}/items`, itemData);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to create menu item', error, 'RealtimeDatabaseService');
      return null;
    }
  }

  // ===== VENDOR DATA METHODS =====

  /**
   * Get vendors for a zone from backend (real-time)
   * @param {string} zoneId - Zone ID
   * @returns {Array} Array of vendors
   */
  async getVendors(zoneId) {
    try {
      logger.info('Fetching vendors from backend', { zoneId }, 'RealtimeDatabaseService');
      const response = await api.get(`/zones/zones/${zoneId}`);

      if (response.data.success && response.data.data && response.data.data.vendors) {
        return response.data.data.vendors;
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch vendors', error, 'RealtimeDatabaseService');
      return [];
    }
  }

  /**
   * Create vendor in backend (real-time)
   * @param {string} zoneId - Zone ID
   * @param {Object} vendorData - Vendor data
   * @returns {Object|null} Created vendor or null
   */
  async createVendor(zoneId, vendorData) {
    try {
      logger.info('Creating vendor in backend', { zoneId, vendorData }, 'RealtimeDatabaseService');
      const response = await api.post(`/zones/zones/${zoneId}`, vendorData);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to create vendor', error, 'RealtimeDatabaseService');
      return null;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Subscribe to data changes
   * @param {Function} callback - Callback function to call when data changes
   */
  subscribe(callback) {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of data changes
   * @param {Object} data - Updated data
   */
  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Error notifying subscriber', error, 'RealtimeDatabaseService');
      }
    });
  }

  /**
   * Clear cache and force refresh
   */
  clearCache() {
    this.cache.clear();
    logger.info('Cache cleared', {}, 'RealtimeDatabaseService');
  }

  /**
   * Get default limits for free users (from plan constants - NO HARDCODING)
   * @param {string} planType - Plan type (restaurant or zone)
   * @returns {Object} Default limits from free plan
   */
  getDefaultLimits(planType = 'restaurant') {
    // Get limits from the actual free plan definition
    const freePlan = planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
    
    return {
      maxTables: freePlan.maxTables || 1,
      maxVendors: freePlan.maxVendors || (planType === 'zone' ? 1 : 0),
      maxShops: freePlan.maxShops || (planType === 'zone' ? 1 : 0),
      maxCategories: freePlan.maxCategories || 1,
      maxMenuItems: freePlan.maxMenuItems || 2,
      maxUsers: 1,
      maxOrdersPerMonth: 50,
      maxStorageGB: 1,
      unlimited: false
    };
  }

  /**
   * Get default counts
   * @returns {Object} Default counts
   */
  getDefaultCounts() {
    return {
      tables: 0,
      vendors: 0,
      categories: 0,
      menuItems: 0,
      users: 0,
      ordersThisMonth: 0,
      storageUsedGB: 0
    };
  }

  /**
   * Refresh data from backend
   */
  async refresh() {
    this.clearCache();
    return await this.getCurrentSubscription();
  }
}

// Create singleton instance
const realtimeDatabaseService = new RealtimeDatabaseService();

export default realtimeDatabaseService;
