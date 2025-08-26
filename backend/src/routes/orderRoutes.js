const express = require('express');
const { authenticate, authorize, checkFeatureAccess, optionalAuth } = require('../middleware/authMiddleware');
const {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  getOrderByNumber,
  addOrderFeedback,
  getOrderStatistics
} = require('../controllers/orderController');

const router = express.Router();

/**
 * Public Routes (for customers)
 */

/**
 * @route POST /api/v1/orders
 * @desc Create new order (customer)
 * @access Public
 */
router.post('/', createOrder);

/**
 * @route GET /api/v1/orders/track/:orderNumber
 * @desc Get order by order number for customer tracking
 * @access Public (requires customer phone for verification)
 */
router.get('/track/:orderNumber', getOrderByNumber);

/**
 * @route POST /api/v1/orders/track/:orderNumber/feedback
 * @desc Add feedback to completed order
 * @access Public (requires customer phone for verification)
 */
router.post('/track/:orderNumber/feedback', addOrderFeedback);

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
  authorize('admin', 'restaurant_owner'),
  getAllOrders
);

/**
 * @route GET /api/v1/orders/management/:id
 * @desc Get single order by ID (admin, restaurant_owner)
 * @access Private
 */
router.get('/management/:id', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  getOrder
);

/**
 * @route PATCH /api/v1/orders/management/:id/status
 * @desc Update order status (admin, restaurant_owner)
 * @access Private
 */
router.patch('/management/:id/status', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  updateOrderStatus
);

/**
 * @route GET /api/v1/orders/statistics
 * @desc Get order statistics (admin, restaurant_owner)
 * @access Private
 */
router.get('/statistics', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
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
  authorize('admin', 'restaurant_owner'),
  getAllOrders
);

/**
 * @route GET /api/v1/orders/:id
 * @desc Get single order (protected route)
 * @access Private
 */
router.get('/:id', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  getOrder
);

module.exports = router;