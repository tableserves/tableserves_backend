import RealTimeService from './RealTimeService';
import { logger } from '../shared/logging/logger';

class RestaurantNotificationService {
  constructor() {
    this.isInitialized = false;
    this.notificationCallback = null;
  }

  /**
   * Initialize the restaurant notification service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure RealTimeService is connected
      if (!RealTimeService.isConnected) {
        await RealTimeService.connect();
      }

      // Set up event listeners for restaurant notifications
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('RestaurantNotificationService initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize RestaurantNotificationService', { error: error.message });
      throw error;
    }
  }

  /**
   * Set up event listeners for restaurant notifications
   */
  setupEventListeners() {
    // Listen for new orders
    RealTimeService.addEventListener('new_order', (data) => {
      logger.info('🔔 Restaurant received new order notification', data);
      if (this.notificationCallback) {
        this.notificationCallback({
          type: 'new_order',
          title: 'New Order Received',
          message: `Order #${data.orderNumber} for table ${data.tableNumber}`,
          data
        });
      }
    });

    // Listen for order updates
    RealTimeService.addEventListener('order_update', (data) => {
      logger.info('🔔 Restaurant received order update notification', data);
      if (this.notificationCallback) {
        this.notificationCallback({
          type: 'order_update',
          title: 'Order Updated',
          message: `Order #${data.orderNumber} status changed to ${data.status}`,
          data
        });
      }
    });

    // Listen for order status changes (both event types)
    RealTimeService.addEventListener('order_status_changed', (data) => {
      logger.info('🔔 Restaurant received order status change notification', data);
      if (this.notificationCallback) {
        this.notificationCallback({
          type: 'status_change',
          title: 'Order Status Changed',
          message: `Order #${data.orderNumber} is now ${data.newStatus || data.status}`,
          data
        });
      }
    });

    RealTimeService.addEventListener('order_status_updated', (data) => {
      logger.info('🔔 Restaurant received order status updated notification', data);
      if (this.notificationCallback) {
        this.notificationCallback({
          type: 'status_change',
          title: 'Order Status Updated',
          message: `Order #${data.orderNumber} is now ${data.newStatus || data.status}`,
          data
        });
      }
    });

    // Listen for restaurant-specific updates
    RealTimeService.addEventListener('restaurant_order_update', (data) => {
      logger.info('🔔 Restaurant received restaurant-specific order update', data);
      if (this.notificationCallback) {
        this.notificationCallback({
          type: 'restaurant_update',
          title: 'Restaurant Update',
          message: `Order #${data.orderNumber} updated`,
          data
        });
      }
    });
  }

  /**
   * Set callback for handling notifications
   */
  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }

  /**
   * Join restaurant room for notifications
   */
  joinRestaurantRoom(restaurantId) {
    if (!this.isInitialized) {
      logger.warn('RestaurantNotificationService not initialized');
      return false;
    }

    try {
      const result = RealTimeService.joinRoom('restaurant', restaurantId);
      logger.info('Restaurant joined notification room', { restaurantId, success: result });
      return result;
    } catch (error) {
      logger.error('Failed to join restaurant room', { restaurantId, error: error.message });
      return false;
    }
  }

  /**
   * Leave restaurant room
   */
  leaveRestaurantRoom(restaurantId) {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const result = RealTimeService.leaveRoom('restaurant', restaurantId);
      logger.info('Restaurant left notification room', { restaurantId, success: result });
      return result;
    } catch (error) {
      logger.error('Failed to leave restaurant room', { restaurantId, error: error.message });
      return false;
    }
  }
}

// Export singleton instance
export default new RestaurantNotificationService();