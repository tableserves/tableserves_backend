const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { APIError } = require('../utils/apiError');
const { logger } = require('../utils/logger');

/**
 * Payment Security Middleware
 * Provides additional security measures for payment endpoints
 */

/**
 * Rate limiter for payment creation endpoints
 * More restrictive than general API rate limiting
 */
const paymentCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment creation requests per windowMs
  message: {
    success: false,
    error: { 
      message: 'Too many payment requests from this IP, please try again later.',
      code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * Rate limiter for payment verification endpoints
 * Even more restrictive to prevent brute force attacks
 */
const paymentVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 verification attempts per windowMs
  message: {
    success: false,
    error: { 
      message: 'Too many payment verification attempts from this IP, please try again later.',
      code: 'PAYMENT_VERIFICATION_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * Validation rules for payment creation
 */
const validatePaymentCreation = [
  body('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format')
    .notEmpty()
    .withMessage('Order ID is required'),
];

/**
 * Validation rules for payment verification
 */
const validatePaymentVerification = [
  body('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format')
    .notEmpty()
    .withMessage('Order ID is required'),
  
  body('razorpay_order_id')
    .isString()
    .withMessage('Razorpay order ID must be a string')
    .matches(/^order_[A-Za-z0-9]+$/)
    .withMessage('Invalid Razorpay order ID format')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  
  body('razorpay_payment_id')
    .isString()
    .withMessage('Razorpay payment ID must be a string')
    .matches(/^pay_[A-Za-z0-9]+$/)
    .withMessage('Invalid Razorpay payment ID format')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  
  body('razorpay_signature')
    .isString()
    .withMessage('Razorpay signature must be a string')
    .isLength({ min: 64, max: 128 })
    .withMessage('Invalid Razorpay signature length')
    .matches(/^[a-f0-9]+$/)
    .withMessage('Invalid Razorpay signature format')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    
    logger.warn('Payment validation failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      errors: errorMessages,
      body: req.body
    });
    
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errorMessages,
        code: 'PAYMENT_VALIDATION_ERROR'
      }
    });
  }
  next();
};

/**
 * Sanitize payment request data
 */
const sanitizePaymentData = (req, res, next) => {
  // Remove any potentially dangerous fields
  const allowedFields = {
    'create-payment': ['orderId'],
    'verify-payment': ['orderId', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']
  };
  
  const endpoint = req.path.split('/').pop();
  const allowed = allowedFields[endpoint] || [];
  
  // Create sanitized body with only allowed fields
  const sanitizedBody = {};
  allowed.forEach(field => {
    if (req.body[field] !== undefined) {
      sanitizedBody[field] = req.body[field];
    }
  });
  
  req.body = sanitizedBody;
  next();
};

/**
 * Log payment security events
 */
const logPaymentSecurityEvents = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Payment request received', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Payment response sent', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      success: data.success,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Webhook security middleware
 */
const validateWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    logger.warn('Webhook request without signature', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: req.headers
    });
    
    return res.status(400).json({
      success: false,
      error: {
        message: 'Webhook signature missing',
        code: 'WEBHOOK_SIGNATURE_MISSING'
      }
    });
  }
  
  // Signature validation will be done in the service layer
  // This middleware just ensures the header is present
  next();
};

/**
 * Error handler for payment endpoints
 */
const paymentErrorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Payment endpoint error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    if (err instanceof APIError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          message: err.message,
          code: err.code || 'PAYMENT_ERROR'
        }
      });
    }
    
    // Generic error for production
    return res.status(500).json({
      success: false,
      error: {
        message: 'Payment processing failed. Please try again.',
        code: 'PAYMENT_PROCESSING_ERROR'
      }
    });
  }
  
  // Detailed error for development
  return res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code || 'PAYMENT_ERROR'
    }
  });
};

module.exports = {
  paymentCreationLimiter,
  paymentVerificationLimiter,
  validatePaymentCreation,
  validatePaymentVerification,
  handleValidationErrors,
  sanitizePaymentData,
  logPaymentSecurityEvents,
  validateWebhookSignature,
  paymentErrorHandler
};
