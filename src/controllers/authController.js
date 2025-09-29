const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
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
const notificationService = require('../services/notificationService');
const emailOTPService = require('../services/emailOTPService');
const { logger, loggerUtils } = require('../utils/logger');
const { User, Subscription } = require('../models'); // Import User and Subscription models for database operations

const testJWTConfig = catchAsync(async (req, res) => {
    const validation = validateJWTConfig();
    if (!validation.isValid) {
        return res.status(500).json({
            success: false,
            message: 'JWT configuration is invalid.',
            errors: validation.errors,
        });
    }
    res.status(200).json({
        success: true,
        message: 'JWT configuration seems valid.',
        details: validation.checks,
    });
});

/**
 * Register new user
 */
const register = catchAsync(async (req, res) => {
  // Log incoming registration data for debugging
  logger.debug('Registration request received', {
    body: {
      ...req.body,
      password: '[REDACTED]',
      confirmPassword: '[REDACTED]'
    }
  });

  const { email, phone, password, confirmPassword, role, profile, businessType, skipFreeSubscription } = req.body;

  // Validate input
  if (!email || !phone || !password) {
    throw new APIError('Email, phone, and password are required', 400);
  }

  // Only check confirmPassword if it's provided
  if (confirmPassword && password !== confirmPassword) {
    throw new APIError('Passwords do not match', 400);
  }

  // Validate email and phone
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new APIError('Invalid email format', 400);
  }

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.isValid) {
    throw new APIError(`Invalid phone format: ${phoneValidation.errors.join(', ')}`, 400);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new APIError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { email: emailValidation.email },
      { phone: phoneValidation.normalized }
    ]
  });

  if (existingUser) {
    const duplicateField = existingUser.email === emailValidation.email ? 'email' : 'phone';
    const duplicateValue = duplicateField === 'email' ? emailValidation.email : phoneValidation.normalized;

    logger.warn('Registration attempt with existing user data', {
      duplicateField,
      duplicateValue,
      existingUserId: existingUser._id
    });

    if (duplicateField === 'email') {
      throw new APIError('An account with this email already exists. Please use a different email address or try logging in instead.', 409);
    } else if (duplicateField === 'phone') {
      throw new APIError('An account with this phone number already exists. Please use a different phone number or try logging in instead.', 409);
    } else {
      throw new APIError(`An account with this ${duplicateField} already exists. Please use different information or try logging in.`, 409);
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate unique username (simplified)
  let username = profile?.username || email.split('@')[0];

  // Ensure username is valid (only letters, numbers, underscores, hyphens)
  username = username.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  // Make it unique by adding timestamp if needed
  const existingUserWithUsername = await User.findOne({ username: username });
  if (existingUserWithUsername) {
    username = `${username}_${Date.now().toString().slice(-4)}`;
  }

  // Create user
  const userData = {
    email: emailValidation.email,
    username: username,
    phone: phoneValidation.normalized,
    passwordHash,
    role: role || 'restaurant_owner',
    businessType: businessType, // Store business type from registration
    profile: {
      name: profile?.name || 'User',
      businessName: profile?.businessName || 'Business'
    },
    status: 'active', // Set to active since business type is selected during registration
    emailVerified: false,
    phoneVerified: false
  };

  const user = new User(userData);
  await user.save();

  // Only create FREE subscription if not explicitly skipped (for premium account creation)
  if (!skipFreeSubscription) {
    // Create FREE subscription for new user based on business type
    const freeSubscription = new Subscription({
    userId: user._id,
    planKey: businessType === 'restaurant' ? 'restaurant_free' : 'zone_free', // Use new plan keys
    planType: businessType || 'restaurant', // Use selected business type
    planName: 'Free Starter',
    features: {
      crudMenu: true, // Allow basic menu management
      qrGeneration: true, // Allow basic QR generation
      vendorManagement: false,
      analytics: false,
      qrCustomization: false,
      modifiers: false,
      watermark: true, // Show TableServe watermark
      unlimited: false
    },
    limits: businessType === 'restaurant' ? {
      maxTables: 1, // 1 table for restaurants
      maxShops: 0, // No shops for restaurants
      maxVendors: 0, // No vendors for restaurants
      maxCategories: 1, // 1 category
      maxMenuItems: 2, // 2 menu items per category
      maxUsers: 1, // Only the owner
      maxOrdersPerMonth: 50, // Limited orders
      maxStorageGB: 1 // 1GB storage
    } : {
      maxTables: 1, // 1 table for zones
      maxShops: 1, // 1 shop for zones
      maxVendors: 1, // 1 vendor for zones
      maxCategories: 1, // 1 category
      maxMenuItems: 1, // 1 menu item per category
      maxUsers: 1, // Only the owner
      maxOrdersPerMonth: 50, // Limited orders
      maxStorageGB: 1 // 1GB storage
    },
    pricing: {
      amount: 0, // FREE
      currency: 'INR', // Updated to INR
      interval: 'monthly',
      trialDays: 0 // No trial needed for free plan
    },
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    // Add required usage tracking
    usage: {
      currentTables: 0,
      currentShops: 0,
      currentVendors: 0,
      currentCategories: 0,
      currentMenuItems: 0,
      currentUsers: 1,
      ordersThisMonth: 0,
      storageUsedGB: 0,
      lastUsageUpdate: new Date()
    },
    // Add payment info
    payment: {
      paymentHistory: []
    },
    // Add notes array
    notes: []
  });

    await freeSubscription.save();

    // Link subscription to user
    user.subscription = freeSubscription._id;
    await user.save();
  }

  // Create business entity based on business type (only if not skipping free subscription)
  let businessEntity = null;
  if (businessType === 'restaurant' && !skipFreeSubscription) {
    const Restaurant = require('../models/Restaurant');
    businessEntity = new Restaurant({
      ownerId: user._id,
      subscriptionId: user.subscription,
      name: profile?.businessName || 'My Restaurant',
      description: `${profile?.businessName || 'My Restaurant'} - Delicious food awaits!`,
      contact: {
        phone: user.phone,
        email: user.email,
        website: '',
        address: {
          street: 'To be updated',
          city: 'To be updated',
          state: 'To be updated',
          zipCode: '00000',
          country: 'IN',
          coordinates: {
            latitude: 0,
            longitude: 0
          }
        }
      },
      settings: {
        theme: {
          primaryColor: '#3b82f6',
          secondaryColor: '#1d4ed8'
        },
        orderSettings: {
          acceptOrders: true,
          minimumOrderAmount: 0,
          estimatedPreparationTime: 20,
          maxOrdersPerHour: 30
        },
        paymentSettings: {
          acceptCash: true,
          acceptCards: false,
          acceptDigitalPayments: false
        }
      },
      active: true
    });
    await businessEntity.save();
  } else if (businessType === 'zone' && !skipFreeSubscription) {
    const Zone = require('../models/Zone');
    businessEntity = new Zone({
      adminId: user._id,
      subscriptionId: user.subscription,
      name: profile?.businessName || 'My Food Zone',
      description: `${profile?.businessName || 'My Food Zone'} - Multiple food vendors in one place`,
      location: profile?.location || 'Location to be updated', // Provide default value
      contactInfo: {
        email: user.email,
        phone: user.phone
      },
      settings: {
        theme: {
          primaryColor: '#3b82f6',
          secondaryColor: '#1d4ed8'
        },
        orderSettings: {
          acceptOrders: true,
          minimumOrderAmount: 0,
          estimatedPreparationTime: 25,
          maxOrdersPerHour: 50
        },
        paymentSettings: {
          acceptCash: true,
          acceptCards: false,
          acceptDigitalPayments: false
        }
      },
      active: true
    });
    await businessEntity.save();
  }

  // Generate tokens
  const tokens = generateTokenPair(user);

  // Store refresh token in user model
  const refreshTokenExpiry = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
  await user.addRefreshToken(tokens.refreshToken, refreshTokenExpiry, {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  });

  loggerUtils.logAuth('User registered successfully', user._id, {
    email: user.email,
    role: user.role
  });

  // Prepare user response with business entity information (similar to login process)
  const userResponse = {
    id: user._id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    businessType: user.businessType,
    profile: user.profile,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified
  };

  // Add business entity information based on role (same logic as login)
  if (businessEntity) {
    if (user.role === 'restaurant_owner') {
      userResponse.restaurantId = businessEntity._id;
      userResponse.restaurantName = businessEntity.name;
      userResponse.restaurantSlug = businessEntity.slug;
      userResponse.restaurantStatus = businessEntity.status;
    } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role)) {
      userResponse.zoneId = businessEntity._id;
      userResponse.zoneName = businessEntity.name;
      userResponse.zoneSlug = businessEntity.slug;
      userResponse.zoneStatus = businessEntity.status;
    }
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      userId: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      businessType: user.businessType,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse,
      businessEntity: businessEntity ? {
        id: businessEntity._id,
        name: businessEntity.name,
        type: businessType
      } : null
    }
  });
});

