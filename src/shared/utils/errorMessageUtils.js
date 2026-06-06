/**
 * Error Message Utilities
 * Provides user-friendly error messages for common scenarios
 */

/**
 * Maps technical error responses to user-friendly messages
 * @param {Object|String} error - Error object or message
 * @param {String} context - Context where error occurred (e.g., 'login', 'signup', 'general')
 * @returns {String} User-friendly error message
 */
export const getUserFriendlyErrorMessage = (error, context = 'general') => {
  // Handle different error formats
  let errorMessage = '';
  let statusCode = null;

  // Extract error information from different formats
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && error.data) {
    // RTK Query error format
    if (error.data.error && error.data.error.message) {
      errorMessage = error.data.error.message;
    } else if (error.data.message) {
      errorMessage = error.data.message;
    } else if (typeof error.data === 'string') {
      errorMessage = error.data;
    }
    statusCode = error.status;
  } else if (error && error.response) {
    // Axios error format
    if (error.response.data && error.response.data.error && error.response.data.error.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (typeof error.response.data === 'string') {
      errorMessage = error.response.data;
    }
    statusCode = error.response.status;
  } else if (error && error.message) {
    errorMessage = error.message;
  } else if (error && typeof error === 'object') {
    errorMessage = error.error || error.message || JSON.stringify(error);
  }

  // If we already have a user-friendly message from backend, use it
  if (errorMessage && !isErrorMessageTechnical(errorMessage)) {
    return errorMessage;
  }

  // Context-specific error message mapping
  switch (context) {
    case 'login':
      return getLoginErrorMessage(errorMessage, statusCode);
    case 'signup':
    case 'registration':
      return getSignupErrorMessage(errorMessage, statusCode);
    case 'profile':
      return getProfileErrorMessage(errorMessage, statusCode);
    case 'password':
      return getPasswordErrorMessage(errorMessage, statusCode);
    default:
      return getGeneralErrorMessage(errorMessage, statusCode);
  }
};

/**
 * Checks if an error message appears to be technical (for developers) vs user-friendly
 * @param {String} message - Error message to check
 * @returns {Boolean} True if message appears technical
 */
const isErrorMessageTechnical = (message) => {
  if (!message || typeof message !== 'string') return true;
  
  const technicalPatterns = [
    /^\d{3}\s/, // Starts with HTTP status code (e.g., "404 Not Found")
    /error\s*:\s*\d+/i, // Contains "error: 123"
    /code\s*:\s*\d+/i, // Contains "code: 123"
    /stack\s*trace/i, // Contains "stack trace"
    /internal\s*server\s*error/i, // Contains "internal server error"
    /mongo\w*error/i, // Contains MongoDB errors
    /validation\s*error/i, // Contains "validation error"
    /cast\s*error/i, // Contains "cast error"
    /duplicate\s*key/i, // Contains "duplicate key"
    /11000/i, // MongoDB duplicate key error code
    /ECONNREFUSED/i, // Network connection errors
    /ETIMEDOUT/i, // Timeout errors
    /jwt/i, // JWT errors
    /token/i, // Token errors (unless in friendly context)
  ];

  return technicalPatterns.some(pattern => pattern.test(message));
};

/**
 * Get user-friendly login error messages
 */
const getLoginErrorMessage = (originalMessage, statusCode) => {
  const lowerMessage = originalMessage.toLowerCase();

  if (statusCode === 401 || lowerMessage.includes('unauthorized') || lowerMessage.includes('invalid credentials')) {
    return 'Username or password is incorrect. Please check your credentials and try again.';
  }
  
  if (statusCode === 429 || lowerMessage.includes('too many')) {
    return 'Too many login attempts. Please wait a moment and try again.';
  }
  
  if (lowerMessage.includes('account locked') || lowerMessage.includes('locked')) {
    return 'Your account has been temporarily locked. Please try again later or contact support.';
  }
  
  if (lowerMessage.includes('account suspended') || lowerMessage.includes('suspended')) {
    return 'Your account has been suspended. Please contact support for assistance.';
  }
  
  if (lowerMessage.includes('token') || lowerMessage.includes('session')) {
    return 'Your session has expired. Please log in again.';
  }

  return 'Unable to log in at this time. Please check your credentials and try again.';
};

/**
 * Get user-friendly signup/registration error messages
 */
