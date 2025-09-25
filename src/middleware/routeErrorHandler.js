const logger = require('../utils/logger');
const { APIError } = require('./errorHandler');

/**
 * Enhanced Route Error Handler Middleware
 * Provides consistent error handling across all route modules
 */

/**
 * Create a standardized async route wrapper with enhanced error handling
 * @param {Function} fn - The async route handler function
 * @param {string} routeName - Name of the route for logging purposes
 * @param {Object} options - Additional options for error handling
 * @returns {Function} Enhanced route handler
 */
const createRouteHandler = (fn, routeName = 'Unknown', options = {}) => {
  return async (req, res, next) => {
    try {
      // Log route access with safe logger call
      try {
        if (logger && typeof logger.info === 'function') {
          logger.info(`Route accessed: ${routeName}`, {
            userId: req.user?.id,
            userRole: req.user?.role,
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });
        }
      } catch (logError) {
        // Fallback to console if logger fails
        console.log(`Route accessed: ${routeName} - ${req.method} ${req.path}`);
      }

      // Execute the route handler
      await fn(req, res, next);

      // Log successful completion with safe logger call
      try {
        if (logger && typeof logger.info === 'function') {
          logger.info(`Route completed successfully: ${routeName}`, {
            userId: req.user?.id,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: Date.now() - req.startTime
          });
        }
      } catch (logError) {
        console.log(`Route completed: ${routeName} - ${req.method} ${req.path} - ${res.statusCode}`);
      }

    } catch (error) {
      // Enhanced error logging with context
      const errorContext = {
        routeName,
        userId: req.user?.id,
        userRole: req.user?.role,
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        body: sanitizeRequestBody(req.body),
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
        errorCode: error.code,
        statusCode: error.statusCode || error.status
      };

      // Safe logger call with fallback
      try {
        if (logger && typeof logger.error === 'function') {
          logger.error(`Route error in ${routeName}:`, error, errorContext);
        } else {
          console.error(`Route error in ${routeName}:`, error, errorContext);
        }
      } catch (logError) {
        console.error(`Route error in ${routeName}:`, error);
        console.error('Logger error:', logError);
      }

      // Pass error to next middleware
      next(error);
    }
  };
};

/**
 * Sanitize request body to remove sensitive information from logs
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Get user-friendly error message based on error type and context
 * @param {Error} err - The error object
 * @param {string} originalMessage - Original error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} req - Express request object
 * @returns {string} User-friendly error message
 */
const getUserFriendlyMessage = (err, originalMessage, statusCode, req) => {
  const path = req.path || '';
  const method = req.method || '';
  
  // Authentication-related errors
  if (statusCode === 401) {
    if (path.includes('/auth/login')) {
      return 'Username or password is incorrect. Please try again.';
    }
    if (originalMessage.includes('token') || originalMessage.includes('authentication')) {
      return 'Your session has expired. Please log in again.';
    }
    return 'Please log in to access this feature.';
  }
  
  // Signup/Registration errors
  if (path.includes('/auth/register') || path.includes('/signup')) {
    if (statusCode === 409 || err.code === 11000) {
      // Handle duplicate key errors more specifically
      if (originalMessage.toLowerCase().includes('email')) {
        return 'An account with this email address already exists. Please use a different email or try logging in.';
      }
      if (originalMessage.toLowerCase().includes('phone')) {
        return 'An account with this phone number already exists. Please use a different phone number or try logging in.';
      }
      return 'An account with this information already exists. Please try logging in or use different details.';
    }
    if (statusCode === 400) {
      if (originalMessage.toLowerCase().includes('email')) {
        return 'Please enter a valid email address.';
      }
      if (originalMessage.toLowerCase().includes('phone')) {
        return 'Please enter a valid phone number.';
      }
      if (originalMessage.toLowerCase().includes('password')) {
        return 'Password must be at least 6 characters long.';
      }
      return 'Please check your information and try again.';
    }
    return 'Unable to create account. Please check your information and try again.';
  }
  
  // General HTTP status code messages
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your information and try again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested information was not found.';
    case 409:
      return 'This information already exists. Please try with different details.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Our servers are experiencing issues. Please try again in a few moments.';
    default:
      // For unknown errors, return a generic but friendly message
      return 'Something went wrong. Please try again or contact support if the problem persists.';
  }
};

/**
 * Comprehensive error handling middleware for routes
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const routeErrorHandler = (err, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Set default error properties
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let userMessage = '';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Input validation failed';
    userMessage = 'Please check your information and try again.';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format provided';
    userMessage = 'Invalid request format. Please try again.';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Resource already exists';
    // Get specific duplicate field message
    const duplicateField = err.keyValue ? Object.keys(err.keyValue)[0] : 'information';
    if (duplicateField === 'email') {
      userMessage = 'An account with this email already exists. Please use a different email or try logging in.';
    } else if (duplicateField === 'phone') {
      userMessage = 'An account with this phone number already exists. Please use a different phone number or try logging in.';
    } else {
      userMessage = `This ${duplicateField} already exists. Please use different information.`;
    }
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
    userMessage = 'Your session is invalid. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
    userMessage = 'Your session has expired. Please log in again.';
  } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = 'Database operation failed';
    userMessage = 'Our servers are experiencing issues. Please try again in a few moments.';
  }
  
  // If no user message set yet, generate one based on context
  if (!userMessage) {
    userMessage = getUserFriendlyMessage(err, message, statusCode, req);
  }

  // Create error response with user-friendly message
  const errorResponse = {
    success: false,
    error: {
      code,
      message: userMessage, // Use user-friendly message for frontend
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        originalError: err.toString(),
        technicalMessage: message // Keep technical message for debugging
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Log the final error response with safe logger call
  try {
    if (logger && typeof logger.error === 'function') {
      logger.error('Route error response sent:', {
        statusCode,
        errorCode: code,
        message,
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.id
      });
    } else {
      console.error(`Route error: ${statusCode} ${message} - ${req.method} ${req.originalUrl}`);
    }
  } catch (logError) {
    console.error(`Route error: ${statusCode} ${message} - ${req.method} ${req.originalUrl}`);
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Request timing middleware to track response times
 */
const requestTimer = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

module.exports = {
  createRouteHandler,
  routeErrorHandler,
  requestTimer,
  sanitizeRequestBody
};
