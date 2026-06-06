const mongoose = require('mongoose');

const ModifierSchema = new mongoose.Schema({
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
  menuItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  }],
  name: {
    type: String,
    required: [true, 'Modifier name is required'],
    trim: true,
    maxlength: [50, 'Modifier name cannot exceed 50 characters']
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
      min: [0, 'Option price cannot be negative']
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
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validation: Must belong to one owner type
ModifierSchema.pre('validate', function(next) {
  const ownerFields = [this.restaurantId, this.zoneId, this.shopId].filter(Boolean);
  if (ownerFields.length !== 1) {
    this.invalidate('ownerType', 'Modifier must belong to exactly one owner (restaurant, zone, or shop)');
  }
  next();
});

// Compound indexes for different owner types
ModifierSchema.index({ restaurantId: 1, name: 1 });
ModifierSchema.index({ zoneId: 1, name: 1 });
ModifierSchema.index({ shopId: 1, name: 1 });

module.exports = mongoose.model('Modifier', ModifierSchema);