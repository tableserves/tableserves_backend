const mongoose = require('mongoose');

const MenuCategorySchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    index: true,
    default: null
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    index: true,
    default: null
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ZoneShop',
    index: true,
    default: null
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    }
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  settings: {
    showInMenu: {
      type: Boolean,
      default: true
    },
    allowCustomization: {
      type: Boolean,
      default: true
    },
    minimumAge: {
      type: Number,
      default: 0,
      min: [0, 'Minimum age cannot be negative']
    },
    requiresSpecialHandling: {
      type: Boolean,
      default: false
    }
  },
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    availableFrom: {
      type: String, // Time in HH:MM format
      default: '00:00'
    },
    availableTo: {
      type: String, // Time in HH:MM format
      default: '23:59'
    },
    availableDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  stats: {
    totalItems: {
      type: Number,
      default: 0,
      min: [0, 'Total items cannot be negative']
    },
    activeItems: {
      type: Number,
      default: 0,
      min: [0, 'Active items cannot be negative']
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: [0, 'Total orders cannot be negative']
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, 'Total revenue cannot be negative']
    },
    lastOrderDate: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validation: Must belong to either restaurant, zone, or shop
MenuCategorySchema.pre('validate', function(next) {
  const hasRestaurant = !!this.restaurantId;
  const hasZone = !!this.zoneId;
  const hasShop = !!this.shopId;
  
  const count = [hasRestaurant, hasZone, hasShop].filter(Boolean).length;
  
  if (count !== 1) {
    this.invalidate('ownership', 'Category must belong to exactly one of: restaurant, zone, or shop');
  }
  
  next();
});

// Indexes for better query performance
MenuCategorySchema.index({ restaurantId: 1, active: 1, sortOrder: 1 });
MenuCategorySchema.index({ zoneId: 1, active: 1, sortOrder: 1 });
MenuCategorySchema.index({ shopId: 1, active: 1, sortOrder: 1 });
MenuCategorySchema.index({ name: 'text', description: 'text', tags: 'text' });
MenuCategorySchema.index({ createdAt: -1 });

// Virtual for menu items count
MenuCategorySchema.virtual('menuItemsCount', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'categoryId',
  count: true
});

// Virtual for available menu items count
MenuCategorySchema.virtual('availableMenuItemsCount', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'categoryId',
  count: true,
  match: { available: true }
});

// Virtual for owner type
MenuCategorySchema.virtual('ownerType').get(function() {
  if (this.restaurantId) return 'restaurant';
  if (this.zoneId) return 'zone';
  if (this.shopId) return 'shop';
  return null;
});

// Virtual for owner ID
MenuCategorySchema.virtual('ownerId').get(function() {
  return this.restaurantId || this.zoneId || this.shopId;
});

// Instance method to check if category is currently available
MenuCategorySchema.methods.isCurrentlyAvailable = function() {
  if (!this.active || !this.availability.isAvailable) {
    return false;
  }
  
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
  
  // Check if current day is available
  if (!this.availability.availableDays.includes(currentDay)) {
    return false;
  }
  
  // Check if current time is within availability window
  return currentTime >= this.availability.availableFrom && 
         currentTime <= this.availability.availableTo;
};

// Instance method to update stats
MenuCategorySchema.methods.updateStats = function(statsUpdate) {
  if (statsUpdate.totalItems !== undefined) {
    this.stats.totalItems = Math.max(0, statsUpdate.totalItems);
  }
  if (statsUpdate.activeItems !== undefined) {
    this.stats.activeItems = Math.max(0, statsUpdate.activeItems);
  }
  if (statsUpdate.totalOrders !== undefined) {
    this.stats.totalOrders = Math.max(0, this.stats.totalOrders + statsUpdate.totalOrders);
  }
  if (statsUpdate.totalRevenue !== undefined) {
    this.stats.totalRevenue = Math.max(0, this.stats.totalRevenue + statsUpdate.totalRevenue);
  }
  if (statsUpdate.lastOrderDate) {
    this.stats.lastOrderDate = statsUpdate.lastOrderDate;
  }
  
  return this.save();
};

// Instance method to toggle availability
MenuCategorySchema.methods.toggleAvailability = function() {
  this.availability.isAvailable = !this.availability.isAvailable;
  return this.save();
};

// Instance method to reorder categories
MenuCategorySchema.methods.updateSortOrder = function(newOrder) {
  this.sortOrder = newOrder;
  return this.save();
};

