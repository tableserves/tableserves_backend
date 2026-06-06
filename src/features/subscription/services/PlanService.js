import api from '../../../shared/api/api';
import logger from '@/services/LoggingService';

/**
 * Plan Service for handling plan-related operations
 */
class PlanService {
  /**
   * Get available plans by type
   * @param {string} planType - 'restaurant' or 'zone'
   * @returns {Promise<Object>} Available plans
   */
  static async getPlans(planType) {
    try {
      logger.info('Fetching plans', { planType }, 'PlanService');
      
      const response = await api.get(`/plans/${planType}`);
      
      logger.info('Plans fetched successfully', { 
        count: response.data.data?.length || 0 
      }, 'PlanService');
      
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch plans', error, 'PlanService');
      throw error;
    }
  }

  /**
   * Get specific plan details
   * @param {string} planType - 'restaurant' or 'zone'
   * @param {string} planKey - Plan key
   * @returns {Promise<Object>} Plan details
   */
  static async getPlanDetails(planType, planKey) {
    try {
      logger.info('Fetching plan details', { planType, planKey }, 'PlanService');
      
      const response = await api.get(`/plans/${planType}/${planKey}`);
      
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch plan details', error, 'PlanService');
      throw error;
    }
  }

  /**
   * Compare plans of a specific type
   * @param {string} planType - 'restaurant' or 'zone'
   * @returns {Promise<Object>} Plan comparison data
   */
  static async comparePlans(planType) {
    try {
      const response = await api.get(`/plans/${planType}/compare`);
      return response.data;
    } catch (error) {
      logger.error('Failed to compare plans', error, 'PlanService');
      throw error;
    }
  }

  /**
   * Get recommended plan for user
   * @param {string} planType - 'restaurant' or 'zone'
   * @returns {Promise<Object>} Recommended plan
   */
  static async getRecommendedPlan(planType) {
    try {
      const response = await api.get(`/plans/recommend/${planType}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get recommended plan', error, 'PlanService');
      throw error;
    }
  }

  /**
   * Check if user can upgrade to a specific plan
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Upgrade eligibility
   */
  static async canUpgrade(planId) {
    try {
      const response = await api.get(`/plans/can-upgrade/${planId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to check upgrade eligibility', error, 'PlanService');
      throw error;
    }
  }

  /**
   * Get user's plan usage summary
   * @returns {Promise<Object>} Plan usage data
   */
  static async getPlanUsage() {
    try {
      const response = await api.get('/plans/usage');
      return response.data;
    } catch (error) {
      logger.error('Failed to get plan usage', error, 'PlanService');
      throw error;
    }
  }

  /**
   * Get plan history for user
   * @returns {Promise<Object>} Plan history
   */
  static async getPlanHistory() {
    try {
      const response = await api.get('/plans/history');
      return response.data;
    } catch (error) {
      logger.error('Failed to get plan history', error, 'PlanService');
      throw error;
    }
  }

  /**
   * Format plan features for display
   * @param {Object} features - Plan features object
   * @returns {Array} Formatted features array
   */
  static formatPlanFeatures(features) {
    const featureLabels = {
      crudMenu: 'Menu Management',
      qrGeneration: 'QR Code Generation',
      qrCustomization: 'QR Code Customization',
      analytics: 'Analytics & Reports',
      modifiers: 'Menu Item Modifiers',
      watermark: 'No TableServe Watermark',
      vendorManagement: 'Vendor Management',
      prioritySupport: 'Priority Support',
      premiumBranding: 'Premium Branding',
      orderTracking: 'Order Tracking',
      multiLocation: 'Multiple Locations',
      apiAccess: 'API Access',
      whiteLabel: 'White Label Solution',
      customBranding: 'Custom Branding'
    };

    return Object.entries(features)
      .filter(([key, value]) => value === true)
      .map(([key]) => ({
        key,
        label: featureLabels[key] || key,
        enabled: true
      }));
  }

  /**
   * Format plan limits for display
   * @param {Object} limits - Plan limits object
   * @returns {Array} Formatted limits array
   */
  static formatPlanLimits(limits) {
    const limitLabels = {
      maxMenus: 'Menus',
      maxCategories: 'Categories',
      maxMenuItems: 'Menu Items',
      maxTables: 'Tables',
      maxShops: 'Shops',
      maxVendors: 'Vendors'
    };

    return Object.entries(limits)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        key,
        label: limitLabels[key] || key,
        value: value === -1 ? 'Unlimited' : value,
        isUnlimited: value === -1
      }));
  }

  /**
   * Get plan price with tax calculation
   * @param {number} basePrice - Base plan price
   * @param {string} currency - Currency code
   * @returns {Object} Price breakdown
   */
  static calculatePlanPrice(basePrice, currency = 'INR') {
    if (basePrice === 0) {
      return {
        basePrice: 0,
        taxAmount: 0,
        totalPrice: 0,
        formattedBase: 'Free',
        formattedTax: '₹0',
        formattedTotal: 'Free'
      };
    }

    const taxAmount = Math.round(basePrice * 0.18); // 18% GST
    const totalPrice = basePrice + taxAmount;

    return {
      basePrice,
      taxAmount,
      totalPrice,
      formattedBase: this.formatCurrency(basePrice, currency),
      formattedTax: this.formatCurrency(taxAmount, currency),
      formattedTotal: this.formatCurrency(totalPrice, currency)
    };
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency
   */
  static formatCurrency(amount, currency = 'INR') {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount}`;
  }

  /**
   * Check if plan is upgrade from current plan
   * @param {Object} currentPlan - Current plan details
   * @param {Object} targetPlan - Target plan details
   * @returns {boolean} Is upgrade
   */
  static isPlanUpgrade(currentPlan, targetPlan) {
    if (!currentPlan || !targetPlan) return false;
    
    // Free plan to any paid plan is an upgrade
    if (currentPlan.price === 0 && targetPlan.price > 0) return true;
    
    // Higher price is generally an upgrade
    return targetPlan.price > currentPlan.price;
  }

  /**
   * Get plan duration in human readable format
   * @param {number} durationDays - Duration in days
   * @returns {string} Formatted duration
   */
  static formatPlanDuration(durationDays) {
    if (durationDays === 30) return '1 Month';
    if (durationDays === 365) return '1 Year';
    if (durationDays < 30) return `${durationDays} Days`;
    if (durationDays < 365) {
      const months = Math.floor(durationDays / 30);
      return `${months} Month${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(durationDays / 365);
    return `${years} Year${years > 1 ? 's' : ''}`;
  }

  /**
   * Calculate days remaining until plan expiry
   * @param {string} expiryDate - Plan expiry date
   * @returns {number} Days remaining
   */
  static getDaysRemaining(expiryDate) {
    if (!expiryDate) return 0;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Check if plan is expired
   * @param {string} expiryDate - Plan expiry date
   * @returns {boolean} Is expired
   */
  static isPlanExpired(expiryDate) {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }
}

export default PlanService;