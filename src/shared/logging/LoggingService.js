/**
 * Centralized Logging Service for TableServe Application
 * Provides environment-aware logging with different levels and formatting
 */

import EnvironmentConfig from '../app/config/EnvironmentConfig';

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class LoggingService {
  constructor() {
    this.isDevelopment = EnvironmentConfig.isDevelopment;
    this.isProduction = EnvironmentConfig.isProduction;
    this.enableConsole = EnvironmentConfig.logging.enableConsole;
    this.enableRemote = EnvironmentConfig.logging.enableRemote;
    
    // Set log level based on environment config
    const configLevel = EnvironmentConfig.logging.level;
    this.currentLevel = LOG_LEVELS[configLevel] || (this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR);
    
    this.logHistory = [];
    this.maxHistorySize = EnvironmentConfig.logging.maxEntries || 500;
    this.retention = EnvironmentConfig.logging.retention || 86400000; // 24 hours default
    
    // Clean up old logs periodically
    this.setupCleanup();
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or additional data
   * @param {string} component - Component name where error occurred
   */
  error(message, error = null, component = 'Unknown') {
    if (this.currentLevel >= LOG_LEVELS.ERROR) {
      const logEntry = this._createLogEntry('ERROR', message, { error, component });
      
      if (this.enableConsole) {
        console.error(`[ERROR] ${component}: ${message}`, error);
      }
      
      this._addToHistory(logEntry);
      
      // Send to external service in production
      if (this.enableRemote && this.isProduction) {
        this._sendToExternalService(logEntry);
      }
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   * @param {Object} data - Additional data
   * @param {string} component - Component name
   */
  warn(message, data = null, component = 'Unknown') {
    if (this.currentLevel >= LOG_LEVELS.WARN) {
      const logEntry = this._createLogEntry('WARN', message, { data, component });
      
      if (this.enableConsole) {
        console.warn(`[WARN] ${component}: ${message}`, data);
      }
      
      this._addToHistory(logEntry);
    }
  }

  /**
   * Log an info message
   * @param {string} message - Info message
   * @param {Object} data - Additional data
   * @param {string} component - Component name
   */
  info(message, data = null, component = 'Unknown') {
    if (this.currentLevel >= LOG_LEVELS.INFO) {
      const logEntry = this._createLogEntry('INFO', message, { data, component });
      
      if (this.enableConsole) {
        console.info(`[INFO] ${component}: ${message}`, data);
      }
      
      this._addToHistory(logEntry);
    }
  }

  /**
   * Log a debug message (only in development)
   * @param {string} message - Debug message
   * @param {Object} data - Additional data
   * @param {string} component - Component name
   */
  debug(message, data = null, component = 'Unknown') {
    if (this.currentLevel >= LOG_LEVELS.DEBUG && this.enableConsole) {
      const logEntry = this._createLogEntry('DEBUG', message, { data, component });
      console.debug(`[DEBUG] ${component}: ${message}`, data);
      this._addToHistory(logEntry);
    }
  }

  /**
   * Log API calls (development only)
   * @param {string} method - HTTP method
   * @param {string} url - API endpoint
   * @param {Object} data - Request/response data
   */
  api(method, url, data = null) {
    if (this.isDevelopment) {
      console.log(`[API] ${method.toUpperCase()} ${url}`, data);
    }
  }

  /**
   * Log route navigation (development only)
   * @param {string} from - Previous route
   * @param {string} to - New route
   * @param {Object} params - Route parameters
   */
  route(from, to, params = {}) {
    if (this.isDevelopment) {
      console.log(`[ROUTE] ${from} → ${to}`, params);
    }
  }

  /**
   * Log vendor operations for debugging
   * @param {string} operation - Operation type
   * @param {string} zoneId - Zone ID
   * @param {Object} data - Operation data
   */
  vendor(operation, zoneId, data = null) {
    if (this.isDevelopment) {
      console.log(`[VENDOR] ${operation} - Zone: ${zoneId}`, data);
    }
  }

  /**
   * Get recent logs (for admin panel or debugging)
   * @param {number} limit - Number of logs to return
   * @returns {Array} Recent log entries
   */
  getRecentLogs(limit = 50) {
    return this.logHistory.slice(-limit);
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Create a structured log entry
   * @private
   */
  _createLogEntry(level, message, data) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  /**
   * Add log entry to history with size management
   * @private
   */
  _addToHistory(logEntry) {
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Send logs to external service (placeholder for production logging)
   * @private
   */
  _sendToExternalService(logEntry) {
    // In production, you would send critical errors to services like:
    // - Sentry
    // - LogRocket
    // - CloudWatch
    // - Custom logging endpoint
    
    // Example implementation:
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(logEntry)
    // }).catch(() => {}); // Silent fail for logging
  }

  /**
   * Performance timing logging
   * @param {string} operation - Operation name
   * @param {number} startTime - Start timestamp
   * @param {string} component - Component name
   */
  performance(operation, startTime, component = 'Unknown') {
    if (EnvironmentConfig.performance.enableMonitoring && this.enableConsole) {
      const duration = performance.now() - startTime;
      console.log(`[PERF] ${component}: ${operation} took ${duration.toFixed(2)}ms`);
      
      // Log slow operations as warnings
      if (duration > 100) {
        this.warn(`Slow operation detected: ${operation}`, { duration, component }, 'Performance');
      }
    }
  }

  /**
   * Set up periodic cleanup of old logs
   * @private
   */
  setupCleanup() {
    // Clean up every hour
    setInterval(() => {
      this.cleanupOldLogs();
    }, 3600000);
  }

  /**
   * Clean up old log entries based on retention policy
   */
  cleanupOldLogs() {
    const cutoffTime = Date.now() - this.retention;
    const initialCount = this.logHistory.length;
    
    this.logHistory = this.logHistory.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime > cutoffTime;
    });
    
    const removedCount = initialCount - this.logHistory.length;
    if (removedCount > 0 && this.isDevelopment) {
      console.log(`[LOG CLEANUP] Removed ${removedCount} old log entries`);
    }
  }

  /**
   * Update log level dynamically
   * @param {string} level - New log level (ERROR, WARN, INFO, DEBUG)
   */
  setLogLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      this.currentLevel = LOG_LEVELS[level];
      this.info(`Log level changed to ${level}`, { level, numericLevel: this.currentLevel }, 'LoggingService');
    } else {
      this.warn(`Invalid log level: ${level}`, { validLevels: Object.keys(LOG_LEVELS) }, 'LoggingService');
    }
  }

  /**
   * Get current log level
   * @returns {string} Current log level name
   */
  getLogLevel() {
    const levelNames = Object.entries(LOG_LEVELS);
    const currentLevelName = levelNames.find(([name, value]) => value === this.currentLevel)?.[0];
    return currentLevelName || 'UNKNOWN';
  }
}

// Create singleton instance
const logger = new LoggingService();

export default logger;