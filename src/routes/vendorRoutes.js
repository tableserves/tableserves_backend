const express = require('express');
const VendorController = require('../controllers/vendorController');
const { authenticate } = require('../middleware/authMiddleware');
const { createRouteHandler } = require('../middleware/routeErrorHandler');

const router = express.Router();
const wrapAsync = createRouteHandler;

// Apply authentication middleware to all routes
router.use(authenticate);

// @route   GET /api/v1/vendors
// @desc    Get vendors by zone
// @access  Private
router.get('/', wrapAsync(VendorController.getVendors, 'getVendors'));

// @route   POST /api/v1/vendors
// @desc    Create new vendor
// @access  Private
router.post('/', wrapAsync(VendorController.createVendor, 'createVendor'));

// @route   PUT /api/v1/vendors/:id
// @desc    Update vendor
// @access  Private
router.put('/:id', wrapAsync(VendorController.updateVendor, 'updateVendor'));

// @route   DELETE /api/v1/vendors/:id
// @desc    Delete vendor
// @access  Private
router.delete('/:id', wrapAsync(VendorController.deleteVendor, 'deleteVendor'));

module.exports = router;