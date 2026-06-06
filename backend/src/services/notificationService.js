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
        from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'tableserves@example.com',
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        // Production email headers
        headers: {
          'X-Mailer': 'Tableserves',
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        },
        // Email tracking (optional)
        messageId: `tableserves-${Date.now()}-${Math.random().toString(36).substring(2, 11)}@tableserves.com`
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
      title: notificationData.title || 'Tableserves Notification',
      message: notificationData.message || 'You have received a new notification.',
      icon: 'bell',
      priority: 'medium'
    };

    const subject = notificationData.title || template.title;

    // Special handling for password reset emails
    if (notificationData.type === 'password_reset') {
      return this.generatePasswordResetEmail(notificationData, subject);
    }

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
            <h1>🍽️ Tableserves</h1>
            <h2>${template.title}</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            
            <div class="message-box">
              <p><strong>${notificationData.message || template.message}</strong></p>
            </div>

            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <div class="footer">
              <p>© 2024 Tableserves. All rights reserved.</p>
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
      
      © 2024 Tableserves. All rights reserved.
    `;

    return {
      subject: subject,
      html: html,
      text: text
    };
  }

  /**
   * Generate enhanced password reset email
   * @param {Object} notificationData - Notification data
   * @param {string} subject - Email subject
   * @returns {Object} - Email content
   */
  generatePasswordResetEmail(notificationData, subject) {
    // Extract reset link from message
    const messageLines = notificationData.message.split('\n');
    const resetLink = messageLines.find(line => line.includes('http')) || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937;
            background-color: #f3f4f6;
            padding: 20px;
          }
          .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white; 
            padding: 40px 30px;
            text-align: center;
          }
          .logo { 
            font-size: 48px;
            margin-bottom: 10px;
          }
          .header h1 { 
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 16px;
            opacity: 0.95;
            font-weight: 400;
          }
          .content { 
            padding: 40px 30px;
            background: white;
          }
          .greeting {
            font-size: 18px;
            color: #111827;
            margin-bottom: 20px;
            font-weight: 500;
          }
          .message-text {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.7;
            margin-bottom: 30px;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white !important;
            text-decoration: none;
            padding: 16px 48px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            transition: all 0.3s ease;
          }
          .reset-button:hover {
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
            transform: translateY(-2px);
          }
          .alternative-link {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          .alternative-link p {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 10px;
          }
          .link-text {
            font-size: 12px;
            color: #2563eb;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            background: white;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .warning-box p {
            font-size: 14px;
            color: #92400e;
            margin: 0;
          }
          .info-box {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 16px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .info-box p {
            font-size: 14px;
            color: #1e40af;
            margin: 0;
          }
          .footer { 
            background: #f9fafb;
            text-align: center; 
            color: #6b7280; 
            font-size: 13px;
            padding: 30px;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 8px 0;
          }
          .footer-links {
            margin-top: 15px;
          }
          .footer-links a {
            color: #2563eb;
            text-decoration: none;
            margin: 0 10px;
          }
          .divider {
            height: 1px;
            background: #e5e7eb;
            margin: 30px 0;
          }
          @media only screen and (max-width: 600px) {
            .email-wrapper { 
              border-radius: 0;
            }
            .header, .content, .footer {
              padding: 30px 20px;
            }
            .header h1 {
              font-size: 24px;
            }
            .reset-button {
              padding: 14px 36px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <div class="logo">🍽️</div>
            <h1>Tableserves</h1>
            <p>Password Reset Request</p>
          </div>
          
          <div class="content">
            <p class="greeting">Hello,</p>
            
            <p class="message-text">
              You are receiving this email because you (or someone else) have requested the reset of the password for your account. Please click on the following link, or paste this into your browser to complete the process:
            </p>

            <div class="button-container">
              <a href="${resetLink}" class="reset-button">Reset Your Password</a>
            </div>

            <div class="info-box">
              <p><strong>⏱️ This link will expire in 1 hour</strong> for security reasons. If you need a new link, please request another password reset.</p>
            </div>

            <div class="alternative-link">
              <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
              <div class="link-text">${resetLink}</div>
            </div>

            <div class="divider"></div>

            <div class="warning-box">
              <p><strong>⚠️ Didn't request this?</strong> If you did not request this password reset, please ignore this email and your password will remain unchanged. Your account is secure.</p>
            </div>

            <p class="message-text" style="margin-top: 30px;">
              If you have any questions or need assistance, please contact our support team.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>© 2024 Tableserves. All rights reserved.</strong></p>
            <p>This is an automated email, please do not reply.</p>
            <div class="footer-links">
              <a href="#">Help Center</a> • 
              <a href="#">Contact Support</a> • 
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Tableserves - Password Reset Request

Hello,

You are receiving this email because you (or someone else) have requested the reset of the password for your account.

Please click on the following link, or paste this into your browser to complete the process:

${resetLink}

⏱️ This link will expire in 1 hour for security reasons.

⚠️ If you did not request this, please ignore this email and your password will remain unchanged.

If you have any questions or need assistance, please contact our support team.

© 2024 Tableserves. All rights reserved.
This is an automated email, please do not reply.
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