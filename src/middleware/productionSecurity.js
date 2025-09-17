const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { logger } = require('../utils/logger');
const { cacheService } = require('../services/cacheService');

/**
 * Production Security Middleware
 * Comprehensive security setup for production environment
 */

/**
 * Get the client's IP address, handling both IPv4 and IPv6
 */
const getClientIp = (req) => {
  // Handle IPv6 addresses by converting to a consistent format
  let ip = req.ip || req.socket.remoteAddress || '';
  
  // Handle IPv6 localhost format
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  // Remove IPv6 prefix if present
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Handle IPv6 addresses by replacing colons with dots
  if (ip.includes(':')) {
    ip = ip.replace(/:/g, '-');
  }
  
  return ip;
};

/**
 * Enhanced rate limiting with different tiers
 */
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message,
        type: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    
    // Custom key generator for more granular control
    keyGenerator: (req) => {
      // Get properly formatted IP address
      const clientIp = getClientIp(req);
      // Combine IP with user ID if authenticated
      const userId = req.user?.id;
      return userId ? `${clientIp}:${userId}` : clientIp;
    },
    
    // Custom handler for rate limit exceeded
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: getClientIp(req),
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        userId: req.user?.id || 'anonymous'
      });
      
      res.status(options.statusCode).json(options.message);
    },
    
    // Skip rate limiting for certain conditions
    skip: (req) => {
      // Skip for health checks and monitoring
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      
      // Skip for admin users in development
      if (process.env.NODE_ENV !== 'production' && req.user?.role === 'admin') {
        return true;
      }
      
      return false;
    }
  });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts
    'Too many authentication attempts. Please try again in 15 minutes.',
    false
  ),
  
  // Medium rate limiting for API endpoints
  api: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'Too many API requests. Please try again later.',
    true
  ),
  
  // Loose rate limiting for public endpoints
  public: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    200, // 200 requests
    'Too many requests. Please try again later.',
    true
  ),
  
  // Very strict for password reset
  passwordReset: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts
    'Too many password reset attempts. Please try again in 1 hour.',
    false
  ),
  
  // Strict for order creation
  orderCreation: createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    10, // 10 orders
    'Too many orders created. Please wait a moment before creating another order.',
    false
  )
};

/**
 * Enhanced helmet configuration for production
 */
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline styles for dynamic theming
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net'
      ],
      scriptSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : null
      ].filter(Boolean),
      imgSrc: [
        "'self'",
        'data:',
        'https://res.cloudinary.com',
        'https://images.unsplash.com'
      ],
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'wss://'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};

/**
 * Enhanced compression configuration
 */
const compressionConfig = {
  filter: (req, res) => {
    // Don't compress responses with Cache-Control: no-transform
    if (res.getHeader('Cache-Control')?.includes('no-transform')) {
      return false;
    }
    
    // Compress everything else
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress files > 1KB
  level: 6, // Compression level (1-9)
  chunkSize: 16384 // 16KB chunks
};

/**
 * Input validation and sanitization
 */
const inputSanitization = (req, res, next) => {
  try {
    // Sanitize common XSS patterns
    const sanitizeValue = (value) => {
      if (typeof value === 'string') {
        return value
          .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      }
      return value;
    };
    
    // Recursively sanitize object
    const sanitizeObject = (obj) => {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'object') {
              sanitizeObject(obj[key]);
            } else {
              obj[key] = sanitizeValue(obj[key]);
            }
          }
        }
      }
    };
    
    // Sanitize request body
    if (req.body) {
      sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      sanitizeObject(req.query);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error', error);
    next(error);
  }
};

/**
 * Request logging middleware
 */
