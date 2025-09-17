const { Subscription, User } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

/**
 * Subscription Service
 * Handles subscription creation, updates, and plan management
 */
class SubscriptionService {

  /**
   * Create free plan for new user based on business type
   * @param {String} userId - User ID
   * @param {String} businessType - Business type (restaurant or zone)
   * @returns {Object} - Created subscription
   */
  static async createFreePlan(userId, businessType) {
    try {
      // Check if user already has a subscription
      const existingSubscription = await Subscription.findOne({ userId });
      if (existingSubscription && existingSubscription.status === 'active') {
        logger.info('User already has active subscription', { userId, subscriptionId: existingSubscription._id });
        return existingSubscription;
      }

      // Define free plan features based on business type
      const freePlanData = this.getFreePlanData(businessType);
      
      const subscriptionData = {
        userId: userId,
        ...freePlanData,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        // Add required usage tracking
        usage: {
          currentTables: 0,
          currentShops: 0,
          currentVendors: 0,
          currentCategories: 0,
          currentMenuItems: 0,
          currentUsers: 1,
          ordersThisMonth: 0,
          storageUsedGB: 0,
          lastUsageUpdate: new Date()
        },
        // Add payment info
        payment: {
          paymentHistory: []
        },
        // Add notes array
        notes: []
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      // Link subscription to user
      await User.findByIdAndUpdate(userId, { subscription: subscription._id });

      loggerUtils.logBusiness('Free plan created', subscription._id, {
        userId,
        businessType,
        planKey: freePlanData.planKey
      });

      return subscription;

    } catch (error) {
      logger.error('Failed to create free plan:', error);
      throw new APIError('Failed to create subscription', 500);
    }
  }

  /**
   * Get free plan data based on business type
   * @param {String} businessType - Business type
   * @returns {Object} - Plan data
   */
  static getFreePlanData(businessType) {
    const basePlan = {
      pricing: {
        amount: 0,
        currency: 'INR',
        interval: 'monthly',
        trialDays: 0
      }
    };

    if (businessType === 'restaurant') {
      return {
        ...basePlan,
        planKey: 'restaurant_free',
        planType: 'restaurant',
        planName: 'Free Starter',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: false,
          analytics: false,
          qrCustomization: false,
          modifiers: false,
          watermark: true,
          unlimited: false,
          multiLocation: false,
          advancedReporting: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: false,
          customBranding: false
        },
        limits: {
          maxTables: 1,
          maxShops: 0, // Restaurants don't have shops
          maxVendors: 0, // Restaurants don't have vendors
          maxCategories: 1,
          maxMenuItems: 2, // 2 items per category
          maxUsers: 1,
          maxOrdersPerMonth: 50,
          maxStorageGB: 1
        }
      };
    } else if (businessType === 'zone') {
      return {
        ...basePlan,
        planKey: 'zone_free',
        planType: 'zone',
        planName: 'Free Starter',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: true,
          analytics: false,
          qrCustomization: false,
          modifiers: false,
          watermark: true,
          unlimited: false,
          multiLocation: false,
          advancedReporting: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: false,
          customBranding: false
        },
        limits: {
          maxTables: 1,
          maxShops: 1,
          maxVendors: 1,
          maxCategories: 1,
          maxMenuItems: 1, // 1 item per category
          maxUsers: 1,
          maxOrdersPerMonth: 50,
          maxStorageGB: 1
        }
      };
    } else {
      throw new APIError('Invalid business type', 400);
    }
  }

  /**
   * Upgrade subscription to premium plan
   * @param {String} userId - User ID
   * @param {String} planKey - Premium plan key
   * @returns {Object} - Updated subscription
   */
  static async upgradeToPremium(userId, planKey) {
    try {
      const user = await User.findById(userId).populate('subscription');
      if (!user) {
        throw new APIError('User not found', 404);
      }

      const subscription = user.subscription;
      if (!subscription) {
        throw new APIError('No subscription found for user', 404);
      }

      // Get premium plan data
      const premiumPlanData = this.getPremiumPlanData(planKey);
      
      // Update subscription
      Object.assign(subscription, {
        ...premiumPlanData,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      });

      await subscription.save();

      loggerUtils.logBusiness('Subscription upgraded to premium', subscription._id, {
        userId,
        planKey,
        oldPlan: subscription.planKey
      });

      return subscription;

    } catch (error) {
      logger.error('Failed to upgrade subscription:', error);
      throw error;
    }
  }

  /**
   * Upgrade subscription plan (general method)
   * @param {String} userId - User ID
   * @param {String} planKey - Plan key to upgrade to
   * @param {String} planType - Plan type (restaurant/zone)
   * @param {String} paymentMethod - Payment method used
   * @returns {Object} - Updated subscription
   */
  static async upgradePlan(userId, planKey, planType, paymentMethod = 'stripe') {
    try {
      const user = await User.findById(userId).populate('subscription');
      if (!user) {
        throw new APIError('User not found', 404);
      }

      // Map frontend plan keys to backend plan keys
      const mappedPlanKey = this.mapPlanKey(planKey, planType);

      let subscription = user.subscription;
      if (!subscription) {
        // Create new subscription if user doesn't have one
        subscription = new Subscription({
          userId,
          planKey: 'free_plan',
          planType: planType,
          planName: 'FREE Plan',
          status: 'active',
          startDate: new Date(),
          usage: {
            currentTables: 0,
            currentShops: 0,
            currentVendors: 0,
            currentCategories: 0,
            currentMenuItems: 0,
            currentUsers: 1,
            ordersThisMonth: 0,
            storageUsedGB: 0,
            lastUsageUpdate: new Date()
          },
          payment: {
            paymentHistory: []
          },
          notes: []
        });
        await subscription.save();
        
        // Link to user
        user.subscription = subscription._id;
        await user.save();
      }

      const oldPlanKey = subscription.planKey;

      // Determine if this is a premium upgrade or standard plan change
      const isPremiumPlan = mappedPlanKey.includes('premium') || mappedPlanKey.includes('enterprise');
      
      let planData;
      if (isPremiumPlan) {
        planData = this.getPremiumPlanData(mappedPlanKey);
      } else {
        // For standard plans, get plan data based on type
        planData = this.getStandardPlanData(mappedPlanKey, planType);
      }
      
      // Update subscription with new plan data
      Object.assign(subscription, {
        ...planData,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        updatedAt: new Date()
      });

      // Add payment record if payment method provided
      if (paymentMethod && subscription.payment) {
        subscription.payment.paymentHistory.push({
          amount: planData.pricing?.amount || 0,
          currency: planData.pricing?.currency || 'USD',
          method: paymentMethod,
          status: 'completed',
          transactionId: `upgrade_${Date.now()}`,
          date: new Date()
        });
      }

      await subscription.save();

      loggerUtils.logBusiness('Subscription plan upgraded', subscription._id, {
        userId,
        oldPlanKey,
        newPlanKey: mappedPlanKey,
        originalPlanKey: planKey,
        planType,
        paymentMethod
      });

      return subscription;

    } catch (error) {
      logger.error('Failed to upgrade subscription plan:', error);
      throw error;
    }
  }

  /**
   * Map frontend plan keys to backend plan keys
   * @param {String} planKey - Frontend plan key
   * @param {String} planType - Plan type (restaurant/zone)
   * @returns {String} - Mapped backend plan key
   */
  static mapPlanKey(planKey, planType) {
    // If it's already a backend plan key, return as is
    const backendPlanKeys = [
      'free_plan',
      'restaurant_free', 'restaurant_basic', 'restaurant_advanced', 'restaurant_premium',
      'restaurant_starter', 'restaurant_professional', 'restaurant_enterprise', // Legacy
      'zone_free', 'zone_basic', 'zone_advanced', 'zone_premium',
      'zone_professional', 'zone_enterprise' // Legacy
    ];

    if (backendPlanKeys.includes(planKey)) {
      return planKey;
    }

    // Map frontend keys to backend keys
    const planMapping = {
      restaurant: {
        'free': 'free_plan',
        'basic': 'restaurant_starter',
        'advanced': 'restaurant_professional',
        'premium': 'restaurant_enterprise',
        'enterprise': 'restaurant_enterprise'
      },
      zone: {
        'free': 'free_plan',
        'basic': 'zone_basic',
        'advanced': 'zone_professional',
        'premium': 'zone_enterprise',
        'enterprise': 'zone_enterprise'
      }
    };

    const mappedKey = planMapping[planType]?.[planKey];
    if (!mappedKey) {
      throw new APIError(`Invalid plan key '${planKey}' for plan type '${planType}'`, 400);
    }

    return mappedKey;
  }

  /**
   * Get premium plan data
   * @param {String} planKey - Plan key
   * @returns {Object} - Premium plan data
   */
  static getPremiumPlanData(planKey) {
    const premiumPlans = {
      'restaurant_premium': {
        planKey: 'restaurant_premium',
        planType: 'restaurant',
        planName: 'Restaurant Premium',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: false,
          analytics: true,
          qrCustomization: true,
          modifiers: true,
          watermark: false,
          unlimited: true,
          multiLocation: true,
          advancedReporting: true,
          apiAccess: true,
          whiteLabel: false,
          prioritySupport: true,
          customBranding: true
        },
        limits: {
          maxTables: null,
          maxShops: 0,
          maxVendors: 0,
          maxCategories: null,
          maxMenuItems: null,
          maxUsers: 10,
          maxOrdersPerMonth: null,
          maxStorageGB: 50
        },
        pricing: {
          amount: 29.99,
          currency: 'USD',
          interval: 'monthly',
          trialDays: 0
        }
      },
      'restaurant_enterprise': {
        planKey: 'restaurant_enterprise',
        planType: 'restaurant',
        planName: 'Restaurant Enterprise',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: false,
          analytics: true,
          qrCustomization: true,
          modifiers: true,
          watermark: false,
          unlimited: true,
          multiLocation: true,
          advancedReporting: true,
          apiAccess: true,
          whiteLabel: true,
          prioritySupport: true,
          customBranding: true
        },
        limits: {
          maxTables: null,
          maxShops: 1,
          maxVendors: 1,
          maxCategories: null,
          maxMenuItems: null,
          maxUsers: 25,
          maxOrdersPerMonth: null,
          maxStorageGB: 100
        },
        pricing: {
          amount: 49.99,
          currency: 'USD',
          interval: 'monthly',
          trialDays: 0
        }
      },
      'zone_premium': {
        planKey: 'zone_premium',
        planType: 'zone',
        planName: 'Zone Premium',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: true,
          analytics: true,
          qrCustomization: true,
          modifiers: true,
          watermark: false,
          unlimited: true,
          multiLocation: true,
          advancedReporting: true,
          apiAccess: true,
          whiteLabel: true,
          prioritySupport: true,
          customBranding: true
        },
        limits: {
          maxTables: 0,
          maxShops: null,
          maxVendors: null,
          maxCategories: null,
          maxMenuItems: null,
          maxUsers: 50,
          maxOrdersPerMonth: null,
          maxStorageGB: 100
        },
        pricing: {
          amount: 49.99,
          currency: 'USD',
          interval: 'monthly',
          trialDays: 0
        }
      },
      'zone_enterprise': {
        planKey: 'zone_enterprise',
        planType: 'zone',
        planName: 'Zone Enterprise',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: true,
          analytics: true,
          qrCustomization: true,
          modifiers: true,
          watermark: false,
          unlimited: true,
          multiLocation: true,
          advancedReporting: true,
          apiAccess: true,
          whiteLabel: true,
          prioritySupport: true,
          customBranding: true
        },
        limits: {
          maxTables: null,
          maxShops: null,
          maxVendors: null,
          maxCategories: null,
          maxMenuItems: null,
          maxUsers: 100,
          maxOrdersPerMonth: null,
          maxStorageGB: 200
        },
        pricing: {
          amount: 99.99,
          currency: 'USD',
          interval: 'monthly',
          trialDays: 0
        }
      }
    };

    const planData = premiumPlans[planKey];
    if (!planData) {
      throw new APIError('Invalid premium plan key', 400);
    }

    return planData;
  }

  /**
   * Get free plan data based on business type
   * @param {String} businessType - Business type (restaurant or zone)
   * @returns {Object} - Free plan data
   */
  static getFreePlanData(businessType) {
    const basePlan = {
      planKey: 'free_plan',
      planName: 'FREE Plan',
      pricing: {
        amount: 0,
        currency: 'USD',
        interval: 'monthly',
        trialDays: 0
      }
    };

    if (businessType === 'restaurant') {
      return {
        ...basePlan,
        planType: 'restaurant',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: false,
          analytics: false,
          qrCustomization: false,
          modifiers: false,
          watermark: true,
          unlimited: false
        },
        limits: {
          maxTables: 1,
          maxShops: 1,
          maxVendors: 1,
          maxCategories: 1,
          maxMenuItems: 2,
          maxUsers: 1,
          maxOrdersPerMonth: 50,
          maxStorageGB: 1
        }
      };
    } else if (businessType === 'zone') {
      return {
        ...basePlan,
        planType: 'zone',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: true,
          analytics: false,
          qrCustomization: false,
          modifiers: false,
          watermark: true,
          unlimited: false
        },
        limits: {
          maxTables: 1,
          maxShops: 1,
          maxVendors: 1,
          maxCategories: 1,
          maxMenuItems: 1,
          maxUsers: 1,
          maxOrdersPerMonth: 50,
          maxStorageGB: 1
        }
      };
    } else {
      throw new APIError('Invalid business type', 400);
    }
  }

  /**
   * Get standard plan data for non-premium plans
   * @param {String} planKey - Plan key
   * @param {String} planType - Plan type (restaurant/zone)
   * @returns {Object} - Standard plan data
   */
  static getStandardPlanData(planKey, planType) {
    const standardPlans = {
      // Restaurant plans
      'restaurant_free': {
        planKey: 'restaurant_free',
        planType: 'restaurant',
        planName: 'Free Starter',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: false,
          analytics: false,
          qrCustomization: false,
          modifiers: false,
          watermark: true,
          unlimited: false,
          multiLocation: false,
          advancedReporting: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: false,
          customBranding: false
        },
        limits: {
          maxTables: 1,
          maxShops: 0,
          maxVendors: 0,
          maxCategories: 1,
          maxMenuItems: 2, // 2 items per category
          maxUsers: 1,
          maxOrdersPerMonth: 50,
          maxStorageGB: 1
        },
        pricing: {
          amount: 0,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 0
        }
      },

      'restaurant_basic': {
        planKey: 'restaurant_basic',
        planType: 'restaurant',
        planName: 'Basic',
        features: {
          crudMenu: true,
          qrGeneration: true,
          qrCustomization: true,
          vendorManagement: false,
          analytics: false,
          modifiers: false,
          watermark: false,
          unlimited: false,
          multiLocation: false,
          advancedReporting: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: false,
          customBranding: false
        },
        limits: {
          maxTables: 5,
          maxShops: 0,
          maxVendors: 0,
          maxCategories: 8,
          maxMenuItems: 80, // 10 items per category (8 × 10)
          maxUsers: 2,
          maxOrdersPerMonth: 1000,
          maxStorageGB: 5
        },
        pricing: {
          amount: 299,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 7
        }
      },

      'restaurant_advanced': {
        planKey: 'restaurant_advanced',
        planType: 'restaurant',
        planName: 'Advanced',
        features: {
          crudMenu: true,
          qrGeneration: true,
          qrCustomization: true,
          vendorManagement: false,
          analytics: true,
          advancedReporting: true,
          modifiers: true,
          watermark: false,
          unlimited: false,
          multiLocation: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: true,
          customBranding: false
        },
        limits: {
          maxTables: 8,
          maxShops: 0,
          maxVendors: 0,
          maxCategories: 15,
          maxMenuItems: 300, // 20 items per category (15 × 20)
          maxUsers: 3,
          maxOrdersPerMonth: 2000,
          maxStorageGB: 10
        },
        pricing: {
          amount: 1299,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 14
        }
      },

      // Zone plans
      'zone_free': {
        planKey: 'zone_free',
        planType: 'zone',
        planName: 'Free Starter',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: true,
          analytics: false,
          qrCustomization: false,
          modifiers: false,
          watermark: true,
          unlimited: false,
          multiLocation: false,
          advancedReporting: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: false,
          customBranding: false
        },
        limits: {
          maxTables: 1,
          maxShops: 1,
          maxVendors: 1,
          maxCategories: 1,
          maxMenuItems: 1, // 1 item per category
          maxUsers: 1,
          maxOrdersPerMonth: 50,
          maxStorageGB: 1
        },
        pricing: {
          amount: 0,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 0
        }
      },

      'zone_basic': {
        planKey: 'zone_basic',
        planType: 'zone',
        planName: 'Basic',
        features: {
          crudMenu: true,
          qrGeneration: true,
          vendorManagement: true,
          analytics: false,
          qrCustomization: false,
          modifiers: false,
          watermark: false,
          unlimited: false,
          multiLocation: false,
          advancedReporting: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: false,
          customBranding: false
        },
        limits: {
          maxTables: 5,
          maxShops: 5,
          maxVendors: 5,
          maxCategories: 8,
          maxMenuItems: 80, // 10 items per category (8 × 10)
          maxUsers: 3,
          maxOrdersPerMonth: 1000,
          maxStorageGB: 5
        },
        pricing: {
          amount: 999,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 7
        }
      },

      'zone_advanced': {
        planKey: 'zone_advanced',
        planType: 'zone',
        planName: 'Advanced',
        features: {
          crudMenu: true,
          qrGeneration: true,
          qrCustomization: true,
          vendorManagement: true,
          analytics: true,
          advancedReporting: true,
          modifiers: true,
          watermark: false,
          unlimited: false,
          multiLocation: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: true,
          customBranding: false
        },
        limits: {
          maxTables: 8,
          maxShops: 8,
          maxVendors: 8,
          maxCategories: 15,
          maxMenuItems: 300, // 20 items per category (15 × 20)
          maxUsers: 5,
          maxOrdersPerMonth: 2000,
          maxStorageGB: 10
        },
        pricing: {
          amount: 1999,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 14
        }
      },

      // Legacy plan mappings for backward compatibility
      'restaurant_starter': {
        planKey: 'restaurant_basic', // Map to new basic plan
        planType: 'restaurant',
        planName: 'Basic',
        features: {
          crudMenu: true,
          qrGeneration: true,
          qrCustomization: true,
          vendorManagement: false,
          analytics: false,
          modifiers: false,
          watermark: false,
          unlimited: false,
          multiLocation: false,
          advancedReporting: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: false,
          customBranding: false
        },
        limits: {
          maxTables: 5,
          maxShops: 0,
          maxVendors: 0,
          maxCategories: 8,
          maxMenuItems: 80,
          maxUsers: 2,
          maxOrdersPerMonth: 1000,
          maxStorageGB: 5
        },
        pricing: {
          amount: 299,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 7
        }
      },

      'restaurant_professional': {
        planKey: 'restaurant_advanced', // Map to new advanced plan
        planType: 'restaurant',
        planName: 'Advanced',
        features: {
          crudMenu: true,
          qrGeneration: true,
          qrCustomization: true,
          vendorManagement: false,
          analytics: true,
          advancedReporting: true,
          modifiers: true,
          watermark: false,
          unlimited: false,
          multiLocation: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: true,
          customBranding: false
        },
        limits: {
          maxTables: 8,
          maxShops: 0,
          maxVendors: 0,
          maxCategories: 15,
          maxMenuItems: 300,
          maxUsers: 3,
          maxOrdersPerMonth: 2000,
          maxStorageGB: 10
        },
        pricing: {
          amount: 1299,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 14
        }
      },

      'zone_professional': {
        planKey: 'zone_advanced', // Map to new advanced plan
        planType: 'zone',
        planName: 'Advanced',
        features: {
          crudMenu: true,
          qrGeneration: true,
          qrCustomization: true,
          vendorManagement: true,
          analytics: true,
          advancedReporting: true,
          modifiers: true,
          watermark: false,
          unlimited: false,
          multiLocation: false,
          apiAccess: false,
          whiteLabel: false,
          prioritySupport: true,
          customBranding: false
        },
        limits: {
          maxTables: 8,
          maxShops: 8,
          maxVendors: 8,
          maxCategories: 15,
          maxMenuItems: 300,
          maxUsers: 5,
          maxOrdersPerMonth: 2000,
          maxStorageGB: 10
        },
        pricing: {
          amount: 1999,
          currency: 'INR',
          interval: 'monthly',
          trialDays: 14
        }
      }
    };

    const planData = standardPlans[planKey];
    if (!planData) {
      throw new APIError(`Invalid plan key: ${planKey}`, 400);
    }

    // Verify plan type matches
    if (planData.planType !== planType) {
      throw new APIError(`Plan ${planKey} is not valid for ${planType} business type`, 400);
    }

    return planData;
  }

  /**
   * Get current usage counts for a user
   * @param {String} userId - User ID
   * @returns {Object} - Current usage counts
   */
  static async getCurrentCounts(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          tables: 0,
          categories: 0,
          menuItems: 0,
          shops: 0,
          vendors: 0,
          ordersThisMonth: 0
        };
      }

      // Get counts based on user role and context
      let counts = {
        tables: 0,
        categories: 0,
        menuItems: 0,
        shops: 0,
        vendors: 0,
        ordersThisMonth: 0
      };

      if (user.role === 'restaurant_owner' && user.restaurantId) {
        // Count restaurant-specific items
        const Restaurant = require('../models/Restaurant');
        const MenuCategory = require('../models/MenuCategory');
        const MenuItem = require('../models/MenuItem');
        
        const restaurant = await Restaurant.findById(user.restaurantId);

        if (restaurant) {
          counts.tables = restaurant.tables ? restaurant.tables.length : 0;
          
          // Count menu categories for this restaurant
          counts.categories = await MenuCategory.countDocuments({ 
            restaurantId: user.restaurantId 
          });
          
          // Count menu items for this restaurant
          counts.menuItems = await MenuItem.countDocuments({ 
            restaurantId: user.restaurantId 
          });
        }
      } else if (user.role === 'zone_admin' && user.zoneId) {
        // Count zone-specific items
        const Zone = require('../models/Zone');
        const ZoneShop = require('../models/ZoneShop');
        const MenuCategory = require('../models/MenuCategory');
        const MenuItem = require('../models/MenuItem');
        
        const zone = await Zone.findById(user.zoneId);

        if (zone) {
          counts.tables = zone.tables ? zone.tables.length : 0;
          counts.vendors = zone.vendors ? zone.vendors.length : 0;
          
          // Count shops for this zone
          counts.shops = await ZoneShop.countDocuments({ 
            zoneId: user.zoneId 
          });
          
          // Count menu categories for this zone
          counts.categories = await MenuCategory.countDocuments({ 
            zoneId: user.zoneId 
          });
          
          // Count menu items for this zone
          counts.menuItems = await MenuItem.countDocuments({ 
            zoneId: user.zoneId 
          });
        }
      } else if (user.role === 'zone_shop' && user.zoneShopId) {
        // Count zone shop-specific items
        const ZoneShop = require('../models/ZoneShop');
        const MenuCategory = require('../models/MenuCategory');
        const MenuItem = require('../models/MenuItem');
        
        const shop = await ZoneShop.findById(user.zoneShopId);

        if (shop) {
          // Count menu categories for this shop
          counts.categories = await MenuCategory.countDocuments({ 
            shopId: user.zoneShopId 
          });
          
          // Count menu items for this shop
          counts.menuItems = await MenuItem.countDocuments({ 
            shopId: user.zoneShopId 
          });
        }
      }

      return counts;
    } catch (error) {
      logger.error('Failed to get current counts:', error);
      return {
        tables: 0,
        categories: 0,
        menuItems: 0,
        shops: 0,
        vendors: 0,
        ordersThisMonth: 0
      };
    }
  }

  /**
   * Check if user can perform action based on subscription limits
   * @param {String} userId - User ID
   * @param {String} action - Action to check
   * @param {Object} currentCounts - Current usage counts
   * @returns {Object} - Permission result
   */
  static async checkSubscriptionLimits(userId, action, currentCounts = null) {
    try {
      const user = await User.findById(userId).populate('subscription');
      if (!user || !user.subscription) {
        return { allowed: false, reason: 'No subscription found' };
      }

      const subscription = user.subscription;
      const limits = subscription.limits;

      // Get current counts if not provided
      if (!currentCounts) {
        currentCounts = await this.getCurrentCounts(userId);
      }

      // Check specific action limits
      switch (action) {
        case 'create_category':
          if (limits.maxCategories && currentCounts.categories >= limits.maxCategories) {
            return { allowed: false, reason: `Category limit reached (${limits.maxCategories})` };
          }
          break;
        case 'create_menu_item':
          if (limits.maxMenuItems && currentCounts.menuItems >= limits.maxMenuItems) {
            return { allowed: false, reason: `Menu item limit reached (${limits.maxMenuItems})` };
          }
          break;
        case 'create_table':
          if (limits.maxTables && currentCounts.tables >= limits.maxTables) {
            return { allowed: false, reason: `Table limit reached (${limits.maxTables})` };
          }
          break;
        case 'create_shop':
          if (limits.maxShops && currentCounts.shops >= limits.maxShops) {
            return { allowed: false, reason: `Shop limit reached (${limits.maxShops})` };
          }
          break;
        case 'create_order':
          if (limits.maxOrdersPerMonth && currentCounts.ordersThisMonth >= limits.maxOrdersPerMonth) {
            return { allowed: false, reason: `Monthly order limit reached (${limits.maxOrdersPerMonth})` };
          }
          break;
        default:
          return { allowed: true };
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Failed to check subscription limits:', error);
      return { allowed: false, reason: 'Error checking subscription limits' };
    }
  }
}

module.exports = SubscriptionService;