const express = require('express');
const { handleOrderPaymentWebhook } = require('../controllers/orderController');
const { logger } = require('../utils/logger');
const { validateWebhookSignature, logPaymentSecurityEvents } = require('../middleware/paymentSecurity');

const router = express.Router();

/**
 * Webhook routes for external services
 * These routes don't require authentication but may require signature verification
 */

/**
 * @route POST /api/webhooks/razorpay-orders
 * @desc Handle Razorpay webhook for order payments
 * @access Public (signature verified)
 */
router.post('/razorpay-orders',
  logPaymentSecurityEvents,
  validateWebhookSignature,
  async (req, res) => {
    try {
      await handleOrderPaymentWebhook(req, res);
    } catch (error) {
      logger.error('Webhook error', {
        path: req.path,
        error: error.message,
        stack: error.stack
      });

      // Always return 200 to prevent webhook retries for application errors
      res.status(200).json({
        success: false,
        message: 'Webhook processed with errors'
      });
    }
  }
);

module.exports = router;
