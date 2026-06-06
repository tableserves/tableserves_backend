/**
 * Unified Vendor Service for TableServe Application
 * Handles vendor operations through API calls only - no local storage
 */

import { store } from '../store';
import { setVendors } from '../store/slices/vendorsSlice';
import logger from './LoggingService';
import ApiService from '../shared/api/ApiService';

class VendorService {
  constructor() {
    // No storage keys needed - using API only
  }

  /**
   * Get vendors from API and update Redux store
   * @param {string} zoneId - The zone ID to get vendors for
   * @returns {Object} Result of operation
   */
  async getVendors(zoneId) {
    try {
      logger.debug('Fetching vendors from API', { zoneId }, 'VendorService');

      const vendors = await ApiService.getZoneVendors(zoneId);
      const safeVendors = Array.isArray(vendors) ? vendors : [];

      // Update Redux store
      store.dispatch(setVendors(safeVendors));

      logger.info('Vendors fetched successfully', { zoneId, count: safeVendors.length }, 'VendorService');

      return {
        success: true,
        vendors: safeVendors,
        count: safeVendors.length
      };
    } catch (error) {
      logger.error('Failed to fetch vendors', error, 'VendorService');
      return {
        success: false,
        error: error.message,
        vendors: []
      };
    }
  }

  /**
   * Create a new vendor through API
   * @param {string} zoneId - The zone ID
   * @param {Object} vendorData - Vendor data
   * @returns {Object} Result of creation operation
   */
  async createVendor(zoneId, vendorData) {
    try {
      logger.debug('Creating vendor via API', { zoneId, vendorName: vendorData.name }, 'VendorService');

      const result = await ApiService.createZoneVendor(zoneId, vendorData);
      
      // Refresh vendors list
      await this.getVendors(zoneId);

      logger.info('Vendor created successfully', { zoneId, vendorId: result.id }, 'VendorService');

      return {
        success: true,
        vendor: result
      };
    } catch (error) {
      logger.error('Vendor creation failed', error, 'VendorService');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update a vendor through API
   * @param {string} zoneId - The zone ID
   * @param {string} vendorId - The vendor ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Result of update operation
   */
  async updateVendor(zoneId, vendorId, updates) {
    try {
      logger.debug('Updating vendor via API', { zoneId, vendorId }, 'VendorService');

      await ApiService.updateZoneVendor(zoneId, vendorId, updates);
      
      // Refresh vendors list
      await this.getVendors(zoneId);

      logger.info('Vendor updated successfully', { zoneId, vendorId }, 'VendorService');

      return {
        success: true
      };
    } catch (error) {
      logger.error('Vendor update failed', error, 'VendorService');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a vendor through API
   * @param {string} zoneId - The zone ID
   * @param {string} vendorId - The vendor ID
   * @returns {Object} Result of deletion operation
   */
  async deleteVendor(zoneId, vendorId) {
    try {
      logger.debug('Deleting vendor via API', { zoneId, vendorId }, 'VendorService');

      await ApiService.deleteZoneVendor(zoneId, vendorId);
      
      // Refresh vendors list
      await this.getVendors(zoneId);

      logger.info('Vendor deleted successfully', { zoneId, vendorId }, 'VendorService');

      return {
        success: true
      };
    } catch (error) {
      logger.error('Vendor deletion failed', error, 'VendorService');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get vendors from Redux store
   * @returns {Array} Array of vendors
   */
  getVendorsFromStore() {
    try {
      const state = store.getState();
      return state.vendors?.vendors || [];
    } catch (error) {
      logger.error('Failed to get vendors from store', error, 'VendorService');
      return [];
    }
  }

  /**
   * Clear vendor data from Redux store
   */
  clearVendorData() {
    try {
      store.dispatch(setVendors([]));
      logger.info('Vendor data cleared from store', {}, 'VendorService');
    } catch (error) {
      logger.error('Failed to clear vendor data', error, 'VendorService');
    }
  }


}

// Create singleton instance
const vendorService = new VendorService();

export default vendorService;