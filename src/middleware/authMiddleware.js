const rateLimit = require('express-rate-limit');
const { verifyAccessToken, extractTokenFromHeader } = require('../services/jwtService');
const errorHandler = require('./errorHandler');
const APIError = errorHandler.APIError;
const catchAsync = require('../utils/catchAsync');
const { logger, loggerUtils } = require('../utils/logger');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const Subscription = require('../models/Subscription');

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.USER_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.USER_RATE_LIMIT_MAX_REQUESTS) || 500, // Limit each IP to 500 requests per windowMs
  message: {
    success: false,
    error: { 
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// This should be in a shared file
const SUBSCRIPTION_PLANS = {
  // Restaurant Plans
  restaurant_free: {
    planType: 'restaurant',
    features: {
      crudMenu: true,
      qrGeneration: true,
      basicAnalytics: false,
      customerSupport: true
    },
    limits: {
      maxTables: 1,
      maxMenuCategories: 1,
      maxMenuItems: 2, // 2 items per category
      maxOrdersPerMonth: 50,
      maxImageUploads: 5
    },
    restrictions: {
      qrCustomization: false,
      advancedAnalytics: false,
      multiLocation: false,
      priority_support: false
    }
  },

  restaurant_basic: {
    planType: 'restaurant',
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      basicAnalytics: false,
      customerSupport: true
    },
    limits: {
      maxTables: 5,
      maxMenuCategories: 8,
      maxMenuItems: 80, // 10 items per category (8 × 10)
      maxOrdersPerMonth: 1000,
      maxImageUploads: 50
    },
    restrictions: {
      advancedAnalytics: false,
      multiLocation: false,
      priority_support: false
    }
  },

  restaurant_advanced: {
    planType: 'restaurant',
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customerSupport: true,
      prioritySupport: true
    },
    limits: {
      maxTables: 8,
      maxMenuCategories: 15,
      maxMenuItems: 300, // 20 items per category (15 × 20)
      maxOrdersPerMonth: 2000,
      maxImageUploads: 100
    },
    restrictions: {
      multiLocation: false
    }
  },
  restaurant_premium: {
    planType: 'restaurant',
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customerSupport: true,
      prioritySupport: true,
      multiLocation: true
    },
    limits: {
      maxTables: 50,
      maxMenuCategories: 25,
      maxMenuItems: 200,
      maxOrdersPerMonth: 2000,
      maxImageUploads: 100
    },
    restrictions: {}
  },
  restaurant_enterprise: {
    planType: 'restaurant',
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customerSupport: true,
      prioritySupport: true,
      multiLocation: true,
      whiteLabel: true,
      apiAccess: true,
      customIntegrations: true
    },
    limits: {
      maxTables: null, // unlimited
      maxMenuCategories: null,
      maxMenuItems: null,
      maxOrdersPerMonth: null,
      maxImageUploads: null
    },
    restrictions: {}
  },

  // Zone Plans
  zone_free: {
    planType: 'zone',
    features: {
      vendorManagement: true,
      qrGeneration: true,
      basicAnalytics: false,
      customerSupport: true
    },
    limits: {
      maxShops: 1,
      maxTables: 1,
      maxVendors: 1,
      maxMenuCategories: 1,
      maxMenuItems: 1, // 1 item per category
      maxOrdersPerMonth: 50,
      maxImageUploads: 5
    },
    restrictions: {
      qrCustomization: false,
      advancedAnalytics: false,
      prioritySupport: false
    }
  },

  zone_basic: {
    planType: 'zone',
    features: {
      vendorManagement: true,
      qrGeneration: true,
      basicAnalytics: true,
      customerSupport: true
    },
    limits: {
      maxShops: 5,
      maxTables: 5,
      maxVendors: 5,
      maxMenuCategories: 8,
      maxMenuItems: 80, // 10 items per category (8 × 10)
      maxOrdersPerMonth: 1000,
      maxImageUploads: 50
    },
    restrictions: {
      qrCustomization: false,
      advancedAnalytics: false,
      prioritySupport: false
    }
  },

  zone_advanced: {
    planType: 'zone',
    features: {
      vendorManagement: true,
      qrGeneration: true,
      qrCustomization: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customerSupport: true,
      prioritySupport: true
    },
    limits: {
      maxShops: 8,
      maxTables: 8,
      maxVendors: 8,
      maxMenuCategories: 15,
      maxMenuItems: 300, // 20 items per category (15 × 20)
      maxOrdersPerMonth: 2000,
      maxImageUploads: 100
    },
    restrictions: {}
  },

  zone_premium: {
    planType: 'zone',
    features: {
      vendorManagement: true,
      qrGeneration: true,
      qrCustomization: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customerSupport: true,
      prioritySupport: true,
      whiteLabel: true,
      apiAccess: true
    },
    limits: {
      maxShops: null, // Custom - Set by Super Admin
      maxTables: null, // Custom - Set by Super Admin
      maxVendors: null, // Custom - Set by Super Admin
      maxMenuCategories: null, // Custom - Set by Super Admin
      maxMenuItems: null, // Custom - Set by Super Admin
      maxOrdersPerMonth: null, // Unlimited
      maxImageUploads: null // Custom - Set by Super Admin
    },
    restrictions: {}
  },
  zone_enterprise: {
    planType: 'zone',
    features: {
      vendorManagement: true,
      qrGeneration: true,
      qrCustomization: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customerSupport: true,
      prioritySupport: true,
      whiteLabel: true,
      apiAccess: true,
      customIntegrations: true
    },
    limits: {
      maxShops: null,
      maxVendors: null,
      maxMenuCategories: null,
      maxMenuItems: null,
      maxOrdersPerMonth: null,
      maxImageUploads: null
    },
    restrictions: {}
  }
};

