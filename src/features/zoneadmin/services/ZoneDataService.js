/**
 * Zone Data Service
 * Service to handle zone data operations with caching
 */

import { logger } from '../../../shared/logging/logger';

class ZoneDataService {
  constructor() {
    // Simple in-memory cache
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get zone limits based on subscription from database
   */
  async getZoneLimits(zoneId) {
    try {
      // Check cache first
      const cached = this.cache.get(`zone_limits_${zoneId}`);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Import DatabaseService dynamically to avoid circular dependencies
      const DatabaseService = (await import('../../../services/DatabaseService')).default;
      
      const zone = await DatabaseService.getData(`/zones/${zoneId}`);
      
      // If zone has subscription, get limits from subscription
      if (zone.subscriptionId) {
        const limits = {
          maxTables: zone.subscriptionId.limits?.maxTables ?? zone.maxTables ?? null,
          maxShops: zone.subscriptionId.limits?.maxShops ?? zone.maxShops ?? null,
          maxVendors: zone.subscriptionId.limits?.maxVendors ?? zone.maxVendors ?? null,
          maxMenuItems: zone.subscriptionId.limits?.maxMenuItems ?? null,
          maxCategories: zone.subscriptionId.limits?.maxCategories ?? null,
          maxUsers: zone.subscriptionId.limits?.maxUsers ?? 1,
          planType: zone.subscriptionId.planType || 'zone',
          planKey: zone.subscriptionId.planKey || 'zone_free',
          unlimited: zone.subscriptionId.features?.unlimited || false
        };
        
        // Cache the result
        this.cache.set(`zone_limits_${zoneId}`, {
          data: limits,
          timestamp: Date.now()
        });
        
        return limits;
      }
      
      // Fallback to zone-level limits (from database)
      const limits = {
        maxTables: zone.maxTables ?? null,
        maxShops: zone.maxShops ?? null,
        maxVendors: zone.maxVendors ?? null,
        maxMenuItems: zone.maxMenuItems ?? null,
        maxCategories: zone.maxCategories ?? null,
        maxUsers: 1,
        planType: zone.subscriptionPlan || 'zone',
        planKey: 'zone_free',
        unlimited: false
      };
      
      // Cache the result
      this.cache.set(`zone_limits_${zoneId}`, {
        data: limits,
        timestamp: Date.now()
      });
      
      return limits;
    } catch (error) {
      logger.error('Error fetching zone limits', error);
      // Return null values to indicate limits should be fetched from subscription service
      return {
        maxTables: null,
        maxShops: null,
        maxVendors: null,
        maxMenuItems: null,
        maxCategories: null,
        maxUsers: 1,
        planType: 'zone',
        planKey: 'zone_free',
        unlimited: false
      };
    }
  }

  /**
   * Clear cache for a specific zone
   */
  clearCache(zoneId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(zoneId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    logger.info('Cache cleared for zone', { zoneId });
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
    logger.info('All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create and export singleton instance
const zoneDataService = new ZoneDataService();
export default zoneDataService;