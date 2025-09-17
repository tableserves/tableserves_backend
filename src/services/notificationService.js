const socketService = require('./socketService');
const { logger } = require('../utils/logger');
const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    this.notificationTypes = {
      ORDER_CREATED: 'order_created',
      ORDER_UPDATED: 'order_updated',
      ORDER_READY: 'order_ready',
      ORDER_COMPLETED: 'order_completed',
      ORDER_CANCELLED: 'order_cancelled',
      MENU_UPDATED: 'menu_updated',
      MENU_ITEM_UNAVAILABLE: 'menu_item_unavailable',
      TABLE_AVAILABLE: 'table_available',
      PAYMENT_RECEIVED: 'payment_received',
      SYSTEM_MAINTENANCE: 'system_maintenance',
      SUBSCRIPTION_EXPIRING: 'subscription_expiring',
      SHOP_APPROVED: 'shop_approved',
      SHOP_REJECTED: 'shop_rejected',
      PASSWORD_RESET: 'password_reset',
    };

    this.notificationTemplates = {
      // ... (other templates)
      [this.notificationTypes.PASSWORD_RESET]: {
        title: 'Password Reset Request',
        message: 'You requested a password reset.',
        icon: 'lock',
        priority: 'high',
        sound: false,
      },
    };
  }

  // ... (rest of the file remains the same)
}

module.exports = new NotificationService();