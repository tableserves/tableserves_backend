const express = require('express');
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

/**
 * @route GET /api/v1/images/test
 * @desc Test Cloudinary configuration
 * @access Public (for development)
 */
router.get('/test', testCloudinaryConfig);

/**
 * @route GET /api/v1/images/presets
 * @desc Get available upload presets
 * @access Public
 */
router.get('/presets', getUploadPresets);

/**
 * @route POST /api/v1/images/upload
 * @desc Upload single image
 * @access Private (will add auth middleware later)
 */
router.post('/upload', uploadSingle('image'), uploadSingleImage);

/**
 * @route POST /api/v1/images/upload-multiple
 * @desc Upload multiple images
 * @access Private (will add auth middleware later)
 */
router.post('/upload-multiple', uploadMultiple('images', 5), uploadMultipleImage);

/**
 * @route DELETE /api/v1/images/:publicId
 * @desc Delete single image
 * @access Private (will add auth middleware later)
 */
router.delete('/:publicId', deleteSingleImage);

/**
 * @route DELETE /api/v1/images/bulk
 * @desc Delete multiple images
 * @access Private (will add auth middleware later)
 */
router.delete('/bulk', deleteMultipleImage);

/**
 * @route GET /api/v1/images/:publicId
 * @desc Get image details
 * @access Private (will add auth middleware later)
 */
router.get('/:publicId', getImageInfo);

module.exports = router;