const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { Restaurant, User, Subscription, Order } = require('../models');
const mongoose = require('mongoose');
const { logger, loggerUtils } = require('../utils/logger');

/**
 * Get all restaurants (admin) or restaurants owned by the current user
 */
const getAllRestaurants = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  const skip = (page - 1) * limit;
  
  let query = {};
  
  // If user is not admin, only return their restaurants
  if (req.user.role !== 'admin') {
    query.ownerId = req.user.id;
  }
  
  // Apply filters if any
  if (filters.status) {
    query.status = filters.status;
  }
  
  const [restaurants, total] = await Promise.all([
    Restaurant.find(query)
      .populate('ownerId', 'name email phone profile username')
      .populate('subscriptionId', 'planKey planName planType features limits status expiryDate')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
    Restaurant.countDocuments(query)
  ]);
  
  // Add login credentials for admin users
  const restaurantsWithCredentials = restaurants.map(restaurant => {
    const restaurantObj = restaurant.toObject();
    
    // Add login credentials if user is admin
    if (req.user.role === 'admin' && restaurant.ownerId) {
      restaurantObj.loginCredentials = {
        username: restaurant.ownerId.username || restaurant.name.toLowerCase().replace(/\s+/g, '_') + '_restaurant_admin',
        password: '••••••••', // Don't expose actual password
        lastLogin: restaurant.ownerId.lastLogin || null
      };
    }
    
    return restaurantObj;
  });
  
  res.status(200).json({
    success: true,
    count: restaurantsWithCredentials.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: restaurantsWithCredentials
  });
});

/**
 * Get restaurant by ID
 */
const getRestaurant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  let query = { _id: id };
  
  // Non-admin users can only access their own restaurants
  if (userRole !== 'admin') {
    query.ownerId = userId;
  }

  const restaurant = await Restaurant.findOne(query)
    .populate('ownerId', 'name email phone profile')
    .populate('subscriptionId', 'planKey planName planType features limits status expiryDate');

  if (!restaurant) {
    throw new APIError('Restaurant not found or access denied', 404);
  }

  // Sync subscription plan with actual subscription data
  if (restaurant.subscriptionId) {
    const subscription = restaurant.subscriptionId;
    let subscriptionPlan = 'free'; // default
    
    if (subscription && subscription.planKey) {
      // Map subscription planKey to restaurant subscriptionPlan
      switch (subscription.planKey) {
        case 'restaurant_enterprise':
        case 'restaurant_premium':
          subscriptionPlan = 'premium';
          break;
        case 'restaurant_professional':
        case 'restaurant_advanced':
          subscriptionPlan = 'advanced';
          break;
        case 'restaurant_starter':
        case 'restaurant_basic':
          subscriptionPlan = 'basic';
          break;
        case 'restaurant_free':
        case 'free_plan':
        default:
          subscriptionPlan = 'free';
          break;
      }
      
      // Update restaurant if subscription plan is out of sync
      if (restaurant.subscriptionPlan !== subscriptionPlan) {
        restaurant.subscriptionPlan = subscriptionPlan;
        await restaurant.save();
        
        console.log('🔄 Subscription plan auto-synced:', {
          restaurantId: restaurant._id,
          oldPlan: restaurant.subscriptionPlan,
          newPlan: subscriptionPlan,
          subscriptionPlanKey: subscription.planKey
        });
      }
    }
  }

  // Fetch related data separately
  const MenuCategory = require('../models/MenuCategory');
  const MenuItem = require('../models/MenuItem');

  // Get menu categories for this restaurant
  const menuCategories = await MenuCategory.find({
    restaurantId: restaurant._id,
    active: true
  }).sort('sortOrder');

  // Get menu items count
  const menuItemsCount = await MenuItem.countDocuments({
    restaurantId: restaurant._id
  });

  // Add related data to restaurant object
  const restaurantData = {
    ...restaurant.toObject(),
    menuCategories,
    menuItemsCount,
    tablesCount: 0 // Will be populated from QR/table management
  };

  res.status(200).json({
    success: true,
    data: restaurantData
  });
});