/**
 * Login user
 */
const login = catchAsync(async (req, res) => {
  const { email, username, password, role } = req.body;

  // Accept either email or username
  const loginIdentifier = email || username;

  if (!loginIdentifier || !password) {
    throw new APIError('Email/username and password are required', 400);
  }

  // Find user by email, username, or phone
  let user;
  if (loginIdentifier === 'admin') {
    // Special case for superadmin - find by username
    user = await User.findOne({ username: 'admin', role: 'admin' })
      .populate('subscription')
      .select('+passwordHash');
  } else {
    // Regular user login by email, username, or phone
    user = await User.findOne({
      $or: [
        { email: loginIdentifier.toLowerCase() },
        { username: loginIdentifier },
        { phone: loginIdentifier }
      ]
    })
      .populate('subscription')
      .select('+passwordHash +username');
  }

  if (!user) {
    throw new APIError('Username or password is incorrect. Please check your credentials and try again.', 401);
  }

  // Check account lock
  await checkAccountLock(user);

  // Authenticate user
  const authResult = await authenticateUser(loginIdentifier, password, user);

  // Update last login
  user.lastLogin = new Date();
  user.loginAttempts = 0; // Reset failed attempts
  await user.save();

  // Generate tokens
  const tokens = generateTokenPair(user);

  // Store refresh token in user model
  const refreshTokenExpiry = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
  await user.addRefreshToken(tokens.refreshToken, refreshTokenExpiry, {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  });

  // Fetch associated business entity based on user role
  let businessEntity = null;
  try {
    if (user.role === 'restaurant_owner') {
      const Restaurant = require('../models/Restaurant');
      businessEntity = await Restaurant.findOne({ ownerId: user._id })
        .populate('subscriptionId')
        .lean();
    } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role)) {
      const Zone = require('../models/Zone');
      businessEntity = await Zone.findOne({
        $or: [
          { adminId: user._id },
          { ownerId: user._id }
        ]
      })
        .populate('subscriptionId')
        .populate('adminId', 'profile.name email phone')
        .lean();

      // For zone_shop and zone_vendor, also try to find their specific shop
      if (['zone_shop', 'zone_vendor'].includes(user.role) && !businessEntity) {
        const ZoneShop = require('../models/ZoneShop');
        const shop = await ZoneShop.findOne({ ownerId: user._id })
          .populate('zoneId')
          .lean();
        if (shop && shop.zoneId) {
          businessEntity = shop.zoneId;
          // Add shop-specific information
          businessEntity.shopId = shop._id;
          businessEntity.shopName = shop.name;
        }
      }
    }
  } catch (businessError) {
    logger.warn('Could not fetch business entity for user during login', {
      userId: user._id,
      role: user.role,
      error: businessError.message
    });
    // Don't fail login if business entity fetch fails
  }

  // Prepare user response with business entity information
  const userResponse = {
    id: user._id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    businessType: user.businessType,
    profile: user.profile,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    subscription: user.subscription,
    lastLogin: user.lastLogin
  };

  // Add business entity information based on role
  if (businessEntity) {
    if (user.role === 'restaurant_owner') {
      userResponse.restaurantId = businessEntity._id;
      userResponse.restaurantName = businessEntity.name;
      userResponse.restaurantSlug = businessEntity.slug;
      userResponse.restaurantStatus = businessEntity.status;
      if (businessEntity.subscriptionId) {
        userResponse.businessSubscription = businessEntity.subscriptionId;
      }
    } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role)) {
      userResponse.zoneId = businessEntity._id;
      userResponse.zoneName = businessEntity.name;
      userResponse.zoneSlug = businessEntity.slug;
      userResponse.zoneStatus = businessEntity.status;

      // Add shop-specific information for zone_shop and zone_vendor
      if (businessEntity.shopId) {
        userResponse.shopId = businessEntity.shopId;
        userResponse.shopName = businessEntity.shopName;
      }

      if (businessEntity.subscriptionId) {
        userResponse.businessSubscription = businessEntity.subscriptionId;
      }
    }
  }

  loggerUtils.logAuth('User logged in successfully', user._id, {
    email: user.email,
    role: user.role,
    hasBusinessEntity: !!businessEntity
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      businessEntity: businessEntity ? {
        id: businessEntity._id,
        name: businessEntity.name,
        type: user.businessType
      } : null
    }
  });
});

