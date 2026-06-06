const express = require('express');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { createRouteHandler, requestTimer } = require('../middleware/routeErrorHandler');
const {
  submitTableServeRating,
  getTableServeStatistics,
  getRecentTableServeRatings,
  getAllTableServeRatings,
  getPublicTableServeStatistics,
  getPublicRecentTableServeRatings
} = require('../controllers/tableServeRatingController');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// Apply rate limiting to all routes
router.use(defaultRateLimiter);

/**
 * Public Routes
 */

/**
 * @route POST /api/v1/tableserve-ratings
 * @desc Submit TableServe platform rating
 * @access Public
 */
router.post('/',
  wrapAsync(submitTableServeRating, 'submitTableServeRating')
);

/**
 * @route GET /api/v1/tableserve-ratings/public-statistics
 * @desc Get public TableServe platform statistics
 * @access Public
 */
router.get('/public-statistics',
  wrapAsync(getPublicTableServeStatistics, 'getPublicTableServeStatistics')
);

/**
 * @route GET /api/v1/tableserve-ratings/public-recent
 * @desc Get recent public TableServe ratings
 * @access Public
 */
router.get('/public-recent',
  wrapAsync(getPublicRecentTableServeRatings, 'getPublicRecentTableServeRatings')
);

/**
 * Protected Routes - Require Authentication
 */

/**
 * @route GET /api/v1/tableserve-ratings/statistics
 * @desc Get TableServe platform statistics
 * @access Private (super_admin, admin)
 */
router.get('/statistics',
  authenticate,
  authorize('super_admin', 'admin'),
  wrapAsync(getTableServeStatistics, 'getTableServeStatistics')
);

/**
 * @route GET /api/v1/tableserve-ratings/recent
 * @desc Get recent TableServe ratings for dashboard
 * @access Private (super_admin, admin)
 */
router.get('/recent',
  authenticate,
  authorize('super_admin', 'admin'),
  wrapAsync(getRecentTableServeRatings, 'getRecentTableServeRatings')
);

/**
 * @route GET /api/v1/tableserve-ratings
 * @desc Get all TableServe ratings with filtering
 * @access Private (super_admin, admin, restaurant_owner, zone_admin, zone_shop)
 */
router.get('/',
  authenticate,
  authorize('super_admin', 'admin', 'restaurant_owner', 'zone_admin', 'zone_shop'),
  wrapAsync(getAllTableServeRatings, 'getAllTableServeRatings')
);

module.exports = router;