// Static method to find categories by owner
MenuCategorySchema.statics.findByOwner = function(ownerType, ownerId, options = {}) {
  const query = { active: true };
  
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
      throw new Error('Invalid owner type');
  }
  
  if (options.includeInactive) {
    delete query.active;
  }
  
  if (options.available !== undefined) {
    query['availability.isAvailable'] = options.available;
  }
  
  return this.find(query)
    .populate('menuItemsCount')
    .populate('availableMenuItemsCount')
    .sort(options.sort || { sortOrder: 1, createdAt: 1 });
};

// Static method to search categories
MenuCategorySchema.statics.searchCategories = function(searchTerm, ownerType = null, ownerId = null) {
  const query = {
    $text: { $search: searchTerm },
    active: true
  };
  
  if (ownerType && ownerId) {
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
    }
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, sortOrder: 1 });
};

// Static method to get category statistics
MenuCategorySchema.statics.getCategoryStatistics = async function(ownerType = null, ownerId = null) {
  const matchStage = { active: true };
  
  if (ownerType && ownerId) {
    switch (ownerType) {
      case 'restaurant':
        matchStage.restaurantId = mongoose.Types.ObjectId(ownerId);
        break;
      case 'zone':
        matchStage.zoneId = mongoose.Types.ObjectId(ownerId);
        break;
      case 'shop':
        matchStage.shopId = mongoose.Types.ObjectId(ownerId);
        break;
    }
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCategories: { $sum: 1 },
        totalItems: { $sum: '$stats.totalItems' },
        activeItems: { $sum: '$stats.activeItems' },
        totalOrders: { $sum: '$stats.totalOrders' },
        totalRevenue: { $sum: '$stats.totalRevenue' },
        averageItemsPerCategory: { $avg: '$stats.totalItems' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCategories: 0,
    totalItems: 0,
    activeItems: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageItemsPerCategory: 0
  };
};

// Static method to reorder all categories for an owner
MenuCategorySchema.statics.reorderCategories = async function(ownerType, ownerId, categoryOrders) {
  const bulkOps = categoryOrders.map(({ categoryId, sortOrder }) => ({
    updateOne: {
      filter: { _id: categoryId },
      update: { sortOrder }
    }
  }));
  
  return this.bulkWrite(bulkOps);
};

// Pre-save middleware to validate availability times
MenuCategorySchema.pre('save', function(next) {
  if (this.availability.availableFrom && this.availability.availableTo) {
    const fromTime = this.availability.availableFrom;
    const toTime = this.availability.availableTo;
    
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(fromTime) || !timeRegex.test(toTime)) {
      this.invalidate('availability', 'Invalid time format. Use HH:MM format');
    }
  }
  
  next();
});

// Post-save middleware to update owner stats
MenuCategorySchema.post('save', async function() {
  try {
    if (this.isNew) {
      // Update owner's category count
      if (this.restaurantId) {
        const Restaurant = mongoose.model('Restaurant');
        await Restaurant.findByIdAndUpdate(
          this.restaurantId,
          { $inc: { 'stats.totalCategories': 1 } }
        );
      } else if (this.zoneId) {
        const Zone = mongoose.model('Zone');
        await Zone.findByIdAndUpdate(
          this.zoneId,
          { $inc: { 'stats.totalCategories': 1 } }
        );
      } else if (this.shopId) {
        const ZoneShop = mongoose.model('ZoneShop');
        await ZoneShop.findByIdAndUpdate(
          this.shopId,
          { $inc: { 'stats.totalCategories': 1 } }
        );
      }
    }
  } catch (error) {
    console.error('Error updating owner stats:', error);
  }
});

// Post-remove middleware to update owner stats
MenuCategorySchema.post('remove', async function() {
  try {
    // Update owner's category count
    if (this.restaurantId) {
      const Restaurant = mongoose.model('Restaurant');
      await Restaurant.findByIdAndUpdate(
        this.restaurantId,
        { $inc: { 'stats.totalCategories': -1 } }
      );
    } else if (this.zoneId) {
      const Zone = mongoose.model('Zone');
      await Zone.findByIdAndUpdate(
        this.zoneId,
        { $inc: { 'stats.totalCategories': -1 } }
      );
    } else if (this.shopId) {
      const ZoneShop = mongoose.model('ZoneShop');
      await ZoneShop.findByIdAndUpdate(
        this.shopId,
        { $inc: { 'stats.totalCategories': -1 } }
      );
    }
  } catch (error) {
    console.error('Error updating owner stats after removal:', error);
  }
});

module.exports = mongoose.model('MenuCategory', MenuCategorySchema);