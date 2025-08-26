/**
 * Error Boundary Components for TableServe Application
 * 
 * Provides React error boundaries and error display components
 * for graceful error handling and user experience.
 */

import React, { Component } from 'react';
import errorHandlingService, { ERROR_TYPES, ERROR_SEVERITY } from '../services/ErrorHandlingService';
import logger from '../services/LoggingService';

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

  return (
    <div className={`error-display ${level}-error ${className}`}>
      <div className="error-content">
        <div className="error-icon">
          {getErrorIcon()}
        </div>
        
        <div className="error-details">
          <h2 className="error-title">{getErrorTitle()}</h2>
          <p className="error-message">{getErrorMessage()}</p>
          
          {error?.code && (
            <p className="error-code">
              Error Code: {error.code}
            </p>
          )}
          
          {process.env.NODE_ENV === 'development' && error?.message && (
            <details className="error-technical">
              <summary>Technical Details</summary>
              <pre className="error-stack">
                {error.message}
                {error.originalError?.stack}
              </pre>
            </details>
          )}
        </div>
      </div>

      <div className="error-actions">
        {recoverySuggestions.length > 0 ? (
          <div className="recovery-suggestions">
            <h4>Try these solutions:</h4>
            <div className="recovery-buttons">
              {recoverySuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className={`recovery-button ${suggestion.action.toLowerCase()}`}
                  onClick={() => handleRecoveryAction(suggestion.action, onRetry, onReload)}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="default-actions">
            <button className="retry-button" onClick={onRetry}>
              Try Again
            </button>
            <button className="reload-button" onClick={onReload}>
              Reload Page
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .error-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          margin: 1rem;
        }

        .app-error {
          min-height: 50vh;
          background-color: #fee2e2;
        }

        .page-error {
          min-height: 30vh;
          background-color: #fef2f2;
        }

        .component-error {
          min-height: 200px;
          background-color: #fefefe;
          border: 1px solid #e5e5e5;
        }

        .error-content {
          max-width: 500px;
          margin-bottom: 2rem;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-title {
          color: #dc2626;
          margin-bottom: 0.5rem;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .error-message {
          color: #374151;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .error-code {
          color: #6b7280;
          font-size: 0.875rem;
          font-family: monospace;
          margin-bottom: 1rem;
        }

        .error-technical {
          text-align: left;
          margin-top: 1rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0.5rem;
        }

        .error-technical summary {
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
        }

        .error-stack {
          background-color: #f9fafb;
          padding: 1rem;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #374151;
          overflow-x: auto;
          white-space: pre-wrap;
          margin-top: 0.5rem;
        }

        .error-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .recovery-suggestions h4 {
          margin-bottom: 0.5rem;
          color: #374151;
          font-size: 1rem;
        }

        .recovery-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }

        .recovery-button,
        .retry-button,
        .reload-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .retry-button {
          background-color: #3b82f6;
          color: white;
        }

        .retry-button:hover {
          background-color: #2563eb;
        }

        .reload-button {
          background-color: #6b7280;
          color: white;
        }

        .reload-button:hover {
          background-color: #4b5563;
        }

        .recovery-button.login_again {
          background-color: #10b981;
          color: white;
        }

        .recovery-button.retry {
          background-color: #3b82f6;
          color: white;
        }

        .recovery-button.refresh_page {
          background-color: #6b7280;
          color: white;
        }

        .recovery-button.contact_support {
          background-color: #f59e0b;
          color: white;
        }

        .default-actions {
          display: flex;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Compact Error Display for smaller spaces
 */
export function CompactErrorDisplay({ error, onRetry, onDismiss }) {
  return (
    <div className="compact-error">
      <div className="compact-error-content">
        <span className="compact-error-icon">⚠️</span>
        <span className="compact-error-message">
          {error?.userMessage || 'Something went wrong'}
        </span>
      </div>
      
      <div className="compact-error-actions">
        {onRetry && (
          <button className="compact-retry-button" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button className="compact-dismiss-button" onClick={onDismiss}>
            ×
          </button>
        )}
      </div>

      <style jsx>{`
        .compact-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          padding: 0.75rem;
          margin: 0.5rem 0;
        }

        .compact-error-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .compact-error-icon {
          font-size: 1rem;
        }

        .compact-error-message {
          color: #dc2626;
          font-size: 0.875rem;
        }

        .compact-error-actions {
          display: flex;
          gap: 0.5rem;
        }

        .compact-retry-button,
        .compact-dismiss-button {
          padding: 0.25rem 0.5rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .compact-retry-button {
          background-color: #3b82f6;
          color: white;
        }

        .compact-dismiss-button {
          background-color: #6b7280;
          color: white;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

/**
 * Network Error Display
 */
export function NetworkErrorDisplay({ isOnline, onRetry }) {
  if (isOnline) return null;

  return (
    <div className="network-error">
      <div className="network-error-content">
        <span className="network-error-icon">📡</span>
        <div className="network-error-text">
          <h4>No Internet Connection</h4>
          <p>Please check your connection and try again.</p>
        </div>
      </div>
      
      {onRetry && (
        <button className="network-retry-button" onClick={onRetry}>
          Try Again
        </button>
      )}

      <style jsx>{`
        .network-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          padding: 1rem;
          margin: 1rem 0;
        }

        .network-error-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .network-error-icon {
          font-size: 1.5rem;
        }

        .network-error-text h4 {
          margin: 0 0 0.25rem 0;
          color: #92400e;
          font-size: 1rem;
        }

        .network-error-text p {
          margin: 0;
          color: #a16207;
          font-size: 0.875rem;
        }

        .network-retry-button {
          padding: 0.5rem 1rem;
          background-color: #f59e0b;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .network-retry-button:hover {
          background-color: #d97706;
        }
      `}</style>
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