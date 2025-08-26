const { catchAsync, APIError } = require('../middleware/errorHandler');
const { Order, Restaurant, User } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Get all orders with filtering and pagination
 */
const getAllOrders = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    restaurantId, 
    tableNumber, 
    customerPhone,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const userId = req.user.id;
  const userRole = req.user.role;

  // Build query based on user role
  const query = {};

  // Role-based filtering
  if (userRole === 'restaurant_owner') {
    // Restaurant owners can only see orders from their restaurants
    const userRestaurants = await Restaurant.find({ ownerId: userId }).select('_id');
    const restaurantIds = userRestaurants.map(r => r._id);
    query.restaurantId = { $in: restaurantIds };
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  }

  // Add filters
  if (status) {
    query.status = status;
  }

  if (restaurantId) {
    query.restaurantId = restaurantId;
  }

  if (tableNumber) {
    query.tableNumber = tableNumber;
  }

  if (customerPhone) {
    query['customer.phone'] = { $regex: customerPhone, $options: 'i' };
  }

  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [orders, totalCount] = await Promise.all([
    Order.find(query)
      .populate('restaurantId', 'name slug contact.phone')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip),
    Order.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  loggerUtils.logBusiness('Orders retrieved', {
    userId,
    userRole,
    count: orders.length,
    totalCount,
    filters: { status, restaurantId, tableNumber, customerPhone }
  });

  res.status(200).json({
    success: true,
    message: 'Orders retrieved successfully',
    data: {
      orders,
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
 * Get single order by ID
 */
const getOrder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const order = await Order.findById(id)
    .populate('restaurantId', 'name slug contact ownerId');

  if (!order) {
    throw new APIError('Order not found', 404);
  }

  // Check access permissions
  if (userRole === 'restaurant_owner') {
    if (!order.restaurantId || order.restaurantId.ownerId.toString() !== userId) {
      throw new APIError('Access denied', 403);
    }
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  }

  loggerUtils.logBusiness('Order retrieved', {
    userId,
    orderId: id,
    orderNumber: order.orderNumber
  });

  res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: order
  });
});

/**
 * Create new order (public endpoint for customers)
 */
const createOrder = catchAsync(async (req, res) => {
  const { restaurantId, tableNumber, customer, items, specialInstructions } = req.body;

  // Validate required fields
  if (!restaurantId || !tableNumber || !customer || !items || items.length === 0) {
    throw new APIError('Restaurant ID, table number, customer info, and items are required', 400);
  }

  // Validate customer info
  if (!customer.name || !customer.phone) {
    throw new APIError('Customer name and phone are required', 400);
  }

  // Verify restaurant exists and is active
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive || !restaurant.isPublished) {
    throw new APIError('Restaurant not available', 400);
  }

  // Verify table exists
  const table = restaurant.tables.find(t => t.number === tableNumber && t.isActive);
  if (!table) {
    throw new APIError('Table not available', 400);
  }

  // Calculate pricing
  let subtotal = 0;
  const processedItems = items.map(item => {
    // Calculate item subtotal including modifiers
    const modifiersTotal = (item.modifiers || []).reduce((sum, modifier) => {
      return sum + (modifier.totalPrice || 0);
    }, 0);
    
    const itemSubtotal = (item.price + modifiersTotal) * item.quantity;
    subtotal += itemSubtotal;

    return {
      ...item,
      subtotal: itemSubtotal,
      status: 'pending'
    };
  });

  // Apply restaurant tax and service fee settings
  const taxRate = restaurant.settings.payment.taxRate || 0;
  const serviceFeeRate = restaurant.settings.payment.serviceFee || 0;

  const taxAmount = subtotal * taxRate;
  const serviceFeeAmount = subtotal * serviceFeeRate;
  const total = subtotal + taxAmount + serviceFeeAmount;

  // Create order
  const orderData = {
    restaurantId,
    tableNumber,
    customer,
    items: processedItems,
    pricing: {
      subtotal,
      tax: {
        rate: taxRate,
        amount: taxAmount
      },
      serviceFee: {
        rate: serviceFeeRate,
        amount: serviceFeeAmount
      },
      discount: {
        type: 'percentage',
        value: 0,
        amount: 0
      },
      tip: {
        amount: 0
      },
      total,
      currency: restaurant.settings.payment.currency || 'USD'
    },
    delivery: {
      type: 'table_service',
      estimatedTime: restaurant.settings.ordering.estimatedPrepTime || 20,
      instructions: req.body.deliveryInstructions || ''
    },
    specialInstructions,
    source: {
      platform: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'web',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer')
    }
  };

  const order = new Order(orderData);
  const savedOrder = await order.save();

  // Populate restaurant info
  await savedOrder.populate('restaurantId', 'name contact.phone settings.ordering');

  loggerUtils.logBusiness('Order created', {
    orderId: savedOrder._id,
    orderNumber: savedOrder.orderNumber,
    restaurantId,
    customerPhone: customer.phone,
    total: savedOrder.pricing.total
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      orderId: savedOrder._id,
      orderNumber: savedOrder.orderNumber,
      status: savedOrder.status,
      estimatedTime: savedOrder.delivery.estimatedTime,
      total: savedOrder.pricing.total,
      currency: savedOrder.pricing.currency
    }
  });
});

