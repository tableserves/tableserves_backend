const { logger } = require('../utils/logger');

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'APIError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Validation Error: ${errors.join(', ')}`;
  return new APIError(message, 400);
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `${field} '${value}' already exists`;
  return new APIError(message, 409);
};

/**
 * Handle Mongoose cast errors
 */
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new APIError(message, 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new APIError('Invalid token. Please log in again', 401);
};

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = () => {
  return new APIError('Your token has expired. Please log in again', 401);
};

/**
 * Send error response in development mode
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      name: err.name
    }
  });
};

/**
 * Send error response in production mode
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message
      }
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong!'
      }
    });
  }
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : 'anonymous',
    stack: err.stack
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = handleCastError(error);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error = handleValidationError(error);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = handleDuplicateKeyError(error);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Set default values if not set
  error.statusCode = error.statusCode || 500;
  error.isOperational = error.isOperational !== undefined ? error.isOperational : false;

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Catch async errors wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new APIError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  APIError,
  errorHandler,
  catchAsync,
  notFound
};