const express = require('express');
const { body } = require('express-validator');
const PaymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route POST /api/v1/payment/create-plan-order
 * @desc Create Razorpay order for plan purchase
 * @access Private
 */
router.post('/create-plan-order',
  defaultRateLimiter,
  authenticate,
  [
    // Custom validation to allow either planId OR (planKey + planType)
    body().custom((value, { req }) => {
      const { planId, planKey, planType } = req.body;

      if (planId) {
        // If planId is provided, validate it's a valid ObjectId
        if (!planId.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error('planId must be a valid ObjectId');
        }
        return true;
      } else if (planKey && planType) {
        // If planKey and planType are provided, validate them
        if (!['restaurant', 'zone'].includes(planType)) {
          throw new Error('planType must be restaurant or zone');
        }
        if (!planKey.match(/^[a-z0-9_-]+$/)) {
          throw new Error('planKey can only contain lowercase letters, numbers, underscores, and hyphens');
        }
        return true;
      } else {
        throw new Error('Either planId or both planKey and planType are required');
      }
    }),
    handleValidation
  ],
  PaymentController.createPlanOrder
);

/**
 * @route POST /api/v1/payment/verify-plan-payment
 * @desc Verify Razorpay payment and activate plan
 * @access Private
 */
router.post('/verify-plan-payment',
  defaultRateLimiter,
  authenticate,
  [
    ValidationRules.validateRequired(['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']),
    handleValidation
  ],
  PaymentController.verifyPlanPayment
);

/**
 * @route POST /api/v1/payment/razorpay-webhook
 * @desc Handle Razorpay webhooks
 * @access Public (but signature verified)
 */
router.post('/razorpay-webhook',
  // Note: No rate limiting for webhooks as they come from Razorpay
  PaymentController.handleWebhook
);

/**
 * @route GET /api/v1/payment/history
 * @desc Get user's payment history
 * @access Private
 */
router.get('/history',
  defaultRateLimiter,
  authenticate,
  [
    ValidationRules.validatePagination,
    handleValidation
  ],
  PaymentController.getPaymentHistory
);

/**
 * @route GET /api/v1/payment/current-plan
 * @desc Get current plan details
 * @access Private
 */
router.get('/current-plan',
  defaultRateLimiter,
  authenticate,
  PaymentController.getCurrentPlan
);

module.exports = router;
