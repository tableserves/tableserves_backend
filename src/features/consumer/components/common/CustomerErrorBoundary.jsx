import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaExclamationTriangle, FaHome, FaRedo, FaArrowLeft } from 'react-icons/fa';
import logger from '../../../../services/LoggingService';

/**
 * Customer-specific Error Fallback Component
 */
const CustomerErrorFallback = ({ 
  error, 
  resetErrorBoundary, 
  context = {} 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    navigate('/tableserve');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Log error details
  React.useEffect(() => {
    logger.error('Customer Error Boundary triggered', {
      error: error.message,
      stack: error.stack,
      pathname: location.pathname,
      context
    }, 'CustomerErrorBoundary');
  }, [error, location.pathname, context]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
        <FaExclamationTriangle className="text-6xl text-red-400 mx-auto mb-6" />
        
        <h1 className="text-2xl font-fredoka text-gray-800 mb-4">
          Oops! Something went wrong
        </h1>
        
        <p className="text-gray-600 font-raleway mb-6">
          We're sorry, but something unexpected happened. Don't worry, your cart and session are safe.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm font-mono">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-accent text-white py-3 px-6 rounded-xl font-raleway font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center"
          >
            <FaRedo className="mr-2" /> Try Again
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoBack}
              className="bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-raleway font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <FaArrowLeft className="mr-1" /> Back
            </button>
            
            <button
              onClick={handleGoHome}
              className="bg-blue-500 text-white py-3 px-4 rounded-xl font-raleway font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              <FaHome className="mr-1" /> Home
            </button>
          </div>
          
          <button
            onClick={handleReload}
            className="w-full text-gray-500 hover:text-gray-700 font-raleway text-sm py-2"
          >
            🔄 Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Customer Error Boundary Component
 */
export const CustomerErrorBoundary = ({ 
  children, 
  onError,
  context = {},
  fallback: CustomFallback 
}) => {
  const handleError = (error, errorInfo) => {
    // Log the error
    logger.error('Error caught by CustomerErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context
    }, 'CustomerErrorBoundary');

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  };

  const handleReset = () => {
    // Optional: Clear any error-related state
    logger.debug('Error boundary reset', { context }, 'CustomerErrorBoundary');
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={CustomFallback || CustomerErrorFallback}
      onError={handleError}
      onReset={handleReset}
      resetKeys={[location.pathname]} // Reset when route changes
    >
      {children}
    </ReactErrorBoundary>
  );
};

/**
 * Inline Error Boundary for smaller components
 */
export const InlineErrorBoundary = ({ 
  children, 
  fallback = "Something went wrong",
  onError 
}) => {
  const InlineFallback = ({ error, resetErrorBoundary }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p className="text-red-700 font-raleway text-sm mb-2">
        {fallback}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="text-red-600 hover:text-red-800 text-sm underline"
      >
        Try again
      </button>
    </div>
  );

  return (
    <ReactErrorBoundary
      FallbackComponent={InlineFallback}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
};

/**
 * Menu Section Error Boundary
 */
export const MenuErrorBoundary = ({ children, onError }) => {
  const MenuFallback = ({ error, resetErrorBoundary }) => (
    <div className="text-center py-12">
      <FaExclamationTriangle className="text-4xl text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-fredoka text-gray-700 mb-2">
        Menu Loading Error
      </h3>
      <p className="text-gray-500 font-raleway text-sm mb-4">
        We couldn't load this menu section
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm"
      >
        🔄 Retry
      </button>
    </div>
  );

  return (
    <ReactErrorBoundary
      FallbackComponent={MenuFallback}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
};

/**
 * Cart Error Boundary
 */
export const CartErrorBoundary = ({ children, onError }) => {
  const CartFallback = ({ error, resetErrorBoundary }) => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
      <p className="text-yellow-700 font-raleway text-sm mb-2">
        Cart temporarily unavailable
      </p>
      <button
        onClick={resetErrorBoundary}
        className="text-yellow-600 hover:text-yellow-800 text-sm underline"
      >
        Refresh cart
      </button>
    </div>
  );

  return (
    <ReactErrorBoundary
      FallbackComponent={CartFallback}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
};

/**
 * High-Order Component for adding error boundaries to customer components
 */
export const withCustomerErrorBoundary = (Component, options = {}) => {
  const {
    context = {},
    onError,
    fallback
  } = options;

  return function WrappedComponent(props) {
    return (
      <CustomerErrorBoundary 
        context={{ ...context, componentName: Component.name }}
        onError={onError}
        fallback={fallback}
      >
        <Component {...props} />
      </CustomerErrorBoundary>
    );
  };
};

export default CustomerErrorBoundary;