/**
 * Logout user
 */
const logout = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  const userId = req.user._id;

  // Clear all refresh tokens for the user (since we only store one now)
  const user = await User.findById(userId);
  if (user) {
    await user.removeAllRefreshTokens();
  }

  loggerUtils.logAuth('User logged out', userId);

  res.status(200).json({
    success: true,
    message: 'Logout successful',
    data: {
      clearTokens: true // Signal to frontend to clear localStorage
    }
  });
});

/**
 * Refresh access token
 */
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new APIError('Refresh token is required', 400);
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(token);

  // Find user with subscription data and check if refresh token exists
  const user = await User.findById(decoded.userId)
    .populate('subscription');

  if (!user) {
    throw new APIError('User not found', 401);
  }

  // Check if refresh token exists and is not expired
  const tokenExists = user.refreshTokens.some(rt =>
    rt.token === token && rt.expiresAt > new Date()
  );

  if (!tokenExists) {
    throw new APIError('Invalid or expired refresh token', 401);
  }

  // Generate new token pair
  const tokens = generateTokenPair(user);

  // Replace the existing refresh token with the new one (single token per user)
  const refreshTokenExpiry = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

  // Use atomic update to avoid version conflicts
  try {
    await User.findByIdAndUpdate(
      decoded.userId,
      {
        $set: {
          refreshTokens: [{
            token: tokens.refreshToken,
            expiresAt: refreshTokenExpiry,
            deviceInfo: {
              userAgent: req.headers['user-agent'],
              ip: req.ip || req.connection.remoteAddress
            },
            createdAt: new Date()
          }]
        }
      },
      { new: true }
    );
  } catch (updateError) {
    logger.error('Failed to update refresh token:', updateError);
    throw new APIError('Failed to update refresh token', 500);
  }

  // Fetch associated business entity based on user role
  let businessEntity = null;
  try {
    if (user.role === 'restaurant_owner') {
      const Restaurant = require('../models/Restaurant');
      businessEntity = await Restaurant.findOne({ ownerId: user._id })
        .populate('subscriptionId')
        .lean();
    } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role)) {
      const Zone = require('../models/Zone');
      businessEntity = await Zone.findOne({
        $or: [
          { adminId: user._id },
          { ownerId: user._id }
        ]
      })
        .populate('subscriptionId')
        .populate('adminId', 'profile.name email phone')
        .lean();

      // For zone_shop and zone_vendor, also try to find their specific shop
      if (['zone_shop', 'zone_vendor'].includes(user.role) && !businessEntity) {
        const ZoneShop = require('../models/ZoneShop');
        const shop = await ZoneShop.findOne({ ownerId: user._id })
          .populate('zoneId')
          .lean();
        if (shop && shop.zoneId) {
          businessEntity = shop.zoneId;
          // Add shop-specific information
          businessEntity.shopId = shop._id;
          businessEntity.shopName = shop.name;
        }
      }
    }
  } catch (businessError) {
    logger.warn('Could not fetch business entity for user during token refresh', {
      userId: user._id,
      role: user.role,
      error: businessError.message
    });
    // Don't fail token refresh if business entity fetch fails
  }

  // Prepare user response with subscription data and business entity information
  const userResponse = {
    id: user._id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    businessType: user.businessType,
    profile: user.profile,
    subscription: user.subscription,
    registrationComplete: user.registrationComplete,
    onboardingComplete: user.onboardingComplete,
    isBusinessOwner: user.isBusinessOwner,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Add business entity information based on role
  if (businessEntity) {
    if (user.role === 'restaurant_owner') {
      userResponse.restaurantId = businessEntity._id;
      userResponse.restaurantName = businessEntity.name;
      userResponse.restaurantSlug = businessEntity.slug;
      userResponse.restaurantStatus = businessEntity.status;
      if (businessEntity.subscriptionId) {
        userResponse.businessSubscription = businessEntity.subscriptionId;
      }
    } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role)) {
      userResponse.zoneId = businessEntity._id;
      userResponse.zoneName = businessEntity.name;
      userResponse.zoneSlug = businessEntity.slug;
      userResponse.zoneStatus = businessEntity.status;

      // Add shop-specific information for zone_shop and zone_vendor
      if (businessEntity.shopId) {
        userResponse.shopId = businessEntity.shopId;
        userResponse.shopName = businessEntity.shopName;
      }

      if (businessEntity.subscriptionId) {
        userResponse.businessSubscription = businessEntity.subscriptionId;
      }
    }
  }

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      businessEntity: businessEntity ? {
        id: businessEntity._id,
        name: businessEntity.name,
        type: user.businessType
      } : null
    }
  });
});

