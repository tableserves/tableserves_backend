const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors defined above to the severity levels
winston.addColors(colors);

// Define which transports the logger must use to print out messages
const transports = [];

// Console transport with colors
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        ),
      ),
    })
  );
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Logger utility functions
 */
const loggerUtils = {
  /**
   * Log API request details
   */
  logRequest: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user._id : 'anonymous'
    };

    if (res.statusCode >= 400) {
      logger.error('API Request Error', logData);
    } else {
      logger.info('API Request', logData);
    }
  },

  /**
   * Log database operations
   */
  logDatabaseOperation: (operation, collection, duration, error = null) => {
    const logData = {
      operation,
      collection,
      duration: `${duration}ms`,
    };

    if (error) {
      logData.error = error.message;
      logger.error('Database Operation Failed', logData);
    } else {
      logger.debug('Database Operation', logData);
    }
  },

  /**
   * Log authentication events
   */
  logAuth: (event, userId, details = {}) => {
    const logData = {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    };

    if (event.includes('failed') || event.includes('error')) {
      logger.warn('Authentication Event', logData);
    } else {
      logger.info('Authentication Event', logData);
    }
  },

  /**
   * Log business operations
   */
  logBusiness: (operation, data = {}) => {
    const logData = {
      operation,
      timestamp: new Date().toISOString(),
      ...data
    };

    logger.info('Business Operation', logData);
  },

  /**
   * Log security events
   */
  logSecurity: (event, details = {}) => {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      ...details
    };

    logger.warn('Security Event', logData);
  }
};

module.exports = {
  logger,
  loggerUtils
};