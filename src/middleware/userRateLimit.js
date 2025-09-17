const rateLimit = require('express-rate-limit');

/**
 * User-specific rate limiting middleware
 * Uses default IP handling which supports both IPv4 and IPv6
 */
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || parseInt(process.env.USER_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: options.max || parseInt(process.env.USER_RATE_LIMIT_MAX_REQUESTS) || 500, // Limit each IP to 500 requests per windowMs
    message: {
      success: false,
      error: { 
        message: options.message || 'Too many requests from this IP, please try again later.',
        code: options.code || 'RATE_LIMIT_EXCEEDED'
      }
    },
    // Skip rate limiting for health check and test endpoints, and in development
    skip: (req) => {
      // Skip rate limiting in development
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      const skipPaths = ['/health', '/test', ...(options.skipPaths || [])];
      return skipPaths.some(path => req.path.startsWith(path));
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Default rate limiter for general use
const defaultRateLimiter = createRateLimiter();

// Rate limiter for authentication endpoints
const authRateLimiter = createRateLimiter({
  max: 50, // Increased limit for auth endpoints
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many login attempts, please try again later.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
  skipPaths: ['/api/v1/auth/refresh-token']
});

module.exports = {
  createRateLimiter,
  defaultRateLimiter,
  authRateLimiter
};