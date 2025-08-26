const express = require('express');
const { authenticate, authorize, checkFeatureAccess, checkResourceOwnership } = require('../middleware/authMiddleware');
const {
  getAllRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  addTable,
  updateTable,
  removeTable,
  getRestaurantStats,
  toggleRestaurantStatus,
  getRestaurantBySlug
} = require('../controllers/restaurantController');

const router = express.Router();

/**
 * Public Routes
 */

/**
 * @route GET /api/v1/restaurants/public/:slug
 * @desc Get restaurant by slug (public access for menu viewing)
 * @access Public
 */
router.get('/public/:slug', getRestaurantBySlug);

/**
 * Protected Routes - Require Authentication
 */

/**
 * @route GET /api/v1/restaurants
 * @desc Get all restaurants (admin) or user's restaurants
 * @access Private (admin, restaurant_owner)
 */
router.get('/', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  getAllRestaurants
);

/**
 * @route POST /api/v1/restaurants
 * @desc Create new restaurant
 * @access Private (admin, restaurant_owner)
 */
router.post('/', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  checkFeatureAccess('crudMenu'),
  createRestaurant
);

/**
 * @route GET /api/v1/restaurants/:id
 * @desc Get single restaurant by ID
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.get('/:id', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  getRestaurant
);

/**
 * @route PUT /api/v1/restaurants/:id
 * @desc Update restaurant
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.put('/:id', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  checkFeatureAccess('crudMenu'),
  updateRestaurant
);

/**
 * @route DELETE /api/v1/restaurants/:id
 * @desc Delete restaurant (soft delete)
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.delete('/:id', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  deleteRestaurant
);

/**
 * @route PATCH /api/v1/restaurants/:id/toggle-status
 * @desc Toggle restaurant active status
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.patch('/:id/toggle-status', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  toggleRestaurantStatus
);

/**
 * @route GET /api/v1/restaurants/:id/stats
 * @desc Get restaurant statistics
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.get('/:id/stats', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  checkFeatureAccess('analytics'),
  getRestaurantStats
);

/**
 * Table Management Routes
 */

/**
 * @route POST /api/v1/restaurants/:id/tables
 * @desc Add table to restaurant
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.post('/:id/tables', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  checkFeatureAccess('qrGeneration'),
  addTable
);

/**
 * @route PUT /api/v1/restaurants/:id/tables/:tableId
 * @desc Update restaurant table
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.put('/:id/tables/:tableId', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  updateTable
);

/**
 * @route DELETE /api/v1/restaurants/:id/tables/:tableId
 * @desc Remove table from restaurant
 * @access Private (admin, restaurant_owner - own restaurants only)
 */
router.delete('/:id/tables/:tableId', 
  authenticate, 
  authorize('admin', 'restaurant_owner'),
  removeTable
);

module.exports = router;