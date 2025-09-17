const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Plan Schema
 * Defines subscription plans available for restaurants and zones
 */
const planSchema = new Schema({
  // Plan Identification
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },

  key: {
    type: String,
    required: [true, 'Plan key is required'],
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_-]+$/, 'Plan key can only contain lowercase letters, numbers, underscores, and hyphens']
  },

  planType: {
    type: String,
    required: [true, 'Plan type is required'],
    enum: {
      values: ['restaurant', 'zone'],
      message: 'Plan type must be either restaurant or zone'
    },
    index: true
  },

  // Pricing Information
  price: {
    type: Number,
    required: [true, 'Plan price is required'],
    min: [0, 'Price cannot be negative'],
    set: function(value) {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
  },

  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD'],
    uppercase: true
  },

  // Plan Duration
  durationDays: {
    type: Number,
    default: 30,
    min: [1, 'Duration must be at least 1 day']
  },

  // Plan Limits
  limits: {
    maxMenus: {
      type: Number,
      default: 1,
      min: [0, 'Max menus cannot be negative']
    },

    maxCategories: {
      type: Number,
      default: 1,
      min: [0, 'Max categories cannot be negative']
    },

    maxMenuItems: {
      type: Number,
      default: 1,
      min: [0, 'Max menu items cannot be negative']
    },

    maxTables: {
      type: Number,
      default: 1,
      min: [0, 'Max tables cannot be negative']
    },

    // Zone-specific limits
    maxShops: {
      type: Number,
      default: null, // null means unlimited
      min: [0, 'Max shops cannot be negative']
    },

    maxVendors: {
      type: Number,
      default: null, // null means unlimited
      min: [0, 'Max vendors cannot be negative']
    }
  },

  // Feature Access
  features: {
    crudMenu: {
      type: Boolean,
      default: true,
      description: 'Create, read, update, delete menu items'
    },

    qrGeneration: {
      type: Boolean,
      default: true,
      description: 'Generate QR codes for tables/zones'
    },

    qrCustomization: {
      type: Boolean,
      default: false,
      description: 'Customize QR code appearance'
    },

    analytics: {
      type: Boolean,
      default: false,
      description: 'Access to analytics and reports'
    },

    modifiers: {
      type: Boolean,
      default: false,
      description: 'Menu item modifiers and variations'
    },

    watermark: {
      type: Boolean,
      default: true,
      description: 'TableServe watermark (false = no watermark)'
    },

    vendorManagement: {
      type: Boolean,
      default: false,
      description: 'Manage vendors in zones (zone plans only)'
    },

    prioritySupport: {
      type: Boolean,
      default: false,
      description: 'Priority customer support'
    },

    premiumBranding: {
      type: Boolean,
      default: false,
      description: 'Premium branding options'
    }
  },

  // Plan Status
  active: {
    type: Boolean,
    default: true,
    index: true
  },

  // Plan Description
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Display Order
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  },

  // Metadata
  metadata: {
    isPopular: {
      type: Boolean,
      default: false
    },
    
    isFeatured: {
      type: Boolean,
      default: false
    },

    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
planSchema.index({ planType: 1, active: 1, sortOrder: 1 });
planSchema.index({ key: 1, planType: 1 }, { unique: true }); // Compound unique index
planSchema.index({ price: 1 });
planSchema.index({ 'metadata.isPopular': 1 });

// Virtual for formatted price
planSchema.virtual('formattedPrice').get(function() {
  if (this.price === 0) return 'Free';
  return `₹${this.price.toLocaleString('en-IN')}`;
});

// Virtual for plan identifier
planSchema.virtual('identifier').get(function() {
  return `${this.planType}_${this.key}`;
});

// Static method to get plans by type
planSchema.statics.getByType = function(planType, options = {}) {
  const query = { planType, active: true };
  
  if (options.includeInactive) {
    delete query.active;
  }

  return this.find(query)
    .sort({ sortOrder: 1, price: 1 })
    .lean();
};

// Static method to get plan by key and type
planSchema.statics.getByKey = function(key, planType) {
  return this.findOne({ key, planType, active: true }).lean();
};

// Instance method to check if plan has feature
planSchema.methods.hasFeature = function(featureName) {
  return Boolean(this.features[featureName]);
};

// Instance method to get limit value
planSchema.methods.getLimit = function(limitName) {
  return this.limits[limitName];
};

// Pre-save middleware to validate plan type specific fields
planSchema.pre('save', function(next) {
  // Zone-specific validation
  if (this.planType === 'zone') {
    if (!this.features.vendorManagement) {
      this.features.vendorManagement = true; // Zone plans should have vendor management
    }
  }

  // Restaurant-specific validation
  if (this.planType === 'restaurant') {
    // Set zone-specific limits to null for restaurant plans
    this.limits.maxShops = null;
    this.limits.maxVendors = null;
  }

  next();
});

// Pre-save middleware to ensure unique key per plan type
planSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('key') || this.isModified('planType')) {
    const existingPlan = await this.constructor.findOne({
      key: this.key,
      planType: this.planType,
      _id: { $ne: this._id }
    });

    if (existingPlan) {
      const error = new Error(`Plan with key '${this.key}' already exists for ${this.planType} type`);
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Plan', planSchema);
