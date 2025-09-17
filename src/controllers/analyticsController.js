const Analytics = require('../models/Analytics');
const analyticsService = require('../services/analyticsService');
const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { logger } = require('../utils/logger');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');

// ... (checkOwnership and other functions remain the same)

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

module.exports = {
  getTopPerformers,
};