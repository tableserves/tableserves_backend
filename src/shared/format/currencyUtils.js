/**
 * Currency Utility Functions
 * Handles currency formatting for Pakistani Rupees (RS/PKR) and other currencies
 */

/**
 * Format amount as Indian Rupees
 * @param {number} amount - The amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatINR = (amount, options = {}) => {
  const {
    showSymbol = true,
    showCode = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    useShortSymbol = false
  } = options;

  const numericAmount = Number(amount) || 0;

  // Format the number with Indian locale
  const formattedNumber = numericAmount.toLocaleString('en-IN', {
    minimumFractionDigits,
    maximumFractionDigits
  });

  if (showCode) {
    return `INR ${formattedNumber}`;
  }

  if (showSymbol) {
    const symbol = useShortSymbol ? '₹' : '₹';
    return `${symbol}${formattedNumber}`;
  }

  return formattedNumber;
};

/**
 * Format amount as Indian Rupees (alias for backward compatibility)
 * @param {number} amount - The amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatPKR = (amount, options = {}) => {
  return formatINR(amount, options);
};

/**
 * Format amount as Indian Rupees with symbol
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatRS = (amount) => {
  return formatINR(amount, { showSymbol: true });
};

/**
 * Format amount for receipt display (compact format)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string for receipts
 */
export const formatReceiptCurrency = (amount) => {
  const numericAmount = Number(amount) || 0;
  return `₹${numericAmount.toFixed(2)}`;
};

/**
 * Format amount for invoice display (formal format)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string for invoices
 */
export const formatInvoiceCurrency = (amount) => {
  return formatINR(amount, { showSymbol: true });
};

/**
 * Format amount for display in tables and lists
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string for tables
 */
export const formatTableCurrency = (amount) => {
  const numericAmount = Number(amount) || 0;

  // For large amounts, use compact notation
  if (numericAmount >= 100000) {
    const lakhs = numericAmount / 100000;
    return `₹${lakhs.toFixed(1)}L`;
  }

  if (numericAmount >= 1000) {
    const thousands = numericAmount / 1000;
    return `₹${thousands.toFixed(1)}K`;
  }

  return formatReceiptCurrency(amount);
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed amount
 */
export const parseCurrency = (currencyString) => {
  if (typeof currencyString === 'number') {
    return currencyString;
  }

  if (!currencyString || typeof currencyString !== 'string') {
    return 0;
  }

  // Remove currency symbols and parse
  const cleanString = currencyString
    .replace(/[₹Rs.,\s]/g, '')
    .replace(/[^\d.-]/g, '');

  return parseFloat(cleanString) || 0;
};

/**
 * Get currency symbol for Indian Rupees
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = () => {
  return '₹';
};

/**
 * Format amount with custom currency
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (INR, PKR, USD, EUR, etc.)
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'INR', options = {}) => {
  const numericAmount = Number(amount) || 0;

  switch (currency.toUpperCase()) {
    case 'INR':
    case 'PKR':
    case 'RS':
      return formatINR(numericAmount, options);

    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        ...options
      }).format(numericAmount);

    case 'EUR':
      return new Intl.NumberFormat('en-EU', {
        style: 'currency',
        currency: 'EUR',
        ...options
      }).format(numericAmount);

    case 'GBP':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        ...options
      }).format(numericAmount);

    default:
      return formatINR(numericAmount, options);
  }
};

/**
 * Default currency formatter for the application
 * Uses Indian Rupees as the default currency
 */
export const formatAmount = (amount) => {
  return formatINR(amount);
};

// Export default formatter
export default formatINR;
