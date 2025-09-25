const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { Order, Restaurant, User, Zone, ZoneShop } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const realtimeOrderService = require('../services/realtimeOrderService');
const ZoneOrderSplittingService = require('../services/zoneOrderSplittingService');
const MultiShopOrderTrackingService = require('../services/multiShopOrderTrackingService');
const orderPaymentService = require('../services/orderPaymentService');

/**
 * Get all orders with filtering and pagination
 */
const getAllOrders = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 100, 
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

  console.log('📋 getAllOrders ENTRY:', {
    userId,
    userRole,
    query: req.query,
    userShopId: req.user.shopId,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  });

  // Build query based on user role
  const query = {};

  // Role-based filtering
  if (userRole === 'restaurant_owner') {
    // Restaurant owners can only see orders from their restaurants
    if (restaurantId) {
      // If specific restaurant requested, verify ownership
      const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: userId });
      if (!restaurant) {
        throw new APIError('Access denied', 403);
      }
      query.restaurantId = restaurantId;
    } else {
      // Get all restaurants owned by this user
      const userRestaurants = await Restaurant.find({ ownerId: userId }).select('_id');
      const restaurantIds = userRestaurants.map(r => r._id);
      query.restaurantId = { $in: restaurantIds };
    }
  } else if (userRole === 'zone_shop' || userRole === 'zone_vendor') {
    // Zone shops/vendors can only see their own orders
    const { shopId } = req.query;
    console.log('🏪 Zone shop/vendor user order access:', {
      userId,
      userRole,
      requestedShopId: shopId,
      userShopId: req.user.shopId
    });
    
    if (shopId) {
      // If specific shop requested, verify ownership
      const shop = await ZoneShop.findOne({ _id: shopId, ownerId: userId });
      console.log('🔍 Shop ownership verification:', {
        requestedShopId: shopId,
        shopFound: !!shop,
        shopOwnerId: shop?.ownerId?.toString(),
        userId
      });
      
      if (!shop) {
        throw new APIError('Access denied - shop not found or not owned by user', 403);
      }
      query.shopId = shopId;
    } else {
      // If no specific shopId provided, get all shops owned by this user
      const userShops = await ZoneShop.find({ ownerId: userId }).select('_id');
      console.log('📋 User owned shops:', {
        userId,
        shopsCount: userShops.length,
        shopIds: userShops.map(s => s._id.toString())
      });
      
      if (userShops.length > 0) {
        const shopIds = userShops.map(s => s._id);
        query.shopId = { $in: shopIds };
      } else {
        // If user doesn't own any shops, return empty result
        console.log('⚠️ User owns no shops, returning empty results');
        query.shopId = null; // This will return no results
      }
    }
  } else if (userRole === 'zone_admin') {
    // Zone admins can only see orders from their zones
    const { zoneId } = req.query;
    if (zoneId) {
      // If specific zone requested, verify ownership
      const zone = await Zone.findOne({ _id: zoneId, adminId: userId });
      if (!zone) {
        throw new APIError('Access denied', 403);
      }
      query.zoneId = zoneId;
      // Only fetch main zone orders, not shop split orders
      query.orderType = { $nin: ['shop_split', 'zone_shop'] };
    } else {
      // Get all zones owned by this user
      const userZones = await Zone.find({ adminId: userId }).select('_id');
      const zoneIds = userZones.map(z => z._id);
      if (zoneIds.length > 0) {
        query.zoneId = { $in: zoneIds };
        // Only fetch main zone orders, not shop split orders
        query.orderType = { $nin: ['shop_split', 'zone_shop'] };
      } else {
        // If user doesn't own any zones, return empty result
        query.zoneId = null; // This will return no results
      }
    }
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  } else if (userRole === 'admin') {
    // Admin users should only see restaurant orders and zone merged orders, not individual shop orders
    query.$or = [
      { restaurantId: { $exists: true } }, // Restaurant orders
      { orderType: { $in: ['zone_split', 'zone_main'] } }, // Zone merged orders (both legacy and new)
      { orderType: { $exists: false }, zoneId: { $exists: true }, shopId: { $exists: false } } // Zone orders without shop split
    ];
  }

  console.log('Final query:', query);

  // Enhanced logging for zone admin order fetching
  if (userRole === 'zone_admin') {
    console.log('🏢 Zone Admin Order Query Details:', {
      zoneId: req.query.zoneId,
      userId,
      finalQuery: query,
      orderTypeFilter: query.orderType,
      expectedResult: 'Only main zone orders, no shop split orders'
    });
  }

  // Add filters
  if (status) {
    query.status = status;
  }

  if (restaurantId && userRole !== 'restaurant_owner') {
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
  
  // Add comprehensive error handling and validation
  let orders = [];
  let totalCount = 0;
  
  try {
    const [ordersResult, countResult] = await Promise.all([
      Order.find(query)
        .populate('restaurantId', 'name slug contact.phone')
        .populate('shopId', 'name')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip)
        .lean(), // Add lean() for better performance
      Order.countDocuments(query)
    ]);
    
    // Ensure orders is always an array with explicit validation
    orders = Array.isArray(ordersResult) ? ordersResult : [];
    totalCount = typeof countResult === 'number' ? countResult : 0;
    
    console.log('Orders query result:', {
      queryUsed: query,
      ordersFound: orders.length,
      totalCount,
      restaurantId,
      userId,
      userRole,
      orderTypes: orders.map(o => ({ orderNumber: o.orderNumber, orderType: o.orderType, zoneId: o.zoneId, shopId: o.shopId })),
      zoneOrderBreakdown: {
        mainZoneOrders: orders.filter(o => o.orderType === 'zone_main' || o.orderType === 'zone_split').length,
        shopOrders: orders.filter(o => o.orderType === 'zone_shop' || o.orderType === 'shop_split').length,
        regularOrders: orders.filter(o => !o.orderType || o.orderType === 'single').length
      }
    });
  } catch (dbError) {
    console.error('Database query error:', dbError);
    // Return empty result instead of throwing error
    orders = [];
    totalCount = 0;
  }

  // Ensure orders is always an array with additional safety
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalPages = Math.ceil(totalCount / parseInt(limit));

  loggerUtils.logBusiness('Orders retrieved', {
    userId,
    userRole,
    count: safeOrders.length,
    totalCount,
    filters: { status, restaurantId, tableNumber, customerPhone }
  });

  res.status(200).json({
    success: true,
    message: 'Orders retrieved successfully',
    data: safeOrders || [], // Return orders directly as array for frontend compatibility
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalCount,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    }
  });
});

/**
 * Get single order by ID
 */