/**
 * Get restaurant by slug
 */
const getRestaurantBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params;

  const restaurant = await Restaurant.findOne({ slug: slug, status: 'active' })
    .populate('ownerId', 'name email phone profile')
    .populate('subscriptionId', 'planKey planName planType features limits status expiryDate');

  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Fetch related data separately
  const MenuCategory = require('../models/MenuCategory');
  const MenuItem = require('../models/MenuItem');

  // Get menu categories for this restaurant
  const menuCategories = await MenuCategory.find({
    restaurantId: restaurant._id,
    active: true
  }).sort('sortOrder');

  // Get menu items count
  const menuItemsCount = await MenuItem.countDocuments({
    restaurantId: restaurant._id
  });

  // Add related data to restaurant object
  const restaurantData = {
    ...restaurant.toObject(),
    menuCategories,
    menuItemsCount,
    tablesCount: 0 // Will be populated from QR/table management
  };

  res.status(200).json({
    success: true,
    data: restaurantData
  });
});

/**
 * Get restaurant by ID (public access for checkout)
 */
const getRestaurantByIdPublic = catchAsync(async (req, res) => {
  const { id } = req.params;

  const restaurant = await Restaurant.findOne({ _id: id, status: 'active' })
    .populate('ownerId', 'name email phone profile')
    .populate('subscriptionId', 'planKey planName planType features limits status expiryDate');

  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Fetch related data separately
  const MenuCategory = require('../models/MenuCategory');
  const MenuItem = require('../models/MenuItem');

  // Get menu categories for this restaurant
  const menuCategories = await MenuCategory.find({
    restaurantId: restaurant._id,
    active: true
  }).sort('sortOrder');

  // Get menu items count
  const menuItemsCount = await MenuItem.countDocuments({
    restaurantId: restaurant._id
  });

  // Add related data to restaurant object
  const restaurantData = {
    ...restaurant.toObject(),
    menuCategories,
    menuItemsCount,
    tablesCount: 0 // Will be populated from QR/table management
  };

  res.status(200).json({
    success: true,
    data: restaurantData
  });
});

/**
 * Create new restaurant
 */
