/**
 * Comprehensive Error Handling and Offline Support for Order Tracking
 * Provides robust error handling, offline capabilities, and fallback mechanisms
 */

import { logger } from '../shared/logging/logger';

export class OrderTrackingErrorHandler {
  constructor() {
    this.isOnline = navigator.onLine;
    this.offlineQueue = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.baseRetryDelay = 1000;
    
    this.setupNetworkListeners();
  }

  /**
   * Setup network status listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Enhanced error categorization
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    const status = error.status || error.response?.status;

    // Network errors
    if (!this.isOnline || 
        message.includes('network') || 
        message.includes('fetch') ||
        message.includes('econnrefused') ||
        code === 'network_error') {
      return {
        type: 'NETWORK_ERROR',
        severity: 'warning',
        retryable: true,
        userMessage: 'Network connection issue. Please check your internet connection.',
        technicalMessage: error.message
      };
    }

    // Timeout errors
    if (message.includes('timeout') || 
        message.includes('etimedout') ||
        status === 408) {
      return {
        type: 'TIMEOUT_ERROR',
        severity: 'warning',
        retryable: true,
        userMessage: 'Request timed out. The server is taking too long to respond.',
        technicalMessage: error.message
      };
    }

    // Authentication errors
    if (status === 401 || 
        message.includes('unauthorized') ||
        message.includes('authentication')) {
      return {
        type: 'AUTH_ERROR',
        severity: 'error',
        retryable: false,
        userMessage: 'Authentication failed. Please log in again.',
        technicalMessage: error.message
      };
    }

    // Authorization errors
    if (status === 403 || 
        message.includes('forbidden') ||
        message.includes('access denied')) {
      return {
        type: 'ACCESS_ERROR',
        severity: 'error',
        retryable: false,
        userMessage: 'Access denied. You do not have permission to view this order.',
        technicalMessage: error.message
      };
    }

    // Not found errors
    if (status === 404 || 
        message.includes('not found') ||
        message.includes('order not found')) {
      return {
        type: 'NOT_FOUND_ERROR',
        severity: 'error',
        retryable: false,
        userMessage: 'Order not found. Please verify the order number and phone number.',
        technicalMessage: error.message
      };
    }

    // Server errors
    if (status >= 500 || 
        message.includes('server error') ||
        message.includes('internal error')) {
      return {
        type: 'SERVER_ERROR',
        severity: 'error',
        retryable: true,
        userMessage: 'Server error. Please try again later.',
        technicalMessage: error.message
      };
    }

    // Rate limiting
    if (status === 429 || 
        message.includes('rate limit') ||
        message.includes('too many requests')) {
      return {
        type: 'RATE_LIMIT_ERROR',
        severity: 'warning',
        retryable: true,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        technicalMessage: error.message
      };
    }

    // Data validation errors
    if (status === 400 || 
        message.includes('validation') ||
        message.includes('invalid')) {
      return {
        type: 'VALIDATION_ERROR',
        severity: 'error',
        retryable: false,
        userMessage: 'Invalid data provided. Please check your input.',
        technicalMessage: error.message
      };
    }

    // Unknown errors
    return {
      type: 'UNKNOWN_ERROR',
      severity: 'error',
      retryable: false,
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalMessage: error.message || 'Unknown error'
    };
  }

  /**
   * Handle errors with appropriate response
   */
  async handleError(error, context = {}) {
    const errorInfo = this.categorizeError(error);
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log the error
    logger.error('Order tracking error handled', {
      errorId,
      errorType: errorInfo.type,
      severity: errorInfo.severity,
      context,
      originalError: error,
      userMessage: errorInfo.userMessage,
      technicalMessage: errorInfo.technicalMessage
    });

    // Store error for analytics
    this.storeErrorForAnalytics(errorInfo, context, errorId);

    return {
      id: errorId,
      ...errorInfo,
      timestamp: new Date().toISOString(),
      context
    };
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryOperation(operation, operationId, maxRetries = this.maxRetries) {
    const attempts = this.retryAttempts.get(operationId) || 0;
    
    if (attempts >= maxRetries) {
      throw new Error(`Maximum retry attempts (${maxRetries}) exceeded for operation: ${operationId}`);
    }

    try {
      const result = await operation();
      this.retryAttempts.delete(operationId); // Reset on success
      return result;
    } catch (error) {
      const errorInfo = this.categorizeError(error);
      
      if (!errorInfo.retryable) {
        throw error;
      }

      this.retryAttempts.set(operationId, attempts + 1);
      
      // Calculate retry delay with exponential backoff and jitter
      const delay = Math.min(
        this.baseRetryDelay * Math.pow(2, attempts) + Math.random() * 1000,
        30000 // Max 30 seconds
      );

      logger.info('Retrying operation', {
        operationId,
        attempt: attempts + 1,
        maxRetries,
        delay,
        errorType: errorInfo.type
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryOperation(operation, operationId, maxRetries);
    }
  }

  /**
   * Queue operations for offline processing
   */
  queueForOffline(operation, priority = 'normal') {
    if (this.isOnline) {
      return operation();
    }

    const queueItem = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      priority,
      timestamp: Date.now(),
      retries: 0
    };

    this.offlineQueue.push(queueItem);
    
    // Sort by priority and timestamp
    this.offlineQueue.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.timestamp - b.timestamp;
    });

    logger.info('Operation queued for offline processing', {
      queueId: queueItem.id,
      priority,
      queueSize: this.offlineQueue.length
    });

    return Promise.reject(new Error('Operation queued for offline processing'));
  }

