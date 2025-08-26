/**
 * Error Handling Hooks for TableServe Application
 * 
 * React hooks that provide easy integration with the ErrorHandlingService
 * for consistent error handling across components.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import errorHandlingService, { ERROR_TYPES, ERROR_SEVERITY } from '../services/ErrorHandlingService';
import logger from '../services/LoggingService';

/**
 * Main error handling hook
 * @param {string} component - Component name for error tracking
 * @returns {Object} Error handling utilities
 */
export function useErrorHandler(component = 'UnknownComponent') {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const dispatch = useDispatch();

  // Handle error with full error service integration
  const handleError = useCallback((error, options = {}) => {
    const standardizedError = errorHandlingService.handleError(error, {
      component,
      ...options
    });
    
    setError(standardizedError);
    return standardizedError;
  }, [component]);

  // Handle API errors specifically
  const handleApiError = useCallback((apiError, context = {}) => {
    const standardizedError = errorHandlingService.handleApiError(apiError, component);
    setError(standardizedError);
    
    // Additional API error handling
    if (standardizedError.code === 1002) { // TOKEN_EXPIRED
      // Handle token expiration
      logger.info('Token expired, redirecting to login', {}, component);
      // You could dispatch a logout action here
    }
    
    return standardizedError;
  }, [component]);

  // Handle business logic errors
  const handleBusinessError = useCallback((operation, reason, context = {}) => {
    const businessError = errorHandlingService.handleBusinessError(operation, reason, {
      component,
      ...context
    });
    
    setError(businessError);
    return businessError;
  }, [component]);

  // Clear current error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Retry with error recovery
  const retry = useCallback(async (retryFunction, maxAttempts = 3) => {
    if (!retryFunction) return;

    setIsRetrying(true);
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await retryFunction();
        clearError();
        setIsRetrying(false);
        return result;
      } catch (retryError) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          handleError(retryError, {
            context: { retryAttempts: attempts, maxAttempts }
          });
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
    
    setIsRetrying(false);
  }, [handleError, clearError]);

  // Get recovery suggestions for current error
  const recoverySuggestions = useMemo(() => {
    if (!error) return [];
    return errorHandlingService.getRecoverySuggestions(error);
  }, [error]);

  return {
    error,
    isRetrying,
    handleError,
    handleApiError,
    handleBusinessError,
    clearError,
    retry,
    recoverySuggestions,
    hasError: !!error,
    errorType: error?.type,
    errorSeverity: error?.severity,
    isRecoverable: error?.recoverable ?? true
  };
}

/**
 * Hook for async operations with error handling
 * @param {Function} asyncFunction - Async function to execute
 * @param {Object} options - Configuration options
 * @returns {Object} Async operation state and controls
 */
export function useAsyncWithErrorHandling(asyncFunction, options = {}) {
  const {
    immediate = false,
    component = 'AsyncOperation',
    onSuccess = null,
    onError = null,
    retryAttempts = 1
  } = options;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const { handleError, clearError, retry } = useErrorHandler(component);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      clearError();
      
      const result = await asyncFunction(...args);
      
      setData(result);
      if (onSuccess) onSuccess(result);
      
      return result;
    } catch (error) {
      const handledError = handleError(error);
      if (onError) onError(handledError);
      throw handledError;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, handleError, clearError, onSuccess, onError]);

  const executeWithRetry = useCallback(async (...args) => {
    return retry(() => execute(...args), retryAttempts);
  }, [execute, retry, retryAttempts]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    loading,
    data,
    execute,
    executeWithRetry,
    ...useErrorHandler(component)
  };
}

/**
 * Hook for form validation with error handling
 * @param {Object} validationRules - Validation rules
 * @param {string} component - Component name
 * @returns {Object} Form validation utilities
 */
