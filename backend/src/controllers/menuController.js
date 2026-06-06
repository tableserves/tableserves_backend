const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const Modifier = require('../models/Modifier');
const Variant = require('../models/Variant');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const Upload = require('../models/Upload');
const {APIError} = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const { UploadService } = require('../services/uploadService');
const SubscriptionService = require('../services/subscriptionService');
// utils/logger.js exports { logger, loggerUtils, checkLoggerHealth }.
// We MUST destructure here — `require('../utils/logger').error` is undefined,
// which previously caused unhandled TypeError crashes inside our setImmediate callbacks
// (those run outside catchAsync's promise chain, so the error became an Unhandled Rejection).
const { logger } = require('../utils/logger');

class MenuController {
  // Helper method to check owner permissions
  static async checkOwnerPermissions(req, ownerType, ownerId) {
    if (req.user.role === 'admin') {
      return;
    }

    let owner;
    switch (ownerType) {
      case 'restaurant':
        owner = await Restaurant.findOne({ _id: ownerId, ownerId: req.user.id });
        break;
      case 'zone':
        if (req.user.role === 'zone_admin' && req.user.zoneId && req.user.zoneId.toString() === ownerId) {
          return;
        }
        owner = await Zone.findOne({ _id: ownerId, ownerId: req.user.id });
        break;
      case 'shop':
        if (['zone_shop', 'zone_vendor'].includes(req.user.role)) {
          if (req.user.shopId && req.user.shopId.toString() === ownerId) {
            return;
          }
        }

        if (req.user.role === 'zone_admin') {
          const shop = await ZoneShop.findById(ownerId);
          if (shop) {
            if (req.user.zoneId && req.user.zoneId.toString() === shop.zoneId.toString()) {
              return;
            }

            const zone = await Zone.findOne({
              _id: shop.zoneId,
              $or: [
                { adminId: req.user.id },
                { ownerId: req.user.id }
              ]
            });

            if (zone) {
              return;
            }
          }
        }

        owner = await ZoneShop.findOne({
          _id: ownerId,
          $or: [
            { ownerId: req.user.id },
            { _id: req.user.shopId }
          ]
        });
        break;
      default:
        throw new Error('Invalid owner type');
    }

    if (!owner) {
      throw new APIError('You do not have permission to access this resource', 403);
    }
  }

  // Public Methods
  static getPublicModifiers = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    
    // Build query based on owner type
    let query = {};
    switch (ownerType) {
      case 'restaurant':
        query.restaurantId = ownerId;
        break;
      case 'zone':
        query.zoneId = ownerId;
        break;
      case 'shop':
        query.shopId = ownerId;
        break;
      default:
        throw new APIError('Invalid owner type', 400);
    }
    
    const modifiers = await Modifier.find(query).sort('name');

