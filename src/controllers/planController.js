const Plan = require('../models/Plan');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const { APIError } = require('../utils/apiError');
const logger = require('../utils/logger');

class PlanController {
  /**
   * Get all available plans by type
   * @route GET /api/v1/plans/:planType
   * @access Public
   */
  static getPlans = catchAsync(async (req, res) => {
    const { planType } = req.params;
    const { includeInactive = false } = req.query;

    if (!['restaurant', 'zone'].includes(planType)) {
      throw new APIError('Invalid plan type. Must be restaurant or zone', 400);
    }

    const plans = await Plan.getByType(planType, { 
      includeInactive: includeInactive === 'true' 
    });

    res.status(200).json({
      success: true,
      data: {
        plans,
        count: plans.length
      },
      message: `${planType} plans retrieved successfully`
    });
  });

  /**
   * Get specific plan details
   * @route GET /api/v1/plans/:planType/:planKey
   * @access Public
   */
  static getPlanDetails = catchAsync(async (req, res) => {
    const { planType, planKey } = req.params;

    if (!['restaurant', 'zone'].includes(planType)) {
      throw new APIError('Invalid plan type. Must be restaurant or zone', 400);
    }

    const plan = await Plan.getByKey(planKey, planType);

    if (!plan) {
      throw new APIError('Plan not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { plan },
      message: 'Plan details retrieved successfully'
    });
  });

  /**
   * Compare plans of a specific type
   * @route GET /api/v1/plans/:planType/compare
   * @access Public
   */
  static comparePlans = catchAsync(async (req, res) => {
    const { planType } = req.params;

    if (!['restaurant', 'zone'].includes(planType)) {
      throw new APIError('Invalid plan type. Must be restaurant or zone', 400);
    }

    const plans = await Plan.getByType(planType);

    // Create comparison matrix
    const comparison = {
      planType,
      plans: plans.map(plan => ({
        id: plan._id,
        name: plan.name,
        key: plan.key,
        price: plan.price,
        formattedPrice: plan.formattedPrice,
        limits: plan.limits,
        features: plan.features,
        metadata: plan.metadata
      })),
      featureMatrix: this.createFeatureMatrix(plans)
    };

    res.status(200).json({
      success: true,
      data: comparison,
      message: 'Plan comparison retrieved successfully'
    });
  });

  /**
   * Get recommended plan for user based on usage
   * @route GET /api/v1/plans/recommend/:planType
   * @access Private
   */
  static getRecommendedPlan = catchAsync(async (req, res) => {
    const { planType } = req.params;
    const userId = req.user.id;

    if (!['restaurant', 'zone'].includes(planType)) {
      throw new APIError('Invalid plan type. Must be restaurant or zone', 400);
    }

    // Get user's current usage (this would need to be implemented based on actual usage tracking)
    const usage = await this.getUserUsage(userId, planType);
    
    // Get all plans for the type
    const plans = await Plan.getByType(planType);

    // Find recommended plan based on usage
    const recommendedPlan = this.findRecommendedPlan(plans, usage);

    res.status(200).json({
      success: true,
      data: {
        recommendedPlan,
        currentUsage: usage,
        reason: this.getRecommendationReason(recommendedPlan, usage)
      },
      message: 'Plan recommendation generated successfully'
    });
  });

  /**
   * Check if user can upgrade to a specific plan
   * @route GET /api/v1/plans/can-upgrade/:planId
   * @access Private
   */
  static canUpgrade = catchAsync(async (req, res) => {
    const { planId } = req.params;
    const userId = req.user.id;

    const plan = await Plan.findById(planId);
    if (!plan) {
      throw new APIError('Plan not found', 404);
    }

    const user = await User.findById(userId).populate('currentPlanId');

    // Check if user can upgrade
    const canUpgrade = this.checkUpgradeEligibility(user, plan);

    res.status(200).json({
      success: true,
      data: {
        canUpgrade: canUpgrade.allowed,
        reason: canUpgrade.reason,
        currentPlan: user.currentPlanId,
        targetPlan: plan
      }
    });
  });

  // Helper Methods

  /**
   * Create feature comparison matrix
   */
  static createFeatureMatrix(plans) {
    const allFeatures = new Set();
    plans.forEach(plan => {
      Object.keys(plan.features).forEach(feature => allFeatures.add(feature));
    });

    const matrix = {};
    allFeatures.forEach(feature => {
      matrix[feature] = plans.map(plan => ({
        planKey: plan.key,
        hasFeature: plan.features[feature] || false
      }));
    });

    return matrix;
  }

