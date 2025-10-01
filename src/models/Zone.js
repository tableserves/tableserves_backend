const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Zone admin is required']
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: [true, 'Subscription is required']
  },
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    trim: true,
    minlength: [2, 'Zone name must be at least 2 characters'],
    maxlength: [100, 'Zone name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  location: {
    type: String,
    required: false, // Make location optional
    trim: true,
    minlength: [5, 'Location must be at least 5 characters'],
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  contactInfo: {
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      validate: {
        validator: function(email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address'
      }
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      validate: {
        validator: function(phone) {
          // Allow various phone number formats including international ones
          return /^[+]?[\d\s\-\(\)]{10,15}$/.test(phone);
        },
        message: 'Please provide a valid phone number'
      }
    }
  },
  settings: {
    theme: {
      primaryColor: {
        type: String,
        default: '#2563eb'
      },
      secondaryColor: {
        type: String,
        default: '#64748b'
      },
      logoUrl: {
        type: String,
        default: null
      }
    },
    orderSettings: {
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
        default: 50,
        min: [1, 'Must accept at least 1 order per hour']
      }
    },
    paymentSettings: {
      acceptCash: {
        type: Boolean,
        default: true
      },
      acceptCards: {
        type: Boolean,
        default: false
      },
      acceptDigitalPayments: {
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
    id: {
      type: String,
      unique: true,
      sparse: true
    },
    url: {
      type: String
    },
    dataUrl: {
      type: String
    },
    generatedAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  stats: {
    totalShops: {
      type: Number,
      default: 0,
      min: [0, 'Total shops cannot be negative']
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
  
  maxVendors: {
    type: Number,
    min: [1, 'Max vendors must be at least 1']
  },
  
  paymentConfig: {
    upiId: {
      type: String,
      trim: true
    },
    paymentModel: {
      type: String,
      enum: ['shop-wise', 'zone-wise'],
      default: 'shop-wise'
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
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Media storage for images (logo, cover, etc.)
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
        enum: ['logo', 'cover', 'banner', 'gallery'],
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
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    logo: {
      type: String, // Backward compatibility - deprecated
      default: null
    }
  },
  
  // Additional tracking fields
  tables: {
    type: Number,
    default: 0
  },
  
  revenue: {
    type: String,
    default: '₹0'
  },
  
  orders: {
    type: Number,
    default: 0
  },
  
  vendorCount: {
    type: Number,
    default: 0
  },
  
  lastActive: {
    type: Date,
    default: null
  },
  
  slug: {
    type: String,
    trim: true
  },
  
  loginCredentials: {
    username: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      trim: true
    },
    lastLogin: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ZoneSchema.index({ adminId: 1 });
ZoneSchema.index({ subscriptionId: 1 });
ZoneSchema.index({ active: 1 });
ZoneSchema.index({ adminId: 1, active: 1 });
ZoneSchema.index({ location: 'text', name: 'text', description: 'text' });
ZoneSchema.index({ createdAt: -1 });

// Virtual for shops count
ZoneSchema.virtual('shopsCount', {
  ref: 'ZoneShop',
  localField: '_id',
  foreignField: 'zoneId',
  count: true
});

// Virtual for active shops count
ZoneSchema.virtual('activeShopsCount', {
  ref: 'ZoneShop',
  localField: '_id',
  foreignField: 'zoneId',
  count: true,
  match: { status: 'active' }
});

// Pre-save middleware to generate QR code data
ZoneSchema.pre('save', function(next) {
  // Any additional validation can be added here
  next();
});

// Pre-save middleware for subscription sync (NEW)
ZoneSchema.pre('save', async function(next) {
  try {
    // Auto-sync subscription plan with actual subscription data
    if (this.subscriptionId && (this.isNew || this.isModified('subscriptionId'))) {
      try {
        const Subscription = require('./Subscription');
        const subscription = await Subscription.findById(this.subscriptionId);
        
        if (subscription && subscription.planKey) {
          let subscriptionPlan = 'free'; // default
          
          // Map subscription planKey to zone subscriptionPlan
          switch (subscription.planKey) {
            case 'zone_enterprise':
            case 'zone_premium':
              subscriptionPlan = 'premium';
              break;
            case 'zone_professional':
            case 'zone_advanced':
              subscriptionPlan = 'advanced';
              break;
            case 'zone_starter':
            case 'zone_basic':
              subscriptionPlan = 'basic';
              break;
            case 'zone_free':
            case 'free_plan':
            default:
              subscriptionPlan = 'free';
              break;
          }
          
          // Only update if it's different to prevent unnecessary saves
          if (this.subscriptionPlan !== subscriptionPlan) {
            this.subscriptionPlan = subscriptionPlan;
            
            console.log('🔄 Auto-syncing zone subscription plan:', {
              zoneId: this._id,
              subscriptionPlanKey: subscription.planKey,
              mappedSubscriptionPlan: subscriptionPlan
            });
          }
        }
      } catch (error) {
        console.warn('Failed to sync zone subscription plan:', error.message);
        // Don't fail the save operation for sync errors
      }
    }
    
    // Sync ownerName with user profile name if not set or if adminId changed
    if (this.isNew || this.isModified('adminId') || !this.ownerName) {
      try {
        const User = require('./User');
        const admin = await User.findById(this.adminId);
        if (admin && admin.profile?.name) {
          this.ownerName = admin.profile.name;
        } else if (admin && admin.username) {
          this.ownerName = admin.username;
        }
      } catch (error) {
        console.warn('Failed to sync zone admin name from user profile:', error.message);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check if zone is currently open
ZoneSchema.methods.isCurrentlyOpen = function() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
  
  const daySettings = this.settings.operatingHours[currentDay];
  
  if (!daySettings || !daySettings.isOpen) {
    return false;
  }
  
  return currentTime >= daySettings.openTime && currentTime <= daySettings.closeTime;
};

// Instance method to get operating hours for a specific day
ZoneSchema.methods.getOperatingHours = function(day) {
  const dayKey = day.toLowerCase();
  return this.settings.operatingHours[dayKey] || null;
};

// Instance method to update stats
ZoneSchema.methods.updateStats = function(statsUpdate) {
  if (statsUpdate.totalShops !== undefined) {
    this.stats.totalShops = Math.max(0, statsUpdate.totalShops);
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

// Static method to find zones by admin
ZoneSchema.statics.findByAdmin = function(adminId, options = {}) {
  const query = { adminId, active: true };
  
  if (options.includeInactive) {
    delete query.active;
  }
  
  return this.find(query)
    .populate('adminId', 'profile.name email')
    .populate('subscriptionId', 'planType features limits status')
    .sort(options.sort || { createdAt: -1 });
};

// Static method to find zones in specific location
ZoneSchema.statics.findByLocation = function(location, radius = 10) {
  return this.find({
    location: { $regex: location, $options: 'i' },
    active: true
  }).populate('adminId', 'profile.name email');
};

// Static method to get zone statistics
ZoneSchema.statics.getZoneStatistics = async function() {
  const stats = await this.aggregate([
    {
      $match: { active: true }
    },
    {
      $group: {
        _id: null,
        totalZones: { $sum: 1 },
        totalShops: { $sum: '$stats.totalShops' },
        totalOrders: { $sum: '$stats.totalOrders' },
        totalRevenue: { $sum: '$stats.totalRevenue' },
        averageShopsPerZone: { $avg: '$stats.totalShops' }
      }
    }
  ]);
  
  return stats[0] || {
    totalZones: 0,
    totalShops: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageShopsPerZone: 0
  };
};

module.exports = mongoose.model('Zone', ZoneSchema);