/**
 * Verify email
 */
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new APIError('Verification token is required', 400);
  }

  const result = verifyEmailToken(token);
  if (!result.isValid) {
    throw new APIError('Invalid or expired verification token', 400);
  }

  const user = await User.findOne({ email: result.email });
  if (!user) {
    throw new APIError('User not found', 404);
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  loggerUtils.logAuth('Email verified successfully', user._id);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

/**
 * Verify phone
 */
const verifyPhone = catchAsync(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new APIError('Phone number and OTP are required', 400);
  }

  const user = await User.findOne({ phone }).select('+phoneOTP +phoneOTPExpires');
  if (!user) {
    throw new APIError('User not found', 404);
  }

  const otpResult = verifyOTP(otp, user.phoneOTP, user.phoneOTPExpires);
  if (!otpResult.isValid) {
    throw new APIError('Invalid or expired OTP', 400);
  }

  user.phoneVerified = true;
  user.phoneOTP = undefined;
  user.phoneOTPExpires = undefined;
  await user.save();

  loggerUtils.logAuth('Phone verified successfully', user._id);

  res.status(200).json({
    success: true,
    message: 'Phone verified successfully'
  });
});

/**
 * Request password reset
 */
const requestPasswordReset = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new APIError('Email is required', 400);
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new APIError('Invalid email format', 400);
  }

  try {
    const userFromDB = await User.findOne({ email: email.toLowerCase() });
    
    // Log the email search result
    console.log('requestPasswordReset: User search result', {
      email: email.toLowerCase(),
      userFound: !!userFromDB,
      userId: userFromDB ? userFromDB._id : null
    });
    
    if (userFromDB) {
      const resetToken = generatePasswordResetToken(email);
      
      // Log the generated token
      console.log('requestPasswordReset: Generated token', {
        tokenLength: resetToken.token.length,
        tokenPreview: resetToken.token.substring(0, 10) + '...',
        hashedTokenLength: resetToken.hashedToken.length,
        hashedTokenPreview: resetToken.hashedToken.substring(0, 10) + '...',
        expiresAt: resetToken.expiresAt
      });
      
      userFromDB.passwordResetToken = resetToken.hashedToken;
      userFromDB.passwordResetExpires = resetToken.expiresAt;
      await userFromDB.save();
      
      // Log after saving
      console.log('requestPasswordReset: Token saved to user', {
        userId: userFromDB._id,
        hashedTokenPreview: resetToken.hashedToken.substring(0, 10) + '...'
      });
      
      // Log the generated tokens for debugging
      logger.debug('Password reset token generated', { 
        userId: userFromDB._id,
        tokenLength: resetToken.token.length,
   
        tokenPreview: resetToken.token.substring(0, 10) + '...',
        hashedTokenPreview: resetToken.hashedToken.substring(0, 10) + '...',
        expiresAt: resetToken.expiresAt,
      });
      
      // Construct frontend URL - use environment variable if available, otherwise fallback to protocol + host
      const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.headers.host}`;
      
      // URL-encode the token for safe inclusion in the URL
      const encodedToken = encodeURIComponent(resetToken.token);
      
      // Log the email content
      console.log('requestPasswordReset: Sending email with reset link', {
        email: email,
        resetLink: `${frontendUrl}/reset-password/${encodedToken}`
      });
      
      await notificationService.sendEmailNotification(email, {
        type: 'password_reset',
        title: 'Password Reset Request',
        message: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.

Please click on the following link, or paste this into your browser to complete the process:

${frontendUrl}/reset-password/${encodedToken}

If you did not request this, please ignore this email and your password will remain unchanged.
`,
      });
    }

    loggerUtils.logAuth('Password reset requested', 'unknown', { email });

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
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
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  // Log the raw token received from the request
  console.log('ResetPassword: Raw token received from request:', {
    tokenLength: token.length,
    tokenPreview: token.substring(0, 10) + '...',
    fullToken: token // Be careful with this in production logs
  });

  // Improved token decoding to handle potential double encoding issues
  let decodedToken = token;
  try {
    // Handle potential double encoding by decoding until no change occurs
    let previousToken;
    do {
      previousToken = decodedToken;
      decodedToken = decodeURIComponent(decodedToken);
    } while (decodedToken !== previousToken && decodedToken !== decodeURIComponent(decodedToken));
    
    console.log('ResetPassword: Token processed', {
      originalToken: token,
      finalToken: decodedToken,
      wasModified: token !== decodedToken
    });
  } catch (decodeError) {
    console.log('ResetPassword: Error processing token, using original', {
      error: decodeError.message
    });
    decodedToken = token;
  }

  if (!decodedToken || !password || !confirmPassword) {
    throw new APIError('Token, password, and confirm password are required', 400);
  }

  if (password !== confirmPassword) {
    throw new APIError('Passwords do not match', 400);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new APIError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
  }

  // Log the received token for debugging
  logger.debug('Password reset request received', { 
    tokenLength: decodedToken.length,
    tokenPreview: decodedToken.substring(0, 10) + '...',
  });

  // Hash the token to match with the stored hashed token
  const { hashToken } = require('../services/jwtService');
  const hashedToken = hashToken(decodedToken);

  // Log the hashed token for debugging
  logger.debug('Token hashed for database lookup', { 
    hashedTokenPreview: hashedToken.substring(0, 10) + '...',
  });

  // First, let's try to find any user with this hashed token to see if it exists at all
  const userWithToken = await User.findOne({
    passwordResetToken: hashedToken
  });
  
  console.log('ResetPassword: User lookup with hashed token', {
    hashedTokenPreview: hashedToken.substring(0, 10) + '...',
    userFound: !!userWithToken,
    userId: userWithToken ? userWithToken._id : null,
    passwordResetExpires: userWithToken ? userWithToken.passwordResetExpires : null,
    now: new Date()
  });

  // Find user with valid reset token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // Log the search result for debugging
  logger.debug('User lookup result', { 
    userFound: !!user,
    userId: user ? user._id : null,
  });

  if (!user) {
    // Check if token exists but is expired
    if (userWithToken) {
      if (userWithToken.passwordResetExpires <= Date.now()) {
        logger.debug('Token found but expired', { 
          userId: userWithToken._id,
          expiredAt: userWithToken.passwordResetExpires,
          now: new Date(),
        });
        throw new APIError('Reset token has expired. Please request a new password reset.', 400);
      } else {
        logger.debug('Token found and not expired, but user not found for other reasons', { 
          userId: userWithToken._id,
        });
        throw new APIError('Invalid reset token', 400);
      }
    } else {
      logger.debug('No user found with the provided token', { 
        hashedTokenPreview: hashedToken.substring(0, 10) + '...',
      });
      throw new APIError('Invalid or expired reset token', 400);
    }
  }

  // Update password
  user.passwordHash = await hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.loginAttempts = 0; // Reset failed attempts
  await user.save();

  loggerUtils.logAuth('Password reset successfully', user._id);

  res.status(200).json({
    success: true,
    message: 'Password reset successfully'
  });
});

