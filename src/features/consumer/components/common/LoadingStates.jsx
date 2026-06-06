import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaSpinner, 
  FaExclamationTriangle, 
  FaWifi, 
  FaArrowLeft, 
  FaRedo,
  FaStore,
  FaUtensils,
  FaShoppingCart 
} from 'react-icons/fa';
import { MdOutlineRamenDining } from 'react-icons/md';

/**
 * Consistent Loading Component for Customer-facing Pages
 */
export const LoadingSpinner = ({ 
  message = "Loading...", 
  submessage = "Please wait a moment",
  size = "large",
  color = "accent" 
}) => {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-12 h-12", 
    large: "w-16 h-16"
  };

  const colorClasses = {
    accent: "border-accent",
    blue: "border-blue-500",
    gray: "border-gray-400"
  };

  return (
    <div className="flex flex-col items-center justify-center p-10">
      <div className={`${sizeClasses[size]} ${colorClasses[color]} border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
      <p className="text-lg font-medium text-gray-600 mb-2">{message}</p>
      {submessage && (
        <p className="text-sm text-gray-500">{submessage}</p>
      )}
    </div>
  );
};

/**
 * Menu Loading Component with Food Icons
 */
export const MenuLoadingSpinner = ({ 
  message = "Loading delicious menu...",
  submessage = "Please wait while we fetch the latest items"
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="mb-4"
      >
        <MdOutlineRamenDining className="text-6xl text-accent" />
      </motion.div>
      <p className="text-lg font-medium text-gray-600 mb-2">{message}</p>
      <p className="text-sm text-gray-500">{submessage}</p>
    </div>
  );
};

/**
 * Zone/Shop Loading Component
 */
export const ZoneLoadingSpinner = ({ 
  message = "Loading zone shops...",
  submessage = "Please wait while we fetch available vendors"
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mb-4"
        >
          <FaStore className="text-6xl text-accent mx-auto" />
        </motion.div>
        <p className="text-gray-600 font-raleway text-lg">{message}</p>
        <p className="text-gray-500 font-raleway text-sm mt-2">{submessage}</p>
      </div>
    </div>
  );
};

/**
 * Generic Error Component with Retry Functionality
 */
export const ErrorState = ({ 
  title = "Something went wrong",
  message = "An error occurred while loading the content",
  onRetry,
  onGoBack,
  showRetry = true,
  showGoBack = true,
  icon: Icon = FaExclamationTriangle,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-10 ${className}`}>
      <Icon className="text-6xl text-red-400 mx-auto mb-4" />
      <h2 className="text-2xl font-fredoka text-gray-800 mb-4">{title}</h2>
      <p className="text-gray-600 font-raleway mb-6 text-center max-w-md">{message}</p>
      
      <div className="space-y-3 w-full max-w-sm">
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-accent text-white py-3 px-6 rounded-xl font-raleway font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center"
          >
            <FaRedo className="mr-2" /> Try Again
          </button>
        )}
        
        {showGoBack && onGoBack && (
          <button
            onClick={onGoBack}
            className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-raleway font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <FaArrowLeft className="mr-2" /> Go Back
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Network Error Component
 */
export const NetworkError = ({ onRetry, onGoBack }) => {
  return (
    <ErrorState
      title="Connection Problem"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      onGoBack={onGoBack}
      icon={FaWifi}
    />
  );
};

/**
 * Menu Error Component
 */
export const MenuError = ({ onRetry, onGoBack, error }) => {
  return (
    <ErrorState
      title="Menu Loading Failed"
      message={error || "We couldn't load the menu items. This might be a temporary issue."}
      onRetry={onRetry}
      onGoBack={onGoBack}
      icon={FaUtensils}
    />
  );
};

/**
 * Zone Error Component
 */
export const ZoneError = ({ onRetry, onGoBack, error }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <ErrorState
          title="Zone Not Available"
          message={error || "The requested zone could not be loaded or is not currently available."}
          onRetry={onRetry}
          onGoBack={onGoBack}
          icon={FaStore}
          className="bg-white rounded-2xl shadow-lg"
        />
      </div>
    </div>
  );
};

/**
 * Empty State Component for when no data is found
 */
export const EmptyState = ({ 
  title = "Nothing found",
  message = "No items to display",
  actionText,
  onAction,
  icon: Icon = FaShoppingCart 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      <Icon className="text-6xl text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-fredoka text-gray-600 mb-2">{title}</h2>
      <p className="text-gray-500 font-raleway mb-4">{message}</p>
      
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

/**
 * Full Page Loading Wrapper
 */
export const FullPageLoading = ({ 
  children, 
  message = "Loading...",
  submessage = "Please wait",
  className = "min-h-screen bg-white"
}) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-center">
        {children || <LoadingSpinner message={message} submessage={submessage} />}
      </div>
    </div>
  );
};

/**
 * Inline Loading Component for smaller sections
 */
export const InlineLoading = ({ 
  message = "Loading...",
  size = "small" 
}) => {
  return (
    <div className="flex items-center justify-center py-4">
      <LoadingSpinner message={message} size={size} />
    </div>
  );
};

/**
 * Progress Bar Component
 */
export const ProgressBar = ({ progress = 0, message = "Loading..." }) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{message}</span>
        <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div 
          className="bg-accent h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};

/**
 * Skeleton Loading Components
 */
export const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-300"></div>
      <div className="p-6">
        <div className="h-6 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="flex justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-10 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export default {
  LoadingSpinner,
  MenuLoadingSpinner,
  ZoneLoadingSpinner,
  ErrorState,
  NetworkError,
  MenuError,
  ZoneError,
  EmptyState,
  FullPageLoading,
  InlineLoading,
  ProgressBar,
  SkeletonCard,
  SkeletonGrid
};