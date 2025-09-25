const ZoneShop = require('../models/ZoneShop');
const Zone = require('../models/Zone');
const User = require('../models/User');
const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { ErrorTypes } = require('../middleware/errorHandler');
const { UploadService } = require('../services/uploadService');

class ZoneShopController {
  // @desc    Get all shops in a zone
  // @route   GET /api/v1/shops/zones/:zoneId
  // @access  Private/Public (depending on query params)
  static getZoneShops = catchAsync(async (req, res) => {
    const { zoneId } = req.params;
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status = 'active',
      featured,
      sortBy = 'rating.average',
      sortOrder = 'desc'
    } = req.query;

    // Verify zone exists
    const zone = await Zone.findById(zoneId);
    if (!zone) {
      throw new APIError('Zone not found', 404);
    }

    // Build query
    let query = { zoneId };

    // Apply status filter based on user permissions
    if (req.user && req.user.role === 'admin') {
      // Admin can see all statuses
      if (status !== 'all') {
        query.status = status;
      }
    } else if (req.user && req.user.role === 'zone_admin' && zone.adminId.toString() === req.user.id) {
      // Zone admin can see their zone's shops with any status
      if (status !== 'all') {
        query.status = status;
      }
    } else {
      // Public and other users can only see active shops
      query.status = 'active';
    }

    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Add category filter
    if (category) {
      query.category = category;
    }

    // Add featured filter
    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const shops = await ZoneShop.find(query)
      .populate('ownerId', 'profile.name email phone')
      .populate('zoneId', 'name location')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await ZoneShop.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        shops,
        zone: {
          id: zone._id,
          name: zone.name,
          location: zone.location
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNextPage: skip + shops.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  });

  // @desc    Get single shop
  // @route   GET /api/v1/shops/zones/:zoneId/shop/:shopId
  // @access  Public for active shops, Private for others
  static getShop = catchAsync(async (req, res) => {
    const { zoneId, shopId } = req.params;
    const { includeMenu = false } = req.query;

    const shop = await ZoneShop.findOne({ _id: shopId, zoneId })
      .populate('ownerId', 'profile.name email phone')
      .populate('zoneId', 'name location contactInfo');

    if (!shop) {
      throw ErrorTypes.NotFoundError('Shop');
    }

    // Check if shop is accessible (public can only see active shops)
    if (!req.user && shop.status !== 'active') {
      throw ErrorTypes.NotFoundError('Shop');
    }

    let responseData = { shop };

    // Include menu if requested
    if (includeMenu === 'true') {
      const MenuItem = require('../models/MenuItem');
      const menu = await MenuItem.find({
        shopId: shopId,
        available: true
      }).populate('categoryId', 'name description');

      responseData.menu = menu;
    }

    res.status(200).json({
      success: true,
      data: responseData
    });
  });

