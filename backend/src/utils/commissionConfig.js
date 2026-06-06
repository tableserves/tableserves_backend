/**
 * Commission Configuration
 * 
 * BUSINESS MODEL: Subscription-based revenue only
 * - NO commission on transactions
 * - 100% of payment goes to restaurant/shop
 * - Platform earns from monthly/yearly subscription fees
 */

const SUBSCRIPTION_PLANS = {
  free: { monthly: 0, yearly: 0 },
  basic: { monthly: 499, yearly: 4990 },
  advanced: { monthly: 999, yearly: 9990 },
  premium: { monthly: 1999, yearly: 19990 },
};

/**
 * Get commission rate (always 0 - no transaction commission)
 * @param {String} planType - Plan type (not used, kept for compatibility)
 * @returns {Number} Commission rate percentage (always 0)
 */
function getCommissionRate(planType) {
  return 0; // No commission - 100% goes to merchant
}

/**
 * Calculate payment split (100% to merchant)
 * @param {Number} totalAmount - Total order amount
 * @returns {Object} { commission, merchantAmount, rate }
 */
function calculateCommission(totalAmount) {
  return {
    commission: 0,
    merchantAmount: totalAmount,
    rate: 0,
    totalAmount,
  };
}

/**
 * Get subscription plan pricing
 * @returns {Object} Subscription plans
 */
function getSubscriptionPlans() {
  return { ...SUBSCRIPTION_PLANS };
}

/**
 * Get plan pricing
 * @param {String} planType - Plan type
 * @param {String} billingCycle - 'monthly' or 'yearly'
 * @returns {Number} Plan price
 */
function getPlanPrice(planType, billingCycle = 'monthly') {
  const plan = SUBSCRIPTION_PLANS[planType?.toLowerCase()];
  if (!plan) return 0;
  return plan[billingCycle] || plan.monthly;
}

/**
 * Calculate platform revenue from subscriptions
 * @param {Number} restaurantCount - Number of restaurants
 * @param {Object} planDistribution - Distribution of plans
 * @returns {Object} Revenue breakdown
 */
function calculatePlatformRevenue(restaurantCount, planDistribution) {
  const revenue = {
    monthly: 0,
    yearly: 0,
    breakdown: {},
  };

  Object.keys(planDistribution).forEach(plan => {
    const count = planDistribution[plan] || 0;
    const pricing = SUBSCRIPTION_PLANS[plan];
    
    if (pricing) {
      revenue.monthly += count * pricing.monthly;
      revenue.yearly += count * pricing.yearly;
      revenue.breakdown[plan] = {
        count,
        monthlyRevenue: count * pricing.monthly,
        yearlyRevenue: count * pricing.yearly,
      };
    }
  });

  return revenue;
}

module.exports = {
  SUBSCRIPTION_PLANS,
  getCommissionRate,
  calculateCommission,
  getSubscriptionPlans,
  getPlanPrice,
  calculatePlatformRevenue,
};