/**
 * Change password (authenticated user)
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new APIError('Current password, new password, and confirm password are required', 400);
  }

  if (newPassword !== confirmPassword) {
    throw new APIError('New passwords do not match', 400);
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new APIError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
  }

  // Get user with password hash
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new APIError('User not found', 404);
  }

  // Verify current password
  const authResult = await authenticateUser(user.email, currentPassword, user);

  // Update password
  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  loggerUtils.logAuth('Password changed successfully', userId);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * Get user profile
 */
const getProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId)
    .populate('subscription')
    .select('-passwordHash -refreshTokens');

  if (!user) {
    throw new APIError('User not found', 404);
  }

  // Fetch associated business entity based on user role
  let businessEntity = null;
  try {
    if (user.role === 'restaurant_owner') {
      const Restaurant = require('../models/Restaurant');
      businessEntity = await Restaurant.findOne({ ownerId: user._id })
        .populate('subscriptionId')
        .lean();
    } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role)) {
      const Zone = require('../models/Zone');
      businessEntity = await Zone.findOne({
        $or: [
          { adminId: user._id },
          { ownerId: user._id }
        ]
      })
        .populate('subscriptionId')
        .populate('adminId', 'profile.name email phone')
        .lean();

      // For zone_shop and zone_vendor, also try to find their specific shop
      if (['zone_shop', 'zone_vendor'].includes(user.role) && !businessEntity) {
        const ZoneShop = require('../models/ZoneShop');
        const shop = await ZoneShop.findOne({ ownerId: user._id })
          .populate('zoneId')
          .lean();
        if (shop && shop.zoneId) {
          businessEntity = shop.zoneId;
          // Add shop-specific information
          businessEntity.shopId = shop._id;
          businessEntity.shopName = shop.name;
        }
      }
    }
  } catch (businessError) {
    logger.warn('Could not fetch business entity for user profile', {
      userId: user._id,
      role: user.role,
      error: businessError.message
    });
    // Don't fail profile fetch if business entity fetch fails
  }

  // Prepare user response with business entity information
  const userResponse = {
    id: user._id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    businessType: user.businessType,
    profile: user.profile,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    subscription: user.subscription,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Add business entity information based on role
  if (businessEntity) {
    if (user.role === 'restaurant_owner') {
      userResponse.restaurantId = businessEntity._id;
      userResponse.restaurantName = businessEntity.name;
      userResponse.restaurantSlug = businessEntity.slug;
      userResponse.restaurantStatus = businessEntity.status;
      if (businessEntity.subscriptionId) {
        userResponse.businessSubscription = businessEntity.subscriptionId;
      }
    } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role)) {
      userResponse.zoneId = businessEntity._id;
      userResponse.zoneName = businessEntity.name;
      userResponse.zoneSlug = businessEntity.slug;
      userResponse.zoneStatus = businessEntity.status;

      // Add shop-specific information for zone_shop and zone_vendor
      if (businessEntity.shopId) {
        userResponse.shopId = businessEntity.shopId;
        userResponse.shopName = businessEntity.shopName;
      }

      if (businessEntity.subscriptionId) {
        userResponse.businessSubscription = businessEntity.subscriptionId;
      }
    }
  }

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: userResponse
  });
});