const getSignupErrorMessage = (originalMessage, statusCode) => {
  const lowerMessage = originalMessage.toLowerCase();

  if (statusCode === 409 || lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
    if (lowerMessage.includes('email')) {
      return 'An account with this email already exists. Please use a different email or try logging in.';
    }
    if (lowerMessage.includes('phone')) {
      return 'An account with this phone number already exists. Please use a different phone number or try logging in.';
    }
    return 'An account with this information already exists. Please try logging in or use different details.';
  }

  if (statusCode === 400 || lowerMessage.includes('validation')) {
    if (lowerMessage.includes('email')) {
      return 'Please enter a valid email address.';
    }
    if (lowerMessage.includes('phone')) {
      return 'Please enter a valid phone number.';
    }
    if (lowerMessage.includes('password')) {
      return 'Password must be at least 6 characters long.';
    }
    return 'Please check your information and try again.';
  }

  return 'Unable to create account. Please check your information and try again.';
};

/**
 * Get user-friendly profile error messages
 */
const getProfileErrorMessage = (originalMessage, statusCode) => {
  const lowerMessage = originalMessage.toLowerCase();

  if (statusCode === 409 || lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
    if (lowerMessage.includes('email')) {
      return 'This email is already being used by another account. Please use a different email.';
    }
    if (lowerMessage.includes('phone')) {
      return 'This phone number is already being used by another account. Please use a different number.';
    }
    return 'This information is already in use. Please try different details.';
  }

  if (statusCode === 403) {
    return 'You do not have permission to update this information.';
  }

  return 'Unable to update profile. Please check your information and try again.';
};

/**
 * Get user-friendly password error messages
 */
const getPasswordErrorMessage = (originalMessage, statusCode) => {
  const lowerMessage = originalMessage.toLowerCase();

  if (statusCode === 401 || lowerMessage.includes('current password') || lowerMessage.includes('incorrect')) {
    return 'Current password is incorrect. Please try again.';
  }

  if (lowerMessage.includes('weak') || lowerMessage.includes('requirements')) {
    return 'Password must be at least 6 characters long and include letters and numbers.';
  }

  if (lowerMessage.includes('match')) {
    return 'Passwords do not match. Please try again.';
  }

  return 'Unable to change password. Please check your information and try again.';
};

/**
 * Get general user-friendly error messages
 */
const getGeneralErrorMessage = (originalMessage, statusCode) => {
  if (!statusCode && !originalMessage) {
    return 'Something went wrong. Please try again.';
  }

  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your information and try again.';
    case 401:
      return 'Please log in to access this feature.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested information was not found.';
    case 409:
      return 'This information already exists. Please try with different details.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Invalid Credentials';
    default:
      // Check for network errors
      if (originalMessage && (
        originalMessage.includes('Network Error') ||
        originalMessage.includes('ECONNREFUSED') ||
        originalMessage.includes('ETIMEDOUT') ||
        originalMessage.includes('fetch')
      )) {
        return 'Network connection issue. Please check your internet connection and try again.';
      }
      
      return 'Something went wrong. Please try again or contact support if the problem persists.';
  }
};

/**
 * Get error message with helpful suggestions
 * @param {Object|String} error - Error object or message  
 * @param {String} context - Context where error occurred
 * @returns {Object} Object with message and optional suggestions
 */
export const getErrorWithSuggestions = (error, context = 'general') => {
  const message = getUserFriendlyErrorMessage(error, context);
  const suggestions = [];

  // Add context-specific suggestions
  if (context === 'login') {
    if (message.includes('Username or password')) {
      suggestions.push('Make sure Caps Lock is off');
      suggestions.push('Try resetting your password');
    }
    if (message.includes('too many attempts')) {
      suggestions.push('Wait a few minutes before trying again');
    }
  } else if (context === 'signup') {
    if (message.includes('already exists')) {
      suggestions.push('Try logging in instead');
      suggestions.push('Use a different email or phone number');
    }
  } else if (message.includes('network') || message.includes('connection')) {
    suggestions.push('Check your internet connection');
    suggestions.push('Try refreshing the page');
  } else if (message.includes('server') || message.includes('experiencing issues')) {
    suggestions.push('Wait a few moments and try again');
    suggestions.push('Check our status page for updates');
  }

  return {
    message,
    suggestions: suggestions.length > 0 ? suggestions : null
  };
};

export default {
  getUserFriendlyErrorMessage,
  getErrorWithSuggestions,
  isErrorMessageTechnical
};