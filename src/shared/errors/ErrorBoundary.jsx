/**
 * Error Boundary Components for TableServe Application
 *
 * Provides React error boundaries and error display components
 * for graceful error handling and user experience.
 */

import React, { Component } from 'react';
import errorHandlingService, { ERROR_TYPES, ERROR_SEVERITY } from './ErrorHandlingService';
import logger from '../../services/LoggingService';

/**
 * Main Error Boundary Component
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = Date.now().toString();

    // Create standardized error
    const standardizedError = errorHandlingService.createError({
      code: 1501, // INTERNAL_ERROR
      type: ERROR_TYPES.CLIENT,
      severity: ERROR_SEVERITY.HIGH,
      message: 'React component error',
      component: this.props.componentName || 'ErrorBoundary',
      originalError: error,
      details: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name
      }
    });

    // Handle through error service
    errorHandlingService.handleError(standardizedError, {
      component: this.props.componentName || 'ErrorBoundary',
      context: { errorInfo },
      showNotification: this.props.showNotification !== false
    });

    this.setState({
      error: standardizedError,
      errorInfo,
      errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(standardizedError, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // Use fallback component if provided
      if (this.props.FallbackComponent) {
        return (
          <this.props.FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
          />
        );
      }

      // Default error UI
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Display Component
 */
export function ErrorDisplay({
  error,
  errorInfo,
  onRetry,
  onReload,
  level = 'component',
  className = ''
}) {
  const isAppLevel = level === 'app';
  const isPageLevel = level === 'page';

  const getErrorIcon = () => {
    switch (error?.severity) {
      case ERROR_SEVERITY.CRITICAL:
        return '🚨';
      case ERROR_SEVERITY.HIGH:
        return '⚠️';
      case ERROR_SEVERITY.MEDIUM:
        return '⚡';
      default:
        return '😕';
    }
  };

  const getErrorTitle = () => {
    if (isAppLevel) return 'Application Error';
    if (isPageLevel) return 'Page Error';
    return 'Something went wrong';
  };

  const getErrorMessage = () => {
    if (error?.userMessage) return error.userMessage;
    if (isAppLevel) return 'The application encountered an unexpected error.';
    if (isPageLevel) return 'This page encountered an error and cannot be displayed.';
    return 'This component encountered an error.';
  };

  const recoverySuggestions = error ? errorHandlingService.getRecoverySuggestions(error) : [];

  const handleRecoveryAction = (action, onRetry, onReload) => {
    switch (action.toLowerCase()) {
      case 'retry':
      case 'try_again':
        if (onRetry) onRetry();
        break;
      case 'reload':
      case 'refresh_page':
        if (onReload) onReload();
        break;
      case 'login_again':
        window.location.href = '/login';
        break;
      case 'contact_support':
        // Could open a support modal or redirect to support page
        console.log('Contact support action triggered');
        break;
      default:
        if (onRetry) onRetry();
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-200 rounded-lg m-4 ${
        isAppLevel
          ? 'min-h-[50vh] bg-red-100'
          : isPageLevel
            ? 'min-h-[30vh] bg-red-50'
            : 'min-h-[200px] bg-gray-50 border-gray-200'
      } ${className}`}
    >
      <div className="max-w-md mb-8">
        <div className="text-5xl mb-4">{getErrorIcon()}</div>

        <div>
          <h2 className="text-red-600 mb-2 text-2xl font-semibold">{getErrorTitle()}</h2>
          <p className="text-gray-700 mb-4 leading-relaxed">{getErrorMessage()}</p>

          {error?.code && (
            <p className="text-gray-500 text-sm font-mono mb-4">Error Code: {error.code}</p>
          )}

          {process.env.NODE_ENV === 'development' && error?.message && (
            <details className="text-left mt-4 border border-gray-300 rounded p-2">
              <summary className="cursor-pointer font-medium text-gray-600">Technical Details</summary>
              <pre className="bg-gray-50 p-4 rounded text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap mt-2">
                {error.message}
                {error.originalError?.stack}
              </pre>
            </details>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {recoverySuggestions.length > 0 ? (
          <div>
            <h4 className="mb-2 text-gray-700 text-base">Try these solutions:</h4>
            <div className="flex flex-wrap gap-2 justify-center">
              {recoverySuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="px-4 py-2 rounded font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => handleRecoveryAction(suggestion.action, onRetry, onReload)}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
              onClick={onRetry}
            >
              Try Again
            </button>
            <button
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium transition-colors"
              onClick={onReload}
            >
              Reload Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Error Display for smaller spaces
 */
export function CompactErrorDisplay({ error, onRetry, onDismiss }) {
  return (
    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded p-3 my-2">
      <div className="flex items-center gap-2">
        <span className="text-base">⚠️</span>
        <span className="text-red-600 text-sm">{error?.userMessage || 'Something went wrong'}</span>
      </div>

      <div className="flex gap-2">
        {onRetry && (
          <button
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            className="px-2 py-1 bg-gray-500 text-white rounded text-xs font-bold hover:bg-gray-600 transition-colors"
            onClick={onDismiss}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Network Error Display
 */
export function NetworkErrorDisplay({ isOnline, onRetry }) {
  if (isOnline) return null;

  return (
    <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-3 my-2">
      <div className="flex items-center gap-3">
        <span className="text-xl">📡</span>
        <div>
          <h4 className="text-yellow-800 font-medium text-sm">No Internet Connection</h4>
          <p className="text-yellow-600 text-xs">Please check your connection and try again.</p>
        </div>
      </div>

      {onRetry && (
        <button
          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors"
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Helper function to handle recovery actions
function handleRecoveryAction(action, onRetry, onReload) {
  switch (action) {
    case 'RETRY':
      onRetry?.();
      break;
    case 'REFRESH_PAGE':
    case 'RELOAD_PAGE':
      onReload?.();
      break;
    case 'LOGIN_AGAIN':
      // Redirect to login or trigger logout
      window.location.href = '/login';
      break;
    case 'CONTACT_SUPPORT':
      // Open support contact
      window.open('mailto:support@tableserve.com', '_blank');
      break;
    case 'CHECK_CONNECTION':
      // Open network settings or show network info
      if (navigator.onLine) {
        alert('Your internet connection appears to be working. Please try again.');
      } else {
        alert('Please check your internet connection and try again.');
      }
      break;
    default:
      onRetry?.();
  }
}

/**
 * Higher-Order Component for adding error boundaries
 */
export function withErrorBoundary(WrappedComponent, errorBoundaryConfig = {}) {
  const {
    fallback,
    onError,
    level = 'component',
    componentName
  } = errorBoundaryConfig;

  function ComponentWithErrorBoundary(props) {
    return (
      <ErrorBoundary
        fallback={fallback}
        onError={onError}
        level={level}
        componentName={componentName || WrappedComponent.name}
        {...errorBoundaryConfig}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
}