  /**
   * Get user's current usage statistics
   */
  static async getUserUsage(userId, planType) {
    // This is a placeholder - implement based on actual usage tracking
    // You would query MenuCategory, MenuItem, Restaurant, Zone, etc. models
    
    const usage = {
      menus: 0,
      categories: 0,
      menuItems: 0,
      tables: 0
    };

    if (planType === 'zone') {
      usage.shops = 0;
      usage.vendors = 0;
    }

    // TODO: Implement actual usage calculation
    // Example:
    // const MenuCategory = require('../models/MenuCategory');
    // usage.categories = await MenuCategory.countDocuments({ userId });

    return usage;
  }

  /**
   * Find recommended plan based on usage
   */
  static findRecommendedPlan(plans, usage) {
    // Sort plans by price
    const sortedPlans = plans.sort((a, b) => a.price - b.price);

    // Find the cheapest plan that accommodates current usage
    for (const plan of sortedPlans) {
      if (this.planCanAccommodateUsage(plan, usage)) {
        return plan;
      }
    }

    // If no plan can accommodate, return the highest plan
    return sortedPlans[sortedPlans.length - 1];
  }

  /**
   * Check if plan can accommodate usage
   */
  static planCanAccommodateUsage(plan, usage) {
    const limits = plan.limits;

    // Check each limit
    if (limits.maxMenus !== null && usage.menus > limits.maxMenus) return false;
    if (limits.maxCategories !== null && usage.categories > limits.maxCategories) return false;
    if (limits.maxMenuItems !== null && usage.menuItems > limits.maxMenuItems) return false;
    if (limits.maxTables !== null && usage.tables > limits.maxTables) return false;
    
    if (plan.planType === 'zone') {
      if (limits.maxShops !== null && usage.shops > limits.maxShops) return false;
      if (limits.maxVendors !== null && usage.vendors > limits.maxVendors) return false;
    }

    return true;
  }

  /**
   * Get recommendation reason
   */
  static getRecommendationReason(plan, usage) {
    if (plan.price === 0) {
      return 'Free plan is sufficient for your current usage';
    }

    const usageItems = Object.entries(usage).filter(([key, value]) => value > 0);
    if (usageItems.length === 0) {
      return 'Free plan recommended as you have minimal usage';
    }

    return `${plan.name} plan recommended based on your current usage of ${usageItems.length} features`;
  }

  /**
   * Check upgrade eligibility
   */
  static checkUpgradeEligibility(user, targetPlan) {
    // User can always upgrade to a higher plan
    if (!user.currentPlanId) {
      return { allowed: true, reason: 'Upgrading from free plan' };
    }

    if (user.currentPlanId.planType !== targetPlan.planType) {
      return { allowed: false, reason: 'Cannot change plan type' };
    }

    if (user.currentPlanId.price >= targetPlan.price) {
      return { allowed: false, reason: 'Cannot downgrade or select same plan' };
    }

    if (user.isPlanExpired) {
      return { allowed: true, reason: 'Current plan has expired' };
    }

    return { allowed: true, reason: 'Upgrade available' };
  }

  /**
   * Get user's plan usage summary
   * @route GET /api/v1/plans/usage
   * @access Private
   */
  static getPlanUsage = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const PlanValidationMiddleware = require('../middleware/planValidationMiddleware');

    const usageSummary = await PlanValidationMiddleware.getPlanUsage(userId);

    res.status(200).json({
      success: true,
      data: usageSummary,
      message: 'Plan usage retrieved successfully'
    });
  });

  /**
   * Get plan recommendations for user
   * @route GET /api/v1/plans/recommendations
   * @access Private
   */
  static getPlanRecommendations = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const PlanManagementService = require('../services/planManagementService');

    const recommendations = await PlanManagementService.getPlanRecommendations(userId);

    res.status(200).json({
      success: true,
      data: recommendations,
      message: 'Plan recommendations retrieved successfully'
    });
  });

  /**
   * Get user's plan history
   * @route GET /api/v1/plans/history
   * @access Private
   */
  static getPlanHistory = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const PlanManagementService = require('../services/planManagementService');

    const history = await PlanManagementService.getPlanHistory(userId);

    res.status(200).json({
      success: true,
      data: history,
      message: 'Plan history retrieved successfully'
    });
  });

  /**
   * Manually expire user's plan (Admin only)
   * @route POST /api/v1/plans/expire/:userId
   * @access Private (Admin)
   */
  static expireUserPlan = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const PlanManagementService = require('../services/planManagementService');

    const result = await PlanManagementService.expirePlan(userId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'User plan expired successfully'
    });
  });

  /**
   * Get plan statistics (Admin only)
   * @route GET /api/v1/plans/statistics
   * @access Private (Admin)
   */
  static getPlanStatistics = catchAsync(async (req, res) => {
    const PlanManagementService = require('../services/planManagementService');

    const statistics = await PlanManagementService.getPlanStatistics();

    res.status(200).json({
      success: true,
      data: statistics,
      message: 'Plan statistics retrieved successfully'
    });
  });
}

module.exports = PlanController;
