/**
 * Image Upload Service for TableServe Application
 * 
 * Handles image uploads to Cloudinary via backend API
 */

import api from '../shared/api/api';
import logger from './LoggingService';

class ImageUploadService {
  /**
   * Upload a single image
   * @param {File} file - Image file to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with URL and metadata
   */
  static async uploadImage(file, options = {}) {
    try {
      // Validate that we have a proper File object
      if (!file || !(file instanceof File)) {
        throw new Error('No valid file provided - expected File object');
      }
      
      console.log('ImageUploadService: Starting upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isFile: file instanceof File
      });
      
      const formData = new FormData();
      formData.append('image', file);
      
      // Add optional parameters
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      if (options.preset) {
        formData.append('preset', options.preset);
      }
      if (options.tags) {
        formData.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : options.tags);
      }
      
      // Log FormData contents
      console.log('ImageUploadService: FormData prepared with keys:', Array.from(formData.keys()));

      logger.info('Uploading image to Cloudinary', { 
        fileName: file.name, 
        fileSize: file.size,
        folder: options.folder 
      }, 'ImageUploadService');

      const response = await api.post('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout for uploads
      });

      console.log('ImageUploadService: Upload response received:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        status: response.status
      });

      if (response.data && response.data.success) {
        const result = response.data.data;
        
        logger.info('Image uploaded successfully', { 
          publicId: result.public_id,
          url: result.url,
          size: result.size 
        }, 'ImageUploadService');

        return {
          url: result.url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.size,
          urls: result.urls || { original: result.url }
        };
      } else {
        console.error('ImageUploadService: Invalid response format:', response.data);
        throw new Error('Upload failed - invalid response format');
      }
    } catch (error) {
      console.error('ImageUploadService: Upload failed with error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      logger.error('Image upload failed', error, 'ImageUploadService');
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Upload failed');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - please try again with a smaller image');
      } else if (error.message === 'No valid file provided - expected File object') {
        throw new Error('No file provided');
      } else {
        throw new Error(error.message || 'Upload failed');
      }
    }
  }

  /**
   * Upload multiple images
   * @param {File[]} files - Array of image files to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object[]>} Array of upload results
   */
  static async uploadMultipleImages(files, options = {}) {
    try {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('images', file);
      });
      
      // Add optional parameters
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      if (options.preset) {
        formData.append('preset', options.preset);
      }
      if (options.tags) {
        formData.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : options.tags);
      }

      logger.info('Uploading multiple images to Cloudinary', { 
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        folder: options.folder 
      }, 'ImageUploadService');

      const response = await api.post('/images/upload-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout for multiple uploads
      });

      if (response.data && response.data.success) {
        const results = response.data.data;
        
        logger.info('Multiple images uploaded successfully', { 
          count: results.length 
        }, 'ImageUploadService');

        return results.map(result => ({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          urls: result.urls || { original: result.secure_url }
        }));
      } else {
        throw new Error('Upload failed - invalid response format');
      }
    } catch (error) {
      logger.error('Multiple image upload failed', error, 'ImageUploadService');
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Upload failed');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - please try again with smaller images');
      } else {
        throw new Error(error.message || 'Upload failed');
      }
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param {string} publicId - Cloudinary public ID of the image to delete
   * @returns {Promise<boolean>} Success status
   */
  static async deleteImage(publicId) {
    try {
      logger.info('Deleting image from Cloudinary', { publicId }, 'ImageUploadService');

      const response = await api.delete(`/images/${publicId}`);

      if (response.data && response.data.success) {
        logger.info('Image deleted successfully', { publicId }, 'ImageUploadService');
        return true;
      } else {
        throw new Error('Delete failed - invalid response format');
      }
    } catch (error) {
      logger.error('Image deletion failed', error, 'ImageUploadService');
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Delete failed');
      } else {
        throw new Error(error.message || 'Delete failed');
      }
    }
  }

  /**
   * Get predefined upload presets
   * @returns {Promise<Object[]>} Available presets
   */
  static async getUploadPresets() {
    try {
      const response = await api.get('/images/presets');

      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Failed to fetch presets');
      }
    } catch (error) {
      logger.error('Failed to fetch upload presets', error, 'ImageUploadService');
      return []; // Return empty array as fallback
    }
  }

  /**
   * Upload image with specific preset for menu items
   * @param {File} file - Image file to upload
   * @param {string} entityType - Type of entity (restaurant, zone, shop)
   * @param {string} entityId - ID of the entity
   * @returns {Promise<Object>} Upload result
   */
  static async uploadMenuItemImage(file, entityType, entityId) {
    return this.uploadImage(file, {
      folder: `tableserve/menu/${entityType}/${entityId}`,
      preset: 'menuItem',
      tags: ['menu', 'item', entityType, entityId]
    });
  }

  /**
   * Upload restaurant profile image
   * @param {File} file - Image file to upload
   * @param {string} restaurantId - Restaurant ID
   * @returns {Promise<Object>} Upload result
   */
  static async uploadRestaurantImage(file, restaurantId) {
    return this.uploadImage(file, {
      folder: `tableserve/restaurants/${restaurantId}`,
      preset: 'restaurant',
      tags: ['restaurant', 'profile', restaurantId]
    });
  }

  /**
   * Upload zone/shop image
   * @param {File} file - Image file to upload
   * @param {string} entityType - Type (zone or shop)
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} Upload result
   */
  static async uploadZoneImage(file, entityType, entityId) {
    return this.uploadImage(file, {
      folder: `tableserve/${entityType}s/${entityId}`,
      preset: 'zone',
      tags: [entityType, 'profile', entityId]
    });
  }

  /**
   * Upload logo image
   * @param {File} file - Image file to upload
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} Upload result
   */
  static async uploadLogoImage(file, entityType, entityId) {
    return this.uploadImage(file, {
      folder: `tableserve/${entityType}s/${entityId}/logo`,
      preset: 'logo',
      tags: [entityType, 'logo', entityId]
    });
  }

  /**
   * Validate image file before upload
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static validateImageFile(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      minWidth = 100,
      minHeight = 100
    } = options;

    const errors = [];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create image preview URL from file
   * @param {File} file - Image file
   * @returns {Promise<string>} Preview URL
   */
  static createPreviewUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to create preview'));
      reader.readAsDataURL(file);
    });
  }
}

export default ImageUploadService;
