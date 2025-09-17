const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Restaurant Schema
 * For single restaurant owners to manage their establishment
 */
const restaurantSchema = new Schema({
  // Owner Reference
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  
  // Subscription Reference
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false // Allow creation without subscription initially
  },
  
  // Basic Information
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
    maxlength: [100, 'Restaurant name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  
  // Contact Information
  contact: {
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
      },
      zipCode: {
        type: String,
        required: [true, 'ZIP code is required'],
        trim: true
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        default: 'US'
      },
      coordinates: {
        latitude: {
          type: Number,
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90']
        },
        longitude: {
          type: Number,
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180']
        }
      }
    },
    
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    
    website: {
      type: String,
      trim: true
    }
  },
  
  // Media
  media: {
    images: [{
      url: {
        type: String,
        required: true,
        validate: {
          validator: function(value) {
            return value && value.trim().length > 0;
          },
          message: 'Image URL cannot be empty'
        }
      },
      caption: {
        type: String,
        maxlength: [200, 'Image caption cannot exceed 200 characters']
      },
      isPrimary: {
        type: Boolean,
        default: false
      },
      imageType: {
        type: String,
        enum: ['logo', 'banner', 'gallery', 'menu'],
        default: 'gallery'
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    
    banner: {
      type: String // Cloudinary URL for banner only
    }
  },
  
  // Operating Hours
  hours: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    saturday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    }
  },
  
  // Tables Management
  tables: [{
    number: {
      type: String,
      required: [true, 'Table number is required'],
      trim: true
    },
    
    name: {
      type: String,
      trim: true
      // Optional table name (e.g., "Window Table", "Private Booth")
    },
    
    capacity: {
      type: Number,
      min: [1, 'Table capacity must be at least 1'],
      max: [20, 'Table capacity cannot exceed 20'],
      default: 4
    },
    
    qrCode: {
      data: {
        type: String,
        required: [true, 'QR code data is required']
        // URL that the QR code points to
      },
      imageUrl: {
        type: String
        // Cloudinary URL of the generated QR code image
      },
      customization: {
        foregroundColor: {
          type: String,
          default: '#000000',
          match: /^#[0-9A-F]{6}$/i
        },
        backgroundColor: {
          type: String,
          default: '#FFFFFF',
          match: /^#[0-9A-F]{6}$/i
        },
        logo: {
          type: String
          // Logo to embed in QR code
        },
        size: {
          type: Number,
          enum: [200, 300, 400, 500],
          default: 300
        }
      }
    },
    
    location: {
      section: {
        type: String,
        trim: true
        // Restaurant section (e.g., "Main Dining", "Patio", "Bar")
      },
      coordinates: {
        x: Number,
        y: Number
        // Position on restaurant floor plan
      }
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    
    notes: {
      type: String,
      maxlength: [500, 'Table notes cannot exceed 500 characters']
    },
    
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Restaurant Settings
  settings: {
    // Theme and Branding
    theme: {
      primaryColor: {
        type: String,
        default: '#2563eb',
        match: /^#[0-9A-F]{6}$/i
      },
      secondaryColor: {
        type: String,
        default: '#f59e0b',
        match: /^#[0-9A-F]{6}$/i
      },
      backgroundColor: {
        type: String,
        default: '#ffffff',
        match: /^#[0-9A-F]{6}$/i
      },
      textColor: {
        type: String,
        default: '#1f2937',
        match: /^#[0-9A-F]{6}$/i
      },
      fontFamily: {
        type: String,
        enum: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins'],
        default: 'Inter'
      }
    },
    
    // Order Settings
    ordering: {
      isEnabled: {
        type: Boolean,
        default: true
      },
      
      requireCustomerInfo: {
        type: Boolean,
        default: true
      },
      
      allowSpecialInstructions: {
        type: Boolean,
        default: true
      },
      
      estimatedPrepTime: {
        type: Number,
        min: [5, 'Prep time must be at least 5 minutes'],
        max: [120, 'Prep time cannot exceed 120 minutes'],
        default: 20
        // Estimated preparation time in minutes
      },
      
      orderNotifications: {
        email: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        },
        sound: {
          type: Boolean,
          default: true
        }
      },
      
      autoAcceptOrders: {
        type: Boolean,
        default: false
        // Automatically accept orders without manual confirmation
      }
    },
    
    // Payment Settings
    payment: {
      acceptCash: {
        type: Boolean,
        default: true
      },
      
      acceptCard: {
        type: Boolean,
        default: false
      },
      
      taxRate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative'],
        max: [0.3, 'Tax rate cannot exceed 30%'],
        default: 0.08
      },
      
      serviceFee: {
        type: Number,
        min: [0, 'Service fee cannot be negative'],
        max: [0.2, 'Service fee cannot exceed 20%'],
        default: 0
      },
      
      tipOptions: [{
        type: Number,
        min: [0, 'Tip percentage cannot be negative'],
        max: [0.5, 'Tip percentage cannot exceed 50%']
      }],
      
      currency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PKR', 'RS'],
        default: 'PKR'
      }
    },
    
    // Display Settings
    display: {
      showPrices: {
        type: Boolean,
        default: true
      },
      
      showImages: {
        type: Boolean,
        default: true
      },
      
      showDescriptions: {
        type: Boolean,
        default: true
      },
      
      showNutritionInfo: {
        type: Boolean,
        default: false
      },
      
      showAllergenInfo: {
        type: Boolean,
        default: true
      },
      
      itemsPerPage: {
        type: Number,
        min: [5, 'Must show at least 5 items per page'],
        max: [50, 'Cannot show more than 50 items per page'],
        default: 20
      }
    },
    
    // Social Media
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      yelp: String,
      googleMaps: String
    }
  },
  
  // Status and Flags
  isActive: {
    type: Boolean,
    default: true
  },
  
  isPublished: {
    type: Boolean,
    default: false
    // Whether the restaurant menu is published and accessible
  },
  
  isFeatured: {
    type: Boolean,
    default: false
    // Featured restaurants (for platform showcase)
  },
  
  // Analytics and Statistics
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    
    totalRevenue: {
      type: Number,
      default: 0
    },
    
    averageOrderValue: {
      type: Number,
      default: 0
    },
    
    totalCustomers: {
      type: Number,
      default: 0
    },
    
    menuViews: {
      type: Number,
      default: 0
    },
    
    qrScans: {
      type: Number,
      default: 0
    },
    
    lastOrderDate: {
      type: Date
    },
    
    lastStatsUpdate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Audit Fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Frontend Compatibility Fields
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'advanced', 'premium'],
    default: 'free'
  },
  
  ownerName: {
    type: String,
    trim: true
  },
  
  ownerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  ownerPhone: {
    type: String,
    trim: true
  },
  
  maxTables: {
    type: Number,
    min: [1, 'Max tables must be at least 1']
  },
  
  paymentConfig: {
    upiId: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty UPI ID
          // UPI ID format: username@bankname or phone@upi
          const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
          return upiRegex.test(v);
        },
        message: 'Invalid UPI ID format. Use format: username@bankname or phone@upi'
      }
    },
    paymentModel: {
      type: String,
      enum: ['direct', 'platform'],
      default: 'direct'
    },
    onlinePaymentsEnabled: {
      type: Boolean,
      default: false
    }
  },
  
  // Address fields for frontend compatibility
  address: {
    type: String,
    trim: true
  },
  
  city: {
    type: String,
    trim: true
  },
  
  state: {
    type: String,
    trim: true
  },
  
  zipCode: {
    type: String,
    trim: true
  },
  
  cuisine: {
    type: String,
    trim: true,
    default: 'Multi-Cuisine'
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
restaurantSchema.index({ ownerId: 1 });
restaurantSchema.index({ isActive: 1, isPublished: 1 });
restaurantSchema.index({ 'contact.address.city': 1 });
restaurantSchema.index({ 'contact.address.state': 1 });
restaurantSchema.index({ createdAt: -1 });
restaurantSchema.index({ 'stats.totalOrders': -1 });
restaurantSchema.index({ isFeatured: 1 });

// Compound indexes
restaurantSchema.index({ ownerId: 1, isActive: 1 });
restaurantSchema.index({ 'contact.address.city': 1, 'contact.address.state': 1 });

// Add unique compound index for owner and status to prevent multiple active restaurants per owner
restaurantSchema.index({ ownerId: 1, status: 1 }, { 
  unique: true,
  partialFilterExpression: { status: { $in: ['active', 'inactive'] } },
  name: 'unique_owner_active_restaurant'
});

// Virtual for full address
restaurantSchema.virtual('fullAddress').get(function() {
  const addr = this.contact.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

// Virtual for operating status
restaurantSchema.virtual('isCurrentlyOpen').get(function() {
  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  
  const todayHours = this.hours[dayOfWeek];
  if (!todayHours || !todayHours.isOpen) return false;
  
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
});

// Virtual for active tables count
restaurantSchema.virtual('activeTablesCount').get(function() {
  return this.tables.filter(table => table.isActive).length;
});

// Virtual for menu URL
restaurantSchema.virtual('menuUrl').get(function() {
  return `${process.env.FRONTEND_URL}/menu/${this.slug}`;
});

// Virtual to get logo from media.images array only
restaurantSchema.virtual('logoUrl').get(function() {
  // Get logo from media.images array where imageType is 'logo'
  const logoImage = this.media?.images?.find(img => img.imageType === 'logo');
  return logoImage ? logoImage.url : null;
});

// Instance Methods

/**
 * Generate slug from restaurant name
 */
restaurantSchema.methods.generateSlug = function() {
  let baseSlug = this.name
    .toLowerCase()
    .trim()
    // Remove non-alphanumeric characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces with single hyphen
    .replace(/\s+/g, '-')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove hyphens from start and end
    .replace(/^-+|-+$/g, '');
  
  // Ensure slug is not empty
  if (!baseSlug) {
    baseSlug = 'restaurant';
  }
  
  // Ensure uniqueness will be handled by pre-save middleware
  return baseSlug;
};

/**
 * Check if restaurant can accept online payments
 */
restaurantSchema.methods.canAcceptOnlinePayments = function() {
  const hasUpiId = !!(this.paymentConfig?.upiId && this.paymentConfig?.upiId.trim());
  const isEnabled = this.paymentConfig?.onlinePaymentsEnabled === true;
  return hasUpiId && isEnabled;
};

/**
 * Get payment configuration status
 */
restaurantSchema.methods.getPaymentStatus = function() {
  const hasUpiId = !!(this.paymentConfig?.upiId && this.paymentConfig?.upiId.trim());
  const isEnabled = this.paymentConfig?.onlinePaymentsEnabled === true;
  const canAcceptOnlinePayments = hasUpiId && isEnabled;

  return {
    hasUpiId,
    isOnlinePaymentsEnabled: isEnabled,
    canAcceptOnlinePayments,
    upiId: hasUpiId ? this.paymentConfig.upiId : null,
    paymentModel: this.paymentConfig?.paymentModel || 'direct'
  };
};

/**
 * Add new table
 */
restaurantSchema.methods.addTable = function(tableData) {
  const tableNumber = tableData.number || (this.tables.length + 1).toString();
  const qrData = `${process.env.FRONTEND_URL}/order/${this.slug}?table=${tableNumber}`;
  
  const newTable = {
    number: tableNumber,
    name: tableData.name,
    capacity: tableData.capacity || 4,
    qrCode: {
      data: qrData,
      customization: tableData.qrCustomization || {}
    },
    location: tableData.location || {},
    notes: tableData.notes
  };
  
  this.tables.push(newTable);
  return this.save();
};

/**
 * Update table
 */
restaurantSchema.methods.updateTable = function(tableId, updateData) {
  const table = this.tables.id(tableId);
  if (!table) throw new Error('Table not found');
  
  Object.keys(updateData).forEach(key => {
    if (table[key] !== undefined) {
      table[key] = updateData[key];
    }
  });
  
  return this.save();
};

/**
 * Remove table
 */
restaurantSchema.methods.removeTable = function(tableId) {
  this.tables.id(tableId).remove();
  return this.save();
};

/**
 * Update statistics
 */
restaurantSchema.methods.updateStats = function(statsData) {
  Object.keys(statsData).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] = statsData[key];
    }
  });
  this.stats.lastStatsUpdate = new Date();
  return this.save();
};

