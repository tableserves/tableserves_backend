/**
 * Unified Vendor Service for TableServe Application
 * Consolidates all vendor data operations and synchronization logic
 * Replaces multiple scattered utility files with a single, consistent service
 */

import { store } from '../store';
import { setVendors } from '../store/slices/vendorsSlice';
import logger from './LoggingService';

class VendorService {
  constructor() {
    this.storageKeys = {
      zoneVendors: (zoneId) => `tableserve_zone_vendors_${zoneId}`,
      adminVendors: (zoneId) => `tableserve_admin_vendors_${zoneId}`,
      vendorMenuItems: (vendorId) => `vendor_menu_items_${vendorId}`,
      subscription: 'tableserve_subscription'
    };
  }

  /**
   * Synchronize vendor data between different storage locations
   * @param {string} zoneId - The zone ID to synchronize vendors for
   * @returns {Object} Result of synchronization operation
   */
  synchronizeVendorData(zoneId) {
    try {
      logger.debug('Starting vendor data synchronization', { zoneId }, 'VendorService');

      const adminVendorsKey = this.storageKeys.adminVendors(zoneId);
      const zoneVendorsKey = this.storageKeys.zoneVendors(zoneId);

      // Get vendors from both storage locations
      const adminVendors = this._getVendorsFromStorage(adminVendorsKey);
      const zoneVendors = this._getVendorsFromStorage(zoneVendorsKey);

      // Merge vendors with preference for zone vendors (more recent updates)
      const mergedVendors = this._mergeVendorData(adminVendors, zoneVendors, zoneId);

      // Save synchronized data to both locations
      this._saveVendorsToStorage(adminVendorsKey, mergedVendors);
      this._saveVendorsToStorage(zoneVendorsKey, mergedVendors);

      // Update Redux store
      store.dispatch(setVendors(mergedVendors));

      logger.info(`Vendor synchronization completed`, {
        zoneId,
        adminCount: adminVendors.length,
        zoneCount: zoneVendors.length,
        mergedCount: mergedVendors.length
      }, 'VendorService');

      return {
        success: true,
        message: `Successfully synchronized ${mergedVendors.length} vendors for zone: ${zoneId}`,
        adminVendorsCount: adminVendors.length,
        zoneVendorsCount: zoneVendors.length,
        mergedVendorsCount: mergedVendors.length,
        vendors: mergedVendors
      };
    } catch (error) {
      logger.error('Vendor synchronization failed', error, 'VendorService');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fix vendor data issues and ensure menu items are properly saved
   * @param {string} zoneId - The zone ID
   * @param {string} vendorId - The vendor ID to fix (optional, if not provided fixes all)
   * @returns {Object} Result of fix operation
   */
  fixVendorData(zoneId, vendorId = null) {
    try {
      logger.debug('Starting vendor data fix', { zoneId, vendorId }, 'VendorService');

      if (vendorId) {
        return this._fixSingleVendor(zoneId, vendorId);
      } else {
        return this._fixAllVendorsInZone(zoneId);
      }
    } catch (error) {
      logger.error('Vendor data fix failed', error, 'VendorService');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate vendor limits against subscription
   * @param {string} zoneId - The zone ID
   * @param {number} currentVendorCount - Current number of vendors
   * @returns {Object} Validation result
   */
  validateVendorLimits(zoneId, currentVendorCount = null) {
    try {
      const subscription = this._getSubscriptionData();
      if (!subscription) {
        logger.warn('No subscription data found, allowing unlimited vendors', { zoneId }, 'VendorService');
        return {
          valid: true,
          unlimited: true,
          message: 'No subscription limits found'
        };
      }

      const maxVendors = subscription.maxVendors;
      if (maxVendors === null || maxVendors === undefined) {
        return {
          valid: true,
          unlimited: true,
          message: 'Unlimited vendors allowed'
        };
      }

      const vendorCount = currentVendorCount !== null 
        ? currentVendorCount 
        : this._getVendorCount(zoneId);

      const canAddMore = vendorCount < maxVendors;

      logger.debug('Vendor limit validation', {
        zoneId,
        currentVendors: vendorCount,
        maxVendors,
        canAddMore
      }, 'VendorService');

      return {
        valid: canAddMore,
        currentCount: vendorCount,
        maxCount: maxVendors,
        remaining: maxVendors - vendorCount,
        message: canAddMore 
          ? `${maxVendors - vendorCount} vendors remaining`
          : `Vendor limit reached (${vendorCount}/${maxVendors})`
      };
    } catch (error) {
      logger.error('Vendor limit validation failed', error, 'VendorService');
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Create a sample vendor for testing purposes
   * @param {string} zoneId - The zone ID
   * @returns {Object} Result of creation operation
   */
  createSampleVendor(zoneId) {
    try {
      logger.debug('Creating sample vendor', { zoneId }, 'VendorService');

      const sampleVendor = {
        id: `${Date.now()}_sample`,
        name: 'Sample Food Vendor',
        description: 'A sample food vendor with delicious items',
        cuisine: 'Various',
        logo: '',
        zoneId: zoneId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to both storage locations
      const adminVendorsKey = this.storageKeys.adminVendors(zoneId);
      const zoneVendorsKey = this.storageKeys.zoneVendors(zoneId);

      this._saveVendorsToStorage(adminVendorsKey, [sampleVendor]);
      this._saveVendorsToStorage(zoneVendorsKey, [sampleVendor]);

      // Update Redux store
      store.dispatch(setVendors([sampleVendor]));

      logger.info('Sample vendor created successfully', { vendorId: sampleVendor.id, zoneId }, 'VendorService');

      return {
        success: true,
        message: 'Created sample vendor',
        vendor: sampleVendor
      };
    } catch (error) {
      logger.error('Sample vendor creation failed', error, 'VendorService');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get vendors for a specific zone
   * @param {string} zoneId - The zone ID
   * @returns {Array} Array of vendors
   */
  getVendorsForZone(zoneId) {
    try {
      const zoneVendorsKey = this.storageKeys.zoneVendors(zoneId);
      return this._getVendorsFromStorage(zoneVendorsKey);
    } catch (error) {
      logger.error('Failed to get vendors for zone', error, 'VendorService');
      return [];
    }
  }

  /**
   * Clear all vendor data for a zone (useful for testing)
   * @param {string} zoneId - The zone ID
   */
  clearVendorData(zoneId) {
    try {
      const adminVendorsKey = this.storageKeys.adminVendors(zoneId);
      const zoneVendorsKey = this.storageKeys.zoneVendors(zoneId);

      localStorage.removeItem(adminVendorsKey);
      localStorage.removeItem(zoneVendorsKey);

      store.dispatch(setVendors([]));

      logger.info('Vendor data cleared', { zoneId }, 'VendorService');
    } catch (error) {
      logger.error('Failed to clear vendor data', error, 'VendorService');
    }
  }

  // Private helper methods

  _getVendorsFromStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.warn(`Failed to parse vendor data from ${key}`, error, 'VendorService');
      return [];
    }
  }

  _saveVendorsToStorage(key, vendors) {
    try {
      localStorage.setItem(key, JSON.stringify(vendors));
    } catch (error) {
      logger.error(`Failed to save vendor data to ${key}`, error, 'VendorService');
    }
  }

  _mergeVendorData(adminVendors, zoneVendors, zoneId) {
    const vendorMap = new Map();

    // Add admin vendors first
    adminVendors.forEach(vendor => {
      vendorMap.set(vendor.id, {
        ...vendor,
        status: vendor.status || 'active',
        zoneId: zoneId,
        updatedAt: vendor.updatedAt || new Date().toISOString()
      });
    });

    // Override with zone vendors (more recent)
    zoneVendors.forEach(vendor => {
      if (vendor.id) {
        vendorMap.set(vendor.id, {
          ...vendor,
          status: vendor.status || 'active',
          zoneId: zoneId,
          updatedAt: vendor.updatedAt || new Date().toISOString()
        });
      }
    });

    return Array.from(vendorMap.values());
  }

  _fixSingleVendor(zoneId, vendorId) {
    const vendorKey = this.storageKeys.zoneVendors(zoneId);
    const vendors = this._getVendorsFromStorage(vendorKey);
    const vendorIndex = vendors.findIndex(v => v.id === vendorId);

    if (vendorIndex === -1) {
      return {
        success: false,
        error: `Vendor ${vendorId} not found in zone ${zoneId}`
      };
    }

    // Ensure vendor status is active
    vendors[vendorIndex].status = 'active';
    vendors[vendorIndex].updatedAt = new Date().toISOString();

    this._saveVendorsToStorage(vendorKey, vendors);
    this._fixVendorMenuItems(vendorId);

    return {
      success: true,
      vendorUpdated: true,
      vendor: vendors[vendorIndex]
    };
  }

  _fixAllVendorsInZone(zoneId) {
    const vendorKey = this.storageKeys.zoneVendors(zoneId);
    const vendors = this._getVendorsFromStorage(vendorKey);

    const results = vendors.map(vendor => {
      vendor.status = 'active';
      vendor.updatedAt = new Date().toISOString();
      
      const menuItemsFixed = this._fixVendorMenuItems(vendor.id);

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        menuItemsFixed
      };
    });

    this._saveVendorsToStorage(vendorKey, vendors);

    return {
      success: true,
      vendorsUpdated: vendors.length,
      results
    };
  }

  _fixVendorMenuItems(vendorId) {
    try {
      // Get menu items from Redux store
      const persistedState = localStorage.getItem('persist:root');
      if (!persistedState) return 0;

      const parsedState = JSON.parse(persistedState);
      if (!parsedState.menuItems) return 0;

      const menuItems = JSON.parse(parsedState.menuItems).items || [];
      const vendorMenuItems = menuItems.filter(item => item.shopId === vendorId);

      // Save menu items with correct key
      const menuItemsKey = this.storageKeys.vendorMenuItems(vendorId);
      localStorage.setItem(menuItemsKey, JSON.stringify(vendorMenuItems));

      return vendorMenuItems.length;
    } catch (error) {
      logger.warn(`Failed to fix menu items for vendor ${vendorId}`, error, 'VendorService');
      return 0;
    }
  }

  _getSubscriptionData() {
    try {
      const data = localStorage.getItem(this.storageKeys.subscription);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('Failed to get subscription data', error, 'VendorService');
      return null;
    }
  }

  _getVendorCount(zoneId) {
    const vendors = this.getVendorsForZone(zoneId);
    return vendors.length;
  }
}

// Create singleton instance
const vendorService = new VendorService();

export default vendorService;