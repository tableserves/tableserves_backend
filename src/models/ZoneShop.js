const mongoose = require('mongoose');

const ZoneShopSchema = new mongoose.Schema({
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Zone ID is required']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Shop owner/vendor is required']
  },
  name: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    minlength: [2, 'Shop name must be at least 2 characters'],
    maxlength: [100, 'Shop name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Shop category is required'],
    enum: {
      values: [
        'fast_food', 'beverages', 'desserts', 'chinese', 'indian', 'italian',
        'mexican', 'japanese', 'korean', 'thai', 'american', 'mediterranean',
        'vegetarian', 'vegan', 'halal', 'bakery', 'coffee', 'tea', 'juices',
        'snacks', 'pizza', 'burgers', 'sandwiches', 'salads', 'healthy',
        'breakfast', 'lunch', 'dinner', 'catering', 'other'
      ],
      message: 'Invalid shop category'
    }
  },
  contactInfo: {
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address'
      }
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      validate: {
        validator: function (phone) {
          return /^[+]?[1-9]\d{1,14}$/.test(phone);
        },
        message: 'Please provide a valid phone number'
      }
    },
    whatsapp: {
      type: String,
      validate: {
        validator: function (phone) {
          return !phone || /^[+]?[1-9]\d{1,14}$/.test(phone);
        },
        message: 'Please provide a valid WhatsApp number'
      }
    }
  },
  location: {
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
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
    }
  },
  // Media storage for images (logo, gallery, etc.)
  media: {
    images: [{
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      },
      imageType: {
        type: String,
        enum: ['logo', 'gallery', 'banner', 'menu'],
        default: 'gallery'
      },
      caption: {
        type: String,
        default: ''
      },
      altText: {
        type: String,
        default: ''
      },
      isPrimary: {
        type: Boolean,
        default: false
      },
      sortOrder: {
        type: Number,
        default: 0
      }
    }]
  },
  // Social media handles
  socialMedia: {
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (url) {
          if (!url) return true;
          return /^https?:\/\/.+/.test(url);
        },
        message: 'Website must be a valid URL'
      }
    },
    instagram: {
      type: String,
      trim: true
    },
    facebook: {
      type: String,
      trim: true
    }
  },
  logo: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
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
    }
  }],
  status: {
    type: String,
    enum: {
      values: ['pending', 'active', 'inactive', 'suspended', 'rejected'],
      message: 'Invalid shop status'
    },
    default: 'pending'
  },
  settings: {
    acceptOrders: {
      type: Boolean,
      default: true
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative']
    },
    estimatedPreparationTime: {
      type: Number,
      default: 15,
      min: [1, 'Preparation time must be at least 1 minute'],
      max: [120, 'Preparation time cannot exceed 120 minutes']
    },
    maxOrdersPerHour: {
      type: Number,
      default: 20,
      min: [1, 'Must accept at least 1 order per hour']
    },
    deliveryOptions: {
      pickup: {
        type: Boolean,
        default: true
      },
      delivery: {
        type: Boolean,
        default: false
      },
      dineIn: {
        type: Boolean,
        default: false
      }
    },
    paymentMethods: {
      cash: {
        type: Boolean,
        default: true
      },
      card: {
        type: Boolean,
        default: false
      },
      digital: {
        type: Boolean,
        default: false
      }
    },
    operatingHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' }
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' }
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' }
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' }
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' }
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' }
      },
      sunday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' }
      }
    }
  },
  qrCode: {
    type: String,
    default: null
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative']
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
    totalMenuItems: {
      type: Number,
      default: 0,
      min: [0, 'Total menu items cannot be negative']
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Average order value cannot be negative']
    },
    lastOrderDate: {
      type: Date,
      default: null
    }
  },
  verificationStatus: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verificationNotes: {
      type: String,
      default: ''
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
ZoneShopSchema.index({ zoneId: 1, status: 1 });
ZoneShopSchema.index({ ownerId: 1, status: 1 });
ZoneShopSchema.index({ category: 1, status: 1 });
ZoneShopSchema.index({ featured: 1, status: 1, sortOrder: 1 });
ZoneShopSchema.index({ 'rating.average': -1, status: 1 });
ZoneShopSchema.index({ name: 'text', description: 'text', tags: 'text' });
ZoneShopSchema.index({ createdAt: -1 });

// Virtual for menu items count
ZoneShopSchema.virtual('menuItemsCount', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'shopId',
  count: true
});

// Virtual for active menu items count
ZoneShopSchema.virtual('activeMenuItemsCount', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'shopId',
  count: true,
  match: { available: true }
});

// Pre-save middleware to generate QR code data
ZoneShopSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('name') || this.isModified('zoneId')) {
    // Generate QR code data structure
    const qrData = {
      type: 'shop',
      id: this._id.toString(),
      zoneId: this.zoneId.toString(),
      name: this.name,
      category: this.category,
      timestamp: Date.now()
    };
    this.qrCode = JSON.stringify(qrData);
  }
  next();
});

// Pre-save middleware to update zone shop count
ZoneShopSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const Zone = mongoose.model('Zone');
      await Zone.findByIdAndUpdate(
        this.zoneId,
        { $inc: { 'stats.totalShops': 1 } }
      );
    } catch (error) {
      console.error('Error updating zone shop count:', error);
    }
  }
  next();
});

