const User = require('../models/User');
const Subscription = require('../models/Subscription');
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const {APIError} = require('../utils/apiError');
const logger = require('../utils/logger');

/**
 * Plan Validation Middleware
 * Enforces plan limits and feature access based on user's current plan
 */
class PlanValidationMiddleware {
  
  /**
   * Get user's current subscription with limits and features
   * For zone shop users, inherits limits from the parent zone
   */
  static async getUserPlan(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new APIError('User not found', 404);
      }

      // For zone shop/vendor users, get the zone's subscription instead of their own
      if (user.role === 'zone_shop' || user.role === 'zone_vendor') {
        console.log(`🔍 Zone shop/vendor user ${userId}, looking for parent zone subscription`);
        
        // Find the zone shop this user owns
        const zoneShop = await ZoneShop.findOne({ ownerId: userId }).populate('zoneId');
        if (zoneShop && zoneShop.zoneId) {
          console.log(`📊 Found zone shop ${zoneShop._id} for user ${userId}, zone: ${zoneShop.zoneId._id}`);
          
          // Get the zone admin's user account
          const zoneAdminUser = await User.findById(zoneShop.zoneId.adminId);
          if (zoneAdminUser) {
            console.log(`👤 Found zone admin ${zoneAdminUser._id} for zone ${zoneShop.zoneId._id}`);
            
            // Recursively get the zone admin's plan (but avoid infinite recursion)
            const zoneAdminPlan = await this.getUserPlan(zoneAdminUser._id);
            console.log(`📋 Zone admin plan:`, {
              planName: zoneAdminPlan.plan.planName,
              planKey: zoneAdminPlan.plan.planKey,
              limits: zoneAdminPlan.plan.limits
            });
            
            return zoneAdminPlan;
          }
        }
        
        console.log(`⚠️  Could not find parent zone for zone shop user ${userId}, falling back to user's own plan`);
      }

      // First try to get subscription through user.subscription reference
      let subscription = null;
      if (user.subscription) {
        subscription = await Subscription.findById(user.subscription);
      }
      
      // If no subscription found via user.subscription, try direct query for active subscriptions
      if (!subscription) {
        subscription = await Subscription.findOne({ 
          userId: userId, 
          status: { $in: ['active', 'trial'] }
        });
      }
      
      // If still no active subscription, try to find any subscription for this user
      if (!subscription) {
        subscription = await Subscription.findOne({ userId: userId })
          .sort({ createdAt: -1 }); // Get the latest subscription
      }

      // If no subscription found at all, return free plan defaults
      if (!subscription) {
        const businessType = user.businessType || 'restaurant';
        const freePlanData = {
          planKey: businessType === 'restaurant' ? 'restaurant_free' : 'zone_free',
          planType: businessType,
          planName: 'Free Starter',
          features: {
            crudMenu: true,
            qrGeneration: true,
            vendorManagement: businessType === 'zone',
            analytics: false,
            qrCustomization: false,
            modifiers: false,
            watermark: true,
            unlimited: false
          },
          limits: {
            maxTables: 1,
            maxShops: businessType === 'zone' ? 1 : 0,
            maxVendors: businessType === 'zone' ? 1 : 0,
            maxCategories: 1, // Changed from 3 to 1 for free plan
            maxMenuItems: 1,   // Changed from 5/10 to 1 for free plan
            maxUsers: 1,
            maxOrdersPerMonth: 50,
            maxStorageGB: 1
          }
        };
        
        console.log(`⚠️  No subscription found for user ${userId}, using free plan defaults:`, freePlanData);
        
        return {
          plan: freePlanData,
          status: 'free',
          isExpired: false,
          daysRemaining: null
        };
      }

      // Check if subscription is expired
      let isExpired = false;
      let daysRemaining = null;
      
