const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

class RateLimitService {
  constructor() {
    // Always use in-memory store - no Redis complexity
    this.store = new rateLimit.MemoryStore();
    logger.info('Rate limiting initialized with in-memory store');
  }

  // Simple initialization - no Redis needed
  initialize() {
    // Already initialized in constructor
    return Promise.resolve();
  }

  // Create rate limiter with Redis store if available, otherwise use in-memory store
  createLimiter(options) {
    return rateLimit({
      store: this.store,
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      ...options
    });
  }

  // Generic rate limiter factory
  createRateLimit(options) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil(options.windowMs / 1000)
        }
      },
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          userId: req.user?.id
        });
        
        res.status(429).json(options.message || defaultOptions.message);
      }
    };

    // Use Redis store if available
    if (this.store) {
      defaultOptions.store = this.store;
    }

    return rateLimit({ ...defaultOptions, ...options });
  }

  // Authentication endpoints rate limiting
  getAuthRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Please try again in 15 minutes.',
          retryAfter: 900
        }
      },
      skipSuccessfulRequests: true, // Don't count successful requests
      keyGenerator: (req) => {
        // Rate limit by IP and email combination for auth
        const email = req.body?.email || 'unknown';
        return `auth:${req.ip}:${email}`;
      }
    });
  }

  // API endpoints general rate limiting
  getApiRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        success: false,
        error: {
          code: 'API_RATE_LIMIT_EXCEEDED',
          message: 'Too many API requests. Please try again later.',
          retryAfter: 900
        }
      }
    });
  }

  // File upload rate limiting
  getUploadRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 uploads per minute
      message: {
        success: false,
        error: {
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          message: 'Too many file uploads. Please wait before uploading more files.',
          retryAfter: 60
        }
      }
    });
  }

  // Order creation rate limiting
  getOrderRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 orders per minute per IP
      message: {
        success: false,
        error: {
          code: 'ORDER_RATE_LIMIT_EXCEEDED',
          message: 'Too many orders placed. Please wait before placing another order.',
          retryAfter: 60
        }
      }
    });
  }

  // Password reset rate limiting
  getPasswordResetRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 password reset attempts per hour
      message: {
        success: false,
        error: {
          code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
          message: 'Too many password reset attempts. Please try again in 1 hour.',
          retryAfter: 3600
        }
      },
      keyGenerator: (req) => {
        const email = req.body?.email || 'unknown';
        return `password_reset:${email}`;
      }
    });
  }

  // Heavy operations rate limiting (analytics, reports)
  getHeavyOperationRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 2, // 2 heavy operations per minute
      message: {
        success: false,
        error: {
          code: 'HEAVY_OPERATION_RATE_LIMIT_EXCEEDED',
          message: 'Too many resource-intensive requests. Please wait before trying again.',
          retryAfter: 60
        }
      }
    });
  }

  // User-specific rate limiting
  getUserRateLimit(maxRequests = 1000, windowMs = 60 * 60 * 1000) {
    return this.createRateLimit({
      windowMs, // 1 hour default
      max: maxRequests,
      keyGenerator: (req) => {
        return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
      },
      message: {
        success: false,
        error: {
          code: 'USER_RATE_LIMIT_EXCEEDED',
          message: 'You have exceeded your hourly request limit.',
          retryAfter: Math.ceil(windowMs / 1000)
        }
      }
    });
  }

  // Dynamic rate limiting based on subscription plan
  getSubscriptionBasedRateLimit() {
    return async (req, res, next) => {
      if (!req.user) {
        return next();
      }

      // Get user's subscription plan
      const subscription = req.subscription;
      if (!subscription) {
        return next();
      }

      // Define rate limits per plan
      const planLimits = {
        restaurant_basic: { requests: 500, windowMs: 60 * 60 * 1000 },
        restaurant_premium: { requests: 2000, windowMs: 60 * 60 * 1000 },
        restaurant_enterprise: { requests: 10000, windowMs: 60 * 60 * 1000 },
        zone_basic: { requests: 1000, windowMs: 60 * 60 * 1000 },
        zone_premium: { requests: 5000, windowMs: 60 * 60 * 1000 },
        zone_enterprise: { requests: 15000, windowMs: 60 * 60 * 1000 }
      };

      const limits = planLimits[subscription.planKey] || { requests: 100, windowMs: 60 * 60 * 1000 };
      
      const dynamicRateLimit = this.getUserRateLimit(limits.requests, limits.windowMs);
      return dynamicRateLimit(req, res, next);
    };
  }

  // Burst protection rate limiting
  getBurstProtectionRateLimit() {
    return this.createRateLimit({
      windowMs: 1000, // 1 second
      max: 10, // 10 requests per second
      message: {
        success: false,
        error: {
          code: 'BURST_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests in a short time. Please slow down.',
          retryAfter: 1
        }
      }
    });
  }

  // Progressive rate limiting (gets stricter with repeated violations)
  getProgressiveRateLimit() {
    const violations = new Map();

    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute window

      if (!violations.has(key)) {
        violations.set(key, { count: 0, firstViolation: now, lastRequest: now });
      }

      const userViolations = violations.get(key);
      
      // Reset if window has passed
      if (now - userViolations.firstViolation > windowMs) {
        userViolations.count = 0;
        userViolations.firstViolation = now;
      }

      // Calculate dynamic limit based on violation history
      let maxRequests = 60; // Base limit: 60 requests per minute
      if (userViolations.count > 0) {
        maxRequests = Math.max(10, 60 - (userViolations.count * 10));
      }

      userViolations.lastRequest = now;

      // Check if limit exceeded
      if (userViolations.count >= maxRequests) {
        userViolations.count++;
        
        logger.warn('Progressive rate limit exceeded', {
          ip: req.ip,
          violations: userViolations.count,
          dynamicLimit: maxRequests
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'PROGRESSIVE_RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Dynamic limit: ${maxRequests} requests per minute.`,
            violations: userViolations.count,
            retryAfter: 60
          }
        });
      }

      next();
    };
  }

  // Clean up expired violations
  cleanupViolations() {
    setInterval(() => {
      const now = Date.now();
      const expireTime = 60 * 60 * 1000; // 1 hour

      for (const [key, data] of this.violations.entries()) {
        if (now - data.lastRequest > expireTime) {
          this.violations.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  // Get rate limit status for a key
  async getRateLimitStatus(key) {
    // Simple implementation - just return basic info
    return { 
      requests: 0, 
      remaining: 'unknown', 
      resetTime: null,
      store: 'memory'
    };
  }

  // Whitelist IPs (admin IPs, trusted partners)
  createWhitelistMiddleware(whitelistedIPs = []) {
    const defaultWhitelist = [
      '127.0.0.1',
      '::1',
      // Add admin IPs here
      ...whitelistedIPs
    ];

    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (defaultWhitelist.includes(clientIP)) {
        // Skip rate limiting for whitelisted IPs
        return next();
      }

      // Continue with normal rate limiting
      next();
    };
  }

  // Close connections
  async close() {
    // Nothing to close for in-memory store
    logger.info('Rate limit service closed');
  }
}

module.exports = new RateLimitService();