// Post-remove middleware to update zone shop count
ZoneShopSchema.post('remove', async function () {
  try {
    const Zone = mongoose.model('Zone');
    await Zone.findByIdAndUpdate(
      this.zoneId,
      { $inc: { 'stats.totalShops': -1 } }
    );
  } catch (error) {
    console.error('Error updating zone shop count after removal:', error);
  }
});

// Instance method to check if shop is currently open
ZoneShopSchema.methods.isCurrentlyOpen = function () {
  if (this.status !== 'active' || !this.settings.acceptOrders) {
    return false;
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

  const daySettings = this.settings.operatingHours[currentDay];

  if (!daySettings || !daySettings.isOpen) {
    return false;
  }

  return currentTime >= daySettings.openTime && currentTime <= daySettings.closeTime;
};

// Instance method to update rating
ZoneShopSchema.methods.updateRating = function (newRating) {
  const currentTotal = this.rating.average * this.rating.totalReviews;
  const newTotal = currentTotal + newRating;
  const newReviewCount = this.rating.totalReviews + 1;

  this.rating.average = Math.round((newTotal / newReviewCount) * 10) / 10; // Round to 1 decimal
  this.rating.totalReviews = newReviewCount;

  return this.save();
};

// Instance method to update stats
ZoneShopSchema.methods.updateStats = function (statsUpdate) {
  if (statsUpdate.totalOrders !== undefined) {
    this.stats.totalOrders = Math.max(0, this.stats.totalOrders + statsUpdate.totalOrders);
  }
  if (statsUpdate.totalRevenue !== undefined) {
    this.stats.totalRevenue = Math.max(0, this.stats.totalRevenue + statsUpdate.totalRevenue);
  }
  if (statsUpdate.totalMenuItems !== undefined) {
    this.stats.totalMenuItems = Math.max(0, statsUpdate.totalMenuItems);
  }
  if (statsUpdate.lastOrderDate) {
    this.stats.lastOrderDate = statsUpdate.lastOrderDate;
  }

  // Calculate average order value
  if (this.stats.totalOrders > 0) {
    this.stats.averageOrderValue = Math.round((this.stats.totalRevenue / this.stats.totalOrders) * 100) / 100;
  }

  return this.save();
};

// Instance method to toggle status
ZoneShopSchema.methods.toggleStatus = function (newStatus, notes = '') {
  const validStatuses = ['active', 'inactive', 'suspended'];

  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid status');
  }

  this.status = newStatus;

  if (newStatus === 'suspended' && notes) {
    this.verificationStatus.verificationNotes = notes;
  }

  return this.save();
};

// Static method to find shops by zone
ZoneShopSchema.statics.findByZone = function (zoneId, options = {}) {
  const query = { zoneId };

  if (options.status) {
    query.status = options.status;
  } else {
    query.status = { $in: ['active', 'inactive'] };
  }

  if (options.category) {
    query.category = options.category;
  }

  if (options.featured !== undefined) {
    query.featured = options.featured;
  }

  return this.find(query)
    .populate('ownerId', 'profile.name email phone')
    .populate('zoneId', 'name location')
    .sort(options.sort || { featured: -1, 'rating.average': -1, sortOrder: 1 });
};

// Static method to find shops by owner
ZoneShopSchema.statics.findByOwner = function (ownerId, options = {}) {
  const query = { ownerId };

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate('zoneId', 'name location adminId')
    .sort(options.sort || { createdAt: -1 });
};

// Static method to search shops
ZoneShopSchema.statics.searchShops = function (searchTerm, zoneId = null, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: 'active'
  };

  if (zoneId) {
    query.zoneId = zoneId;
  }

  if (options.category) {
    query.category = options.category;
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('zoneId', 'name location')
    .sort({ score: { $meta: 'textScore' }, 'rating.average': -1 });
};

// Static method to get top-rated shops
ZoneShopSchema.statics.getTopRated = function (zoneId = null, limit = 10) {
  const query = {
    status: 'active',
    'rating.totalReviews': { $gte: 5 } // At least 5 reviews
  };

  if (zoneId) {
    query.zoneId = zoneId;
  }

  return this.find(query)
    .populate('zoneId', 'name location')
    .sort({ 'rating.average': -1, 'rating.totalReviews': -1 })
    .limit(limit);
};

// Static method to get shop statistics
ZoneShopSchema.statics.getShopStatistics = async function (zoneId = null) {
  const matchStage = zoneId ? { zoneId: mongoose.Types.ObjectId(zoneId) } : {};

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalShops: { $sum: 1 },
        activeShops: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalOrders: { $sum: '$stats.totalOrders' },
        totalRevenue: { $sum: '$stats.totalRevenue' },
        averageRating: { $avg: '$rating.average' },
        categoryCounts: {
          $push: '$category'
        }
      }
    }
  ]);

  return stats[0] || {
    totalShops: 0,
    activeShops: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    categoryCounts: []
  };
};

// Note: Indexes are already defined above to avoid duplicates

module.exports = mongoose.model('ZoneShop', ZoneShopSchema);