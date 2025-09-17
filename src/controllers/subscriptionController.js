const { APIError } = require('../utils/apiError');
const { Subscription, User } = require('../models');
const SubscriptionService = require('../services/subscriptionService');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Get current user's subscription
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let subscription = null;

    // For restaurant owners, get subscription from their restaurant
    if (userRole === 'restaurant_owner') {
      const Restaurant = require('../models/Restaurant');
      const restaurant = await Restaurant.findOne({ ownerId: userId })
        .populate('subscriptionId');

      if (restaurant && restaurant.subscriptionId) {
        subscription = restaurant.subscriptionId;
        logger.info('Found subscription via restaurant for restaurant owner', {
          userId,
          restaurantId: restaurant._id,
          subscriptionId: subscription._id,
          planKey: subscription.planKey
        });
      } else if (restaurant && !restaurant.subscriptionId) {
        // Restaurant exists but has no subscription - create a free one
        logger.warn('Restaurant found without subscription, creating free subscription', {
          userId,
          restaurantId: restaurant._id
        });

        const Subscription = require('../models/Subscription');
        const freeSubscription = new Subscription({
          userId: userId,
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
            maxMenuItems: 2,
            maxUsers: 1,
            maxOrdersPerMonth: 50,
            maxStorageGB: 1
          },
          pricing: {
            amount: 0,
            currency: 'INR',
            interval: 'monthly',
            trialDays: 0
          },
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
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

        await freeSubscription.save();

        // Link subscription to restaurant
        restaurant.subscriptionId = freeSubscription._id;
        restaurant.subscriptionPlan = 'free';
        await restaurant.save();

        subscription = freeSubscription;

        logger.info('Created and linked free subscription to restaurant', {
          userId,
          restaurantId: restaurant._id,
          subscriptionId: freeSubscription._id,
          planKey: freeSubscription.planKey
        });
      }
    }
    // For zone admins, zone shops, and zone vendors
    else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(userRole)) {
      const Zone = require('../models/Zone');
      const ZoneShop = require('../models/ZoneShop');

      // For zone admins, get subscription from their zone
      if (userRole === 'zone_admin') {
        const zone = await Zone.findOne({ adminId: userId }).populate('subscriptionId');
        if (zone && zone.subscriptionId) {
          subscription = zone.subscriptionId;
          logger.info('Found subscription via zone for zone admin', {
            userId,
            zoneId: zone._id,
            subscriptionId: subscription._id,
            planKey: subscription.planKey
          });
        }
      }
      // For zone shops and vendors, inherit subscription from zone admin
      else if (userRole === 'zone_shop' || userRole === 'zone_vendor') {
        // Find the shop owned by this user
        const userShop = await ZoneShop.findOne({ ownerId: userId }).populate('zoneId');
        
        if (userShop && userShop.zoneId) {
          // Get zone admin's subscription
          const zoneAdminSubscription = await Zone.findById(userShop.zoneId)
            .populate('subscriptionId');
          
          if (zoneAdminSubscription && zoneAdminSubscription.subscriptionId) {
            subscription = zoneAdminSubscription.subscriptionId;
            // Add inheritance information
            subscription._inherited = {
              from: 'zone_admin',
              zoneId: userShop.zoneId._id,
              shopId: userShop._id,
              originalUserId: zoneAdminSubscription.adminId
            };
            
            logger.info('Found inherited subscription from zone admin for zone shop', {
              userId,
              shopId: userShop._id,
              zoneId: userShop.zoneId._id,
              zoneAdminId: zoneAdminSubscription.adminId,
              subscriptionId: subscription._id,
              planKey: subscription.planKey
            });
          }
        }
      }
    }
    // For other users, get subscription directly
    else {
      subscription = await Subscription.findOne({ userId }).populate('userId', 'email username role');
      if (subscription) {
        logger.info('Found direct subscription for user', {
          userId,
          subscriptionId: subscription._id,
          planKey: subscription.planKey
        });
      }
    }

    if (!subscription) {
      logger.warn('No subscription found for user', { userId, userRole });
      return res.status(404).json({
        success: false,
        message: 'No subscription found for user'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error getting current subscription:', error);
    throw new APIError('Failed to get subscription', 500);
  }
};

/**
 * Upgrade subscription plan
 */
const upgradePlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planKey, planType, paymentMethod } = req.body;

    const result = await SubscriptionService.upgradePlan(userId, planKey, planType, paymentMethod);

    res.status(200).json({
      success: true,
      message: 'Plan upgraded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error upgrading plan:', error);
    throw new APIError(error.message || 'Failed to upgrade plan', error.statusCode || 500);
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, userId });
    
    if (!subscription) {
      throw new APIError('Subscription not found', 404);
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    throw new APIError(error.message || 'Failed to cancel subscription', error.statusCode || 500);
  }
};