    const transformedModifiers = modifiers.map(modifier => ({
      id: modifier._id,
      name: modifier.name,
      type: modifier.type,
      required: modifier.required,
      options: modifier.options,
      minSelections: modifier.minSelections,
      maxSelections: modifier.maxSelections,
      menuItems: modifier.menuItems,
      createdAt: modifier.createdAt,
      updatedAt: modifier.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: transformedModifiers
    });
  });

  static getPublicMenu = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    
    // Special handling for zone menus - aggregate from all shops in the zone
    if (ownerType === 'zone') {
      return this.getZoneAggregatedMenu(req, res);
    }
    
    const query = { active: true };
    
    switch (ownerType) {
      case 'restaurant':
        query.restaurantId = ownerId;
        break;
      case 'shop':
        query.shopId = ownerId;
        break;
      default:
        throw new APIError('Invalid owner type', 400);
    }

    const categories = await MenuCategory.find(query)
      .sort('sortOrder')
      .lean();

    // Get all menu items for these categories (including out-of-stock)
    const menuItems = await MenuItem.find({
      categoryId: { $in: categories.map(cat => cat._id) }
    })
      .populate('categoryId', 'name')
      .populate('shopId', 'name')
      .sort('name')
      .lean();

    // Transform categories with their items
    const transformedCategories = categories.map(category => ({
      id: category._id,
      name: category.name,
      description: category.description,
          items: menuItems
        .filter(item => item.categoryId._id.toString() === category._id.toString())
        .map(item => ({
          id: item._id,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.images?.[0]?.url || item.imageUrl || item.image || null,
          category: category.name,
          categoryName: category.name,
          shopId: item.shopId?._id || item.shopId,
          shopName: item.shopId?.name || 'Unknown Shop',
          available: item.available,
          isVeg: item.isVeg || false,
          isSpicy: item.isSpicy || false,
          tags: item.tags || []
        }))
    }));

    res.status(200).json({
      success: true,
      data: { categories: transformedCategories }
    });
  });

  // Zone-specific menu aggregation from all shops in the zone
  static getZoneAggregatedMenu = catchAsync(async (req, res) => {
    const { ownerId: zoneId } = req.params;

    // First, verify the zone exists
    const zone = await Zone.findById(zoneId);
    if (!zone) {
      throw new APIError('Zone not found', 404);
    }
    
    // Get all active shops in the zone
    const shops = await ZoneShop.find({ zoneId, status: 'active' }).lean();

    if (shops.length === 0) {
      return res.status(200).json({
        success: true,
        data: { categories: [] },
        message: 'No active shops found in this zone'
      });
    }
    
    const shopIds = shops.map(shop => shop._id);
    
    // Get all active categories from shops in this zone
    const categories = await MenuCategory.find({
      shopId: { $in: shopIds },
      active: true
    })
      .populate('shopId', 'name')
      .sort('sortOrder')
      .lean();
    
    // Get all available menu items for these categories
    const menuItems = await MenuItem.find({
      categoryId: { $in: categories.map(cat => cat._id) },
      available: true
    })
      .populate('categoryId', 'name')
      .populate('shopId', 'name')
      .sort('name')
      .lean();
    
    // Group categories by name and aggregate items from different shops
    const categoryMap = new Map();
    
    categories.forEach(category => {
      const categoryName = category.name;
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          id: category._id.toString(),
          name: category.name,
          description: category.description,
          items: [],
          shopCount: 0,
          shops: new Set()
        });
      }
      
      const categoryData = categoryMap.get(categoryName);
      categoryData.shops.add(category.shopId?.name || 'Unknown Shop');
      categoryData.shopCount = categoryData.shops.size;
    });
    
    // Add items to their respective categories
    menuItems.forEach(item => {
      const categoryName = item.categoryId?.name;
      if (categoryMap.has(categoryName)) {
        const categoryData = categoryMap.get(categoryName);
        categoryData.items.push({
          id: item._id,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.images?.[0]?.url || item.imageUrl || item.image || null,
          category: categoryName,
          categoryName: categoryName,
          shopId: item.shopId?._id || item.shopId,
          shopName: item.shopId?.name || 'Unknown Shop',
          available: item.available,
          tags: item.tags || []
        });
      }
    });
    
    // Convert map to array and clean up shops set
    const transformedCategories = Array.from(categoryMap.values()).map(category => ({
      ...category,
      shops: Array.from(category.shops)
    }));
    
    res.status(200).json({
      success: true,
      data: { 
        categories: transformedCategories,
        zone: {
          id: zone._id,
          name: zone.name,
          location: zone.location
        },
        shopCount: shops.length
      }
    });
  });

  static getPublicMenuItem = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const item = await MenuItem.findOne({
      _id: itemId,
      status: 'active'
    }).populate('categoryId', 'name description');

    if (!item) {
      throw new APIError('Menu item not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { item }
    });
  });

  // Category Methods
  // @desc    Create new menu category
  // @route   POST /api/menu/:ownerType/:ownerId/categories
  // @access  Private
  // NOTE: The canonical createCategory implementation lives further down in this file
  // (search for `static createCategory = catchAsync` again). An earlier version used to
  // live here too, which meant JavaScript silently overrode this one with the later
  // definition — dead code that just made the file confusing. Removed to leave a single
  // source of truth.

  static getCategories = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    // Set a higher default limit and allow unlimited for admin users
    const defaultLimit = req.user?.role === 'admin' ? 1000 : 100;
    const { page = 1, limit = defaultLimit, search } = req.query;
    const skip = (page - 1) * limit;

    // Check permissions only if user is authenticated
    if (req.user) {
      await this.checkOwnerPermissions(req, ownerType, ownerId);
    }

    const query = { [`${ownerType}Id`]: ownerId };
    
    // For public access, only show active categories
    if (!req.user) {
      query.active = true;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [categories, total] = await Promise.all([
      MenuCategory.find(query)
        .sort('sortOrder')
        .skip(skip)
        .limit(parseInt(limit)),
      MenuCategory.countDocuments(query)
    ]);

    // Transform categories to match frontend expectations
    const transformedCategories = categories.map(category => ({
      id: category._id,
      name: category.name,
      description: category.description,
      isActive: category.active,
      sortOrder: category.sortOrder,
      settings: category.settings,
      tags: category.tags,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: transformedCategories.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transformedCategories
    });
  });

  static updateCategory = catchAsync(async (req, res) => {
    const { ownerType, ownerId, categoryId } = req.params;
    const { name, description, sortOrder, settings, availability, tags, isActive } = req.body;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) {
      updateData.active = isActive;
      updateData.settings = {
        ...settings,
        showInMenu: isActive
      };
    }
    if (availability !== undefined) updateData.availability = availability;
    if (tags !== undefined) updateData.tags = tags;

    const category = await MenuCategory.findOneAndUpdate(
      { _id: categoryId, [`${ownerType}Id`]: ownerId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      throw new APIError('Category not found', 404);
    }

    // Transform response to match frontend expectations
    const responseCategory = {
      id: category._id,
      name: category.name,
      description: category.description,
      isActive: category.active,
      sortOrder: category.sortOrder,
      settings: category.settings,
      tags: category.tags,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };

    res.status(200).json({
      success: true,
      data: responseCategory,
      message: 'Category updated successfully'
    });
  });

  static deleteCategory = catchAsync(async (req, res) => {
    const { ownerType, ownerId, categoryId } = req.params;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Check if category has items
    const itemCount = await MenuItem.countDocuments({ categoryId });
    if (itemCount > 0) {
      throw new APIError('Cannot delete category with existing menu items', 400);
    }

    const category = await MenuCategory.findOneAndDelete({
      _id: categoryId,
      [`${ownerType}Id`]: ownerId
    });

    if (!category) {
      throw new APIError('Category not found', 404);
    }

    // Send success response first; usage counter update is a fire-and-forget side effect.
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });

    setImmediate(async () => {
      try {
        await MenuController.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'categories', -1);
      } catch (usageError) {
        logger.error('Failed to update subscription usage after category deletion:', {
          error: usageError.message,
          categoryId,
          userId: req.user.id,
          ownerType,
          ownerId
        });
      }
    });
  });

  // Item Methods
  static getItems = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    // Set a higher default limit and allow unlimited for admin users
    const defaultLimit = req.user?.role === 'admin' ? 1000 : 100;
    const { page = 1, limit = defaultLimit, categoryId, search } = req.query;
    const skip = (page - 1) * limit;

    // Check permissions only if user is authenticated
    if (req.user) {
      await this.checkOwnerPermissions(req, ownerType, ownerId);
    }

    const query = { [`${ownerType}Id`]: ownerId };

    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const [items, total] = await Promise.all([
      MenuItem.find(query)
        .populate('categoryId', 'name')
        .sort('name')
        .skip(skip)
        .limit(parseInt(limit)),
      MenuItem.countDocuments(query)
    ]);

    // Transform items to match frontend expectations
    const transformedItems = items.map(item => ({
      id: item._id,
      categoryId: item.categoryId._id || item.categoryId,
      categoryName: item.categoryId?.name || 'Unknown Category',
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.images?.[0]?.url || item.imageUrl || item.image || null,
      available: item.available,
      isVeg: item.isVeg || false,
      isSpicy: item.isSpicy || false,
      tags: item.tags,
      modifiers: item.modifiers,
      shopId: item.shopId,
      shopName: item.shopName || 'Unknown Shop',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: transformedItems.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transformedItems
    });
  });

  static getItem = catchAsync(async (req, res) => {
    const { ownerType, ownerId, itemId } = req.params;
    
    const item = await MenuItem.findOne({
      _id: itemId,
      [`${ownerType}Id`]: ownerId
    }).populate('categoryId', 'name description');

    if (!item) {
      throw new APIError('Menu item not found', 404);
    }

    // Transform item to match frontend expectations
    const transformedItem = {
      id: item._id,
      categoryId: item.categoryId._id || item.categoryId,
      categoryName: item.categoryId?.name || 'Unknown Category',
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.images?.[0]?.url || item.imageUrl || item.image || null,
      available: item.available,
      isVeg: item.isVeg || false,
      isSpicy: item.isSpicy || false,
      tags: item.tags,
      modifiers: item.modifiers,
      shopId: item.shopId,
      shopName: item.shopName || 'Unknown Shop',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    res.status(200).json({
      success: true,
      data: { item: transformedItem }
    });
  });

  static updateItem = catchAsync(async (req, res) => {
    const { ownerType, ownerId, itemId } = req.params;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Transform image field to images array format if provided
    const updateData = { ...req.body };
    delete updateData.dietaryInfo;
    
    if (updateData.image !== undefined) {
      if (updateData.image && updateData.image !== 'null' && updateData.image.trim()) {
        // Extract publicId from Cloudinary URL or use a generated one
        const publicId = updateData.image.includes('cloudinary.com') 
          ? updateData.image.split('/').pop().split('.')[0] 
          : `menu_item_${Date.now()}`;
        
        updateData.images = [{ url: updateData.image.trim(), publicId, isPrimary: true }];
      } else {
        updateData.images = [];
      }
      delete updateData.image; // Remove the image field as we're using images array
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: itemId, [`${ownerType}Id`]: ownerId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      throw new APIError('Menu item not found', 404);
    }

    // Transform item to match frontend expectations
    const transformedItem = {
      id: item._id,
      categoryId: item.categoryId._id || item.categoryId,
      categoryName: item.categoryId?.name || 'Unknown Category',
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.images?.[0]?.url || item.imageUrl || item.image || null,
      available: item.available,
      isVeg: item.isVeg || false,
      isSpicy: item.isSpicy || false,
      tags: item.tags,
      modifiers: item.modifiers,
      shopId: item.shopId,
      shopName: item.shopName || 'Unknown Shop',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    res.status(200).json({
      success: true,
      data: { item: transformedItem },
      message: 'Menu item updated successfully'
    });
  });

  static deleteItem = catchAsync(async (req, res) => {
    const { ownerType, ownerId, itemId } = req.params;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const item = await MenuItem.findOneAndDelete({
      _id: itemId,
      [`${ownerType}Id`]: ownerId
    });

    if (!item) {
      throw new APIError('Menu item not found', 404);
    }

    // Send success response first; usage counter update is a fire-and-forget side effect.
    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });

    setImmediate(async () => {
      try {
        await MenuController.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'menuItems', -1);
      } catch (usageError) {
        logger.error('Failed to update subscription usage after menu item deletion:', {
          error: usageError.message,
          itemId,
          userId: req.user.id,
          ownerType,
          ownerId
        });
      }
    });
  });

  static toggleItemStatus = catchAsync(async (req, res) => {
    const { ownerType, ownerId, itemId } = req.params;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const item = await MenuItem.findOne({
      _id: itemId,
      [`${ownerType}Id`]: ownerId
    });

    if (!item) {
      throw new APIError('Menu item not found', 404);
    }

    item.status = item.status === 'active' ? 'inactive' : 'active';
    await item.save();

    res.status(200).json({
      success: true,
      data: { status: item.status },
      message: `Menu item ${item.status === 'active' ? 'activated' : 'deactivated'} successfully`
    });
  });

  /**
   * Delete a specific image from a menu item
   */
  static deleteItemImage = catchAsync(async (req, res) => {
    const { ownerType, ownerId, itemId, imageId } = req.params;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const item = await MenuItem.findOne({
      _id: itemId,
      [`${ownerType}Id`]: ownerId
    });

    if (!item) {
      throw new APIError('Menu item not found', 404);
    }

    // Find the image to delete
    const imageIndex = item.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      throw new APIError('Image not found', 404);
    }

    const imageToDelete = item.images[imageIndex];
    
    try {
      // Remove from storage if publicId exists
      if (imageToDelete.publicId) {
        await UploadService.destroyImage(imageToDelete.publicId);
      }
      
      // Remove from the images array
      item.images.splice(imageIndex, 1);
      
      // If we deleted the primary image and there are other images, set the first one as primary
      if (imageToDelete.isPrimary && item.images.length > 0) {
        item.images[0].isPrimary = true;
      }
      
      await item.save();
      
      // Delete from uploads collection
      await Upload.findOneAndDelete({ publicId: imageToDelete.publicId });
      
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
      
    } catch (error) {
      logger.error('Error deleting menu item image:', error);
      throw new APIError('Failed to delete image', 500);
    }
  });

  // Modifier Methods
  static getModifiers = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Build query based on owner type
    let query = {};
    switch (ownerType) {
      case 'restaurant':
        query.restaurantId = ownerId;
        break;
      case 'zone':
        query.zoneId = ownerId;
        break;
      case 'shop':
        query.shopId = ownerId;
        break;
      default:
        throw new APIError('Invalid owner type', 400);
    }
    
    const [modifiers, total] = await Promise.all([
      Modifier.find(query)
        .sort('name')
        .skip(skip)
        .limit(parseInt(limit)),
      Modifier.countDocuments(query)
    ]);

    const transformedModifiers = modifiers.map(modifier => ({
      id: modifier._id,
      name: modifier.name,
      type: modifier.type,
      required: modifier.required,
      options: modifier.options,
      minSelections: modifier.minSelections,
      maxSelections: modifier.maxSelections,
      menuItems: modifier.menuItems,
      createdAt: modifier.createdAt,
      updatedAt: modifier.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: transformedModifiers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transformedModifiers
    });
  });

  static createModifier = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { name, type, required, options, minSelections, maxSelections, menuItems } = req.body;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Clean options to only include allowed fields
    const cleanOptions = options ? options.map(option => ({
      name: option.name,
      price: option.price,
      available: option.available !== undefined ? option.available : true
    })) : [];

    const modifierData = {
      name,
      type: type || 'single',
      required: required || false,
      options: cleanOptions,
      minSelections: minSelections || 0,
      maxSelections: maxSelections || 1,
      menuItems: menuItems || []
    };

    // Set the appropriate owner ID based on ownerType
    switch (ownerType) {
      case 'restaurant':
        modifierData.restaurantId = ownerId;
        break;
      case 'zone':
        modifierData.zoneId = ownerId;
        break;
      case 'shop':
        // For shop modifiers, only set shopId to maintain single ownership
        modifierData.shopId = ownerId;
        break;
    }

    try {
      const modifier = new Modifier(modifierData);
      const savedModifier = await modifier.save();

      const responseModifier = {
        id: savedModifier._id,
        name: savedModifier.name,
        type: savedModifier.type,
        required: savedModifier.required,
        options: savedModifier.options,
        minSelections: savedModifier.minSelections,
        maxSelections: savedModifier.maxSelections,
        menuItems: savedModifier.menuItems,
        createdAt: savedModifier.createdAt,
        updatedAt: savedModifier.updatedAt
      };

      res.status(201).json({
        success: true,
        data: responseModifier,
        message: 'Modifier created successfully'
      });
    } catch (saveError) {
      logger.error('Modifier save error details:', {
        name: saveError.name,
        message: saveError.message,
        errors: saveError.errors,
        stack: saveError.stack
      });
      
      // Re-throw to be handled by catchAsync
      throw saveError;
    }
  });

  static updateModifier = catchAsync(async (req, res) => {
    const { ownerType, ownerId, modifierId } = req.params;
    const { name, type, required, options, minSelections, maxSelections, menuItems } = req.body;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Build query based on owner type
    let query = { _id: modifierId };
    switch (ownerType) {
      case 'restaurant':
        query.restaurantId = ownerId;
        break;
      case 'zone':
        query.zoneId = ownerId;
        break;
      case 'shop':
        query.shopId = ownerId;
        break;
      default:
        throw new APIError('Invalid owner type', 400);
    }

    const modifier = await Modifier.findOneAndUpdate(
      query,
      {
        name,
        type,
        required,
        options,
        minSelections,
        maxSelections,
        menuItems
      },
      { new: true, runValidators: true }
    );

    if (!modifier) {
      throw new APIError('Modifier not found', 404);
    }

    const responseModifier = {
      id: modifier._id,
      name: modifier.name,
      type: modifier.type,
      required: modifier.required,
      options: modifier.options,
      minSelections: modifier.minSelections,
      maxSelections: modifier.maxSelections,
      menuItems: modifier.menuItems,
      createdAt: modifier.createdAt,
      updatedAt: modifier.updatedAt
    };

    res.status(200).json({
      success: true,
      data: responseModifier,
      message: 'Modifier updated successfully'
    });
  });

  static deleteModifier = catchAsync(async (req, res) => {
    const { ownerType, ownerId, modifierId } = req.params;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Build query based on owner type
    let query = { _id: modifierId };
    switch (ownerType) {
      case 'restaurant':
        query.restaurantId = ownerId;
        break;
      case 'zone':
        query.zoneId = ownerId;
        break;
      case 'shop':
        query.shopId = ownerId;
        break;
      default:
        throw new APIError('Invalid owner type', 400);
    }

    const modifier = await Modifier.findOneAndDelete(query);

    if (!modifier) {
      throw new APIError('Modifier not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Modifier deleted successfully'
    });
  });

  static getMenuStructure = catchAsync(async (req, res) => {
    res.status(501).json({ message: 'Not Implemented' });
  });

  static updateMenuStructure = catchAsync(async (req, res) => {
    res.status(501).json({ message: 'Not Implemented' });
  });

  // @desc    Create new category
  // @route   POST /api/menu/:ownerType/:ownerId/categories
  // @access  Private
  static createCategory = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { name, description, sortOrder, settings, availability, tags, isActive } = req.body;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Plan limits for categories are enforced PER OWNER (restaurant/zone/shop) by the
    // PlanValidationMiddleware.checkCategoryCreationLimit() middleware that runs before
    // this controller — see menusRoutes.js.
    //
    // We intentionally do NOT call SubscriptionService.checkSubscriptionLimits('create_category')
    // here, because:
    //   1. It counts categories GLOBALLY by user instead of per owner.
    //   2. For `zone_shop` / `zone_vendor` users, `User.subscription` is null (their
    //      subscription belongs to the zone admin), so the call returned
    //      `{ allowed: false, reason: 'No subscription found' }` and threw 403 — which
    //      manifested as a 500 (or "Failed to create category") on the zone shop side
    //      while the restaurant side worked fine.
    // The middleware uses PlanValidationMiddleware.getUserPlan(), which correctly walks
    // up to the zone admin's plan for shop/vendor users.

    const categoryData = {
      name,
      description,
      sortOrder: sortOrder || 0,
      settings: {
        showInMenu: isActive !== false,
        allowCustomization: true,
        ...settings
      },
      availability,
      tags: tags || [],
      active: isActive !== false
    };

    switch (ownerType) {
      case 'restaurant':
        categoryData.restaurantId = ownerId;
        break;
      case 'zone':
        categoryData.zoneId = ownerId;
        break;
      case 'shop':
        categoryData.shopId = ownerId;
        // For shop categories, we don't need to set zoneId as it would violate the ownership validation
        // The shopId is sufficient to identify the owner
        break;
    }

    try {
      const category = new MenuCategory(categoryData);
      await category.save();

      // Transform response to match frontend expectations
      const responseCategory = {
        id: category._id,
        name: category.name,
        description: category.description,
        isActive: category.active,
        sortOrder: category.sortOrder,
        settings: category.settings,
        tags: category.tags,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      };

      // Send success response immediately
      res.status(201).json({
        success: true,
        data: responseCategory,
        message: 'Category created successfully'
      });

      // Update subscription usage counts in the background — fire-and-forget.
      // Use the explicit class reference (not `this`) so the binding is stable inside setImmediate.
      setImmediate(async () => {
        try {
          await MenuController.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'categories', 1);
        } catch (usageError) {
          logger.error('Failed to update subscription usage after category creation:', {
            error: usageError.message,
            categoryId: category._id,
            userId: req.user.id,
            ownerType,
            ownerId
          });
        }
      });

    } catch (saveError) {
      logger.error('Failed to create menu category:', {
        error: saveError.message,
        stack: saveError.stack,
        categoryData,
        userId: req.user.id,
        ownerType,
        ownerId
      });
      throw saveError;
    }
  });

  // @desc    Create new menu item
  // @route   POST /api/menu/:ownerType/:ownerId/items
  // @access  Private
  static createItem = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { categoryId, name, description, price, image, available, isVeg, isSpicy, tags, modifiers } = req.body;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const category = await MenuCategory.findOne({
      _id: categoryId,
      [`${ownerType}Id`]: ownerId
    });

    if (!category) {
      throw new APIError('Category not found or does not belong to this owner', 404);
    }

    // Plan limits are enforced PER CATEGORY by the PlanValidationMiddleware.checkMenuItemCreationLimit()
    // middleware that runs before this controller (see menusRoutes.js).
    //
    // We intentionally do NOT call SubscriptionService.checkSubscriptionLimits('create_menu_item')
    // here, because that compares the GLOBAL menu item count against `maxMenuItems`, but
    // `maxMenuItems` is a PER-CATEGORY limit. Doing so would incorrectly block creation as soon
    // as the user's total items across all categories reaches the limit, even if the target
    // category still has room.

    const itemData = {
      categoryId,
      name,
      description,
      price,
      available: available !== false,
      isVeg: isVeg || false,
      isSpicy: isSpicy || false,
      tags: tags || [],
      modifiers: modifiers || []
    };

    if (image && image !== 'null' && image.trim()) {
      // Extract publicId from Cloudinary URL or use a generated one
      const publicId = image.includes('cloudinary.com') 
        ? image.split('/').pop().split('.')[0] 
        : `menu_item_${Date.now()}`;
      
      itemData.images = [{ url: image.trim(), publicId, isPrimary: true }];
    }

    switch (ownerType) {
      case 'restaurant':
        itemData.restaurantId = ownerId;
        break;
      case 'zone':
        itemData.zoneId = ownerId;
        break;
      case 'shop':
        itemData.shopId = ownerId;
        // For shop items, we don't need to set zoneId as it would violate the ownership validation
        // The shopId is sufficient to identify the owner
        break;
    }

    const item = new MenuItem(itemData);
    await item.save();

    // Build the response BEFORE doing anything else that can fail.
    const responseItem = {
      id: item._id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.images?.[0]?.url || item.imageUrl || item.image || null,
      available: item.available,
      isVeg: item.isVeg || false,
      isSpicy: item.isSpicy || false,
      tags: item.tags,
      modifiers: item.modifiers,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    // Send the success response IMMEDIATELY — the item is already saved, so the user
    // should see success. If subscription-usage bookkeeping fails afterwards, that
    // shouldn't surface as a 500 to the user (this is exactly the bug the user reported:
    // "category/item is in DB after refresh but the modal showed an error on submit").
    res.status(201).json({
      success: true,
      data: responseItem,
      message: 'Menu item created successfully'
    });

    // Update subscription usage counts in the background — fire-and-forget.
    // Errors here are logged but never propagate to the client.
    setImmediate(async () => {
      try {
        await MenuController.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'menuItems', 1);
      } catch (usageError) {
        logger.error('Failed to update subscription usage after menu item creation:', {
          error: usageError.message,
          itemId: item._id,
          userId: req.user.id,
          ownerType,
          ownerId
        });
      }
    });
  });

  // @desc    Upload item images
  // @route   POST /api/menu/:ownerType/:ownerId/items/:itemId/upload
  // @access  Private
  static uploadItemImages = catchAsync(async (req, res) => {
    const { ownerType, ownerId, itemId } = req.params;
    const { setPrimary = false } = req.body;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const item = await MenuItem.findOne({
      _id: itemId,
      [`${ownerType}Id`]: ownerId
    });

    if (!item) {
      throw new APIError('Menu item not found', 404);
    }

    if (!req.files || req.files.length === 0) {
      throw new APIError('No images provided', 400);
    }

    const totalImages = item.images.length + req.files.length;
    if (totalImages > 5) {
      throw new APIError('Maximum 5 images allowed per menu item', 400);
    }

    try {
      const uploadResults = await UploadService.uploadMultipleImages(req.files, {
        folder: `tableserve/${ownerType}s/${ownerId}/menu/${itemId}`
      });

      const newImages = uploadResults.map((result, index) => ({
        url: result.url,
        publicId: result.publicId,
        caption: '',
        isPrimary: setPrimary === 'true' && index === 0 && item.images.length === 0
      }));

      if (setPrimary === 'true') {
        item.images.forEach(img => img.isPrimary = false);
      }

      item.images.push(...newImages);
      await item.save();

      const uploads = uploadResults.map(result => ({
        userId: req.user.id,
        ownerType,
        ownerId,
        fileSize: result.bytes,
        publicId: result.public_id,
        url: result.url,
      }));
      await Upload.insertMany(uploads);

      res.status(200).json({
        success: true,
        data: { images: newImages },
        message: 'Images uploaded successfully'
      });

    } catch (error) {
      throw new APIError('Image upload failed: ' + error.message, 400);
    }
  });

  // ===== VARIANT METHODS =====

  // Public Variants
  static getPublicVariants = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    
    // Build query based on owner type
    let query = {};
    switch (ownerType) {
      case 'restaurant':
        query.restaurantId = ownerId;
        break;
      case 'zone':
        query.zoneId = ownerId;
        break;
      case 'shop':
        query.shopId = ownerId;
        break;
      default:
        throw new APIError('Invalid owner type', 400);
    }
    
    const Variant = require('../models/Variant');
    const variants = await Variant.find(query).sort('name');

    const transformedVariants = variants.map(variant => ({
      id: variant._id,
      name: variant.name,
      type: variant.type,
      required: variant.required,
      options: variant.options,
      minSelections: variant.minSelections,
      maxSelections: variant.maxSelections,
      menuItems: variant.menuItems,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: transformedVariants
    });
  });

  // Get Variants (Protected)
  static getVariants = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Build query based on owner type
    let query = {};
    switch (ownerType) {
      case 'restaurant':
        query.restaurantId = ownerId;
        break;
      case 'zone':
        query.zoneId = ownerId;
        break;
      case 'shop':
        query.shopId = ownerId;
        break;
      default:
        throw new APIError('Invalid owner type', 400);
    }
    
    const Variant = require('../models/Variant');
    const [variants, total] = await Promise.all([
      Variant.find(query)
        .sort('name')
        .skip(skip)
        .limit(parseInt(limit)),
      Variant.countDocuments(query)
    ]);

    const transformedVariants = variants.map(variant => ({
      id: variant._id,
      name: variant.name,
      type: variant.type,
      required: variant.required,
      options: variant.options,
      minSelections: variant.minSelections,
      maxSelections: variant.maxSelections,
      menuItems: variant.menuItems,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: transformedVariants.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transformedVariants
    });
  });

  // Create Variant
  static createVariant = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { name, type, required, options, minSelections, maxSelections, menuItems } = req.body;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Clean options to only include allowed fields
    const cleanOptions = options ? options.map(option => ({
      name: option.name,
      price: option.price,
      available: option.available !== undefined ? option.available : true,
      isDefault: option.isDefault || false
    })) : [];

    const Variant = require('../models/Variant');
    const variantData = {
      name,
      type: type || 'single',
      required: required !== undefined ? required : true, // Variants are typically required
      options: cleanOptions,
      minSelections: minSelections || 1,
      maxSelections: maxSelections || 1,
      menuItems: menuItems || []
    };

    // Set the appropriate owner ID based on ownerType
    switch (ownerType) {
      case 'restaurant':
        variantData.restaurantId = ownerId;
        break;
      case 'zone':
        variantData.zoneId = ownerId;
        break;
      case 'shop':
        variantData.shopId = ownerId;
        break;
    }

    try {
      const variant = new Variant(variantData);
      const savedVariant = await variant.save();

      const responseVariant = {
        id: savedVariant._id,
        name: savedVariant.name,
        type: savedVariant.type,
        required: savedVariant.required,
        options: savedVariant.options,
        minSelections: savedVariant.minSelections,
        maxSelections: savedVariant.maxSelections,
        menuItems: savedVariant.menuItems,
        createdAt: savedVariant.createdAt,
        updatedAt: savedVariant.updatedAt
      };

      res.status(201).json({
        success: true,
        data: responseVariant,
        message: 'Variant created successfully'
      });
    } catch (error) {
      logger.error('Error creating variant:', error);
      throw new APIError(error.message || 'Failed to create variant', 500);
    }
  });

  // Update Variant
  static updateVariant = catchAsync(async (req, res) => {
    const { ownerType, ownerId, variantId } = req.params;
    const { name, type, required, options, minSelections, maxSelections, menuItems } = req.body;

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Clean options to only include allowed fields
    const cleanOptions = options ? options.map(option => ({
      name: option.name,
      price: option.price,
      available: option.available !== undefined ? option.available : true,
      isDefault: option.isDefault || false
    })) : undefined;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (required !== undefined) updateData.required = required;
    if (cleanOptions !== undefined) updateData.options = cleanOptions;
    if (minSelections !== undefined) updateData.minSelections = minSelections;
    if (maxSelections !== undefined) updateData.maxSelections = maxSelections;
    if (menuItems !== undefined) updateData.menuItems = menuItems;

    const Variant = require('../models/Variant');
    const variant = await Variant.findOneAndUpdate(
      { _id: variantId, [`${ownerType}Id`]: ownerId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!variant) {
      throw new APIError('Variant not found', 404);
    }

    const responseVariant = {
      id: variant._id,
      name: variant.name,
      type: variant.type,
      required: variant.required,
      options: variant.options,
      minSelections: variant.minSelections,
      maxSelections: variant.maxSelections,
      menuItems: variant.menuItems,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt
    };

    res.status(200).json({
      success: true,
      data: responseVariant,
      message: 'Variant updated successfully'
    });
  });

  // Delete Variant
  static deleteVariant = catchAsync(async (req, res) => {
    const { ownerType, ownerId, variantId } = req.params;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const Variant = require('../models/Variant');
    const variant = await Variant.findOneAndDelete({
      _id: variantId,
      [`${ownerType}Id`]: ownerId
    });

    if (!variant) {
      throw new APIError('Variant not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Variant deleted successfully'
    });
  });

  /**
   * Update subscription usage counts
   * @param {string} userId - User ID
   * @param {string} ownerType - Owner type (restaurant, zone, shop)
   * @param {string} ownerId - Owner ID
   * @param {string} usageType - Usage type (categories, menuItems)
   * @param {number} delta - Change in count (positive for additions, negative for deletions)
   */
  static async updateSubscriptionUsage(userId, ownerType, ownerId, usageType, delta) {
    try {
      const User = require('../models/User');
      const Subscription = require('../models/Subscription');
      const Restaurant = require('../models/Restaurant');
      const Zone = require('../models/Zone');
      const ZoneShop = require('../models/ZoneShop');

      // Get the user to determine their role
      const user = await User.findById(userId);
      if (!user) {
        logger.warn('User not found for subscription usage update:', userId);
        return;
      }

      // Determine the subscription owner based on user role.
      let subscriptionOwnerId = userId;
      let subscriptionOwnerType = 'user';

      if (user.role === 'restaurant_owner' && user.restaurantId) {
        const restaurant = await Restaurant.findById(user.restaurantId);
        if (restaurant && restaurant.ownerId) {
          subscriptionOwnerId = restaurant.ownerId;
          subscriptionOwnerType = 'restaurant';
        }
      } else if (user.role === 'zone_admin') {
        // The zone admin holds the subscription directly on their User record.
        subscriptionOwnerType = 'zone';
      } else if (['zone_shop', 'zone_vendor'].includes(user.role)) {
        // Walk up: shop/vendor → ZoneShop → Zone.adminId → that user owns the subscription.
        let zone = null;
        
        try {
          // First try to find zone through shopId
          if (user.shopId) {
            const shop = await ZoneShop.findById(user.shopId).populate('zoneId');
            if (shop && shop.zoneId) {
              zone = shop.zoneId;
            }
          }
          
          // If no zone found through shopId, try direct zoneId
          if (!zone && user.zoneId) {
            zone = await Zone.findById(user.zoneId);
          }
          
          // Alternative approach: find shop by ownerId if shopId is not set
          if (!zone && ownerType === 'shop') {
            const shop = await ZoneShop.findById(ownerId).populate('zoneId');
            if (shop && shop.zoneId) {
              zone = shop.zoneId;
            }
          }
          
          if (zone && zone.adminId) {
            subscriptionOwnerId = zone.adminId;
            subscriptionOwnerType = 'zone';
            logger.debug('Found zone admin for subscription usage:', {
              userId,
              userRole: user.role,
              zoneId: zone._id,
              adminId: zone.adminId
            });
          } else {
            logger.warn('Could not find zone admin for subscription usage update:', {
              userId,
              userRole: user.role,
              userShopId: user.shopId,
              userZoneId: user.zoneId,
              ownerType,
              ownerId,
              zoneFound: !!zone,
              zoneAdminId: zone?.adminId
            });
          }
        } catch (hierarchyError) {
          logger.error('Error walking up zone hierarchy for subscription usage:', {
            error: hierarchyError.message,
            userId,
            userRole: user.role,
            ownerType,
            ownerId
          });
        }
      }

      // Find the subscription for the owner
      let subscription;
      try {
        subscription = await Subscription.findOne({ userId: subscriptionOwnerId });
      } catch (subscriptionError) {
        logger.error('Error finding subscription:', {
          error: subscriptionError.message,
          subscriptionOwnerId,
          subscriptionOwnerType
        });
        return;
      }

      if (!subscription) {
        logger.warn('Subscription not found for usage update:', {
          subscriptionOwnerId,
          subscriptionOwnerType,
          originalUserId: userId,
          userRole: user.role
        });
        return;
      }

      // Update the usage count
      const usageField = `usage.current${usageType.charAt(0).toUpperCase() + usageType.slice(1)}`;
      const currentValue = subscription.get(usageField) || 0;
      const newValue = Math.max(0, currentValue + delta); // Ensure it doesn't go below 0

      // Update the subscription
      subscription.set(usageField, newValue);
      subscription.usage.lastUsageUpdate = new Date();
      await subscription.save();

      logger.debug('Subscription usage updated successfully:', {
        subscriptionId: subscription._id,
        usageField,
        oldValue: currentValue,
        newValue,
        delta
      });

    } catch (error) {
      logger.error('Failed to update subscription usage:', {
        error: error.message,
        stack: error.stack,
        userId,
        ownerType,
        ownerId,
        usageType,
        delta
      });
      // Don't throw error as this is a secondary operation - the main category creation should still succeed
    }
  }

}

module.exports = MenuController;
