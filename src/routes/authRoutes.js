const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/userRateLimit');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');
const {
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
} = require('../controllers/authController');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

/**
 * @route GET /api/v1/auth/test
 * @desc Test authentication system
 * @access Public
 */
router.get('/test', wrapAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication routes are working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}, 'testAuth'));

/**
 * @route GET /api/v1/auth/test-jwt
 * @desc Test JWT configuration
 * @access Public
 */
router.get('/test-jwt', wrapAsync(async (req, res) => {
  const jwtSecret = process.env.JWT_SECRET ? 'configured' : 'missing';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ? 'configured' : 'missing';

  res.status(200).json({
    success: true,
    message: 'JWT configuration test completed',
    data: {
      jwtSecret,
      jwtRefreshSecret,
      environment: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
}, 'testJWT'));

/**
 * @route GET /api/v1/auth/test-email
 * @desc Test email configuration and connectivity
 * @access Public
 */
router.get('/test-email', wrapAsync(testEmailConfiguration, 'testEmail'));

/**
 * @route GET /api/v1/auth/user-phone/:userId
 * @desc Get user phone number by user ID (public endpoint for order tracking)
 * @access Public
 */
router.get('/user-phone/:userId', wrapAsync(async (req, res) => {
  try {
    const { User } = require('../models');
    const { userId } = req.params;

    // Validate userId format (MongoDB ObjectId)
    if (!userId || userId.length !== 24 || !/^[0-9a-fA-F]+$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Find user by ID and select only the phone field
    const user = await User.findById(userId).select('phone');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User phone number retrieved successfully',
      data: {
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Error fetching user phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user information'
    });
  }
}, 'getUserPhone'));

/**
 * @route POST /api/v1/auth/debug-login
 * @desc Debug login without strict validation
 * @access Public
 */
router.post('/debug-login', wrapAsync(async (req, res) => {
  const { User } = require('../models');
  const { authenticateUser } = require('../services/authService');

  console.log('Debug login request body:', req.body);

  const { email, username, password } = req.body;
  const loginIdentifier = email || username;

  if (!loginIdentifier || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email/username and password are required',
      received: { email, username, password: password ? '[PROVIDED]' : '[MISSING]' }
    });
  }

  try {
    // Find user
    let user;
    if (loginIdentifier === 'admin') {
      user = await User.findOne({
        $or: [{ email: 'admin' }, { role: 'admin' }]
      }).select('+passwordHash');
    } else {
      user = await User.findOne({ email: loginIdentifier.toLowerCase() })
        .select('+passwordHash');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        searchedFor: loginIdentifier
      });
    }

    // Test authentication
    const authResult = await authenticateUser(loginIdentifier, password, user);

    res.status(200).json({
      success: true,
      message: 'Debug login successful',
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
}, 'debugLogin'));

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user
 * @access Public
 */
router.post('/register',
  authRateLimiter,
  ValidationRules.registerUser,
  handleValidation,
  wrapAsync(register, 'register')
);

/**
 * @route POST /api/v1/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login',
  authRateLimiter,
  [
    // Accept either email or username
    require('express-validator').body().custom((body) => {
      if (!body.email && !body.username) {
        throw new Error('Email or username is required');
      }
      if (body.email && !require('validator').isEmail(body.email)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
    require('express-validator').body('password').isLength({ min: 1 }).withMessage('Password is required')
  ],
  handleValidation,
  wrapAsync(login, 'login')
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout',
  authenticate,
  wrapAsync(logout, 'logout')
);

/**
 * @route POST /api/v1/auth/customer/register
 * @desc Register customer during payment flow
 * @access Public
 */
router.post('/customer/register',
  ValidationRules.customerRegistration,
  handleValidation,
  wrapAsync(registerCustomer, 'registerCustomer')
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh',
  authRateLimiter,
  wrapAsync(refreshToken, 'refreshToken')
);

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email address
 * @access Public
 */
router.post('/verify-email',
  authRateLimiter,
  wrapAsync(verifyEmail, 'verifyEmail')
);

/**
 * @route POST /api/v1/auth/verify-phone
 * @desc Verify phone number with OTP
 * @access Public
 */
router.post('/verify-phone',
  authRateLimiter,
  wrapAsync(verifyPhone, 'verifyPhone')
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password',
  authRateLimiter,
  wrapAsync(requestPasswordReset, 'requestPasswordReset')
);

/**
 * @route POST /api/v1/auth/reset-password/:token
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password/:token',
  authRateLimiter,
  wrapAsync(resetPassword, 'resetPassword')
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change password (authenticated user)
 * @access Private
 */
router.post('/change-password',
  authenticate,
  authRateLimiter,
  wrapAsync(changePassword, 'changePassword')
);

/**
 * @route GET /api/v1/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile',
  authenticate,
  wrapAsync(getProfile, 'getProfile')
);

/**
 * @route PUT /api/v1/auth/profile
 * @desc Update current user profile
 * @access Private
 */
router.put('/profile',
  authenticate,
  authRateLimiter,
  wrapAsync(updateProfile, 'updateProfile')
);

/**
 * @route PUT /api/v1/auth/settings
 * @desc Update current user settings
 * @access Private
 */
router.put('/settings',
  authenticate,
  authRateLimiter,
  wrapAsync(updateSettings, 'updateSettings')
);

/**
 * @route POST /api/v1/auth/send-email-otp
 * @desc Send OTP to email for verification
 * @access Public/Private (depending on purpose)
 */
router.post('/send-email-otp',
  authRateLimiter,
  [
    require('express-validator').body('email')
      .isEmail()
      .withMessage('Valid email address is required'),
    require('express-validator').body('purpose')
      .optional()
      .isIn(['verification', 'profile_update', 'security'])
      .withMessage('Invalid purpose')
  ],
  handleValidation,
  wrapAsync(sendEmailOTP, 'sendEmailOTP')
);

/**
 * @route POST /api/v1/auth/verify-email-otp
 * @desc Verify email OTP
 * @access Public
 */
router.post('/verify-email-otp',
  authRateLimiter,
  [
    require('express-validator').body('email')
      .isEmail()
      .withMessage('Valid email address is required'),
    require('express-validator').body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be 6 digits'),
    require('express-validator').body('purpose')
      .optional()
      .isIn(['verification', 'profile_update', 'security'])
      .withMessage('Invalid purpose')
  ],
  handleValidation,
  wrapAsync(verifyEmailOTP, 'verifyEmailOTP')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;