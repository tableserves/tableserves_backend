const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { TableServeRating, Order } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Submit TableServe platform rating
 */
const submitTableServeRating = catchAsync(async (req, res) => {
  const {
    orderNumber,
    phone,
    serviceRating,
    serviceFeedback,
    categories,
    tableNumber
  } = req.body;

  // Validation
  if (!orderNumber || !phone || !serviceRating) {
    throw new APIError('Order number, phone, and service rating are required', 400);
  }

  if (serviceRating < 1 || serviceRating > 5) {
    throw new APIError('Service rating must be between 1 and 5', 400);
  }

  // Find the order to get customer and location information
  // Try multiple order number formats and phone number formats
  const orderNumberVariants = [
    orderNumber,
    orderNumber.toUpperCase(),
    orderNumber.toLowerCase(),
    `ORD-${orderNumber}`,
    `ORD-${orderNumber.toUpperCase()}`
  ];

  const phoneVariants = [
    phone,
    phone.replace(/\D/g, ''), // Remove non-digits
    `+91${phone.replace(/\D/g, '')}`, // Add country code
    phone.replace(/[\s\-\(\)]/g, '') // Remove common formatting
  ];

  let order = null;

  // Try different combinations
  for (const orderNum of orderNumberVariants) {
    for (const phoneNum of phoneVariants) {
      order = await Order.findOne({
        $or: [
          { orderNumber: orderNum, 'customer.phone': phoneNum },
          { orderNumber: orderNum, customerPhone: phoneNum },
          { orderNumber: orderNum, phone: phoneNum }
        ]
      }).populate('restaurantId', 'name').populate('zoneId', 'name').populate('shopId', 'name');

      if (order) break;
    }
    if (order) break;
  }

  // If still not found, try without phone verification (less secure but more flexible)
  if (!order) {
    for (const orderNum of orderNumberVariants) {
      order = await Order.findOne({
        orderNumber: orderNum
      }).populate('restaurantId', 'name').populate('zoneId', 'name').populate('shopId', 'name');

      if (order) {
        logger.warn('Order found without phone verification', {
          orderNumber: orderNum,
          providedPhone: phone,
          orderPhone: order.customer?.phone || order.customerPhone || order.phone
        });
        break;
      }
    }
  }

  if (!order) {
    logger.error('Order not found for TableServe rating', {
      orderNumber,
      phone,
      orderNumberVariants,
      phoneVariants
    });
    throw new APIError('Order not found. Please check your order number and phone number.', 404);
  }

  // Check if rating already exists using the found order's details
  const existingRating = await TableServeRating.findOne({
    orderNumber: order.orderNumber,
    $or: [
      { 'customer.phone': phone },
      { 'customer.phone': order.customer?.phone },
      { 'customer.phone': order.customerPhone },
      { 'customer.phone': order.phone }
    ]
  });

  if (existingRating) {
    throw new APIError('TableServe rating already submitted for this order', 400);
  }

  // Create TableServe rating
  const ratingData = {
    orderNumber: orderNumber.toUpperCase(),
    orderId: order._id,
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email
    },
    restaurantId: order.restaurantId?._id,
    zoneId: order.zoneId?._id,
    shopId: order.shopId?._id,
    serviceRating,
    serviceFeedback: serviceFeedback || '',
    categories: categories || {},
    tableNumber: tableNumber || order.tableNumber,
    platform: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'web',
    source: {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer')
    }
  };

  const rating = new TableServeRating(ratingData);
  await rating.save();

  loggerUtils.logBusiness('TableServe rating submitted', {
    ratingId: rating._id,
    orderNumber: rating.orderNumber,
    serviceRating,
    customerPhone: phone
  });

  res.status(201).json({
    success: true,
    message: 'Thank you for rating TableServe!',
    data: {
      ratingId: rating._id,
      orderNumber: rating.orderNumber,
      serviceRating: rating.serviceRating
    }
  });
});

/**
 * Get TableServe platform statistics (Super Admin)
 */
const getTableServeStatistics = catchAsync(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const userRole = req.user.role;

  // Only super admin can access platform statistics
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  }

  // Build date range
  const dateRange = {};
  if (dateFrom) dateRange.from = dateFrom;
  if (dateTo) dateRange.to = dateTo;

  // Get platform statistics
  const stats = await TableServeRating.getPlatformStatistics(dateRange);

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * Get recent TableServe ratings (Super Admin Dashboard)
 */
