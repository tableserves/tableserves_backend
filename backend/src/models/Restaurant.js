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
    required: [true, 'Owner ID is required'],
    index: true
  },
  
  // Subscription Reference
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: [true, 'Subscription ID is required']
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
      match: [/^[\\+]?[1-9][\\d]{0,15}$/, 'Please provide a valid phone number']
    },
    
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, 'Please provide a valid email']
    },
    
    website: {
      type: String,
      trim: true
    }
  },
  
  // Media
  media: {
    logo: {
      type: String // Cloudinary URL
    },
    
    images: [{
      url: {
        type: String,
        required: true
      },
      caption: {
        type: String,
        maxlength: [200, 'Image caption cannot exceed 200 characters']
      },
      isPrimary: {
        type: Boolean,
        default: false
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    
    banner: {
      type: String // Cloudinary URL
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
      trim: true,
      description: 'Optional table name (e.g., \"Window Table\", \"Private Booth\")'
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
        required: [true, 'QR code data is required'],
        description: 'URL that the QR code points to'
      },
      imageUrl: {
        type: String,
        description: 'Cloudinary URL of the generated QR code image'
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
          type: String,
          description: 'Logo to embed in QR code'
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
        trim: true,
        description: 'Restaurant section (e.g., \"Main Dining\", \"Patio\", \"Bar\")'
      },
      coordinates: {
        x: Number,
        y: Number,
        description: 'Position on restaurant floor plan'
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
        default: 20,
        description: 'Estimated preparation time in minutes'
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
        default: false,
        description: 'Automatically accept orders without manual confirmation'
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
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        default: 'USD'
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
    default: false,
    description: 'Whether the restaurant menu is published and accessible'
  },
  
  isFeatured: {
    type: Boolean,
    default: false,
    description: 'Featured restaurants (for platform showcase)'
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
restaurantSchema.index({ ownerId: 1 });
restaurantSchema.index({ slug: 1 }, { unique: true });
restaurantSchema.index({ isActive: 1, isPublished: 1 });
restaurantSchema.index({ 'contact.address.city': 1 });
restaurantSchema.index({ 'contact.address.state': 1 });
restaurantSchema.index({ createdAt: -1 });
restaurantSchema.index({ 'stats.totalOrders': -1 });
restaurantSchema.index({ isFeatured: 1 });

// Compound indexes
restaurantSchema.index({ ownerId: 1, isActive: 1 });
restaurantSchema.index({ 'contact.address.city': 1, 'contact.address.state': 1 });

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

// Virtual for QR code URL
restaurantSchema.virtual('menuUrl').get(function() {
  return `${process.env.FRONTEND_URL}/menu/${this.slug}`;
});

// Instance Methods

/**
 * Generate slug from restaurant name
 */
restaurantSchema.methods.generateSlug = function() {
  let baseSlug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  // Ensure uniqueness will be handled by pre-save middleware
  return baseSlug;
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

// Pre-save middleware
restaurantSchema.pre('save', async function(next) {
  // Generate slug if not provided or if name changed
  if (this.isNew || this.isModified('name')) {
    if (!this.slug) {
      let baseSlug = this.generateSlug();
      let slug = baseSlug;
      let counter = 1;
      
      // Check for uniqueness
      while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      this.slug = slug;
    }
  }
  
  // Ensure at least one table exists
  if (this.isNew && this.tables.length === 0) {
    const qrData = `${process.env.FRONTEND_URL}/order/${this.slug}?table=1`;
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
});

// Create and export model
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;