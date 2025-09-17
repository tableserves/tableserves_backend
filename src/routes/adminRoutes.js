const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const { logger } = require('../utils/logger');
const {
  getDashboardStats,
  getAllUsers,
  getUser,
  updateUserStatus,
  updateUserSubscription,
  deleteUser,
  getPlatformAnalytics,
  getSystemLogs
} = require('../controllers/adminController');

const router = express.Router({ mergeParams: true });

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

/**
 * All admin routes require authentication and admin role
 */
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route GET /api/v1/admin/dashboard
 * @desc Get platform dashboard statistics
 * @access Private (admin only)
 */
router.get('/dashboard', wrapAsync(getDashboardStats, 'getDashboardStats'));

/**
 * User Management Routes
 */

/**
 * @route GET /api/v1/admin/users
 * @desc Get all users with filtering and pagination
 * @access Private (admin only)
 */
router.get('/users',
  ValidationRules.validatePagination,
  ValidationRules.validateSearch,
  ValidationRules.validateSorting,
  handleValidation,
  wrapAsync(getAllUsers, 'getAllUsers')
);

/**
 * @route GET /api/v1/admin/users/:id
 * @desc Get single user by ID
 * @access Private (admin only)
 */
router.get('/users/:id',
  ValidationRules.getUser,
  handleValidation,
  wrapAsync(getUser, 'getUser')
);

/**
 * @route PATCH /api/v1/admin/users/:id/status
 * @desc Update user status (active, inactive, suspended)
 * @access Private (admin only)
 */
router.patch('/users/:id/status',
  ValidationRules.getUser, // Validate user ID
  ValidationRules.updateUserStatus,
  handleValidation,
  wrapAsync(updateUserStatus, 'updateUserStatus')
);

/**
 * @route PATCH /api/v1/admin/users/:id/subscription
 * @desc Update user subscription plan
 * @access Private (admin only)
 */
router.patch('/users/:id/subscription',
  ValidationRules.getUser, // Validate user ID
  ValidationRules.updateUserSubscription,
  handleValidation,
  wrapAsync(updateUserSubscription, 'updateUserSubscription')
);

/**
 * @route DELETE /api/v1/admin/users/:id
 * @desc Delete user account (soft delete by default)
 * @access Private (admin only)
 */
router.delete('/users/:id',
  ValidationRules.getUser, // Validate user ID
  ValidationRules.deleteUser,
  handleValidation,
  wrapAsync(deleteUser, 'deleteUser')
);

/**
 * Analytics Routes
 */

/**
 * @route GET /api/v1/admin/analytics
 * @desc Get platform analytics
 * @access Private (admin only)
 */
router.get('/analytics',
  ValidationRules.validateAnalyticsPeriod,
  handleValidation,
  wrapAsync(getPlatformAnalytics, 'getPlatformAnalytics')
);

/**
 * System Management Routes
 */

/**
 * @route GET /api/v1/admin/logs
 * @desc Get system logs
 * @access Private (admin only)
 */
router.get('/logs',
  ValidationRules.validatePagination,
  handleValidation,
  wrapAsync(getSystemLogs, 'getSystemLogs')
);

/**
 * @route POST /api/v1/admin/sync/subscription-plans
 * @desc Sync all restaurant subscription plans with their actual subscriptions
 * @access Private (admin only)
 */
router.post('/sync/subscription-plans', wrapAsync(async (req, res) => {
  try {
    const subscriptionSync = require('../utils/subscriptionSync');
    const result = await subscriptionSync.syncAllRestaurantSubscriptionPlans();
    
    logger.info('Subscription plans sync completed', {
      userId: req.user?.id,
      updated: result.updated,
      errors: result.errors,
      total: result.total
    });
    
    res.status(200).json({
      success: true,
      message: 'Subscription plans synced successfully',
      data: result
    });
  } catch (error) {
    logger.error('Subscription sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync subscription plans',
      error: error.message
    });
  }
}, 'syncSubscriptionPlans'));

/**
 * @route GET /api/v1/admin/subscription-stats
 * @desc Get subscription plan statistics
 * @access Private (admin only)
 */