/**
 * Get subscription usage
 */
const getSubscriptionUsage = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, userId });
    
    if (!subscription) {
      throw new APIError('Subscription not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        usage: subscription.usage,
        limits: {
          maxTables: subscription.maxTables,
          maxShops: subscription.maxShops,
          maxVendors: subscription.maxVendors,
          maxCategories: subscription.maxCategories,
          maxMenuItems: subscription.maxMenuItems,
          maxUsers: subscription.maxUsers
        }
      }
    });
  } catch (error) {
    logger.error('Error getting subscription usage:', error);
    throw new APIError(error.message || 'Failed to get subscription usage', error.statusCode || 500);
  }
};

/**
 * Get available plans
 */
const getAvailablePlans = async (req, res) => {
  try {
    const { businessType } = req.query;
    
    const plans = SubscriptionService.getAvailablePlans(businessType);

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error getting available plans:', error);
    throw new APIError('Failed to get available plans', 500);
  }
};

/**
 * Check subscription limits
 */
const checkSubscriptionLimits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.query;

    // Get current usage counts
    const currentCounts = await SubscriptionService.getCurrentCounts(userId);

    // Check limits if feature is specified
    let limitCheck = null;
    if (feature) {
      limitCheck = await SubscriptionService.checkSubscriptionLimits(userId, feature, currentCounts);
    }

    res.status(200).json({
      success: true,
      data: {
        currentCounts,
        limitCheck
      }
    });
  } catch (error) {
    logger.error('Error checking subscription limits:', error);
    throw new APIError(error.message || 'Failed to check subscription limits', error.statusCode || 500);
  }
};

/**
 * Process subscription payment
 */
const processSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentData = req.body;

    const result = await SubscriptionService.processPayment(userId, paymentData);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error processing subscription payment:', error);
    throw new APIError(error.message || 'Failed to process payment', error.statusCode || 500);
  }
};

/**
 * Verify subscription payment
 */
const verifySubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const result = await SubscriptionService.verifyPayment(userId, paymentId);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error verifying subscription payment:', error);
    throw new APIError(error.message || 'Failed to verify payment', error.statusCode || 500);
  }
};

/**
 * Get subscription notifications
 */
const getSubscriptionNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      throw new APIError('Subscription not found', 404);
    }

    res.status(200).json({
      success: true,
      data: subscription.notifications || []
    });
  } catch (error) {
    logger.error('Error getting subscription notifications:', error);
    throw new APIError('Failed to get notifications', 500);
  }
};

/**
 * Mark notification as read
 */
const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      throw new APIError('Subscription not found', 404);
    }

    const notification = subscription.notifications.id(notificationId);
    if (notification) {
      notification.read = true;
      await subscription.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    throw new APIError('Failed to mark notification as read', 500);
  }
};

/**
 * Get subscription metrics
 */
const getSubscriptionMetrics = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      throw new APIError('Subscription not found', 404);
    }

    const metrics = {
      planType: subscription.planType,
      planKey: subscription.planKey,
      status: subscription.status,
      daysRemaining: Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
      usage: subscription.usage,
      utilizationPercentage: {
        tables: subscription.maxTables ? (subscription.usage.currentTables / subscription.maxTables * 100) : 0,
        shops: subscription.maxShops ? (subscription.usage.currentShops / subscription.maxShops * 100) : 0,
        menuItems: subscription.maxMenuItems ? (subscription.usage.currentMenuItems / subscription.maxMenuItems * 100) : 0
      }
    };

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting subscription metrics:', error);
    throw new APIError('Failed to get subscription metrics', 500);
  }
};

