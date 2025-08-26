const { catchAsync, APIError } = require('../middleware/errorHandler');
const { Restaurant, User, Subscription } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Get all restaurants (admin only) or user's restaurants
 */
const getAllRestaurants = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, search, city, state, status } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Build query
  const query = {};
  
  // Only admins can see all restaurants, others see only their own
  if (userRole !== 'admin') {
    query.ownerId = userId;
  }

  // Add filters
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (city) {
    query['contact.address.city'] = { $regex: city, $options: 'i' };
  }

  if (state) {
    query['contact.address.state'] = { $regex: state, $options: 'i' };
  }

  if (status) {
    query.isActive = status === 'active';
  }

  // Execute query with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'ownerId', select: 'email profile.name' },
      { path: 'subscriptionId', select: 'planName status features limits' }
    ]
  };

  const restaurants = await Restaurant.paginate ? 
    await Restaurant.paginate(query, options) :
    await Restaurant.find(query)
      .populate(options.populate)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

  loggerUtils.logBusiness('Restaurants retrieved', {
    userId,
    userRole,
    count: Array.isArray(restaurants) ? restaurants.length : restaurants.docs?.length || 0,
    filters: { search, city, state, status }
  });

  res.status(200).json({
    success: true,
    message: 'Restaurants retrieved successfully',
    data: restaurants
  });
});

/**
 * Get single restaurant by ID
 */
const getRestaurant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id)
    .populate('ownerId', 'email profile.name')
    .populate('subscriptionId', 'planName status features limits');

  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership (except for admins)
  if (userRole !== 'admin' && restaurant.ownerId._id.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  loggerUtils.logBusiness('Restaurant retrieved', {
    userId,
    restaurantId: id,
    restaurantName: restaurant.name
  });

  res.status(200).json({
    success: true,
    message: 'Restaurant retrieved successfully',
    data: restaurant
  });
});

/**
 * Create new restaurant
 */
const createRestaurant = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  // Get user's subscription to check limits
  const user = await User.findById(userId).populate('subscription');
  if (!user || !user.subscription) {
    throw new APIError('User subscription not found', 400);
  }

  const subscription = user.subscription;

  // Check if user can create restaurants based on role
  if (!['admin', 'restaurant_owner'].includes(userRole)) {
    throw new APIError('Only restaurant owners can create restaurants', 403);
  }

  // Check subscription limits (except for unlimited plans)
  if (!subscription.features.unlimited && userRole !== 'admin') {
    const userRestaurantCount = await Restaurant.countDocuments({ ownerId: userId, isActive: true });
    const maxRestaurants = subscription.limits.maxTables > 0 ? 1 : 0; // For now, assuming 1 restaurant per subscription
    
    if (userRestaurantCount >= maxRestaurants) {
      throw new APIError('Restaurant limit reached for your subscription plan', 403);
    }
  }

  // Validate required fields
  const { name, contact, description, hours, settings } = req.body;
  
  if (!name || !contact?.address || !contact?.phone) {
    throw new APIError('Name, address, and phone are required', 400);
  }

  // Create restaurant
  const restaurantData = {
    ...req.body,
    ownerId: userId,
    subscriptionId: user.subscription._id,
    createdBy: userId
  };

  const restaurant = new Restaurant(restaurantData);
  const savedRestaurant = await restaurant.save();

  // Populate references
  await savedRestaurant.populate([
    { path: 'ownerId', select: 'email profile.name' },
    { path: 'subscriptionId', select: 'planName status features limits' }
  ]);

  loggerUtils.logBusiness('Restaurant created', {
    userId,
    restaurantId: savedRestaurant._id,
    restaurantName: savedRestaurant.name
  });

  res.status(201).json({
    success: true,
    message: 'Restaurant created successfully',
    data: savedRestaurant
  });
});

/**
 * Update restaurant
 */
const updateRestaurant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership (except for admins)
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  // Update restaurant
  const updateData = {
    ...req.body,
    updatedBy: userId
  };

  // Remove fields that shouldn't be updated via this endpoint
  delete updateData.ownerId;
  delete updateData.subscriptionId;
  delete updateData.createdBy;
  delete updateData.createdAt;

  const updatedRestaurant = await Restaurant.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).populate([
    { path: 'ownerId', select: 'email profile.name' },
    { path: 'subscriptionId', select: 'planName status features limits' }
  ]);

  loggerUtils.logBusiness('Restaurant updated', {
    userId,
    restaurantId: id,
    restaurantName: updatedRestaurant.name,
    updatedFields: Object.keys(req.body)
  });

  res.status(200).json({
    success: true,
    message: 'Restaurant updated successfully',
    data: updatedRestaurant
  });
});

/**
 * Delete restaurant
 */
const deleteRestaurant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership (except for admins)
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  // Soft delete by setting isActive to false
  restaurant.isActive = false;
  restaurant.updatedBy = userId;
  await restaurant.save();

  loggerUtils.logBusiness('Restaurant deleted', {
    userId,
    restaurantId: id,
    restaurantName: restaurant.name
  });

  res.status(200).json({
    success: true,
    message: 'Restaurant deleted successfully'
  });
});

