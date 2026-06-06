import { logger } from '../shared/logging/logger';
import RealTimeService from './RealTimeService';
import cacheService, { CacheKeys, CacheTTL } from '../shared/cache/CacheService';

/**
 * Production Order Service
 * Handles all order-related operations with real-time updates and caching
 */
class OrderService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    this.orders = new Map(); // Local order cache
    this.orderSubscriptions = new Set(); // Track subscribed orders
    this.isInitialized = false;
    
    this.init();
  }
  
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Setup real-time event listeners
      this.setupRealTimeListeners();
      
      this.isInitialized = true;
      logger.info('OrderService initialized', {}, 'OrderService');
    } catch (error) {
      logger.error('Failed to initialize OrderService', error, 'OrderService');
    }
  }
  
  /**
   * Setup real-time event listeners for order updates
   */
  setupRealTimeListeners() {
    // Order created
    RealTimeService.addEventListener('orderCreated', (orderData) => {
      this.handleOrderCreated(orderData);
    });
    
    // Order updated
    RealTimeService.addEventListener('orderUpdated', (orderData) => {
      this.handleOrderUpdated(orderData);
    });
    
    // Order status changed
    RealTimeService.addEventListener('orderStatusChanged', (orderData) => {
      this.handleOrderStatusChanged(orderData);
    });
  }
  
  /**
   * Handle real-time order creation
   */
  handleOrderCreated(orderData) {
    logger.info('Real-time order created', { orderId: orderData.orderId }, 'OrderService');
    
    // Update local cache
    this.orders.set(orderData.orderId, orderData);
    
    // Clear relevant cache keys
    this.invalidateCache(['live-orders', 'pending-orders']);
    
    // Trigger custom events for UI updates
    this.dispatchOrderEvent('orderCreated', orderData);
  }
  
  /**
   * Handle real-time order updates
   */
  handleOrderUpdated(orderData) {
    logger.info('Real-time order updated', { orderId: orderData.orderId }, 'OrderService');
    
    // Update local cache
    const existingOrder = this.orders.get(orderData.orderId);
    if (existingOrder) {
      this.orders.set(orderData.orderId, { ...existingOrder, ...orderData });
    }
    
    // Clear relevant cache
    this.invalidateCache(['live-orders', `order-${orderData.orderId}`]);
    
    // Trigger custom events
    this.dispatchOrderEvent('orderUpdated', orderData);
  }
  
  /**
   * Handle real-time order status changes
   */
  handleOrderStatusChanged(orderData) {
    logger.info('Real-time order status changed', {
      orderId: orderData.orderId,
      status: orderData.status
    }, 'OrderService');
    
    // Update local cache
    const existingOrder = this.orders.get(orderData.orderId);
    if (existingOrder) {
      this.orders.set(orderData.orderId, {
        ...existingOrder,
        status: orderData.status,
        updatedAt: orderData.timestamp || new Date().toISOString()
      });
    }
    
    // Clear relevant cache
    this.invalidateCache([
      'live-orders',
      'pending-orders',
      `order-${orderData.orderId}`,
      `orders-status-${orderData.status}`
    ]);
    
    // Trigger custom events
    this.dispatchOrderEvent('orderStatusChanged', orderData);
  }
  
  /**
   * Dispatch custom order events
   */
  dispatchOrderEvent(eventType, orderData) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`tableserve:${eventType}`, {
        detail: orderData
      }));
    }
  }
  
  /**
   * Get live orders with real-time updates
   */
  async getLiveOrders(filters = {}) {
    try {
      logger.perfStart('get-live-orders');
      
      const cacheKey = this.buildCacheKey('live-orders', filters);
      
      // Try cache first
      let orders = await cacheService.get(cacheKey);
      
      if (!orders) {
        // Fetch from API
        const response = await this.makeRequest('/api/v1/orders/live', {
          method: 'GET',
          params: filters
        });
        
        if (response.success) {
          orders = response.data;
          
          // Cache for short duration due to real-time nature
          await cacheService.set(cacheKey, orders, CacheTTL.SHORT);
          
          // Update local cache
          orders.forEach(order => {
            this.orders.set(order._id, order);
          });
        } else {
          throw new Error(response.message || 'Failed to fetch live orders');
        }
      }
      
      const duration = logger.perfEnd('get-live-orders');
      logger.debug('Live orders fetched', {
        count: orders?.length || 0,
        duration,
        fromCache: !!orders
      }, 'OrderService');
      
      return orders || [];
      
    } catch (error) {
      logger.error('Failed to get live orders', error, 'OrderService');
      return [];
    }
  }
  
  /**
   * Get order history with pagination
   */
  async getOrderHistory(filters = {}, page = 1, limit = 100) {
    try {
      logger.perfStart('get-order-history');
      
      const cacheKey = this.buildCacheKey('order-history', { ...filters, page, limit });
      
      let result = await cacheService.get(cacheKey);
      
      if (!result) {
        const response = await this.makeRequest('/api/v1/orders/history', {
          method: 'GET',
          params: { ...filters, page, limit }
        });
        
        if (response.success) {
          result = response.data;
          
          // Cache for longer duration
          await cacheService.set(cacheKey, result, CacheTTL.MEDIUM);
        } else {
          throw new Error(response.message || 'Failed to fetch order history');
        }
      }
      
      const duration = logger.perfEnd('get-order-history');
      logger.debug('Order history fetched', {
        count: result?.orders?.length || 0,
        page,
        duration
      }, 'OrderService');
      
      return result;
      
    } catch (error) {
      logger.error('Failed to get order history', error, 'OrderService');
      return { orders: [], total: 0, page, limit };
    }
  }
  
  /**
   * Get single order by ID
   */
  async getOrder(orderId) {
    try {
      // Check local cache first
      let order = this.orders.get(orderId);
      
      if (!order) {
        // Check Redis cache
        const cacheKey = CacheKeys.order(orderId);
        order = await cacheService.get(cacheKey);
        
        if (!order) {
          // Fetch from API
          const response = await this.makeRequest(`/api/v1/orders/${orderId}`);
          
          if (response.success) {
            order = response.data;
            
            // Cache the order
            await cacheService.set(cacheKey, order, CacheTTL.MEDIUM);
            
            // Update local cache
            this.orders.set(orderId, order);
          } else {
            throw new Error(response.message || 'Order not found');
          }
        }
      }
      
      // Subscribe to real-time updates for this order
      this.subscribeToOrder(orderId);
      
      return order;
      
    } catch (error) {
      logger.error('Failed to get order', { orderId, error }, 'OrderService');
      throw error;
    }
  }
  
  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      logger.perfStart('create-order');
      
      const response = await this.makeRequest('/api/v1/orders', {
        method: 'POST',
        body: orderData
      });
      
      if (response.success) {
        const order = response.data;
        
        // Update local cache
        this.orders.set(order._id, order);
        
        // Clear relevant cache
        this.invalidateCache(['live-orders', 'pending-orders']);
        
        // Subscribe to real-time updates
        this.subscribeToOrder(order._id);
        
        const duration = logger.perfEnd('create-order');
        logger.info('Order created successfully', {
          orderId: order._id,
          duration
        }, 'OrderService');
        
        return order;
      } else {
        throw new Error(response.message || 'Failed to create order');
      }
      
    } catch (error) {
      logger.error('Failed to create order', error, 'OrderService');
      throw error;
    }
  }
  
  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, notes = '') {
    try {
      const response = await this.makeRequest(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status, notes }
      });
      
      if (response.success) {
        const updatedOrder = response.data;
        
        // Update local cache
        this.orders.set(orderId, updatedOrder);
        
        // Send real-time update
        RealTimeService.updateOrderStatus(orderId, status, notes);
        
        // Clear relevant cache
        this.invalidateCache([
          'live-orders',
          `order-${orderId}`,
          `orders-status-${status}`
        ]);
        
        logger.info('Order status updated', {
          orderId,
          status,
          notes
        }, 'OrderService');
        
        return updatedOrder;
      } else {
        throw new Error(response.message || 'Failed to update order status');
      }
      
    } catch (error) {
      logger.error('Failed to update order status', {
        orderId,
        status,
        error
      }, 'OrderService');
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time updates for an order
   */
  subscribeToOrder(orderId) {
    if (!this.orderSubscriptions.has(orderId)) {
      RealTimeService.joinRoom('order', orderId);
      this.orderSubscriptions.add(orderId);
      
      logger.debug('Subscribed to order updates', { orderId }, 'OrderService');
    }
  }
  
  /**
   * Unsubscribe from order updates
   */
  unsubscribeFromOrder(orderId) {
    if (this.orderSubscriptions.has(orderId)) {
      RealTimeService.leaveRoom('order', orderId);
      this.orderSubscriptions.delete(orderId);
      
      logger.debug('Unsubscribed from order updates', { orderId }, 'OrderService');
    }
  }
  
  /**
   * Make HTTP request with error handling
   */
  async makeRequest(endpoint, options = {}) {
    const { method = 'GET', body, params, headers = {} } = options;
    
    try {
      let url = `${this.baseURL}${endpoint}`;
      
      // Add query parameters
      if (params && method === 'GET') {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
        if (searchParams.toString()) {
          url += `?${searchParams.toString()}`;
        }
      }
      
      const requestOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      
      // Add authorization header if token exists
      const token = localStorage.getItem('tableserve_access_token');
      if (token) {
        requestOptions.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add body for non-GET requests
      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }
      
      const startTime = Date.now();
      const response = await fetch(url, requestOptions);
      const duration = Date.now() - startTime;
      
      // Log API request
      logger.apiRequest(method, endpoint, duration, response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      logger.error('API request failed', {
        endpoint,
        method,
        error: error.message
      }, 'OrderService');
      
      throw error;
    }
  }
  
  /**
   * Build cache key
   */
  buildCacheKey(prefix, params = {}) {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return paramString ? `${prefix}|${paramString}` : prefix;
  }
  
  /**
   * Invalidate cache keys
   */
  async invalidateCache(keys) {
    try {
      await Promise.all(keys.map((key) => cacheService.delete(key)));
      logger.debug('Cache invalidated', { keys }, 'OrderService');
    } catch (error) {
      logger.error('Failed to invalidate cache', { keys, error }, 'OrderService');
    }
  }
  
  /**
   * Get order statistics
   */
  async getOrderStats(filters = {}) {
    try {
      const cacheKey = this.buildCacheKey('order-stats', filters);
      
      let stats = await cacheService.get(cacheKey);
      
      if (!stats) {
        const response = await this.makeRequest('/api/v1/orders/stats', {
          method: 'GET',
          params: filters
        });
        
        if (response.success) {
          stats = response.data;
          
          // Cache for medium duration
          await cacheService.set(cacheKey, stats, CacheTTL.MEDIUM);
        } else {
          throw new Error(response.message || 'Failed to fetch order stats');
        }
      }
      
      return stats;
      
    } catch (error) {
      logger.error('Failed to get order stats', error, 'OrderService');
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0
      };
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    // Unsubscribe from all orders
    this.orderSubscriptions.forEach(orderId => {
      RealTimeService.leaveRoom('order', orderId);
    });
    
    this.orderSubscriptions.clear();
    this.orders.clear();
    
    logger.info('OrderService cleanup completed', {}, 'OrderService');
  }
}

// Create singleton instance
const orderService = new OrderService();

export default orderService;
export { OrderService };