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

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Input validation failed';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format provided';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Resource already exists';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = 'Database operation failed';
  }

  // Create error response
  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        originalError: err.toString()
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
