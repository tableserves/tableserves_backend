/**
 * Error Handling Service for TableServe Application
 * 
 * This service provides comprehensive error handling capabilities including:
 * - Centralized error classification and handling
 * - User-friendly error messages
 * - Error reporting and analytics
 * - Recovery strategies
 * - Integration with logging service
 */

import logger from './LoggingService';
import { store } from '../store';
import { addNotification } from '../store/slices/uiSlice';

// Error types and categories
export const ERROR_TYPES = {
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NETWORK: 'NETWORK',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC',
  DATA_INTEGRITY: 'DATA_INTEGRITY',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNKNOWN: 'UNKNOWN'
};

export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const ERROR_CODES = {
  // Authentication errors (1000-1099)
  INVALID_CREDENTIALS: 1001,
  TOKEN_EXPIRED: 1002,
  UNAUTHORIZED_ACCESS: 1003,
  ACCOUNT_LOCKED: 1004,
  ACCOUNT_SUSPENDED: 1005,
  
  // Validation errors (1100-1199)
  REQUIRED_FIELD_MISSING: 1101,
  INVALID_EMAIL_FORMAT: 1102,
  INVALID_PHONE_FORMAT: 1103,
  PASSWORD_TOO_WEAK: 1104,
  INVALID_DATA_FORMAT: 1105,
  
  // Business logic errors (1200-1299)
  VENDOR_LIMIT_EXCEEDED: 1201,
  TABLE_LIMIT_EXCEEDED: 1202,
  INSUFFICIENT_SUBSCRIPTION: 1203,
  DUPLICATE_ENTRY: 1204,
  INVALID_OPERATION: 1205,
  
  // Network/API errors (1300-1399)
  NETWORK_ERROR: 1301,
  API_TIMEOUT: 1302,
  SERVER_ERROR: 1303,
  SERVICE_UNAVAILABLE: 1304,
  RATE_LIMIT_EXCEEDED: 1305,
  
  // Data errors (1400-1499)
  DATA_NOT_FOUND: 1401,
  DATA_CORRUPTED: 1402,
  STORAGE_FULL: 1403,
  SYNC_FAILED: 1404,
  
  // System errors (1500-1599)
  INTERNAL_ERROR: 1501,
  FEATURE_NOT_AVAILABLE: 1502,
  MAINTENANCE_MODE: 1503,
  VERSION_MISMATCH: 1504,
};

class ErrorHandlingService {
  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.errorCounts = new Map();
    this.isOnline = navigator.onLine;
    