/**
 * Update order status
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Validate status
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new APIError('Invalid order status', 400);
  }

  const order = await Order.findById(id).populate('restaurantId', 'ownerId name');
  if (!order) {
    throw new APIError('Order not found', 404);
  }

  // Check permissions
  if (userRole === 'restaurant_owner') {
    if (!order.restaurantId || order.restaurantId.ownerId.toString() !== userId) {
      throw new APIError('Access denied', 403);
    }
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  }

  // Update order status
  await order.updateStatus(status, userId, notes);

  loggerUtils.logBusiness('Order status updated', {
    userId,
    orderId: id,
    orderNumber: order.orderNumber,
    oldStatus: order.statusHistory[order.statusHistory.length - 2]?.status,
    newStatus: status,
    notes
  });

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory
    }
  });
});

/**
 * Get order by order number (public endpoint for customers)
 */
const getOrderByNumber = catchAsync(async (req, res) => {
  const { orderNumber } = req.params;
  const { phone } = req.query;

  if (!phone) {
    throw new APIError('Customer phone number is required', 400);
  }

  const order = await Order.findOne({ 
    orderNumber: orderNumber.toUpperCase(),
    'customer.phone': phone
  }).populate('restaurantId', 'name contact.phone settings.theme');

  if (!order) {
    throw new APIError('Order not found', 404);
  }

  // Return limited information for customer tracking
  const customerOrderData = {
    orderNumber: order.orderNumber,
    status: order.status,
    restaurantName: order.restaurantId.name,
    tableNumber: order.tableNumber,
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      status: item.status,
      specialInstructions: item.specialInstructions
    })),
    pricing: {
      total: order.pricing.total,
      currency: order.pricing.currency
    },
    delivery: {
      type: order.delivery.type,
      estimatedTime: order.delivery.estimatedTime,
      estimatedCompletion: order.estimatedCompletion
    },
    timing: {
      orderPlaced: order.timing.orderPlaced,
      orderConfirmed: order.timing.orderConfirmed,
      preparationStarted: order.timing.preparationStarted,
      orderReady: order.timing.orderReady,
      orderCompleted: order.timing.orderCompleted
    },
    duration: order.duration,
    canProvideFeedback: order.status === 'completed' && !order.feedback.rating
  };

  res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: customerOrderData
  });
});

/**
 * Add feedback to order
 */
const addOrderFeedback = catchAsync(async (req, res) => {
  const { orderNumber } = req.params;
  const { phone, rating, comment, isPublic } = req.body;

  if (!phone || !rating) {
    throw new APIError('Customer phone and rating are required', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new APIError('Rating must be between 1 and 5', 400);
  }

  const order = await Order.findOne({ 
    orderNumber: orderNumber.toUpperCase(),
    'customer.phone': phone,
    status: 'completed'
  });

  if (!order) {
    throw new APIError('Completed order not found', 404);
  }

  if (order.feedback.rating) {
    throw new APIError('Feedback already provided for this order', 400);
  }

  // Add feedback
  await order.addFeedback(rating, comment, isPublic);

  loggerUtils.logBusiness('Order feedback added', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    rating,
    customerPhone: phone
  });

  res.status(200).json({
    success: true,
    message: 'Thank you for your feedback!',
    data: {
      orderNumber: order.orderNumber,
      rating: order.feedback.rating,
      comment: order.feedback.comment
    }
  });
});

/**
 * Get order statistics
 */
const getOrderStatistics = catchAsync(async (req, res) => {
  const { restaurantId, dateFrom, dateTo } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Build filter
  const filter = {};
  
  if (userRole === 'restaurant_owner') {
    // Verify restaurant ownership
    if (restaurantId) {
      const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: userId });
      if (!restaurant) {
        throw new APIError('Restaurant not found or access denied', 403);
      }
      filter.restaurantId = restaurantId;
    } else {
      // Get all user's restaurants
      const userRestaurants = await Restaurant.find({ ownerId: userId }).select('_id');
      const restaurantIds = userRestaurants.map(r => r._id);
      filter.restaurantId = { $in: restaurantIds };
    }
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  } else if (restaurantId) {
    filter.restaurantId = restaurantId;
  }

  // Date range
  const dateRange = {};
  if (dateFrom) dateRange.from = dateFrom;
  if (dateTo) dateRange.to = dateTo;

  // Get statistics
  const stats = await Order.getStatistics(
    filter.restaurantId, 
    'restaurant', 
    dateRange
  );

  loggerUtils.logBusiness('Order statistics retrieved', {
    userId,
    userRole,
    restaurantId,
    dateRange
  });

  res.status(200).json({
    success: true,
    message: 'Order statistics retrieved successfully',
    data: stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      cancelledOrders: 0
    }
  });
});

module.exports = {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  getOrderByNumber,
  addOrderFeedback,
  getOrderStatistics
};