  /**
   * Process offline queue when connection is restored
   */
  async processOfflineQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    logger.info('Processing offline queue', { queueSize: this.offlineQueue.length });

    const processPromises = this.offlineQueue.map(async (item) => {
      try {
        await item.operation();
        logger.info('Offline operation completed', { queueId: item.id });
        return { success: true, id: item.id };
      } catch (error) {
        item.retries++;
        if (item.retries < this.maxRetries) {
          logger.warn('Offline operation failed, will retry', { 
            queueId: item.id, 
            retries: item.retries,
            error: error.message 
          });
          return { success: false, id: item.id, retry: true };
        } else {
          logger.error('Offline operation failed permanently', { 
            queueId: item.id, 
            error: error.message 
          });
          return { success: false, id: item.id, retry: false };
        }
      }
    });

    const results = await Promise.allSettled(processPromises);
    
    // Remove successful operations and permanently failed ones
    this.offlineQueue = this.offlineQueue.filter((item, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        const { success, retry } = result.value;
        return !success && retry; // Keep only failed items that should retry
      }
      return true; // Keep items where processing failed
    });

    logger.info('Offline queue processing completed', { 
      remainingItems: this.offlineQueue.length 
    });
  }

  /**
   * Store error information for analytics
   */
  storeErrorForAnalytics(errorInfo, context, errorId) {
    try {
      const errorData = {
        id: errorId,
        type: errorInfo.type,
        severity: errorInfo.severity,
        userMessage: errorInfo.userMessage,
        technicalMessage: errorInfo.technicalMessage,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        isOnline: this.isOnline
      };

      // Store in localStorage for later transmission
      const existingErrors = JSON.parse(localStorage.getItem('orderTrackingErrors') || '[]');
      existingErrors.push(errorData);
      
      // Keep only last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }
      
      localStorage.setItem('orderTrackingErrors', JSON.stringify(existingErrors));
    } catch (storageError) {
      logger.warn('Failed to store error for analytics', { storageError: storageError.message });
    }
  }

  /**
   * Get stored errors for analytics transmission
   */
  getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem('orderTrackingErrors') || '[]');
    } catch (error) {
      logger.warn('Failed to retrieve stored errors', { error: error.message });
      return [];
    }
  }

  /**
   * Clear stored errors (after successful transmission)
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem('orderTrackingErrors');
    } catch (error) {
      logger.warn('Failed to clear stored errors', { error: error.message });
    }
  }

  /**
   * Get network status
   */
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
      offlineQueueSize: this.offlineQueue.length,
      activeRetries: this.retryAttempts.size
    };
  }

  /**
   * Reset all state (useful for testing)
   */
  reset() {
    this.offlineQueue = [];
    this.retryAttempts.clear();
  }
}

// Export singleton instance
export default new OrderTrackingErrorHandler();