/**
 * Add table to restaurant
 */
const addTable = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id).populate('subscriptionId');
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  // Check subscription limits
  const subscription = restaurant.subscriptionId;
  if (!subscription.features.unlimited && userRole !== 'admin') {
    if (restaurant.activeTablesCount >= subscription.limits.maxTables) {
      throw new APIError('Table limit reached for your subscription plan', 403);
    }
  }

  // Add table
  const tableData = {
    ...req.body,
    number: req.body.number || (restaurant.tables.length + 1).toString()
  };

  await restaurant.addTable(tableData);

  loggerUtils.logBusiness('Table added', {
    userId,
    restaurantId: id,
    tableNumber: tableData.number
  });

  res.status(201).json({
    success: true,
    message: 'Table added successfully',
    data: restaurant.tables[restaurant.tables.length - 1]
  });
});

/**
 * Update table
 */
const updateTable = catchAsync(async (req, res) => {
  const { id, tableId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  // Update table
  await restaurant.updateTable(tableId, req.body);

  const updatedTable = restaurant.tables.id(tableId);

  loggerUtils.logBusiness('Table updated', {
    userId,
    restaurantId: id,
    tableId,
    tableNumber: updatedTable.number
  });

  res.status(200).json({
    success: true,
    message: 'Table updated successfully',
    data: updatedTable
  });
});

/**
 * Remove table
 */
const removeTable = catchAsync(async (req, res) => {
  const { id, tableId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  const table = restaurant.tables.id(tableId);
  if (!table) {
    throw new APIError('Table not found', 404);
  }

  const tableNumber = table.number;

  // Remove table
  await restaurant.removeTable(tableId);

  loggerUtils.logBusiness('Table removed', {
    userId,
    restaurantId: id,
    tableId,
    tableNumber
  });

  res.status(200).json({
    success: true,
    message: 'Table removed successfully'
  });
});

/**
 * Get restaurant statistics
 */
const getRestaurantStats = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  // Get order statistics (placeholder - will be implemented when Order endpoints are ready)
  const stats = {
    restaurant: {
      name: restaurant.name,
      tablesCount: restaurant.activeTablesCount,
      isOpen: restaurant.isCurrentlyOpen,
      ...restaurant.stats
    },
    orders: {
      today: 0, // TODO: Implement with Order model
      thisWeek: 0,
      thisMonth: 0,
      total: restaurant.stats.totalOrders
    },
    revenue: {
      today: 0, // TODO: Implement with Order model
      thisWeek: 0,
      thisMonth: 0,
      total: restaurant.stats.totalRevenue
    }
  };

  loggerUtils.logBusiness('Restaurant statistics retrieved', {
    userId,
    restaurantId: id
  });

  res.status(200).json({
    success: true,
    message: 'Restaurant statistics retrieved successfully',
    data: stats
  });
});

/**
 * Toggle restaurant status (active/inactive)
 */
const toggleRestaurantStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check ownership
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  // Toggle status
  restaurant.isActive = !restaurant.isActive;
  restaurant.updatedBy = userId;
  await restaurant.save();

  loggerUtils.logBusiness('Restaurant status toggled', {
    userId,
    restaurantId: id,
    newStatus: restaurant.isActive ? 'active' : 'inactive'
  });

  res.status(200).json({
    success: true,
    message: `Restaurant ${restaurant.isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      id: restaurant._id,
      name: restaurant.name,
      isActive: restaurant.isActive
    }
  });
});

/**
 * Get restaurant by slug (public endpoint)
 */
const getRestaurantBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params;

  const restaurant = await Restaurant.findOne({ 
    slug, 
    isActive: true, 
    isPublished: true 
  }).populate('ownerId', 'profile.name');

  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Increment menu views
  restaurant.stats.menuViews += 1;
  await restaurant.save();

  // Don't include sensitive information in public response
  const publicData = {
    id: restaurant._id,
    name: restaurant.name,
    description: restaurant.description,
    slug: restaurant.slug,
    contact: {
      address: restaurant.contact.address,
      phone: restaurant.contact.phone,
      website: restaurant.contact.website
    },
    media: restaurant.media,
    hours: restaurant.hours,
    settings: {
      theme: restaurant.settings.theme,
      display: restaurant.settings.display,
      socialMedia: restaurant.settings.socialMedia
    },
    isCurrentlyOpen: restaurant.isCurrentlyOpen,
    menuUrl: restaurant.menuUrl
  };

  res.status(200).json({
    success: true,
    message: 'Restaurant retrieved successfully',
    data: publicData
  });
});

module.exports = {
  getAllRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  addTable,
  updateTable,
  removeTable,
  getRestaurantStats,
  toggleRestaurantStatus,
  getRestaurantBySlug
};