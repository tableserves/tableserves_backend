const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const Modifier = require('../models/Modifier');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const Upload = require('../models/Upload');
const {APIError} = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const { UploadService } = require('../services/uploadService');

class MenuController {
  // Helper method to check owner permissions
  static async checkOwnerPermissions(req, ownerType, ownerId) {
    console.log('CheckOwnerPermissions - Debug:', {
      userRole: req.user?.role,
      userId: req.user?.id,
      ownerType,
      ownerId,
      shopId: req.user?.shopId,
      zoneId: req.user?.zoneId
    });

    if (req.user.role === 'admin') {
      console.log('CheckOwnerPermissions - Admin access granted');
      return;
    }

    let owner;
    switch (ownerType) {
      case 'restaurant':
        owner = await Restaurant.findOne({ _id: ownerId, ownerId: req.user.id });
        break;
      case 'zone':
        // Allow zone_admin access to their assigned zone
        if (req.user.role === 'zone_admin' && req.user.zoneId && req.user.zoneId.toString() === ownerId) {
          console.log('CheckOwnerPermissions - Zone admin access granted to assigned zone');
          return;
        }
        owner = await Zone.findOne({ _id: ownerId, ownerId: req.user.id });
        break;
      case 'shop':
        // For zone shops, check multiple ownership patterns
        
        // Special handling for zone_shop and zone_vendor roles
        if (['zone_shop', 'zone_vendor'].includes(req.user.role)) {
          // If user has a shopId in their profile, allow access to that shop
          if (req.user.shopId && req.user.shopId.toString() === ownerId) {
            console.log('CheckOwnerPermissions - Shop access granted via user.shopId match');
            return; // Allow access
          }
        }
        
        // Special handling for zone_admin role
        if (req.user.role === 'zone_admin') {
          // First, find the shop to get its zoneId
          const shop = await ZoneShop.findById(ownerId);
          if (shop) {
            // Check if the zone admin is assigned to this zone
            if (req.user.zoneId && req.user.zoneId.toString() === shop.zoneId.toString()) {
              console.log('CheckOwnerPermissions - Zone admin access granted to shop in assigned zone');
              return; // Allow access
            }
            
            // Or check if the zone admin owns this zone
            const zone = await Zone.findOne({ 
              _id: shop.zoneId, 
              $or: [
                { adminId: req.user.id },
                { ownerId: req.user.id }
              ]
            });
            
            if (zone) {
              console.log('CheckOwnerPermissions - Zone admin access granted to shop in owned zone');
              return; // Allow access
            }
          }
        }
        
        // Default shop query for other cases
        const shopQuery = {
          _id: ownerId,
          $or: [
            { ownerId: req.user.id }, // Direct ownership
            { _id: req.user.shopId }   // User's assigned shop
          ]
        };
        
        owner = await ZoneShop.findOne(shopQuery);
        console.log('CheckOwnerPermissions - Shop lookup result:', owner);
        break;
      default:
        throw new Error('Invalid owner type');
    }

    if (!owner) {
      console.log('CheckOwnerPermissions - Access denied: owner not found');
      throw new APIError('You do not have permission to access this resource', 403);
    }
    
    console.log('CheckOwnerPermissions - Access granted');
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

    // Get all menu items for these categories
    const menuItems = await MenuItem.find({
      categoryId: { $in: categories.map(cat => cat._id) },
      available: true
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
      image: category.image?.url || null,
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
          isVeg: item.isVeg || false,
          available: item.available,
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
    
    console.log('🌍 MenuController.getZoneAggregatedMenu: Fetching zone menu for zoneId:', zoneId);
    
    // First, verify the zone exists
    const zone = await Zone.findById(zoneId);
    if (!zone) {
      throw new APIError('Zone not found', 404);
    }
    
    // Get all active shops in the zone
    const shops = await ZoneShop.find({ zoneId, status: 'active' }).lean();
    console.log('🏪 MenuController.getZoneAggregatedMenu: Found', shops.length, 'active shops in zone');
    
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
    
    console.log('📂 MenuController.getZoneAggregatedMenu: Found', categories.length, 'active categories from zone shops');
    
    // Get all available menu items for these categories
    const menuItems = await MenuItem.find({
      categoryId: { $in: categories.map(cat => cat._id) },
      available: true
    })
      .populate('categoryId', 'name')
      .populate('shopId', 'name')
      .sort('name')
      .lean();
    
    console.log('🍽️ MenuController.getZoneAggregatedMenu: Found', menuItems.length, 'available menu items');
    
    // Group categories by name and aggregate items from different shops
    const categoryMap = new Map();
    
    categories.forEach(category => {
      const categoryName = category.name;
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          id: category._id.toString(),
          name: category.name,
          description: category.description,
          image: category.image?.url || null,
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
          isVeg: item.isVeg || false,
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
    
    console.log('✅ MenuController.getZoneAggregatedMenu: Returning', transformedCategories.length, 'aggregated categories with', transformedCategories.reduce((sum, cat) => sum + cat.items.length, 0), 'total items');
    
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
  static createCategory = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { name, description, sortOrder, settings, availability, tags, image } = req.body;

    console.log('Menu category creation data received:', { 
      name, description, sortOrder, settings, availability, tags, image,
      fullBody: req.body 
    }); // Debug log

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const categoryData = {
      name,
      description: description || '',
      sortOrder: sortOrder || 0,
      active: true,
      settings: settings || { showInMenu: true },
      availability: availability || {},
      tags: tags || []
    };

    if (image && image !== 'null' && image.trim()) {
      // Extract publicId from Cloudinary URL or use a generated one
      const publicId = image.includes('cloudinary.com') 
        ? image.split('/').pop().split('.')[0] 
        : `menu_category_${Date.now()}`;
      
      categoryData.image = { url: image.trim(), publicId };
    }

    // Set the appropriate owner ID field based on ownerType
    switch (ownerType) {
      case 'restaurant':
        categoryData.restaurantId = ownerId;
        break;
      case 'zone':
        categoryData.zoneId = ownerId;
        break;
      case 'shop':
        categoryData.shopId = ownerId;
        break;
      default:
        throw new APIError(`Invalid owner type: ${ownerType}`, 400);
    }

    try {
      const category = await MenuCategory.create(categoryData);

      // Update subscription usage counts
      await this.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'categories', 1);

      // Transform response to match frontend expectations
      const responseCategory = {
        id: category._id,
        name: category.name,
        description: category.description,
        image: category.image?.url || null,
        isActive: category.active,
        sortOrder: category.sortOrder,
        settings: category.settings,
        tags: category.tags,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      };

      res.status(201).json({
        success: true,
        data: responseCategory,
        message: 'Category created successfully'
      });
    } catch (error) {
      console.error('Error creating menu category:', error);
      throw new APIError(error.message || 'Failed to create menu category', 500);
    }
  });

  static getCategories = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { page = 1, limit = 20, search } = req.query;
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
      image: category.image?.url || null,
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
    const { name, description, sortOrder, settings, availability, tags, image, isActive } = req.body;
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (image !== undefined) {
      updateData.image = (image && image !== 'null' && image.trim()) ? { url: image.trim(), publicId: null } : null;
    }
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
      image: category.image?.url || null,
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

    // Update subscription usage counts
    await this.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'categories', -1);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  });

  // Item Methods
  static getItems = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { page = 1, limit = 20, categoryId, search } = req.query;
    const skip = (page - 1) * limit;

    // Check permissions only if user is authenticated
    if (req.user) {
      await this.checkOwnerPermissions(req, ownerType, ownerId);
    }

    const query = { [`${ownerType}Id`]: ownerId };
    
    // For public access, only show available items
    if (!req.user) {
      query.available = true;
    }
    
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

    const item = await MenuItem.findOneAndUpdate(
      { _id: itemId, [`${ownerType}Id`]: ownerId },
      req.body,
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

    // Update subscription usage counts
    await this.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'menuItems', -1);

    // TODO: Consider soft delete or archive instead of hard delete
    
    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
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

    console.log('Creating modifier with data:', req.body);
    console.log('Raw options received:', JSON.stringify(options, null, 2));
    
    await this.checkOwnerPermissions(req, ownerType, ownerId);

    // Clean options to only include allowed fields
    const cleanOptions = options ? options.map(option => ({
      name: option.name,
      price: option.price,
      available: option.available !== undefined ? option.available : true
    })) : [];

    console.log('Cleaned options:', JSON.stringify(cleanOptions, null, 2));

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

    console.log('Saving modifier to database:', modifierData);
    
    try {
      const modifier = new Modifier(modifierData);
      const savedModifier = await modifier.save();
      console.log('Modifier saved successfully:', savedModifier);

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
      console.error('Modifier save error details:', {
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
    const { name, description, sortOrder, settings, availability, tags, image, isActive } = req.body;

    console.log('=== MENU CATEGORY CREATION DEBUG ===');
    console.log('User Info:', {
      userId: req.user?.id,
      role: req.user?.role,
      shopId: req.user?.shopId,
      email: req.user?.email
    });
    console.log('Route Params:', { ownerType, ownerId });
    console.log('Category creation data received:', { 
      name, image, isActive, description, sortOrder, settings, tags, 
      fullRequestBody: req.body 
    });
    console.log('=== END CATEGORY CREATION DEBUG ===');

    await this.checkOwnerPermissions(req, ownerType, ownerId);

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

    if (image && image !== 'null' && image.trim()) {
      categoryData.image = { url: image.trim(), publicId: null };
    }

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

    console.log('=== CREATING MONGODB CATEGORY DOCUMENT ===');
    console.log('Final categoryData before save:', JSON.stringify(categoryData, null, 2));
    
    try {
      const category = new MenuCategory(categoryData);
      console.log('Category document created, attempting save...');
      await category.save();
      console.log('Category saved successfully to MongoDB:', category._id);

      // Update subscription usage counts
      await this.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'categories', 1);

      // Transform response to match frontend expectations
      const responseCategory = {
        id: category._id,
        name: category.name,
        description: category.description,
        image: category.image?.url || null,
        isActive: category.active,
        sortOrder: category.sortOrder,
        settings: category.settings,
        tags: category.tags,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      };

      res.status(201).json({
        success: true,
        data: responseCategory,
        message: 'Category created successfully'
      });
    } catch (saveError) {
      console.log('=== MONGODB SAVE ERROR ===');
      console.log('Error type:', saveError.name);
      console.log('Error message:', saveError.message);
      if (saveError.errors) {
        console.log('Validation errors:', saveError.errors);
      }
      console.log('Full error:', saveError);
      console.log('=== END MONGODB SAVE ERROR ===');
      
      // Re-throw the error to be handled by the catchAsync wrapper
      throw saveError;
    }
  });

  // @desc    Create new menu item
  // @route   POST /api/menu/:ownerType/:ownerId/items
  // @access  Private
  static createItem = catchAsync(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { categoryId, name, description, price, image, available, tags, modifiers } = req.body;

    console.log('Menu item creation data received:', { 
      categoryId, name, description, price, image, available, tags, modifiers,
      fullBody: req.body 
    }); // Debug log

    await this.checkOwnerPermissions(req, ownerType, ownerId);

    const category = await MenuCategory.findOne({
      _id: categoryId,
      [`${ownerType}Id`]: ownerId
    });

    if (!category) {
      throw new APIError('Category not found or does not belong to this owner', 404);
    }

    const itemData = {
      categoryId,
      name,
      description,
      price,
      available: available !== false,
      tags: tags || [],
      modifiers: modifiers || []
    };

    if (image && image !== 'null' && image.trim()) {
      // Extract publicId from Cloudinary URL or use a generated one
      const publicId = image.includes('cloudinary.com') 
        ? image.split('/').pop().split('.')[0] 
        : `menu_item_${Date.now()}`;
      
      itemData.images = [{ url: image.trim(), publicId, isPrimary: true }];
      console.log('Image data being saved:', { url: image.trim(), publicId, isPrimary: true });
    } else {
      console.log('No image provided or image is null/empty:', { image });
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

    console.log('Final itemData being saved to database:', itemData);

    const item = new MenuItem(itemData);
    await item.save();
    
    console.log('Saved item from database:', {
      id: item._id,
      images: item.images,
      available: item.available
    });

    // Update subscription usage counts
    await this.updateSubscriptionUsage(req.user.id, ownerType, ownerId, 'menuItems', 1);

    // Transform response to match frontend expectations
    const responseItem = {
      id: item._id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.images?.[0]?.url || item.imageUrl || item.image || null,
      available: item.available,
      tags: item.tags,
      modifiers: item.modifiers,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    res.status(201).json({
      success: true,
      data: responseItem,
      message: 'Menu item created successfully'
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
        console.warn('User not found for subscription usage update:', userId);
        return;
      }

      // Determine the subscription owner based on user role
      let subscriptionOwnerId = userId;
      let subscriptionOwnerType = 'user';

      if (user.role === 'restaurant_owner' && user.restaurantId) {
        const restaurant = await Restaurant.findById(user.restaurantId);
        if (restaurant && restaurant.ownerId) {
          subscriptionOwnerId = restaurant.ownerId;
          subscriptionOwnerType = 'restaurant';
        }
      } else if (['zone_admin', 'zone_shop', 'zone_vendor'].includes(user.role) && user.zoneId) {
        const zone = await Zone.findById(user.zoneId);
        if (zone && zone.ownerId) {
          subscriptionOwnerId = zone.ownerId;
          subscriptionOwnerType = 'zone';
        }
      }

      // Find the subscription for the owner
      let subscription;
      if (subscriptionOwnerType === 'restaurant') {
        subscription = await Subscription.findOne({ userId: subscriptionOwnerId });
      } else if (subscriptionOwnerType === 'zone') {
        subscription = await Subscription.findOne({ userId: subscriptionOwnerId });
      } else {
        // For regular users, use their own subscription
        subscription = await Subscription.findOne({ userId: subscriptionOwnerId });
      }

      if (!subscription) {
        console.warn('Subscription not found for usage update:', subscriptionOwnerId);
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

      console.log('Subscription usage updated:', {
        userId: subscriptionOwnerId,
        usageType,
        delta,
        oldValue: currentValue,
        newValue
      });
    } catch (error) {
      console.error('Failed to update subscription usage:', error);
      // Don't throw error as this is a secondary operation
    }
  }

}

module.exports = MenuController;