const { logger } = require('../utils/logger');

const { BaseError } = require('../utils/errors');

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = err => ({
  message: 'Invalid value provided',
  statusCode: 400
});

const handleValidationErrorDB = err => ({
  message: Object.values(err.errors).map(el => el.message).join('. '),
  statusCode: 400
});

const handleDuplicateFieldsDB = err => ({
  message: 'Duplicate field value. Please use another value',
  statusCode: 400
});

const handleJWTError = () => ({
  message: 'Invalid token. Please log in again',
  statusCode: 401
});

const handleJWTExpiredError = () => ({
  message: 'Your token has expired. Please log in again',
  statusCode: 401
});

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  // Generate unique error ID for tracking
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Enhanced logging for production with security considerations
  const logData = {
    errorId,
    message: err.message,
    statusCode: err.statusCode,
    path: req?.originalUrl || 'unknown',
    method: req?.method || 'unknown',
    ip: req?.ip || 'unknown',
    userAgent: req?.get('User-Agent') || 'unknown',
    userId: req?.user?.id || req?.user?._id || 'anonymous',
    timestamp: new Date().toISOString()
  };

  // Log stack trace only for server errors (5xx)
  if (err.statusCode >= 500) {
    logData.stack = err.stack;
    logger.error('Production Error (5xx):', logData);
  } else {
    logger.warn('Production Error (4xx):', logData);
  }

  // Operational, trusted error: send sanitized message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'OPERATIONAL_ERROR',
        errorId: errorId
      }
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unhandled Production Error:', {
      ...logData,
      stack: err.stack,
      type: 'UNHANDLED_ERROR'
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again later.',
        code: 'INTERNAL_SERVER_ERROR',
        errorId: errorId
      }
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types with user-friendly messages
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    // Handle rate limiting errors
    if (error.name === 'TooManyRequestsError' || error.statusCode === 429) {
      error.message = 'Too many requests. Please try again later.';
      error.isOperational = true;
    }

    // Handle CORS errors
    if (error.message && error.message.includes('CORS')) {
      error.message = 'Access denied. Invalid origin.';
      error.statusCode = 403;
      error.isOperational = true;
    }

    sendErrorProd(error, req, res);
  }
};

// Enhanced error classes for production
class ProductionAPIError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.code = code;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Security-focused error handler for sensitive operations
const securityErrorHandler = (err, req, res, next) => {
  // Log security-related errors with high priority
  if (err.statusCode === 401 || err.statusCode === 403) {
    logger.warn('Security Error:', {
      type: 'SECURITY_ERROR',
      statusCode: err.statusCode,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });
  }

  // Continue to global error handler
  next(err);
};

module.exports = globalErrorHandler;
module.exports.APIError = APIError;
module.exports.ProductionAPIError = ProductionAPIError;
module.exports.securityErrorHandler = securityErrorHandler;
