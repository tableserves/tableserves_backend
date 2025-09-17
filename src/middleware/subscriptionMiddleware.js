const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const Upload = require('../models/Upload');
const { logger } = require('../utils/logger');
const { APIError } = require('./errorHandler');

// Define ErrorTypes locally since it's not exported from errorHandler
const ErrorTypes = {
  UnauthorizedError: (message) => new APIError(message, 401),
  ForbiddenError: (message) => new APIError(message, 403),
  SubscriptionError: (message) => new APIError(message, 402),
  QuotaExceededError: (message) => new APIError(message, 429)
};

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    features: {
      basicMenu: true,
      orderManagement: true,
      crudMenu: true
    },
    limits: {
      restaurants: 1,
      menuCategories: 3,
      menuItems: 10,
      storage: 50, // MB
      staff: 1
    }
  },
  premium: {
    name: 'Premium',
    features: {
      basicMenu: true,
      orderManagement: true,
      crudMenu: true,
      analytics: true,
      customization: true
    },
    limits: {
      restaurants: 5,
      menuCategories: null, // unlimited
      menuItems: null, // unlimited
      storage: 1000, // MB
      staff: 10
    }
  }
};

class SubscriptionMiddleware {
  // Get user subscription
  static async getUserSubscription(userId) {
    try {
      console.log('getUserSubscription called for userId:', userId);
      const subscription = await Subscription.findOne({
        userId,
        status: 'active'
      }).sort({ createdAt: -1 });

      console.log('Direct subscription found:', subscription ? 'Yes' : 'No');
      
      if (!subscription) {
        console.log('Checking for zone shop inheritance...');
        // For zone shop users, check if they inherit from zone admin
        const user = await User.findById(userId);
        console.log('User role:', user?.role);
        
        if (user && (user.role === 'zone_shop' || user.role === 'zone_vendor')) {
          console.log('Zone shop/vendor user detected - looking for inherited subscription');
          // Find the shop owned by this user
          const userShop = await ZoneShop.findOne({ ownerId: userId }).populate('zoneId');
          console.log('User shop found:', userShop ? 'Yes' : 'No');
          
          if (userShop && userShop.zoneId) {
            console.log('Zone admin ID:', userShop.zoneId.adminId);
            // Get zone admin's subscription
            const zoneAdminSubscription = await Subscription.findOne({
              userId: userShop.zoneId.adminId,
              status: 'active'
            }).sort({ createdAt: -1 });
            
            console.log('Zone admin subscription found:', zoneAdminSubscription ? 'Yes' : 'No');
            
            if (zoneAdminSubscription) {
              console.log('Returning inherited subscription from zone admin');
              // Return zone admin's subscription for this zone shop
              return {
                ...zoneAdminSubscription.toObject(),
                _inheritedFrom: 'zone_admin',
                _originalUserId: userShop.zoneId.adminId,
                _shopId: userShop._id,
                _zoneId: userShop.zoneId._id
              };
            }
          }
        }
        
        console.log('No subscription found - returning default free subscription');
        // Return default free subscription if none found
        return {
          planKey: 'free',
          status: 'active',
          userId,
          startDate: new Date(),
          endDate: null
        };
      }

      return subscription;
    } catch (error) {
      logger.error('Error fetching user subscription:', error);
      // Return free plan as fallback
      return {
        planKey: 'free',
        status: 'active',
        userId,
        startDate: new Date(),
        endDate: null
      };
    }
  }
  // Check if user has access to a specific feature
  static checkFeatureAccess(featureName) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          throw ErrorTypes.UnauthorizedError('Authentication required');
        }

        if (req.user.role === 'admin') {
          return next();
        }

        const subscription = await this.getUserSubscription(req.user.id);
        
        if (!subscription) {
          throw ErrorTypes.SubscriptionError('No active subscription found');
        }

        if (subscription.status !== 'active') {
          throw ErrorTypes.SubscriptionError('Subscription is not active');
        }

        if (subscription.endDate && new Date() > subscription.endDate) {
          throw ErrorTypes.SubscriptionError('Subscription has expired');
        }

        const planConfig = SUBSCRIPTION_PLANS[subscription.planKey];
        if (!planConfig) {
          throw ErrorTypes.SubscriptionError('Invalid subscription plan');
        }

        if (!planConfig.features[featureName]) {
          throw ErrorTypes.ForbiddenError(`Feature '${featureName}' is not available in your current plan`);
        }

        req.subscription = subscription;
        req.planConfig = planConfig;

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Validate resource creation against subscription limits
  static validateResourceCreation(resourceType) {
    return async (req, res, next) => {
      try {
        console.log('=== SUBSCRIPTION VALIDATION DEBUG ===');
        console.log('User Info:', {
          userId: req.user?.id,
          role: req.user?.role,
          shopId: req.user?.shopId
        });
        console.log('Resource Type:', resourceType);
        console.log('Request Params:', req.params);
        console.log('=== END SUBSCRIPTION VALIDATION DEBUG ===');
        
        if (req.user.role === 'admin') {
          console.log('Admin user - bypassing subscription validation');
          return next();
        }

        const subscription = await this.getUserSubscription(req.user.id);
        console.log('Subscription Debug - getUserSubscription result:', {
          subscription,
          userId: req.user.id,
          userRole: req.user.role
        });
        
        if (!subscription) {
          console.log('No subscription found - allowing free plan access');
          // Allow free plan access
          req.subscription = { planKey: 'free', status: 'active' };
          req.planConfig = SUBSCRIPTION_PLANS.free;
          return next();
        }

        const planConfig = SUBSCRIPTION_PLANS[subscription.planKey] || SUBSCRIPTION_PLANS.free;
        if (!planConfig) {
          // Fallback to free plan
          req.subscription = { planKey: 'free', status: 'active' };
          req.planConfig = SUBSCRIPTION_PLANS.free;
          return next();
        }

        const limit = planConfig.limits[resourceType];
        if (limit === undefined) {
          // No limit defined for this resource type
          return next();
        }

        if (limit === null) {
          // Null means unlimited
          return next();
        }

        // Get current count of resources for this user
        let currentCount;
        switch (resourceType) {
          case 'restaurants':
            currentCount = await Restaurant.countDocuments({ ownerId: req.user.id });
            break;
          case 'menuCategories':
            // Handle different user roles
            if (req.user.role === 'zone_shop' || req.user.role === 'zone_vendor') {
              // For zone shops, count categories by shopId
              // The shopId should be from the request params (ownerId)
              const shopId = req.params.ownerId;
              if (shopId) {
                currentCount = await MenuCategory.countDocuments({ shopId: shopId });
              } else {
                // Fallback: find user's shops and count their categories
                const userShops = await ZoneShop.find({ ownerId: req.user.id }).select('_id');
                const shopIds = userShops.map(shop => shop._id);
                currentCount = await MenuCategory.countDocuments({ shopId: { $in: shopIds } });
              }
            } else if (req.user.role === 'restaurant_owner') {
              // For restaurant owners, count categories by restaurantId
              const userRestaurants = await Restaurant.find({ ownerId: req.user.id }).select('_id');
              const restaurantIds = userRestaurants.map(restaurant => restaurant._id);
              currentCount = await MenuCategory.countDocuments({ restaurantId: { $in: restaurantIds } });
            } else if (req.user.role === 'zone_admin') {
              // For zone admins, count categories by zoneId
              const userZones = await Zone.find({ adminId: req.user.id }).select('_id');
              const zoneIds = userZones.map(zone => zone._id);
              currentCount = await MenuCategory.countDocuments({ zoneId: { $in: zoneIds } });
            } else {
              // Fallback: count by all possible owner types
              const restaurants = await Restaurant.find({ ownerId: req.user.id }).select('_id');
              const zones = await Zone.find({ adminId: req.user.id }).select('_id');
              const shops = await ZoneShop.find({ ownerId: req.user.id }).select('_id');
              
              const restaurantIds = restaurants.map(r => r._id);
              const zoneIds = zones.map(z => z._id);
              const shopIds = shops.map(s => s._id);
              
              currentCount = await MenuCategory.countDocuments({
                $or: [
                  { restaurantId: { $in: restaurantIds } },
                  { zoneId: { $in: zoneIds } },
                  { shopId: { $in: shopIds } }
                ]
              });
            }
            break;
          case 'menuItems':
            // Handle different user roles
            if (req.user.role === 'zone_shop' || req.user.role === 'zone_vendor') {
              // For zone shops, count items by shopId
              const userShops = await ZoneShop.find({ ownerId: req.user.id }).select('_id');
              const shopIds = userShops.map(shop => shop._id);
              currentCount = await MenuItem.countDocuments({ shopId: { $in: shopIds } });
            } else if (req.user.role === 'restaurant_owner') {
              // For restaurant owners, count items by restaurantId
              const userRestaurants = await Restaurant.find({ ownerId: req.user.id }).select('_id');
              const restaurantIds = userRestaurants.map(restaurant => restaurant._id);
              currentCount = await MenuItem.countDocuments({ restaurantId: { $in: restaurantIds } });
            } else if (req.user.role === 'zone_admin') {
              // For zone admins, count items by zoneId
              const userZones = await Zone.find({ adminId: req.user.id }).select('_id');
              const zoneIds = userZones.map(zone => zone._id);
              currentCount = await MenuItem.countDocuments({ zoneId: { $in: zoneIds } });
            } else {
              // Fallback: count by all possible owner types
              const restaurants = await Restaurant.find({ ownerId: req.user.id }).select('_id');
              const zones = await Zone.find({ adminId: req.user.id }).select('_id');
              const shops = await ZoneShop.find({ ownerId: req.user.id }).select('_id');
              
              const restaurantIds = restaurants.map(r => r._id);
              const zoneIds = zones.map(z => z._id);
              const shopIds = shops.map(s => s._id);
              
              currentCount = await MenuItem.countDocuments({
                $or: [
                  { restaurantId: { $in: restaurantIds } },
                  { zoneId: { $in: zoneIds } },
                  { shopId: { $in: shopIds } }
                ]
              });
            }
            break;
          case 'zones':
            currentCount = await Zone.countDocuments({ adminId: req.user.id });
            break;
          case 'tables':
            const restaurant = await Restaurant.findOne({ ownerId: req.user.id });
            currentCount = restaurant ? restaurant.tables.length : 0;
            break;
          default:
            return next();
        }

        if (currentCount >= limit) {
          throw ErrorTypes.QuotaExceededError(
            `You have reached the maximum limit of ${limit} ${resourceType} for your current plan. ` +
            'Please upgrade your plan to create more.'
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Check if user has reached their usage limit for a specific feature
  static checkUsageLimit(featureName) {
    return async (req, res, next) => {
      try {
        if (req.user.role === 'admin') {
          return next();
        }

        const subscription = await this.getUserSubscription(req.user.id);
        if (!subscription) {
          throw ErrorTypes.SubscriptionError('No active subscription found');
        }

        const planConfig = SUBSCRIPTION_PLANS[subscription.planKey];
        if (!planConfig) {
          throw ErrorTypes.SubscriptionError('Invalid subscription plan');
        }

        const limit = planConfig.limits[featureName];
        if (limit === undefined || limit === null) {
          // No limit defined for this feature
          return next();
        }

        // Get current usage
        let currentUsage;
        switch (featureName) {
          case 'storage':
            // Example: Get total storage used in MB
            currentUsage = await this.getStorageUsage(req.user.id);
            break;
          case 'staff':
            // Example: Get number of staff members
            currentUsage = await User.countDocuments({ 
              role: 'staff', 
              restaurantId: req.user.restaurantId 
            });
            break;
          default:
            return next();
        }

        if (currentUsage >= limit) {
          throw ErrorTypes.QuotaExceededError(
            `You have reached the maximum limit for ${featureName} in your current plan. ` +
            'Please upgrade your plan to increase your limits.'
          );
        }

        req.usage = { current: currentUsage, limit };
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Get image upload count
  static async getImageUploadCount(userId, planType) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return await Upload.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth },
    });
  }

  // Get storage usage in MB
  static async getStorageUsage(userId) {
    try {
      const uploads = await Upload.find({ userId });
      const totalBytes = uploads.reduce((sum, upload) => sum + (upload.fileSize || 0), 0);
      return Math.round(totalBytes / (1024 * 1024)); // Convert to MB
    } catch (error) {
      logger.error('Error calculating storage usage:', error);
      return 0;
    }
  }
}

module.exports = {
  SubscriptionMiddleware,
  validateResourceCreation: SubscriptionMiddleware.validateResourceCreation.bind(SubscriptionMiddleware),
  checkUsageLimit: SubscriptionMiddleware.checkUsageLimit.bind(SubscriptionMiddleware),
  checkFeatureAccess: SubscriptionMiddleware.checkFeatureAccess.bind(SubscriptionMiddleware)
};