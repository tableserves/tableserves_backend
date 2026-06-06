import { toast } from 'react-toastify';

/**
 * Safe toast utility functions that ensure only strings are passed to toast
 */

/**
 * Safely extract a string message from various input types
 * @param {any} input - The input to extract a message from
 * @returns {string} - A safe string message
 */
const extractMessage = (input) => {
  // If input is null or undefined, return default message
  if (input == null) {
    return 'An error occurred';
  }
  
  // If input is already a string, return it
  if (typeof input === 'string') {
    return input;
  }
  
  // If input is a number or boolean, convert to string
  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }
  
  // If input is an Error object, return its message
  if (input instanceof Error) {
    return input.message || 'An error occurred';
  }
  
  // If input is an object, try to extract meaningful message
  if (typeof input === 'object') {
    // Try common message properties
    if (input.message) {
      return String(input.message);
    }
    
    if (input.error) {
      return String(input.error);
    }
    
    if (input.text) {
      return String(input.text);
    }
    
    if (input.data && typeof input.data === 'string') {
      return input.data;
    }
    
    if (input.data && input.data.message) {
      return String(input.data.message);
    }
    
    // If it's an API error response
    if (input.response && input.response.data) {
      if (typeof input.response.data === 'string') {
        return input.response.data;
      }
      if (input.response.data.message) {
        return String(input.response.data.message);
      }
    }
    
    // As a last resort, return a generic message
    return 'An error occurred';
  }
  
  // For any other type, convert to string
  return String(input);
};

/**
 * Safe toast error function
 * @param {any} message - The error message (can be string, object, Error, etc.)
 * @param {object} options - Toast options
 */
export const safeToastError = (message, options = {}) => {
  const safeMessage = extractMessage(message);
  return toast.error(safeMessage, options);
};

/**
 * Safe toast success function
 * @param {any} message - The success message (can be string, object, etc.)
 * @param {object} options - Toast options
 */
export const safeToastSuccess = (message, options = {}) => {
  const safeMessage = extractMessage(message);
  return toast.success(safeMessage, options);
};

/**
 * Safe toast info function
 * @param {any} message - The info message (can be string, object, etc.)
 * @param {object} options - Toast options
 */
export const safeToastInfo = (message, options = {}) => {
  const safeMessage = extractMessage(message);
  return toast.info(safeMessage, options);
};

/**
 * Safe toast warning function
 * @param {any} message - The warning message (can be string, object, etc.)
 * @param {object} options - Toast options
 */
export const safeToastWarning = (message, options = {}) => {
  const safeMessage = extractMessage(message);
  return toast.warning(safeMessage, options);
};

/**
 * Safe toast function (generic)
 * @param {any} message - The message (can be string, object, etc.)
 * @param {object} options - Toast options
 */
export const safeToast = (message, options = {}) => {
  const safeMessage = extractMessage(message);
  return toast(safeMessage, options);
};

// Export the original toast for cases where it's definitely safe
export { toast as originalToast } from 'react-toastify';

// Export safe versions as default
export default {
  error: safeToastError,
  success: safeToastSuccess,
  info: safeToastInfo,
  warning: safeToastWarning,
  toast: safeToast,
  original: toast
};
