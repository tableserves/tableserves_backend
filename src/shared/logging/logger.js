/**
 * Production Logger Utility
 * Provides structured logging with performance monitoring
 */

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
    this.logLevel = this.getLogLevel();
    this.metrics = {
      logs: 0,
      errors: 0,
      warnings: 0,
      performance: 0
    };
    
    // Performance tracking
    this.performanceMarks = new Map();
  }

  /**
   * Get current log level based on environment
   */
  getLogLevel() {
    if (this.isDevelopment) return 'debug';
    return import.meta.env.VITE_LOG_LEVEL || 'warn';
  }

  /**
   * Check if log level should be processed
   */
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log message with metadata
   */
  formatMessage(level, message, meta = {}, component = null) {
    const timestamp = new Date().toISOString();
    const logId = this.generateLogId();
    
    return {
      id: logId,
      timestamp,
      level: level.toUpperCase(),
      message,
      component,
      meta,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      buildVersion: __APP_VERSION__ || '1.0.0',
      buildTime: __BUILD_TIME__ || null
    };
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session ID from localStorage or generate new one
   */
  getSessionId() {
    let sessionId = localStorage.getItem('tableserve_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('tableserve_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Send log to external service in production
   */
  async sendToService(logData) {
    if (!this.isProduction) return;

    try {
      // Send to external logging service (e.g., LogRocket, Sentry, etc.)
      if (window.LR && typeof window.LR.log === 'function') {
        window.LR.log(logData.level, logData.message, logData.meta);
      }
      
      // Send critical errors to backend
      if (logData.level === 'ERROR') {
        await fetch('/api/v1/logs/error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logData)
        });
      }
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('Failed to send log to service:', error);
    }
  }

  /**
   * Debug level logging
   */
  debug(message, meta = {}, component = null) {
    if (!this.shouldLog('debug')) return;
    
    const logData = this.formatMessage('debug', message, meta, component);
    
    if (this.isDevelopment) {
      console.debug(`[${logData.timestamp}] ${component ? `[${component}] ` : ''}${message}`, meta);
    }
    
    this.metrics.logs++;
  }

  /**
   * Info level logging
   */
  info(message, meta = {}, component = null) {
    if (!this.shouldLog('info')) return;
    
    const logData = this.formatMessage('info', message, meta, component);
    
    if (this.isDevelopment) {
      console.info(`[${logData.timestamp}] ${component ? `[${component}] ` : ''}${message}`, meta);
    }
    
    this.sendToService(logData);
    this.metrics.logs++;
  }

  /**
   * Warning level logging
   */
  warn(message, meta = {}, component = null) {
    if (!this.shouldLog('warn')) return;
    
    const logData = this.formatMessage('warn', message, meta, component);
    
    console.warn(`[${logData.timestamp}] ${component ? `[${component}] ` : ''}${message}`, meta);
    this.sendToService(logData);
    this.metrics.warnings++;
  }

  /**
   * Error level logging
   */
  error(message, error = null, component = null) {
    const meta = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause && { cause: error.cause })
    } : {};
    
    const logData = this.formatMessage('error', message, meta, component);
    
    console.error(`[${logData.timestamp}] ${component ? `[${component}] ` : ''}${message}`, error || meta);
    this.sendToService(logData);
    this.metrics.errors++;
    
    // Track error in performance monitoring
    if (window.performance && window.performance.mark) {
      window.performance.mark(`error-${logData.id}`);
    }
  }

  /**
   * Performance logging
   */
  perf(label, duration = null, meta = {}) {
    const logData = this.formatMessage('perf', `Performance: ${label}`, {
      duration,
      ...meta
    }, 'Performance');
    
    if (this.isDevelopment) {
      console.log(`[PERF] ${label}: ${duration}ms`, meta);
    }
    
    this.sendToService(logData);
    this.metrics.performance++;
  }

  /**
   * Start performance measurement
   */
  perfStart(label) {
    const startTime = performance.now();
    this.performanceMarks.set(label, startTime);
    
    if (window.performance && window.performance.mark) {
      window.performance.mark(`${label}-start`);
    }
    
    return startTime;
  }

  /**
   * End performance measurement
   */
  perfEnd(label, meta = {}) {
    const endTime = performance.now();
    const startTime = this.performanceMarks.get(label);
    
    if (startTime) {
      const duration = endTime - startTime;
      this.performanceMarks.delete(label);
      
      if (window.performance && window.performance.mark && window.performance.measure) {
        window.performance.mark(`${label}-end`);
        window.performance.measure(label, `${label}-start`, `${label}-end`);
      }
      
      this.perf(label, duration, meta);
      return duration;
    }
    
    this.warn(`Performance measurement '${label}' was not started`);
    return null;
  }

  /**
   * Log API request
   */
  apiRequest(method, url, duration, status, meta = {}) {
    const message = `API ${method.toUpperCase()} ${url} - ${status} (${duration}ms)`;
    const logMeta = {
      method,
      url,
      duration,
      status,
      ...meta
    };
    
    if (status >= 400) {
      this.error(message, null, 'API');
    } else if (duration > 2000) {
      this.warn(`Slow API response: ${message}`, logMeta, 'API');
    } else {
      this.debug(message, logMeta, 'API');
    }
  }

  /**
   * Log user action
   */
  userAction(action, component, meta = {}) {
    this.info(`User action: ${action}`, {
      action,
      component,
      ...meta
    }, 'UserAction');
  }

  /**
   * Log navigation
   */
  navigation(from, to, meta = {}) {
    this.debug(`Navigation: ${from} -> ${to}`, {
      from,
      to,
      ...meta
    }, 'Navigation');
  }

  /**
   * Log WebSocket events
   */
  websocket(event, data = {}) {
    this.debug(`WebSocket: ${event}`, data, 'WebSocket');
  }

  /**
   * Get logging metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      logs: 0,
      errors: 0,
      warnings: 0,
      performance: 0
    };
  }

  /**
   * Get performance entries
   */
  getPerformanceEntries() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return [];
    }
    
    return {
      navigation: window.performance.getEntriesByType('navigation'),
      resource: window.performance.getEntriesByType('resource'),
      measure: window.performance.getEntriesByType('measure'),
      mark: window.performance.getEntriesByType('mark')
    };
  }

  /**
   * Create child logger with component context
   */
  createChildLogger(component) {
    return {
      debug: (message, meta = {}) => this.debug(message, meta, component),
      info: (message, meta = {}) => this.info(message, meta, component),
      warn: (message, meta = {}) => this.warn(message, meta, component),
      error: (message, error = null) => this.error(message, error, component),
      perf: (label, duration = null, meta = {}) => this.perf(label, duration, meta),
      perfStart: (label) => this.perfStart(`${component}-${label}`),
      perfEnd: (label, meta = {}) => this.perfEnd(`${component}-${label}`, meta),
      userAction: (action, meta = {}) => this.userAction(action, component, meta)
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };