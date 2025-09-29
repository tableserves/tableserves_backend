const socketService = require('./socketService');
const emailOTPService = require('./emailOTPService');
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
      [this.notificationTypes.ORDER_CREATED]: {
        title: 'New Order Received',
        message: 'A new order has been placed.',
        icon: 'shopping-cart',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.ORDER_UPDATED]: {
        title: 'Order Updated',
        message: 'Your order status has been updated.',
        icon: 'info',
        priority: 'medium',
        sound: false,
      },
      [this.notificationTypes.ORDER_READY]: {
        title: 'Order Ready',
        message: 'Your order is ready for pickup.',
        icon: 'check-circle',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.ORDER_COMPLETED]: {
        title: 'Order Completed',
        message: 'Your order has been completed.',
        icon: 'check-circle',
        priority: 'medium',
        sound: false,
      },
      [this.notificationTypes.ORDER_CANCELLED]: {
        title: 'Order Cancelled',
        message: 'Your order has been cancelled.',
        icon: 'x-circle',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.MENU_UPDATED]: {
        title: 'Menu Updated',
        message: 'The menu has been updated.',
        icon: 'book',
        priority: 'low',
        sound: false,
      },
      [this.notificationTypes.MENU_ITEM_UNAVAILABLE]: {
        title: 'Item Unavailable',
        message: 'An item in your order is unavailable.',
        icon: 'alert-triangle',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.TABLE_AVAILABLE]: {
        title: 'Table Available',
        message: 'A table is now available.',
        icon: 'coffee',
        priority: 'medium',
        sound: false,
      },
      [this.notificationTypes.PAYMENT_RECEIVED]: {
        title: 'Payment Received',
        message: 'Payment has been received for your order.',
        icon: 'dollar-sign',
        priority: 'medium',
        sound: false,
      },
      [this.notificationTypes.SYSTEM_MAINTENANCE]: {
        title: 'System Maintenance',
        message: 'System maintenance is scheduled.',
        icon: 'settings',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.SUBSCRIPTION_EXPIRING]: {
        title: 'Subscription Expiring',
        message: 'Your subscription is about to expire.',
        icon: 'clock',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.SHOP_APPROVED]: {
        title: 'Shop Approved',
        message: 'Your shop has been approved.',
        icon: 'check-circle',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.SHOP_REJECTED]: {
        title: 'Shop Rejected',
        message: 'Your shop application has been rejected.',
        icon: 'x-circle',
        priority: 'high',
        sound: true,
      },
      [this.notificationTypes.PASSWORD_RESET]: {
        title: 'Password Reset Request',
        message: 'You requested a password reset.',
        icon: 'lock',
        priority: 'high',
        sound: false,
      },
    };
  }

  /**
   * Send email notification
   * @param {string} email - Recipient email address
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.type - Type of notification
   * @param {string} notificationData.title - Title of the notification
   * @param {string} notificationData.message - Message content
   * @returns {Promise<Object>} - Send result
   */
  async sendEmailNotification(email, notificationData) {
    try {
      // If emailOTPService transporter is not available, log the notification
      if (!emailOTPService.transporter) {
        logger.info('📧 Email Notification (Development Mode):', {
          to: email,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message
        });
        return { success: true, message: 'Notification logged (development mode)' };
      }

      // Generate email content based on notification type
      const emailContent = this.generateEmailContent(notificationData);

      // Enhanced mail options for production
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'tableserve@example.com',
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        // Production email headers
        headers: {
          'X-Mailer': 'TableServe',
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        },
        // Email tracking (optional)
        messageId: `tableserve-${Date.now()}-${Math.random().toString(36).substring(2, 11)}@tableserve.com`
      };

      const result = await emailOTPService.transporter.sendMail(mailOptions);

      logger.info('Email notification sent successfully', {
        to: email,
        messageId: result.messageId,
        type: notificationData.type,
        environment: process.env.NODE_ENV
      });

      return {
        success: true,
        message: 'Notification sent to your email address',
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Failed to send email notification:', {
        error: error.message,
        email: email,
        type: notificationData.type,
        code: error.code,
        command: error.command
      });

      // Return user-friendly error message
      const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
      const isAuthError = error.code === 'EAUTH' || error.message.includes('authentication');

      let userMessage = 'Failed to send notification email. Please try again.';
      if (isNetworkError) {
        userMessage = 'Email service temporarily unavailable. Please try again in a few minutes.';
      } else if (isAuthError && process.env.NODE_ENV !== 'production') {
        userMessage = 'Email configuration error. Please check your email settings.';
      }

      return {
        success: false,
        message: userMessage,
        code: 'EMAIL_SEND_FAILED'
      };
    }
  }

  /**
   * Generate email content for notifications
   * @param {Object} notificationData - Notification data
   * @returns {Object} - Email content
   */
  generateEmailContent(notificationData) {
    const template = this.notificationTemplates[notificationData.type] || {
      title: notificationData.title || 'TableServe Notification',
      message: notificationData.message || 'You have received a new notification.',
      icon: 'bell',
      priority: 'medium'
    };

    const subject = notificationData.title || template.title;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍽️ TableServe</h1>
            <h2>${template.title}</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            
            <div class="message-box">
              <p><strong>${notificationData.message || template.message}</strong></p>
            </div>

            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <div class="footer">
              <p>© 2024 TableServe. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${template.title}
      
      ${notificationData.message || template.message}
      
      © 2024 TableServe. All rights reserved.
    `;

    return {
      subject: subject,
      html: html,
      text: text
    };
  }

  /**
   * Create and send notification
   * @param {string} userId - User ID to send notification to
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} - Notification result
   */
  async createNotification(userId, notificationData) {
    try {
      // Create notification in database
      const notification = new Notification({
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'medium',
        icon: notificationData.icon || 'bell',
        read: false,
        metadata: notificationData.metadata || {}
      });

      await notification.save();

      // Emit real-time notification via socket
      if (socketService.io) {
        socketService.io.to(`user_${userId}`).emit('notification', notification);
      }

      logger.info('Notification created and sent', {
        userId,
        type: notificationData.type,
        title: notificationData.title
      });

      return {
        success: true,
        notification: notification
      };
    } catch (error) {
      logger.error('Failed to create notification:', {
        error: error.message,
        userId,
        type: notificationData.type
      });

      return {
        success: false,
        message: 'Failed to create notification'
      };
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Notifications result
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 20,
        skip = 0,
        read = null,
        type = null
      } = options;

      // Build query
      const query = { userId };
      if (read !== null) query.read = read;
      if (type) query.type = type;

      // Get notifications
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count
      const totalCount = await Notification.countDocuments(query);

      return {
        success: true,
        notifications,
        totalCount,
        hasMore: skip + notifications.length < totalCount
      };
    } catch (error) {
      logger.error('Failed to get user notifications:', {
        error: error.message,
        userId
      });

      return {
        success: false,
        message: 'Failed to retrieve notifications'
      };
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Update result
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found'
        };
      }

      return {
        success: true,
        notification
      };
    } catch (error) {
      logger.error('Failed to mark notification as read:', {
        error: error.message,
        notificationId,
        userId
      });

      return {
        success: false,
        message: 'Failed to update notification'
      };
    }
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Update result
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', {
        error: error.message,
        userId
      });

      return {
        success: false,
        message: 'Failed to update notifications'
      };
    }
  }
}

module.exports = new NotificationService();