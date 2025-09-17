const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuCategory',
    required: [true, 'Category ID is required'],
    index: true
  },
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
    required: [true, 'Item name is required'],
    trim: true,
    minlength: [2, 'Item name must be at least 2 characters'],
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    set: function(value) {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  modifiers: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Modifier name cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Modifier description cannot exceed 200 characters']
    },
    type: {
      type: String,
      enum: ['single', 'multiple'],
      default: 'single'
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Option name cannot exceed 50 characters']
      },
      price: {
        type: Number,
        default: 0,
        min: [0, 'Option price cannot be negative'],
        set: function(value) {
          return Math.round(value * 100) / 100;
        }
      },
      available: {
        type: Boolean,
        default: true
      }
    }],
    minSelections: {
      type: Number,
      default: 0,
      min: [0, 'Minimum selections cannot be negative']
    },
    maxSelections: {
      type: Number,
      default: 1,
      min: [1, 'Maximum selections must be at least 1']
    }
  }],
  available: {
    type: Boolean,
    default: true,
    index: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  spicyLevel: {
    type: Number,
    min: [0, 'Spicy level cannot be negative'],
    max: [5, 'Spicy level cannot exceed 5'],
    default: 0
  },
  preparationTime: {
    type: Number,
    min: [1, 'Preparation time must be at least 1 minute'],
    max: [120, 'Preparation time cannot exceed 120 minutes'],
    default: 15
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  dietaryInfo: {
    isVegetarian: {
      type: Boolean,
      default: false
    },
    isVegan: {
      type: Boolean,
      default: false
    },
    isGlutenFree: {
      type: Boolean,
      default: false
    },
    isHalal: {
      type: Boolean,
      default: false
    },
    isKosher: {
      type: Boolean,
      default: false
    },
    containsNuts: {
      type: Boolean,
      default: false
    },
    containsDairy: {
      type: Boolean,
      default: false
    },
    containsEggs: {
      type: Boolean,
      default: false
    }
  },
  nutritionInfo: {
    calories: {
      type: Number,
      min: [0, 'Calories cannot be negative'],
      default: null
    },
    protein: {
      type: Number,
      min: [0, 'Protein cannot be negative'],
      default: null
    },
    carbs: {
      type: Number,
      min: [0, 'Carbs cannot be negative'],
      default: null
    },
    fat: {
      type: Number,
      min: [0, 'Fat cannot be negative'],
      default: null
    },
    fiber: {
      type: Number,
      min: [0, 'Fiber cannot be negative'],
      default: null
    },
    sugar: {
      type: Number,
      min: [0, 'Sugar cannot be negative'],
      default: null
    },
    sodium: {
      type: Number,
      min: [0, 'Sodium cannot be negative'],
      default: null
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
    }],
    limitedQuantity: {
      type: Boolean,
      default: false
    },
    dailyLimit: {
      type: Number,
      min: [0, 'Daily limit cannot be negative'],
      default: null
    },
    currentCount: {
      type: Number,
      default: 0,
      min: [0, 'Current count cannot be negative']
    }
  },
  pricing: {
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
      default: 0,
      set: function(value) {
        return Math.round(value * 100) / 100;
      }
    },
    profitMargin: {
      type: Number,
      min: [0, 'Profit margin cannot be negative'],
      max: [100, 'Profit margin cannot exceed 100%'],
      default: 0
    }
  },
  stats: {
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
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative']
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

// Validation: Must belong to same owner as category
MenuItemSchema.pre('validate', async function(next) {
  if (this.isNew || this.isModified('categoryId')) {
    try {
      const MenuCategory = mongoose.model('MenuCategory');
      const category = await MenuCategory.findById(this.categoryId);
      
      if (!category) {
        this.invalidate('categoryId', 'Invalid category');
        return next();
      }
      
      // Set owner fields based on category
      this.restaurantId = category.restaurantId;
      this.zoneId = category.zoneId;
      this.shopId = category.shopId;
      
    } catch (error) {
      this.invalidate('categoryId', 'Error validating category');
    }
  }
  
  next();
});

// Validation: Modifier selections constraints
MenuItemSchema.pre('validate', function(next) {
  this.modifiers.forEach((modifier, index) => {
    if (modifier.minSelections > modifier.maxSelections) {
      this.invalidate(`modifiers.${index}.minSelections`, 
        'Minimum selections cannot exceed maximum selections');
    }
    
    if (modifier.required && modifier.minSelections === 0) {
      modifier.minSelections = 1;
    }
  });
  
  next();
});

// Indexes for better query performance
MenuItemSchema.index({ categoryId: 1, available: 1, sortOrder: 1 });
MenuItemSchema.index({ restaurantId: 1, available: 1, featured: -1 });
MenuItemSchema.index({ zoneId: 1, available: 1, featured: -1 });
MenuItemSchema.index({ shopId: 1, available: 1, featured: -1 });
MenuItemSchema.index({ featured: 1, available: 1, 'stats.averageRating': -1 });
MenuItemSchema.index({ price: 1, available: 1 });
MenuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
MenuItemSchema.index({ createdAt: -1 });

// Virtual for owner type
MenuItemSchema.virtual('ownerType').get(function() {
  if (this.restaurantId) return 'restaurant';
  if (this.zoneId) return 'zone';
  if (this.shopId) return 'shop';
  return null;
});

// Virtual for owner ID
MenuItemSchema.virtual('ownerId').get(function() {
  return this.restaurantId || this.zoneId || this.shopId;
});

// Virtual for primary image
MenuItemSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || (this.images.length > 0 ? this.images[0] : null);
});

