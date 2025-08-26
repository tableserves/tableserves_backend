const { catchAsync, APIError } = require('../middleware/errorHandler');
const { 
  validatePassword, 
  validateEmail, 
  validatePhone,
  authenticateUser,
  hashPassword,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyEmailToken,
  generateOTP,
  verifyOTP,
  checkAccountLock
} = require('../services/authService');
const { 
  generateTokenPair, 
  verifyRefreshToken, 
  validateJWTConfig 
} = require('../services/jwtService');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Test JWT configuration
 */
const testJWTConfig = catchAsync(async (req, res) => {
  try {
    validateJWTConfig();
    
    res.status(200).json({
      success: true,
      message: 'JWT configuration is valid',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    throw new APIError('JWT configuration is invalid', 500);
  }
});

/**
 * User registration
 */
const register = catchAsync(async (req, res) => {
  const { email, phone, password, confirmPassword, role = 'restaurant_owner', profile = {} } = req.body;

  // Validate required fields
  if (!email || !phone || !password) {
    throw new APIError('Email, phone, and password are required', 400);
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    throw new APIError('Passwords do not match', 400);
  }

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new APIError(`Email validation failed: ${emailValidation.errors.join(', ')}`, 400);
  }

  // Validate phone format
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.isValid) {
    throw new APIError(`Phone validation failed: ${phoneValidation.errors.join(', ')}`, 400);
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new APIError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
  }

  // Validate role
  const allowedRoles = ['restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'];
  if (!allowedRoles.includes(role)) {
    throw new APIError('Invalid role specified', 400);
  }

  try {
    // TODO: Check if user already exists in database
    // For now, we'll simulate user creation
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Generate email verification token
    const emailVerification = generateEmailVerificationToken(email);
    
    // Generate phone OTP
    const phoneOTP = generateOTP();

    // TODO: Save user to database
    const newUser = {
      id: 'temp_user_id_' + Date.now(),
      email: email.toLowerCase(),
      phone: phoneValidation.normalized,
      passwordHash,
      role,
      profile: {
        name: profile.name || '',
        ...profile
      },
      emailVerified: false,
      phoneVerified: false,
      status: 'pending', // pending, active, inactive
      emailVerificationToken: emailVerification.hashedToken,
      emailVerificationExpires: emailVerification.expiresAt,
      phoneOTP: phoneOTP.hashedOTP,
      phoneOTPExpires: phoneOTP.expiresAt,
      createdAt: new Date()
    };

    loggerUtils.logAuth('User registration initiated', newUser.id, {
      email: newUser.email,
      role: newUser.role
    });

    // TODO: Send verification email
    logger.info('Email verification token (development only)', {
      email: newUser.email,
      token: emailVerification.token
    });

    // TODO: Send OTP via SMS
    logger.info('Phone OTP (development only)', {
      phone: newUser.phone,
      otp: phoneOTP.otp
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email and phone number.',
      data: {
        userId: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        emailVerificationRequired: true,
        phoneVerificationRequired: true,
        // Development only - remove in production
        ...(process.env.NODE_ENV === 'development' && {
          emailVerificationToken: emailVerification.token,
          phoneOTP: phoneOTP.otp
        })
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyValue)[0];
      throw new APIError(`${field} already exists`, 409);
    }
    throw error;
  }
});

/**
 * User login
 */
const login = catchAsync(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw new APIError('Email and password are required', 400);
  }

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new APIError('Invalid email format', 400);
  }

  try {
    // TODO: Fetch user from database
    // For now, we'll simulate a user
    const userFromDB = null; // This will be replaced with actual database query

    if (!userFromDB) {
      // Simulate database user for testing
      if (email === 'admin@tableserve.com' && password === 'Admin123!') {
        const simulatedUser = {
          _id: 'admin_user_id',
          email: 'admin@tableserve.com',
          passwordHash: await hashPassword('Admin123!'),
          role: 'admin',
          profile: { name: 'System Administrator' },
          status: 'active',
          emailVerified: true,
          phoneVerified: true
        };

        const authResult = await authenticateUser(email, password, simulatedUser);
        
        res.status(200).json({
          success: true,
          message: 'Login successful',
          data: authResult
        });
        return;
      }
    }

    // Check account lock status
    const lockStatus = checkAccountLock(0, null); // TODO: Get from database
    if (lockStatus.isLocked) {
      throw new APIError(`Account locked. Try again in ${lockStatus.remainingTime} minutes.`, 423);
    }

    const authResult = await authenticateUser(email, password, userFromDB);

    // TODO: Update last login time and reset failed attempts

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: authResult
    });

  } catch (error) {
    // TODO: Increment failed login attempts
    loggerUtils.logAuth('Login failed', 'unknown', {
      email,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

/**
 * Logout user
 */
const logout = catchAsync(async (req, res) => {
  const userId = req.user?.id;

  if (userId) {
    // TODO: Invalidate refresh token in database
    loggerUtils.logAuth('User logout', userId);
  }

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Refresh access token
 */
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new APIError('Refresh token is required', 400);
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // TODO: Check if refresh token exists in database and is valid
    // For now, we'll generate new tokens
    
    // TODO: Fetch user from database
    const userFromDB = {
      _id: decoded.userId,
      email: decoded.email || 'user@example.com',
      role: decoded.role || 'restaurant_owner'
    };

    // Generate new token pair
    const tokens = generateTokenPair(userFromDB);

    loggerUtils.logAuth('Token refreshed', decoded.userId);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });

  } catch (error) {
    loggerUtils.logAuth('Token refresh failed', 'unknown', {
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

/**
 * Verify email address
 */
const verifyEmail = catchAsync(async (req, res) => {
  const { token, email } = req.body;

  if (!token || !email) {
    throw new APIError('Token and email are required', 400);
  }

  try {
    // TODO: Fetch user from database
    const userFromDB = null; // Get user with stored verification token and expiry

    if (!userFromDB) {
      throw new APIError('Invalid verification request', 400);
    }

    // Verify token
    const isValid = verifyEmailToken(
      token,
      userFromDB.emailVerificationToken,
      userFromDB.emailVerificationExpires
    );

    if (!isValid) {
      throw new APIError('Invalid or expired verification token', 400);
    }

    // TODO: Update user in database - set emailVerified: true, clear verification token

    loggerUtils.logAuth('Email verified', userFromDB._id, { email });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    loggerUtils.logAuth('Email verification failed', 'unknown', {
      email,
      error: error.message
    });
    throw error;
  }
});

/**
 * Verify phone number with OTP
 */
const verifyPhone = catchAsync(async (req, res) => {
  const { otp, phone } = req.body;

  if (!otp || !phone) {
    throw new APIError('OTP and phone number are required', 400);
  }

  try {
    // TODO: Fetch user from database
    const userFromDB = null; // Get user with stored OTP and expiry

    if (!userFromDB) {
      throw new APIError('Invalid verification request', 400);
    }

    // Verify OTP
    const isValid = verifyOTP(
      otp,
      userFromDB.phoneOTP,
      userFromDB.phoneOTPExpires
    );

    if (!isValid) {
      throw new APIError('Invalid or expired OTP', 400);
    }

    // TODO: Update user in database - set phoneVerified: true, clear OTP

    loggerUtils.logAuth('Phone verified', userFromDB._id, { phone });

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully'
    });

  } catch (error) {
    loggerUtils.logAuth('Phone verification failed', 'unknown', {
      phone,
      error: error.message
    });
    throw error;
  }
});

/**
 * Request password reset
 */
const requestPasswordReset = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new APIError('Email is required', 400);
  }

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new APIError('Invalid email format', 400);
  }

  try {
    // TODO: Check if user exists in database
    // For security, we always return success even if user doesn't exist

    // Generate reset token
    const resetToken = generatePasswordResetToken(email);

    // TODO: Save reset token to database
    // TODO: Send reset email

    logger.info('Password reset token (development only)', {
      email,
      token: resetToken.token
    });

    loggerUtils.logAuth('Password reset requested', 'unknown', { email });

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Development only - remove in production
      ...(process.env.NODE_ENV === 'development' && {
        resetToken: resetToken.token
      })
    });

  } catch (error) {
    logger.error('Password reset request error:', error);
    throw new APIError('Failed to process password reset request', 500);
  }
});

