const express = require('express');
const { catchAsync } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/authController');

const router = express.Router();

/**
 * @route GET /api/v1/auth/test
 * @desc Test authentication system
 * @access Public
 */
router.get('/test', catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication routes are working!',
    timestamp: new Date().toISOString()
  });
}));

/**
 * @route GET /api/v1/auth/test-jwt
 * @desc Test JWT configuration
 * @access Public
 */
router.get('/test-jwt', testJWTConfig);

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user
 * @access Public
 */
router.post('/register', register);

/**
 * @route POST /api/v1/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', login);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', refreshToken);

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email address
 * @access Public
 */
router.post('/verify-email', verifyEmail);

/**
 * @route POST /api/v1/auth/verify-phone
 * @desc Verify phone number with OTP
 * @access Public
 */
router.post('/verify-phone', verifyPhone);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', requestPasswordReset);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change password (authenticated user)
 * @access Private
 */
router.post('/change-password', authenticate, changePassword);

/**
 * @route GET /api/v1/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticate, getProfile);

module.exports = router;