      if (subscription.status === 'trial') {
        // For trial subscriptions, check trial end date
        isExpired = subscription.trialEndDate && new Date() > subscription.trialEndDate;
        daysRemaining = subscription.trialEndDate ? Math.ceil((subscription.trialEndDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
      } else {
        // For active subscriptions, check regular end date
        isExpired = subscription.endDate && new Date() > subscription.endDate;
        daysRemaining = subscription.endDate ? Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
      }
      
      console.log(`✅ Found subscription for user ${userId}:`, {
        planKey: subscription.planKey,
        planName: subscription.planName,
        planType: subscription.planType,
        status: subscription.status,
        isExpired,
        limits: subscription.limits
      });
      
      return {
        plan: subscription,
        status: isExpired ? 'expired' : subscription.status,
        isExpired: isExpired,
        daysRemaining: Math.max(0, daysRemaining || 0),
        expiryDate: subscription.status === 'trial' ? subscription.trialEndDate : subscription.endDate
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
        console.log(`🔍 CATEGORY LIMIT CHECK - User: ${req.user.id}, Role: ${req.user.role}, Params:`, req.params);
        
        if (req.user.role === 'admin') {
          console.log(`✅ Admin user ${req.user.id} bypassing category creation limit`);
          return next();
        }
        
        const userPlan = await this.getUserPlan(req.user.id);
        const { plan } = userPlan;

        console.log(`📊 Plan data for category check:`, {
          planName: plan.planName,
          planKey: plan.planKey,
          maxCategories: plan.limits.maxCategories,
          userStatus: userPlan.status
        });

        const maxCategories = plan.limits.maxCategories;
        
        if (maxCategories === null || maxCategories === -1) {
          console.log(`✅ Unlimited categories allowed for user ${req.user.id}`);
          return next(); // Unlimited
        }

        // Count current categories - FIXED LOGIC
        let currentCategoryCount = 0;
        const { ownerType, ownerId } = req.params;

        console.log(`🔍 Counting categories for ${ownerType} ${ownerId}`);

        // Always use the ownerType and ownerId from params for counting
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
            console.log(`📊 Shop ${ownerId} category count: ${currentCategoryCount}`);
            break;
          default:
            throw new APIError('Invalid owner type', 400);
        }

        console.log(`📊 LIMIT CHECK RESULT:`, {
          ownerType,
          ownerId,
          currentCategories: currentCategoryCount,
          maxCategories: maxCategories,
          canCreate: currentCategoryCount < maxCategories,
          userRole: req.user.role,
          planName: plan.planName
        });

        if (currentCategoryCount >= maxCategories) {
          const errorMsg = `Category creation limit reached. Your ${plan.planName} plan allows ${maxCategories} categor${maxCategories > 1 ? 'ies' : 'y'}. You currently have ${currentCategoryCount}. Please upgrade your plan to create more categories.`;
          console.log(`❌ BLOCKING CATEGORY CREATION: ${errorMsg}`);
          throw new APIError(errorMsg, 403);
        }

        console.log(`✅ ALLOWING CATEGORY CREATION for user ${req.user.id}`);
        req.userPlan = userPlan;
        req.currentUsage = { categories: currentCategoryCount };

        next();
      } catch (error) {
        console.error(`❌ Category creation limit check failed:`, error.message);
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
          console.log(`✅ Admin user ${req.user.id} bypassing menu item creation limit`);
          return next();
        }

        console.log(`🔍 Checking menu item creation limit for user ${req.user.id}`);
        
        const userPlan = await this.getUserPlan(req.user.id);
        const { plan } = userPlan;

        console.log(`📊 Plan data for menu item check:`, {
          planName: plan.planName,
          planKey: plan.planKey,
          maxMenuItems: plan.limits.maxMenuItems,
          userStatus: userPlan.status
        });

        const maxMenuItems = plan.limits.maxMenuItems;
        
        if (maxMenuItems === null || maxMenuItems === -1) {
          console.log(`✅ Unlimited menu items allowed for user ${req.user.id}`);
          return next(); // Unlimited
        }

        // Count current menu items in the category
        const { categoryId } = req.body;
        
        // For zone shop users, verify the category belongs to their shop and check against zone limits
        if (req.user.role === 'zone_shop' || req.user.role === 'zone_vendor') {
          // Find the zone shop this user owns
          const zoneShop = await ZoneShop.findOne({ ownerId: req.user.id });
          if (zoneShop) {
            // Verify the category belongs to this shop
            const category = await require('../models/MenuCategory').findById(categoryId);
            if (!category || category.shopId.toString() !== zoneShop._id.toString()) {
              throw new APIError('Category not found or does not belong to your shop', 403);
            }
            console.log(`🔍 Zone shop ${zoneShop._id} adding item to category ${categoryId}`);
          }
        }
        
        const currentItemCount = await MenuItem.countDocuments({ 
          categoryId: categoryId 
        });

        console.log(`📊 Current usage for category ${categoryId}:`, {
          currentMenuItems: currentItemCount,
          maxMenuItems: maxMenuItems,
          canCreate: currentItemCount < maxMenuItems
        });

        if (currentItemCount >= maxMenuItems) {
          const errorMsg = `Menu item creation limit reached. Your ${plan.planName} plan allows ${maxMenuItems} item${maxMenuItems > 1 ? 's' : ''} per category. Please upgrade your plan to add more items.`;
          console.log(`❌ ${errorMsg}`);
          throw new APIError(errorMsg, 403);
        }

        console.log(`✅ Menu item creation allowed for user ${req.user.id}`);
        req.userPlan = userPlan;
        req.currentUsage = { menuItems: currentItemCount };

        next();
      } catch (error) {
        console.error(`❌ Menu item creation limit check failed:`, error.message);
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
