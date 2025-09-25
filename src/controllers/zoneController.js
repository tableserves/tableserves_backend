const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { ErrorTypes } = require('../middleware/errorHandler');

class ZoneController {
  // @desc    Get all zones
  // @route   GET /api/zones
  // @access  Private (Admin, Zone Admin)
  static getAllZones = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'zone_admin') {
      query.adminId = req.user.id;
    } else if (req.user.role !== 'admin') {
      throw ErrorTypes.ForbiddenError('Insufficient permissions to view zones');
    }
    
    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }
    
    // Add status filter
    if (status) {
      query.active = status === 'active';
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with population
    const zones = await Zone.find(query)
      .populate('adminId', 'profile.name email phone username lastLogin')
      .populate('subscriptionId', 'planType features limits status')
      .populate('shopsCount')
      .populate('activeShopsCount')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Add login credentials for admin users
    const zonesWithCredentials = zones.map(zone => {
      const zoneObj = zone.toObject();
      
      // Add login credentials if user is admin
      if (req.user.role === 'admin' && zone.adminId) {
        zoneObj.loginCredentials = {
          username: zone.adminId.username || zone.name.toLowerCase().replace(/\s+/g, '_') + '_zone_admin',
          password: '••••••••', // Don't expose actual password
          lastLogin: zone.adminId.lastLogin || null
        };
      }
      
      return zoneObj;
    });
    
    // Get total count for pagination
    const total = await Zone.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        zones: zonesWithCredentials,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNextPage: skip + zonesWithCredentials.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  });

  // @desc    Get single zone
  // @route   GET /api/zones/:id
  // @access  Public for basic info (QR scanning), Private for detailed info
  static getZone = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { includeShops = false } = req.query;
    
    const zone = await Zone.findById(id)
      .populate('adminId', 'profile.name email phone')
      .populate('subscriptionId', 'planType features limits status expiryDate')
      .populate('shopsCount')
      .populate('activeShopsCount');
    
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    // Public access (QR scanning) - return basic zone info
    if (!req.user) {
      const publicZoneData = {
        id: zone._id,
        name: zone.name,
        description: zone.description,
        location: zone.location,
        active: zone.active,
        media: zone.media, // Include media for logo/images display
        settings: {
          operatingHours: zone.settings?.operatingHours || {},
          features: zone.settings?.features || {}
        }
      };
      
      // Include basic shop info for public access if zone is active
      if (zone.active && includeShops === 'true') {
        const shops = await ZoneShop.findByZone(id, { status: 'active' });
        publicZoneData.shops = shops.map(shop => ({
          id: shop._id,
          name: shop.name,
          description: shop.description,
          category: shop.category,
          rating: shop.rating,
          status: shop.status
        }));
      }
      
      return res.status(200).json({
        success: true,
        data: { zone: publicZoneData }
      });
    }
    
    // Private access - check permissions for detailed info
    if (req.user.role === 'zone_admin' && zone.adminId._id.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to this zone');
    }
    
    let responseData = { zone };
    
    // Include shops if requested for authenticated users
    if (includeShops === 'true') {
      const shops = await ZoneShop.findByZone(id, { status: 'active' });
      responseData.shops = shops;
    }
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  });

  // @desc    Create new zone
  // @route   POST /api/zones
  // @access  Private (Admin only)
  static createZone = catchAsync(async (req, res) => {
    if (req.user.role !== 'admin') {
      throw ErrorTypes.ForbiddenError('Only administrators can create zones');
    }
    
    const { adminId, subscriptionId, name, description, location, contactInfo, settings } = req.body;
    
    // Validate admin user exists and has correct role
    const adminUser = await User.findById(adminId);
    if (!adminUser) {
      throw ErrorTypes.NotFoundError('Admin user');
    }
    
    if (adminUser.role !== 'zone_admin') {
      throw ErrorTypes.ValidationError('Selected user must have zone_admin role');
    }
    
    // Validate subscription exists and is for zones
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw ErrorTypes.NotFoundError('Subscription');
    }
    
    if (subscription.planType !== 'zone') {
      throw ErrorTypes.ValidationError('Subscription must be for zone plan type');
    }
    
    if (subscription.status !== 'active') {
      throw ErrorTypes.ValidationError('Subscription must be active');
    }
    
    // Check if admin already has a zone (if business rule requires)
    const existingZone = await Zone.findOne({ adminId, active: true });
    if (existingZone) {
      throw ErrorTypes.ConflictError('Admin user already manages an active zone');
    }
    
    // Create zone
    const zone = new Zone({
      adminId,
      subscriptionId,
      name,
      description,
      location,
      contactInfo,
      settings: {
        ...zone.schema.paths.settings.default(),
        ...settings
      }
    });
    
    await zone.save();
    
    // Populate the response
    await zone.populate('adminId', 'profile.name email phone');
    await zone.populate('subscriptionId', 'planType features limits status');
    
    res.status(201).json({
      success: true,
      data: { zone },
      message: 'Zone created successfully'
    });
  });

  // @desc    Update zone
  // @route   PUT /api/zones/:id
  // @access  Private (Admin, Zone Admin - own zone only)
  static updateZone = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const zone = await Zone.findById(id);
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    // Check permissions
    if (req.user.role === 'zone_admin' && zone.adminId.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to update this zone');
    }
    
    // Prevent certain fields from being updated by zone admins
    if (req.user.role === 'zone_admin') {
      delete updates.adminId;
      delete updates.subscriptionId;
      delete updates.active;
    }
    
    // Validate subscription if being updated
    if (updates.subscriptionId) {
      const subscription = await Subscription.findById(updates.subscriptionId);
      if (!subscription) {
        throw ErrorTypes.NotFoundError('Subscription');
      }
      
      if (subscription.planType !== 'zone') {
        throw ErrorTypes.ValidationError('Subscription must be for zone plan type');
      }
    }
    
    // Handle contactInfo mapping
    if (updates.contactInfo) {
      // If contactInfo structure is provided, sync flat fields for frontend compatibility
      if (updates.contactInfo.phone) {
        updates.ownerPhone = updates.contactInfo.phone;
      }
      if (updates.contactInfo.email) {
        updates.ownerEmail = updates.contactInfo.email;
      }
      
      console.log('📞 ContactInfo structure mapped to flat fields:', {
        contactPhone: updates.contactInfo.phone,
        contactEmail: updates.contactInfo.email,
        flatPhone: updates.ownerPhone,
        flatEmail: updates.ownerEmail
      });
    } else if (updates.ownerPhone || updates.ownerEmail) {
      // If flat fields are provided, create/update contactInfo structure
      const existingContactInfo = zone.contactInfo || {};
      
      updates.contactInfo = {
        ...existingContactInfo,
        phone: updates.ownerPhone || existingContactInfo.phone,
        email: updates.ownerEmail || existingContactInfo.email
      };
      
      console.log('🔄 Flat fields mapped to contactInfo structure:', {
        flatPhone: updates.ownerPhone,
        flatEmail: updates.ownerEmail,
        contactInfoStructure: updates.contactInfo
      });
    }

    // Update zone
    Object.assign(zone, updates);
    await zone.save();
    
    // Populate the response
    await zone.populate('adminId', 'profile.name email phone');
    await zone.populate('subscriptionId', 'planType features limits status');
    
    res.status(200).json({
      success: true,
      data: { zone },
      message: 'Zone updated successfully'
    });
  });

  // @desc    Delete zone
  // @route   DELETE /api/zones/:id
  // @access  Private (Admin only)
  static deleteZone = catchAsync(async (req, res) => {
    if (req.user.role !== 'admin') {
      throw ErrorTypes.ForbiddenError('Only administrators can delete zones');
    }
    
    const { id } = req.params;
    const { permanent = false } = req.query;
    
    const zone = await Zone.findById(id);
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    // Check if zone has active shops
    const activeShopsCount = await ZoneShop.countDocuments({ 
      zoneId: id, 
      status: { $in: ['active', 'pending'] } 
    });
    
    if (activeShopsCount > 0) {
      throw ErrorTypes.ConflictError(
        `Cannot delete zone with ${activeShopsCount} active/pending shops. Please remove or transfer shops first.`
      );
    }
    
    if (permanent === 'true') {
      // Permanent deletion - also delete associated shops
      await ZoneShop.deleteMany({ zoneId: id });
      await Zone.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        message: 'Zone permanently deleted'
      });
    } else {
      // Soft delete - mark as inactive
      zone.active = false;
      await zone.save();
      
      res.status(200).json({
        success: true,
        message: 'Zone deactivated successfully'
      });
    }
  });

  // @desc    Get zone statistics
  // @route   GET /api/zones/:id/stats
  // @access  Private (Admin, Zone Admin - own zone only)
  static getZoneStats = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { period = 'month' } = req.query;
    
    const zone = await Zone.findById(id);
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    // Check permissions
    if (req.user.role === 'zone_admin' && zone.adminId.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to view zone statistics');
    }
    
    // Get shop statistics
    const shopStats = await ZoneShop.getShopStatistics(id);
    
    // Get time-based statistics
    const dateFilter = this.getDateFilter(period);
    
    // Aggregate orders by period (assuming Order model references zoneId)
    const Order = require('../models/Order');
    const orderStats = await Order.aggregate([
      {
        $match: {
          zoneId: zone._id,
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
        zone: {
          id: zone._id,
          name: zone.name,
          isCurrentlyOpen: zone.isCurrentlyOpen()
        },
        overall: {
          ...zone.stats,
          ...shopStats
        },
        period: {
          period,
          ...periodStats,
          completionRate
        }
      }
    });
  });

  // @desc    Toggle zone status
  // @route   PATCH /api/zones/:id/toggle-status
  // @access  Private (Admin, Zone Admin - own zone only)
  static toggleZoneStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const zone = await Zone.findById(id);
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    // Check permissions
    if (req.user.role === 'zone_admin' && zone.adminId.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to modify this zone');
    }
    
    zone.active = !zone.active;
    await zone.save();
    
    res.status(200).json({
      success: true,
      data: { 
        zone: {
          id: zone._id,
          name: zone.name,
          active: zone.active
        }
      },
      message: `Zone ${zone.active ? 'activated' : 'deactivated'} successfully`
    });
  });

  // @desc    Get zones by location
  // @route   GET /api/zones/search/location
  // @access  Public
  static getZonesByLocation = catchAsync(async (req, res) => {
    const { location, radius = 10 } = req.query;
    
    if (!location) {
      throw ErrorTypes.ValidationError('Location parameter is required');
    }
    
    const zones = await Zone.findByLocation(location, radius);
    
    res.status(200).json({
      success: true,
      data: { zones }
    });
  });

  // @desc    Get platform zone statistics
  // @route   GET /api/zones/platform/stats
  // @access  Private (Admin only)
  static getPlatformZoneStats = catchAsync(async (req, res) => {
    if (req.user.role !== 'admin') {
      throw ErrorTypes.ForbiddenError('Admin access required');
    }
    
    const stats = await Zone.getZoneStatistics();
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  });

  // @desc    Get zone vendors (shop owners)
  // @route   GET /api/zones/:id/vendors
  // @access  Private (Admin, Zone Admin - own zone only)
  static getZoneVendors = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const zone = await Zone.findById(id);
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    // Check permissions
    if (req.user.role === 'zone_admin' && zone.adminId.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to view zone vendors');
    }
    
    // Get all shops in the zone with their owners
    const shops = await ZoneShop.find({ zoneId: id })
      .populate({
        path: 'ownerId',
        select: 'profile.name email phone username status lastLogin'
      })
      .select('name status contactInfo');
    
    // Transform data to match frontend expectations
    const vendors = shops.map(shop => ({
      id: shop._id,
      name: shop.name,
      ownerName: shop.ownerId?.profile?.name || 'Unknown',
      ownerPhone: shop.ownerId?.phone || shop.contactInfo?.phone,
      ownerEmail: shop.ownerId?.email || shop.contactInfo?.email,
      status: shop.status,
      loginCredentials: {
        username: shop.ownerId?.username || '',
        password: '••••••••', // Don't expose actual password
        lastLogin: shop.ownerId?.lastLogin || null,
        updatedAt: shop.updatedAt
      }
    }));
    
    res.status(200).json({
      success: true,
      data: vendors
    });
  });

  // @desc    Update vendor credentials
  // @route   PUT /api/zones/:id/vendors/:vendorId
  // @access  Private (Admin, Zone Admin - own zone only)
  static updateVendorCredentials = catchAsync(async (req, res) => {
    const { id, vendorId } = req.params;
    const { loginCredentials } = req.body;
    
    const zone = await Zone.findById(id);
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    // Check permissions
    if (req.user.role === 'zone_admin' && zone.adminId.toString() !== req.user.id) {
      throw ErrorTypes.ForbiddenError('Access denied to update vendor credentials');
    }
    
    // Find the shop and its owner
    const shop = await ZoneShop.findOne({ _id: vendorId, zoneId: id }).populate('ownerId');
    if (!shop) {
      throw ErrorTypes.NotFoundError('Vendor');
    }
    
    // Update user credentials
    const user = await User.findById(shop.ownerId._id);
    if (!user) {
      throw ErrorTypes.NotFoundError('Vendor user');
    }
    
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
      message: 'Vendor credentials updated successfully'
    });
  });

  // @desc    Update zone admin credentials
  // @route   PUT /api/zones/:id/credentials
  // @access  Private (Admin only)
  static updateZoneCredentials = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { loginCredentials } = req.body;
    
    // Only admin can update credentials
    if (req.user.role !== 'admin') {
      throw ErrorTypes.ForbiddenError('Only administrators can update credentials');
    }
    
    const zone = await Zone.findById(id).populate('adminId');
    if (!zone) {
      throw ErrorTypes.NotFoundError('Zone');
    }
    
    const user = await User.findById(zone.adminId._id);
    if (!user) {
      throw ErrorTypes.NotFoundError('Zone admin not found');
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
      message: 'Zone credentials updated successfully'
    });
  });

  // Helper method to get date filter based on period
  static getDateFilter(period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    
    return startDate;
  }
}

module.exports = ZoneController;