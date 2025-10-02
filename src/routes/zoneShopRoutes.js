const express = require('express');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { authenticate, authorize, checkFeatureAccess, checkResourceOwnership, optionalAuth } = require('../middleware/authMiddleware');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const PlanValidationMiddleware = require('../middleware/planValidationMiddleware');
const ZoneShopController = require('../controllers/zoneShopController');
const { uploadMiddleware } = require('../services/uploadService');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// ==================== PUBLIC ROUTES ====================

// @route   GET /api/v1/shops/search
// @desc    Search shops across zones
// @access  Public
router.get('/search',
  wrapAsync(ZoneShopController.searchShops, 'searchShops')
);

// @route   GET /api/v1/shops/top-rated
// @desc    Get top-rated shops
// @access  Public
router.get('/top-rated',
  wrapAsync(ZoneShopController.getTopRatedShops, 'getTopRatedShops')
);

// ==================== OPTIONAL AUTH ROUTES ====================

// Apply optional authentication for mixed public/private access
router.use(optionalAuth);

// @route   GET /api/v1/shops/zones/:zoneId
// @desc    Get all shops in a zone
// @access  Public for active shops, Private for other statuses
router.get('/zones/:zoneId',
  ValidationRules.validateObjectId('zoneId'),
  handleValidation,
  wrapAsync(ZoneShopController.getZoneShops, 'getZoneShops')
);

// @route   GET /api/v1/shops/zones/:zoneId/shop/:shopId
// @desc    Get single shop details
// @access  Public for active shops, Private for others
router.get('/zones/:zoneId/shop/:shopId',
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.validateObjectId('shopId'),
  handleValidation,
  wrapAsync(ZoneShopController.getShop, 'getShop')
);

// ==================== PROTECTED ROUTES ====================

// Apply authentication for protected routes
router.use(authenticate);

// @route   POST /api/v1/shops/zones/:zoneId/vendor
// @desc    Create a new vendor (user + shop) in zone
// @access  Private (Zone Admin, Admin)
router.post('/zones/:zoneId/vendor',
  authenticate,
  authorize('admin', 'zone_admin'),
  ValidationRules.validateObjectId('zoneId'),
  handleValidation,
  wrapAsync(ZoneShopController.createVendor, 'createVendor')
);

/**
 * @route POST /api/v1/shops/zones/:zoneId
 * @desc Create new shop in zone
 * @access Private (Zone Admin, Admin)
 */
router.post('/zones/:zoneId',
  authenticate,
  authorize('admin', 'zone_admin'),
  checkFeatureAccess('vendorManagement'),
  PlanValidationMiddleware ? PlanValidationMiddleware.checkShopCreationLimit() : (req, res, next) => next(),
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.createZoneShop,
  handleValidation,
  wrapAsync(ZoneShopController.createShop, 'createShop')
);

// @route   PUT /api/v1/shops/zones/:zoneId/shop/:shopId
// @desc    Update shop details
// @access  Private (Shop Owner, Zone Admin, Admin)
router.put('/zones/:zoneId/shop/:shopId',
  authenticate,
  authorize('admin', 'zone_admin', 'zone_shop', 'zone_vendor'),
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.validateObjectId('shopId'),
  ValidationRules.updateZoneShop,
  handleValidation,
  wrapAsync(ZoneShopController.updateShop, 'updateShop')
);

// @route   DELETE /api/v1/shops/zones/:zoneId/shop/:shopId
// @desc    Delete/deactivate shop
// @access  Private (Zone Admin, Admin)
router.delete('/zones/:zoneId/shop/:shopId',
  authenticate,
  authorize('admin', 'zone_admin'),
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.validateObjectId('shopId'),
  handleValidation,
  wrapAsync(ZoneShopController.deleteShop, 'deleteShop')
);

// @route   PATCH /api/v1/shops/zones/:zoneId/shop/:shopId/status
// @desc    Update shop status (approve, reject, suspend)
// @access  Private (Zone Admin, Admin)
router.patch('/zones/:zoneId/shop/:shopId/status',
  authenticate,
  authorize('admin', 'zone_admin'),
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.validateObjectId('shopId'),
  ValidationRules.updateShopStatus,
  handleValidation,
  wrapAsync(ZoneShopController.updateShopStatus, 'updateShopStatus')
);

// @route   PATCH /api/v1/shops/zones/:zoneId/shop/:shopId/availability
// @desc    Update shop availability status (for shop owners)
// @access  Private (Shop Owner, Zone Admin, Admin)
router.patch('/zones/:zoneId/shop/:shopId/availability',
  authenticate,
  authorize('admin', 'zone_admin', 'zone_shop', 'zone_vendor'),
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.validateObjectId('shopId'),
  ValidationRules.updateShopAvailability,  // Use specific availability validation
  handleValidation,
  wrapAsync(ZoneShopController.updateShopAvailability, 'updateShopAvailability')
);

// @route   POST /api/v1/shops/zones/:zoneId/shop/:shopId/upload
// @desc    Upload shop images (logo or gallery)
// @access  Private (Shop Owner, Zone Admin, Admin)
router.post('/zones/:zoneId/shop/:shopId/upload',
  authenticate,
  authorize('admin', 'zone_admin', 'zone_shop', 'zone_vendor'),
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.validateObjectId('shopId'),
  uploadMiddleware.multiple('images', 5),
  handleValidation,
  wrapAsync(ZoneShopController.uploadImages, 'uploadImages')
);

// @route   GET /api/v1/shops/zones/:zoneId/shop/:shopId/stats
// @desc    Get shop statistics
// @access  Private (Shop Owner, Zone Admin, Admin)
router.get('/zones/:zoneId/shop/:shopId/stats',
  authenticate,
  authorize('admin', 'zone_admin', 'zone_shop', 'zone_vendor'),
  ValidationRules.validateObjectId('zoneId'),
  ValidationRules.validateObjectId('shopId'),
  handleValidation,
  wrapAsync(ZoneShopController.getShopStats, 'getShopStats')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;