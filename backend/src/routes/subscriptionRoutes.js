const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const subscriptionController = require('../controllers/subscriptionController');
const catchAsync = require('../utils/catchAsync');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');

/**
 * Get current user's subscription
 * @route GET /api/subscriptions/current
 */
router.get('/current',
  authenticate,
  catchAsync(async (req, res) => {
    try {
      if (subscriptionController && subscriptionController.getCurrentSubscription) {
        return await subscriptionController.getCurrentSubscription(req, res);
      }
      
      // Fallback response
      res.json({
        success: true,
        data: {
          planKey: 'free',
          planType: req.user.role === 'zone_admin' ? 'zone' : 'restaurant',
          status: 'active',
          expiryDate: null,
          features: {
            maxMenuItems: 50,
            maxTables: 10,
            analytics: true
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: 'Subscription service temporarily unavailable' }
      });
    }
  })
);

/**
 * Upgrade subscription plan
 * @route POST /api/subscriptions/upgrade
 */
router.post('/upgrade',
  authenticate,
  ValidationRules.subscriptionUpgrade,
  handleValidation,
  catchAsync(subscriptionController.upgradePlan)
);

/**
 * Cancel subscription
 * @route POST /api/subscriptions/:subscriptionId/cancel
 */
router.post('/:subscriptionId/cancel',
  authenticate,
  catchAsync(subscriptionController.cancelSubscription)
);

/**
 * Get subscription usage
 * @route GET /api/subscriptions/:subscriptionId/usage
 */
router.get('/:subscriptionId/usage',
  authenticate,
  catchAsync(subscriptionController.getSubscriptionUsage)
);

/**
 * Get available plans
 * @route GET /api/subscriptions/plans
 */
router.get('/plans',
  catchAsync(subscriptionController.getAvailablePlans)
);

/**
 * Check subscription limits
 * @route GET /api/subscriptions/limits/check
 */
router.get('/limits/check',
  authenticate,
  catchAsync(subscriptionController.checkSubscriptionLimits)
);

/**
 * Process subscription payment
 * @route POST /api/subscriptions/payment
 */
router.post('/payment',
  authenticate,
  ValidationRules.subscriptionPayment,
  handleValidation,
  catchAsync(subscriptionController.processSubscriptionPayment)
);

/**
 * Verify subscription payment
 * @route POST /api/subscriptions/payment/:paymentId/verify
 */
router.post('/payment/:paymentId/verify',
  authenticate,
  catchAsync(subscriptionController.verifySubscriptionPayment)
);

/**
 * Get subscription notifications
 * @route GET /api/subscriptions/notifications
 */
router.get('/notifications',
  authenticate,
  catchAsync(subscriptionController.getSubscriptionNotifications)
);

/**
 * Mark notification as read
 * @route PATCH /api/subscriptions/notifications/:notificationId/read
 */
router.patch('/notifications/:notificationId/read',
  authenticate,
  catchAsync(subscriptionController.markNotificationRead)
);

/**
 * Get subscription metrics
 * @route GET /api/subscriptions/metrics
 */
router.get('/metrics',
  authenticate,
  catchAsync(subscriptionController.getSubscriptionMetrics)
);

// Admin-only routes
/**
 * Get all subscriptions (admin only)
 * @route GET /api/admin/subscriptions
 */
router.get('/admin/subscriptions',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getAllSubscriptions)
);

/**
 * Get subscription details (admin only)
 * @route GET /api/admin/subscriptions/:subscriptionId
 */
router.get('/admin/subscriptions/:subscriptionId',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getSubscriptionDetails)
);

/**
 * Extend subscription (admin only)
 * @route POST /api/admin/subscriptions/:subscriptionId/extend
 */
router.post('/admin/subscriptions/:subscriptionId/extend',
  authenticate,
  authorize('admin'),
  ValidationRules.subscriptionExtension,
  handleValidation,
  catchAsync(subscriptionController.extendSubscription)
);

/**
 * Get subscription analytics (admin only)
 * @route GET /api/admin/subscriptions/analytics
 */
router.get('/admin/subscriptions/analytics',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getSubscriptionAnalytics)
);

/**
 * Generate subscription report (admin only)
 * @route POST /api/admin/subscriptions/report
 */
router.post('/admin/subscriptions/report',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.generateSubscriptionReport)
);

/**
 * Get expiring subscriptions (admin only)
 * @route GET /api/admin/subscriptions/expiring
 */
router.get('/admin/subscriptions/expiring',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getExpiringSubscriptions)
);

/**
 * Send subscription reminder (admin only)
 * @route POST /api/admin/subscriptions/:subscriptionId/remind
 */
router.post('/admin/subscriptions/:subscriptionId/remind',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.sendSubscriptionReminder)
);

/**
 * Update subscription status (admin only)
 * @route PATCH /api/admin/subscriptions/:subscriptionId/status
 */
router.patch('/admin/subscriptions/:subscriptionId/status',
  authenticate,
  authorize('admin'),
  ValidationRules.subscriptionStatusUpdate,
  handleValidation,
  catchAsync(subscriptionController.updateSubscriptionStatus)
);

/**
 * Get subscription revenue analytics (admin only)
 * @route GET /api/admin/subscriptions/revenue
 */
router.get('/admin/subscriptions/revenue',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getRevenueAnalytics)
);

/**
 * Get plan distribution (admin only)
 * @route GET /api/admin/subscriptions/distribution
 */
router.get('/admin/subscriptions/distribution',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getPlanDistribution)
);

/**
 * Create custom subscription (admin only)
 * @route POST /api/admin/subscriptions/custom
 */
router.post('/admin/subscriptions/custom',
  authenticate,
  authorize('admin'),
  ValidationRules.customSubscription,
  handleValidation,
  catchAsync(subscriptionController.createCustomSubscription)
);

/**
 * Get subscription history (admin only)
 * @route GET /api/admin/subscriptions/history/:userId
 */
router.get('/admin/subscriptions/history/:userId',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getSubscriptionHistory)
);

/**
 * Bulk update subscriptions (admin only)
 * @route PATCH /api/admin/subscriptions/bulk-update
 */
router.patch('/admin/subscriptions/bulk-update',
  authenticate,
  authorize('admin'),
  ValidationRules.bulkSubscriptionUpdate,
  handleValidation,
  catchAsync(subscriptionController.bulkUpdateSubscriptions)
);

/**
 * Export subscription data (admin only)
 * @route GET /api/admin/subscriptions/export
 */
router.get('/admin/subscriptions/export',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.exportSubscriptionData)
);

/**
 * Get subscription trends (admin only)
 * @route GET /api/admin/subscriptions/trends
 */
router.get('/admin/subscriptions/trends',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getSubscriptionTrends)
);

/**
 * Get churn analysis (admin only)
 * @route GET /api/admin/subscriptions/churn-analysis
 */
router.get('/admin/subscriptions/churn-analysis',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getChurnAnalysis)
);

/**
 * Get subscription forecast (admin only)
 * @route GET /api/admin/subscriptions/forecast
 */
router.get('/admin/subscriptions/forecast',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.getSubscriptionForecast)
);

/**
 * Update subscription limits (admin only)
 * @route PATCH /api/admin/subscriptions/:subscriptionId/limits
 */
router.patch('/admin/subscriptions/:subscriptionId/limits',
  authenticate,
  authorize('admin'),
  catchAsync(subscriptionController.updateSubscriptionLimits)
);

module.exports = router;
