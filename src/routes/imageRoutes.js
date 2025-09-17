const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const {
  uploadSingle,
  uploadMultiple
} = require('../services/cloudinaryService');
const {
  testCloudinaryConfig,
  uploadSingleImage,
  uploadMultipleImage,
  deleteSingleImage,
  deleteMultipleImage,
  getImageInfo,
  getUploadPresets
} = require('../controllers/imageController');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// Apply rate limiting to all image routes
router.use(defaultRateLimiter);

/**
 * @route GET /api/v1/images/test
 * @desc Test Cloudinary configuration
 * @access Public (for development)
 */
router.get('/test', wrapAsync(testCloudinaryConfig, 'testCloudinaryConfig'));

/**
 * @route GET /api/v1/images/presets
 * @desc Get available upload presets
 * @access Public
 */
router.get('/presets', wrapAsync(getUploadPresets, 'getUploadPresets'));

/**
 * @route POST /api/v1/images/upload
 * @desc Upload single image
 * @access Private
 */
router.post('/upload',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'),
  uploadSingle('image'),
  wrapAsync(uploadSingleImage, 'uploadSingleImage')
);

/**
 * @route POST /api/v1/images/upload-multiple
 * @desc Upload multiple images
 * @access Private
 */
router.post('/upload-multiple',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'),
  uploadMultiple('images', 5),
  wrapAsync(uploadMultipleImage, 'uploadMultipleImage')
);

/**
 * @route DELETE /api/v1/images/:publicId
 * @desc Delete single image
 * @access Private
 */
router.delete('/:publicId',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'),
  wrapAsync(deleteSingleImage, 'deleteSingleImage')
);

/**
 * @route DELETE /api/v1/images/bulk
 * @desc Delete multiple images
 * @access Private
 */
router.delete('/bulk',
  authenticate,
  authorize('admin', 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'),
  wrapAsync(deleteMultipleImage, 'deleteMultipleImage')
);

/**
 * @route GET /api/v1/images/:publicId
 * @desc Get image details
 * @access Private
 */
router.get('/:publicId',
  wrapAsync(getImageInfo, 'getImageInfo')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;