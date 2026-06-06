/**
 * Order Tracking Service
 * localStorage used ONLY for UX convenience (pre-filling forms)
 * ALWAYS fetch fresh data from server as source of truth
 */
class OrderTrackingService {
  // Session storage keys
  static KEYS = {
    ORDER_NUMBER: 'currentOrderNumber',
    CUSTOMER_PHONE: 'currentOrderPhone',
    RESTAURANT_ID: 'currentRestaurantId',
    ZONE_ID: 'currentZoneId',
    TABLE_NUMBER: 'currentTableNumber'
  };

  /**
   * Store order info in localStorage for UX ONLY
   * This is NOT the source of truth - always fetch from server
   */
  static storeOrderInfo(orderData) {
    try {
      // Store for form pre-filling only
      if (orderData.orderNumber) {
        localStorage.setItem(this.KEYS.ORDER_NUMBER, orderData.orderNumber);
      }
      
      // Handle customer phone from either customer.phone or customerPhone directly
      const customerPhone = orderData.customer?.phone || orderData.customerPhone;
      if (customerPhone) {
        localStorage.setItem(this.KEYS.CUSTOMER_PHONE, customerPhone);
      }
      
      if (orderData.restaurantId) {
        localStorage.setItem(this.KEYS.RESTAURANT_ID, orderData.restaurantId);
      }
      
      if (orderData.zoneId) {
        localStorage.setItem(this.KEYS.ZONE_ID, orderData.zoneId);
      }
      
      if (orderData.tableNumber) {
        localStorage.setItem(this.KEYS.TABLE_NUMBER, orderData.tableNumber);
      }
      
      console.log('Order info stored for UX (not source of truth):', {
        orderNumber: orderData.orderNumber,
        phone: customerPhone,
        restaurantId: orderData.restaurantId,
        zoneId: orderData.zoneId,
        tableNumber: orderData.tableNumber
      });
    } catch (error) {
      console.error('Failed to store order tracking info:', error);
    }
  }

  /**
   * Get order info from localStorage for UX ONLY
   * WARNING: This data may be stale - always fetch from server
   */
  static getCurrentOrderInfo() {
    try {
      return {
        orderNumber: localStorage.getItem(this.KEYS.ORDER_NUMBER),
        customerPhone: localStorage.getItem(this.KEYS.CUSTOMER_PHONE),
        restaurantId: localStorage.getItem(this.KEYS.RESTAURANT_ID),
        zoneId: localStorage.getItem(this.KEYS.ZONE_ID),
        tableNumber: localStorage.getItem(this.KEYS.TABLE_NUMBER)
      };
    } catch (error) {
      console.error('Failed to get order tracking info:', error);
      return {};
    }
  }

  /**
   * Clear order tracking information
   */
  static clearOrderInfo() {
    try {
      Object.values(this.KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Order tracking info cleared');
    } catch (error) {
      console.error('Failed to clear order tracking info:', error);
    }
  }

  /**
   * Check if we have valid order tracking information
   */
  static hasValidOrderInfo() {
    const info = this.getCurrentOrderInfo();
    return !!(info.orderNumber && info.customerPhone);
  }

  /**
   * Generate tracking URL for current order
   */
  static getTrackingUrl() {
    const info = this.getCurrentOrderInfo();
    if (info.orderNumber && info.customerPhone) {
      return `/track/${info.orderNumber}?phone=${encodeURIComponent(info.customerPhone)}`;
    }
    return null;
  }

  /**
   * Fetch order data using stored tracking info
   * ALWAYS use this as source of truth (not localStorage)
   */
  static async fetchCurrentOrder() {
    const info = this.getCurrentOrderInfo();
    
    if (!info.orderNumber || !info.customerPhone) {
      throw new Error('No order tracking information available');
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/orders/track/${info.orderNumber}?phone=${encodeURIComponent(info.customerPhone)}`
      );
      
      if (!response.ok) {
        throw new Error('Order not found or invalid phone number');
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch order');
      }
    } catch (error) {
      console.error('Failed to fetch current order:', error);
      throw error;
    }
  }
}

export default OrderTrackingService;