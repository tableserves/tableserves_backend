const User = require('../models/User');
const Plan = require('../models/Plan');
const PlanPayment = require('../models/PlanPayment');
const logger = require('../utils/logger');
const APIError = require('../utils/APIError');

/**
 * Plan Management Service
 * Handles plan operations, upgrades, downgrades, and expiry management
 */
class PlanManagementService {

  /**
   * Activate a plan for a user
   */
  static async activatePlan(userId, planId, paymentId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new APIError('User not found', 404);
      }

      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new APIError('Plan not found', 404);
      }

      if (!plan.active) {
        throw new APIError('Plan is not active', 400);
      }

      // Validate plan type matches user's business type
      if (plan.planType !== (user.businessType || 'restaurant')) {
        throw new APIError('Plan type does not match user business type', 400);
      }

      // Calculate expiry date (30 days from now for paid plans, null for free)
      const expiryDate = plan.key === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Store previous plan in history if user had one
      let planHistoryEntry = null;
      if (user.currentPlanId) {
        planHistoryEntry = {
          planId: user.currentPlanId,
          startDate: user.planStartDate || new Date(),
          endDate: new Date(),
          status: 'completed',
          reason: 'Upgraded to new plan'
        };
      }

      // Update user's plan
      const updateData = {
        currentPlanId: planId,
        planStatus: 'active',
        planExpiryDate: expiryDate,
        planStartDate: new Date()
      };

      if (planHistoryEntry) {
        updateData.$push = { planHistory: planHistoryEntry };
      }

      await User.findByIdAndUpdate(userId, updateData);

      // Log the activation
      logger.info('Plan activated', {
        userId,
        planId,
        planName: plan.name,
        planType: plan.planType,
        expiryDate,
        paymentId
      });

      return {
        success: true,
        plan: plan,
        expiryDate: expiryDate,
        message: `${plan.name} plan activated successfully`
      };

    } catch (error) {
      logger.error('Error activating plan', {
        userId,
        planId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Expire a user's plan and downgrade to free
   */
  static async expirePlan(userId) {
    try {
      const user = await User.findById(userId).populate('currentPlanId');
      if (!user) {
        throw new APIError('User not found', 404);
      }

      if (!user.currentPlanId || user.planStatus !== 'active') {
        throw new APIError('User does not have an active plan', 400);
      }

      // Get free plan for user's business type
      const freePlan = await Plan.findOne({
        key: 'free',
        planType: user.businessType || 'restaurant',
        active: true
      });

      if (!freePlan) {
        throw new APIError('Free plan not found', 500);
      }

      // Add current plan to history
      const planHistoryEntry = {
        planId: user.currentPlanId._id,
        startDate: user.planStartDate || new Date(),
        endDate: new Date(),
        status: 'expired',
        reason: 'Plan expired'
      };

      // Update user to free plan
      await User.findByIdAndUpdate(userId, {
        $set: {
          currentPlanId: freePlan._id,
          planStatus: 'active',
          planExpiryDate: null,
          planStartDate: new Date()
        },
        $push: {
          planHistory: planHistoryEntry
        }
      });

      logger.info('Plan expired and downgraded', {
        userId,
        expiredPlan: user.currentPlanId.name,
        downgradedTo: freePlan.name
      });

      return {
        success: true,
        message: 'Plan expired and downgraded to free plan',
        newPlan: freePlan
      };

    } catch (error) {
      logger.error('Error expiring plan', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check if user can upgrade to a specific plan
   */
  static async canUpgrade(userId, targetPlanId) {
    try {
      const user = await User.findById(userId).populate('currentPlanId');
      if (!user) {
        throw new APIError('User not found', 404);
      }

      const targetPlan = await Plan.findById(targetPlanId);
      if (!targetPlan) {
        throw new APIError('Target plan not found', 404);
      }

      if (!targetPlan.active) {
        return {
          canUpgrade: false,
          reason: 'Target plan is not active'
        };
      }

      // Check plan type compatibility
      if (targetPlan.planType !== (user.businessType || 'restaurant')) {
        return {
          canUpgrade: false,
          reason: 'Plan type does not match your business type'
        };
      }

      // If user has no current plan, they can upgrade to any plan
      if (!user.currentPlanId) {
        return {
          canUpgrade: true,
          reason: 'Upgrading from free plan'
        };
      }

      // Check if it's actually an upgrade (higher price)
      if (user.currentPlanId.price >= targetPlan.price) {
        return {
          canUpgrade: false,
          reason: 'Cannot downgrade or select the same plan'
        };
      }

      // Check if current plan is expired
      if (user.isPlanExpired) {
        return {
          canUpgrade: true,
          reason: 'Current plan has expired'
        };
      }

      return {
        canUpgrade: true,
        reason: 'Upgrade available'
      };

    } catch (error) {
      logger.error('Error checking upgrade eligibility', {
        userId,
        targetPlanId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get plan recommendations for a user
   */
  static async getPlanRecommendations(userId) {
    try {
      const user = await User.findById(userId).populate('currentPlanId');
      if (!user) {
        throw new APIError('User not found', 404);
      }

      const businessType = user.businessType || 'restaurant';
      
      // Get all active plans for user's business type
      const allPlans = await Plan.find({
        planType: businessType,
        active: true
      }).sort({ price: 1 });

      const currentPlan = user.currentPlanId;
      const recommendations = [];

      for (const plan of allPlans) {
        const canUpgradeResult = await this.canUpgrade(userId, plan._id);
        
        recommendations.push({
          plan: plan,
          canUpgrade: canUpgradeResult.canUpgrade,
          reason: canUpgradeResult.reason,
          isCurrent: currentPlan && currentPlan._id.toString() === plan._id.toString(),
          savings: currentPlan ? Math.max(0, currentPlan.price - plan.price) : 0,
          upgrade: currentPlan ? Math.max(0, plan.price - currentPlan.price) : plan.price
        });
      }

      return recommendations;

    } catch (error) {
      logger.error('Error getting plan recommendations', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's plan history
   */
  static async getPlanHistory(userId) {
    try {
      const user = await User.findById(userId)
        .populate('planHistory.planId')
        .populate('currentPlanId');

      if (!user) {
        throw new APIError('User not found', 404);
      }

      const history = user.planHistory.map(entry => ({
        plan: entry.planId,
        startDate: entry.startDate,
        endDate: entry.endDate,
        status: entry.status,
        reason: entry.reason,
        duration: entry.endDate ? 
          Math.ceil((entry.endDate - entry.startDate) / (24 * 60 * 60 * 1000)) : 
          null
      }));

      // Add current plan to history if exists
      if (user.currentPlanId) {
        history.push({
          plan: user.currentPlanId,
          startDate: user.planStartDate,
          endDate: null,
          status: user.planStatus,
          reason: 'Current plan',
          duration: user.planStartDate ? 
            Math.ceil((new Date() - user.planStartDate) / (24 * 60 * 60 * 1000)) : 
            null
        });
      }

      return history.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    } catch (error) {
      logger.error('Error getting plan history', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get plan statistics for admin dashboard
   */
  static async getPlanStatistics() {
    try {
      const stats = await User.aggregate([
        {
          $lookup: {
            from: 'plans',
            localField: 'currentPlanId',
            foreignField: '_id',
            as: 'currentPlan'
          }
        },
        {
          $unwind: {
            path: '$currentPlan',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: {
              planKey: '$currentPlan.key',
              planName: '$currentPlan.name',
              planType: '$currentPlan.planType'
            },
            userCount: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [
                  { $eq: ['$planStatus', 'active'] },
                  1,
                  0
                ]
              }
            },
            expiredUsers: {
              $sum: {
                $cond: [
                  { $lt: ['$planExpiryDate', new Date()] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { '_id.planType': 1, userCount: -1 }
        }
      ]);

      // Get payment statistics
      const paymentStats = await PlanPayment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      return {
        planDistribution: stats,
        paymentStatistics: paymentStats,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error getting plan statistics', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = PlanManagementService;
