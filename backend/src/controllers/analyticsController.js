const Analytics = require('../models/Analytics');
const analyticsService = require('../services/analyticsService');
const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { logger } = require('../utils/logger');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const Order = require('../models/Order');

/**
 * Helper function to get date filter based on time range
 */
const getDateFilter = (timeRange = '7d') => {
  const now = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '1d':
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7d':
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
    case 'month':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
    case 'quarter':
      startDate.setDate(now.getDate() - 90);
      break;
    case '365d':
    case 'year':
      startDate.setDate(now.getDate() - 365);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }
  
  return startDate;
};

/**
 * @desc    Get top performing restaurants and zones
 * @route   GET /api/v1/analytics/performance/top
 * @access  Private (Admin only)
 */
const getTopPerformers = catchAsync(async (req, res) => {
  const { limit = 5 } = req.query;

  const restaurants = await Restaurant.find({ isActive: true })
    .sort({ 'stats.totalRevenue': -1 })
    .limit(parseInt(limit))
    .select('name stats.totalRevenue stats.totalOrders');

  const zones = await Zone.find({ active: true })
    .sort({ 'stats.totalRevenue': -1 })
    .limit(parseInt(limit))
    .select('name stats.totalRevenue stats.totalOrders');

  const performers = [
    ...restaurants.map(r => ({
      name: r.name,
      type: 'Restaurant',
      revenue: r.stats.totalRevenue,
      orders: r.stats.totalOrders,
      status: 'active',
    })),
    ...zones.map(z => ({
      name: z.name,
      type: 'Zone',
      revenue: z.stats.totalRevenue,
      orders: z.stats.totalOrders,
      status: 'active',
    })),
  ];

  performers.sort((a, b) => b.revenue - a.revenue);

  res.status(200).json({
    success: true,
    data: performers.slice(0, parseInt(limit)),
  });
});

/**
 * @desc    Get zone analytics with revenue and order statistics
 * @route   GET /api/v1/analytics/zones/:zoneId
 * @access  Private (Admin, Zone Admin - own zone only)
 */