const getOrder = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('getOrder called with:', { id, userId, userRole, query: req.query });

    const order = await Order.findById(id)
      .populate('restaurantId', 'name slug contact ownerId')
      .populate('shopId', 'name ownerId');

    if (!order) {
      throw new APIError('Order not found', 404);
    }

    console.log('Order found:', order);

    // Check access permissions with proper null checks
    if (userRole === 'restaurant_owner') {
      const restaurantId = order.restaurantId;
      if (!restaurantId || 
          (typeof restaurantId === 'object' && !restaurantId.ownerId) ||
          (typeof restaurantId === 'object' && restaurantId.ownerId && restaurantId.ownerId.toString() !== userId)) {
        throw new APIError('Access denied', 403);
      }
    } else if (userRole === 'zone_shop' || userRole === 'zone_vendor') {
      // Zone shops/vendors can only see orders for their shop
      console.log('🏪 Zone shop/vendor order access verification:', {
        userId,
        userRole,
        orderShopId: order.shopId?.toString(),
        requestedShopId: req.query.shopId,
        userShopId: req.user.shopId?.toString()
      });
      
      // Check if the order belongs to the user's shop
      if (!order.shopId) {
        throw new APIError('Access denied - order does not belong to any shop', 403);
      }
      
      // For zone_shop/zone_vendor users, check if the order's shopId matches either:
      // 1. The shopId in the query (if provided) AND user owns that shop
      // 2. The user's shopId (from authentication)
      // 3. A shop owned by the user (direct verification)
      let hasAccess = false;
      
      if (req.query.shopId) {
        // If specific shop requested, verify ownership AND match
        const shop = await ZoneShop.findOne({ _id: req.query.shopId, ownerId: userId });
        if (shop && order.shopId.toString() === req.query.shopId) {
          hasAccess = true;
        }
      } else if (req.user.shopId) {
        // If user has a shopId from authentication, check if it matches the order's shop
        hasAccess = order.shopId.toString() === req.user.shopId.toString();
      }
      
      // Fallback: Direct ownership verification
      if (!hasAccess) {
        const shop = await ZoneShop.findOne({ _id: order.shopId, ownerId: userId });
        hasAccess = !!shop;
      }
      
      console.log('🔓 Zone shop access result:', {
        hasAccess,
        orderShopId: order.shopId?.toString(),
        userId
      });
      
      if (!hasAccess) {
        throw new APIError('Access denied - order does not belong to your shop', 403);
      }
    } else if (userRole === 'zone_admin') {
      // Zone admins can only see orders from their zones
      if (!order.zoneId) {
        throw new APIError('Access denied - order does not belong to a zone', 403);
      }
      
      // Verify zone ownership
      const zone = await Zone.findOne({ _id: order.zoneId, adminId: userId });
      if (!zone) {
        throw new APIError('Access denied - zone not owned by user', 403);
      }
    } else if (userRole !== 'admin') {
      throw new APIError('Access denied', 403);
    }

    loggerUtils.logBusiness('Order retrieved', {
      userId,
      orderId: id,
      orderNumber: order.orderNumber || 'N/A'
    });

    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in getOrder:', error);
    throw error;
  }
});

/**
 * Create new order (public endpoint for customers)
 */
const createOrder = catchAsync(async (req, res) => {
  try {
    const { restaurantId, zoneId, tableNumber, customer, items, specialInstructions, paymentMethod } = req.body;

  // Validate required fields (simplified)
  if (!restaurantId && !zoneId) {
    throw new APIError('Restaurant ID or Zone ID is required', 400);
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new APIError('Order must contain at least one item', 400);
  }
  
  // Set defaults for missing fields
  const orderTableNumber = tableNumber || '1';
  const orderCustomer = {
    name: customer?.name || 'Customer',
    phone: customer?.phone || '0000000000',
    email: customer?.email || ''
  };

  // Handle customer user creation for online payments
  let customerUser = null;
  if (paymentMethod === 'online' && customer.phone) {
    customerUser = await createOrGetCustomerUser(customer);
  }

    // Update request body with processed values
    req.body.tableNumber = orderTableNumber;
    req.body.customer = orderCustomer;
    
    // Determine if this is a restaurant or zone order
    if (restaurantId) {
      return await handleRestaurantOrder(req, res, customerUser);
    } else if (zoneId) {
      return await handleZoneOrder(req, res, customerUser);
    }
  } catch (error) {
    console.error('Order creation error:', error);
    throw new APIError('Failed to create order: ' + error.message, 400);
  }
});

/**
 * Create or get existing customer user for online payments
 */
const createOrGetCustomerUser = async (customer) => {
  try {
    // Check if customer user already exists
    let customerUser = await User.findOne({
      phone: customer.phone,
      role: 'customer'
    });

    if (!customerUser) {
      // Create new customer user
      const { hashPassword } = require('../services/authService');
      const defaultPassword = `customer${customer.phone.slice(-4)}`;
      const passwordHash = await hashPassword(defaultPassword);

      customerUser = new User({
        email: customer.email || `customer${customer.phone}@tableserve.com`,
        phone: customer.phone,
        passwordHash,
        role: 'customer',
        profile: {
          name: customer.name
        },
        status: 'active',
        emailVerified: false,
        phoneVerified: true // Assume phone is verified since they're ordering
      });

      await customerUser.save();

      logger.info('Customer user created for online payment', {
        customerId: customerUser._id,
        phone: customer.phone,
        name: customer.name
      });
    }

    return customerUser;
  } catch (error) {
    logger.error('Failed to create customer user:', error);
    return null; // Don't fail the order if customer creation fails
  }
};

/**
 * Handle restaurant order creation
 */