/**
 * Reset password with token
 */
const resetPassword = catchAsync(async (req, res) => {
  const { token, email, newPassword, confirmPassword } = req.body;

  if (!token || !email || !newPassword || !confirmPassword) {
    throw new APIError('All fields are required', 400);
  }

  if (newPassword !== confirmPassword) {
    throw new APIError('Passwords do not match', 400);
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new APIError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
  }

  try {
    // TODO: Fetch user and verify reset token
    const userFromDB = null;

    if (!userFromDB) {
      throw new APIError('Invalid reset request', 400);
    }

    // Verify reset token
    const isValid = verifyEmailToken(
      token,
      userFromDB.passwordResetToken,
      userFromDB.passwordResetExpires
    );

    if (!isValid) {
      throw new APIError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // TODO: Update user password in database and clear reset token

    loggerUtils.logAuth('Password reset completed', userFromDB._id, { email });

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    loggerUtils.logAuth('Password reset failed', 'unknown', {
      email,
      error: error.message
    });
    throw error;
  }
});

/**
 * Change password (authenticated user)
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new APIError('All fields are required', 400);
  }

  if (newPassword !== confirmPassword) {
    throw new APIError('New passwords do not match', 400);
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new APIError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
  }

  try {
    // TODO: Fetch user from database and verify current password
    // TODO: Update password in database

    loggerUtils.logAuth('Password changed', userId);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    loggerUtils.logAuth('Password change failed', userId, {
      error: error.message
    });
    throw error;
  }
});

/**
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;

  try {
    // TODO: Fetch user profile from database
    const userProfile = {
      id: userId,
      email: req.user.email,
      role: req.user.role,
      profile: {
        name: 'Test User'
      },
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date()
    };

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: userProfile
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    throw new APIError('Failed to retrieve profile', 500);
  }
});

module.exports = {
  testJWTConfig,
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  verifyPhone,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getProfile
};