/**
 * Register customer during payment flow
 */
const registerCustomer = catchAsync(async (req, res) => {
  const { name, phone, email, orderId } = req.body;

  // Validate input
  if (!name || !phone) {
    throw new APIError('Name and phone number are required', 400);
  }

  // Check if customer already exists
  let existingCustomer = await User.findOne({
    phone: phone,
    role: 'customer'
  });

  if (existingCustomer) {
    // Update existing customer info if needed
    if (email && !existingCustomer.email.includes('@tableserve.com')) {
      existingCustomer.email = email;
    }
    if (name !== existingCustomer.profile.name) {
      existingCustomer.profile.name = name;
    }
    await existingCustomer.save();

    return res.json({
      success: true,
      message: 'Customer account updated',
      data: {
        customerId: existingCustomer._id,
        isNewCustomer: false
      }
    });
  }

  // Create new customer
  const defaultPassword = `customer${phone.slice(-4)}`;
  const passwordHash = await hashPassword(defaultPassword);

  const customerData = {
    email: email || `customer${phone}@tableserve.com`,
    phone: phone,
    passwordHash,
    role: 'customer',
    profile: {
      name: name
    },
    status: 'active',
    emailVerified: false,
    phoneVerified: true // Assume phone is verified through OTP
  };

  const customer = new User(customerData);
  await customer.save();

  // Link customer to order if orderId provided
  if (orderId) {
    const Order = require('../models/Order');
    await Order.findByIdAndUpdate(orderId, {
      'customer.userId': customer._id
    });
  }

  res.status(201).json({
    success: true,
    message: 'Customer account created successfully',
    data: {
      customerId: customer._id,
      isNewCustomer: true,
      defaultPassword: defaultPassword // Send to customer via SMS/email
    }
  });
});

