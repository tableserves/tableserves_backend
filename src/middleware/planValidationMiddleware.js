const User = require('../models/User');
const Plan = require('../models/Plan');
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const APIError = require('../utils/apiError');
const logger = require('../utils/logger');

/**
 * Plan Validation Middleware
 * Enforces plan limits and feature access based on user's current plan
 */
class PlanValidationMiddleware {
  
  /**
   * Get user's current plan with limits and features
   */
  static async getUserPlan(userId) {
    try {
      const user = await User.findById(userId).populate('currentPlanId');
      
      if (!user) {
        throw new APIError('User not found', 404);
      }

      // Check if user has an active plan
      if (!user.currentPlanId || user.planStatus !== 'active' || user.isPlanExpired) {
        // Return free plan limits
        const freePlan = await Plan.findOne({ 
          key: 'free', 
          planType: user.businessType || 'restaurant',
          active: true 
        });
        
        return {
          plan: freePlan,
          status: 'free',
          isExpired: false,
          daysRemaining: null
        };
      }

      return {
        plan: user.currentPlanId,
        status: user.planStatus,
        isExpired: user.isPlanExpired,
        daysRemaining: user.planDaysRemaining,
        expiryDate: user.planExpiryDate
      };
    } catch (error) {
      logger.error('Error getting user plan:', error);
      throw error;
    }
  }

