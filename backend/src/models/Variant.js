const mongoose = require('mongoose');

const variantOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Option name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Option price is required'],
    min: [0, 'Price cannot be negative']
  },
  available: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['single', 'multiple'],
    default: 'single',
    required: true
  },
  required: {
    type: Boolean,
    default: true // Variants are typically required (e.g., must select a size)
  },
  options: {
    type: [variantOptionSchema],
    validate: {
      validator: function(options) {
        return options && options.length > 0;
      },
      message: 'At least one variant option is required'
    }
  },
  minSelections: {
    type: Number,
    default: 1,
    min: 0
  },
  maxSelections: {
    type: Number,
    default: 1,
    min: 1
  },
  menuItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  }],
  // Owner references - only one should be set
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    index: true
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    index: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ZoneShop',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
variantSchema.index({ restaurantId: 1, name: 1 });
variantSchema.index({ zoneId: 1, name: 1 });
variantSchema.index({ shopId: 1, name: 1 });
variantSchema.index({ menuItems: 1 });

// Validation: Ensure only one owner type is set
variantSchema.pre('validate', function(next) {
  const ownerFields = [this.restaurantId, this.zoneId, this.shopId].filter(Boolean);
  
  if (ownerFields.length === 0) {
    return next(new Error('Variant must belong to a restaurant, zone, or shop'));
  }
  
  if (ownerFields.length > 1) {
    return next(new Error('Variant can only belong to one owner type'));
  }
  
  next();
});

// Validation: Ensure at least one default option if required
variantSchema.pre('validate', function(next) {
  if (this.required && this.options && this.options.length > 0) {
    const hasDefault = this.options.some(opt => opt.isDefault);
    if (!hasDefault) {
      // Auto-set first option as default
      this.options[0].isDefault = true;
    }
  }
  next();
});

// Virtual for owner type
variantSchema.virtual('ownerType').get(function() {
  if (this.restaurantId) return 'restaurant';
  if (this.zoneId) return 'zone';
  if (this.shopId) return 'shop';
  return null;
});

// Virtual for owner ID
variantSchema.virtual('ownerId').get(function() {
  return this.restaurantId || this.zoneId || this.shopId;
});

// Method to check if variant is assigned to a specific menu item
variantSchema.methods.isAssignedToItem = function(itemId) {
  return this.menuItems.some(id => id.toString() === itemId.toString());
};

// Static method to find variants by owner
variantSchema.statics.findByOwner = function(ownerType, ownerId) {
  const query = {};
  query[`${ownerType}Id`] = ownerId;
  return this.find(query);
};

// Static method to find variants for a specific menu item
variantSchema.statics.findByMenuItem = function(itemId) {
  return this.find({ menuItems: itemId });
};

const Variant = mongoose.model('Variant', variantSchema);

module.exports = Variant;