const requestLogging = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Request received', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    contentLength: req.get('Content-Length') || 0
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length') || 0,
      userId: req.user?.id || 'anonymous'
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove server signature
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Request-ID', req.id || 'unknown');
  
  // Add cache control for sensitive endpoints
  if (req.path.includes('/auth') || req.path.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

/**
 * CORS configuration with dynamic origin validation
 */
const corsConfig = {
  origin: (origin, callback) => {
    // In production, be more strict about origins
    const isProduction = process.env.NODE_ENV === 'production';

    // Allow requests with no origin only in development or for mobile apps
    if (!origin) {
      if (isProduction) {
        // In production, log requests without origin for monitoring
        logger.info('Request without origin in production', {
          userAgent: 'unknown', // Will be filled by the actual request
          timestamp: new Date().toISOString()
        });
      }
      return callback(null, !isProduction); // Only allow in development
    }

    // Build allowed origins list based on environment
    const allowedOrigins = [];

    if (isProduction) {
      // Production origins
      if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
      if (process.env.ADMIN_PANEL_URL) allowedOrigins.push(process.env.ADMIN_PANEL_URL);
      if (process.env.API_BASE_URL) allowedOrigins.push(process.env.API_BASE_URL);

      // Add any additional production origins
      if (process.env.CORS_ADDITIONAL_ORIGINS) {
        const additionalOrigins = process.env.CORS_ADDITIONAL_ORIGINS.split(',').map(o => o.trim());
        allowedOrigins.push(...additionalOrigins);
      }

      // Common production domains
      allowedOrigins.push('https://tableserve.app', 'https://admin.tableserve.app', 'https://api.tableserve.app');
    } else {
      // Development origins
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080'
      );

      // Include environment URLs in development too
      if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
      if (process.env.ADMIN_PANEL_URL) allowedOrigins.push(process.env.ADMIN_PANEL_URL);
    }

    // Remove duplicates and filter out empty values
    const uniqueOrigins = [...new Set(allowedOrigins.filter(Boolean))];

    if (uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin blocked', {
        origin,
        allowedOrigins: uniqueOrigins,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      callback(new Error('CORS origin not allowed'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Version',
    'X-Request-ID',
    'Cache-Control'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-API-Version'
  ],
  maxAge: process.env.NODE_ENV === 'production' ? 86400 : 300, // 24 hours in prod, 5 minutes in dev
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

/**
 * API versioning middleware
 */
const apiVersioning = (req, res, next) => {
  const apiVersion = req.get('X-API-Version') || req.query.v || '1.0';
  
  // Validate API version
  const supportedVersions = ['1.0'];
  
  if (!supportedVersions.includes(apiVersion)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Unsupported API version',
        supportedVersions
      }
    });
  }
  
  req.apiVersion = apiVersion;
  next();
};

/**
 * Request timeout middleware
 */
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          method: req.method,
          url: req.originalUrl,
          timeout
        });
        
        res.status(408).json({
          success: false,
          error: {
            message: 'Request timeout',
            timeout
          }
        });
      }
    }, timeout);
    
    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    next();
  };
};

/**
 * IP whitelist middleware for admin endpoints
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }
    
    const clientIP = req.ip;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP not whitelisted for admin access', {
        ip: clientIP,
        allowedIPs
      });
      
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'IP_NOT_WHITELISTED'
        }
      });
    }
    
    next();
  };
};

/**
 * Enhanced authentication middleware
 */
const enhancedAuth = async (req, res, next) => {
  try {
    const token = req.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_TOKEN'
        }
      });
    }
    
    // Check if token is blacklisted (logout/invalidation)
    const isBlacklisted = await cacheService.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has been invalidated',
          code: 'TOKEN_BLACKLISTED'
        }
      });
    }
    
    // Verify token (this would use your existing JWT verification)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user session is still valid
    const sessionKey = `session:${decoded.userId}:${decoded.jti || 'default'}`;
    const sessionValid = await cacheService.get(sessionKey);
    
    if (!sessionValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Session expired or invalid',
          code: 'SESSION_INVALID'
        }
      });
    }
    
    // Add user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tokenIat: decoded.iat,
      sessionId: decoded.jti
    };
    
    // Update session activity
    await cacheService.set(sessionKey, {
      userId: decoded.userId,
      lastActivity: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      }
    });
  }
};

/**
 * Export all security middleware
 */
module.exports = {
  rateLimiters,
  helmetConfig,
  compressionConfig,
  corsConfig,
  inputSanitization,
  requestLogging,
  securityHeaders,
  apiVersioning,
  requestTimeout,
  ipWhitelist,
  enhancedAuth
};