const { verifyAccessToken, extractTokenFromHeader } = require('../services/jwtService');
const { APIError, catchAsync } = require('./errorHandler');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    loggerUtils.logSecurity('Authentication failed - No token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    throw new APIError('Access token required', 401);
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // TODO: Once we have User model, fetch user from database
    // For now, we'll use the decoded token payload
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tokenIat: decoded.iat
    };

    loggerUtils.logAuth('Authentication successful', decoded.userId, {
      role: decoded.role,
      ip: req.ip
    });

    next();
  } catch (error) {
    loggerUtils.logSecurity('Authentication failed - Invalid token', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    
    // Pass the error to the error handler
    next(error);
  }
});

/**
 * Authorization middleware - checks user role
 * @param {...string} allowedRoles - Allowed roles
 */
const authorize = (...allowedRoles) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    const userRole = req.user.role;

    // Super admin has access to everything
    if (userRole === 'admin') {
      return next();
    }

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      loggerUtils.logSecurity('Authorization failed - Insufficient permissions', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        ip: req.ip
      });
      
      throw new APIError('Insufficient permissions', 403);
    }

    loggerUtils.logAuth('Authorization successful', req.user.id, {
      role: userRole,
      requiredRoles: allowedRoles
    });

    next();
  });
};

/**
 * Subscription feature middleware - checks if user has access to specific feature
 * @param {string} featureName - Feature name to check
 */
const checkFeatureAccess = (featureName) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    // Super admin has access to all features
    if (req.user.role === 'admin') {
      return next();
    }

    // TODO: Once we have Subscription model, check user's subscription features
    // For now, we'll allow access to all features
    logger.debug('Feature access check', {
      userId: req.user.id,
      feature: featureName,
      note: 'Subscription check not implemented yet'
    });

    next();
  });
};

/**
 * Resource ownership middleware - checks if user owns the resource
 * @param {string} resourceIdParam - Parameter name for resource ID
 * @param {string} resourceType - Type of resource (restaurant, zone, etc.)
 */
const checkResourceOwnership = (resourceIdParam, resourceType) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    // Super admin has access to all resources
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    
    if (!resourceId) {
      throw new APIError(`${resourceIdParam} parameter is required`, 400);
    }

    // TODO: Once we have models, check resource ownership
    // For now, we'll allow access
    logger.debug('Resource ownership check', {
      userId: req.user.id,
      resourceType,
      resourceId,
      note: 'Ownership check not implemented yet'
    });

    next();
  });
};

/**
 * Rate limiting by user
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requestCounts = new Map();

  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, data] of requestCounts.entries()) {
      if (data.windowStart < windowStart) {
        requestCounts.delete(key);
      }
    }

    // Get or create user request data
    let userRequests = requestCounts.get(userId);
    if (!userRequests || userRequests.windowStart < windowStart) {
      userRequests = {
        count: 0,
        windowStart: now
      };
      requestCounts.set(userId, userRequests);
    }

    // Check rate limit
    if (userRequests.count >= maxRequests) {
      loggerUtils.logSecurity('Rate limit exceeded', {
        userId,
        count: userRequests.count,
        limit: maxRequests,
        ip: req.ip
      });
      
      throw new APIError('Rate limit exceeded. Please try again later.', 429);
    }

    // Increment counter
    userRequests.count++;
    
    next();
  });
};

/**
 * Optional authentication - sets user if token is valid, but doesn't require it
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return next(); // No token, continue without user
  }

  try {
    const decoded = verifyAccessToken(token);
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tokenIat: decoded.iat
    };

    loggerUtils.logAuth('Optional authentication successful', decoded.userId);
  } catch (error) {
    // Token is invalid, but we don't throw error for optional auth
    logger.debug('Optional authentication failed', { error: error.message });
  }

  next();
});

/**
 * API key authentication middleware (for external integrations)
 * @param {string} expectedApiKey - Expected API key value
 */
const authenticateApiKey = (expectedApiKey) => {
  return catchAsync(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      throw new APIError('API key required', 401);
    }

    if (apiKey !== expectedApiKey) {
      loggerUtils.logSecurity('API key authentication failed', {
        providedKey: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      throw new APIError('Invalid API key', 401);
    }

    loggerUtils.logAuth('API key authentication successful', 'api-client');
    next();
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