const getZoneAnalytics = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const { timeRange = '7d' } = req.query;

  // Verify zone exists
  const zone = await Zone.findById(zoneId);
  if (!zone) {
    throw new APIError('Zone not found', 404);
  }

  // Check authorization - admin or zone admin for this zone
  if (req.user.role !== 'admin' && 
      (req.user.role !== 'zone_admin' || req.user.entityId?.toString() !== zoneId)) {
    throw new APIError('Access denied to view zone analytics', 403);
  }

  // Get date filter
  const startDate = getDateFilter(timeRange);

  // Get zone shops
  const zoneShops = await ZoneShop.find({ zoneId, status: 'active' });
  const shopIds = zoneShops.map(shop => shop._id);

  // Aggregate orders for this zone
  const orderStats = await Order.aggregate([
    {
      $match: {
        zoneId: zone._id,
        createdAt: { $gte: startDate },
        status: { $nin: ['cancelled'] } // Exclude cancelled orders from revenue
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);

  // Get cancelled orders separately
  const cancelledStats = await Order.countDocuments({
    zoneId: zone._id,
    createdAt: { $gte: startDate },
    status: 'cancelled'
  });

  // Get shop performance breakdown
  const shopPerformance = await Order.aggregate([
    {
      $match: {
        zoneId: zone._id,
        shopId: { $in: shopIds },
        createdAt: { $gte: startDate },
        status: { $nin: ['cancelled'] } // Exclude cancelled orders from revenue
      }
    },
    {
      $group: {
        _id: '$shopId',
        revenue: { $sum: '$pricing.total' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { revenue: -1 }
    },
    {
      $limit: 10
    }
  ]);

  // Populate shop names
  const shopPerformanceWithNames = await Promise.all(
    shopPerformance.map(async (perf) => {
      const shop = await ZoneShop.findById(perf._id).select('name');
      return {
        shopId: perf._id,
        shopName: shop?.name || 'Unknown Shop',
        revenue: perf.revenue,
        orders: perf.orders
      };
    })
  );

  // Get daily revenue trend
  const dailyRevenue = await Order.aggregate([
    {
      $match: {
        zoneId: zone._id,
        createdAt: { $gte: startDate },
        status: { $nin: ['cancelled'] } // Exclude cancelled orders from revenue
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$pricing.total' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const periodStats = orderStats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    completedOrders: 0
  };

  periodStats.cancelledOrders = cancelledStats;

  res.status(200).json({
    success: true,
    data: {
      zone: {
        id: zone._id,
        name: zone.name,
        active: zone.active
      },
      timeRange,
      overview: {
        totalRevenue: periodStats.totalRevenue || 0,
        totalOrders: periodStats.totalOrders || 0,
        averageOrderValue: periodStats.averageOrderValue || 0,
        completedOrders: periodStats.completedOrders || 0,
        cancelledOrders: periodStats.cancelledOrders || 0,
        activeShops: zoneShops.length,
        totalShops: zoneShops.length
      },
      topShops: shopPerformanceWithNames,
      dailyRevenue: dailyRevenue.map(day => ({
        date: day._id,
        revenue: day.revenue,
        orders: day.orders
      }))
    }
  });
});

/**
 * @desc    Get shop analytics with revenue and order statistics
 * @route   GET /api/v1/analytics/shops/:shopId
 * @access  Private (Admin, Zone Admin, Shop Owner)
 */
const getShopAnalytics = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { timeRange = '7d' } = req.query;

  // Verify shop exists
  const shop = await ZoneShop.findById(shopId).populate('zoneId', 'name');
  if (!shop) {
    throw new APIError('Shop not found', 404);
  }

  // Check authorization
  const isAdmin = req.user.role === 'admin';
  const isZoneAdmin = req.user.role === 'zone_admin' && 
                      req.user.entityId?.toString() === shop.zoneId._id.toString();
  const isShopOwner = shop.ownerId?.toString() === req.user.id;

  if (!isAdmin && !isZoneAdmin && !isShopOwner) {
    throw new APIError('Access denied to view shop analytics', 403);
  }

  // Get date filter
  const startDate = getDateFilter(timeRange);

  // Aggregate orders for this shop
  const orderStats = await Order.aggregate([
    {
      $match: {
        shopId: shop._id,
        createdAt: { $gte: startDate },
        status: { $nin: ['cancelled'] } // Exclude cancelled orders from revenue
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);

  // Get cancelled orders separately
  const cancelledStats = await Order.countDocuments({
    shopId: shop._id,
    createdAt: { $gte: startDate },
    status: 'cancelled'
  });

  // Get daily revenue trend
  const dailyRevenue = await Order.aggregate([
    {
      $match: {
        shopId: shop._id,
        createdAt: { $gte: startDate },
        status: { $nin: ['cancelled'] } // Exclude cancelled orders from revenue
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$pricing.total' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const periodStats = orderStats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    completedOrders: 0
  };

  periodStats.cancelledOrders = cancelledStats;

  const completionRate = periodStats.totalOrders > 0
    ? Math.round((periodStats.completedOrders / periodStats.totalOrders) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      shop: {
        id: shop._id,
        name: shop.name,
        category: shop.category,
        zone: {
          id: shop.zoneId._id,
          name: shop.zoneId.name
        }
      },
      timeRange,
      overview: {
        totalRevenue: periodStats.totalRevenue || 0,
        totalOrders: periodStats.totalOrders || 0,
        averageOrderValue: periodStats.averageOrderValue || 0,
        completedOrders: periodStats.completedOrders || 0,
        cancelledOrders: periodStats.cancelledOrders || 0,
        completionRate
      },
      dailyRevenue: dailyRevenue.map(day => ({
        date: day._id,
        revenue: day.revenue,
        orders: day.orders
      }))
    }
  });
});

/**
 * @desc    Get general analytics (placeholder for future implementation)
 * @route   GET /api/v1/analytics
 * @access  Private (Admin only)
 */
const getAnalytics = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'General analytics endpoint - to be implemented',
    data: {}
  });
});

/**
 * @desc    Get performance metrics (placeholder for future implementation)
 * @route   GET /api/v1/analytics/performance
 * @access  Private (Admin only)
 */
const getPerformanceMetrics = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Performance metrics endpoint - to be implemented',
    data: {}
  });
});

module.exports = {
  getTopPerformers,
  getZoneAnalytics,
  getShopAnalytics,
  getAnalytics,
  getPerformanceMetrics
};