// FIXED: User rate limiting middleware - removed custom keyGenerator for IPv6 compatibility
const userRateLimit = rateLimit({
  windowMs: parseInt(process.env.USER_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.USER_RATE_LIMIT_MAX_REQUESTS) || 500,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this user, please try again later.',
      code: 'USER_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default IP handling (supports IPv6) - removed custom keyGenerator
  skip: (req) => {
    // Skip rate limiting for health checks
    if (req.path.includes('/health')) {
      return true;
    }
    return false;
  }
});

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = catchAsync(async (req, res, next) => {
  try {
    console.log('🔐 Authentication middleware started for:', req.method, req.url);
    console.log('🔍 Headers received:', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
    });

    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('❌ Authentication failed: No token provided');
      logger.warn('Authentication failed: No token provided', {
        url: req.url,
        method: req.method,
        headers: {
          authorization: authHeader ? 'present' : 'missing',
          userAgent: req.headers['user-agent']
        }
      });
      throw new APIError('Access token required', 401);
    }

    console.log('🔑 Token extracted successfully, length:', token.length);

    console.log('🔓 Verifying token...');
    const decoded = verifyAccessToken(token);
    console.log('✅ Token verified, userId:', decoded.userId);

    console.log('👤 Looking up user in database...');
    const user = await User.findById(decoded.userId).populate('subscription');

    if (!user) {
      console.log('❌ User not found in database for userId:', decoded.userId);
      logger.warn('Authentication failed: User not found', {
        userId: decoded.userId,
        url: req.url,
        method: req.method
      });
      throw new APIError('User not found', 401);
    }

    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status
    });

    if (user.status !== 'active') {
      logger.warn('Authentication failed: Account inactive', {
        userId: user._id,
        status: user.status,
        url: req.url,
        method: req.method
      });
      throw new APIError('Account is inactive', 401);
    }

    // Add shopId for zone shop and zone vendor users
    if (['zone_shop', 'zone_vendor'].includes(user.role)) {
      try {
        const ZoneShop = require('../models/ZoneShop');
        const shop = await ZoneShop.findOne({ ownerId: user._id }).select('_id');
        if (shop) {
          user.shopId = shop._id;
        }
        console.log('Authentication - Zone shop user shopId populated:', {
          userId: user._id,
          role: user.role,
          shopId: user.shopId
        });
      } catch (shopError) {
        logger.warn('Could not find shop for zone user during authentication', {
          userId: user._id,
          role: user.role,
          error: shopError.message
        });
      }
    }

    req.user = user;
    req.token = token;

    logger.debug('Authentication successful', {
      userId: user._id,
      role: user.role,
      shopId: user.shopId,
      url: req.url,
      method: req.method
    });

    next();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    logger.error('Authentication error', {
      error: error.message,
      url: req.url,
      method: req.method,
      stack: error.stack
    });

    throw new APIError('Invalid access token', 401);
  }
});

