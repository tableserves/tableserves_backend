const { Order } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Payment Cleanup Service
 * Handles cleanup of expired payments and orphaned payment records
 */
class PaymentCleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  /**
   * Start the cleanup service
   * @param {number} intervalMinutes - Cleanup interval in minutes (default: 30)
   */
  start(intervalMinutes = 30) {
    if (this.isRunning) {
      logger.warn('Payment cleanup service is already running');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    
    logger.info('Starting payment cleanup service', {
      intervalMinutes: intervalMinutes,
      intervalMs: intervalMs
    });

    // Run initial cleanup
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Payment cleanup service is not running');
      return;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    logger.info('Payment cleanup service stopped');
  }

  /**
   * Run cleanup process
   */
  async runCleanup() {
    try {
      logger.info('Starting payment cleanup process');

      const results = await Promise.all([
        this.cleanupExpiredPayments(),
        this.cleanupStaleProcessingPayments(),
        this.logPaymentStatistics()
      ]);

      const [expiredCount, staleCount] = results;

      logger.info('Payment cleanup completed', {
        expiredPayments: expiredCount,
        stalePayments: staleCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Payment cleanup failed', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Clean up expired payments
   * @returns {number} Number of cleaned up payments
   */
  async cleanupExpiredPayments() {
    try {
      const now = new Date();
      
      // Find orders with expired payments that are still in processing state
      const expiredOrders = await Order.find({
        'payment.status': 'processing',
        'payment.expiresAt': { $lt: now }
      });

      let cleanedCount = 0;

      for (const order of expiredOrders) {
        try {
          await order.markPaymentFailed('Payment expired - cleaned up by system');
          cleanedCount++;

          logger.info('Expired payment cleaned up', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            razorpayOrderId: order.payment.razorpayOrderId,
            expiredAt: order.payment.expiresAt
          });
        } catch (error) {
          logger.error('Failed to cleanup expired payment', {
            orderId: order._id,
            error: error.message
          });
        }
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error during expired payment cleanup', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Clean up stale processing payments (older than 1 hour without expiry date)
   * @returns {number} Number of cleaned up payments
   */
  async cleanupStaleProcessingPayments() {
    try {
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      
      // Find orders with processing payments older than 1 hour without expiry date
      const staleOrders = await Order.find({
        'payment.status': 'processing',
        'payment.expiresAt': { $exists: false },
        'updatedAt': { $lt: oneHourAgo }
      });

      let cleanedCount = 0;

      for (const order of staleOrders) {
        try {
          await order.markPaymentFailed('Payment stale - cleaned up by system');
          cleanedCount++;

          logger.info('Stale payment cleaned up', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            razorpayOrderId: order.payment.razorpayOrderId,
            lastUpdated: order.updatedAt
          });
        } catch (error) {
          logger.error('Failed to cleanup stale payment', {
            orderId: order._id,
            error: error.message
          });
        }
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error during stale payment cleanup', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Log payment statistics for monitoring
   */
  async logPaymentStatistics() {
    try {
      const stats = await Order.aggregate([
        {
          $group: {
            _id: '$payment.status',
            count: { $sum: 1 }
          }
        }
      ]);

      const paymentStats = {};
      stats.forEach(stat => {
        paymentStats[stat._id] = stat.count;
      });

      // Get processing payments with Razorpay order IDs
      const processingWithRazorpay = await Order.countDocuments({
        'payment.status': 'processing',
        'payment.razorpayOrderId': { $exists: true, $ne: null }
      });

      // Get expired but not cleaned payments
      const expiredNotCleaned = await Order.countDocuments({
        'payment.status': 'processing',
        'payment.expiresAt': { $lt: new Date() }
      });

      logger.info('Payment statistics', {
        paymentStatusCounts: paymentStats,
        processingWithRazorpayOrderId: processingWithRazorpay,
        expiredNotCleaned: expiredNotCleaned,
        timestamp: new Date().toISOString()
      });

      return paymentStats;
    } catch (error) {
      logger.error('Error generating payment statistics', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Manual cleanup trigger (for testing or emergency cleanup)
   */
  async manualCleanup() {
    logger.info('Manual payment cleanup triggered');
    await this.runCleanup();
  }

  /**
   * Get cleanup service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.cleanupInterval
    };
  }
}

// Export singleton instance
module.exports = new PaymentCleanupService();
