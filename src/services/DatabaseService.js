/**
 * DatabaseService - Direct database API calls without localStorage caching
 * This service bypasses all caching and fetches data directly from the backend database
 */

import api from '../shared/api/api.js';
import logger from './LoggingService.js';

class DatabaseService {
  /**
   * Get restaurants directly from database
   */
  static async getRestaurants() {
    try {
      logger.info('Fetching restaurants from database', {}, 'DatabaseService');
      // Use admin endpoint that populates owner and subscription data
      const response = await api.get('/admin/restaurants');
      
      if (response.data && response.data.success) {
        const restaurants = response.data.data || [];
        logger.info('Restaurants fetched from database', { 
          count: restaurants.length,
          planDistribution: restaurants.reduce((acc, r) => {
            const plan = r.subscriptionPlan || 'unknown';
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
          }, {})
        }, 'DatabaseService');
        
        // Validate restaurant data structure
        const validatedRestaurants = restaurants.map(restaurant => {
          if (!restaurant.id && restaurant._id) {
            restaurant.id = restaurant._id;
          }
          
          // Ensure required fields have defaults
          return {
            ...restaurant,
            name: restaurant.name || 'Unnamed Restaurant',
            subscriptionPlan: restaurant.subscriptionPlan || 'free',
            status: restaurant.status || 'active',
            ownerName: restaurant.ownerName || 'Unknown Owner',
            ownerEmail: restaurant.ownerEmail || 'No email',
            revenue: restaurant.revenue || 0,
            orders: restaurant.orders || 0,
            maxTables: restaurant.maxTables || 10
          };
        });
        
        return validatedRestaurants;
      } else {
        logger.warn('Invalid response format from restaurants API', response.data, 'DatabaseService');
        return [];
      }
    } catch (error) {
      logger.error('Failed to fetch restaurants from database', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      }, 'DatabaseService');
      
      // Return empty array instead of throwing to prevent UI crashes
      if (error.response?.status === 401) {
        throw error; // Re-throw auth errors
      }
      
      return [];
    }
  }

  /**
   * Get specific restaurant by ID from database
   */
  static async getRestaurant(restaurantId) {
    try {
      logger.info('Fetching restaurant from database', { restaurantId }, 'DatabaseService');
      const response = await api.get(`/restaurants/${restaurantId}`);
      
      if (response.data && response.data.success) {
        const restaurant = response.data.data;
        logger.info('Restaurant fetched from database', { restaurantId, name: restaurant?.name }, 'DatabaseService');
        return restaurant;
      } else {
        logger.warn('Restaurant not found in database', { restaurantId }, 'DatabaseService');
        return null;
      }
    } catch (error) {
      logger.error('Failed to fetch restaurant from database', { restaurantId, error: error.message }, 'DatabaseService');
      throw error;
    }
  }

  /**
   * Get zones directly from database
   */
  static async getZones() {
    try {
      logger.info('Fetching zones from database', {}, 'DatabaseService');
      // Use admin endpoint that populates admin and subscription data
      const response = await api.get('/admin/zones');
      
      if (response.data && response.data.success) {
        const zones = response.data.data || [];
        logger.info('Zones fetched from database', { count: zones.length }, 'DatabaseService');
        return zones;
      } else {
        logger.warn('Invalid response format from zones API', response.data, 'DatabaseService');
        return [];
      }
    } catch (error) {
      logger.error('Failed to fetch zones from database', error, 'DatabaseService');
      throw error;
    }
  }

  /**
   * Get specific zone by ID from database
   */
  static async getZone(zoneId) {
    try {
      logger.info('Fetching zone from database', { zoneId }, 'DatabaseService');
      const response = await api.get(`/zones/${zoneId}`);
      
      if (response.data && response.data.success) {
        // Backend returns { zone: actualZoneData } in response.data.data
        const responseData = response.data.data;
        const zone = responseData.zone || responseData; // Handle both formats
        
        if (zone) {
          logger.info('Zone fetched from database', { zoneId, name: zone?.name }, 'DatabaseService');
          return zone;
        } else {
          logger.warn('Zone data structure invalid', { zoneId, responseData }, 'DatabaseService');
          return null;
        }
      } else {
        logger.warn('Zone not found in database', { zoneId }, 'DatabaseService');
        return null;
      }
    } catch (error) {
      logger.error('Failed to fetch zone from database', { zoneId, error: error.message }, 'DatabaseService');
      throw error;
    }
  }

  /**
   * Get orders directly from database
   */
  static async getOrders(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add filters as query parameters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/orders/management${params.toString() ? `?${params.toString()}` : ''}`;
      logger.info('Fetching orders from database', { url, filters }, 'DatabaseService');
      
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        const orders = response.data.data || [];
        logger.info('Orders fetched from database', { count: orders.length, filters }, 'DatabaseService');
        return orders;
      } else {
        logger.warn('Invalid response format from orders API', response.data, 'DatabaseService');
        return [];
      }
    } catch (error) {
      logger.error('Failed to fetch orders from database', { filters, error: error.message }, 'DatabaseService');
      throw error;
    }
  }

  /**
   * Get menu items for a restaurant from database
   */
  static async getMenuItems(restaurantId) {
    try {
      logger.info('Fetching menu items from database', { restaurantId }, 'DatabaseService');
      const response = await api.get(`/restaurants/${restaurantId}/menu`);
      
      if (response.data && response.data.success) {
        const menuItems = response.data.data || [];
        logger.info('Menu items fetched from database', { restaurantId, count: menuItems.length }, 'DatabaseService');
        return menuItems;
      } else {
        logger.warn('Invalid response format from menu API', { restaurantId }, 'DatabaseService');
        return [];
      }
    } catch (error) {
      logger.error('Failed to fetch menu items from database', { restaurantId, error: error.message }, 'DatabaseService');
      throw error;
    }
  }

  /**
   * Get user profile from database
   */
  static async getUserProfile(userId) {
    try {
      logger.info('Fetching user profile from database', { userId }, 'DatabaseService');
      const response = await api.get(`/users/${userId}/profile`);
      
      if (response.data && response.data.success) {
        const profile = response.data.data;
        logger.info('User profile fetched from database', { userId, role: profile?.role }, 'DatabaseService');
        return profile;
      } else {
        logger.warn('User profile not found in database', { userId }, 'DatabaseService');
        return null;
      }
    } catch (error) {
      logger.error('Failed to fetch user profile from database', { userId, error: error.message }, 'DatabaseService');
      throw error;
    }
  }

  /**
   * Save data to database (generic method)
   */
  static async saveData(endpoint, data, method = 'POST') {
    try {
      logger.info('Saving data to database', { endpoint, method }, 'DatabaseService');
      
      let response;
      switch (method.toUpperCase()) {
        case 'POST':
          response = await api.post(endpoint, data);
          break;
        case 'PUT':
          response = await api.put(endpoint, data);
          break;
        case 'PATCH':
          response = await api.patch(endpoint, data);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      if (response.data && response.data.success) {
        logger.info('Data saved to database successfully', { endpoint, method }, 'DatabaseService');
        // Return the full response data including message for success handling
        return {
          ...response.data.data,
          message: response.data.message
        };
      } else {
        logger.error('Failed to save data to database', { endpoint, method, response: response.data }, 'DatabaseService');
        throw new Error(response.data?.message || 'Save operation failed');
      }
    } catch (error) {
      logger.error('Database save operation failed', { endpoint, method, error: error.message }, 'DatabaseService');
      throw error;
    }
  }

  /**
   * Delete data from database
   */
  static async deleteData(endpoint, params = {}) {
    try {
      // Validate that endpoint is a string
      if (typeof endpoint !== 'string') {
        throw new Error('Endpoint must be a string');
      }
      
      // Validate that params is an object
      if (typeof params !== 'object' || params === null) {
        throw new Error('Params must be an object');
      }
      
      // Additional validation to prevent [object Object] in URLs
      if (endpoint.includes('[object Object]')) {
        throw new Error('Invalid endpoint format - contains [object Object]. Please ensure IDs are strings.');
      }
      
      logger.info('Deleting data from database', { endpoint, params }, 'DatabaseService');
      
      // Properly configure axios delete request with query parameters
      const config = Object.keys(params).length > 0 ? { params } : {};
      const response = await api.delete(endpoint, config);

      if (response.data && response.data.success) {
        logger.info('Data deleted from database successfully', { endpoint }, 'DatabaseService');
        return response.data.data;
      } else {
        logger.error('Failed to delete data from database', { endpoint, response: response.data }, 'DatabaseService');
        throw new Error(response.data?.message || 'Delete operation failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error('Database delete operation failed', { endpoint, error: errorMessage }, 'DatabaseService');
      throw new Error(errorMessage);
    }
  }

  /**
   * Generic method to get data from database
   */
  static async getData(endpoint) {
    try {
      logger.info('Fetching data from database', { endpoint }, 'DatabaseService');
      const response = await api.get(endpoint);

      if (response.data && response.data.success) {
        const data = response.data.data;
        logger.info('Data fetched from database successfully', { endpoint, dataType: Array.isArray(data) ? 'array' : typeof data }, 'DatabaseService');
        return data;
      } else {
        logger.warn('Invalid response format from API', { endpoint, response: response.data }, 'DatabaseService');
        return null;
      }
    } catch (error) {
      logger.error('Failed to fetch data from database', { endpoint, error: error.message }, 'DatabaseService');
      throw error;
    }
  }
}

export default DatabaseService;
