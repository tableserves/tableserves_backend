const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');
const { logger } = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Validate Cloudinary configuration
 */
const validateCloudinaryConfig = () => {
  const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new APIError(`Missing Cloudinary configuration: ${missing.join(', ')}`, 500);
  }
};

/**
 * Configure multer for file upload handling
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  try {
    // Check file type
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new APIError(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`, 400), false);
    }

    // Check file size (multer handles this but we add additional validation)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
    
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files per request
  }
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadImage = async (fileBuffer, options = {}) => {
  try {
    validateCloudinaryConfig();

    const {
      folder = 'tableserve',
      transformation = [],
      tags = [],
      quality = 'auto',
      format = 'auto',
      public_id = null
    } = options;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [
            { quality },
            { format },
            ...transformation
          ],
          tags: ['tableserve', ...tags],
          public_id,
          resource_type: 'image',
          overwrite: false,
          unique_filename: true,
          use_filename: true
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            reject(new APIError('Failed to upload image', 500));
          } else {
            logger.info('Image uploaded successfully:', { 
              public_id: result.public_id,
              url: result.secure_url,
              size: result.bytes
            });
            resolve(result);
          }
        }
      );

      // Create a readable stream from buffer
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);
      bufferStream.pipe(stream);
    });
  } catch (error) {
    logger.error('Upload image error:', error);
    throw error;
  }
};

/**
 * Upload multiple images
 * @param {Array<Buffer>} fileBuffers - Array of file buffers
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} - Array of upload results
 */
const uploadMultipleImages = async (fileBuffers, options = {}) => {
  try {
    const uploadPromises = fileBuffers.map((buffer, index) => 
      uploadImage(buffer, {
        ...options,
        public_id: options.public_id ? `${options.public_id}_${index}` : null
      })
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    logger.error('Upload multiple images error:', error);
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    validateCloudinaryConfig();

    const result = await cloudinary.uploader.destroy(publicId);
    
    logger.info('Image deleted:', { public_id: publicId, result: result.result });
    
    if (result.result !== 'ok') {
      throw new APIError(`Failed to delete image: ${result.result}`, 400);
    }

    return result;
  } catch (error) {
    logger.error('Delete image error:', error);
    throw error;
  }
};

/**
 * Delete multiple images
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Object>} - Batch deletion result
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    validateCloudinaryConfig();

    const result = await cloudinary.api.delete_resources(publicIds);
    
    logger.info('Multiple images deleted:', { 
      deleted: Object.keys(result.deleted),
      not_found: result.not_found,
      rate_limit_allowed: result.rate_limit_allowed
    });

    return result;
  } catch (error) {
    logger.error('Delete multiple images error:', error);
    throw error;
  }
};

/**
 * Generate transformation URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Transformation options
 * @returns {string} - Transformed image URL
 */
const getTransformedUrl = (publicId, transformations = {}) => {
  try {
    const {
      width,
      height,
      crop = 'fill',
      quality = 'auto',
      format = 'auto',
      gravity = 'center'
    } = transformations;

    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop, gravity },
        { quality, format }
      ],
      secure: true
    });
  } catch (error) {
    logger.error('Get transformed URL error:', error);
    throw new APIError('Failed to generate transformed URL', 500);
  }
};

/**
 * Get image details
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Image details
 */
const getImageDetails = async (publicId) => {
  try {
    validateCloudinaryConfig();

    const result = await cloudinary.api.resource(publicId);
    
    return {
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      created_at: result.created_at,
      tags: result.tags
    };
  } catch (error) {
    logger.error('Get image details error:', error);
    throw new APIError('Failed to get image details', 500);
  }
};

/**
 * Predefined transformation presets for TableServe
 */
const transformationPresets = {
  // Restaurant logos
  logo: {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good',
    format: 'webp'
  },
  
  // Menu item images
  menuItem: {
    width: 400,
    height: 300,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good',
    format: 'webp'
  },

  // Menu category images
  menuCategory: {
    width: 350,
    height: 250,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good',
    format: 'webp'
  },
  
  // Thumbnail images
  thumbnail: {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:eco',
    format: 'webp'
  },
  
  // Banner images
  banner: {
    width: 1200,
    height: 400,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good',
    format: 'webp'
  },

  // QR code images
  qrCode: {
    width: 300,
    height: 300,
    crop: 'scale',
    quality: 'auto:best',
    format: 'png'
  },

  // Restaurant profile images
  restaurant: {
    width: 600,
    height: 400,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good',
    format: 'webp'
  },

  // Zone/shop images
  zone: {
    width: 500,
    height: 350,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good',
    format: 'webp'
  }
};

/**
 * Upload with preset transformation
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} preset - Preset name
 * @param {Object} additionalOptions - Additional options
 * @returns {Promise<Object>} - Upload result with transformed URLs
 */
const uploadWithPreset = async (fileBuffer, preset, additionalOptions = {}) => {
  try {
    if (!transformationPresets[preset]) {
      throw new APIError(`Invalid preset: ${preset}`, 400);
    }

    const transformation = transformationPresets[preset];
    
    const result = await uploadImage(fileBuffer, {
      ...additionalOptions,
      transformation: [transformation],
      tags: [preset, ...(additionalOptions.tags || [])]
    });

    // Generate additional transformation URLs
    const urls = {
      original: result.secure_url,
      thumbnail: getTransformedUrl(result.public_id, transformationPresets.thumbnail)
    };

    return {
      ...result,
      urls
    };
  } catch (error) {
    logger.error('Upload with preset error:', error);
    throw error;
  }
};

/**
 * Middleware for handling single file upload
 */
const uploadSingle = (fieldName) => upload.single(fieldName);

/**
 * Middleware for handling multiple file upload
 */
const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

/**
 * Middleware for handling multiple fields with files
 */
const uploadFields = (fields) => upload.fields(fields);

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getTransformedUrl,
  getImageDetails,
  uploadWithPreset,
  transformationPresets,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  validateCloudinaryConfig
};