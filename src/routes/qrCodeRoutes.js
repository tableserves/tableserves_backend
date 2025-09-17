const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const QRCodeService = require('../services/qrCodeService');
const catchAsync = require('../utils/catchAsync');
const { APIError } = require('../utils/apiError');

/**
 * Generate QR code for restaurant
 * @route POST /api/qr/restaurant/:restaurantId/generate
 */
router.post('/restaurant/:restaurantId/generate',
  authenticate,
  authorize('restaurant_owner', 'admin'),
  catchAsync(async (req, res) => {
    const { restaurantId } = req.params;
    const { size } = req.body;

    // Verify user owns this restaurant (unless admin)
    if (req.user.role !== 'admin') {
      const Restaurant = require('../models/Restaurant');
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== req.user.id) {
        throw new APIError('Unauthorized access to restaurant', 403);
      }
    }

    const result = await QRCodeService.generateRestaurantQR(restaurantId, { size });
    res.json(result);
  })
);

/**
 * Generate QR code for zone
 * @route POST /api/qr/zone/:zoneId/generate
 */
router.post('/zone/:zoneId/generate',
  authenticate,
  authorize('zone_admin', 'admin'),
  catchAsync(async (req, res) => {
    const { zoneId } = req.params;
    const { size } = req.body;

    // Verify user owns this zone (unless admin)
    if (req.user.role !== 'admin') {
      const Zone = require('../models/Zone');
      const zone = await Zone.findById(zoneId);
      if (!zone || zone.adminId.toString() !== req.user.id) {
        throw new APIError('Unauthorized access to zone', 403);
      }
    }

    const result = await QRCodeService.generateZoneQR(zoneId, { size });
    res.json(result);
  })
);

/**
 * Get QR code for business
 * @route GET /api/qr/:businessType/:businessId
 */
router.get('/:businessType/:businessId',
  authenticate,
  catchAsync(async (req, res) => {
    const { businessType, businessId } = req.params;

    if (!['restaurant', 'zone'].includes(businessType)) {
      throw new APIError('Invalid business type', 400);
    }

    // Verify user owns this business (unless admin)
    if (req.user.role !== 'admin') {
      if (businessType === 'restaurant') {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findById(businessId);
        if (!restaurant || restaurant.ownerId.toString() !== req.user.id) {
          throw new APIError('Unauthorized access to restaurant', 403);
        }
      } else if (businessType === 'zone') {
        const Zone = require('../models/Zone');
        const zone = await Zone.findById(businessId);
        if (!zone || zone.adminId.toString() !== req.user.id) {
          throw new APIError('Unauthorized access to zone', 403);
        }
      }
    }

    const result = await QRCodeService.getQRCode(businessType, businessId);
    res.json(result);
  })
);

/**
 * Regenerate QR code for business
 * @route POST /api/qr/:businessType/:businessId/regenerate
 */
router.post('/:businessType/:businessId/regenerate',
  authenticate,
  authorize('restaurant_owner', 'zone_admin', 'admin'),
  catchAsync(async (req, res) => {
    const { businessType, businessId } = req.params;
    const { size } = req.body;

    if (!['restaurant', 'zone'].includes(businessType)) {
      throw new APIError('Invalid business type', 400);
    }

    // Verify user owns this business (unless admin)
    if (req.user.role !== 'admin') {
      if (businessType === 'restaurant') {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findById(businessId);
        if (!restaurant || restaurant.ownerId.toString() !== req.user.id) {
          throw new APIError('Unauthorized access to restaurant', 403);
        }
      } else if (businessType === 'zone') {
        const Zone = require('../models/Zone');
        const zone = await Zone.findById(businessId);
        if (!zone || zone.adminId.toString() !== req.user.id) {
          throw new APIError('Unauthorized access to zone', 403);
        }
      }
    }

    const result = await QRCodeService.regenerateQR(businessType, businessId, { size });
    res.json(result);
  })
);

/**
 * Validate QR code access (public route for customers)
 * @route GET /api/qr/validate/:qrCodeId
 */
router.get('/validate/:qrCodeId', 
  catchAsync(async (req, res) => {
    const { qrCodeId } = req.params;
    const result = await QRCodeService.validateQRAccess(qrCodeId);
    res.json(result);
  })
);

/**
 * Deactivate QR code
 * @route POST /api/qr/:businessType/:businessId/deactivate
 */
router.post('/:businessType/:businessId/deactivate',
  authenticate,
  authorize('restaurant_owner', 'zone_admin', 'admin'),
  catchAsync(async (req, res) => {
    const { businessType, businessId } = req.params;

    if (!['restaurant', 'zone'].includes(businessType)) {
      throw new APIError('Invalid business type', 400);
    }

    // Verify user owns this business (unless admin)
    if (req.user.role !== 'admin') {
      if (businessType === 'restaurant') {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findById(businessId);
        if (!restaurant || restaurant.ownerId.toString() !== req.user.id) {
          throw new APIError('Unauthorized access to restaurant', 403);
        }
      } else if (businessType === 'zone') {
        const Zone = require('../models/Zone');
        const zone = await Zone.findById(businessId);
        if (!zone || zone.adminId.toString() !== req.user.id) {
          throw new APIError('Unauthorized access to zone', 403);
        }
      }
    }

    const result = await QRCodeService.deactivateQR(businessType, businessId);
    res.json(result);
  })
);

module.exports = router;