// Virtual for total modifier price range
MenuItemSchema.virtual('modifierPriceRange').get(function() {
  let minPrice = 0;
  let maxPrice = 0;
  
  this.modifiers.forEach(modifier => {
    const sortedPrices = modifier.options
      .filter(opt => opt.available)
      .map(opt => opt.price)
      .sort((a, b) => a - b);
    
    if (sortedPrices.length > 0) {
      if (modifier.required) {
        minPrice += sortedPrices[0] * modifier.minSelections;
      }
      maxPrice += sortedPrices[sortedPrices.length - 1] * modifier.maxSelections;
    }
  });
  
  return { min: minPrice, max: maxPrice };
});

// Virtual for full price range (base + modifiers)
MenuItemSchema.virtual('fullPriceRange').get(function() {
  const modifierRange = this.modifierPriceRange;
  return {
    min: this.price + modifierRange.min,
    max: this.price + modifierRange.max
  };
});

// Instance method to check if item is currently available
MenuItemSchema.methods.isCurrentlyAvailable = function() {
  if (!this.available || !this.availability.isAvailable) {
    return false;
  }
  
  // Check daily limit
  if (this.availability.limitedQuantity && this.availability.dailyLimit) {
    if (this.availability.currentCount >= this.availability.dailyLimit) {
      return false;
    }
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

// Instance method to calculate total price with modifiers
MenuItemSchema.methods.calculateTotalPrice = function(selectedModifiers = []) {
  let totalPrice = this.price;
  
  selectedModifiers.forEach(selectedModifier => {
    const modifier = this.modifiers.find(m => m._id.toString() === selectedModifier.modifierId);
    if (modifier) {
      selectedModifier.selectedOptions.forEach(optionId => {
        const option = modifier.options.find(o => o._id.toString() === optionId);
        if (option && option.available) {
          totalPrice += option.price;
        }
      });
    }
  });
  
  return Math.round(totalPrice * 100) / 100;
};

// Instance method to validate modifier selection
MenuItemSchema.methods.validateModifierSelection = function(selectedModifiers = []) {
  const errors = [];
  
  this.modifiers.forEach(modifier => {
    const selected = selectedModifiers.find(sm => sm.modifierId === modifier._id.toString());
    const selectedCount = selected ? selected.selectedOptions.length : 0;
    
    if (modifier.required && selectedCount < modifier.minSelections) {
      errors.push(`${modifier.name} requires at least ${modifier.minSelections} selection(s)`);
    }
    
    if (selectedCount > modifier.maxSelections) {
      errors.push(`${modifier.name} allows maximum ${modifier.maxSelections} selection(s)`);
    }
    
    if (selectedCount < modifier.minSelections) {
      errors.push(`${modifier.name} requires minimum ${modifier.minSelections} selection(s)`);
    }
  });
  
  return { isValid: errors.length === 0, errors };
};

// Instance method to update stats
MenuItemSchema.methods.updateStats = function(statsUpdate) {
  if (statsUpdate.totalOrders !== undefined) {
    this.stats.totalOrders = Math.max(0, this.stats.totalOrders + statsUpdate.totalOrders);
  }
  if (statsUpdate.totalRevenue !== undefined) {
    this.stats.totalRevenue = Math.max(0, this.stats.totalRevenue + statsUpdate.totalRevenue);
  }
  if (statsUpdate.rating !== undefined) {
    // Update average rating
    const currentTotal = this.stats.averageRating * this.stats.totalReviews;
    const newTotal = currentTotal + statsUpdate.rating;
    const newReviewCount = this.stats.totalReviews + 1;
    
    this.stats.averageRating = Math.round((newTotal / newReviewCount) * 10) / 10;
    this.stats.totalReviews = newReviewCount;
  }
  if (statsUpdate.lastOrderDate) {
    this.stats.lastOrderDate = statsUpdate.lastOrderDate;
  }
  
  // Update daily count for limited quantity items
  if (statsUpdate.dailyCountIncrement && this.availability.limitedQuantity) {
    this.availability.currentCount = Math.min(
      this.availability.currentCount + statsUpdate.dailyCountIncrement,
      this.availability.dailyLimit || Infinity
    );
  }
  
  return this.save();
};

// Instance method to reset daily count
MenuItemSchema.methods.resetDailyCount = function() {
  this.availability.currentCount = 0;
  return this.save();
};

// Instance method to toggle availability
MenuItemSchema.methods.toggleAvailability = function() {
  this.available = !this.available;
  return this.save();
};

// Static method to find items by owner
MenuItemSchema.statics.findByOwner = function(ownerType, ownerId, options = {}) {
  const query = {};
  
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
  
  if (options.categoryId) {
    query.categoryId = options.categoryId;
  }
  
  if (options.available !== undefined) {
    query.available = options.available;
  }
  
  if (options.featured !== undefined) {
    query.featured = options.featured;
  }
  
  return this.find(query)
    .populate('categoryId', 'name description')
    .sort(options.sort || { featured: -1, sortOrder: 1, createdAt: 1 });
};

// Static method to search items
MenuItemSchema.statics.searchItems = function(searchTerm, ownerType = null, ownerId = null, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    available: true
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
  
  if (options.priceRange) {
    query.price = { 
      $gte: options.priceRange.min || 0, 
      $lte: options.priceRange.max || Number.MAX_VALUE 
    };
  }
  
  if (options.dietaryFilters) {
    Object.keys(options.dietaryFilters).forEach(filter => {
      if (options.dietaryFilters[filter]) {
        query[`dietaryInfo.${filter}`] = true;
      }
    });
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('categoryId', 'name')
    .sort({ score: { $meta: 'textScore' }, featured: -1 });
};

// Static method to get popular items
MenuItemSchema.statics.getPopularItems = function(ownerType = null, ownerId = null, limit = 10) {
  const query = { available: true };
  
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
  
  return this.find(query)
    .populate('categoryId', 'name')
    .sort({ 'stats.totalOrders': -1, 'stats.averageRating': -1 })
    .limit(limit);
};

// Static method to get featured items
MenuItemSchema.statics.getFeaturedItems = function(ownerType = null, ownerId = null, limit = 10) {
  const query = { available: true, featured: true };
  
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
  
  return this.find(query)
    .populate('categoryId', 'name')
    .sort({ sortOrder: 1, 'stats.averageRating': -1 })
    .limit(limit);
};

// Post-save middleware to update category stats
MenuItemSchema.post('save', async function() {
  try {
    if (this.isNew) {
      // Update category item count
      const MenuCategory = mongoose.model('MenuCategory');
      await MenuCategory.findByIdAndUpdate(
        this.categoryId,
        { 
          $inc: { 
            'stats.totalItems': 1,
            'stats.activeItems': this.available ? 1 : 0
          }
        }
      );
    }
  } catch (error) {
    console.error('Error updating category stats:', error);
  }
});

// Post-remove middleware to update category stats
MenuItemSchema.post('remove', async function() {
  try {
    // Update category item count
    const MenuCategory = mongoose.model('MenuCategory');
    await MenuCategory.findByIdAndUpdate(
      this.categoryId,
      { 
        $inc: { 
          'stats.totalItems': -1,
          'stats.activeItems': this.available ? -1 : 0
        }
      }
    );
  } catch (error) {
    console.error('Error updating category stats after removal:', error);
  }
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);