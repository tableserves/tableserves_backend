const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { Order, Restaurant, User, Zone, ZoneShop, TableServeRating } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const realtimeOrderService = require('../services/realtimeOrderService');
const orderPaymentService = require('../services/orderPaymentService');

/**
 * Get all orders with filtering and pagination
 */
const getAllOrders = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 100000, 
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

    if (shopId) {
      // If specific shop requested, verify ownership
      const shop = await ZoneShop.findOne({ _id: shopId, ownerId: userId });
      if (!shop) {
        throw new APIError('Access denied - shop not found or not owned by user', 403);
      }
      query.shopId = shopId;
    } else {
      // If no specific shopId provided, get all shops owned by this user
      const userShops = await ZoneShop.find({ ownerId: userId }).select('_id');
      if (userShops.length > 0) {
        const shopIds = userShops.map(s => s._id);
        query.shopId = { $in: shopIds };
      } else {
        // If user doesn't own any shops, return empty result
        query.shopId = null;
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
    } else {
      // Get all zones owned by this user
      const userZones = await Zone.find({ adminId: userId }).select('_id');
      const zoneIds = userZones.map(z => z._id);
      if (zoneIds.length > 0) {
        query.zoneId = { $in: zoneIds };
      } else {
        // If user doesn't own any zones, return empty result
        query.zoneId = null; // This will return no results
      }
    }
  } else if (userRole !== 'admin') {
    throw new APIError('Access denied', 403);
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
        .populate('restaurantId', 'name slug contact address phone email')
        .populate('zoneId', 'name location contactInfo address phone email')
        .populate('shopId', 'name contactInfo address phone email')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip)
        .lean(), // Add lean() for better performance
      Order.countDocuments(query)
    ]);
    
    // Ensure orders is always an array with explicit validation
    orders = Array.isArray(ordersResult) ? ordersResult : [];
    totalCount = typeof countResult === 'number' ? countResult : 0;
  } catch (dbError) {
    logger.error('Database query error', { error: dbError.message, query });
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

    const order = await Order.findById(id)
      .populate('restaurantId', 'name slug contact ownerId')
      .populate('zoneId', 'name contact')
      .populate('shopId', 'name contact ownerId');

    if (!order) {
      throw new APIError('Order not found', 404);
    }

    // Check access permissions with proper null checks
    if (userRole === 'restaurant_owner') {
      const restaurantId = order.restaurantId;
      if (!restaurantId ||
          (typeof restaurantId === 'object' && !restaurantId.ownerId) ||
          (typeof restaurantId === 'object' && restaurantId.ownerId && restaurantId.ownerId.toString() !== userId)) {
        throw new APIError('Access denied', 403);
      }
    } else if (userRole === 'zone_shop' || userRole === 'zone_vendor') {
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
    logger.error('Error in getOrder', { error: error.message });
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
    logger.error('Order creation error', { error: error.message });
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
    // If table doesn't exist, proceed with the order anyway.
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
      logger.error('Error processing item', { item, error: error.message });
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
  await order.save();

  // CRITICAL: Mark as new order for notification logic (after save)
  // This flag is checked by notification services to emit 'new_order' event
  order._isNewOrder = true;
  order.isNew = false; // Reset Mongoose flag to prevent conflicts
  
  // Send real-time notification to restaurant - MUST happen after _isNewOrder flag is set
  try {
    await realtimeOrderService.notifyRestaurant(restaurantId, order);
    logger.info('âœ… Restaurant order created and notification sent', {
      orderNumber: order.orderNumber,
      restaurantId,
      tableNumber,
      total
    });
  } catch (notificationError) {
    logger.error('âŒ Failed to send real-time notification:', notificationError);
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
    logger.error('Restaurant order creation error', { error: error.message });
    throw new APIError('Failed to create restaurant order: ' + error.message, 400);
  }
};

/**
 * Handle zone order creation (single shop)
 * Customers can only order from one shop at a time; all items must share a shopId.
 */
const handleZoneOrder = async (req, res, customerUser) => {
  const { zoneId, tableNumber, customer, items, specialInstructions, paymentMethod } = req.body;

  const zone = await Zone.findById(zoneId);
  if (!zone || !zone.active) {
    throw new APIError('Zone not available', 400);
  }

  // All items must belong to the same shop â€” multi-shop zone orders are not supported.
  const shopIds = [...new Set(items.map(i => i.shopId).filter(Boolean))];
  if (shopIds.length === 0) {
    throw new APIError('Each item must include a shopId for zone orders', 400);
  }
  if (shopIds.length > 1) {
    throw new APIError('All items in a zone order must come from the same shop', 400);
  }
  const shopId = shopIds[0];

  const shop = await ZoneShop.findOne({ _id: shopId, zoneId });
  if (!shop) {
    throw new APIError('Shop not found in this zone', 400);
  }

  let subtotal = 0;
  const processedItems = items.map(item => {
    const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
    const modifiersTotal = modifiers.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
    const itemSubtotal = (item.price + modifiersTotal) * item.quantity;
    subtotal += itemSubtotal;
    return { ...item, modifiers, subtotal: itemSubtotal, status: 'pending' };
  });

  const total = subtotal;
  const mappedPaymentMethod = paymentMethod === 'COD' ? 'cash' : (paymentMethod || 'cash');

  const order = new Order({
    zoneId,
    shopId,
    tableNumber,
    customer: {
      ...customer,
      userId: customerUser?._id
    },
    items: processedItems,
    pricing: {
      subtotal,
      tax: { rate: 0, amount: 0 },
      serviceFee: { rate: 0, amount: 0 },
      total,
      currency: 'USD'
    },
    payment: { method: mappedPaymentMethod, status: 'pending' },
    delivery: { type: 'table_service' },
    specialInstructions,
    source: {
      platform: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'web',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer')
    }
  });

  await order.save();

  order._isNewOrder = true;
  order.isNew = false;

  // Broadcast the new order to the zone admin AND the specific shop.
  // Previously this called `realtimeOrderService.notifyShop?.(shopId, order)` — but
  // `notifyShop` was never defined on the service, so the optional-chaining call was a
  // silent no-op. That meant zone shops NEVER received the real-time `new_order` event
  // (no toast, no sound, no badge), while restaurants did. `notifyZone` already emits
  // the NEW_ORDER event to both the zone room AND the shop room when `order.shopId`
  // is set (see realtimeOrderService.notifyZone — the "If this is a shop order"
  // branch), so this single call now reaches every listener that should care.
  try {
    await realtimeOrderService.notifyZone(zoneId, order);
  } catch (err) {
    logger.warn('Failed to send zone/shop order notification', { error: err.message });
  }

  loggerUtils.logBusiness('Zone order created', order._id, {
    zoneId,
    shopId,
    tableNumber,
    customerPhone: customer.phone,
    total,
    itemCount: items.length
  });

  const responseData = {
    order,
    requiresPayment: mappedPaymentMethod === 'online' || paymentMethod === 'online',
    paymentMethod: mappedPaymentMethod
  };

  if (responseData.requiresPayment) {
    responseData.paymentInstructions = {
      message: 'Please proceed to payment to confirm your order',
      nextStep: 'Call /api/v1/orders/create-payment with orderId to initiate payment',
      orderId: order._id
    };
  }

  res.status(201).json({
    success: true,
    message: 'Zone order created successfully',
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

  const oldStatus = order.status;
  order.previousStatus = oldStatus; // Track previous status for real-time notifications
  order.updateStatus(status, userId, notes);
  await order.save();

  // Send real-time notifications with enhanced data
  try {
    await realtimeOrderService.handleOrderStatusUpdate(order._id, status, {
      oldStatus,
      updatedBy: userId,
      notes
    });
  } catch (notificationError) {
    logger.warn('Failed to send real-time notification', { error: notificationError.message });
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

    order = await Order.findOne(completedQuery)
      .populate('restaurantId', 'name contact.phone settings.theme address')
      .populate('zoneId', 'name contact.phone location')
      .sort({ createdAt: -1 })
      .limit(1);
  }

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'No recent order found for this table and customer. Please place a new order.'
    });
  }

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

  // Validate inputs
  if (!orderNumber) {
    logger.warn('Order number is required for tracking', { phone });
    throw new APIError('Order number is required', 400);
  }

  if (!phone) {
    logger.warn('Customer phone number is required for order tracking', { orderNumber });
    throw new APIError('Customer phone number is required', 400);
  }

  // Sanitize inputs
  const sanitizedOrderNumber = orderNumber.trim().toUpperCase();
  const sanitizedPhone = phone.trim();

  logger.info('Fetching order by number from database', { 
    orderNumber: sanitizedOrderNumber, 
    phone: sanitizedPhone 
  });

  // Validate phone format (basic validation)
  if (!sanitizedPhone || sanitizedPhone.length < 10) {
    logger.warn('Invalid phone number format for order tracking', { 
      orderNumber: sanitizedOrderNumber, 
      phone: sanitizedPhone 
    });
    throw new APIError('Invalid phone number format', 400);
  }

  // Populate complete restaurant, zone, and shop data for receipts
  const order = await Order.findOne({ 
    orderNumber: sanitizedOrderNumber,
    'customer.phone': sanitizedPhone
  })
    .populate('restaurantId', 'name contact settings.theme taxInfo')
    .populate('zoneId', 'name location contactInfo taxInfo')
    .populate('shopId', 'name contactInfo taxInfo');

  if (!order) {
    logger.info('Order not found in database', { 
      orderNumber: sanitizedOrderNumber, 
      phone: sanitizedPhone 
    });
    throw new APIError('Order not found. Please verify the order number and phone number.', 404);
  }

  logger.info('Order found in database', {
    orderNumber: order.orderNumber,
    orderId: order._id,
    status: order.status,
    restaurantName: order.restaurantId?.name,
    zoneName: order.zoneId?.name
  });

  // Validate that we have the required data
  if (!order.customer || !order.customer.phone) {
    logger.error('Order missing customer information', { 
      orderId: order._id,
      orderNumber: order.orderNumber
    });
    throw new APIError('Order data is incomplete', 500);
  }

  // Return comprehensive information for customer tracking
  const customerOrderData = {
    _id: order._id,
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    restaurantId: order.restaurantId?._id,
    restaurantName: order.restaurantId?.name,
    restaurant: order.restaurantId ? {
      _id: order.restaurantId._id,
      name: order.restaurantId.name,
      address: order.restaurantId.contact?.address ? 
        `${order.restaurantId.contact.address.street}, ${order.restaurantId.contact.address.city}, ${order.restaurantId.contact.address.state} ${order.restaurantId.contact.address.zipCode}` : 
        '',
      phone: order.restaurantId.contact?.phone || '',
      email: order.restaurantId.contact?.email || '',
      gstin: order.restaurantId.taxInfo?.gstin || ''
    } : null,
    zoneId: order.zoneId?._id,
    zoneName: order.zoneId?.name,
    zone: order.zoneId ? {
      _id: order.zoneId._id,
      name: order.zoneId.name,
      address: order.zoneId.location || '',
      location: order.zoneId.location || '',
      phone: order.zoneId.contactInfo?.phone || '',
      email: order.zoneId.contactInfo?.email || '',
      gstin: order.zoneId.taxInfo?.gstin || '',
      contactInfo: order.zoneId.contactInfo || {}
    } : null,
    shopId: order.shopId?._id,
    shopName: order.shopId?.name,
    shop: order.shopId ? {
      _id: order.shopId._id,
      name: order.shopId.name,
      address: order.shopId.contactInfo?.address || '',
      phone: order.shopId.contactInfo?.phone || '',
      email: order.shopId.contactInfo?.email || '',
      gstin: order.shopId.taxInfo?.gstin || '',
      contactInfo: order.shopId.contactInfo || {}
    } : null,
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
      currency: order.pricing?.currency || 'INR'
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
    feedback: order.feedback?.rating ? {
      rating: order.feedback.rating,
      foodRating: order.feedback.foodRating || null,
      venueRating: order.feedback.venueRating || null,
      platformRating: order.feedback.platformRating || null,
      comment: order.feedback.comment || '',
      submittedAt: order.feedback.submittedAt,
      isPublic: order.feedback.isPublic || false
    } : null,
    venue: order.restaurantId ? {
      name: order.restaurantId.name,
      phone: order.restaurantId.contact?.phone
    } : order.zoneId ? {
      name: order.zoneId.name
    } : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };

  // Validate that we're sending complete data
  if (!customerOrderData.orderNumber) {
    logger.error('Generated customer order data missing orderNumber', { 
      orderId: order._id,
      orderDataKeys: Object.keys(customerOrderData)
    });
    throw new APIError('Failed to generate order tracking data', 500);
  }

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
  const { phone, rating, foodRating, venueRating, platformRating, comment, isPublic } = req.body;

  if (!phone) {
    throw new APIError('Customer phone is required', 400);
  }

  // Ensure at least one rating is provided
  if (!rating && (!foodRating && !venueRating && !platformRating)) {
    throw new APIError('At least one rating is required', 400);
  }

  // Allow rating to be passed for backward compatibility, or check specific ratings
  const mainRating = rating || platformRating || venueRating || foodRating;
  if (mainRating < 1 || mainRating > 5) {
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

  // Try different combinations
  for (const orderNum of orderNumberVariants) {
    for (const phoneNum of phoneVariants) {
      order = await Order.findOne({
        $and: [
          { orderNumber: orderNum },
          {
            $or: [
              { 'customer.phone': phoneNum },
              { customerPhone: phoneNum },
              { phone: phoneNum }
            ]
          },
          { status: { $in: ['completed', 'ready'] } }
        ]
      });

      if (order) break;
    }
    if (order) break;
  }

  if (!order) {
    throw new APIError('Order not found or not eligible for feedback', 404);
  }

  // Check if feedback already exists
  if (order.feedback && order.feedback.rating) {
    throw new APIError('Feedback already provided for this order', 400);
  }

  // Add feedback to the order
  await order.addFeedback({
    rating,
    foodRating,
    venueRating,
    platformRating,
    comment
  }, comment, isPublic);

  // Also create a TableServeRating document so the admin feedback page can show this review
  try {
    const existingRating = await TableServeRating.findOne({ orderNumber: order.orderNumber });
    if (!existingRating) {
      // serviceRating: prefer platform (app) rating, fall back to overall average
      const serviceRating =
        (Number.isFinite(platformRating) && platformRating >= 1 && platformRating <= 5) ? platformRating :
        (Number.isFinite(rating) && rating >= 1 && rating <= 5) ? rating :
        5; // safety fallback (earlier validation ensures at least one is valid)

      // Extract per-category comments from the combined comment string
      // Format from OrderTracking.jsx: "Venue: <text> | Food: <text> | App: <text>"
      const commentParts = (comment || '').split(' | ');
      const appComment   = (commentParts.find(p => p.startsWith('App: '))   || '').replace('App: ', '');
      const foodComment  = (commentParts.find(p => p.startsWith('Food: '))  || '').replace('Food: ', '');
      const venueComment = (commentParts.find(p => p.startsWith('Venue: ')) || '').replace('Venue: ', '');

      // Build categories using the correct schema structure:
      //   categories.food   → { rating, feedback }
      //   categories.venue  → { rating, feedback }
      //   categories.platform → { rating, feedback }
      //   categories.appExperience, categories.overallSatisfaction → flat numbers
      const categoriesData = {};
      if (Number.isFinite(foodRating) && foodRating >= 1 && foodRating <= 5) {
        categoriesData.food = { rating: foodRating, feedback: foodComment };
      }
      if (Number.isFinite(venueRating) && venueRating >= 1 && venueRating <= 5) {
        categoriesData.venue = { rating: venueRating, feedback: venueComment };
      }
      if (Number.isFinite(platformRating) && platformRating >= 1 && platformRating <= 5) {
        categoriesData.platform = { rating: platformRating, feedback: appComment };
        categoriesData.appExperience = platformRating;
      }
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
        categoriesData.overallSatisfaction = rating;
      }

      // Build the document — set required fields explicitly, only include venue IDs when truthy
      const ratingData = {
        orderNumber: order.orderNumber,
        orderId: order._id,
        customer: {
          name: order.customer?.name || 'Customer',
          phone: order.customer?.phone || phone,
          ...(order.customer?.email && { email: order.customer.email })
        },
        serviceRating,
        serviceFeedback: appComment || comment || '',
        categories: categoriesData,
        isPublic: isPublic !== false
      };

      // Only attach venue IDs if they are actually set (truthy ObjectIds)
      if (order.restaurantId) ratingData.restaurantId = order.restaurantId;
      if (order.zoneId)       ratingData.zoneId       = order.zoneId;
      if (order.shopId)       ratingData.shopId       = order.shopId;
      if (order.tableNumber)  ratingData.tableNumber  = order.tableNumber;

      await new TableServeRating(ratingData).save();
      logger.info('TableServeRating created from order feedback', { orderNumber: order.orderNumber, serviceRating });
    }
  } catch (ratingErr) {
    // Non-fatal — log full details (including Mongoose validation errors) but don't fail the feedback request
    logger.error('Failed to create TableServeRating from order feedback', {
      error: ratingErr.message,
      validationErrors: ratingErr.errors
        ? Object.keys(ratingErr.errors).map(k => `${k}: ${ratingErr.errors[k].message}`)
        : [],
      orderNumber: order.orderNumber
    });
  }

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

  // Get feedback with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const orders = await Order.find(filter)
    .select('orderNumber customer feedback tableNumber createdAt zoneId shopId')
    .sort({ 'feedback.submittedAt': -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('restaurantId', 'name')
    .populate('shopId', 'name')
    .populate('zoneId', 'name');

  const total = await Order.countDocuments(filter);

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
    zoneName: order.zoneId?.name || null,
    shopName: order.shopId?.name || null
  }));

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
  } else if (userRole === 'zone_shop' || userRole === 'zone_vendor') {
    // Zone shop/vendor can only access their own shop's feedback
    // Verify the user belongs to this shop
    const ZoneShop = require('../models/ZoneShop');
    
    // Force shopId filter for zone_shop/zone_vendor users
    if (!shopId || shopId === 'all') {
      throw new APIError('Shop ID is required for shop vendors', 400);
    }
    
    const shop = await ZoneShop.findById(shopId);
    
    if (!shop) {
      throw new APIError('Shop not found', 404);
    }
    
    if (shop.zoneId.toString() !== zoneId) {
      throw new APIError('Shop does not belong to this zone', 403);
    }
    
    // Check if user is authorized for this shop
    // Convert both to strings for comparison
    const userIdStr = userId.toString();
    const isAuthorized = shop.vendorId?.toString() === userIdStr ||
                         shop.ownerId?.toString() === userIdStr ||
                         shop.managerId?.toString() === userIdStr;


    if (!isAuthorized) {
      throw new APIError('Access denied to this shop', 403);
    }
  } else if (!['admin', 'super_admin'].includes(userRole)) {
    throw new APIError('Access denied', 403);
  }

  const filter = {
    $and: [
      { zoneId },
      { 'feedback.rating': { $exists: true, $ne: null } }
    ]
  };

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

  // Get feedback with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const orders = await Order.find(filter)
    .select('orderNumber customer feedback tableNumber createdAt shopId')
    .sort({ 'feedback.submittedAt': -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('shopId', 'name contact')
    .populate('zoneId', 'name');

  const total = await Order.countDocuments(filter);

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
    contact: order.shopId?.contact
  }));

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
          const key = item.shopName || 'Zone';
          acc[key] = (acc[key] || 0) + 1;
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
  createOrderPayment,
  verifyOrderPayment,
  handleOrderPaymentWebhook
};
