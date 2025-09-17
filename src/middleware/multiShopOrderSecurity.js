const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const { APIError } = require('./errorHandler');
const { logger } = require('../utils/logger');
const Order = require('../models/Order');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');

/**
 * Multi-Shop Order Security Middleware
 * 
 * Comprehensive security measures for multi-shop zone order operations
 * including rate limiting, input validation, role-based access control,
 * and data sanitization
 */

/**
 * Rate limiting configurations for different operations
 */
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 orders per 15 minutes per IP
  message: {
    error: 'Too many order creation attempts',
    message: 'Please wait before creating another order',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Order creation rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many order creation attempts. Please wait before trying again.',
      retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
    });
  }
});

const statusUpdateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Max 50 status updates per 5 minutes per IP
  message: {
    error: 'Too many status update attempts',
    message: 'Please slow down status updates',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 tracking requests per minute per IP
  message: {
    error: 'Too many tracking requests',
    message: 'Please reduce tracking request frequency',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Input validation rules for order creation
 */
const validateOrderCreation = [
  body('zoneId')
    .isMongoId()
    .withMessage('Invalid zone ID format')
    .custom(async (zoneId) => {
      const zone = await Zone.findById(zoneId);
      if (!zone) {
        throw new Error('Zone not found');
      }
      if (zone.status !== 'active') {
        throw new Error('Zone is not active');
      }
      return true;
    }),

  body('tableNumber')
    .isInt({ min: 1, max: 9999 })
    .withMessage('Table number must be between 1 and 9999'),

  body('customer.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Customer name contains invalid characters'),

  body('customer.phone')
    .trim()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Invalid phone number format'),

  body('customer.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),

  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('Order must contain 1-50 items'),

  body('items.*.menuItemId')
    .isMongoId()
    .withMessage('Invalid menu item ID'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Item quantity must be 1-20'),

  body('items.*.price')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Item price must be between $0.01 and $10,000'),

  body('items.*.specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Special instructions cannot exceed 200 characters'),

  body('pricing.total')
    .isFloat({ min: 0.01, max: 50000 })
    .withMessage('Total amount must be between $0.01 and $50,000'),

  body('paymentMethod')
    .isIn(['cash', 'card', 'digital_wallet', 'mobile_payment'])
    .withMessage('Invalid payment method'),

  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters')
    .matches(/^[a-zA-Z0-9\s\.,!?\-'\"()]*$/)
    .withMessage('Special instructions contain invalid characters')
];

/**
 * Input validation for status updates
 */
const validateStatusUpdate = [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format'),

  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
    .withMessage('Invalid status value'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Notes cannot exceed 300 characters')
    .matches(/^[a-zA-Z0-9\s\.,!?\-'\"()]*$/)
    .withMessage('Notes contain invalid characters'),

  body('estimatedDeliveryTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid delivery time format')
    .custom((value) => {
      const deliveryTime = new Date(value);
      const now = new Date();
      const maxDeliveryTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
      
      if (deliveryTime <= now) {
        throw new Error('Delivery time must be in the future');
      }
      if (deliveryTime > maxDeliveryTime) {
        throw new Error('Delivery time cannot be more than 4 hours from now');
      }
      return true;
    })
];

/**
 * Input validation for tracking queries
 */
const validateOrderTracking = [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format'),

  query('customerPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Invalid customer phone format')
];

/**
 * Role-based access control middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * Zone access control - ensure user can access the specified zone
 */
const requireZoneAccess = async (req, res, next) => {
  try {
    const { zoneId } = req.params.zoneId ? req.params : req.body;
    
    if (!zoneId) {
      return res.status(400).json({
        success: false,
        error: 'Zone ID required',
        message: 'Zone ID must be provided'
      });
    }

    // Zone admins can only access their own zones
    if (req.user.role === 'zone_admin' && req.user.zoneId !== zoneId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access orders from your assigned zone'
      });
    }

    // Shop admins can only access zones they belong to
    if (req.user.role === 'shop_admin') {
      const shop = await ZoneShop.findOne({ 
        _id: req.user.shopId, 
        zoneId: zoneId 
      });
      
      if (!shop) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access orders from zones your shop belongs to'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Zone access control error', {
      error: error.message,
      userId: req.user?.id,
      zoneId: req.params.zoneId || req.body.zoneId
    });

    res.status(500).json({
      success: false,
      error: 'Access control error',
      message: 'Unable to verify zone access permissions'
    });
  }
};

/**
 * Shop access control - ensure user can access the specified shop order
 */
const requireShopAccess = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    if (req.user.role === 'shop_admin') {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
          message: 'The specified order does not exist'
        });
      }

      // Shop admins can only access orders for their shop
      if (order.shopId && order.shopId.toString() !== req.user.shopId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access orders for your shop'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Shop access control error', {
      error: error.message,
      userId: req.user?.id,
      orderId: req.params.orderId
    });

    res.status(500).json({
      success: false,
      error: 'Access control error',
      message: 'Unable to verify shop access permissions'
    });
  }
};

/**
 * Customer order access control - ensure customer can only access their own orders
 */
const requireCustomerOrderAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'customer') {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
          message: 'The specified order does not exist'
        });
      }

      // Customers can only access their own orders (verified by phone)
      if (order.customer.phone !== req.user.phone) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access your own orders'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Customer order access control error', {
      error: error.message,
      userId: req.user?.id,
      orderId: req.params.orderId
    });

    res.status(500).json({
      success: false,
      error: 'Access control error',
      message: 'Unable to verify order access permissions'
    });
  }
};

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation errors in request', {
      endpoint: req.originalUrl,
      method: req.method,
      errors: validationErrors,
      userId: req.user?.id,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Please check your input and try again',
      details: validationErrors
    });
  }

  next();
};

/**
 * Data sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous characters from string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    } else if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Request logging for security monitoring
 */
const logSecurityEvents = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log security-relevant events
    if (req.originalUrl.includes('/orders/') && req.method !== 'GET') {
      logger.info('Order operation performed', {
        method: req.method,
        endpoint: req.originalUrl,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: data?.success || false,
        statusCode: res.statusCode
      });
    }

    // Log failed authentication/authorization attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn('Security event - Access denied', {
        method: req.method,
        endpoint: req.originalUrl,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        reason: data?.error || 'Unknown'
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  // Rate limiters
  createOrderLimiter,
  statusUpdateLimiter,
  trackingLimiter,
  
  // Input validation
  validateOrderCreation,
  validateStatusUpdate,
  validateOrderTracking,
  handleValidationErrors,
  
  // Access control
  requireRole,
  requireZoneAccess,
  requireShopAccess,
  requireCustomerOrderAccess,
  
  // Security utilities
  sanitizeInput,
  logSecurityEvents
};