/**
 * Update user profile
 */
const updateProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone, location } = req.body;

  // Validate input
  if (!name && !email && !phone && !location) {
    throw new APIError('At least one field is required to update', 400);
  }

  // Validate email if provided
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw new APIError('Invalid email format', 400);
    }
    
    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: emailValidation.email,
      _id: { $ne: userId }
    });
    if (existingUser) {
      throw new APIError('Email is already taken by another user', 400);
    }
  }

  // Validate phone if provided
  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      throw new APIError(`Invalid phone format: ${phoneValidation.errors.join(', ')}`, 400);
    }
  }

  // Find and update user
  const user = await User.findById(userId);
  if (!user) {
    throw new APIError('User not found', 404);
  }

  // Update profile fields
  if (name) user.profile.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (location) user.profile.location = location;

  user.updatedAt = new Date();
  await user.save();

  loggerUtils.logAuth('Profile updated successfully', userId, {
    updatedFields: { name, email, phone, location }
  });

  // Prepare response
  const userProfile = {
    id: user._id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    businessType: user.businessType,
    profile: user.profile,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: userProfile
  });
});

/**
 * Update user settings
 */
const updateSettings = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { 
    twoFactorEnabled, 
    emailNotifications, 
    smsNotifications, 
    loginAlerts, 
    sessionTimeout 
  } = req.body;

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new APIError('User not found', 404);
  }

  // Initialize settings if not present
  if (!user.settings) {
    user.settings = {};
  }
  if (!user.settings.notifications) {
    user.settings.notifications = {};
  }

  // Update settings
  if (typeof twoFactorEnabled === 'boolean') {
    user.settings.twoFactorEnabled = twoFactorEnabled;
  }
  if (typeof emailNotifications === 'boolean') {
    user.settings.notifications.email = emailNotifications;
  }
  if (typeof smsNotifications === 'boolean') {
    user.settings.notifications.sms = smsNotifications;
  }
  if (typeof loginAlerts === 'boolean') {
    user.settings.notifications.loginAlerts = loginAlerts;
  }
  if (sessionTimeout && sessionTimeout >= 5 && sessionTimeout <= 480) {
    user.settings.sessionTimeout = sessionTimeout;
  }

  user.updatedAt = new Date();
  await user.save();

  loggerUtils.logAuth('Settings updated successfully', userId, {
    updatedSettings: { 
      twoFactorEnabled, 
      emailNotifications, 
      smsNotifications, 
      loginAlerts, 
      sessionTimeout 
    }
  });

  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      settings: user.settings
    }
  });
});

/**
 * Send OTP to email for verification
 */
