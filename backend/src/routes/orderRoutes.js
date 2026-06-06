const express = require('express');
const { authenticate, authorize, checkFeatureAccess, optionalAuth } = require('../middleware/authMiddleware');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  getOrderByNumber,
  getRecentOrder,
  getCustomerOrder,
  addOrderFeedback,
  getRestaurantFeedback,
  getZoneFeedback,
  getOrderStatistics
} = require('../controllers/orderController');

const router = express.Router();

router.use(requestTimer);

const wrapAsync = createRouteHandler;

router.use(defaultRateLimiter);

/**
 * Public Routes (for customers)
 */

/**
 * @route POST /api/v1/orders
 * @desc Create new order (customer)
 * @access Public
 */
router.post('/',
  ValidationRules.createOrder,
  handleValidation,
  wrapAsync(createOrder, 'createOrder')
);

/**
 * @route POST /api/v1/orders/anonymous
 * @desc Create anonymous order from QR code without authentication
 * @access Public
 */
router.post('/anonymous',
  ValidationRules.createOrder,
  handleValidation,
  wrapAsync(createOrder, 'createAnonymousOrder')
);

/**
 * @route GET /api/v1/orders/track/:orderNumber
 * @desc Get order by order number for customer tracking
 * @access Public (requires customer phone for verification)
 */
router.get('/track/:orderNumber',
  wrapAsync(getOrderByNumber, 'getOrderByNumber')
);

/**
 * @route POST /api/v1/orders/track/:orderNumber/feedback
 * @desc Add feedback to completed order
 * @access Public (requires customer phone for verification)
 */
router.post('/track/:orderNumber/feedback',
  wrapAsync(addOrderFeedback, 'addOrderFeedback')
);

/**
 * @route GET /api/v1/orders/recent
 * @desc Get recent order for customer tracking
 * @access Public
 */
router.get('/recent',
  wrapAsync(getRecentOrder, 'getRecentOrder')
);

/**
 * @route GET /api/v1/orders/customer/:id
 * @desc Get order by ID for customer tracking
 * @access Public (requires customer phone for verification)
 */
router.get('/customer/:id',
  wrapAsync(getCustomerOrder, 'getCustomerOrder')
);

/**
 * Protected Routes - Require Authentication
 */

/**
 * @route GET /api/v1/orders/management
 * @desc Get all orders with filtering (admin, restaurant_owner)
 * @access Private
 */
router.get('/management',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_shop', 'zone_vendor', 'zone_admin'),
  getAllOrders
);

/**
 * @route GET /api/v1/orders/management/:id
 * @desc Get single order by ID (admin, restaurant_owner)
 * @access Private
 */
router.get('/management/:id',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_shop', 'zone_vendor', 'zone_admin'),
  getOrder
);

/**
 * @route PATCH /api/v1/orders/management/:id/status
 * @desc Update order status (admin, restaurant_owner)
 * @access Private
 */
router.patch('/management/:id/status',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_shop', 'zone_vendor', 'zone_admin'),
  updateOrderStatus
);

/**
 * @route GET /api/v1/orders/restaurants/:restaurantId/feedback
 * @desc Get feedback for restaurant
 * @access Private (restaurant_owner, admin)
 */
router.get('/restaurants/:restaurantId/feedback',
  authenticate,
  authorize('admin', 'super_admin', 'restaurant_owner'),
  wrapAsync(getRestaurantFeedback, 'getRestaurantFeedback')
);

/**
 * @route GET /api/v1/orders/zones/:zoneId/feedback
 * @desc Get feedback for zone (and zone shops when shopId is provided)
 * @access Private (zone_admin, zone_shop, zone_vendor, admin)
 */
router.get('/zones/:zoneId/feedback',
  authenticate,
  authorize('admin', 'super_admin', 'zone_admin', 'zone_shop', 'zone_vendor'),
  wrapAsync(getZoneFeedback, 'getZoneFeedback')
);

/**
 * @route GET /api/v1/orders/statistics
 * @desc Get order statistics (admin, restaurant_owner)
 * @access Private
 */
router.get('/statistics',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_shop', 'zone_vendor', 'zone_admin'),
  checkFeatureAccess('analytics'),
  getOrderStatistics
);

/**
 * Alternative Routes (for backward compatibility)
 */

/**
 * @route GET /api/v1/orders
 * @desc Get all orders (protected route)
 * @access Private
 */
router.get('/',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_shop', 'zone_vendor'),
  getAllOrders
);

/**
 * @route GET /api/v1/orders/:id
 * @desc Get single order (protected route)
 * @access Private
 */
router.get('/:id',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_shop', 'zone_vendor'),
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(getOrder, 'getOrder')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;