/**
 * Subscription Service for TableServe Application
 * NO localStorage - use Redux + API as single source of truth
 * Handles all subscription-related logic including limits validation and enforcement
 */

import logger from './LoggingService';
import { RESTAURANT_PLANS, ZONE_PLANS, resolvePlanMetadata, mapBackendToFrontendPlanKey } from '../features/subscription/constants/plans';
import { store } from '../store';
import ApiService from '../shared/api/ApiService';

class SubscriptionService {
  /**
   * Get current subscription from Redux store (NOT localStorage)
   */
  getCurrentSubscription() {
    try {
      const state = store.getState();
      const subscription = state.subscription?.currentSubscription || null;
      
      if (!subscription) {
        return null;
      }

      // Apply plan key mapping if subscription has backend plan keys
      if (subscription.planKey && subscription.planType) {
        const frontendPlanKey = mapBackendToFrontendPlanKey(subscription.planKey, subscription.planType);

        // Return normalized subscription with frontend plan key
        return {
          ...subscription,
          key: frontendPlanKey,
          planKey: frontendPlanKey,
          plan: frontendPlanKey // Also set 'plan' for compatibility
        };
      }

      return subscription;
    } catch (error) {
      logger.error('Failed to get subscription from Redux', error, 'SubscriptionService');
      return null;
    }
  }

  /**
   * Fetch subscription from server and update Redux
   */
  async fetchSubscription() {
    try {
      const subscription = await ApiService.getCurrentSubscription();
      
      // Update Redux store
      const { setSubscription } = await import('../store/slices/subscriptionSlice');
      store.dispatch(setSubscription(subscription));
      
      logger.info('Subscription fetched and updated in Redux', {
        plan: subscription.planKey
      }, 'SubscriptionService');
      
      return subscription;
    } catch (error) {
      logger.error('Failed to fetch subscription', error, 'SubscriptionService');
      throw error;
    }
  }

  /**
   * Check if vendor limit allows adding more vendors (fetch fresh data from server)
   * @param {string} zoneId - Zone ID to check
   * @param {number} currentCount - Current vendor count (optional)
   * @returns {Object} Validation result
   */
  async checkVendorLimit(zoneId, currentCount = null) {
    try {
      // Always fetch fresh subscription data
      const subscription = await this.fetchSubscription();
      
      if (!subscription) {
        return {
          allowed: true,
          unlimited: true,
          message: 'No subscription limits'
        };
      }

      const maxVendors = subscription.maxVendors;
      
      if (maxVendors === null || maxVendors === undefined) {
        return {
          allowed: true,
          unlimited: true,
          message: 'Unlimited vendors allowed'
        };
      }

      // Get current count from API if not provided
      if (currentCount === null) {
        const vendors = await ApiService.getZoneVendors(zoneId);
        currentCount = vendors.length;
      }

      const canAddMore = currentCount < maxVendors;
      
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
  async checkTableLimit(restaurantId, requestedTables = 1) {
    try {
      // Always fetch fresh subscription data
      const subscription = await this.fetchSubscription();
      
      if (!subscription) {
        return {
          allowed: true,
          unlimited: true,
          message: 'No subscription limits'
        };
      }

      const maxTables = subscription.maxTables;
      
      if (maxTables === null || maxTables === undefined) {
        return {
          allowed: true,
          unlimited: true,
          message: 'Unlimited tables allowed'
        };
      }

      // Get current count from API
      const tables = await ApiService.getRestaurantTables(restaurantId);
      const currentCount = tables.length;
      const totalAfterRequest = currentCount + requestedTables;
      const canAdd = totalAfterRequest <= maxTables;

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
   * Clear subscription data (for testing) - clears Redux only
   */
  clearSubscription() {
    try {
      const { clearSubscription } = require('../store/slices/subscriptionSlice');
      store.dispatch(clearSubscription());
      logger.info('Subscription data cleared from Redux', {}, 'SubscriptionService');
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

      const { setSubscription } = require('../store/slices/subscriptionSlice');
      store.dispatch(setSubscription(testSubscription));
      
      logger.info('Test subscription created in Redux', { planType, planKey, customLimits }, 'SubscriptionService');
      return true;
    } catch (error) {
      logger.error('Test subscription creation failed', error, 'SubscriptionService');
      return false;
    }
  }
}

// Create singleton instance
const subscriptionService = new SubscriptionService();

export default subscriptionService;