const sendEmailOTP = catchAsync(async (req, res) => {
  const { email, purpose } = req.body;

  if (!email) {
    throw new APIError('Email address is required', 400);
  }

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new APIError('Invalid email format', 400);
  }

  try {
    // Generate OTP
    const otpData = emailOTPService.generateEmailOTP();
    
    // For profile updates, verify the user exists and the email belongs to them
    if (purpose === 'profile_update') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new APIError('Authentication token required', 401);
      }

      // Verify token and get user
      const { verifyAccessToken } = require('../services/jwtService');
      const decoded = verifyAccessToken(token);
      if (!decoded) {
        throw new APIError('Invalid or expired token', 401);
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new APIError('User not found', 404);
      }

      // Check if the email belongs to the current user or if it's a new email they want to update to
      if (user.email !== email.toLowerCase()) {
        // For email updates, allow sending OTP to new email
        // But log this for security monitoring
        loggerUtils.logAuth('Email OTP requested for email update', user._id, {
          currentEmail: user.email,
          newEmail: email.toLowerCase()
        });
      }

      // Store OTP in user record for profile updates
      user.emailOTP = otpData.hashedOTP;
      user.emailOTPExpires = otpData.expiresAt;
      user.emailOTPPurpose = purpose;
      await user.save();
    } else {
      // For other purposes, find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new APIError('User not found', 404);
      }

      // Store OTP in user record
      user.emailOTP = otpData.hashedOTP;
      user.emailOTPExpires = otpData.expiresAt;
      user.emailOTPPurpose = purpose || 'verification';
      await user.save();
    }

    // Send OTP via email
    const sendResult = await emailOTPService.sendEmailOTP(email, otpData.otp, purpose || 'verification');
    
    if (!sendResult.success) {
      throw new APIError('Failed to send OTP email', 500);
    }

    loggerUtils.logAuth('Email OTP sent successfully', 'system', {
      email: email.toLowerCase(),
      purpose: purpose || 'verification'
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address',
      data: {
        email: email.toLowerCase(),
        purpose: purpose || 'verification',
        expiresIn: '10 minutes',
        // Include development OTP for testing
        ...(process.env.NODE_ENV === 'development' && sendResult.developmentOTP && {
          developmentOTP: sendResult.developmentOTP
        })
      }
    });

  } catch (error) {
    logger.error('Error sending email OTP:', error);
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to send email OTP', 500);
  }
});

/**
 * Verify email OTP
 */
const verifyEmailOTP = catchAsync(async (req, res) => {
  const { email, otp, purpose } = req.body;

  if (!email || !otp) {
    throw new APIError('Email and OTP are required', 400);
  }

  if (otp.length !== 6) {
    throw new APIError('OTP must be 6 digits', 400);
  }

  try {
    let user;
    
    // For profile updates, find user by token (not email)
    if (purpose === 'profile_update') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new APIError('Authentication token required', 401);
      }

      // Verify token and get user
      const { verifyAccessToken } = require('../services/jwtService');
      const decoded = verifyAccessToken(token);
      if (!decoded) {
        throw new APIError('Invalid or expired token', 401);
      }

      user = await User.findById(decoded.userId).select('+emailOTP +emailOTPExpires +emailOTPPurpose');
      if (!user) {
        throw new APIError('User not found', 404);
      }
    } else {
      // For other purposes, find user by email
      user = await User.findOne({ 
        email: email.toLowerCase() 
      }).select('+emailOTP +emailOTPExpires +emailOTPPurpose');
      
      if (!user) {
        throw new APIError('User not found', 404);
      }
    }

    if (!user.emailOTP || !user.emailOTPExpires) {
      throw new APIError('No OTP found. Please request a new OTP.', 400);
    }

    // Verify purpose matches
    if (purpose && user.emailOTPPurpose !== purpose) {
      throw new APIError('OTP purpose mismatch', 400);
    }

    // Verify OTP
    const verificationResult = emailOTPService.verifyEmailOTP(
      otp,
      user.emailOTP,
      user.emailOTPExpires
    );

    if (!verificationResult.isValid) {
      loggerUtils.logAuth('Email OTP verification failed', user._id, {
        email: email.toLowerCase(),
        purpose: purpose || 'verification'
      });
      throw new APIError('Invalid or expired OTP', 400);
    }

    // Clear OTP after successful verification
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    user.emailOTPPurpose = undefined;
    
    // For email verification purposes, mark email as verified
    if (!purpose || purpose === 'verification') {
      user.emailVerified = true;
    }
    
    await user.save();

    loggerUtils.logAuth('Email OTP verified successfully', user._id, {
      email: email.toLowerCase(),
      purpose: purpose || 'verification'
    });

    res.status(200).json({
      success: true,
      message: 'Email OTP verified successfully',
      data: {
        email: email.toLowerCase(),
        purpose: purpose || 'verification',
        verified: true
      }
    });

  } catch (error) {
    logger.error('Error verifying email OTP:', error);
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to verify email OTP', 500);
  }
});

/**
 * Test email configuration
 */
const testEmailConfiguration = catchAsync(async (req, res) => {
  try {
    // Test email configuration
    const testResult = await emailOTPService.testEmailConfiguration();

    // Also get validation details
    const validation = emailOTPService.validateEmailConfiguration();

    loggerUtils.logAuth('Email configuration test performed', 'system', {
      success: testResult.success,
      hasIssues: !validation.isValid,
      issueCount: validation.issues.length,
      warningCount: validation.warnings.length
    });

    res.status(testResult.success ? 200 : 400).json({
      success: testResult.success,
      message: testResult.message,
      data: {
        validation: validation,
        testResult: testResult,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });

  } catch (error) {
    logger.error('Error testing email configuration:', error);
    throw new APIError('Failed to test email configuration', 500);
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
  getProfile,
  updateProfile,
  updateSettings,
  registerCustomer,
  sendEmailOTP,
  verifyEmailOTP,
  testEmailConfiguration
};