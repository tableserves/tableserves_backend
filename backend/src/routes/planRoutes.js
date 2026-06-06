const express = require('express');
const PlanController = require('../controllers/planController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route GET /api/v1/plans/:planType
 * @desc Get all available plans by type
 * @access Public
 */
router.get('/:planType',
  defaultRateLimiter,
  [
    ValidationRules.validatePlanType,
    handleValidation
  ],
  PlanController.getPlans
);

/**
 * @route GET /api/v1/plans/:planType/:planKey
 * @desc Get specific plan details
 * @access Public
 */
router.get('/:planType/:planKey',
  defaultRateLimiter,
  [
    ValidationRules.validatePlanType,
    ValidationRules.validatePlanKey,
    handleValidation
  ],
  PlanController.getPlanDetails
);

/**
 * @route GET /api/v1/plans/:planType/compare
 * @desc Compare plans of a specific type
 * @access Public
 */
router.get('/:planType/compare',
  defaultRateLimiter,
  [
    ValidationRules.validatePlanType,
    handleValidation
  ],
  PlanController.comparePlans
);

/**
 * @route GET /api/v1/plans/recommend/:planType
 * @desc Get recommended plan for user based on usage
 * @access Private
 */
router.get('/recommend/:planType',
  defaultRateLimiter,
  authenticate,
  [
    ValidationRules.validatePlanType,
    handleValidation
  ],
  PlanController.getRecommendedPlan
);

/**
 * @route GET /api/v1/plans/can-upgrade/:planId
 * @desc Check if user can upgrade to a specific plan
 * @access Private
 */
router.get('/can-upgrade/:planId',
  defaultRateLimiter,
  authenticate,
  [
    ValidationRules.validateObjectId('planId'),
    handleValidation
  ],
  PlanController.canUpgrade
);

/**
 * @route GET /api/v1/plans/usage
 * @desc Get user's plan usage summary
 * @access Private
 */
router.get('/usage',
  defaultRateLimiter,
  authenticate,
  PlanController.getPlanUsage
);

/**
 * @route GET /api/v1/plans/recommendations
 * @desc Get plan recommendations for user
 * @access Private
 */
router.get('/recommendations',
  defaultRateLimiter,
  authenticate,
  PlanController.getPlanRecommendations
);

/**
 * @route GET /api/v1/plans/history
 * @desc Get user's plan history
 * @access Private
 */
router.get('/history',
  defaultRateLimiter,
  authenticate,
  PlanController.getPlanHistory
);

/**
 * @route POST /api/v1/plans/expire/:userId
 * @desc Manually expire user's plan (Admin only)
 * @access Private (Admin)
 */
router.post('/expire/:userId',
  defaultRateLimiter,
  authenticate,
  authorize('admin'),
  [
    ValidationRules.validateObjectId('userId'),
    handleValidation
  ],
  PlanController.expireUserPlan
);

/**
 * @route GET /api/v1/plans/statistics
 * @desc Get plan statistics (Admin only)
 * @access Private (Admin)
 */
router.get('/statistics',
  defaultRateLimiter,
  authenticate,
  authorize('admin'),
  PlanController.getPlanStatistics
);

module.exports = router;