  // @desc    Create new vendor (user + shop) in zone
  // @route   POST /api/v1/shops/zones/:zoneId/vendor
  // @access  Private (Zone Admin, Admin)
  static createVendor = catchAsync(async (req, res) => {
    const { zoneId } = req.params;
    const { name, description, cuisine, ownerName, ownerPhone, ownerEmail, password, status = 'active' } = req.body;

    // Verify zone exists and check permissions
    const zone = await Zone.findById(zoneId).populate('subscriptionId');
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }

    // Check permissions
    if (req.user.role === 'zone_admin' && zone.adminId.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to create vendors in this zone');
    } else if (!['admin', 'zone_admin'].includes(req.user.role)) {
      throw ErrorTypes.ForbiddenError('Insufficient permissions to create vendors');
    }

    // Check subscription limits
    if (zone.subscriptionId) {
      const currentShopsCount = await ZoneShop.countDocuments({
        zoneId,
        status: { $in: ['active', 'pending'] }
      });

      const maxShops = zone.subscriptionId.limits?.maxShops || zone.subscriptionId.limits?.maxVendors;
      if (maxShops && currentShopsCount >= maxShops) {
        throw ErrorTypes.ValidationError(
          `Maximum number of vendors (${maxShops}) reached for this zone's subscription plan`
        );
      }
    }

    // Create user first
    const bcrypt = require('bcrypt');
    const username = name.toLowerCase().replace(/\s+/g, '_') + '_vendor';
    
    const userData = {
      email: ownerEmail,
      phone: ownerPhone,
      username: username,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'zone_vendor',
      businessType: 'zone',
      profile: {
        name: ownerName
      },
      status: 'active'
    };

    const user = new User(userData);
    await user.save();

    // Create shop
    const shop = new ZoneShop({
      zoneId,
      ownerId: user._id,
      name,
      description,
      category: cuisine,
      contactInfo: {
        email: ownerEmail,
        phone: ownerPhone
      },
      status: status
    });

    await shop.save();

    // Populate response
    await shop.populate('ownerId', 'profile.name email phone username');
    await shop.populate('zoneId', 'name location');

    res.status(201).json({
      success: true,
      data: { 
        shop,
        loginCredentials: {
          username: username,
          password: password
        }
      },
      message: 'Vendor created successfully'
    });
  });

  // @desc    Create new shop in zone
  // @route   POST /api/v1/shops/zones/:zoneId
  // @access  Private (Zone Admin, Admin)
  static createShop = catchAsync(async (req, res) => {
    const { zoneId } = req.params;
    const { ownerId, name, description, category, contactInfo, settings } = req.body;

    // Verify zone exists and check permissions
    const zone = await Zone.findById(zoneId).populate('subscriptionId');
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }

    // Check permissions
    if (req.user.role === 'zone_admin' && zone.adminId.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to create shops in this zone');
    } else if (!['admin', 'zone_admin'].includes(req.user.role)) {
      throw ErrorTypes.ForbiddenError('Insufficient permissions to create shops');
    }

    // Check subscription limits if zone has subscription
    if (zone.subscriptionId) {
      const currentShopsCount = await ZoneShop.countDocuments({
        zoneId,
        status: { $in: ['active', 'pending'] }
      });

      const maxShops = zone.subscriptionId.limits?.maxShops;
      if (maxShops && currentShopsCount >= maxShops) {
        throw ErrorTypes.ValidationError(
          `Maximum number of shops (${maxShops}) reached for this zone's subscription plan`
        );
      }
    }

    // Validate owner user
    const ownerUser = await User.findById(ownerId);
    if (!ownerUser) {
      throw ErrorTypes.NotFoundError('Shop owner user');
    }

    if (!['zone_shop', 'zone_vendor'].includes(ownerUser.role)) {
      throw ErrorTypes.ValidationError('Owner must have zone_shop or zone_vendor role');
    }

    // Check if owner already has a shop in this zone
    const existingShop = await ZoneShop.findOne({
      zoneId,
      ownerId,
      status: { $in: ['active', 'pending'] }
    });

    if (existingShop) {
      throw ErrorTypes.ConflictError('Owner already has an active/pending shop in this zone');
    }

    // Create shop
    const shop = new ZoneShop({
      zoneId,
      ownerId,
      name,
      description,
      category,
      contactInfo,
      settings: {
        // Use default settings if available in schema
        ...(ZoneShop.schema?.paths?.settings?.default ? ZoneShop.schema.paths.settings.default() : {}),
        ...settings
      },
      status: req.user.role === 'admin' ? 'active' : 'pending'
    });

    await shop.save();

    // Populate response
    await shop.populate('ownerId', 'profile.name email phone');
    await shop.populate('zoneId', 'name location');

    res.status(201).json({
      success: true,
      data: { shop },
      message: 'Shop created successfully'
    });
  });

  // @desc    Update shop
  // @route   PUT /api/v1/shops/zones/:zoneId/shop/:shopId
  // @access  Private (Shop Owner, Zone Admin, Admin)
  static updateShop = catchAsync(async (req, res) => {
    const { zoneId, shopId } = req.params;
    const updates = req.body;

    const shop = await ZoneShop.findOne({ _id: shopId, zoneId });
    if (!shop) {
      throw ErrorTypes.NotFoundError('Shop');
    }

    // Check permissions
    const zone = await Zone.findById(zoneId);
    const canUpdate = (
      req.user.role === 'admin' ||
      (req.user.role === 'zone_admin' && zone.adminId.toString() === req.user.id) ||
      shop.ownerId.toString() === req.user.id
    );

    if (!canUpdate) {
      throw ErrorTypes.ForbiddenError('Access denied to update this shop');
    }

    // Restrict certain fields based on user role
    if (req.user.role === 'zone_shop' || req.user.role === 'zone_vendor') {
      // Shop owners can't change status, owner, or zone
      delete updates.status;
      delete updates.ownerId;
      delete updates.zoneId;
      delete updates.featured;
      delete updates.verificationStatus;
    }

    // Handle contactInfo mapping
    if (updates.contactInfo) {
      // ContactInfo structure is primary - no flat field mapping needed for zone shops
      console.log('📞 ContactInfo structure provided for zone shop:', {
        contactPhone: updates.contactInfo.phone,
        contactEmail: updates.contactInfo.email
      });
    }

    // Handle location mapping
    if (updates.location && updates.location.address) {
      console.log('📍 Location structure provided for zone shop:', {
        locationAddress: updates.location.address
      });
    }

    // Validate category if being updated
    if (updates.category && ZoneShop.schema?.paths?.category?.enumValues) {
      const validCategories = ZoneShop.schema.paths.category.enumValues;
      if (!validCategories.includes(updates.category)) {
        throw ErrorTypes.ValidationError('Invalid shop category');
      }
    }

    // Update shop
    Object.assign(shop, updates);
    await shop.save();

    // Populate response
    await shop.populate('ownerId', 'profile.name email phone');
    await shop.populate('zoneId', 'name location');

    res.status(200).json({
      success: true,
      data: { shop },
      message: 'Shop updated successfully'
    });
  });

  // @desc    Delete/Remove shop from zone
  // @route   DELETE /api/v1/shops/zones/:zoneId/shop/:shopId
  // @access  Private (Zone Admin, Admin)
  static deleteShop = catchAsync(async (req, res) => {
    const { zoneId, shopId } = req.params;
    const { permanent = false } = req.query;

    const shop = await ZoneShop.findOne({ _id: shopId, zoneId });
    if (!shop) {
      throw ErrorTypes.NotFoundError('Shop');
    }

    // Check permissions - only zone admin or admin can delete
    const zone = await Zone.findById(zoneId);
    const canDelete = (
      req.user.role === 'admin' ||
      (req.user.role === 'zone_admin' && zone.adminId.toString() === req.user.id)
    );

    if (!canDelete) {
      throw ErrorTypes.ForbiddenError('Insufficient permissions to delete shops');
    }

    // Check if shop has active orders
    const Order = require('../models/Order');
    const activeOrdersCount = await Order.countDocuments({
      shopId: shopId,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    if (activeOrdersCount > 0) {
      throw ErrorTypes.ConflictError(
        `Cannot delete shop with ${activeOrdersCount} active orders. Please complete or cancel orders first.`
      );
    }

    if (permanent === 'true') {
      // Permanent deletion
      await ZoneShop.findByIdAndDelete(shopId);

      // Also delete menu items
      const MenuItem = require('../models/MenuItem');
      await MenuItem.deleteMany({ shopId });

      res.status(200).json({
        success: true,
        message: 'Shop permanently deleted'
      });
    } else {
      // Soft delete - change status
      shop.status = 'inactive';
      await shop.save();

      res.status(200).json({
        success: true,
        message: 'Shop deactivated successfully'
      });
    }
  });

  // @desc    Update shop status
  // @route   PATCH /api/v1/shops/zones/:zoneId/shop/:shopId/status
  // @access  Private (Zone Admin, Admin)
  static updateShopStatus = catchAsync(async (req, res) => {
    const { zoneId, shopId } = req.params;
    const { status, notes } = req.body;

    const shop = await ZoneShop.findOne({ _id: shopId, zoneId });
    if (!shop) {
      throw ErrorTypes.NotFoundError('Shop');
    }

    // Check permissions
    const zone = await Zone.findById(zoneId);
    const canUpdate = (
      req.user.role === 'admin' ||
      (req.user.role === 'zone_admin' && zone.adminId.toString() === req.user.id)
    );

    if (!canUpdate) {
      throw ErrorTypes.ForbiddenError('Insufficient permissions to update shop status');
    }

    // Validate status
    const validStatuses = ['pending', 'active', 'inactive', 'suspended', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw ErrorTypes.ValidationError('Invalid status value');
    }

    // Update status - check if toggleStatus method exists
    if (typeof shop.toggleStatus === 'function') {
      await shop.toggleStatus(status, notes);
    } else {
      shop.status = status;
      shop.statusHistory = shop.statusHistory || [];
      shop.statusHistory.push({
        status,
        notes,
        updatedBy: req.user.id,
        updatedAt: new Date()
      });
    }

    // Update verification status if approving/rejecting
    if (status === 'active') {
      shop.verificationStatus = shop.verificationStatus || {};
      shop.verificationStatus.isVerified = true;
      shop.verificationStatus.verifiedAt = new Date();
      shop.verificationStatus.verifiedBy = req.user.id;
      shop.verificationStatus.verificationNotes = notes || 'Approved by admin';
    } else if (status === 'rejected' || status === 'suspended') {
      shop.verificationStatus = shop.verificationStatus || {};
      shop.verificationStatus.verificationNotes = notes || 'Status updated by admin';
    }

    await shop.save();

    res.status(200).json({
      success: true,
      data: {
        shop: {
          id: shop._id,
          name: shop.name,
          status: shop.status,
          verificationStatus: shop.verificationStatus
        }
      },
      message: `Shop status updated to ${status}`
    });
  });

  // @desc    Update shop availability status (for shop owners)
  // @route   PATCH /api/v1/shops/zones/:zoneId/shop/:shopId/availability
  // @access  Private (Shop Owner, Zone Admin, Admin)
  static updateShopAvailability = catchAsync(async (req, res) => {
    const { zoneId, shopId } = req.params;
    const { status } = req.body;

    const shop = await ZoneShop.findOne({ _id: shopId, zoneId });
    if (!shop) {
      throw ErrorTypes.NotFoundError('Shop');
    }

    // Check permissions - Allow shop owners to update their own availability
    const zone = await Zone.findById(zoneId);
    const canUpdate = (
      req.user.role === 'admin' ||
      (req.user.role === 'zone_admin' && zone.adminId.toString() === req.user.id) ||
      shop.ownerId.toString() === req.user.id
    );

    if (!canUpdate) {
      throw ErrorTypes.ForbiddenError('Access denied to update shop availability');
    }

    // Validate status - Only allow active/inactive for availability updates
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      throw ErrorTypes.ValidationError('Invalid status. Only "active" or "inactive" allowed for availability updates');
    }

    // Update shop status
    shop.status = status;
    
    // Add to status history if shop owner is updating
    if (req.user.role === 'zone_shop' || req.user.role === 'zone_vendor') {
      shop.statusHistory = shop.statusHistory || [];
      shop.statusHistory.push({
        status,
        notes: `Shop ${status === 'active' ? 'opened' : 'closed'} by shop owner`,
        updatedBy: req.user.id,
        updatedAt: new Date()
      });
    }

    await shop.save();

    console.log(`🏪 Shop availability updated by ${req.user.role}:`, {
      shopId: shop._id,
      shopName: shop.name,
      oldStatus: shop.status,
      newStatus: status,
      updatedBy: req.user.id,
      userRole: req.user.role
    });

    res.status(200).json({
      success: true,
      data: {
        shop: {
          id: shop._id,
          name: shop.name,
          status: shop.status
        }
      },
      message: `Shop is now ${status === 'active' ? 'open' : 'closed'}`
    });
  });

  // @desc    Upload shop images - FIXED: Method name matches route
  // @route   POST /api/v1/shops/zones/:zoneId/shop/:shopId/upload
  // @access  Private (Shop Owner, Zone Admin, Admin)
  static uploadImages = catchAsync(async (req, res) => {
    const { zoneId, shopId } = req.params;
    const { type = 'gallery' } = req.body; // 'logo' or 'gallery'

    const shop = await ZoneShop.findOne({ _id: shopId, zoneId });
    if (!shop) {
      throw ErrorTypes.NotFoundError('Shop');
    }

    // Check permissions
    const zone = await Zone.findById(zoneId);
    const canUpload = (
      req.user.role === 'admin' ||
      (req.user.role === 'zone_admin' && zone.adminId.toString() === req.user.id) ||
      shop.ownerId.toString() === req.user.id
    );

    if (!canUpload) {
      throw ErrorTypes.ForbiddenError('Access denied to upload images for this shop');
    }

    if (!req.files || req.files.length === 0) {
      throw ErrorTypes.ValidationError('No images provided');
    }

    try {
      if (type === 'logo') {
        // Upload single logo
        if (req.files.length > 1) {
          throw ErrorTypes.ValidationError('Only one logo image allowed');
        }

        const logoResult = await UploadService.uploadImage(req.files[0].buffer, {
          folder: `tableserve/shops/${shopId}/logo`,
          transformation: [
            { width: 300, height: 300, crop: 'fill' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        });

        // Delete old logo if exists
        if (shop.logo?.publicId) {
          await UploadService.deleteImage(shop.logo.publicId);
        }

        shop.logo = {
          url: logoResult.url,
          publicId: logoResult.publicId
        };

        await shop.save();

        res.status(200).json({
          success: true,
          data: { logo: shop.logo },
          message: 'Logo uploaded successfully'
        });

      } else {
        // Upload gallery images
        if (req.files.length > 5) {
          throw ErrorTypes.ValidationError('Maximum 5 gallery images allowed per upload');
        }

        const uploadResults = await UploadService.uploadMultipleImages(req.files, {
          folder: `tableserve/shops/${shopId}/gallery`
        });

        const newImages = uploadResults.map(result => ({
          url: result.url,
          publicId: result.publicId,
          caption: ''
        }));

        // Initialize images array if not exists
        shop.images = shop.images || [];

        // Limit total images to 10
        const totalImages = shop.images.length + newImages.length;
        if (totalImages > 10) {
          throw ErrorTypes.ValidationError('Maximum 10 gallery images allowed');
        }

        shop.images.push(...newImages);
        await shop.save();

        res.status(200).json({
          success: true,
          data: { images: newImages },
          message: 'Images uploaded successfully'
        });
      }

    } catch (error) {
      console.error('Image upload error:', error);
      throw ErrorTypes.ValidationError('Image upload failed', error.message);
    }
  });

  // @desc    Get shop statistics
  // @route   GET /api/v1/shops/zones/:zoneId/shop/:shopId/stats
  // @access  Private (Shop Owner, Zone Admin, Admin)
  static getShopStats = catchAsync(async (req, res) => {
    const { zoneId, shopId } = req.params;
    const { period = 'month' } = req.query;

    const shop = await ZoneShop.findOne({ _id: shopId, zoneId });
    if (!shop) {
      throw ErrorTypes.NotFoundError('Shop');
    }

    // Check permissions
    const zone = await Zone.findById(zoneId);
    const canView = (
      req.user.role === 'admin' ||
      (req.user.role === 'zone_admin' && zone.adminId.toString() === req.user.id) ||
      shop.ownerId.toString() === req.user.id
    );

    if (!canView) {
      throw ErrorTypes.ForbiddenError('Access denied to view shop statistics');
    }

    // Get time-based statistics
    const dateFilter = ZoneShopController.getDateFilter(period);

    // Aggregate orders for this shop
    const Order = require('../models/Order');
    const orderStats = await Order.aggregate([
      {
        $match: {
          shopId: shop._id,
          createdAt: { $gte: dateFilter }
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
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const periodStats = orderStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };

    // Calculate completion rate
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
          isCurrentlyOpen: typeof shop.isCurrentlyOpen === 'function'
            ? shop.isCurrentlyOpen()
            : shop.isOpen || false
        },
        overall: shop.stats || {},
        period: {
          period,
          ...periodStats,
          completionRate
        }
      }
    });
  });

  // @desc    Search shops across zones
  // @route   GET /api/v1/shops/search
  // @access  Public
  static searchShops = catchAsync(async (req, res) => {
    const { q, zoneId, category, page = 1, limit = 10 } = req.query;

    if (!q) {
      throw ErrorTypes.ValidationError('Search query is required');
    }

    // Build search query
    let query = {
      status: 'active',
      $text: { $search: q }
    };

    if (zoneId) {
      query.zoneId = zoneId;
    }

    if (category) {
      query.category = category;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute search
    const shops = await ZoneShop.find(query)
      .populate('zoneId', 'name location')
      .populate('ownerId', 'profile.name')
      .select('name description category rating images logo contactInfo operatingHours')
      .sort({ score: { $meta: 'textScore' }, 'rating.average': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ZoneShop.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        shops,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNextPage: skip + shops.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  });

  // @desc    Get top-rated shops
  // @route   GET /api/v1/shops/top-rated
  // @access  Public
  static getTopRatedShops = catchAsync(async (req, res) => {
    const { zoneId, limit = 10 } = req.query;

    let query = {
      status: 'active',
      'rating.count': { $gte: 5 } // Only shops with at least 5 ratings
    };

    if (zoneId) {
      query.zoneId = zoneId;
    }

    const shops = await ZoneShop.find(query)
      .populate('zoneId', 'name location')
      .populate('ownerId', 'profile.name')
      .select('name description category rating images logo contactInfo')
      .sort({ 'rating.average': -1, 'rating.count': -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { shops }
    });
  });

  // Helper method to get date filter based on period
  static getDateFilter(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    return startDate;
  }
}

// Validate that all static methods are functions before exporting
const validateController = () => {
  const methods = [
    'getZoneShops', 'getShop', 'createVendor', 'createShop', 'updateShop',
    'deleteShop', 'updateShopStatus', 'uploadImages',
    'getShopStats', 'searchShops', 'getTopRatedShops'
  ];

  methods.forEach(method => {
    if (typeof ZoneShopController[method] !== 'function') {
      console.error(`ZoneShopController.${method} is not a function`);
      throw new Error(`Controller method ${method} is not properly defined`);
    }
  });
};

validateController();

module.exports = ZoneShopController;