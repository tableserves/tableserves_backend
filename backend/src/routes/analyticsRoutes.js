const express = require('express');
const { authenticate, authorize, checkResourceOwnership } = require('../middleware/authMiddleware');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const {
  getTopPerformers,
  getZoneAnalytics,
  getShopAnalytics,
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

/**
 * @route GET /api/v1/analytics/zones/:zoneId
 * @desc Get zone analytics with revenue and order statistics
 * @access Private (Admin, Zone Admin - own zone only)
 */
router.get('/zones/:zoneId',
  authorize('admin', 'zone_admin'),
  ValidationRules.validateObjectId('zoneId'),
  handleValidation,
  wrapAsync(getZoneAnalytics, 'getZoneAnalytics')
);

/**
 * @route GET /api/v1/analytics/shops/:shopId
 * @desc Get shop analytics with revenue and order statistics
 * @access Private (Admin, Zone Admin, Shop Owner)
 */
router.get('/shops/:shopId',
  authorize('admin', 'zone_admin', 'vendor'),
  ValidationRules.validateObjectId('shopId'),
  handleValidation,
  wrapAsync(getShopAnalytics, 'getShopAnalytics')
);

/**
 * @route GET /api/v1/analytics
 * @desc Get general analytics
 * @access Private (Admin only)
 */
router.get('/',
  authorize('admin'),
  wrapAsync(getAnalytics, 'getAnalytics')
);

/**
 * @route GET /api/v1/analytics/performance
 * @desc Get performance metrics
 * @access Private (Admin only)
 */
router.get('/performance',
  authorize('admin'),
  wrapAsync(getPerformanceMetrics, 'getPerformanceMetrics')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;