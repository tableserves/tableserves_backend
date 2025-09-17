
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validateFile = (file) => {
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
};
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { ErrorTypes } = require('../middleware/errorHandler');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 10 // Maximum 10 files per request
  }
});

class UploadService {
  // Upload single image to Cloudinary
  static async uploadImage(buffer, options = {}) {
    try {
      const uploadOptions = {
        folder: options.folder || 'tableserve',
        transformation: options.transformation || [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ],
        ...options
      };

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes
              });
            }
          }
        );
        uploadStream.end(buffer);
      });
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Upload multiple images
  static async uploadMultipleImages(files, options = {}) {
    try {
      const uploadPromises = files.map(file => 
        this.uploadImage(file.buffer, {
          ...options,
          original_filename: file.originalname
        })
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(`Multiple image upload failed: ${error.message}`);
    }
  }

  // Delete image from Cloudinary
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      throw new Error(`Image deletion failed: ${error.message}`);
    }
  }

  // Generate optimized image URL
  static generateOptimizedUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      quality: 'auto',
      format: 'auto'
    };

    return cloudinary.url(publicId, {
      ...defaultTransformations,
      ...transformations
    });
  }

  // Validate image dimensions
  static validateImageDimensions(file, minWidth = 100, minHeight = 100, maxWidth = 4000, maxHeight = 4000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = function() {
        if (this.width < minWidth || this.height < minHeight) {
          reject(new Error(`Image too small. Minimum dimensions: ${minWidth}x${minHeight}`));
        } else if (this.width > maxWidth || this.height > maxHeight) {
          reject(new Error(`Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}`));
        } else {
          resolve(true);
        }
      };
      img.onerror = function() {
        reject(new Error('Invalid image file'));
      };
      img.src = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    });
  }

  // Process image before upload (resize, compress)
  static async processImage(buffer, options = {}) {
    try {
      // For basic processing, we'll rely on Cloudinary transformations
      // Advanced processing could use sharp or jimp here
      return buffer;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // Get image metadata
  static async getImageMetadata(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at,
        tags: result.tags || []
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  // Bulk delete images
  static async deleteMultipleImages(publicIds) {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      throw new Error(`Bulk image deletion failed: ${error.message}`);
    }
  }

  // Search images in Cloudinary
  static async searchImages(query, options = {}) {
    try {
      const searchOptions = {
        expression: query,
        max_results: options.maxResults || 50,
        next_cursor: options.nextCursor,
        sort_by: options.sortBy || [{ 'created_at': 'desc' }]
      };

      const result = await cloudinary.search.expression(query).execute();
      return {
        resources: result.resources,
        totalCount: result.total_count,
        nextCursor: result.next_cursor
      };
    } catch (error) {
      throw new Error(`Image search failed: ${error.message}`);
    }
  }
}

// Middleware for handling file uploads
const uploadMiddleware = {
  single: (fieldName) => (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: 'File size exceeds the maximum limit',
                details: `Maximum size: ${process.env.MAX_FILE_SIZE || '5MB'}`
              }
            });
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: {
                code: 'TOO_MANY_FILES',
                message: 'Too many files uploaded'
              }
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'File upload failed'
          }
        });
      }
      next();
    });
  },

  multiple: (fieldName, maxCount = 5) => (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: 'One or more files exceed the maximum size limit',
                details: `Maximum size per file: ${process.env.MAX_FILE_SIZE || '5MB'}`
              }
            });
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: {
                code: 'TOO_MANY_FILES',
                message: `Maximum ${maxCount} files allowed`
              }
            });
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: {
                code: 'UNEXPECTED_FILE',
                message: 'Unexpected file field'
              }
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'File upload failed'
          }
        });
      }
      next();
    });
  },

  fields: (fields) => (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: 'One or more files exceed the maximum size limit'
              }
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'File upload failed'
          }
        });
      }
      next();
    });
  }
};

module.exports = {
  UploadService,
  uploadMiddleware
};