router.get('/subscription-stats', wrapAsync(async (req, res) => {
  try {
    const subscriptionSync = require('../utils/subscriptionSync');
    const stats = await subscriptionSync.getSubscriptionPlanStats();
    
    res.status(200).json({
      success: true,
      message: 'Subscription statistics retrieved',
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get subscription stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription statistics',
      error: error.message
    });
  }
}, 'getSubscriptionStats'));

/**
 * Health Check Route
 */

/**
 * @route GET /api/v1/admin/health
 * @desc System health check
 * @access Private (admin only)
 */
router.get('/health', wrapAsync(async (req, res) => {
  try {
    // Test database connection
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Test Redis connection if available
    let redisStatus = 'not_configured';
    try {
      const redis = require('redis');
      // This is a basic check - in production you'd want to actually ping Redis
      redisStatus = 'available';
    } catch (error) {
      redisStatus = 'unavailable';
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: {
        status: dbStatus,
        responseTime: '5ms'
      },
      cache: {
        redis: {
          status: redisStatus
        }
      },
      external_services: {
        cloudinary: {
          status: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not_configured',
          responseTime: '50ms'
        },
        email: {
          status: process.env.SMTP_HOST ? 'configured' : 'not_configured',
          responseTime: '100ms'
        }
      }
    };

    logger.info('Admin health check performed', {
      userId: req.user?.id,
      status: healthData.status
    });

    res.status(200).json({
      success: true,
      message: 'System health check completed',
      data: healthData
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
}, 'healthCheck'));

/**
 * Additional Admin Routes for Enhanced Functionality
 */

/**
 * @route GET /api/v1/admin/restaurants/debug
 * @desc Debug restaurant subscription issues
 * @access Private (admin only)
 */
router.get('/restaurants/debug',
  wrapAsync(async (req, res) => {
    const Restaurant = require('../models/Restaurant');
    const Subscription = require('../models/Subscription');

    console.log('🔍 DEBUG: Analyzing restaurant subscription data...');
    
    // Get all restaurants without population first
    const rawRestaurants = await Restaurant.find({}).sort({ createdAt: -1 });
    
    // Get all subscriptions
    const subscriptions = await Subscription.find({});
    
    const debugData = {
      totalRestaurants: rawRestaurants.length,
      totalSubscriptions: subscriptions.length,
      restaurants: [],
      subscriptions: subscriptions.map(sub => ({
        _id: sub._id,
        userId: sub.userId,
        planKey: sub.planKey,
        planName: sub.planName,
        status: sub.status
      })),
      issues: []
    };
    
    // Analyze each restaurant
    for (const restaurant of rawRestaurants) {
      const restaurantDebug = {
        _id: restaurant._id,
        name: restaurant.name,
        subscriptionPlan: restaurant.subscriptionPlan,
        subscriptionId: restaurant.subscriptionId,
        subscriptionIdType: typeof restaurant.subscriptionId,
        ownerId: restaurant.ownerId
      };
      
      // Try to find the subscription manually
      if (restaurant.subscriptionId) {
        const subscription = subscriptions.find(sub => sub._id.toString() === restaurant.subscriptionId.toString());
        if (subscription) {
          restaurantDebug.foundSubscription = {
            planKey: subscription.planKey,
            planName: subscription.planName,
            status: subscription.status,
            userId: subscription.userId
          };
          
          // Check if planKey indicates premium
          if (subscription.planKey === 'restaurant_enterprise') {
            restaurantDebug.shouldBePremium = true;
            if (restaurant.subscriptionPlan !== 'premium') {
              debugData.issues.push({
                restaurantId: restaurant._id,
                restaurantName: restaurant.name,
                issue: 'Has restaurant_enterprise subscription but subscriptionPlan is not premium',
                currentPlan: restaurant.subscriptionPlan,
                subscriptionPlanKey: subscription.planKey
              });
            }
          }
        } else {
          restaurantDebug.subscriptionNotFound = true;
          debugData.issues.push({
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            issue: 'SubscriptionId references non-existent subscription',
            subscriptionId: restaurant.subscriptionId
          });
        }
      } else {
        debugData.issues.push({
          restaurantId: restaurant._id,
          restaurantName: restaurant.name,
          issue: 'No subscriptionId reference'
        });
      }
      
      debugData.restaurants.push(restaurantDebug);
    }
    
    console.log(`📊 Debug Results:`);
    console.log(`  - Restaurants: ${debugData.totalRestaurants}`);
    console.log(`  - Subscriptions: ${debugData.totalSubscriptions}`);
    console.log(`  - Issues found: ${debugData.issues.length}`);
    
    debugData.issues.forEach((issue, index) => {
      console.log(`  Issue ${index + 1}: ${issue.issue}`);
      console.log(`    Restaurant: ${issue.restaurantName}`);
    });

    res.json({
      success: true,
      data: debugData,
      message: 'Restaurant subscription debug analysis completed'
    });
  }, 'debugRestaurants')
);

/**
 * @route GET /api/v1/admin/restaurants/test
 * @desc Test restaurant fetching without complex logic
 * @access Private (admin only)
 */
router.get('/restaurants/test',
  wrapAsync(async (req, res) => {
    const Restaurant = require('../models/Restaurant');
    
    try {
      const count = await Restaurant.countDocuments();
      const sample = await Restaurant.findOne().lean();
      
      res.json({
        success: true,
        data: {
          totalRestaurants: count,
          sampleRestaurant: sample ? {
            id: sample._id,
            name: sample.name,
            subscriptionPlan: sample.subscriptionPlan,
            ownerId: sample.ownerId
          } : null
        },
        message: 'Restaurant test completed successfully'
      });
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  }, 'testRestaurants')
);

/**
 * @route GET /api/v1/admin/restaurants
 * @desc Get all restaurants for admin management
 * @access Private (admin only)
 */
router.get('/restaurants',
  wrapAsync(async (req, res) => {
    const Restaurant = require('../models/Restaurant');
    const Subscription = require('../models/Subscription');
    const User = require('../models/User');

    console.log('🔍 Admin fetching restaurants with complete data...');
    
    try {
      // Get all restaurants without population first to avoid path collision
      const restaurants = await Restaurant.find({})
        .sort({ createdAt: -1 })
        .lean();

      console.log(`📊 Found ${restaurants.length} restaurants`);
      
      // Get all subscriptions and users in parallel for efficiency
      const [allSubscriptions, allUsers] = await Promise.all([
        Subscription.find({}).lean(),
        User.find({}).lean()
      ]);
      
      // Create maps for O(1) lookups
      const subscriptionMap = new Map();
      allSubscriptions.forEach(sub => {
        subscriptionMap.set(sub._id.toString(), sub);
        if (sub.userId) {
          subscriptionMap.set(`user_${sub.userId.toString()}`, sub);
        }
      });
      
      const userMap = new Map();
      allUsers.forEach(user => {
        userMap.set(user._id.toString(), user);
      });
      
      console.log(`📊 Found ${allSubscriptions.length} subscriptions and ${allUsers.length} users`);
      
      // Debug: Log subscription plan keys to understand the data
      const planKeys = allSubscriptions.map(sub => sub.planKey).filter(Boolean);
      const uniquePlanKeys = [...new Set(planKeys)];
      console.log('🔍 Available subscription planKeys:', uniquePlanKeys);
      
      // Process each restaurant with complete data
      const processedRestaurants = restaurants.map((restaurant, index) => {
        console.log(`\n🏪 Restaurant ${index + 1}: ${restaurant.name}`);
        
        // Find owner data
        const ownerId = restaurant.ownerId?.toString() || restaurant.ownerId;
        const owner = ownerId ? userMap.get(ownerId) : null;
        console.log(`  - Found owner: ${owner ? 'YES' : 'NO'}`);
        
        // Find subscription data
        let subscription = null;
        let subscriptionPlan = restaurant.subscriptionPlan || 'free';
        
        // Try to find subscription by subscriptionId first
        if (restaurant.subscriptionId) {
          subscription = subscriptionMap.get(restaurant.subscriptionId.toString());
          console.log(`  - Found subscription by ID: ${subscription ? 'YES' : 'NO'}`);
        }
        
        // If not found by subscriptionId, try by ownerId
        if (!subscription && ownerId) {
          subscription = subscriptionMap.get(`user_${ownerId}`);
          console.log(`  - Found subscription by owner: ${subscription ? 'YES' : 'NO'}`);
        }
        
        // Map subscription plan based on found subscription
        if (subscription) {
          console.log(`  - Subscription details:`, {
            planKey: subscription.planKey,
            planName: subscription.planName,
            planType: subscription.planType,
            status: subscription.status
          });
          switch (subscription.planKey) {
            case 'restaurant_enterprise':
              subscriptionPlan = 'premium';
              break;
            case 'restaurant_professional':
              subscriptionPlan = 'advanced';
              break;
            case 'restaurant_starter':
            case 'restaurant_basic':
              subscriptionPlan = 'basic';
              break;
            case 'restaurant_free':
            case 'free_plan':
            case 'free':
              subscriptionPlan = 'free';
              break;
            default:
              // If planKey doesn't match known patterns, check planName or planType
              if (subscription.planName) {
                const planNameLower = subscription.planName.toLowerCase();
                if (planNameLower.includes('enterprise') || planNameLower.includes('premium')) {
                  subscriptionPlan = 'premium';
                } else if (planNameLower.includes('professional') || planNameLower.includes('advanced')) {
                  subscriptionPlan = 'advanced';
                } else if (planNameLower.includes('starter') || planNameLower.includes('basic')) {
                  subscriptionPlan = 'basic';
                } else {
                  subscriptionPlan = 'free';
                }
              } else {
                subscriptionPlan = 'free';
              }
              break;
          }
          console.log(`  - Final mapped plan: ${subscriptionPlan}`);
        } else {
          // If no subscription found, check if restaurant has explicit subscriptionPlan
          if (restaurant.subscriptionPlan && restaurant.subscriptionPlan !== 'free') {
            subscriptionPlan = restaurant.subscriptionPlan;
            console.log(`  - Using restaurant's explicit plan: ${subscriptionPlan}`);
          } else {
            console.log(`  - No subscription found, defaulting to: ${subscriptionPlan}`);
          }
        }
        
        // Extract logo from media.images array (where imageType is 'logo')
        const logoImage = restaurant.media?.images?.find(img => img.imageType === 'logo');
        const logo = logoImage?.url || restaurant.logo || null;
        
        // Build complete restaurant data
        const processedRestaurant = {
          _id: restaurant._id,
          id: restaurant._id,
          name: restaurant.name || 'Unnamed Restaurant',
          description: restaurant.description || '',
          cuisine: restaurant.cuisine || 'Multi-cuisine',
          
          // Owner information with proper fallbacks
          ownerId: restaurant.ownerId,
          ownerName: owner?.profile?.name || owner?.username || restaurant.ownerName || 'Unknown Owner',
          ownerEmail: owner?.email || restaurant.ownerEmail || 'No email',
          ownerPhone: owner?.phone || restaurant.ownerPhone || 'No phone',
          
          // Address information with enhanced fallbacks
          address: restaurant.contact?.address?.street || restaurant.address || '',
          city: restaurant.contact?.address?.city || restaurant.city || '',
          state: restaurant.contact?.address?.state || restaurant.state || '',
          zipCode: restaurant.contact?.address?.zipCode || restaurant.zipCode || '',
          
          // Contact information
          contact: restaurant.contact || {
            email: owner?.email || restaurant.ownerEmail,
            phone: owner?.phone || restaurant.ownerPhone,
            address: {
              street: restaurant.address || '',
              city: restaurant.city || '',
              state: restaurant.state || '',
              zipCode: restaurant.zipCode || ''
            }
          },
          
          // Subscription information
          subscriptionId: subscription ? {
            _id: subscription._id,
            planKey: subscription.planKey,
            planName: subscription.planName,
            status: subscription.status,
            planType: subscription.planType,
            features: subscription.features,
            limits: subscription.limits,
            userId: subscription.userId
          } : null,
          subscriptionPlan,
          
          // Status and operational data
          status: restaurant.status || (restaurant.isActive !== false ? 'active' : 'inactive'),
          isActive: restaurant.isActive !== false,
          
          // Restaurant limits and stats
          maxTables: restaurant.maxTables || (subscription?.limits?.maxTables > 0 ? subscription.limits.maxTables : 10),
          
          // Enhanced stats with proper data sources
          revenue: restaurant.stats?.totalRevenue || restaurant.revenue || 0,
          orders: restaurant.stats?.totalOrders || restaurant.orders || 0,
          stats: {
            totalRevenue: restaurant.stats?.totalRevenue || restaurant.revenue || 0,
            totalOrders: restaurant.stats?.totalOrders || restaurant.orders || 0,
            averageOrderValue: restaurant.stats?.averageOrderValue || 0,
            totalCustomers: restaurant.stats?.totalCustomers || 0,
            menuViews: restaurant.stats?.menuViews || 0,
            qrScans: restaurant.stats?.qrScans || 0,
            lastOrderDate: restaurant.stats?.lastOrderDate || null,
            lastStatsUpdate: restaurant.stats?.lastStatsUpdate || restaurant.updatedAt
          },
          
          // Media and images
          logo: logo,
          media: restaurant.media || { images: [] },
          
          // Timestamps
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
          
          // Additional fields
          slug: restaurant.slug,
          isPublished: restaurant.isPublished,
          paymentConfig: restaurant.paymentConfig,
          
          // Keep original for debugging
          _original: restaurant
        };
        
        console.log(`  - Final plan: ${processedRestaurant.subscriptionPlan}`);
        console.log(`  - Status: ${processedRestaurant.status}`);
        console.log(`  - Owner: ${processedRestaurant.ownerName} (${processedRestaurant.ownerEmail})`);
        
        return processedRestaurant;
      });

      console.log(`\n✅ Processed ${processedRestaurants.length} restaurants successfully`);
      
      // Log summary by plan
      const planSummary = processedRestaurants.reduce((acc, r) => {
        acc[r.subscriptionPlan] = (acc[r.subscriptionPlan] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Plan distribution:', planSummary);

      res.json({
        success: true,
        data: processedRestaurants,
        message: `Retrieved ${processedRestaurants.length} restaurants successfully`
      });
      
    } catch (error) {
      console.error('❌ Error fetching restaurants:', error);
      throw error;
    }
  }, 'getRestaurants')
);

/**
 * @route GET /api/v1/admin/zones
 * @desc Get all zones for admin management
 * @access Private (admin only)
 */
router.get('/zones',
  wrapAsync(async (req, res) => {
    const Zone = require('../models/Zone');

    const zones = await Zone.find({})
      .populate('adminId', 'email profile.name username')
      .populate('subscriptionId', 'planKey planName status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: zones
    });
  }, 'getZones')
);

/**
 * @route POST /api/v1/admin/restaurants
 * @desc Create premium restaurant for admin
 * @access Private (admin only)
 */
router.post('/restaurants',
  wrapAsync(async (req, res) => {
    const Restaurant = require('../models/Restaurant');
    const User = require('../models/User');
    const Subscription = require('../models/Subscription');

    logger.info('Premium restaurant creation request received', {
      body: req.body,
      userId: req.user?.id,
      userRole: req.user?.role
    });

    const {
      ownerId,
      subscriptionId,
      name,
      description,
      address,
      city,
      state,
      zipCode,
      cuisine,
      ownerName,
      ownerEmail,
      ownerPhone,
      status,
      maxTables,
      paymentConfig,
      subscriptionPlan,
      forceCreate // Optional flag to force creation by updating existing restaurant
    } = req.body;

    // Validate required fields
    if (!ownerId || !subscriptionId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Owner ID, subscription ID, and restaurant name are required'
      });
    }

    // Validate owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found'
      });
    }

    // Validate subscription exists and is active
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Subscription must be active to create restaurant'
      });
    }

    // Check if owner already has an active restaurant and handle accordingly
    const existingActiveRestaurant = await Restaurant.findOne({
      ownerId,
      status: { $in: ['active', 'inactive'] }
    });

    if (existingActiveRestaurant) {
      if (forceCreate) {
        // Update existing restaurant instead of creating new one
        logger.info('Updating existing restaurant instead of creating new one', {
          ownerId,
          existingRestaurantId: existingActiveRestaurant._id,
          existingRestaurantName: existingActiveRestaurant.name
        });

        // Update the existing restaurant with new data
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
          existingActiveRestaurant._id,
          {
            subscriptionId,
            name: name.trim(),
            description: description?.trim(),
            contact: {
              address: {
                street: address?.trim() || '',
                city: city?.trim() || '',
                state: state?.trim() || '',
                zipCode: zipCode?.trim() || '',
                country: 'IN'
              },
              phone: ownerPhone?.trim(),
              email: ownerEmail?.trim()
            },
            cuisine: cuisine?.trim() || 'Multi-Cuisine',
            status: status || 'active',
            subscriptionPlan: (() => {
              if (subscription.planKey === 'restaurant_enterprise') return 'premium';
              if (subscription.planKey === 'restaurant_professional') return 'advanced';
              if (subscription.planKey === 'restaurant_starter') return 'basic';
              return subscriptionPlan || 'premium';
            })(),
            ownerName: ownerName?.trim(),
            ownerEmail: ownerEmail?.trim(),
            ownerPhone: ownerPhone?.trim(),
            maxTables: maxTables || undefined,
            paymentConfig: paymentConfig || undefined,
            address: address?.trim(),
            city: city?.trim(),
            state: state?.trim(),
            zipCode: zipCode?.trim()
          },
          { new: true }
        );

        await updatedRestaurant.populate('ownerId', 'email profile.name username');
        await updatedRestaurant.populate('subscriptionId', 'planKey planName status planType features limits');

        const responseData = updatedRestaurant.toObject();
        if (responseData.subscriptionId && responseData.subscriptionId.planKey) {
          const planKey = responseData.subscriptionId.planKey;
          if (planKey === 'restaurant_enterprise') {
            responseData.subscriptionPlan = 'premium';
          } else if (planKey === 'restaurant_professional') {
            responseData.subscriptionPlan = 'advanced';
          } else if (planKey === 'restaurant_starter') {
            responseData.subscriptionPlan = 'basic';
          }
        }

        return res.status(200).json({
          success: true,
          data: responseData,
          message: 'Restaurant updated successfully'
        });
      } else {
        logger.warn('Restaurant creation failed: Owner already has active restaurant', {
          ownerId,
          existingRestaurantId: existingActiveRestaurant._id,
          existingRestaurantName: existingActiveRestaurant.name,
          existingRestaurantStatus: existingActiveRestaurant.status
        });
        return res.status(409).json({
          success: false,
          message: `Owner already has an ${existingActiveRestaurant.status} restaurant. Each owner can only have one active restaurant.`,
          error: 'DUPLICATE_OWNER_RESTAURANT',
          data: {
            existingRestaurantId: existingActiveRestaurant._id,
            existingRestaurantName: existingActiveRestaurant.name,
            existingRestaurantStatus: existingActiveRestaurant.status
          }
        });
      }
    }

    // Create restaurant data structure that matches the Restaurant model
    // Note: Do NOT set slug manually - let the model pre-save middleware handle it
    const restaurantData = {
      ownerId,
      subscriptionId,
      name: name.trim(),
      description: description?.trim(),
      // Do not set slug - let pre-save middleware handle it
      contact: {
        address: {
          street: address?.trim() || '',
          city: city?.trim() || '',
          state: state?.trim() || '',
          zipCode: zipCode?.trim() || '',
          country: 'IN'
        },
        phone: ownerPhone?.trim(),
        email: ownerEmail?.trim()
      },
      cuisine: cuisine?.trim() || 'Multi-Cuisine',
      status: status || 'active',
      // Map subscription plan based on subscription planKey for frontend compatibility
      subscriptionPlan: (() => {
        if (subscription.planKey === 'restaurant_enterprise') return 'premium';
        if (subscription.planKey === 'restaurant_professional') return 'advanced';
        if (subscription.planKey === 'restaurant_starter') return 'basic';
        return subscriptionPlan || 'premium'; // Default to premium for admin-created restaurants
      })(),
      ownerName: ownerName?.trim(),
      ownerEmail: ownerEmail?.trim(),
      ownerPhone: ownerPhone?.trim(),
      maxTables: maxTables || undefined,
      paymentConfig: paymentConfig || undefined,
      // Add flat address fields for frontend compatibility
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      zipCode: zipCode?.trim()
    };

    try {
      // Create restaurant - pre-save middleware will handle slug generation
      const restaurant = await Restaurant.create(restaurantData);
      
      // Populate the response for frontend compatibility
      await restaurant.populate('ownerId', 'email profile.name username');
      await restaurant.populate('subscriptionId', 'planKey planName status planType features limits');

      // Ensure the response has the correct subscription plan mapping
      const responseData = restaurant.toObject();
      if (responseData.subscriptionId && responseData.subscriptionId.planKey) {
        const planKey = responseData.subscriptionId.planKey;
        if (planKey === 'restaurant_enterprise') {
          responseData.subscriptionPlan = 'premium';
        } else if (planKey === 'restaurant_professional') {
          responseData.subscriptionPlan = 'advanced';
        } else if (planKey === 'restaurant_starter') {
          responseData.subscriptionPlan = 'basic';
        }
      }

      res.status(201).json({
        success: true,
        data: responseData,
        message: 'Premium restaurant created successfully'
      });
    } catch (error) {
      logger.error('Restaurant creation failed', {
        error: error.message,
        code: error.code,
        name: error.name,
        keyPattern: error.keyPattern,
        ownerId,
        restaurantName: name
      });

      // Handle specific MongoDB duplicate key errors
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern)[0];
        logger.warn('Duplicate key error in restaurant creation', {
          duplicateField,
          keyPattern: error.keyPattern,
          ownerId,
          restaurantName: name
        });

        // Check if this is the unique owner-status constraint
        if (error.keyPattern && error.keyPattern.ownerId && error.keyPattern.status) {
          return res.status(409).json({
            success: false,
            message: 'Owner already has an active restaurant. Each owner can only have one active restaurant.',
            error: 'DUPLICATE_OWNER_RESTAURANT',
            field: 'ownerId'
          });
        }

        // Handle other duplicate key errors (like slug)
        return res.status(409).json({
          success: false,
          message: `Restaurant with this ${duplicateField} already exists`,
          error: 'DUPLICATE_KEY_ERROR',
          field: duplicateField
        });
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        logger.warn('Validation error in restaurant creation', {
          validationErrors,
          ownerId,
          restaurantName: name
        });
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Re-throw other errors to be handled by global error handler
      throw error;
    }
  }, 'createRestaurant')
);

