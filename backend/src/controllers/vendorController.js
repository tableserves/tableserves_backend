const ZoneShop = require('../models/ZoneShop');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { ErrorTypes } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { logger } = require('../utils/logger');

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

    // ---- Input validation (do this first so we never half-create a User) ----
    if (!zoneId) throw ErrorTypes.ValidationError('Zone ID is required');
    if (!name || !name.trim()) throw ErrorTypes.ValidationError('Vendor name is required');
    if (!ownerName || !ownerName.trim()) throw ErrorTypes.ValidationError('Owner name is required');
    if (!ownerEmail || !ownerEmail.trim()) throw ErrorTypes.ValidationError('Owner email is required');
    if (!ownerPhone || !ownerPhone.trim()) throw ErrorTypes.ValidationError('Owner phone is required');
    if (!loginCredentials || !loginCredentials.username || !loginCredentials.password) {
      throw ErrorTypes.ValidationError('Login credentials (username and password) are required');
    }
    if (loginCredentials.password.length < 8) {
      throw ErrorTypes.ValidationError('Password must be at least 8 characters long');
    }

    // Normalise phone: strip spaces/dashes/parens and keep an optional leading +
    const cleanedPhone = String(ownerPhone).replace(/[\s\-\(\)]/g, '');
    if (!/^(\+?[1-9][\d]{9,14})$/.test(cleanedPhone)) {
      throw ErrorTypes.ValidationError('Phone must be 10–15 digits, optionally starting with + (e.g. 9876543210 or +919876543210)');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      throw ErrorTypes.ValidationError('Please provide a valid email address');
    }

    // ---- Pre-flight duplicate check to give a clearer error than E11000 ----
    const dupeUser = await User.findOne({
      $or: [
        { email: ownerEmail.toLowerCase().trim() },
        { phone: cleanedPhone },
        { username: loginCredentials.username }
      ]
    }).select('email phone username').lean();
    if (dupeUser) {
      let conflictField = 'value';
      if (dupeUser.email === ownerEmail.toLowerCase().trim()) conflictField = 'email';
      else if (dupeUser.phone === cleanedPhone) conflictField = 'phone number';
      else if (dupeUser.username === loginCredentials.username) conflictField = 'username';
      throw ErrorTypes.ValidationError(`A user with this ${conflictField} already exists. Please use a different ${conflictField}.`);
    }

    // ---- Create the user ----
    const hashedPassword = await bcrypt.hash(loginCredentials.password, 12);

    const user = new User({
      username: loginCredentials.username,
      passwordHash: hashedPassword,
      email: ownerEmail.toLowerCase().trim(),
      phone: cleanedPhone,
      role: 'zone_vendor',
      profile: {
        name: ownerName
      },
      status: 'active'
    });

    await user.save();

    // ---- Map cuisine to a valid ZoneShop category ----
    const categoryMap = {
      'chinese': 'chinese', 'indian': 'indian', 'italian': 'italian',
      'mexican': 'mexican', 'japanese': 'japanese', 'korean': 'korean',
      'thai': 'thai', 'american': 'american', 'mediterranean': 'mediterranean',
      'fast_food': 'fast_food', 'beverages': 'beverages', 'desserts': 'desserts',
      'vegetarian': 'vegetarian', 'vegan': 'vegan', 'halal': 'halal',
      'bakery': 'bakery', 'coffee': 'coffee', 'pizza': 'pizza', 'burgers': 'burgers'
    };
    const validCategory = categoryMap[cuisine?.toLowerCase()] || 'other';

    // ---- Create the zone shop. If THIS fails, we must roll back the user we just saved,
    //      otherwise an orphan User stays in the DB and the user can never use that
    //      email/phone/username again (next create attempt → E11000 → looks like a 500).
    try {
      const shop = new ZoneShop({
        zoneId,
        ownerId: user._id,
        name,
        description,
        category: validCategory,
        status: status || 'active',
        contactInfo: {
          phone: cleanedPhone,
          email: ownerEmail.toLowerCase().trim()
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
          ownerPhone: cleanedPhone,
          ownerEmail,
          status: shop.status
        },
        message: 'Vendor created successfully'
      });
    } catch (shopErr) {
      // Roll back the User we just saved so the operation is atomic from the user's POV
      try {
        await User.deleteOne({ _id: user._id });
      } catch (rollbackErr) {
        logger.error('Failed to roll back orphan user after ZoneShop save failure:', rollbackErr.message);
      }
      throw shopErr; // let the global error handler translate Mongoose validation/duplicate errors
    }
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