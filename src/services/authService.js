const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateTokenPair, generateSecureToken, hashToken } = require('./jwtService');
const { APIError } = require('../middleware/errorHandler');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Hash password with bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    logger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new APIError('Failed to process password', 500);
  }
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - Password match result
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    
    logger.debug('Password comparison completed', { isMatch });
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw new APIError('Failed to verify password', 500);
  }
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }

  // Simplified requirements - at least 2 of the following 4 criteria
  let criteriaCount = 0;

  if (/[a-z]/.test(password)) criteriaCount++;
  if (/[A-Z]/.test(password)) criteriaCount++;
  if (/\d/.test(password)) criteriaCount++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) criteriaCount++;

  if (password.length >= 6 && password.length < 8 && criteriaCount < 3) {
    errors.push('Password must contain at least 3 different character types (uppercase, lowercase, numbers, special characters)');
  } else if (password.length >= 8 && criteriaCount < 2) {
    errors.push('Password must contain at least 2 different character types (uppercase, lowercase, numbers, special characters)');
  }

  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 * @param {string} password - Password to analyze
 * @returns {Object} - Strength analysis
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  let feedback = [];

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Bonus for character variety
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) score += 1;

  // Determine strength level
  let level;
  if (score < 3) {
    level = 'weak';
    feedback.push('Use a longer password with mixed characters');
  } else if (score < 5) {
    level = 'medium';
    feedback.push('Good! Consider adding more character variety');
  } else if (score < 7) {
    level = 'strong';
    feedback.push('Great password strength');
  } else {
    level = 'very-strong';
    feedback.push('Excellent password strength');
  }

  return { score, level, feedback };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} - Validation result
 */
