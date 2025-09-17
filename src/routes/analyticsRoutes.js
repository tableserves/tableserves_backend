const express = require('express');
const { authenticate, authorize, checkResourceOwnership } = require('../middleware/authMiddleware');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const {
  getTopPerformers,
  getAnalytics,
  getPerformanceMetrics
} = require('../controllers/analyticsController');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// Apply authentication to all analytics routes
router.use(authenticate);

/**
 * @route GET /api/v1/analytics/performance/top
 * @desc Get top performing restaurants/zones
 * @access Private (Admin only)
 */
router.get('/performance/top',
  authorize('admin'),
  ValidationRules.validateAnalyticsPeriod,
  handleValidation,
  wrapAsync(getTopPerformers, 'getTopPerformers')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;