export function useFormValidation(validationRules = {}, component = 'Form') {
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(true);
  const { handleError } = useErrorHandler(component);

  const validateField = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    for (const rule of rules) {
      if (rule.required && (!value || value.toString().trim() === '')) {
        return rule.message || `${fieldName} is required`;
      }
      
      if (rule.pattern && value && !rule.pattern.test(value)) {
        return rule.message || `${fieldName} format is invalid`;
      }
      
      if (rule.minLength && value && value.length < rule.minLength) {
        return rule.message || `${fieldName} must be at least ${rule.minLength} characters`;
      }
      
      if (rule.maxLength && value && value.length > rule.maxLength) {
        return rule.message || `${fieldName} must not exceed ${rule.maxLength} characters`;
      }
      
      if (rule.custom && typeof rule.custom === 'function') {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          return customResult || rule.message || `${fieldName} is invalid`;
        }
      }
    }
    
    return null;
  }, [validationRules]);

  const validateForm = useCallback((formData) => {
    const newErrors = {};
    let formIsValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        formIsValid = false;
      }
    });

    setErrors(newErrors);
    setIsValid(formIsValid);

    if (!formIsValid) {
      handleError(
        errorHandlingService.createError({
          code: 1101, // REQUIRED_FIELD_MISSING or INVALID_DATA_FORMAT
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.LOW,
          message: 'Form validation failed',
          component,
          details: { errors: newErrors }
        }),
        { showNotification: false } // Don't show notification for form validation
      );
    }

    return formIsValid;
  }, [validationRules, validateField, handleError, component]);

  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setIsValid(true);
  }, []);

  return {
    errors,
    isValid,
    validateField,
    validateForm,
    clearFieldError,
    clearAllErrors,
    hasErrors: Object.keys(errors).length > 0
  };
}

/**
 * Hook for monitoring application errors
 * @returns {Object} Error monitoring utilities
 */
export function useErrorMonitoring() {
  const [errorStats, setErrorStats] = useState(null);
  const [errorHistory, setErrorHistory] = useState([]);

  const refreshStats = useCallback(() => {
    const stats = errorHandlingService.getErrorStats();
    setErrorStats(stats);
    setErrorHistory(errorHandlingService.getErrorHistory());
  }, []);

  const clearHistory = useCallback(() => {
    errorHandlingService.clearErrorHistory();
    refreshStats();
  }, [refreshStats]);

  // Refresh stats on mount and periodically
  useEffect(() => {
    refreshStats();
    
    const interval = setInterval(refreshStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    errorStats,
    errorHistory,
    refreshStats,
    clearHistory,
    hasRecentErrors: errorHistory.length > 0
  };
}

/**
 * Hook for handling network-specific errors
 * @param {string} component - Component name
 * @returns {Object} Network error handling utilities
 */
export function useNetworkErrorHandler(component = 'NetworkComponent') {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastNetworkError, setLastNetworkError] = useState(null);
  const { handleError } = useErrorHandler(component);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastNetworkError(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      const offlineError = errorHandlingService.createError({
        code: 1301, // NETWORK_ERROR
        type: ERROR_TYPES.NETWORK,
        severity: ERROR_SEVERITY.MEDIUM,
        message: 'Network connection lost',
        component,
        userMessage: 'You appear to be offline. Some features may not work properly.'
      });
      
      setLastNetworkError(offlineError);
      handleError(offlineError, { reportError: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [component, handleError]);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        timeout: 5000 
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    isOnline,
    lastNetworkError,
    checkConnection,
    hasNetworkError: !!lastNetworkError
  };
}

/**
 * Higher-order component for error boundary functionality
 * @param {Function} Component - Component to wrap
 * @param {Object} options - Error boundary options
 * @returns {Function} Wrapped component
 */
export function withErrorHandler(Component, options = {}) {
  const {
    fallback: FallbackComponent = null,
    onError = null,
    component: componentName = Component.name || 'WrappedComponent'
  } = options;

  return function ErrorHandledComponent(props) {
    const { handleError, error, clearError } = useErrorHandler(componentName);

    const handleComponentError = useCallback((error, errorInfo) => {
      const componentError = errorHandlingService.createError({
        code: 1501, // INTERNAL_ERROR
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.HIGH,
        message: 'Component error',
        component: componentName,
        originalError: error,
        details: errorInfo
      });

      handleError(componentError);
      if (onError) onError(componentError, errorInfo);
    }, [handleError, componentName, onError]);

    if (error && FallbackComponent) {
      return (
        <FallbackComponent 
          error={error} 
          clearError={clearError}
          retry={() => window.location.reload()}
        />
      );
    }

    try {
      return <Component {...props} onError={handleComponentError} />;
    } catch (renderError) {
      handleComponentError(renderError, { componentStack: '' });
      
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={error} 
            clearError={clearError}
            retry={() => window.location.reload()}
          />
        );
      }
      
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>Please refresh the page or contact support if the problem persists.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
  };
}