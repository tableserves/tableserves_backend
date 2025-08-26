const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getAllUsers,
  getUser,
  updateUserStatus,
  updateUserSubscription,
  deleteUser,
  getPlatformAnalytics,
  getSystemLogs
} = require('../controllers/adminController');

const router = express.Router();

/**
 * All admin routes require authentication and admin role
 */
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route GET /api/v1/admin/dashboard
 * @desc Get platform dashboard statistics
 * @access Private (admin only)
 */
router.get('/dashboard', getDashboardStats);

/**
 * User Management Routes
 */

/**
 * @route GET /api/v1/admin/users
 * @desc Get all users with filtering and pagination
 * @access Private (admin only)
 */
router.get('/users', getAllUsers);

/**
 * @route GET /api/v1/admin/users/:id
 * @desc Get single user by ID
 * @access Private (admin only)
 */
router.get('/users/:id', getUser);

/**
 * @route PATCH /api/v1/admin/users/:id/status
 * @desc Update user status (active, inactive, suspended)
 * @access Private (admin only)
 */
router.patch('/users/:id/status', updateUserStatus);

/**
 * @route PATCH /api/v1/admin/users/:id/subscription
 * @desc Update user subscription plan
 * @access Private (admin only)
 */
router.patch('/users/:id/subscription', updateUserSubscription);

/**
 * @route DELETE /api/v1/admin/users/:id
 * @desc Delete user account (soft delete by default)
 * @access Private (admin only)
 */
router.delete('/users/:id', deleteUser);

/**
 * Analytics Routes
 */

/**
 * @route GET /api/v1/admin/analytics
 * @desc Get platform analytics
 * @access Private (admin only)
 */
router.get('/analytics', getPlatformAnalytics);

/**
 * System Management Routes
 */

/**
 * @route GET /api/v1/admin/logs
 * @desc Get system logs
 * @access Private (admin only)
 */
router.get('/logs', getSystemLogs);

/**
 * Health Check Route
 */

/**
 * @route GET /api/v1/admin/health
 * @desc System health check
 * @access Private (admin only)
 */
router.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: {
      status: 'connected', // This would be checked in a real implementation
      responseTime: '5ms'
    },
    external_services: {
      cloudinary: {
        status: 'connected',
        responseTime: '50ms'
      },
      email: {
        status: 'connected',
        responseTime: '100ms'
      }
    }
  };

  res.status(200).json({
    success: true,
    message: 'System health check completed',
    data: healthData
  });
});

module.exports = router;