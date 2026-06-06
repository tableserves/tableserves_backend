/**
 * Restaurant Data Service
 * Handles fetching restaurant data from database instead of localStorage
 */

import { restaurantAPI, menuAPI } from '../../../shared/api/api';
import logger from '@/services/LoggingService';

class RestaurantDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get restaurant data from database
   */
  async getRestaurant(restaurantId) {
    try {
      const cacheKey = `restaurant_${restaurantId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      logger.info('Fetching restaurant data from database', { restaurantId });
      const response = await restaurantAPI.getRestaurant(restaurantId);
      
      if (response.success && response.data) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        return response.data;
      }
      
      throw new Error('Failed to fetch restaurant data');
    } catch (error) {
      logger.error('Error fetching restaurant data', error);
      throw error;
    }
  }

  /**
   * Get menu categories from database
   */
  async getMenuCategories(restaurantId) {
    try {
      const cacheKey = `categories_${restaurantId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      logger.info('Fetching menu categories from database', { restaurantId });
      const response = await menuAPI.getCategories(restaurantId);
      
      if (response.success && response.data) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        return response.data;
      }
      
      return [];
    } catch (error) {
      logger.error('Error fetching menu categories', error);
      return [];
    }
  }

  /**
   * Get menu items from database
   */
  async getMenuItems(restaurantId, categoryId = null) {
    try {
      const cacheKey = `items_${restaurantId}_${categoryId || 'all'}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      logger.info('Fetching menu items from database', { restaurantId, categoryId });
      const response = await menuAPI.getItems(restaurantId, categoryId);
      
      if (response.success && response.data) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        return response.data;
      }
      
      return [];
    } catch (error) {
      logger.error('Error fetching menu items', error);
      return [];
    }
  }

  /**
   * Get complete restaurant profile with menu data
   */
  async getRestaurantProfile(restaurantId) {
    try {
      const [restaurant, categories, items] = await Promise.all([
        this.getRestaurant(restaurantId),
        this.getMenuCategories(restaurantId),
        this.getMenuItems(restaurantId)
      ]);

      return {
        success: true,
        profile: {
          ...restaurant,
          menuCategories: categories,
          menuItems: items,
          menuItemsCount: items.length,
          categoriesCount: categories.length,
          analytics: {
            totalOrders: restaurant.stats?.totalOrders || 0,
            totalRevenue: restaurant.stats?.totalRevenue || 0,
            averageRating: 4.5 // Default rating
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching restaurant profile', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get restaurant subscription limits from database
   */
  async getRestaurantLimits(restaurantId) {
    try {
      const restaurant = await this.getRestaurant(restaurantId);
      
      // If restaurant has subscription, get limits from subscription
      if (restaurant.subscriptionId) {
        const limits = {
          maxTables: restaurant.subscriptionId.limits?.maxTables ?? restaurant.maxTables ?? null,
          maxMenuItems: restaurant.subscriptionId.limits?.maxMenuItems ?? null,
          maxCategories: restaurant.subscriptionId.limits?.maxCategories ?? null,
          maxUsers: restaurant.subscriptionId.limits?.maxUsers ?? 1,
          planType: restaurant.subscriptionId.planType || 'restaurant',
          planKey: restaurant.subscriptionId.planKey || 'restaurant_free',
          unlimited: restaurant.subscriptionId.features?.unlimited || false
        };
        
        return limits;
      }
      
      // Fallback to restaurant-level limits (from database)
      return {
        maxTables: restaurant.maxTables ?? null,
        maxMenuItems: restaurant.maxMenuItems ?? null,
        maxCategories: restaurant.maxCategories ?? null,
        maxUsers: 1,
        planType: restaurant.subscriptionPlan || 'restaurant',
        planKey: 'restaurant_free',
        unlimited: false
      };
    } catch (error) {
      logger.error('Error fetching restaurant limits', error);
      // Return null values to indicate limits should be fetched from subscription service
      return {
        maxTables: null,
        maxMenuItems: null,
        maxCategories: null,
        maxUsers: 1,
        planType: 'restaurant',
        planKey: 'restaurant_free',
        unlimited: false
      };
    }
  }

  /**
   * Clear cache for a specific restaurant
   */
  clearCache(restaurantId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(restaurantId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    logger.info('Cache cleared for restaurant', { restaurantId });
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
    logger.info('All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create and export singleton instance
const restaurantDataService = new RestaurantDataService();
export default restaurantDataService;
