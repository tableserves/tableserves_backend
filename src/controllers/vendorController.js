const ZoneShop = require('../models/ZoneShop');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { ErrorTypes } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');

class VendorController {
  // @desc    Get vendors by zone
  // @route   GET /api/v1/vendors?zoneId=:zoneId
  // @access  Private
  static getVendors = catchAsync(async (req, res) => {
    const { zoneId } = req.query;
    
    if (!zoneId) {
      throw ErrorTypes.ValidationError('Zone ID is required');
    }

    const shops = await ZoneShop.find({ zoneId })
      .populate({
        path: 'ownerId',
        select: 'profile.name email phone username status lastLogin'
      })
      .select('name description category status contactInfo logo images');

    const vendors = shops.map(shop => ({
      id: shop._id,
      name: shop.name,
      description: shop.description,
      cuisine: shop.category,
      ownerName: shop.ownerId?.profile?.name || 'Unknown',
      ownerPhone: shop.ownerId?.phone || shop.contactInfo?.phone,
      ownerEmail: shop.ownerId?.email || shop.contactInfo?.email,
      status: shop.status,
      logo: shop.logo?.url,
      coverImage: shop.images?.[0]?.url
    }));

    res.status(200).json({
      success: true,
      data: vendors
    });
  });

  // @desc    Create new vendor
  // @route   POST /api/v1/vendors
  // @access  Private
  static createVendor = catchAsync(async (req, res) => {
    const { zoneId, name, description, cuisine, ownerName, ownerPhone, ownerEmail, status, loginCredentials } = req.body;

    if (!zoneId) {
      throw ErrorTypes.ValidationError('Zone ID is required');
    }

    // Create user for vendor
    const hashedPassword = await bcrypt.hash(loginCredentials.password, 12);
    
    const user = new User({
      username: loginCredentials.username,
      passwordHash: hashedPassword,
      email: ownerEmail,
      phone: ownerPhone,
      role: 'zone_vendor',
      profile: {
        name: ownerName
      },
      status: 'active'
    });

    await user.save();

    // Map cuisine to valid category
    const categoryMap = {
      'chinese': 'chinese',
      'indian': 'indian', 
      'italian': 'italian',
      'mexican': 'mexican',
      'japanese': 'japanese',
      'korean': 'korean',
      'thai': 'thai',
      'american': 'american',
      'mediterranean': 'mediterranean',
      'fast_food': 'fast_food',
      'beverages': 'beverages',
      'desserts': 'desserts',
      'vegetarian': 'vegetarian',
      'vegan': 'vegan',
      'halal': 'halal',
      'bakery': 'bakery',
      'coffee': 'coffee',
      'pizza': 'pizza',
      'burgers': 'burgers'
    };
    
    const validCategory = categoryMap[cuisine?.toLowerCase()] || 'other';

    // Create zone shop
    const shop = new ZoneShop({
      zoneId,
      ownerId: user._id,
      name,
      description,
      category: validCategory,
      status: status || 'active',
      contactInfo: {
        phone: ownerPhone,
        email: ownerEmail
      }
    });

    await shop.save();

    res.status(201).json({
      success: true,
      data: {
        id: shop._id,
        name: shop.name,
        description: shop.description,
        cuisine: shop.category,
        ownerName,
        ownerPhone,
        ownerEmail,
        status: shop.status
      },
      message: 'Vendor created successfully'
    });
  });

  // @desc    Update vendor
  // @route   PUT /api/v1/vendors/:id
  // @access  Private
  static updateVendor = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, description, cuisine, ownerName, ownerPhone, ownerEmail, status } = req.body;

    const shop = await ZoneShop.findById(id).populate('ownerId');
    if (!shop) {
      throw ErrorTypes.NotFoundError('Vendor not found');
    }

    // Update shop
    if (name) shop.name = name;
    if (description) shop.description = description;
    if (cuisine) {
      const categoryMap = {
        'chinese': 'chinese', 'indian': 'indian', 'italian': 'italian',
        'mexican': 'mexican', 'japanese': 'japanese', 'korean': 'korean',
        'thai': 'thai', 'american': 'american', 'mediterranean': 'mediterranean',
        'fast_food': 'fast_food', 'beverages': 'beverages', 'desserts': 'desserts',
        'vegetarian': 'vegetarian', 'vegan': 'vegan', 'halal': 'halal',
        'bakery': 'bakery', 'coffee': 'coffee', 'pizza': 'pizza', 'burgers': 'burgers'
      };
      shop.category = categoryMap[cuisine?.toLowerCase()] || 'other';
    }
    if (status) shop.status = status;
    if (ownerPhone || ownerEmail) {
      shop.contactInfo = {
        phone: ownerPhone || shop.contactInfo?.phone,
        email: ownerEmail || shop.contactInfo?.email
      };
    }

    await shop.save();

    // Update user
    if (shop.ownerId) {
      const user = await User.findById(shop.ownerId._id);
      if (user) {
        if (ownerName) user.profile.name = ownerName;
        if (ownerPhone) user.phone = ownerPhone;
        if (ownerEmail) user.email = ownerEmail;
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully'
    });
  });

  // @desc    Delete vendor
  // @route   DELETE /api/v1/vendors/:id
  // @access  Private
  static deleteVendor = catchAsync(async (req, res) => {
    const { id } = req.params;

    const shop = await ZoneShop.findById(id);
    if (!shop) {
      throw ErrorTypes.NotFoundError('Vendor not found');
    }

    await ZoneShop.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  });
}

module.exports = VendorController;