/**
 * Check if restaurant is open at given time
 */
restaurantSchema.methods.isOpenAt = function(date = new Date()) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  const time = date.toTimeString().slice(0, 5);
  
  const dayHours = this.hours[dayOfWeek];
  if (!dayHours || !dayHours.isOpen) return false;
  
  return time >= dayHours.openTime && time <= dayHours.closeTime;
};

// Static Methods

/**
 * Find restaurants by location
 */
restaurantSchema.statics.findByLocation = function(city, state, country = 'US') {
  return this.find({
    'contact.address.city': new RegExp(city, 'i'),
    'contact.address.state': new RegExp(state, 'i'),
    'contact.address.country': country,
    isActive: true,
    isPublished: true
  });
};

/**
 * Find restaurants near coordinates
 */
restaurantSchema.statics.findNearby = function(latitude, longitude, radiusMiles = 10) {
  const radiusRadians = radiusMiles / 3963.2; // Earth's radius in miles
  
  return this.find({
    'contact.address.coordinates': {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusRadians]
      }
    },
    isActive: true,
    isPublished: true
  });
};

/**
 * Get restaurant statistics
 */
restaurantSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalRestaurants: { $sum: 1 },
        activeRestaurants: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        publishedRestaurants: {
          $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
        },
        totalTables: {
          $sum: { $size: '$tables' }
        },
        totalOrders: {
          $sum: '$stats.totalOrders'
        },
        totalRevenue: {
          $sum: '$stats.totalRevenue'
        }
      }
    }
  ]);
};