  /**
   * Check if user can create a menu based on plan limits
   */
  static checkMenuCreationLimit() {
    return async (req, res, next) => {
      try {
        if (req.user.role === 'admin') {
          return next(); // Admin bypass
        }

        const userPlan = await this.getUserPlan(req.user.id);
        const { plan } = userPlan;

        if (!plan) {
          throw new APIError('Unable to determine user plan', 500);
        }

        // Check menu creation limit
        const maxMenus = plan.limits.maxMenus;
        
        if (maxMenus === null) {
          // Unlimited menus
          return next();
        }

        // Count current menus for the user
        let currentMenuCount = 0;
        const { ownerType, ownerId } = req.params;

        switch (ownerType) {
          case 'restaurant':
            currentMenuCount = await MenuCategory.countDocuments({ 
              restaurantId: ownerId 
            });
            break;
          case 'zone':
            currentMenuCount = await MenuCategory.countDocuments({ 
              zoneId: ownerId 
            });
            break;
          case 'shop':
            currentMenuCount = await MenuCategory.countDocuments({ 
              shopId: ownerId 
            });
            break;
          default:
            throw new APIError('Invalid owner type', 400);
        }

        if (currentMenuCount >= maxMenus) {
          throw new APIError(
            `Menu creation limit reached. Your ${plan.name} plan allows ${maxMenus} menu${maxMenus > 1 ? 's' : ''}. Please upgrade your plan to create more menus.`,
            403
          );
        }

        // Add plan info to request for further use
        req.userPlan = userPlan;
        req.currentUsage = { menus: currentMenuCount };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user can create menu categories based on plan limits
   */
  static checkCategoryCreationLimit() {
    return async (req, res, next) => {
      try {
        if (req.user.role === 'admin') {
          return next();
        }

        const userPlan = await this.getUserPlan(req.user.id);
        const { plan } = userPlan;

        const maxCategories = plan.limits.maxCategories;
        
        if (maxCategories === null) {
          return next(); // Unlimited
        }

        // Count current categories
        const { ownerType, ownerId } = req.params;
        let currentCategoryCount = 0;

        switch (ownerType) {
          case 'restaurant':
            currentCategoryCount = await MenuCategory.countDocuments({ 
              restaurantId: ownerId 
            });
            break;
          case 'zone':
            currentCategoryCount = await MenuCategory.countDocuments({ 
              zoneId: ownerId 
            });
            break;
          case 'shop':
            currentCategoryCount = await MenuCategory.countDocuments({ 
              shopId: ownerId 
            });
            break;
        }

        if (currentCategoryCount >= maxCategories) {
          throw new APIError(
            `Category creation limit reached. Your ${plan.name} plan allows ${maxCategories} categor${maxCategories > 1 ? 'ies' : 'y'}. Please upgrade your plan to create more categories.`,
            403
          );
        }

        req.userPlan = userPlan;
        req.currentUsage = { categories: currentCategoryCount };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user can create menu items based on plan limits
   */
  static checkMenuItemCreationLimit() {
    return async (req, res, next) => {
      try {
        if (req.user.role === 'admin') {
          return next();
        }

        const userPlan = await this.getUserPlan(req.user.id);
        const { plan } = userPlan;

        const maxMenuItems = plan.limits.maxMenuItems;
        
        if (maxMenuItems === null) {
          return next(); // Unlimited
        }

        // Count current menu items in the category
        const { categoryId } = req.body;
        const currentItemCount = await MenuItem.countDocuments({ 
          categoryId: categoryId 
        });

        if (currentItemCount >= maxMenuItems) {
          throw new APIError(
            `Menu item creation limit reached. Your ${plan.name} plan allows ${maxMenuItems} item${maxMenuItems > 1 ? 's' : ''} per category. Please upgrade your plan to add more items.`,
            403
          );
        }

        req.userPlan = userPlan;
        req.currentUsage = { menuItems: currentItemCount };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user has access to a specific feature
   */
  static checkFeatureAccess(featureName) {
    return async (req, res, next) => {
      try {
        if (req.user.role === 'admin') {
          return next();
        }

        const userPlan = await this.getUserPlan(req.user.id);
        const { plan } = userPlan;

        if (!plan.features[featureName]) {
          throw new APIError(
            `This feature is not available in your ${plan.name} plan. Please upgrade to access ${featureName}.`,
            403
          );
        }

        req.userPlan = userPlan;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check plan expiry and warn user
   */
  static checkPlanExpiry() {
    return async (req, res, next) => {
      try {
        if (req.user.role === 'admin') {
          return next();
        }

        const userPlan = await this.getUserPlan(req.user.id);
        
        if (userPlan.isExpired) {
          // Plan has expired - downgrade to free plan
          const user = await User.findById(req.user.id);
          await user.expirePlan();
          
          throw new APIError(
            'Your plan has expired. You have been downgraded to the free plan. Please upgrade to continue using premium features.',
            402 // Payment Required
          );
        }

        // Warn if plan expires soon (within 3 days)
        if (userPlan.daysRemaining !== null && userPlan.daysRemaining <= 3) {
          res.set('X-Plan-Warning', `Your plan expires in ${userPlan.daysRemaining} day${userPlan.daysRemaining > 1 ? 's' : ''}`);
        }

        req.userPlan = userPlan;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Get plan usage summary for user
   */
  static async getPlanUsage(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new APIError('User not found', 404);
      }

      const userPlan = await this.getUserPlan(userId);
      const { plan } = userPlan;

      // Count current usage based on user's business type
      let usage = {};

      if (plan.planType === 'restaurant') {
        // Count restaurants owned by user
        const restaurants = await Restaurant.find({ ownerId: userId });
        const restaurantIds = restaurants.map(r => r._id);

        usage = {
          restaurants: restaurants.length,
          categories: await MenuCategory.countDocuments({ 
            restaurantId: { $in: restaurantIds } 
          }),
          menuItems: await MenuItem.countDocuments({ 
            restaurantId: { $in: restaurantIds } 
          })
        };
      } else if (plan.planType === 'zone') {
        // Count zones and shops owned by user
        const zones = await Zone.find({ adminId: userId });
        const zoneIds = zones.map(z => z._id);
        const shops = await ZoneShop.find({ ownerId: userId });
        const shopIds = shops.map(s => s._id);

        usage = {
          zones: zones.length,
          shops: shops.length,
          categories: await MenuCategory.countDocuments({ 
            $or: [
              { zoneId: { $in: zoneIds } },
              { shopId: { $in: shopIds } }
            ]
          }),
          menuItems: await MenuItem.countDocuments({ 
            $or: [
              { zoneId: { $in: zoneIds } },
              { shopId: { $in: shopIds } }
            ]
          })
        };
      }

      return {
        plan: plan,
        usage: usage,
        limits: plan.limits,
        features: plan.features,
        status: userPlan.status,
        expiryDate: userPlan.expiryDate,
        daysRemaining: userPlan.daysRemaining
      };
    } catch (error) {
      logger.error('Error getting plan usage:', error);
      throw error;
    }
  }
}

module.exports = PlanValidationMiddleware;
