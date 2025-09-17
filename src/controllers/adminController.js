const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { User, Subscription, Restaurant, Order } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Get platform dashboard statistics
 */
const getDashboardStats = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Get various statistics in parallel
  const [
    userStats,
    subscriptionStats,
    restaurantStats,
    orderStats
  ] = await Promise.all([
    User.getStatistics(),
    Subscription.getStatistics(),
    Restaurant.getStatistics(),
    Order.getStatistics()
  ]);

  // Get recent activities
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('email profile.name role createdAt status');

  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('restaurantId', 'name')
    .select('orderNumber status pricing.total customer.name createdAt');

  const dashboardData = {
    overview: {
      totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
      activeUsers: userStats.reduce((sum, stat) => sum + stat.active, 0),
      totalRestaurants: restaurantStats[0]?.totalRestaurants || 0,
      activeRestaurants: restaurantStats[0]?.activeRestaurants || 0,
      totalOrders: orderStats[0]?.totalOrders || 0,
      totalRevenue: orderStats[0]?.totalRevenue || 0,
      averageOrderValue: orderStats[0]?.averageOrderValue || 0
    },
    usersByRole: userStats,
    subscriptionStats,
    recentUsers,
    recentOrders,
    systemHealth: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    }
  };

  loggerUtils.logBusiness('Dashboard statistics retrieved', {
    userId,
    dataPoints: Object.keys(dashboardData).length
  });

  res.status(200).json({
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: dashboardData
  });
});

/**
 * Get all users with filtering and pagination
 */
const getAllUsers = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    role, 
    status, 
    search,
    verified,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (role) {
    query.role = role;
  }

  if (status) {
    query.status = status;
  }

  if (verified !== undefined) {
    const isVerified = verified === 'true';
    query.emailVerified = isVerified;
    query.phoneVerified = isVerified;
  }

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { 'profile.name': { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [users, totalCount] = await Promise.all([
    User.find(query)
      .populate('subscription', 'planName status features')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-passwordHash -refreshTokens'),
    User.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  loggerUtils.logBusiness('Users retrieved', {
    adminId: req.user.id,
    count: users.length,
    totalCount,
    filters: { role, status, search, verified }
  });

  res.status(200).json({
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
});

/**
 * Get single user by ID
 */
const getUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .populate('subscription')
    .select('-passwordHash -refreshTokens');

  if (!user) {
    throw new APIError('User not found', 404);
  }

  // Get user's restaurants if they're a restaurant owner
  let restaurants = [];
  if (user.role === 'restaurant_owner') {
    restaurants = await Restaurant.find({ ownerId: id })
      .select('name slug isActive isPublished stats');
  }

  const userData = {
    ...user.toObject(),
    restaurants
  };

  loggerUtils.logBusiness('User retrieved', {
    adminId: req.user.id,
    targetUserId: id,
    targetUserRole: user.role
  });

  res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: userData
  });
});

/**
 * Update user status
 */
const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const adminId = req.user.id;

  // Validate status
  const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    throw new APIError('Invalid status value', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    throw new APIError('User not found', 404);
  }

  // Prevent admins from deactivating themselves
  if (user._id.toString() === adminId && status !== 'active') {
    throw new APIError('Cannot deactivate your own account', 400);
  }

  const oldStatus = user.status;
  user.status = status;
  user.updatedBy = adminId;
  await user.save();

  loggerUtils.logBusiness('User status updated', {
    adminId,
    targetUserId: id,
    oldStatus,
    newStatus: status,
    reason
  });

  res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    data: {
      userId: user._id,
      email: user.email,
      oldStatus,
      newStatus: status,
      updatedAt: user.updatedAt
    }
  });
});

/**
 * Update user subscription
 */
const updateUserSubscription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { planKey, reason } = req.body;
  const adminId = req.user.id;

  if (!planKey) {
    throw new APIError('Plan key is required', 400);
  }

  const user = await User.findById(id).populate('subscription');
  if (!user) {
    throw new APIError('User not found', 404);
  }

  if (!user.subscription) {
    throw new APIError('User has no subscription', 400);
  }

  const subscription = user.subscription;
  const oldPlanKey = subscription.planKey;

  // Update subscription plan (this would typically involve more complex logic)
  subscription.planKey = planKey;
  subscription.updatedBy = adminId;
  
  // Add to pending changes for audit trail
  subscription.pendingChanges = {
    newPlanKey: planKey,
    changeDate: new Date(),
    reason,
    requestedBy: adminId
  };

  await subscription.save();

  loggerUtils.logBusiness('User subscription updated', {
    adminId,
    targetUserId: id,
    oldPlanKey,
    newPlanKey: planKey,
    reason
  });

  res.status(200).json({
    success: true,
    message: 'User subscription updated successfully',
    data: {
      userId: user._id,
      email: user.email,
      oldPlan: oldPlanKey,
      newPlan: planKey,
      updatedAt: subscription.updatedAt
    }
  });
});