// Pre-validation middleware to check for duplicate restaurants per owner
restaurantSchema.pre('validate', async function(next) {
  try {
    // Only check for duplicates on new documents or when ownerId is modified
    if (this.isNew || this.isModified('ownerId')) {
      // Check if the owner already has an active or inactive restaurant
      const existingRestaurant = await this.constructor.findOne({
        ownerId: this.ownerId,
        status: { $in: ['active', 'inactive'] },
        _id: { $ne: this._id }
      });
      
      if (existingRestaurant) {
        const error = new Error(`Owner already has a restaurant: ${existingRestaurant.name}`);
        error.code = 'DUPLICATE_RESTAURANT';
        return next(error);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware
restaurantSchema.pre('save', async function(next) {
  try {
    // Generate slug if not provided or if name changed
    if (this.isNew || this.isModified('name')) {
      if (!this.slug) {
        let baseSlug = this.generateSlug();
        let slug = baseSlug;
        let counter = 1;
        
        // Check for uniqueness with a more robust approach
        while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
          
          // Prevent infinite loops in case of issues
          if (counter > 1000) {
            // Fallback to timestamp-based slug
            const timestamp = Date.now().toString(36);
            slug = `${baseSlug}-${timestamp}`;
            break;
          }
        }
        
        this.slug = slug;
      }
    }
    
    // Initialize media structure if needed
    if (this.isNew && (!this.media || !this.media.images)) {
      if (!this.media) {
        this.media = { images: [] };
      }
      if (!this.media.images) {
        this.media.images = [];
      }
    }
    
    // Auto-sync subscription plan with actual subscription data
    if (this.subscriptionId && (this.isNew || this.isModified('subscriptionId'))) {
      try {
        const Subscription = require('./Subscription');
        const subscription = await Subscription.findById(this.subscriptionId);
        
        if (subscription && subscription.planKey) {
          let subscriptionPlan = 'free'; // default
          
          // Map subscription planKey to restaurant subscriptionPlan
          switch (subscription.planKey) {
            case 'restaurant_enterprise':
            case 'restaurant_premium':
              subscriptionPlan = 'premium';
              break;
            case 'restaurant_professional':
            case 'restaurant_advanced':
              subscriptionPlan = 'advanced';
              break;
            case 'restaurant_starter':
            case 'restaurant_basic':
              subscriptionPlan = 'basic';
              break;
            case 'restaurant_free':
            case 'free_plan':
            default:
              subscriptionPlan = 'free';
              break;
          }
          
          // Only update if it's different to prevent unnecessary saves
          if (this.subscriptionPlan !== subscriptionPlan) {
            this.subscriptionPlan = subscriptionPlan;
            
            console.log('🔄 Auto-syncing subscription plan:', {
              restaurantId: this._id,
              subscriptionPlanKey: subscription.planKey,
              mappedSubscriptionPlan: subscriptionPlan
            });
          }
        }
      } catch (error) {
        console.warn('Failed to sync subscription plan:', error.message);
        // Don't fail the save operation for sync errors
      }
    }
    
    // Ensure at least one table exists
    if (this.isNew && this.tables.length === 0) {
      // Use a temporary slug for QR generation if slug is not yet set
      const slugForQR = this.slug || this.generateSlug();
      const qrData = `${process.env.FRONTEND_URL}/order/${slugForQR}?table=1`;
      this.tables.push({
        number: '1',
        capacity: 4,
        qrCode: {
          data: qrData
        }
      });
    }
    
    // Update QR codes if slug changed
    if (this.isModified('slug')) {
      this.tables.forEach(table => {
        table.qrCode.data = `${process.env.FRONTEND_URL}/order/${this.slug}?table=${table.number}`;
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Create and export model
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;