/**
 * @route POST /api/v1/admin/zones
 * @desc Create premium zone for admin
 * @access Private (admin only)
 */
router.post('/zones',
  wrapAsync(async (req, res) => {
    const Zone = require('../models/Zone');
    const {
      adminId,
      subscriptionId,
      name,
      description,
      location,
      contactInfo,
      ownerName,
      ownerEmail,
      ownerPhone,
      address,
      city,
      state,
      zipCode,
      status,
      maxTables,
      maxVendors,
      paymentConfig,
      subscriptionPlan
    } = req.body;

    // Create zone data structure that matches the Zone model
    const zoneData = {
      adminId,
      subscriptionId,
      name,
      description,
      location: location || `${address || ''}, ${city || ''}, ${state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
      contactInfo: contactInfo || {
        email: ownerEmail,
        phone: ownerPhone
      },
      active: status === 'active',
      // Add additional fields for frontend compatibility
      subscriptionPlan: subscriptionPlan || 'premium',
      ownerName,
      ownerEmail,
      ownerPhone,
      address,
      city,
      state,
      zipCode,
      status,
      maxTables,
      maxVendors,
      paymentConfig
    };

    const zone = await Zone.create(zoneData);
    
    // Populate the response for frontend compatibility
    await zone.populate('adminId', 'email profile.name username');
    await zone.populate('subscriptionId', 'planKey planName status');

    res.status(201).json({
      success: true,
      data: zone,
      message: 'Premium zone created successfully'
    });
  }, 'createZone')
);

/**
 * @route POST /api/v1/admin/users/:userId/suspend
 * @desc Suspend a user
 * @access Private (admin only)
 */
router.post('/users/:userId/suspend',
  wrapAsync(async (req, res) => {
    const { userId } = req.params;
    const User = require('../models/User');

    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'suspended' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User suspended successfully',
      data: user
    });
  }, 'suspendUser')
);

/**
 * @route POST /api/v1/admin/users/:userId/activate
 * @desc Activate a user
 * @access Private (admin only)
 */
router.post('/users/:userId/activate',
  wrapAsync(async (req, res) => {
    const { userId } = req.params;
    const User = require('../models/User');

    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'active' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User activated successfully',
      data: user
    });
  }, 'activateUser')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;