const createRestaurant = catchAsync(async (req, res) => {
  const { name, description, address, contact, openingHours, subscriptionId } = req.body;
  
  // Validate required fields
  if (!name || !name.trim()) {
    throw new APIError('Restaurant name is required', 400);
  }
  
  const userId = req.user.role === 'admin' ? req.body.ownerId || req.user.id : req.user.id;
  
  // Check if user already has a restaurant (if not admin creating for someone else)
  if (req.user.role !== 'admin' || !req.body.ownerId) {
    const existingRestaurant = await Restaurant.findOne({ ownerId: userId });
    if (existingRestaurant) {
      throw new APIError('You already have a restaurant', 400);
    }
  }
  
  // If admin is creating for someone else, check if that user already has a restaurant
  if (req.user.role === 'admin' && req.body.ownerId) {
    const existingRestaurant = await Restaurant.findOne({ ownerId: req.body.ownerId });
    if (existingRestaurant) {
      throw new APIError(`User already has a restaurant: ${existingRestaurant.name}`, 409);
    }
  }
  
  // Validate subscription if provided, or create a free one if not
  let validatedSubscriptionId = subscriptionId;
  const Subscription = require('../models/Subscription');

  if (subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new APIError('Invalid subscription ID', 400);
    }
    if (subscription.status !== 'active') {
      throw new APIError('Subscription must be active', 400);
    }
  } else {
    // Create a free subscription for the restaurant if none provided
    const freeSubscription = new Subscription({
      userId: userId,
      planKey: 'restaurant_free',
      planType: 'restaurant',
      planName: 'Free Starter',
      features: {
        crudMenu: true,
        qrGeneration: true,
        vendorManagement: false,
        analytics: false,
        qrCustomization: false,
        modifiers: false,
        watermark: true,
        unlimited: false,
        multiLocation: false,
        advancedReporting: false,
        apiAccess: false,
        whiteLabel: false,
        prioritySupport: false,
        customBranding: false
      },
      limits: {
        maxTables: 1,
        maxShops: 0,
        maxVendors: 0,
        maxCategories: 1,
        maxMenuItems: 2,
        maxUsers: 1,
        maxOrdersPerMonth: 50,
        maxStorageGB: 1
      },
      pricing: {
        amount: 0,
        currency: 'INR',
        interval: 'monthly',
        trialDays: 0
      },
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      usage: {
        currentTables: 0,
        currentShops: 0,
        currentVendors: 0,
        currentCategories: 0,
        currentMenuItems: 0,
        currentUsers: 1,
        ordersThisMonth: 0,
        storageUsedGB: 0,
        lastUsageUpdate: new Date()
      },
      payment: {
        paymentHistory: []
      },
      notes: []
    });

    await freeSubscription.save();
    validatedSubscriptionId = freeSubscription._id;

    console.log('✅ Created free subscription for new restaurant:', {
      userId,
      subscriptionId: freeSubscription._id,
      planKey: freeSubscription.planKey
    });
  }
  
  try {
    const restaurant = await Restaurant.create({
      name: name.trim(),
      description: description?.trim(),
      address,
      contact,
      openingHours,
      ownerId: userId,
      subscriptionId: validatedSubscriptionId,
      status: 'active'
    });
    
    res.status(201).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      if (duplicateField === 'slug') {
        throw new APIError('A restaurant with this name already exists', 409);
      }
      throw new APIError(`Restaurant with this ${duplicateField} already exists`, 409);
    }
    
    // Re-throw other errors
    throw error;
  }
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

  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Access denied', 403);
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const ordersToday = await Order.countDocuments({ restaurantId: id, createdAt: { $gte: today } });
  const ordersThisWeek = await Order.countDocuments({ restaurantId: id, createdAt: { $gte: startOfWeek } });
  const ordersThisMonth = await Order.countDocuments({ restaurantId: id, createdAt: { $gte: startOfMonth } });

  const revenueTodayResult = await Order.aggregate([
    { $match: { restaurantId: mongoose.Types.ObjectId(id), createdAt: { $gte: today } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const revenueThisWeekResult = await Order.aggregate([
    { $match: { restaurantId: mongoose.Types.ObjectId(id), createdAt: { $gte: startOfWeek } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const revenueThisMonthResult = await Order.aggregate([
    { $match: { restaurantId: mongoose.Types.ObjectId(id), createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  const stats = {
    restaurant: {
      name: restaurant.name,
      tablesCount: restaurant.activeTablesCount,
      isOpen: restaurant.isCurrentlyOpen,
      ...restaurant.stats
    },
    orders: {
      today: ordersToday,
      thisWeek: ordersThisWeek,
      thisMonth: ordersThisMonth,
      total: restaurant.stats.totalOrders
    },
    revenue: {
      today: revenueTodayResult.length > 0 ? revenueTodayResult[0].total : 0,
      thisWeek: revenueThisWeekResult.length > 0 ? revenueThisWeekResult[0].total : 0,
      thisMonth: revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0,
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


const updateRestaurant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  console.log('🔧 Update Restaurant Request:', {
    restaurantId: id,
    userId,
    userRole,
    originalUpdateFields: Object.keys(updates),
    updateData: updates
  });

  // Find the restaurant first to check ownership
  const restaurant = await Restaurant.findById(id).populate('subscriptionId');
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check if user has permission to update this restaurant
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Not authorized to update this restaurant', 403);
  }

  // Create a clean updates object without sensitive fields
  const sanitizedUpdates = { ...updates };
  
  // Remove fields that restaurant owners shouldn't be able to change
  if (userRole !== 'admin') {
    delete sanitizedUpdates.ownerId;
    delete sanitizedUpdates.subscriptionId;
    delete sanitizedUpdates.createdAt;
    delete sanitizedUpdates.updatedAt;
    delete sanitizedUpdates._id;
    delete sanitizedUpdates.id;
    delete sanitizedUpdates.__v;
    // Remove any nested owner references
    if (sanitizedUpdates.owner) {
      delete sanitizedUpdates.owner;
    }
  }

  // Handle logo image - save only in media.images array
  if (sanitizedUpdates.logo) {
    // Get existing restaurant data to merge with current media
    const existingMedia = restaurant.media || { images: [] };
    const existingImages = existingMedia.images || [];
    
    // Prepare logo image for media.images array
    const logoImageData = {
      url: sanitizedUpdates.logo,
      caption: 'Restaurant Logo',
      isPrimary: true,
      imageType: 'logo',
      order: 0
    };
    
    // Update or add logo in images array
    const logoIndex = existingImages.findIndex(img => img.imageType === 'logo');
    let updatedImages;
    
    if (logoIndex >= 0) {
      // Update existing logo
      updatedImages = [...existingImages];
      updatedImages[logoIndex] = logoImageData;
    } else {
      // Add new logo at the beginning
      updatedImages = [logoImageData, ...existingImages];
    }
    
    // Create complete media object - only images array
    sanitizedUpdates.media = {
      ...existingMedia,
      images: updatedImages
    };
    
    // Remove the logo field - we only store in media.images
    delete sanitizedUpdates.logo;
    
    console.log('🖼️ Logo saved to media.images only:', {
      logoUrl: logoImageData.url,
      totalImagesCount: updatedImages.length
    });
  }

  // Handle contact information mapping
  if (sanitizedUpdates.contact) {
    // If contact structure is provided, sync flat fields for frontend compatibility
    if (sanitizedUpdates.contact.phone) {
      sanitizedUpdates.ownerPhone = sanitizedUpdates.contact.phone;
    }
    if (sanitizedUpdates.contact.email) {
      sanitizedUpdates.ownerEmail = sanitizedUpdates.contact.email;
    }
    if (sanitizedUpdates.contact.address) {
      if (sanitizedUpdates.contact.address.street) {
        sanitizedUpdates.address = sanitizedUpdates.contact.address.street;
      }
      if (sanitizedUpdates.contact.address.city) {
        sanitizedUpdates.city = sanitizedUpdates.contact.address.city;
      }
      if (sanitizedUpdates.contact.address.state) {
        sanitizedUpdates.state = sanitizedUpdates.contact.address.state;
      }
      if (sanitizedUpdates.contact.address.zipCode) {
        sanitizedUpdates.zipCode = sanitizedUpdates.contact.address.zipCode;
      }
    }
    
    console.log('📞 Contact structure mapped to flat fields:', {
      contactPhone: sanitizedUpdates.contact.phone,
      contactEmail: sanitizedUpdates.contact.email,
      contactAddress: sanitizedUpdates.contact.address?.street,
      flatPhone: sanitizedUpdates.ownerPhone,
      flatEmail: sanitizedUpdates.ownerEmail,
      flatAddress: sanitizedUpdates.address
    });
  } else if (sanitizedUpdates.ownerPhone || sanitizedUpdates.ownerEmail || sanitizedUpdates.address) {
    // If flat fields are provided, create/update contact structure
    const existingContact = restaurant.contact || {};
    const existingAddress = existingContact.address || {};
    
    sanitizedUpdates.contact = {
      ...existingContact,
      phone: sanitizedUpdates.ownerPhone || existingContact.phone,
      email: sanitizedUpdates.ownerEmail || existingContact.email,
      address: {
        ...existingAddress,
        street: sanitizedUpdates.address || existingAddress.street,
        city: sanitizedUpdates.city || existingAddress.city,
        state: sanitizedUpdates.state || existingAddress.state,
        zipCode: sanitizedUpdates.zipCode || existingAddress.zipCode,
        country: existingAddress.country || 'IN'
      }
    };
    
    console.log('🔄 Flat fields mapped to contact structure:', {
      flatPhone: sanitizedUpdates.ownerPhone,
      flatEmail: sanitizedUpdates.ownerEmail,
      flatAddress: sanitizedUpdates.address,
      contactStructure: sanitizedUpdates.contact
    });
  }

  // Sync subscription plan with actual subscription
  if (restaurant.subscriptionId) {
    const subscription = restaurant.subscriptionId;
    let subscriptionPlan = 'free'; // default
    
    if (subscription && subscription.planKey) {
      // Map subscription planKey to restaurant subscriptionPlan
      switch (subscription.planKey) {
        case 'restaurant_enterprise':
        case 'restaurant_premium':
          subscriptionPlan = 'premium';
          break;
        case 'restaurant_professional':
        case 'restaurant_advanced':
          subscriptionPlan = 'advanced';
          break;
        case 'restaurant_starter':
        case 'restaurant_basic':
          subscriptionPlan = 'basic';
          break;
        case 'restaurant_free':
        case 'free_plan':
        default:
          subscriptionPlan = 'free';
          break;
      }
      
      // Update the subscription plan to keep it in sync
      sanitizedUpdates.subscriptionPlan = subscriptionPlan;
      
      console.log('🔄 Subscription sync:', {
        subscriptionPlanKey: subscription.planKey,
        mappedSubscriptionPlan: subscriptionPlan
      });
    }
  }

  console.log('🧹 After Sanitization:', {
    restaurantId: id,
    userId,
    userRole,
    originalFields: Object.keys(updates),
    sanitizedFields: Object.keys(sanitizedUpdates),
    removedFields: Object.keys(updates).filter(key => !Object.keys(sanitizedUpdates).includes(key)),
    containsOwnerId: 'ownerId' in sanitizedUpdates,
    logoField: sanitizedUpdates.logo ? 'present' : 'absent',
    subscriptionPlan: sanitizedUpdates.subscriptionPlan,
    mediaStructure: sanitizedUpdates.media ? {
      hasLogo: !!sanitizedUpdates.media.logo,
      imagesCount: sanitizedUpdates.media.images?.length || 0
    } : 'none'
  });

  // Double-check: Prevent changing ownerId unless admin
  if (sanitizedUpdates.ownerId && userRole !== 'admin') {
    console.error('🚨 CRITICAL: ownerId still present after sanitization!', {
      sanitizedUpdates,
      userRole
    });
    throw new APIError('Only admins can change restaurant ownership', 403);
  }

  // Update the restaurant with proper error handling
  try {
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      { $set: sanitizedUpdates },
      { 
        new: true, 
        runValidators: true,
        validateModifiedOnly: true
      }
    ).populate('subscriptionId', 'planKey planName planType status');

    if (!updatedRestaurant) {
      throw new APIError('Restaurant not found after update', 404);
    }

    console.log('✅ Restaurant updated successfully:', {
      restaurantId: id,
      updatedFields: Object.keys(sanitizedUpdates),
      mediaImagesCount: updatedRestaurant.media?.images?.length || 0,
      hasLogo: !!updatedRestaurant.media?.images?.find(img => img.imageType === 'logo'),
      logoUrl: updatedRestaurant.media?.images?.find(img => img.imageType === 'logo')?.url || 'None',
      subscriptionPlan: updatedRestaurant.subscriptionPlan
    });

    res.status(200).json({
      success: true,
      data: updatedRestaurant
    });
  } catch (validationError) {
    console.error('🚨 Database validation error:', {
      restaurantId: id,
      error: validationError.message,
      errors: validationError.errors
    });
    
    // Handle specific validation errors
    if (validationError.name === 'ValidationError') {
      const errors = Object.values(validationError.errors).map(err => err.message);
      throw new APIError(`Validation failed: ${errors.join(', ')}`, 400);
    }
    
    // Handle duplicate key errors
    if (validationError.code === 11000) {
      const field = Object.keys(validationError.keyPattern)[0];
      throw new APIError(`Duplicate value for ${field}`, 409);
    }
    
    // Handle MongoDB path conflicts
    if (validationError.message && validationError.message.includes('would create a conflict')) {
      console.error('🚨 MongoDB path conflict detected:', validationError.message);
      throw new APIError('Database update conflict - please try again', 409);
    }
    
    throw new APIError('Database operation failed', 500);
  }
});

// Delete a restaurant
const deleteRestaurant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check if user has permission to delete this restaurant
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Not authorized to delete this restaurant', 403);
  }

  // Soft delete by setting status to 'deleted' instead of actually removing
  restaurant.status = 'deleted';
  await restaurant.save();

  res.status(200).json({
    success: true,
    message: 'Restaurant deleted successfully'
  });
});

// Toggle restaurant status (active/inactive)
const toggleRestaurantStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check if user has permission to update this restaurant
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Not authorized to update this restaurant', 403);
  }

  // Toggle status
  restaurant.status = restaurant.status === 'active' ? 'inactive' : 'active';
  await restaurant.save();

  res.status(200).json({
    success: true,
    data: {
      id: restaurant._id,
      status: restaurant.status,
      name: restaurant.name
    },
    message: `Restaurant ${restaurant.status === 'active' ? 'activated' : 'deactivated'} successfully`
  });
});

// Add a table to a restaurant
const addTable = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { number, capacity, description, status = 'available' } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check if user has permission to update this restaurant
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Not authorized to update this restaurant', 403);
  }

  // Check if table number already exists
  const tableExists = restaurant.tables.some(t => t.number === number);
  if (tableExists) {
    throw new APIError('Table with this number already exists', 400);
  }

  // Add the new table
  const newTable = {
    number,
    capacity,
    description,
    status,
    qrCode: `R${id}T${number}` // Simple QR code format, can be enhanced
  };

  restaurant.tables.push(newTable);
  await restaurant.save();

  res.status(201).json({
    success: true,
    data: newTable,
    message: 'Table added successfully'
  });
});

// Update a table in a restaurant
const updateTable = catchAsync(async (req, res) => {
  const { id, tableId } = req.params;
  const updates = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check if user has permission to update this restaurant
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Not authorized to update this restaurant', 403);
  }

  // Find the table
  const tableIndex = restaurant.tables.findIndex(t => t._id.toString() === tableId);
  if (tableIndex === -1) {
    throw new APIError('Table not found', 404);
  }

  // Update the table
  restaurant.tables[tableIndex] = {
    ...restaurant.tables[tableIndex].toObject(),
    ...updates,
    updatedAt: new Date()
  };

  await restaurant.save();

  res.status(200).json({
    success: true,
    data: restaurant.tables[tableIndex],
    message: 'Table updated successfully'
  });
});

