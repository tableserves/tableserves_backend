/**
 * Unified Order Tracking API Service
 * Provides comprehensive order tracking for both restaurant and zone orders
 * with real-time updates, error handling, and fallback mechanisms
 */

import { logger } from '../shared/logging/logger';
import RealTimeService from './RealTimeService';

class OrderTrackingAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Fetch order by order number with phone verification
   * @param {string} orderNumber - Order number to track
   * @param {string} phone - Customer phone for verification
   * @returns {Promise<Object>} Order data
   */
  async fetchOrderByNumber(orderNumber, phone) {
    // Validate inputs
    if (!orderNumber || !phone) {
      throw new Error('Order number and phone number are required');
    }

    const cacheKey = `order_${orderNumber}_${phone}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Order fetched from cache', { orderNumber });
        return cached;
      }

      logger.info('Fetching order by number from database', { orderNumber, phone });

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await this.makeRequest(
          `/orders/track/${orderNumber}?phone=${encodeURIComponent(phone)}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (response.success && response.data) {
          // Validate critical data fields
          const orderData = response.data;
          if (!orderData.orderNumber) {
            throw new Error('Invalid order data: Missing order number');
          }

          // Cache the successful response
          this.setCache(cacheKey, orderData);
          
          logger.info('Order fetched successfully from database', { 
            orderNumber: orderData.orderNumber,
            status: orderData.status,
            orderId: orderData._id
          });
          
          return orderData;
        } else {
          throw new Error(response.message || 'Order not found in database');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      logger.error('Failed to fetch order by number from database', { 
        orderNumber, 
        phone,
        error: error.message,
        stack: error.stack
      });
      throw this.enhanceError(error);
    }
  }

  /**
   * Fetch recent order for customer
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Order data
   */
  async fetchRecentOrder(params) {
    const { tableNumber, customerPhone, restaurantId, zoneId } = params;
    const cacheKey = `recent_${tableNumber}_${customerPhone}_${restaurantId || zoneId}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Recent order fetched from cache', params);
        return cached;
      }

      logger.info('Fetching recent order', params);

      const queryParams = new URLSearchParams();
      if (tableNumber) queryParams.append('tableNumber', tableNumber);
      if (customerPhone) queryParams.append('customerPhone', customerPhone);
      if (restaurantId) queryParams.append('restaurantId', restaurantId);
      if (zoneId) queryParams.append('zoneId', zoneId);

      const response = await this.makeRequest(`/orders/recent?${queryParams.toString()}`);

      if (response.success && response.data) {
        // Cache the successful response with shorter timeout for recent orders
        this.setCache(cacheKey, response.data, 15000); // 15 seconds
        
        logger.info('Recent order fetched successfully', { 
          orderNumber: response.data.orderNumber,
          status: response.data.status 
        });
        
        return response.data;
      } else {
        throw new Error(response.message || 'No recent order found');
      }
    } catch (error) {
      logger.error('Failed to fetch recent order', { params, error: error.message });
      throw this.enhanceError(error);
    }
  }

  /**
   * Fetch order by ID (for authenticated users)
   * @param {string} orderId - Order ID
   * @param {string} customerPhone - Customer phone number for verification (optional)
   * @returns {Promise<Object>} Order data
   */
  async fetchOrderById(orderId, customerPhone = null) {
    // Validate orderId
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      console.error('❌ OrderTrackingAPI: Invalid orderId provided:', orderId);
      throw new Error('Valid orderId is required to fetch order by ID');
    }

    const cacheKey = `order_id_${orderId}_${customerPhone || 'no_phone'}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Order fetched from cache by ID', { orderId });
        return cached;
      }

      console.log('✅ OrderTrackingAPI: Fetching order by ID with valid orderId:', orderId);
      logger.info('Fetching order by ID', { orderId, hasPhone: !!customerPhone });

      // Build URL with customer phone if provided
      let url = `/orders/customer/${orderId}`;
      if (customerPhone) {
        url += `?customerPhone=${encodeURIComponent(customerPhone)}`;
      }

      // Use public customer endpoint for order tracking (no auth required)
      const response = await this.makeRequest(url);

      if (response.success && response.data) {
        // Cache the successful response
        this.setCache(cacheKey, response.data);
        
        logger.info('Order fetched successfully by ID', { 
          orderId,
          orderNumber: response.data.orderNumber,
          status: response.data.status 
        });
        
        return response.data;
      } else {
        throw new Error(response.message || 'Order not found');
      }
    } catch (error) {
      logger.error('Failed to fetch order by ID', { orderId, error: error.message });
      throw this.enhanceError(error);
    }
  }

  /**
   * Update order status with real-time notification
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated order data
   */
  async updateOrderStatus(orderId, status, notes = '') {
    try {
      logger.info('Updating order status', { orderId, status, notes });

      const response = await this.makeRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status, notes }
      });

      if (response.success && response.data) {
        // Clear cache for this order
        this.clearOrderCache(orderId);
        
        // Send real-time update
        RealTimeService.updateOrderStatus(orderId, status, notes);
        
        logger.info('Order status updated successfully', { 
          orderId,
          orderNumber: response.data.orderNumber,
          oldStatus: response.data.previousStatus,
          newStatus: status 
        });
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update order status');
      }
    } catch (error) {
      logger.error('Failed to update order status', { orderId, status, error: error.message });
      throw this.enhanceError(error);
    }
  }

  /**
   * Fetch orders for zone shop
   * @param {string} shopId - Shop ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Array of orders
   */
  async fetchZoneShopOrders(shopId, filters = {}) {
    // Validate shopId
    if (!shopId || shopId === 'undefined' || shopId === 'null') {
      console.error('❌ OrderTrackingAPI: Invalid shopId provided:', shopId);
      throw new Error('Valid shopId is required to fetch zone shop orders');
    }

    const cacheKey = `shop_orders_${shopId}_${JSON.stringify(filters)}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Zone shop orders fetched from cache', { shopId });
        return cached;
      }

      console.log('✅ OrderTrackingAPI: Fetching zone shop orders with valid shopId:', shopId);
      logger.info('Fetching zone shop orders', { shopId, filters });

      const queryParams = new URLSearchParams({ shopId, ...filters });
      const response = await this.makeRequest(`/orders/management?${queryParams.toString()}`);

      if (response.success) {
        const orders = response.data?.orders || response.data || [];
        
        // Cache the successful response with shorter timeout for live orders
        this.setCache(cacheKey, orders, 10000); // 10 seconds
        
        logger.info('Zone shop orders fetched successfully', { 
          shopId,
          count: orders.length 
        });
        
        return orders;
      } else {
        throw new Error(response.message || 'Failed to fetch shop orders');
      }
    } catch (error) {
      logger.error('Failed to fetch zone shop orders', { shopId, error: error.message });
      throw this.enhanceError(error);
    }
  }

  /**
   * Fetch orders for restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Array of orders
   */
  async fetchRestaurantOrders(restaurantId, filters = {}) {
    const cacheKey = `restaurant_orders_${restaurantId}_${JSON.stringify(filters)}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Restaurant orders fetched from cache', { restaurantId });
        return cached;
      }

      logger.info('Fetching restaurant orders', { restaurantId, filters });

      const queryParams = new URLSearchParams({ restaurantId, ...filters });
      const response = await this.makeRequest(`/orders/management?${queryParams.toString()}`);

      if (response.success) {
        const orders = response.data?.orders || response.data || [];
        
        // Cache the successful response with shorter timeout for live orders
        this.setCache(cacheKey, orders, 10000); // 10 seconds
        
        logger.info('Restaurant orders fetched successfully', { 
          restaurantId,
          count: orders.length 
        });
        
        return orders;
      } else {
        throw new Error(response.message || 'Failed to fetch restaurant orders');
      }
    } catch (error) {
      logger.error('Failed to fetch restaurant orders', { restaurantId, error: error.message });
      throw this.enhanceError(error);
    }
  }

  /**
   * Make HTTP request with retry logic and authentication
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authentication if available
    const token = this.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request body for non-GET requests
    if (options.body && config.method !== 'GET') {
      config.body = JSON.stringify(options.body);
    }

    let lastError;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        logger.debug(`Making request to database API (attempt ${attempt + 1})`, { url, method: config.method });
        
        const response = await fetch(url, config);
        
        // Check if response is valid
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          // Try to parse error response
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            // If we can't parse the error, use the default message
            logger.warn('Failed to parse error response', { parseError: parseError.message });
          }
          
          // Handle authentication errors
          if (response.status === 401) {
            this.clearAuthToken();
            throw new Error('Authentication failed - please log in again');
          }
          
          // Handle other HTTP errors
          throw new Error(errorMessage);
        }

        // Parse response data
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          logger.error('Failed to parse response JSON', { 
            url, 
            error: parseError.message,
            responseText: await response.text()
          });
          throw new Error('Invalid response format from server');
        }

        logger.debug('Request to database API successful', { url, status: response.status });
        return data;

      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors, validation errors, or client errors
        if (error.message.includes('Authentication failed') || 
            error.message.includes('400') || 
            error.message.includes('404') ||
            error.message.includes('Invalid response format') ||
            error.message.includes('Validation')) {
          break;
        }

        // Wait before retrying
        if (attempt < this.retryAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          logger.warn(`Database request failed, retrying in ${delay}ms`, { 
            url, 
            attempt: attempt + 1, 
            error: error.message 
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get authentication token from localStorage
   * @returns {string|null} JWT token
   */
  getAuthToken() {
    try {
      const authState = JSON.parse(localStorage.getItem('authState') || '{}');
      return authState.accessToken || null;
    } catch {
      return null;
    }
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    try {
      localStorage.removeItem('authState');
    } catch (error) {
      logger.warn('Failed to clear auth token', { error: error.message });
    }
  }

  /**
   * Enhance error with user-friendly messages
   * @param {Error} error - Original error
   * @returns {Error} Enhanced error
   */
  enhanceError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('fetch')) {
      return new Error('Unable to connect to server. Please check your internet connection.');
    }
    
    if (message.includes('404') || message.includes('not found')) {
      return new Error('Order not found. Please verify the order number and phone number.');
    }
    
    if (message.includes('401') || message.includes('unauthorized')) {
      return new Error('Authentication required. Please log in again.');
    }
    
    if (message.includes('403') || message.includes('forbidden')) {
      return new Error('Access denied. You do not have permission to view this order.');
    }
    
    if (message.includes('timeout')) {
      return new Error('Request timed out. Please try again.');
    }
    
    return error;
  }

  /**
   * Cache management methods
   */
  setCache(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.timeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }

  clearOrderCache(orderId) {
    for (const [key] of this.cache) {
      if (key.includes(orderId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export default new OrderTrackingAPI();