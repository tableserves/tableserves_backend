/**
 * Subscription Service for TableServe Application
 * Handles all subscription-related logic including limits validation and enforcement
 */

import logger from './LoggingService';
import { RESTAURANT_PLANS, ZONE_PLANS, resolvePlanMetadata } from '../constants/plans';

class SubscriptionService {
  constructor() {
    this.storageKey = 'tableserve_subscription';
  }

  /**
   * Get current subscription data
   * @returns {Object|null} Subscription data or null if not found
   */
  getCurrentSubscription() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get subscription data', error, 'SubscriptionService');
      return null;
    }
  }

  /**
   * Set subscription data
   * @param {Object} subscriptionData - Subscription data to store
   * @returns {boolean} Success status
   */
  setSubscription(subscriptionData) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(subscriptionData));
      logger.info('Subscription data updated', { plan: subscriptionData.plan }, 'SubscriptionService');
      return true;
    } catch (error) {
      logger.error('Failed to set subscription data', error, 'SubscriptionService');
      return false;
    }
  }

  /**
   * Check if vendor limit allows adding more vendors
   * @param {string} zoneId - Zone ID to check
   * @param {number} currentCount - Current vendor count (optional)
   * @returns {Object} Validation result
   */
  checkVendorLimit(zoneId, currentCount = null) {
    try {
      const subscription = this.getCurrentSubscription();
      
      if (!subscription) {
        logger.warn('No subscription found, allowing unlimited vendors', { zoneId }, 'SubscriptionService');
        return {
          allowed: true,
          unlimited: true,
          message: 'No subscription limits'
        };
      }

      const maxVendors = subscription.maxVendors;
      
      // Unlimited plan
      if (maxVendors === null || maxVendors === undefined) {
        return {
          allowed: true,
          unlimited: true,
          currentCount,
          message: 'Unlimited vendors allowed'
        };
      }

      // Get current count if not provided
      if (currentCount === null) {
        currentCount = this._getCurrentVendorCount(zoneId);
      }

      const canAddMore = currentCount < maxVendors;
      
      logger.debug('Vendor limit check', {
        zoneId,
        currentVendors: currentCount,
        maxVendors,
        canAddMore
      }, 'SubscriptionService');

      return {
        allowed: canAddMore,
        currentCount,
        maxCount: maxVendors,
        remaining: Math.max(0, maxVendors - currentCount),
        message: canAddMore 
          ? `${maxVendors - currentCount} vendors remaining`
          : `Vendor limit reached (${currentCount}/${maxVendors})`
      };
    } catch (error) {
      logger.error('Vendor limit check failed', error, 'SubscriptionService');
      return {
        allowed: false,
        error: error.message
      };
    }
  }

  /**
   * Check if table limit allows adding more tables
   * @param {string} restaurantId - Restaurant ID to check
   * @param {number} requestedTables - Number of tables requested
   * @returns {Object} Validation result
   */
  checkTableLimit(restaurantId, requestedTables = 1) {
    try {
      const subscription = this.getCurrentSubscription();
      
      if (!subscription) {
        logger.warn('No subscription found, allowing unlimited tables', { restaurantId }, 'SubscriptionService');
        return {
          allowed: true,
          unlimited: true,
          message: 'No subscription limits'
        };
      }

      const maxTables = subscription.maxTables;
      
      // Unlimited plan
      if (maxTables === null || maxTables === undefined) {
        return {
          allowed: true,
          unlimited: true,
          message: 'Unlimited tables allowed'
        };
      }

      const currentCount = this._getCurrentTableCount(restaurantId);
      const totalAfterRequest = currentCount + requestedTables;
      const canAdd = totalAfterRequest <= maxTables;

      logger.debug('Table limit check', {
        restaurantId,
        currentTables: currentCount,
        requestedTables,
        maxTables,
        canAdd
      }, 'SubscriptionService');

      return {
        allowed: canAdd,
        currentCount,
        maxCount: maxTables,
        requestedCount: requestedTables,
        remaining: Math.max(0, maxTables - currentCount),
        message: canAdd 
          ? `${maxTables - currentCount} tables remaining`
          : `Table limit exceeded (${totalAfterRequest}/${maxTables})`
      };
    } catch (error) {
      logger.error('Table limit check failed', error, 'SubscriptionService');
      return {
        allowed: false,
        error: error.message
      };
    }
  }

  /**
   * Check if feature is available in current subscription
   * @param {string} featureName - Name of feature to check
   * @returns {boolean} Feature availability
   */
  hasFeature(featureName) {
    try {
      const subscription = this.getCurrentSubscription();
      
      if (!subscription || !subscription.features) {
        logger.warn('No subscription or features found', { featureName }, 'SubscriptionService');
        return false;
      }

      return Boolean(subscription.features[featureName]);
    } catch (error) {
      logger.error('Feature check failed', error, 'SubscriptionService');
      return false;
    }
  }

  /**
   * Get subscription plan details
   * @returns {Object|null} Plan details or null
   */
  getPlanDetails() {
    try {
      const subscription = this.getCurrentSubscription();
      
      if (!subscription) {
        return null;
      }

      const planType = subscription.planType || 'restaurant';
      const planKey = subscription.plan || 'basic';
      
      const planSource = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
      const planData = planSource[planKey];

      return {
        ...subscription,
        planDetails: planData || null
      };
    } catch (error) {
      logger.error('Failed to get plan details', error, 'SubscriptionService');
      return null;
    }
  }

  /**
   * Validate subscription is active and not expired
   * @returns {Object} Validation result
   */
  validateSubscriptionStatus() {
    try {
      const subscription = this.getCurrentSubscription();
      
      if (!subscription) {
        return {
          valid: false,
          message: 'No subscription found'
        };
      }

      if (subscription.status !== 'active') {
        return {
          valid: false,
          message: `Subscription is ${subscription.status}`
        };
      }

      // Check expiration if exists
      if (subscription.expiresAt) {
        const expirationDate = new Date(subscription.expiresAt);
        const now = new Date();
        
        if (now > expirationDate) {
          return {
            valid: false,
            message: 'Subscription has expired',
            expiredAt: subscription.expiresAt
          };
        }
      }

      return {
        valid: true,
        message: 'Subscription is active'
      };
    } catch (error) {
      logger.error('Subscription validation failed', error, 'SubscriptionService');
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Clear subscription data (for testing)
   */
  clearSubscription() {
    try {
      localStorage.removeItem(this.storageKey);
      logger.info('Subscription data cleared', {}, 'SubscriptionService');
    } catch (error) {
      logger.error('Failed to clear subscription', error, 'SubscriptionService');
    }
  }

  /**
   * Create test subscription for development
   * @param {string} planType - 'restaurant' or 'zone'
   * @param {string} planKey - Plan key (basic, medium, advanced, etc.)
   * @param {Object} customLimits - Custom limits to override
   * @returns {boolean} Success status
   */
  createTestSubscription(planType = 'zone', planKey = 'basic', customLimits = {}) {
    try {
      const metadata = resolvePlanMetadata({ 
        planKey, 
        planType, 
        custom: customLimits 
      });

      const testSubscription = {
        ...metadata,
        status: 'active',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        isTest: true
      };

      const success = this.setSubscription(testSubscription);
      
      if (success) {
        logger.info('Test subscription created', { planType, planKey, customLimits }, 'SubscriptionService');
      }

      return success;
    } catch (error) {
      logger.error('Test subscription creation failed', error, 'SubscriptionService');
      return false;
    }
  }

  // Private helper methods

  _getCurrentVendorCount(zoneId) {
    try {
      const vendors = localStorage.getItem(`tableserve_zone_vendors_${zoneId}`);
      return vendors ? JSON.parse(vendors).length : 0;
    } catch (error) {
      logger.warn(`Failed to get vendor count for zone ${zoneId}`, error, 'SubscriptionService');
      return 0;
    }
  }

  _getCurrentTableCount(restaurantId) {
    try {
      // This would need to be implemented based on how tables are stored
      // For now, return 0 as placeholder
      logger.debug(`Getting table count for restaurant ${restaurantId}`, {}, 'SubscriptionService');
      return 0;
    } catch (error) {
      logger.warn(`Failed to get table count for restaurant ${restaurantId}`, error, 'SubscriptionService');
      return 0;
    }
  }
}

// Create singleton instance
const subscriptionService = new SubscriptionService();

export default subscriptionService;