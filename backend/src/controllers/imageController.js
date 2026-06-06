const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  uploadWithPreset,
  getImageDetails,
  validateCloudinaryConfig
} = require('../services/cloudinaryService');
const { logger } = require('../utils/logger');

/**
 * Test Cloudinary configuration
 */
const testCloudinaryConfig = catchAsync(async (req, res) => {
  try {
    validateCloudinaryConfig();
    
    res.status(200).json({
      success: true,
      message: 'Cloudinary configuration is valid',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    throw new APIError('Cloudinary configuration is invalid', 500);
  }
});

/**
 * Upload single image
 */
const uploadSingleImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new APIError('No file provided', 400);
  }

  const { folder, preset, tags } = req.body;
  
  let result;
  
  if (preset) {
    // Upload with predefined preset
    result = await uploadWithPreset(req.file.buffer, preset, {
      folder: folder || 'tableserve/uploads',
      tags: tags ? tags.split(',') : []
    });
  } else {
    // Upload with custom options
    result = await uploadImage(req.file.buffer, {
      folder: folder || 'tableserve/uploads',
      tags: tags ? tags.split(',') : []
    });
  }

  logger.info('Single image uploaded successfully', {
    public_id: result.public_id,
    size: result.bytes,
    userId: req.user?.id || 'anonymous'
  });

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      urls: result.urls || null
    }
  });
});

/**
 * Upload multiple images
 */
const uploadMultipleImage = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new APIError('No files provided', 400);
  }

  const { folder, preset, tags } = req.body;
  const fileBuffers = req.files.map(file => file.buffer);
  
  let results;
  
  if (preset) {
    // Upload with predefined preset
    const uploadPromises = fileBuffers.map((buffer, index) => 
      uploadWithPreset(buffer, preset, {
        folder: folder || 'tableserve/uploads',
        tags: tags ? tags.split(',') : [],
        public_id: `upload_${Date.now()}_${index}`
      })
    );
    results = await Promise.all(uploadPromises);
  } else {
    // Upload with custom options
    results = await uploadMultipleImages(fileBuffers, {
      folder: folder || 'tableserve/uploads',
      tags: tags ? tags.split(',') : []
    });
  }

  logger.info('Multiple images uploaded successfully', {
    count: results.length,
    totalSize: results.reduce((sum, result) => sum + result.bytes, 0),
    userId: req.user?.id || 'anonymous'
  });

  res.status(201).json({
    success: true,
    message: `${results.length} images uploaded successfully`,
    data: results.map(result => ({
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      urls: result.urls || null
    }))
  });
});

/**
 * Delete single image
 */
const deleteSingleImage = catchAsync(async (req, res) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    throw new APIError('Public ID is required', 400);
  }

  const result = await deleteImage(publicId);

  logger.info('Image deleted successfully', {
    public_id: publicId,
    userId: req.user?.id || 'anonymous'
  });

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    data: {
      public_id: publicId,
      result: result.result
    }
  });
});

/**
 * Delete multiple images
 */
const deleteMultipleImage = catchAsync(async (req, res) => {
  const { publicIds } = req.body;
  
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    throw new APIError('Public IDs array is required', 400);
  }

  const result = await deleteMultipleImages(publicIds);

  logger.info('Multiple images deleted', {
    requested: publicIds.length,
    deleted: Object.keys(result.deleted).length,
    userId: req.user?.id || 'anonymous'
  });

  res.status(200).json({
    success: true,
    message: `${Object.keys(result.deleted).length} images deleted successfully`,
    data: {
      deleted: result.deleted,
      not_found: result.not_found,
      errors: result.errors || {}
    }
  });
});

/**
 * Get image details
 */
const getImageInfo = catchAsync(async (req, res) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    throw new APIError('Public ID is required', 400);
  }

  const details = await getImageDetails(publicId);

  res.status(200).json({
    success: true,
    message: 'Image details retrieved successfully',
    data: details
  });
});

/**
 * Get available upload presets
 */
const getUploadPresets = catchAsync(async (req, res) => {
  const { transformationPresets } = require('../services/cloudinaryService');
  
  res.status(200).json({
    success: true,
    message: 'Available upload presets',
    data: {
      presets: Object.keys(transformationPresets),
      details: transformationPresets
    }
  });
});

module.exports = {
  testCloudinaryConfig,
  uploadSingleImage,
  uploadMultipleImage,
  deleteSingleImage,
  deleteMultipleImage,
  getImageInfo,
  getUploadPresets
};