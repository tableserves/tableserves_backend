const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Define file paths
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Production-optimized transports
const createTransports = () => {
  const transports = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // File transport configuration
  const fileTransportOptions = {
    maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE) || 10485760, // 10MB
    maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5,
    tailable: true,
    zippedArchive: isProduction, // Compress old logs in production
  };

  // Error log file
  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    ...fileTransportOptions
  }));

  // Combined log file
  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    level: isProduction ? 'info' : 'debug',
    ...fileTransportOptions
  }));

  // Production-specific logs
  if (isProduction) {
    // Separate file for HTTP requests in production
    if (process.env.LOG_HTTP_REQUESTS === 'true') {
      transports.push(new winston.transports.File({
        filename: path.join(logDir, 'http.log'),
        level: 'info',
        ...fileTransportOptions,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            return info.type === 'http' ? info : false;
          })()
        )
      }));
    }

    // Separate file for authentication events
    if (process.env.LOG_AUTH_EVENTS === 'true') {
      transports.push(new winston.transports.File({
        filename: path.join(logDir, 'auth.log'),
        level: 'info',
        ...fileTransportOptions,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            return info.type === 'auth' ? info : false;
          })()
        )
      }));
    }

    // Separate file for payment events
    if (process.env.LOG_PAYMENT_EVENTS === 'true') {
      transports.push(new winston.transports.File({
        filename: path.join(logDir, 'payment.log'),
        level: 'info',
        ...fileTransportOptions,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            return info.type === 'payment' ? info : false;
          })()
        )
      }));
    }

    // Console transport for production (minimal)
    transports.push(new winston.transports.Console({
      level: 'error', // Only errors to console in production
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  } else {
    // Development console transport (verbose)
    transports.push(new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  return transports;
};

// Create the logger with production optimizations
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports: createTransports(),
  // Production optimizations
  exitOnError: false, // Don't exit on handled exceptions
  silent: false,
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 3
    })
  ],
  // Rejection handling
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 3
    })
  ]
});

// Enhanced logger utilities for production
const loggerUtils = {
  // Authentication logging with security context
  logAuth: (message, userId, meta = {}) => {
    logger.info(`[AUTH] ${message}`, {
      type: 'auth',
      userId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  },

  // Business operation logging
  logBusiness: (message, entityId, meta = {}) => {
    logger.info(`[BUSINESS] ${message}`, {
      type: 'business',
      entityId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  },

  // Order tracking with enhanced metadata
  logOrder: (message, orderId, meta = {}) => {
    logger.info(`[ORDER] ${message}`, {
      type: 'order',
      orderId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  },

  // Payment logging with security considerations
  logPayment: (message, transactionId, meta = {}) => {
    // Sanitize sensitive payment data
    const sanitizedMeta = { ...meta };
    delete sanitizedMeta.cardNumber;
    delete sanitizedMeta.cvv;
    delete sanitizedMeta.pin;

    logger.info(`[PAYMENT] ${message}`, {
      type: 'payment',
      transactionId,
      timestamp: new Date().toISOString(),
      ...sanitizedMeta
    });
  },

  // System events logging
  logSystem: (message, meta = {}) => {
    logger.info(`[SYSTEM] ${message}`, {
      type: 'system',
      timestamp: new Date().toISOString(),
      ...meta
    });
  },

  // HTTP request logging
  logHTTP: (req, res, responseTime) => {
    const logData = {
      type: 'http',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // Add user context if available
    if (req.user) {
      logData.userId = req.user.id || req.user._id;
      logData.userRole = req.user.role;
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, logData);
    } else {
      logger.info(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, logData);
    }
  },

  // Security event logging
  logSecurity: (event, severity = 'warn', meta = {}) => {
    const logData = {
      type: 'security',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (severity === 'critical') {
      logger.error(`[SECURITY] ${event}`, logData);
    } else if (severity === 'high') {
      logger.warn(`[SECURITY] ${event}`, logData);
    } else {
      logger.info(`[SECURITY] ${event}`, logData);
    }
  },

  // Performance logging
  logPerformance: (operation, duration, meta = {}) => {
    const logData = {
      type: 'performance',
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (duration > 5000) { // Slow operations > 5 seconds
      logger.warn(`[PERFORMANCE] Slow operation: ${operation}`, logData);
    } else if (duration > 1000) { // Medium operations > 1 second
      logger.info(`[PERFORMANCE] ${operation}`, logData);
    } else {
      logger.debug(`[PERFORMANCE] ${operation}`, logData);
    }
  },

  // Database operation logging
  logDatabase: (operation, collection, meta = {}) => {
    if (process.env.LOG_DATABASE_QUERIES === 'true') {
      logger.debug(`[DATABASE] ${operation} on ${collection}`, {
        type: 'database',
        operation,
        collection,
        timestamp: new Date().toISOString(),
        ...meta
      });
    }
  },

  // Email event logging
  logEmail: (event, recipient, meta = {}) => {
    if (process.env.LOG_EMAIL_EVENTS === 'true') {
      logger.info(`[EMAIL] ${event}`, {
        type: 'email',
        event,
        recipient: recipient.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email
        timestamp: new Date().toISOString(),
        ...meta
      });
    }
  }
};

// Production health check for logger
const checkLoggerHealth = () => {
  try {
    logger.info('Logger health check', {
      type: 'system',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Logger health check failed:', error);
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
};

module.exports = {
  logger,
  loggerUtils,
  checkLoggerHealth
};