const getRecentTableServeRatings = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  const userRole = req.user.role;

  // Only super admin can access recent ratings
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  }

  // Get recent ratings
  const ratings = await TableServeRating.getRecentRatings(parseInt(limit));

  // Format for dashboard display
  const formattedRatings = ratings.map(rating => ({
    id: rating._id,
    orderNumber: rating.orderNumber,
    customerName: rating.customer.name,
    customerPhone: rating.customer.phone,
    serviceRating: rating.serviceRating,
    serviceFeedback: rating.serviceFeedback,
    submittedAt: rating.createdAt,
    tableNumber: rating.tableNumber,
    venue: rating.restaurantId ? {
      type: 'restaurant',
      name: rating.restaurantId.name
    } : rating.zoneId ? {
      type: 'zone',
      name: rating.zoneId.name,
      shop: rating.shopId?.name
    } : null
  }));

  res.status(200).json({
    success: true,
    data: formattedRatings
  });
});

/**
 * Get all TableServe ratings with filtering (Role-based access)
 */
const getAllTableServeRatings = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    rating,
    dateFrom,
    dateTo,
    restaurantId,
    zoneId
  } = req.query;
  const userRole = req.user.role;
  const userId = req.user.id;

  // Build filter based on user role
  const filter = {};

  // Role-based filtering
  if (userRole === 'restaurant_owner') {
    // Restaurant owners can only see ratings for their own restaurants
    // We need to add logic to find user's restaurant(s)
    // For now, filter by restaurantId if provided in query
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    } else {
      // If no restaurantId provided, we need to find the user's restaurant
      // This would require a lookup to the Restaurant model
      // For now, return empty if no restaurantId specified
      filter.restaurantId = { $exists: false }; // This ensures no results unless restaurantId is specified
    }
  } else if (userRole === 'zone_admin') {
    // Zone admins can only see ratings for their zone
    if (zoneId) {
      filter.zoneId = zoneId;
    } else {
      // If no zoneId provided, return empty
      filter.zoneId = { $exists: false };
    }
  } else if (userRole === 'zone_shop') {
    // Zone shop owners can only see ratings for their specific shop within a zone
    if (zoneId && req.query.shopId) {
      filter.zoneId = zoneId;
      filter.shopId = req.query.shopId;
    } else {
      // If zone and shop not specified, return empty
      filter.$and = [{ zoneId: { $exists: false } }, { shopId: { $exists: false } }];
    }
  } else if (userRole !== 'super_admin' && userRole !== 'admin') {
    // For any other roles, deny access
    throw new APIError('Access denied', 403);
  }
  // super_admin and admin can see all ratings (no additional filtering)

  // Additional filters
  if (rating && rating !== 'all') {
    filter.serviceRating = parseInt(rating);
  }

  if (restaurantId && (userRole === 'super_admin' || userRole === 'admin')) {
    filter.restaurantId = restaurantId;
  }

  if (zoneId && (userRole === 'super_admin' || userRole === 'admin')) {
    filter.zoneId = zoneId;
  }

  // Add date filter
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  // Get ratings with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const ratings = await TableServeRating.find(filter)
    .populate('restaurantId', 'name')
    .populate('zoneId', 'name')
    .populate('shopId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await TableServeRating.countDocuments(filter);

  // Format ratings data
  const formattedRatings = ratings.map(rating => ({
    id: rating._id,
    orderNumber: rating.orderNumber,
    customerName: rating.customer.name,
    customerPhone: rating.customer.phone,
    serviceRating: rating.serviceRating,
    serviceFeedback: rating.serviceFeedback,
    categories: rating.categories,
    averageCategoryRating: rating.averageCategoryRating,
    submittedAt: rating.createdAt,
    tableNumber: rating.tableNumber,
    isPublic: rating.isPublic,
    venue: rating.restaurantId ? {
      type: 'restaurant',
      name: rating.restaurantId.name
    } : rating.zoneId ? {
      type: 'zone',
      name: rating.zoneId.name,
      shop: rating.shopId?.name
    } : null,
    adminResponse: rating.adminResponse
  }));

  res.status(200).json({
    success: true,
    data: {
      ratings: formattedRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * Get public TableServe platform statistics (no authentication required)
 */
const getPublicTableServeStatistics = catchAsync(async (req, res) => {
  // Get platform statistics without date filters for public view
  const stats = await TableServeRating.getPlatformStatistics({});

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * Get recent public TableServe ratings (no authentication required)
 */
const getPublicRecentTableServeRatings = catchAsync(async (req, res) => {
  const { limit = 8 } = req.query;

  // Get recent ratings (public only)
  const ratings = await TableServeRating.getRecentRatings(parseInt(limit));

  // Format for public display (only include public info)
  const formattedRatings = ratings.map(rating => ({
    id: rating._id,
    customerName: rating.customer.name,
    serviceRating: rating.serviceRating,
    serviceFeedback: rating.serviceFeedback,
    submittedAt: rating.createdAt
  }));

  res.status(200).json({
    success: true,
    data: formattedRatings
  });
});

module.exports = {
  submitTableServeRating,
  getTableServeStatistics,
  getRecentTableServeRatings,
  getAllTableServeRatings,
  getPublicTableServeStatistics,
  getPublicRecentTableServeRatings
};