/**
 * Delete user account
 */
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason, hardDelete = false } = req.body;
  const adminId = req.user.id;

  const user = await User.findById(id);
  if (!user) {
    throw new APIError('User not found', 404);
  }

  // Prevent admins from deleting themselves
  if (user._id.toString() === adminId) {
    throw new APIError('Cannot delete your own account', 400);
  }

  if (hardDelete) {
    // Hard delete - remove from database (use with caution)
    await User.findByIdAndDelete(id);
    
    // Also delete related data
    await Promise.all([
      Restaurant.deleteMany({ ownerId: id }),
      Subscription.deleteMany({ userId: id })
    ]);
  } else {
    // Soft delete - deactivate account
    user.status = 'inactive';
    user.updatedBy = adminId;
    await user.save();
  }

  loggerUtils.logBusiness('User deleted', {
    adminId,
    targetUserId: id,
    targetUserEmail: user.email,
    hardDelete,
    reason
  });

  res.status(200).json({
    success: true,
    message: `User ${hardDelete ? 'deleted' : 'deactivated'} successfully`,
    data: {
      userId: user._id,
      email: user.email,
      action: hardDelete ? 'deleted' : 'deactivated'
    }
  });
});

/**
 * Get platform analytics
 */
const getPlatformAnalytics = catchAsync(async (req, res) => {
  const { period = '30d', metric = 'all' } = req.query;
  const adminId = req.user.id;

  // Calculate date range based on period
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const analytics = {};

  // User growth analytics
  if (metric === 'all' || metric === 'users') {
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    analytics.userGrowth = userGrowth;
  }

  // Revenue analytics
  if (metric === 'all' || metric === 'revenue') {
    const revenueData = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: 'completed'
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalRevenue: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$pricing.total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    analytics.revenue = revenueData;
  }

  // Subscription analytics
  if (metric === 'all' || metric === 'subscriptions') {
    const subscriptionData = await Subscription.aggregate([
      {
        $group: {
          _id: {
            planType: '$planType',
            status: '$status'
          },
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'active'] },
                '$pricing.amount',
                0
              ]
            }
          }
        }
      }
    ]);

    analytics.subscriptions = subscriptionData;
  }

  loggerUtils.logBusiness('Platform analytics retrieved', {
    adminId,
    period,
    metric,
    dataPoints: Object.keys(analytics).length
  });

  res.status(200).json({
    success: true,
    message: 'Platform analytics retrieved successfully',
    data: {
      period,
      startDate,
      endDate: now,
      analytics
    }
  });
});

/**
 * Get system logs
 */
const getSystemLogs = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    level = 'all',
    category = 'all',
    dateFrom,
    dateTo
  } = req.query;

  // This is a placeholder - in a real system, you'd query your logging database
  // For now, we'll return sample log data
  const sampleLogs = [
    {
      timestamp: new Date(),
      level: 'info',
      category: 'auth',
      message: 'User login successful',
      userId: 'user123',
      ip: '192.168.1.100'
    },
    {
      timestamp: new Date(Date.now() - 300000),
      level: 'warning',
      category: 'payment',
      message: 'Payment processing slow',
      orderId: 'order456'
    },
    {
      timestamp: new Date(Date.now() - 600000),
      level: 'error',
      category: 'database',
      message: 'Connection timeout',
      details: 'MongoDB connection pool exhausted'
    }
  ];

  loggerUtils.logBusiness('System logs retrieved', {
    adminId: req.user.id,
    filters: { level, category, dateFrom, dateTo }
  });

  res.status(200).json({
    success: true,
    message: 'System logs retrieved successfully',
    data: {
      logs: sampleLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        totalCount: sampleLogs.length
      }
    }
  });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUser,
  updateUserStatus,
  updateUserSubscription,
  deleteUser,
  getPlatformAnalytics,
  getSystemLogs
};