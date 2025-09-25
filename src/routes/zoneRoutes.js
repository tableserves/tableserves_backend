const express = require('express');
const ZoneController = require('../controllers/zoneController');
const { authenticate, optionalAuth, authorize } = require('../middleware/authMiddleware');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// ==================== PUBLIC ROUTES ====================

// @route   GET /api/zones/search/location
// @desc    Search zones by location
// @access  Public
router.get('/search/location',
  wrapAsync(ZoneController.getZonesByLocation, 'getZonesByLocation')
);

// ==================== OPTIONAL AUTH ROUTES ====================

// Apply optional authentication for mixed public/private access
router.use(optionalAuth);

// @route   GET /api/zones/:id
// @desc    Get single zone by ID
// @access  Public for basic info (QR scanning), Private for detailed info
router.get('/:id',
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(ZoneController.getZone, 'getZone')
);

// ==================== PROTECTED ROUTES ====================

// Apply authentication for protected routes
router.use(authenticate);

// @route   GET /api/zones
// @desc    Get all zones with pagination and filtering
// @access  Private (Admin, Zone Admin - own zones only)
router.get('/',
  ValidationRules.validatePagination,
  ValidationRules.validateSearch,
  ValidationRules.validateSorting,
  handleValidation,
  wrapAsync(ZoneController.getAllZones, 'getAllZones')
);

// @route   GET /api/zones/platform/stats
// @desc    Get platform-wide zone statistics
// @access  Private (Admin only)
router.get('/platform/stats',
  authorize('admin'),
  wrapAsync(ZoneController.getPlatformZoneStats, 'getPlatformZoneStats')
);

// @route   POST /api/zones
// @desc    Create a new zone
// @access  Private (Admin only)
router.post('/',
  authorize('admin'),
  ValidationRules.createZone,
  handleValidation,
  wrapAsync(ZoneController.createZone, 'createZone')
);

// @route   PUT /api/zones/:id
// @desc    Update zone
// @access  Private (Admin, Zone Admin - own zone only)
router.put('/:id',
  authorize('admin', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  ValidationRules.updateZone,
  handleValidation,
  wrapAsync(ZoneController.updateZone, 'updateZone')
);

// @route   DELETE /api/zones/:id
// @desc    Delete/deactivate zone
// @access  Private (Admin only)
router.delete('/:id',
  authorize('admin'),
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(ZoneController.deleteZone, 'deleteZone')
);

// @route   GET /api/zones/:id/stats
// @desc    Get zone statistics
// @access  Private (Admin, Zone Admin - own zone only)
router.get('/:id/stats',
  authorize('admin', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(ZoneController.getZoneStats, 'getZoneStats')
);

// @route   PATCH /api/zones/:id/toggle-status
// @desc    Toggle zone active status
// @access  Private (Admin, Zone Admin - own zone only)
router.patch('/:id/toggle-status',
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(ZoneController.toggleZoneStatus, 'toggleZoneStatus')
);

// @route   GET /api/zones/:id/vendors
// @desc    Get zone vendors (shop owners)
// @access  Private (Admin, Zone Admin - own zone only)
router.get('/:id/vendors',
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(ZoneController.getZoneVendors, 'getZoneVendors')
);

// @route   PUT /api/zones/:id/vendors/:vendorId
// @desc    Update vendor credentials
// @access  Private (Admin, Zone Admin - own zone only)
router.put('/:id/vendors/:vendorId',
  authorize('admin', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  ValidationRules.validateObjectId('vendorId'),
  handleValidation,
  wrapAsync(ZoneController.updateVendorCredentials, 'updateVendorCredentials')
);

// @route   PUT /api/zones/:id/credentials
// @desc    Update zone admin credentials
// @access  Private (Admin only)
router.put('/:id/credentials',
  authorize('admin'),
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(ZoneController.updateZoneCredentials, 'updateZoneCredentials')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;