// Remove a table from a restaurant
const removeTable = catchAsync(async (req, res) => {
  const { id, tableId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }

  // Check if user has permission to update this restaurant
  if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId) {
    throw new APIError('Not authorized to update this restaurant', 403);
  }

  // Find the table
  const tableIndex = restaurant.tables.findIndex(t => t._id.toString() === tableId);
  if (tableIndex === -1) {
    throw new APIError('Table not found', 404);
  }

  // Remove the table
  restaurant.tables.splice(tableIndex, 1);
  await restaurant.save();

  res.status(200).json({
    success: true,
    message: 'Table removed successfully'
  });
});

/**
 * Update restaurant owner credentials (admin only)
 */
const updateRestaurantCredentials = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { loginCredentials } = req.body;
  
  // Only admin can update credentials
  if (req.user.role !== 'admin') {
    throw new APIError('Only administrators can update credentials', 403);
  }
  
  const restaurant = await Restaurant.findById(id).populate('ownerId');
  if (!restaurant) {
    throw new APIError('Restaurant not found', 404);
  }
  
  const user = await User.findById(restaurant.ownerId._id);
  if (!user) {
    throw new APIError('Restaurant owner not found', 404);
  }
  
  // Update credentials
  if (loginCredentials.username) {
    user.username = loginCredentials.username;
  }
  
  if (loginCredentials.password) {
    const bcrypt = require('bcrypt');
    user.passwordHash = await bcrypt.hash(loginCredentials.password, 12);
  }
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Restaurant credentials updated successfully'
  });
});

module.exports = {
  getAllRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  toggleRestaurantStatus,
  addTable,
  updateTable,
  removeTable,
  getRestaurantStats,
  getRestaurantBySlug,
  getRestaurantByIdPublic,
  updateRestaurantCredentials
};