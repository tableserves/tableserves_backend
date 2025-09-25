const express = require('express');
const { authenticate, authorize, checkFeatureAccess, optionalAuth } = require('../middleware/authMiddleware');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const {
  paymentCreationLimiter,
  paymentVerificationLimiter,
  validatePaymentCreation,
  validatePaymentVerification,
  handleValidationErrors: handlePaymentValidationErrors,
  sanitizePaymentData,
  logPaymentSecurityEvents,
  paymentErrorHandler
} = require('../middleware/paymentSecurity');
const {
  createOrderLimiter,
  statusUpdateLimiter,
  trackingLimiter,
  validateOrderCreation,
  validateStatusUpdate,
  validateOrderTracking,
  handleValidationErrors,
  requireRole,
  requireZoneAccess,
  requireShopAccess,
  requireCustomerOrderAccess,
  sanitizeInput,
  logSecurityEvents
} = require('../middleware/multiShopOrderSecurity');
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
  getOrderStatistics,
  // Multi-shop zone order endpoints
  createMultiShopZoneOrder,
  updateShopOrderStatus,
  getZoneOrderTracking,
  getShopOrderTracking,
  getZoneOrderAnalytics,
  batchUpdateOrderStatus,
  // Payment endpoints
  createOrderPayment,
  verifyOrderPayment,
  handleOrderPaymentWebhook
} = require('../controllers/orderController');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Apply security middleware to all routes
router.use(sanitizeInput);
router.use(logSecurityEvents);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// Apply rate limiting to all order routes
router.use(defaultRateLimiter);

/**
 * Enhanced Multi-Shop Zone Order Routes with Security
 */

/**
 * @route POST /api/v1/orders/secure/multi-shop-zone
 * @desc Create a new multi-shop zone order with enhanced security
 * @access Private (customers)
 */
router.post('/secure/multi-shop-zone',
  createOrderLimiter,
  authenticate,
  requireRole(['customer']),
  validateOrderCreation,
  handleValidationErrors,
  requireZoneAccess,
  wrapAsync(createMultiShopZoneOrder, 'createMultiShopZoneOrder')
);

/**
 * @route PUT /api/v1/orders/secure/:orderId/status
 * @desc Update shop order status with enhanced security
 * @access Private (shop_admin, zone_admin)
 */
router.put('/secure/:orderId/status',
  statusUpdateLimiter,
  authenticate,
  requireRole(['shop_admin', 'zone_admin']),
  validateStatusUpdate,
  handleValidationErrors,
  requireShopAccess,
  wrapAsync(updateShopOrderStatus, 'updateShopOrderStatus')
);

/**
 * @route GET /api/v1/orders/secure/:orderId/tracking
 * @desc Get comprehensive order tracking with enhanced security
 * @access Private (customer, shop_admin, zone_admin)
 */
router.get('/secure/:orderId/tracking',
  trackingLimiter,
  authenticate,
  requireRole(['customer', 'shop_admin', 'zone_admin']),
  validateOrderTracking,
  handleValidationErrors,
  requireCustomerOrderAccess,
  wrapAsync(getZoneOrderTracking, 'getZoneOrderTracking')
);

/**
 * @route GET /api/v1/orders/secure/zone/:zoneId/active
 * @desc Get active orders for a zone with enhanced security
 * @access Private (zone_admin)
 */
router.get('/secure/zone/:zoneId/active',
  authenticate,
  requireRole(['zone_admin']),
  requireZoneAccess,
  wrapAsync(getZoneOrderAnalytics, 'getActiveZoneOrders')
);

/**
 * @route GET /api/v1/orders/secure/shop/:shopId/active
 * @desc Get active orders for a shop with enhanced security
 * @access Private (shop_admin)
 */
router.get('/secure/shop/:shopId/active',
  authenticate,
  requireRole(['shop_admin']),
  requireShopAccess,
  wrapAsync(getShopOrderTracking, 'getActiveShopOrders')
);

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
 * @route POST /api/v1/orders/zone/multi-shop
 * @desc Create multi-shop zone order with enhanced tracking
 * @access Public
 */
router.post('/zone/multi-shop',
  ValidationRules.createOrder,
  handleValidation,
  wrapAsync(createMultiShopZoneOrder, 'createMultiShopZoneOrder')
);

/**
 * @route GET /api/v1/orders/track/:orderNumber/enhanced
 * @desc Get enhanced order tracking with multi-shop zone support
 * @access Public (requires customer phone for verification)
 */
router.get('/track/:orderNumber/enhanced',
  wrapAsync(getZoneOrderTracking, 'getZoneOrderTracking')
);

/**
 * @route GET /api/v1/orders/shop/:shopOrderId/tracking
 * @desc Get shop order tracking information
 * @access Private (shop owners, zone admins, admins)
 */
router.get('/shop/:shopOrderId/tracking',
  authenticate,
  authorize('admin', 'super_admin', 'zone_admin', 'zone_shop', 'zone_vendor'),
  wrapAsync(getShopOrderTracking, 'getShopOrderTracking')
);

/**
 * @route PATCH /api/v1/orders/shop/:shopOrderId/status
 * @desc Update shop order status with parent order coordination
 * @access Private (shop owners, zone admins, admins)
 */
router.patch('/shop/:shopOrderId/status',
  authenticate,
  authorize('admin', 'super_admin', 'zone_admin', 'zone_shop', 'zone_vendor'),
  ValidationRules.validateObjectId('shopOrderId'),
  handleValidation,
  wrapAsync(updateShopOrderStatus, 'updateShopOrderStatus')
);

/**
 * @route GET /api/v1/orders/zones/:zoneId/analytics
 * @desc Get zone order analytics with multi-shop breakdown
 * @access Private (zone admins, admins)
 */
router.get('/zones/:zoneId/analytics',
  authenticate,
  authorize('admin', 'super_admin', 'zone_admin'),
  ValidationRules.validateObjectId('zoneId'),
  handleValidation,
  wrapAsync(getZoneOrderAnalytics, 'getZoneOrderAnalytics')
);

/**
 * @route PUT /api/v1/orders/batch/status
 * @desc Batch update order statuses
 * @access Private (admins, zone admins)
 */
router.put('/batch/status',
  authenticate,
  authorize('admin', 'super_admin', 'zone_admin'),
  wrapAsync(batchUpdateOrderStatus, 'batchUpdateOrderStatus')
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
 * @desc Get feedback for zone
 * @access Private (zone_admin, admin)
 */
router.get('/zones/:zoneId/feedback',
  authenticate,
  authorize('admin', 'super_admin', 'zone_admin'),
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

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/**
 * @route POST /api/v1/orders/create-payment
 * @desc Create Razorpay order for payment
 * @access Public
 */
router.post('/create-payment',
  paymentCreationLimiter,
  logPaymentSecurityEvents,
  sanitizePaymentData,
  validatePaymentCreation,
  handlePaymentValidationErrors,
  wrapAsync(createOrderPayment, 'createOrderPayment'),
  paymentErrorHandler
);

/**
 * @route POST /api/v1/orders/verify-payment
 * @desc Verify Razorpay payment
 * @access Public
 */
router.post('/verify-payment',
  paymentVerificationLimiter,
  logPaymentSecurityEvents,
  sanitizePaymentData,
  validatePaymentVerification,
  handlePaymentValidationErrors,
  wrapAsync(verifyOrderPayment, 'verifyOrderPayment'),
  paymentErrorHandler
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;