const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const { APIError } = require('../utils/apiError');

class QRCodeService {
  /**
   * Generate QR code for restaurant
   * @param {String} restaurantId - Restaurant ID
   * @param {Object} options - QR code options
   * @returns {Object} - QR code data
   */
  static async generateRestaurantQR(restaurantId, options = {}) {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        throw new APIError('Restaurant not found', 404);
      }

      // Generate unique QR code ID
      const qrCodeId = uuidv4();
      
      // Create menu URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const menuUrl = `${baseUrl}/menu/restaurant/${restaurantId}?qr=${qrCodeId}`;
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: options.size || 256
      });

      // Update restaurant with QR code data
      restaurant.qrCode = {
        id: qrCodeId,
        url: menuUrl,
        dataUrl: qrCodeDataUrl,
        generatedAt: new Date(),
        isActive: true
      };
      
      await restaurant.save();

      return {
        success: true,
        data: {
          qrCodeId,
          menuUrl,
          qrCodeDataUrl,
          restaurant: {
            id: restaurant._id,
            name: restaurant.name
          }
        }
      };
    } catch (error) {
      throw new APIError(`Failed to generate restaurant QR code: ${error.message}`, 500);
    }
  }

  /**
   * Generate QR code for food zone
   * @param {String} zoneId - Zone ID
   * @param {Object} options - QR code options
   * @returns {Object} - QR code data
   */
  static async generateZoneQR(zoneId, options = {}) {
    try {
      const zone = await Zone.findById(zoneId);
      if (!zone) {
        throw new APIError('Zone not found', 404);
      }

      // Generate unique QR code ID
      const qrCodeId = uuidv4();
      
      // Create menu URL for zone (unified menu from all shops)
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const menuUrl = `${baseUrl}/menu/zone/${zoneId}?qr=${qrCodeId}`;
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: options.size || 256
      });

      // Update zone with QR code data
      zone.qrCode = {
        id: qrCodeId,
        url: menuUrl,
        dataUrl: qrCodeDataUrl,
        generatedAt: new Date(),
        isActive: true
      };
      
      await zone.save();

      return {
        success: true,
        data: {
          qrCodeId,
          menuUrl,
          qrCodeDataUrl,
          zone: {
            id: zone._id,
            name: zone.name
          }
        }
      };
    } catch (error) {
      throw new APIError(`Failed to generate zone QR code: ${error.message}`, 500);
    }
  }

  /**
   * Regenerate QR code for business
   * @param {String} businessType - 'restaurant' or 'zone'
   * @param {String} businessId - Business ID
   * @param {Object} options - QR code options
   * @returns {Object} - QR code data
   */
  static async regenerateQR(businessType, businessId, options = {}) {
    if (businessType === 'restaurant') {
      return this.generateRestaurantQR(businessId, options);
    } else if (businessType === 'zone') {
      return this.generateZoneQR(businessId, options);
    } else {
      throw new APIError('Invalid business type', 400);
    }
  }

  /**
   * Get QR code data for business
   * @param {String} businessType - 'restaurant' or 'zone'
   * @param {String} businessId - Business ID
   * @returns {Object} - QR code data
   */
  static async getQRCode(businessType, businessId) {
    try {
      let business;
      
      if (businessType === 'restaurant') {
        business = await Restaurant.findById(businessId);
      } else if (businessType === 'zone') {
        business = await Zone.findById(businessId);
      } else {
        throw new APIError('Invalid business type', 400);
      }

      if (!business) {
        throw new APIError(`${businessType} not found`, 404);
      }

      if (!business.qrCode || !business.qrCode.isActive) {
        // Generate QR code if it doesn't exist
        return this.regenerateQR(businessType, businessId);
      }

      return {
        success: true,
        data: {
          qrCodeId: business.qrCode.id,
          menuUrl: business.qrCode.url,
          qrCodeDataUrl: business.qrCode.dataUrl,
          generatedAt: business.qrCode.generatedAt,
          business: {
            id: business._id,
            name: business.name,
            type: businessType
          }
        }
      };
    } catch (error) {
      throw new APIError(`Failed to get QR code: ${error.message}`, 500);
    }
  }

  /**
   * Deactivate QR code
   * @param {String} businessType - 'restaurant' or 'zone'
   * @param {String} businessId - Business ID
   * @returns {Object} - Success response
   */
  static async deactivateQR(businessType, businessId) {
    try {
      let business;
      
      if (businessType === 'restaurant') {
        business = await Restaurant.findById(businessId);
      } else if (businessType === 'zone') {
        business = await Zone.findById(businessId);
      } else {
        throw new APIError('Invalid business type', 400);
      }

      if (!business) {
        throw new APIError(`${businessType} not found`, 404);
      }

      if (business.qrCode) {
        business.qrCode.isActive = false;
        await business.save();
      }

      return {
        success: true,
        message: 'QR code deactivated successfully'
      };
    } catch (error) {
      throw new APIError(`Failed to deactivate QR code: ${error.message}`, 500);
    }
  }

  /**
   * Validate QR code access
   * @param {String} qrCodeId - QR code ID
   * @returns {Object} - Business data if valid
   */
  static async validateQRAccess(qrCodeId) {
    try {
      // Check restaurants
      const restaurant = await Restaurant.findOne({
        'qrCode.id': qrCodeId,
        'qrCode.isActive': true,
        active: true
      });

      if (restaurant) {
        return {
          success: true,
          data: {
            businessType: 'restaurant',
            businessId: restaurant._id,
            businessName: restaurant.name,
            menuUrl: restaurant.qrCode.url
          }
        };
      }

      // Check zones
      const zone = await Zone.findOne({
        'qrCode.id': qrCodeId,
        'qrCode.isActive': true,
        active: true
      });

      if (zone) {
        return {
          success: true,
          data: {
            businessType: 'zone',
            businessId: zone._id,
            businessName: zone.name,
            menuUrl: zone.qrCode.url
          }
        };
      }

      throw new APIError('Invalid or expired QR code', 404);
    } catch (error) {
      throw new APIError(`QR code validation failed: ${error.message}`, 500);
    }
  }
}

module.exports = QRCodeService;