/**
 * Authorization middleware - checks user role
 */
const authorize = (...allowedRoles) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    // Enhanced logging for debugging authorization issues
    console.log('🔒 Authorization Check:', {
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      allowedRoles,
      url: req.originalUrl,
      method: req.method,
      shopId: req.user.shopId,
      queryParams: req.query
    });

    if (!allowedRoles.includes(req.user.role)) {
      console.error('❌ Authorization FAILED:', {
        userId: req.user._id || req.user.id,
        userRole: req.user.role,
        allowedRoles,
        url: req.originalUrl,
        method: req.method
      });
      throw new APIError('Insufficient permissions', 403);
    }

    console.log('✅ Authorization SUCCESS:', {
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      url: req.originalUrl
    });

    next();
  });
};

/**
 * Optional authentication middleware - adds user to request if token is valid
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).populate('subscription');

      if (user && user.status === 'active') {
        req.user = user;
        req.token = token;
      }
    }
  } catch (error) {
    // Silently continue without authentication for optional auth
    logger.warn('Optional auth failed:', error.message);
  }

  next();
});

/**
 * API Key authentication middleware
 */
const authenticateApiKey = catchAsync(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    throw new APIError('API key required', 401);
  }

  // Validate API key (implement your API key validation logic)
  const isValidApiKey = process.env.VALID_API_KEYS?.split(',').includes(apiKey);

  if (!isValidApiKey) {
    throw new APIError('Invalid API key', 401);
  }

  next();
});

/**
 * Subscription feature middleware - checks if user has access to specific feature
 */
const checkFeatureAccess = (featureName) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const subscription = await Subscription.findOne({ userId: req.user._id, status: 'active' });

    if (!subscription) {
      throw new APIError('No active subscription found', 403);
    }

    const plan = SUBSCRIPTION_PLANS[subscription.planKey];

    if (!plan || !plan.features[featureName]) {
      throw new APIError(`Feature '${featureName}' is not available in your current plan`, 403);
    }

    next();
  });
};

/**
 * Resource ownership middleware - checks if user owns the resource
 */
const checkResourceOwnership = (resourceIdParam, resourceType) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    let resource;

    try {
      switch (resourceType) {
        case 'restaurant':
          resource = await Restaurant.findById(resourceId);
          if (!resource || resource.ownerId.toString() !== req.user._id.toString()) {
            throw new APIError('Restaurant not found or access denied', 404);
          }
          break;
        case 'zone':
          resource = await Zone.findById(resourceId);
          if (!resource || resource.ownerId.toString() !== req.user._id.toString()) {
            throw new APIError('Zone not found or access denied', 404);
          }
          break;
        case 'zoneshop':
          resource = await ZoneShop.findById(resourceId).populate('zoneId');
          if (!resource || resource.zoneId.ownerId.toString() !== req.user._id.toString()) {
            throw new APIError('Shop not found or access denied', 404);
          }
          break;
        default:
          throw new APIError('Invalid resource type', 400);
      }

      req.resource = resource;
      next();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Resource validation failed', 500);
    }
  });
};

module.exports = {
  authenticate,
  authorize,
  checkFeatureAccess,
  checkResourceOwnership,
  userRateLimit,
  optionalAuth,
  authenticateApiKey
};