const handleRestaurantOrder = async (req, res, customerUser) => {
  try {
    const { restaurantId, tableNumber, customer, items, specialInstructions, paymentMethod } = req.body;

  // Verify restaurant exists and is active
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new APIError('Restaurant not available', 400);
  }

  // Verify table exists (simplified check)
  const table = restaurant.tables.find(t => t.number === tableNumber);
  if (!table) {
    // If table doesn't exist, create a basic table entry for the order
    console.log(`Table ${tableNumber} not found, proceeding with order anyway`);
  }

  // Calculate pricing with error handling
  let subtotal = 0;
  const processedItems = items.map(item => {
    try {
      // Clean up and calculate modifiers
      let cleanModifiers = [];
      let modifiersTotal = 0;
      
      if (item.modifiers) {
        if (Array.isArray(item.modifiers)) {
          // Filter out empty modifiers
          cleanModifiers = item.modifiers.filter(mod => mod && mod.name && mod.name.trim());
          modifiersTotal = cleanModifiers.reduce((sum, modifier) => {
            return sum + (parseFloat(modifier.totalPrice) || 0);
          }, 0);
        }
      }

      const itemPrice = parseFloat(item.price) || 0;
      const itemQuantity = parseInt(item.quantity) || 1;
      const itemSubtotal = (itemPrice + modifiersTotal) * itemQuantity;
      subtotal += itemSubtotal;

      return {
        ...item,
        price: itemPrice,
        quantity: itemQuantity,
        modifiers: cleanModifiers,
        subtotal: itemSubtotal,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error processing item:', item, error);
      return {
        ...item,
        price: 0,
        quantity: 1,
        subtotal: 0,
        status: 'pending'
      };
    }
  });

  // No tax or service fee calculations for customer orders
  const taxAmount = 0;
  const serviceFeeAmount = 0;
  const total = subtotal;

  // Map 'COD' to 'cash' for consistency with Order model enum values
  const mappedPaymentMethod = paymentMethod === 'COD' ? 'cash' : (paymentMethod || 'cash');

  // Create order
  const orderData = {
    restaurantId,
    tableNumber,
    customer: {
      ...customer,
      userId: customerUser?._id // Link to customer user if created
    },
    items: processedItems,
    pricing: {
      subtotal,
      tax: {
        rate: 0,
        amount: taxAmount
      },
      serviceFee: {
        rate: 0,
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
      currency: restaurant.settings?.payment?.currency || 'USD'
    },
    payment: {
      method: mappedPaymentMethod,
      status: 'pending'
    },
    delivery: {
      type: 'table_service',
      estimatedTime: restaurant.settings?.ordering?.estimatedPrepTime || 20,
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
  order.isNew = true; // Mark as new order for real-time notifications
  await order.save();

  // Send real-time notification to restaurant
  try {
    await realtimeOrderService.notifyRestaurant(restaurantId, order);
  } catch (notificationError) {
    console.error('Failed to send real-time notification:', notificationError);
    // Don't fail the order creation if notification fails
  }

  loggerUtils.logBusiness('Restaurant order created', order._id, {
    restaurantId,
    tableNumber,
    customerPhone: customer.phone,
    total,
    itemCount: items.length
  });

  // Prepare response data
  const responseData = {
    order: order,
    requiresPayment: mappedPaymentMethod === 'online' || paymentMethod === 'online',
    paymentMethod: mappedPaymentMethod
  };

  // If online payment is required, include payment instructions
  if (responseData.requiresPayment) {
    responseData.paymentInstructions = {
      message: 'Please proceed to payment to confirm your order',
      nextStep: 'Call /api/v1/orders/create-payment with orderId to initiate payment',
      orderId: order._id
    };
  }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Restaurant order creation error:', error);
    throw new APIError('Failed to create restaurant order: ' + error.message, 400);
  }
};

/**
 * Handle zone order creation with splitting
 */
const handleZoneOrder = async (req, res, customerUser) => {
  const { zoneId, tableNumber, customer, items, specialInstructions, paymentMethod } = req.body;

  // Verify zone exists and is active
  const zone = await Zone.findById(zoneId);
  if (!zone || !zone.active) {
    throw new APIError('Zone not available', 400);
  }

  // Calculate total pricing
  let subtotal = 0;
  const processedItems = items.map(item => {
    // Ensure modifiers is always an array
    const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
    const modifiersTotal = modifiers.reduce((sum, modifier) => {
      return sum + (modifier.totalPrice || 0);
    }, 0);

    const itemSubtotal = (item.price + modifiersTotal) * item.quantity;
    subtotal += itemSubtotal;

    return {
      ...item,
      modifiers, // Use the validated modifiers array
      subtotal: itemSubtotal,
      status: 'pending'
    };
  });

  // No tax or service fee calculations for customer orders
  const taxAmount = 0;
  const serviceFeeAmount = 0;
  const total = subtotal;

  // Map 'COD' to 'cash' for consistency with Order model enum values
  const mappedPaymentMethod = paymentMethod === 'COD' ? 'cash' : (paymentMethod || 'cash');

  // Prepare order data for zone splitting
  const zoneOrderData = {
    zoneId,
    tableNumber,
    customer: {
      ...customer,
      userId: customerUser?._id // Link to customer user if created
    },
    items: processedItems,
    pricing: {
      subtotal,
      tax: { rate: 0, amount: taxAmount },
      serviceFee: { rate: 0, amount: serviceFeeAmount },
      total,
      currency: 'USD'
    },
    paymentMethod: mappedPaymentMethod,
    specialInstructions,
    source: {
      platform: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'web',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer')
    }
  };

  // Process zone order with splitting logic
  const result = await ZoneOrderSplittingService.processZoneOrder(zoneOrderData);

  loggerUtils.logBusiness('Zone order created with splitting', result.mainOrder._id, {
    zoneId,
    tableNumber,
    customerPhone: customer.phone,
    total,
    shopCount: result.shopOrders.length,
    itemCount: items.length
  });

  // Prepare response data with payment information
  const responseData = {
    mainOrder: result.mainOrder,
    shopOrders: result.shopOrders,
    splitCount: result.shopOrders.length,
    requiresPayment: mappedPaymentMethod === 'online' || paymentMethod === 'online',
    paymentMethod: mappedPaymentMethod
  };

  // If online payment is required, include payment instructions
  if (responseData.requiresPayment) {
    responseData.paymentInstructions = {
      message: 'Please proceed to payment to confirm your order',
      nextStep: 'Call /api/v1/orders/create-payment with orderId to initiate payment',
      orderId: result.mainOrder._id
    };
  }

  res.status(201).json({
    success: true,
    message: result.message,
    data: responseData
  });
};

/**
 * Update order status with real-time notifications
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!status) {
    throw new APIError('Status is required', 400);
  }

  const validStatuses = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new APIError('Invalid status', 400);
  }

  // Find the order
  const order = await Order.findById(id);
  if (!order) {
    throw new APIError('Order not found', 404);
  }

  // Check permissions based on user role and order type
  if (userRole === 'restaurant_owner') {
    // Restaurant owner can only update their restaurant's orders
    if (!order.restaurantId) {
      throw new APIError('Access denied - not a restaurant order', 403);
    }
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== userId) {
      throw new APIError('Access denied - order not owned by user', 403);
    }
  } else if (userRole === 'zone_admin') {
    // Zone admin can update orders in their zone
    if (!order.zoneId) {
      throw new APIError('Access denied - not a zone order', 403);
    }
    const Zone = require('../models/Zone');
    const zone = await Zone.findById(order.zoneId);
    if (!zone || zone.adminId.toString() !== userId) {
      throw new APIError('Access denied - zone not owned by user', 403);
    }
  } else if (userRole === 'zone_shop' || userRole === 'zone_vendor') {
    // Zone shop/vendor can only update orders for their shop
    if (!order.shopId) {
      throw new APIError('Access denied - not a shop order', 403);
    }
    const ZoneShop = require('../models/ZoneShop');
    const shop = await ZoneShop.findById(order.shopId);
    if (!shop || shop.ownerId.toString() !== userId) {
      throw new APIError('Access denied - shop not owned by user', 403);
    }
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied - insufficient permissions', 403);
  }

  // Check if this is a shop order (part of zone split)
  if (order.orderType === 'shop_split' || order.orderType === 'zone_shop') {
    // ENHANCED: Use the enhanced MultiShopOrderTrackingService for better single shop handling
    const updatedOrder = await MultiShopOrderTrackingService.updateShopOrderStatus(id, status, userId);

    res.status(200).json({
      success: true,
      message: 'Shop order status updated successfully',
      data: updatedOrder
    });
    return;
  }

  // Handle regular restaurant order or main zone order
  const oldStatus = order.status;
  order.previousStatus = oldStatus; // Track previous status for real-time notifications
  await order.updateStatus(status, userId, notes);

  // Send real-time notifications with enhanced data
  try {
    await realtimeOrderService.handleOrderStatusUpdate(order._id, status, {
      oldStatus,
      updatedBy: userId,
      notes
    });
  } catch (notificationError) {
    console.warn('Failed to send real-time notification:', notificationError.message);
  }

  loggerUtils.logBusiness('Order status updated', order._id, {
    oldStatus,
    newStatus: status,
    updatedBy: userId,
    orderNumber: order.orderNumber
  });

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: order
  });
});

/**
 * Get recent order for customer tracking (deprecated - use getOrderByNumber instead)
 */
const getRecentOrder = catchAsync(async (req, res) => {
  const { restaurantId, zoneId, tableNumber, customerPhone } = req.query;

  console.log('Fetching recent order with params:', {
    tableNumber,
    customerPhone,
    restaurantId,
    zoneId
  });

  if (!tableNumber || !customerPhone) {
    throw new APIError('Table number and customer phone are required', 400);
  }

  if (!restaurantId && !zoneId) {
    throw new APIError('Restaurant ID or Zone ID is required', 400);
  }

  // Build query to find the most recent order for this specific customer and table
  const query = {
    tableNumber: tableNumber,
    'customer.phone': customerPhone,
    // Only include orders that are not completed or cancelled (active orders)
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
    // Only consider orders from the last 4 hours to get the current session
    createdAt: { $gte: new Date(Date.now() - 4 * 60 * 60 * 1000) }
  };

  if (restaurantId) {
    query.restaurantId = restaurantId;
  } else if (zoneId) {
    query.zoneId = zoneId;
  }

  console.log('Query for recent order:', query);

  // Try to find an active (non-completed) order first
  let order = await Order.findOne(query)
    .populate('restaurantId', 'name contact.phone settings.theme address')
    .populate('zoneId', 'name contact.phone location')
    .sort({ createdAt: -1 })
    .limit(1);

  // If no active order found, look for the most recent completed order within the last hour
  if (!order) {
    const completedQuery = {
      ...query,
      status: 'completed',
      // Only look for completed orders from the last hour
      createdAt: { $gte: new Date(Date.now() - 1 * 60 * 60 * 1000) }
    };
    
    console.log('No active order found, checking for recent completed order:', completedQuery);
    
    order = await Order.findOne(completedQuery)
      .populate('restaurantId', 'name contact.phone settings.theme address')
      .populate('zoneId', 'name contact.phone location')
      .sort({ createdAt: -1 })
      .limit(1);
  }

  if (!order) {
    console.log('No recent order found with any query for:', {
      tableNumber,
      customerPhone,
      restaurantId: restaurantId || 'None',
      zoneId: zoneId || 'None'
    });
    return res.status(404).json({
      success: false,
      message: 'No recent order found for this table and customer. Please place a new order.'
    });
  }

  console.log('Recent order found:', {
    orderNumber: order.orderNumber,
    orderId: order._id,
    status: order.status,
    createdAt: order.createdAt,
    isActive: ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  });

  res.status(200).json({
    success: true,
    message: 'Recent order retrieved successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      restaurantName: order.restaurantId?.name,
      zoneName: order.zoneId?.name,
      tableNumber: order.tableNumber,
      // Include theme information for UI styling
      theme: order.restaurantId?.settings?.theme || null,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone
      },
      items: (order.items && Array.isArray(order.items)) ? order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        status: item.status,
        specialInstructions: item.specialInstructions,
        modifiers: (item.modifiers && Array.isArray(item.modifiers)) ? item.modifiers : []
      })) : [],
      pricing: {
        subtotal: order.pricing?.subtotal || 0,
        tax: order.pricing?.tax || 0,
        serviceFee: order.pricing?.serviceFee || 0,
        discount: order.pricing?.discount || 0,
        tip: order.pricing?.tip || 0,
        total: order.pricing?.total || 0,
        currency: order.pricing?.currency || 'USD'
      },
      delivery: {
        type: order.delivery?.type || 'pickup',
        estimatedTime: order.delivery?.estimatedTime || 30,
        estimatedCompletion: order.estimatedCompletion,
        instructions: order.delivery?.instructions || ''
      },
      timing: {
        orderPlaced: order.timing?.orderPlaced,
        orderConfirmed: order.timing?.orderConfirmed,
        preparationStarted: order.timing?.preparationStarted,
        orderReady: order.timing?.orderReady,
        orderCompleted: order.timing?.orderCompleted
      },
      statusHistory: (order.statusHistory && Array.isArray(order.statusHistory)) ? order.statusHistory : [],
      specialInstructions: order.specialInstructions || '',
      duration: order.duration,
      canProvideFeedback: order.status === 'completed' && !order.feedback?.rating,
      venue: order.restaurantId ? {
        name: order.restaurantId.name,
        phone: order.restaurantId.contact?.phone,
        address: order.restaurantId.address ? 
          `${order.restaurantId.address.street || ''}, ${order.restaurantId.address.city || ''}, ${order.restaurantId.address.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') : null,
        theme: order.restaurantId.settings?.theme
      } : order.zoneId ? {
        name: order.zoneId.name,
        phone: order.zoneId.contact?.phone,
        location: order.zoneId.location
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Include tracking info for migration
      trackingInfo: {
        orderNumber: order.orderNumber,
        customerPhone: order.customer.phone,
        trackingUrl: `/track/${order.orderNumber}?phone=${encodeURIComponent(order.customer.phone)}`
      }
    }
  });
});

/**
 * Get order by ID for customer tracking (public endpoint)
 */
const getCustomerOrder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { customerPhone, tableNumber } = req.query;

  if (!customerPhone) {
    throw new APIError('Customer phone is required', 400);
  }

  const order = await Order.findOne({
    _id: id,
    'customer.phone': customerPhone,
    ...(tableNumber && { tableNumber })
  })
    .populate('restaurantId', 'name')
    .populate('zoneId', 'name');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: order
  });
});

/**
 * Get order by order number (public endpoint for customers)
 */
const getOrderByNumber = catchAsync(async (req, res) => {
  const { orderNumber } = req.params;
  const { phone } = req.query;

  console.log('Fetching order by number:', { orderNumber, phone });

  if (!phone) {
    throw new APIError('Customer phone number is required', 400);
  }

  const order = await Order.findOne({ 
    orderNumber: orderNumber.toUpperCase(),
    'customer.phone': phone
  })
    .populate('restaurantId', 'name contact.phone settings.theme')
    .populate('zoneId', 'name');

  if (!order) {
    console.log('Order not found:', { orderNumber: orderNumber.toUpperCase(), phone });
    throw new APIError('Order not found', 404);
  }

  console.log('Order found:', {
    orderNumber: order.orderNumber,
    orderId: order._id,
    status: order.status,
    restaurantName: order.restaurantId?.name,
    zoneName: order.zoneId?.name
  });

  // Return comprehensive information for customer tracking
  const customerOrderData = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    restaurantName: order.restaurantId?.name,
    zoneName: order.zoneId?.name,
    tableNumber: order.tableNumber,
    customer: {
      name: order.customer.name,
      phone: order.customer.phone
    },
    items: (order.items && Array.isArray(order.items)) ? order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      status: item.status,
      specialInstructions: item.specialInstructions,
      modifiers: (item.modifiers && Array.isArray(item.modifiers)) ? item.modifiers : []
    })) : [],
    pricing: {
      subtotal: order.pricing?.subtotal || 0,
      tax: order.pricing?.tax || 0,
      serviceFee: order.pricing?.serviceFee || 0,
      discount: order.pricing?.discount || 0,
      tip: order.pricing?.tip || 0,
      total: order.pricing?.total || 0,
      currency: order.pricing?.currency || 'USD'
    },
    delivery: {
      type: order.delivery?.type || 'pickup',
      estimatedTime: order.delivery?.estimatedTime || 30,
      estimatedCompletion: order.estimatedCompletion,
      instructions: order.delivery?.instructions || ''
    },
    timing: {
      orderPlaced: order.timing?.orderPlaced,
      orderConfirmed: order.timing?.orderConfirmed,
      preparationStarted: order.timing?.preparationStarted,
      orderReady: order.timing?.orderReady,
      orderCompleted: order.timing?.orderCompleted
    },
    statusHistory: (order.statusHistory && Array.isArray(order.statusHistory)) ? order.statusHistory : [],
    specialInstructions: order.specialInstructions || '',
    duration: order.duration,
    canProvideFeedback: order.status === 'completed' && !order.feedback?.rating,
    venue: order.restaurantId ? {
      name: order.restaurantId.name,
      phone: order.restaurantId.contact?.phone
    } : order.zoneId ? {
      name: order.zoneId.name
    } : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };

  res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: customerOrderData
  });
});

/**
 * Create multi-shop zone order with enhanced tracking
 */
const createMultiShopZoneOrder = catchAsync(async (req, res) => {
  try {
    const { zoneId, tableNumber, customer, items, specialInstructions, paymentMethod } = req.body;

    // Enhanced validation
    if (!zoneId) {
      throw new APIError('Zone ID is required for multi-shop orders', 400);
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new APIError('Order must contain at least one item', 400);
    }
    
    if (!customer || !customer.phone) {
      throw new APIError('Customer information with phone number is required', 400);
    }

    // Set defaults for missing fields
    const orderTableNumber = tableNumber || '1';
    const orderCustomer = {
      name: customer.name || 'Customer',
      phone: customer.phone,
      email: customer.email || ''
    };

    // Calculate pricing
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
    
    const taxRate = 0.1; // 10% tax
    const serviceFeeRate = 0.05; // 5% service fee
    const taxAmount = subtotal * taxRate;
    const serviceFeeAmount = subtotal * serviceFeeRate;
    const total = subtotal + taxAmount + serviceFeeAmount;

    const orderData = {
      zoneId,
      tableNumber: orderTableNumber,
      customer: orderCustomer,
      items,
      pricing: {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: {
          rate: taxRate,
          amount: Math.round(taxAmount * 100) / 100
        },
        serviceFee: {
          rate: serviceFeeRate,
          amount: Math.round(serviceFeeAmount * 100) / 100
        },
        total: Math.round(total * 100) / 100,
        currency: 'USD'
      },
      paymentMethod: paymentMethod || 'cash',
      specialInstructions
    };

    logger.info('Creating multi-shop zone order', {
      zoneId,
      itemCount: items.length,
      total,
      customerPhone: customer.phone
    });

    // Use the new MultiShopOrderTrackingService
    const result = await MultiShopOrderTrackingService.createMultiShopZoneOrder(orderData);

    loggerUtils.logBusiness('Multi-shop zone order created', result.mainOrder._id, {
      zoneId,
      shopCount: result.shopOrders.length,
      totalAmount: total,
      orderNumber: result.orderNumber
    });

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        mainOrder: result.mainOrder,
        shopOrders: result.shopOrders,
        orderNumber: result.orderNumber,
        estimatedTime: result.estimatedTime,
        splitCount: result.shopOrders.length
      }
    });

  } catch (error) {
    logger.error('Multi-shop zone order creation failed:', error);
    throw error;
  }
});

/**
 * Update shop order status with parent order coordination
 */
const updateShopOrderStatus = catchAsync(async (req, res) => {
  const { shopOrderId } = req.params;
  const { status, estimatedTime, notes } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!status) {
    throw new APIError('Status is required', 400);
  }

  const validStatuses = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new APIError('Invalid status', 400);
  }

  logger.info('Updating shop order status', {
    shopOrderId,
    status,
    userId,
    userRole
  });

  // Use the enhanced MultiShopOrderTrackingService
  const result = await MultiShopOrderTrackingService.updateShopOrderStatus(
    shopOrderId,
    status,
    userId,
    { notes, estimatedTime }
  );

  loggerUtils.logBusiness('Shop order status updated', shopOrderId, {
    oldStatus: result.shopOrder.statusHistory?.[result.shopOrder.statusHistory.length - 2]?.status,
    newStatus: status,
    parentOrderId: result.parentOrder?._id,
    updatedBy: userId
  });

  res.status(200).json({
    success: true,
    message: 'Shop order status updated successfully',
    data: {
      shopOrder: result.shopOrder,
      parentOrder: result.parentOrder,
      statusChanged: result.statusChanged,
      parentStatusChanged: result.parentStatusChanged
    }
  });
});

/**
 * Get enhanced zone order tracking information
 */
const getZoneOrderTracking = catchAsync(async (req, res) => {
  const { orderNumber } = req.params;
  const { phone } = req.query;

  if (!phone) {
    throw new APIError('Customer phone number is required for verification', 400);
  }

  logger.info('Getting enhanced zone order tracking', {
    orderNumber,
    customerPhone: phone
  });

  const trackingInfo = await MultiShopOrderTrackingService.getOrderTrackingInfo(
    orderNumber,
    phone
  );

  res.status(200).json({
    success: true,
    message: 'Order tracking information retrieved successfully',
    data: trackingInfo
  });
});

/**
 * Get shop order tracking information
 */
const getShopOrderTracking = catchAsync(async (req, res) => {
  const { shopOrderId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Find the shop order
  const shopOrder = await Order.findById(shopOrderId)
    .populate('parentOrderId')
    .populate('shopId', 'name contact')
    .populate('zoneId', 'name');

  if (!shopOrder) {
    throw new APIError('Shop order not found', 404);
  }

  // Authorization check
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    if (userRole === 'zone_admin' && shopOrder.zoneId?.toString() !== req.user.zoneId) {
      throw new APIError('Access denied to this zone order', 403);
    }
    if ((userRole === 'zone_shop' || userRole === 'zone_vendor') && 
        shopOrder.shopId?.toString() !== req.user.shopId) {
      throw new APIError('Access denied to this shop order', 403);
    }
  }

  const trackingInfo = await MultiShopOrderTrackingService.getOrderTrackingInfo(
    shopOrder.orderNumber
  );

  res.status(200).json({
    success: true,
    message: 'Shop order tracking information retrieved successfully',
    data: trackingInfo
  });
});

/**
 * Get zone order analytics with multi-shop breakdown
 */
const getZoneOrderAnalytics = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const { timeRange = 'today' } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Authorization check
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    if (userRole === 'zone_admin' && zoneId !== req.user.zoneId) {
      throw new APIError('Access denied to this zone analytics', 403);
    }
  }

  logger.info('Getting zone order analytics', {
    zoneId,
    timeRange,
    userId,
    userRole
  });

  const analytics = await MultiShopOrderTrackingService.getZoneOrderAnalytics(zoneId, timeRange);

  res.status(200).json({
    success: true,
    message: 'Zone order analytics retrieved successfully',
    data: analytics
  });
});

/**
 * Batch update order statuses
 */
const batchUpdateOrderStatus = catchAsync(async (req, res) => {
  const { orderIds, status, notes } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    throw new APIError('Order IDs array is required', 400);
  }

  if (!status) {
    throw new APIError('Status is required', 400);
  }

  const validStatuses = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new APIError('Invalid status', 400);
  }

  logger.info('Batch updating order statuses', {
    orderCount: orderIds.length,
    status,
    userId,
    userRole
  });

  const results = [];
  const errors = [];

  // Process each order
  for (const orderId of orderIds) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        errors.push({ orderId, error: 'Order not found' });
        continue;
      }

      // Check authorization for each order
      let hasAccess = false;
      if (userRole === 'admin' || userRole === 'super_admin') {
        hasAccess = true;
      } else if (userRole === 'zone_admin' && order.zoneId?.toString() === req.user.zoneId) {
        hasAccess = true;
      } else if ((userRole === 'zone_shop' || userRole === 'zone_vendor') && 
                 order.shopId?.toString() === req.user.shopId) {
        hasAccess = true;
      }

      if (!hasAccess) {
        errors.push({ orderId, error: 'Access denied' });
        continue;
      }

      // Update order status
      if (order.orderType === 'zone_shop') {
        // Use enhanced service for shop orders
        const result = await MultiShopOrderTrackingService.updateShopOrderStatus(
          orderId,
          status,
          userId,
          { notes }
        );
        results.push({ orderId, success: true, orderNumber: result.shopOrder.orderNumber });
      } else {
        // Regular order update
        await order.updateStatus(status, userId, notes);
        results.push({ orderId, success: true, orderNumber: order.orderNumber });
      }
    } catch (error) {
      logger.error('Failed to update order in batch', { orderId, error: error.message });
      errors.push({ orderId, error: error.message });
    }
  }

  const successCount = results.length;
  const errorCount = errors.length;

  loggerUtils.logBusiness('Batch order status update completed', null, {
    totalOrders: orderIds.length,
    successCount,
    errorCount,
    status,
    updatedBy: userId
  });

  res.status(200).json({
    success: true,
    message: `Batch update completed: ${successCount} successful, ${errorCount} failed`,
    data: {
      successCount,
      errorCount,
      results,
      errors
    }
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

  // Enhanced order lookup for zone orders
  let order = null;
  
  // Try different order lookup strategies for robustness
  const orderNumberVariants = [
    orderNumber,
    orderNumber.toUpperCase(),
    orderNumber.toLowerCase()
  ];
  
  const phoneVariants = [
    phone,
    phone.replace(/\D/g, ''), // Remove non-digits
    phone.replace(/[\s\-\(\)]/g, '') // Remove formatting
  ];
  
  console.log('🔍 Looking for order to add feedback:', {
    orderNumber,
    phone,
    orderNumberVariants,
    phoneVariants
  });
  
  // Try different combinations
  for (const orderNum of orderNumberVariants) {
    for (const phoneNum of phoneVariants) {
      // Enhanced search criteria - don't restrict by status for zone orders
      order = await Order.findOne({
        $and: [
          {
            $or: [
              { orderNumber: orderNum },
              { 'childOrderIds.orderNumber': orderNum } // For zone main orders
            ]
          },
          {
            $or: [
              { 'customer.phone': phoneNum },
              { customerPhone: phoneNum },
              { phone: phoneNum }
            ]
          },
          {
            $or: [
              { status: 'completed' }, // Regular completed orders
              { status: 'ready' }, // Zone orders that are ready
              { orderType: 'zone_main' }, // Zone main orders (regardless of status)
              { orderType: 'zone_shop' } // Individual shop orders
            ]
          }
        ]
      }).populate('childOrderIds');
      
      if (order) {
        console.log('✅ Found order for feedback:', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          hasExistingFeedback: !!order.feedback?.rating
        });
        break;
      }
    }
    if (order) break;
  }

  if (!order) {
    console.log('❌ Order not found for feedback submission:', {
      requestedOrderNumber: orderNumber,
      requestedPhone: phone,
      searchVariants: { orderNumberVariants, phoneVariants }
    });
    throw new APIError('Order not found or not eligible for feedback', 404);
  }

  // Check if feedback already exists
  if (order.feedback && order.feedback.rating) {
    throw new APIError('Feedback already provided for this order', 400);
  }

  // Add feedback to the order
  await order.addFeedback(rating, comment, isPublic);

  // For zone main orders, also save individual shop feedback if needed
  if (order.orderType === 'zone_main' && order.childOrderIds && order.childOrderIds.length > 0) {
    console.log('📝 Saving feedback to zone main order and processing child orders:', {
      mainOrderId: order._id,
      childOrderCount: order.childOrderIds.length
    });
    
    // Optionally apply the same feedback to completed child orders that don't have feedback yet
    for (const childOrderId of order.childOrderIds) {
      try {
        const childOrder = await Order.findById(childOrderId);
        if (childOrder && childOrder.status === 'completed' && (!childOrder.feedback || !childOrder.feedback.rating)) {
          await childOrder.addFeedback(rating, `${comment} (Zone review)`, isPublic);
          console.log('📝 Applied zone feedback to child order:', childOrder.orderNumber);
        }
      } catch (error) {
        console.warn('⚠️ Failed to apply feedback to child order:', error.message);
      }
    }
  }

  loggerUtils.logBusiness('Order feedback added', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    rating,
    customerPhone: phone,
    isZoneOrder: order.orderType === 'zone_main',
    childOrderCount: order.childOrderIds?.length || 0
  });

  res.status(200).json({
    success: true,
    message: 'Thank you for your feedback!',
    data: {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      rating: order.feedback.rating,
      comment: order.feedback.comment,
      feedbackSavedTo: order.orderType === 'zone_main' ? 'zone_and_shops' : 'single_order'
    }
  });
});

/**
 * Get feedback for restaurant
 */
const getRestaurantFeedback = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const { page = 1, limit = 20, rating, dateFrom, dateTo } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Authorization check
  if (userRole === 'restaurant_owner') {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== userId) {
      throw new APIError('Access denied to this restaurant', 403);
    }
  } else if (!['admin', 'super_admin'].includes(userRole)) {
    throw new APIError('Access denied', 403);
  }

  // Build filter for restaurant orders
  const filter = {
    $and: [
      {
        $or: [
          { restaurantId }, // Direct restaurant orders
          { shopId: restaurantId } // Zone shop orders where restaurant acts as shop
        ]
      },
      {
        'feedback.rating': { $exists: true, $ne: null }
      }
    ]
  };

  // Add rating filter
  if (rating && rating !== 'all') {
    filter.$and.push({ 'feedback.rating': parseInt(rating) });
  }

  // Add date filter
  if (dateFrom || dateTo) {
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);
    filter.$and.push({ 'feedback.submittedAt': dateFilter });
  }

  console.log('🔍 Restaurant feedback filter:', {
    restaurantId,
    rating,
    dateRange: { dateFrom, dateTo },
    filter: JSON.stringify(filter, null, 2)
  });

  // Get feedback with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const orders = await Order.find(filter)
    .select('orderNumber customer feedback tableNumber createdAt orderType zoneId shopId')
    .sort({ 'feedback.submittedAt': -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('restaurantId', 'name')
    .populate('shopId', 'name')
    .populate('zoneId', 'name');

  const total = await Order.countDocuments(filter);

  // Format feedback data with enhanced information
  const feedback = orders.map(order => ({
    id: order._id,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    tableNumber: order.tableNumber,
    rating: order.feedback.rating,
    comment: order.feedback.comment,
    submittedAt: order.feedback.submittedAt,
    isPublic: order.feedback.isPublic,
    orderDate: order.createdAt,
    orderType: order.orderType,
    reviewSource: order.orderType === 'single' ? 'Direct Restaurant Order' :
                  order.orderType === 'zone_shop' ? 'Zone Shop Order' :
                  order.orderType === 'zone_main' ? 'Zone Main Order' : 'Other',
    zoneName: order.zoneId?.name || null,
    shopName: order.shopId?.name || null
  }));

  console.log('✅ Restaurant feedback retrieved:', {
    restaurantId,
    totalFeedback: total,
    currentPageCount: feedback.length,
    reviewSources: feedback.reduce((acc, item) => {
      acc[item.reviewSource] = (acc[item.reviewSource] || 0) + 1;
      return acc;
    }, {})
  });

  res.status(200).json({
    success: true,
    data: {
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalReviews: total,
        averageRating: feedback.length > 0 ? 
          (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : 0,
        reviewSources: feedback.reduce((acc, item) => {
          acc[item.reviewSource] = (acc[item.reviewSource] || 0) + 1;
          return acc;
        }, {})
      }
    }
  });
});

/**
 * Get feedback for zone
 */
const getZoneFeedback = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const { page = 1, limit = 20, rating, shopId, dateFrom, dateTo } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Authorization check
  if (userRole === 'zone_admin') {
    const zone = await Zone.findById(zoneId);
    if (!zone || zone.adminId.toString() !== userId) {
      throw new APIError('Access denied to this zone', 403);
    }
  } else if (!['admin', 'super_admin'].includes(userRole)) {
    throw new APIError('Access denied', 403);
  }

  // Build filter for zone orders (both main and shop orders)
  const filter = {
    $and: [
      {
        $or: [
          { zoneId }, // Zone main orders
          { zoneId, orderType: 'zone_shop' }, // Individual shop orders
          { zoneId, orderType: 'zone_main' } // Zone main orders specifically
        ]
      },
      {
        'feedback.rating': { $exists: true, $ne: null }
      }
    ]
  };

  // Add shop filter
  if (shopId && shopId !== 'all') {
    filter.$and.push({ shopId });
  }

  // Add rating filter
  if (rating && rating !== 'all') {
    filter.$and.push({ 'feedback.rating': parseInt(rating) });
  }

  // Add date filter
  if (dateFrom || dateTo) {
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);
    filter.$and.push({ 'feedback.submittedAt': dateFilter });
  }

  console.log('🔍 Zone feedback filter:', {
    zoneId,
    shopId,
    rating,
    dateRange: { dateFrom, dateTo },
    filter: JSON.stringify(filter, null, 2)
  });

  // Get feedback with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const orders = await Order.find(filter)
    .select('orderNumber customer feedback tableNumber createdAt shopId orderType parentOrderId')
    .sort({ 'feedback.submittedAt': -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('shopId', 'name contact')
    .populate('zoneId', 'name')
    .populate('parentOrderId', 'orderNumber');

  const total = await Order.countDocuments(filter);

  // Format feedback data with enhanced information
  const feedback = orders.map(order => ({
    id: order._id,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    tableNumber: order.tableNumber,
    rating: order.feedback.rating,
    comment: order.feedback.comment,
    submittedAt: order.feedback.submittedAt,
    isPublic: order.feedback.isPublic,
    orderDate: order.createdAt,
    shopName: order.shopId?.name || 'Zone Order',
    shopId: order.shopId?._id,
    orderType: order.orderType,
    reviewType: order.orderType === 'zone_main' ? 'Zone Review' : 
                order.orderType === 'zone_shop' ? 'Shop Review' : 'Order Review',
    parentOrderNumber: order.parentOrderId?.orderNumber || null,
    contact: order.shopId?.contact
  }));

  console.log('✅ Zone feedback retrieved:', {
    zoneId,
    totalFeedback: total,
    currentPageCount: feedback.length,
    feedbackTypes: feedback.reduce((acc, item) => {
      acc[item.reviewType] = (acc[item.reviewType] || 0) + 1;
      return acc;
    }, {})
  });

  res.status(200).json({
    success: true,
    data: {
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalReviews: total,
        averageRating: feedback.length > 0 ? 
          (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : 0,
        reviewBreakdown: feedback.reduce((acc, item) => {
          acc[item.reviewType] = (acc[item.reviewType] || 0) + 1;
          return acc;
        }, {})
      }
    }
  });
});

/**
 * Get order statistics
 */
const getOrderStatistics = catchAsync(async (req, res) => {
  const { restaurantId, shopId, dateFrom, dateTo } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Build filter
  const filter = {};
  let entityType = 'restaurant';
  let entityId = null;
  
  if (userRole === 'restaurant_owner') {
    // Verify restaurant ownership
    if (restaurantId) {
      const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: userId });
      if (!restaurant) {
        throw new APIError('Restaurant not found or access denied', 403);
      }
      filter.restaurantId = restaurantId;
      entityId = restaurantId;
    } else {
      // Get all user's restaurants
      const userRestaurants = await Restaurant.find({ ownerId: userId }).select('_id');
      const restaurantIds = userRestaurants.map(r => r._id);
      filter.restaurantId = { $in: restaurantIds };
      entityId = restaurantIds[0]; // Use first restaurant for stats
    }
  } else if (userRole === 'zone_shop' || userRole === 'zone_vendor') {
    // Verify shop ownership and get statistics for this shop
    if (!shopId) {
      throw new APIError('Shop ID is required for zone shop/vendor statistics', 400);
    }
    
    const shop = await ZoneShop.findOne({ _id: shopId, ownerId: userId });
    if (!shop) {
      throw new APIError('Shop not found or access denied', 403);
    }
    
    filter.shopId = shopId;
    entityType = 'shop';
    entityId = shopId;
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied', 403);
  } else if (restaurantId) {
    filter.restaurantId = restaurantId;
    entityId = restaurantId;
  } else if (shopId) {
    filter.shopId = shopId;
    entityType = 'shop';
    entityId = shopId;
  }

  // Date range
  const dateRange = {};
  if (dateFrom) dateRange.from = dateFrom;
  if (dateTo) dateRange.to = dateTo;

  // Get statistics
  const stats = await Order.getStatistics(
    entityId, 
    entityType, 
    dateRange
  );

  loggerUtils.logBusiness('Order statistics retrieved', {
    userId,
    userRole,
    entityType,
    entityId,
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

/**
 * Create Razorpay order for payment
 * @route POST /api/orders/create-payment
 * @access Public
 */
const createOrderPayment = catchAsync(async (req, res) => {
  const { orderId } = req.body;

  // Validate required fields
  if (!orderId) {
    throw new APIError('Order ID is required', 400);
  }

  try {
    // Create Razorpay order
    const paymentData = await orderPaymentService.createRazorpayOrder(orderId);

    logger.info('Order payment created', {
      orderId: orderId,
      razorpayOrderId: paymentData.razorpayOrderId,
      amount: paymentData.amount
    });

    res.status(201).json({
      success: true,
      data: paymentData,
      message: 'Payment order created successfully'
    });

  } catch (error) {
    logger.error('Failed to create order payment', {
      orderId: orderId,
      error: error.message
    });
    throw error;
  }
});

/**
 * Verify Razorpay payment
 * @route POST /api/orders/verify-payment
 * @access Public
 */
const verifyOrderPayment = catchAsync(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Validate required fields
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new APIError('All payment verification fields are required', 400);
  }

  try {
    // Verify payment
    const verificationResult = await orderPaymentService.verifyPayment(orderId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    logger.info('Order payment verified', {
      orderId: orderId,
      razorpayPaymentId: razorpay_payment_id,
      success: verificationResult.success
    });

    res.status(200).json({
      success: true,
      data: {
        order: verificationResult.order,
        paymentStatus: verificationResult.order.payment.status,
        orderStatus: verificationResult.order.status
      },
      message: verificationResult.message
    });

  } catch (error) {
    logger.error('Failed to verify order payment', {
      orderId: orderId,
      razorpayPaymentId: razorpay_payment_id,
      error: error.message
    });
    throw error;
  }
});

/**
 * Handle Razorpay webhook for order payments
 * @route POST /api/webhooks/razorpay-orders
 * @access Public (signature verified)
 */
const handleOrderPaymentWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookData = req.body;

  if (!signature) {
    throw new APIError('Webhook signature missing', 400);
  }

  try {
    // Process webhook
    const result = await orderPaymentService.handleWebhook(webhookData, signature);

    logger.info('Order payment webhook processed', {
      event: webhookData.event,
      success: result.success,
      message: result.message
    });

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('Failed to process order payment webhook', {
      event: webhookData.event,
      error: error.message
    });
    throw error;
  }
});

module.exports = {
  getAllOrders,
  getOrder,
  createOrder,
  handleRestaurantOrder,
  handleZoneOrder,
  createOrGetCustomerUser,
  updateOrderStatus,
  getOrderByNumber,
  getRecentOrder,
  getCustomerOrder,
  addOrderFeedback,
  getRestaurantFeedback,
  getZoneFeedback,
  getOrderStatistics,
  // Multi-shop zone order functions
  createMultiShopZoneOrder,
  updateShopOrderStatus,
  getZoneOrderTracking,
  getShopOrderTracking,
  getZoneOrderAnalytics,
  batchUpdateOrderStatus,
  // Payment functions
  createOrderPayment,
  verifyOrderPayment,
  handleOrderPaymentWebhook
};