    this.setupGlobalErrorHandlers();
    this.setupNetworkMonitoring();
  }

  /**
   * Create a standardized error object
   * @param {Object} errorConfig - Error configuration
   * @returns {Error} Standardized error
   */
  createError({
    code,
    type = ERROR_TYPES.UNKNOWN,
    severity = ERROR_SEVERITY.MEDIUM,
    message,
    details = {},
    originalError = null,
    component = 'Unknown',
    recoverable = true,
    userMessage = null
  }) {
    const error = new Error(message);
    error.code = code;
    error.type = type;
    error.severity = severity;
    error.details = details;
    error.originalError = originalError;
    error.component = component;
    error.recoverable = recoverable;
    error.userMessage = userMessage || this.generateUserMessage(code, type, message);
    error.timestamp = new Date().toISOString();
    error.sessionId = this.getSessionId();
    error.userId = this.getCurrentUserId();
    
    return error;
  }

  /**
   * Handle an error with appropriate logging and user notification
   * @param {Error|Object} error - Error to handle
   * @param {Object} options - Handling options
   */
  handleError(error, options = {}) {
    const {
      showNotification = true,
      logError = true,
      reportError = true,
      component = 'Unknown',
      context = {},
      recoveryAction = null
    } = options;

    try {
      // Standardize the error if it's not already
      const standardError = this.standardizeError(error, component);
      
      // Log the error
      if (logError) {
        this.logError(standardError, context);
      }
      
      // Add to error history
      this.addToHistory(standardError);
      
      // Update error counts
      this.updateErrorCounts(standardError);
      
      // Show user notification if requested
      if (showNotification) {
        this.showErrorNotification(standardError);
      }
      
      // Report error for analytics if requested
      if (reportError && this.shouldReportError(standardError)) {
        this.reportError(standardError, context);
      }
      
      // Attempt recovery if available
      if (recoveryAction && standardError.recoverable) {
        this.attemptRecovery(standardError, recoveryAction);
      }
      
      return standardError;
    } catch (handlingError) {
      // Fallback error handling
      logger.error('Error handling failed', handlingError, 'ErrorHandlingService');
      console.error('Critical error in error handling:', handlingError);
    }
  }

  /**
   * Handle API errors specifically
   * @param {Object} apiError - API error response
   * @param {string} component - Component that triggered the error
   * @returns {Error} Standardized error
   */
  handleApiError(apiError, component = 'API') {
    let errorConfig = {
      component,
      originalError: apiError,
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.MEDIUM
    };

    // Analyze API error response
    if (apiError.response) {
      const { status, data } = apiError.response;
      
      switch (status) {
        case 400:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.INVALID_DATA_FORMAT,
            type: ERROR_TYPES.VALIDATION,
            message: 'Invalid request data',
            userMessage: 'Please check your input and try again.'
          };
          break;
          
        case 401:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.INVALID_CREDENTIALS,
            type: ERROR_TYPES.AUTHENTICATION,
            severity: ERROR_SEVERITY.HIGH,
            message: 'Authentication failed',
            userMessage: 'Please log in again.'
          };
          break;
          
        case 403:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.UNAUTHORIZED_ACCESS,
            type: ERROR_TYPES.AUTHORIZATION,
            severity: ERROR_SEVERITY.HIGH,
            message: 'Access denied',
            userMessage: 'You don\'t have permission to perform this action.'
          };
          break;
          
        case 404:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.DATA_NOT_FOUND,
            type: ERROR_TYPES.NOT_FOUND,
            message: 'Resource not found',
            userMessage: 'The requested item was not found.'
          };
          break;
          
        case 409:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.DUPLICATE_ENTRY,
            type: ERROR_TYPES.CONFLICT,
            message: 'Resource conflict',
            userMessage: 'This item already exists.'
          };
          break;
          
        case 429:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            type: ERROR_TYPES.RATE_LIMIT,
            message: 'Rate limit exceeded',
            userMessage: 'Too many requests. Please wait a moment and try again.'
          };
          break;
          
        case 500:
        case 502:
        case 503:
        case 504:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.SERVER_ERROR,
            type: ERROR_TYPES.SERVER,
            severity: ERROR_SEVERITY.HIGH,
            message: 'Server error',
            userMessage: 'Server is temporarily unavailable. Please try again later.'
          };
          break;
          
        default:
          errorConfig = {
            ...errorConfig,
            code: ERROR_CODES.NETWORK_ERROR,
            message: `HTTP ${status} error`,
            userMessage: 'Something went wrong. Please try again.'
          };
      }
      
      // Include API error details
      errorConfig.details = {
        status,
        statusText: apiError.response.statusText,
        url: apiError.config?.url,
        method: apiError.config?.method,
        data: data?.message || data?.error || data
      };
    } else if (apiError.request) {
      // Network error
      errorConfig = {
        ...errorConfig,
        code: ERROR_CODES.NETWORK_ERROR,
        type: ERROR_TYPES.NETWORK,
        severity: this.isOnline ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM,
        message: 'Network request failed',
        userMessage: this.isOnline 
          ? 'Network error. Please check your connection and try again.'
          : 'You appear to be offline. Please check your internet connection.',
        details: {
          timeout: apiError.code === 'ECONNABORTED',
          url: apiError.config?.url,
          method: apiError.config?.method
        }
      };
    } else {
      // Request setup error
      errorConfig = {
        ...errorConfig,
        code: ERROR_CODES.INTERNAL_ERROR,
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.HIGH,
        message: 'Request configuration error',
        userMessage: 'Application error. Please refresh the page and try again.'
      };
    }

    return this.createError(errorConfig);
  }

  /**
   * Handle business logic errors
   * @param {string} operation - Operation that failed
   * @param {string} reason - Reason for failure
   * @param {Object} context - Additional context
   * @returns {Error} Standardized error
   */
  handleBusinessError(operation, reason, context = {}) {
    let errorConfig = {
      type: ERROR_TYPES.BUSINESS_LOGIC,
      severity: ERROR_SEVERITY.MEDIUM,
      component: context.component || 'BusinessLogic',
      details: { operation, reason, ...context }
    };

    // Map common business errors
    switch (reason) {
      case 'VENDOR_LIMIT_EXCEEDED':
        errorConfig = {
          ...errorConfig,
          code: ERROR_CODES.VENDOR_LIMIT_EXCEEDED,
          message: 'Vendor limit exceeded',
          userMessage: 'You have reached the maximum number of vendors for your subscription plan.'
        };
        break;
        
      case 'INSUFFICIENT_SUBSCRIPTION':
        errorConfig = {
          ...errorConfig,
          code: ERROR_CODES.INSUFFICIENT_SUBSCRIPTION,
          message: 'Subscription limitation',
          userMessage: 'This feature requires a higher subscription plan.'
        };
        break;
        
      case 'DUPLICATE_ENTRY':
        errorConfig = {
          ...errorConfig,
          code: ERROR_CODES.DUPLICATE_ENTRY,
          message: 'Duplicate entry',
          userMessage: 'An item with this information already exists.'
        };
        break;
        
      default:
        errorConfig = {
          ...errorConfig,
          code: ERROR_CODES.INVALID_OPERATION,
          message: `Business rule violation: ${reason}`,
          userMessage: 'This operation is not allowed at this time.'
        };
    }

    return this.createError(errorConfig);
  }

  /**
   * Get error recovery suggestions
   * @param {Error} error - Error to get suggestions for
   * @returns {Array} Recovery suggestions
   */
  getRecoverySuggestions(error) {
    const suggestions = [];

    switch (error.type) {
      case ERROR_TYPES.AUTHENTICATION:
        suggestions.push(
          { action: 'LOGIN_AGAIN', label: 'Log in again' },
          { action: 'RESET_PASSWORD', label: 'Reset password' }
        );
        break;
        
      case ERROR_TYPES.NETWORK:
        suggestions.push(
          { action: 'RETRY', label: 'Try again' },
          { action: 'CHECK_CONNECTION', label: 'Check internet connection' },
          { action: 'REFRESH_PAGE', label: 'Refresh page' }
        );
        break;
        
      case ERROR_TYPES.VALIDATION:
        suggestions.push(
          { action: 'FIX_INPUT', label: 'Correct the input' },
          { action: 'CLEAR_FORM', label: 'Clear and restart' }
        );
        break;
        
      case ERROR_TYPES.BUSINESS_LOGIC:
        if (error.code === ERROR_CODES.VENDOR_LIMIT_EXCEEDED) {
          suggestions.push(
            { action: 'UPGRADE_PLAN', label: 'Upgrade subscription' },
            { action: 'REMOVE_VENDOR', label: 'Remove existing vendor' }
          );
        }
        break;
        
      default:
        suggestions.push(
          { action: 'RETRY', label: 'Try again' },
          { action: 'REFRESH_PAGE', label: 'Refresh page' },
          { action: 'CONTACT_SUPPORT', label: 'Contact support' }
        );
    }

    return suggestions;
  }

  // ===== PRIVATE METHODS =====

  standardizeError(error, component) {
    if (error.code && error.type) {
      // Already standardized
      return error;
    }

    // Convert various error types to standardized format
    let errorConfig = {
      component,
      originalError: error,
      type: ERROR_TYPES.UNKNOWN,
      severity: ERROR_SEVERITY.MEDIUM,
      message: error.message || 'Unknown error occurred'
    };

    // Analyze error to determine type and code
    if (error.name === 'ValidationError') {
      errorConfig.type = ERROR_TYPES.VALIDATION;
      errorConfig.code = ERROR_CODES.INVALID_DATA_FORMAT;
    } else if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      errorConfig.type = ERROR_TYPES.NETWORK;
      errorConfig.code = ERROR_CODES.NETWORK_ERROR;
    } else if (error.message?.includes('timeout')) {
      errorConfig.type = ERROR_TYPES.TIMEOUT;
      errorConfig.code = ERROR_CODES.API_TIMEOUT;
    } else {
      errorConfig.code = ERROR_CODES.INTERNAL_ERROR;
    }

    return this.createError(errorConfig);
  }

  generateUserMessage(code, type, message) {
    // Generate user-friendly messages based on error code and type
    const friendlyMessages = {
      [ERROR_CODES.NETWORK_ERROR]: 'Connection problem. Please check your internet and try again.',
      [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid username or password. Please try again.',
      [ERROR_CODES.VENDOR_LIMIT_EXCEEDED]: 'You\'ve reached your vendor limit. Consider upgrading your plan.',
      [ERROR_CODES.DATA_NOT_FOUND]: 'The requested information could not be found.',
      [ERROR_CODES.SERVER_ERROR]: 'Server is temporarily unavailable. Please try again later.',
    };

    return friendlyMessages[code] || 'Something went wrong. Please try again or contact support if the problem persists.';
  }

  logError(error, context) {
    const logData = {
      code: error.code,
      type: error.type,
      severity: error.severity,
      component: error.component,
      details: error.details,
      context,
      userId: error.userId,
      sessionId: error.sessionId
    };

    switch (error.severity) {
      case ERROR_SEVERITY.CRITICAL:
        logger.error(error.message, error.originalError, error.component);
        break;
      case ERROR_SEVERITY.HIGH:
        logger.error(error.message, logData, error.component);
        break;
      case ERROR_SEVERITY.MEDIUM:
        logger.warn(error.message, logData, error.component);
        break;
      case ERROR_SEVERITY.LOW:
        logger.info(error.message, logData, error.component);
        break;
    }
  }

  showErrorNotification(error) {
    try {
      const notification = {
        type: 'error',
        title: this.getNotificationTitle(error.type),
        message: error.userMessage,
        duration: this.getNotificationDuration(error.severity),
        actions: error.recoverable ? this.getRecoverySuggestions(error) : null
      };

      store.dispatch(addNotification(notification));
    } catch (notificationError) {
      logger.error('Failed to show error notification', notificationError, 'ErrorHandlingService');
    }
  }

  getNotificationTitle(errorType) {
    const titles = {
      [ERROR_TYPES.AUTHENTICATION]: 'Authentication Error',
      [ERROR_TYPES.AUTHORIZATION]: 'Access Denied',
      [ERROR_TYPES.VALIDATION]: 'Input Error',
      [ERROR_TYPES.NETWORK]: 'Connection Error',
      [ERROR_TYPES.SERVER]: 'Server Error',
      [ERROR_TYPES.BUSINESS_LOGIC]: 'Operation Failed',
      [ERROR_TYPES.NOT_FOUND]: 'Not Found',
      [ERROR_TYPES.CONFLICT]: 'Conflict',
    };

    return titles[errorType] || 'Error';
  }

  getNotificationDuration(severity) {
    const durations = {
      [ERROR_SEVERITY.LOW]: 3000,
      [ERROR_SEVERITY.MEDIUM]: 5000,
      [ERROR_SEVERITY.HIGH]: 8000,
      [ERROR_SEVERITY.CRITICAL]: 0 // Don't auto-dismiss critical errors
    };

    return durations[severity] || 5000;
  }

  addToHistory(error) {
    this.errorHistory.unshift({
      ...error,
      timestamp: new Date().toISOString()
    });

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  updateErrorCounts(error) {
    const key = `${error.type}_${error.code}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
  }

  shouldReportError(error) {
    // Only report certain types of errors
    return error.severity === ERROR_SEVERITY.HIGH || 
           error.severity === ERROR_SEVERITY.CRITICAL ||
           error.type === ERROR_TYPES.SERVER ||
           error.type === ERROR_TYPES.DATA_INTEGRITY;
  }

  reportError(error, context) {
    // In production, this would send to external error reporting service
    logger.info('Error reported for analytics', {
      code: error.code,
      type: error.type,
      severity: error.severity,
      component: error.component,
      context
    }, 'ErrorHandlingService');
  }

  attemptRecovery(error, recoveryAction) {
    try {
      if (typeof recoveryAction === 'function') {
        recoveryAction(error);
      }
    } catch (recoveryError) {
      logger.error('Error recovery failed', recoveryError, 'ErrorHandlingService');
    }
  }

  setupGlobalErrorHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createError({
        code: ERROR_CODES.INTERNAL_ERROR,
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.HIGH,
        message: 'Unhandled promise rejection',
        originalError: event.reason,
        component: 'Global'
      });

      this.handleError(error, { component: 'GlobalErrorHandler' });
    });

    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.createError({
        code: ERROR_CODES.INTERNAL_ERROR,
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.HIGH,
        message: 'Unhandled JavaScript error',
        originalError: event.error,
        component: 'Global',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });

      this.handleError(error, { component: 'GlobalErrorHandler' });
    });
  }

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('Network connection restored', {}, 'ErrorHandlingService');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.warn('Network connection lost', {}, 'ErrorHandlingService');
    });
  }

  getSessionId() {
    return sessionStorage.getItem('tableserve_session_id') || 'anonymous';
  }

  getCurrentUserId() {
    try {
      const state = store.getState();
      return state.ui?.auth?.user?.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  // ===== PUBLIC UTILITY METHODS =====

  getErrorHistory() {
    return [...this.errorHistory];
  }

  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      bySeverity: {},
      byComponent: {},
      recent: this.errorHistory.slice(0, 10)
    };

    this.errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byComponent[error.component] = (stats.byComponent[error.component] || 0) + 1;
    });

    return stats;
  }

  clearErrorHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
    logger.info('Error history cleared', {}, 'ErrorHandlingService');
  }
}

// Create singleton instance
const errorHandlingService = new ErrorHandlingService();

export default errorHandlingService;