// Placeholder methods for admin routes - will be implemented in next chunk
const getAllSubscriptions = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getSubscriptionDetails = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const extendSubscription = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getSubscriptionAnalytics = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const generateSubscriptionReport = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getExpiringSubscriptions = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const sendSubscriptionReminder = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const updateSubscriptionStatus = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getRevenueAnalytics = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getPlanDistribution = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const createCustomSubscription = async (req, res) => {
  try {
    const {
      userId,
      planKey,
      planType,
      planName,
      features,
      limits,
      pricing,
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!userId || !planKey || !planType || !planName) {
      throw new APIError('Missing required fields: userId, planKey, planType, planName', 400);
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Check if user already has any subscription (not just active ones)
    const existingSubscription = await Subscription.findOne({ userId });
    
    if (existingSubscription) {
      // Delete the existing subscription completely to avoid duplicate key errors
      await Subscription.deleteOne({ _id: existingSubscription._id });
      
      logger.info('Deleted existing subscription for custom subscription creation', {
        userId,
        oldSubscriptionId: existingSubscription._id,
        oldPlanKey: existingSubscription.planKey,
        adminId: req.user.id
      });
    }

    // Create custom subscription
    const subscriptionData = {
      userId,
      planKey,
      planType,
      planName,
      features: {
        crudMenu: features?.crudMenu ?? true,
        qrGeneration: features?.qrGeneration ?? true,
        vendorManagement: features?.vendorManagement ?? (planType === 'zone'),
        analytics: features?.analytics ?? true,
        qrCustomization: features?.qrCustomization ?? true,
        modifiers: features?.modifiers ?? true,
        watermark: features?.watermark ?? false,
        unlimited: features?.unlimited ?? true,
        multiLocation: features?.multiLocation ?? false,
        advancedReporting: features?.advancedReporting ?? true,
        apiAccess: features?.apiAccess ?? false,
        whiteLabel: features?.whiteLabel ?? false,
        prioritySupport: features?.prioritySupport ?? true,
        customBranding: features?.customBranding ?? true
      },
      limits: {
        maxTables: limits?.maxTables !== undefined ? limits.maxTables : (planType === 'restaurant' ? 20 : 0),
        maxShops: limits?.maxShops !== undefined ? limits.maxShops : (planType === 'zone' ? 25 : 1),
        maxVendors: limits?.maxVendors !== undefined ? limits.maxVendors : (planType === 'zone' ? 25 : 1),
        maxCategories: limits?.maxCategories !== undefined ? limits.maxCategories : 50,
        maxMenuItems: limits?.maxMenuItems !== undefined ? limits.maxMenuItems : 500,
        maxUsers: limits?.maxUsers !== undefined ? limits.maxUsers : 10,
        maxOrdersPerMonth: limits?.maxOrdersPerMonth !== undefined ? limits.maxOrdersPerMonth : -1,
        maxStorageGB: limits?.maxStorageGB !== undefined ? limits.maxStorageGB : 10
      },
      pricing: {
        amount: pricing?.amount ?? 0,
        currency: pricing?.currency ?? 'INR',
        interval: pricing?.interval ?? 'monthly',
        trialDays: pricing?.trialDays ?? 0
      },
      status,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      usage: {
        currentTables: 0,
        currentShops: 0,
        currentVendors: 0,
        currentCategories: 0,
        currentMenuItems: 0,
        currentUsers: 1, // The owner
        currentOrdersThisMonth: 0,
        storageUsedGB: 0
      }
    };

    logger.info('Creating custom subscription with data:', {
      userId,
      planKey,
      planType,
      customLimits: subscriptionData.limits,
      adminId: req.user.id
    });

    const subscription = new Subscription(subscriptionData);
    await subscription.save();

    // Update user's subscription reference
    await User.findByIdAndUpdate(
      userId, 
      { subscription: subscription._id },
      { new: true }
    );

    logger.info('Custom subscription created successfully', {
      subscriptionId: subscription._id,
      userId,
      planKey,
      planType,
      actualLimits: subscription.limits,
      adminId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Custom subscription created successfully',
      data: subscription
    });
  } catch (error) {
    logger.error('Error creating custom subscription:', error);
    throw new APIError(error.message || 'Failed to create custom subscription', error.statusCode || 500);
  }
};

const getSubscriptionHistory = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const bulkUpdateSubscriptions = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const exportSubscriptionData = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getSubscriptionTrends = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getChurnAnalysis = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getSubscriptionForecast = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

module.exports = {
  getCurrentSubscription,
  upgradePlan,
  cancelSubscription,
  getSubscriptionUsage,
  getAvailablePlans,
  checkSubscriptionLimits,
  processSubscriptionPayment,
  verifySubscriptionPayment,
  getSubscriptionNotifications,
  markNotificationRead,
  getSubscriptionMetrics,
  getAllSubscriptions,
  getSubscriptionDetails,
  extendSubscription,
  getSubscriptionAnalytics,
  generateSubscriptionReport,
  getExpiringSubscriptions,
  sendSubscriptionReminder,
  updateSubscriptionStatus,
  getRevenueAnalytics,
  getPlanDistribution,
  createCustomSubscription,
  getSubscriptionHistory,
  bulkUpdateSubscriptions,
  exportSubscriptionData,
  getSubscriptionTrends,
  getChurnAnalysis,
  getSubscriptionForecast
};