const validateEmail = (email) => {
  const errors = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  // Check email length
  if (email.length > 254) {
    errors.push('Email is too long');
  }

  // Check for common disposable email domains
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
    'mailinator.com', 'throwaway.email'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    errors.push('Disposable email addresses are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
    email: email.toLowerCase().trim(), // Return normalized email
    domain
  };
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {Object} - Validation result
 */
const validatePhone = (phone) => {
  const errors = [];

  if (!phone) {
    errors.push('Phone number is required');
    return { isValid: false, errors };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    errors.push('Phone number must be at least 10 digits');
  }

  if (digitsOnly.length > 15) {
    errors.push('Phone number must be less than 15 digits');
  }

  // Basic international phone format check
  const phoneRegex = /^[1-9][\d]{9,14}$/;
  if (!phoneRegex.test(digitsOnly)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: digitsOnly
  };
};

/**
 * Generate email verification token
 * @param {string} email - User email
 * @returns {Object} - Verification token data
 */
const generateEmailVerificationToken = (email) => {
  const token = generateSecureToken(32);
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  logger.info('Email verification token generated', { 
    email: email.toLowerCase(),
    expiresAt 
  });

  return {
    token, // Send this in email
    hashedToken, // Store this in database
    expiresAt
  };
};

/**
 * Generate password reset token
 * @param {string} email - User email
 * @returns {Object} - Reset token data
 */
const generatePasswordResetToken = (email) => {
  const token = generateSecureToken(32);
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  loggerUtils.logAuth('Password reset token generated', 'system', { 
    email: email.toLowerCase(),
    expiresAt 
  });

  return {
    token, // Send this in email
    hashedToken, // Store this in database
    expiresAt
  };
};

/**
 * Verify email verification token
 * @param {string} token - Token from email
 * @param {string} storedHashedToken - Stored hashed token
 * @param {Date} expiresAt - Token expiration date
 * @returns {boolean} - Verification result
 */
const verifyEmailToken = (token, storedHashedToken, expiresAt) => {
  try {
    // Check if token is expired
    if (new Date() > expiresAt) {
      logger.debug('Email verification token expired');
      return false;
    }

    // Hash provided token and compare
    const hashedProvidedToken = hashToken(token);
    const isValid = hashedProvidedToken === storedHashedToken;

    logger.debug('Email verification token checked', { isValid });
    return isValid;
  } catch (error) {
    logger.error('Error verifying email token:', error);
    return false;
  }
};

/**
 * Generate OTP for phone verification
 * @returns {Object} - OTP data
 */
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const hashedOTP = hashToken(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  logger.debug('OTP generated', { expiresAt });

  return {
    otp, // Send this via SMS
    hashedOTP, // Store this in database
    expiresAt
  };
};

/**
 * Verify OTP
 * @param {string} providedOTP - OTP provided by user
 * @param {string} storedHashedOTP - Stored hashed OTP
 * @param {Date} expiresAt - OTP expiration date
 * @returns {boolean} - Verification result
 */
const verifyOTP = (providedOTP, storedHashedOTP, expiresAt) => {
  try {
    // Check if OTP is expired
    if (new Date() > expiresAt) {
      logger.debug('OTP expired');
      return false;
    }

    // Hash provided OTP and compare
    const hashedProvidedOTP = hashToken(providedOTP);
    const isValid = hashedProvidedOTP === storedHashedOTP;

    logger.debug('OTP verification checked', { isValid });
    return isValid;
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    return false;
  }
};

/**
 * Authenticate user (login)
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} userFromDB - User object from database
 * @returns {Object} - Authentication result
 */
const authenticateUser = async (email, password, userFromDB) => {
  try {
    if (!userFromDB) {
      loggerUtils.logAuth('Authentication failed - User not found', 'unknown', { email });
      throw new APIError('Invalid credentials', 401);
    }

    // Check if user is active
    if (userFromDB.status === 'inactive') {
      loggerUtils.logAuth('Authentication failed - Account inactive', userFromDB._id);
      throw new APIError('Account is inactive', 401);
    }

    // Check if password hash exists
    if (!userFromDB.passwordHash) {
      loggerUtils.logAuth('Authentication failed - No password hash', userFromDB._id);
      throw new APIError('Account setup incomplete', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, userFromDB.passwordHash);

    if (!isPasswordValid) {
      loggerUtils.logAuth('Authentication failed - Invalid password', userFromDB._id);
      throw new APIError('Invalid credentials', 401);
    }

    // Fetch associated business entity based on user role
    let businessEntity = null;
    try {
      const { Restaurant, Zone } = require('../models');
      
      if (userFromDB.role === 'restaurant_owner') {
        businessEntity = await Restaurant.findOne({ ownerId: userFromDB._id });
      } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(userFromDB.role)) {
        businessEntity = await Zone.findOne({ ownerId: userFromDB._id });
      }
    } catch (businessError) {
      logger.warn('Could not fetch business entity for user', {
        userId: userFromDB._id,
        role: userFromDB.role,
        error: businessError.message
      });
      // Don't fail authentication if business entity fetch fails
    }

    // Generate tokens
    const tokens = generateTokenPair(userFromDB);

    // Prepare user response with business entity information
    const userResponse = {
      id: userFromDB._id,
      email: userFromDB.email,
      role: userFromDB.role,
      profile: userFromDB.profile,
      status: userFromDB.status,
      emailVerified: userFromDB.emailVerified,
      phoneVerified: userFromDB.phoneVerified
    };

    // Add business entity information based on role
    if (businessEntity) {
      if (userFromDB.role === 'restaurant_owner') {
        userResponse.restaurantId = businessEntity._id;
        userResponse.restaurantName = businessEntity.name;
        // Add other relevant restaurant fields if needed
      } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(userFromDB.role)) {
        userResponse.zoneId = businessEntity._id;
        userResponse.zoneName = businessEntity.name;
        // For zone_shop and zone_vendor, we might need shop-specific info
        if (['zone_shop', 'zone_vendor'].includes(userFromDB.role)) {
          // This might require additional logic to find the specific shop
          // For now, we'll include the zone information
        }
      }
    }

    loggerUtils.logAuth('Authentication successful', userFromDB._id, {
      role: userFromDB.role,
      email: userFromDB.email,
      hasBusinessEntity: !!businessEntity
    });

    return {
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    throw error;
  }
};

/**
 * Check if user account is locked due to failed attempts
 * @param {number} failedAttempts - Number of failed attempts
 * @param {Date} lastFailedAttempt - Last failed attempt timestamp
 * @returns {Object} - Lock status
 */
const checkAccountLock = (failedAttempts = 0, lastFailedAttempt = null) => {
  const maxAttempts = 5;
  const lockDuration = 30 * 60 * 1000; // 30 minutes

  if (failedAttempts >= maxAttempts && lastFailedAttempt) {
    const timeSinceLastAttempt = Date.now() - new Date(lastFailedAttempt).getTime();
    
    if (timeSinceLastAttempt < lockDuration) {
      const remainingTime = lockDuration - timeSinceLastAttempt;
      return {
        isLocked: true,
        remainingTime: Math.ceil(remainingTime / 60000) // minutes
      };
    }
  }

  return { isLocked: false };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword,
  calculatePasswordStrength,
  validateEmail,
  validatePhone,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyEmailToken,
  generateOTP,
  verifyOTP,
  authenticateUser,
  checkAccountLock
};