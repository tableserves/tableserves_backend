const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * User Schema
 * Supports multiple user roles: admin, restaurant_owner, zone_admin, zone_shop, zone_vendor
 */
const userSchema = new Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, 'Please provide a valid email']
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^[\\+]?[1-9][\\d]{0,15}$/, 'Please provide a valid phone number']
  },
  
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  
  // User Role
  role: {
    type: String,
    enum: {
      values: ['admin', 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'],
      message: 'Invalid user role'
    },
    required: [true, 'User role is required'],
    default: 'restaurant_owner'
  },
  
  // Account Status
  status: {
    type: String,
    enum: {
      values: ['pending', 'active', 'inactive', 'suspended'],
      message: 'Invalid account status'
    },
    default: 'pending'
  },
  
  // Verification Status
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  phoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Email Verification
  emailVerificationToken: {
    type: String,
    select: false // Don't include in queries by default
  },
  
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  // Phone Verification
  phoneOTP: {
    type: String,
    select: false
  },
  
  phoneOTPExpires: {
    type: Date,
    select: false
  },
  
  // Password Reset
  passwordResetToken: {
    type: String,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  // Security
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  
  lastFailedLogin: {
    type: Date
  },
  
  lastLogin: {
    type: Date
  },
  
  // Profile Information
  profile: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    
    avatar: {
      type: String // Cloudinary URL
    },
    
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'US'
      }
    },
    
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value < new Date();
        },
        message: 'Date of birth cannot be in the future'
      }
    },
    
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    
    website: {
      type: String
    },
    
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String
    }
  },
  
  // Settings
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    
    privacy: {
      profileVisible: {
        type: Boolean,
        default: true
      },
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: false
      }
    },
    
    preferences: {
      language: {
        type: String,
        enum: ['en', 'es', 'fr', 'de', 'it', 'pt'],
        default: 'en'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      currency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        default: 'USD'
      }
    }
  },
  
  // Subscription Reference (will be populated)
  subscription: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  
  // Refresh Tokens (for JWT)
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      platform: String
    }
  }],
  
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
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.passwordHash;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.phoneOTP;
      delete ret.phoneOTPExpires;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.refreshTokens;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      // Remove sensitive fields from object output
      delete ret.passwordHash;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.phoneOTP;
      delete ret.phoneOTPExpires;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.refreshTokens;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ emailVerified: 1, phoneVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.profile?.name || this.email.split('@')[0];
});

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Instance Methods

/**
 * Check if account is locked due to failed login attempts
 */
userSchema.methods.isAccountLocked = function() {
  const maxAttempts = 5;
  const lockDuration = 30 * 60 * 1000; // 30 minutes
  
  if (this.failedLoginAttempts >= maxAttempts && this.lastFailedLogin) {
    const timeSinceLastAttempt = Date.now() - this.lastFailedLogin.getTime();
    return timeSinceLastAttempt < lockDuration;
  }
  
  return false;
};

/**
 * Increment failed login attempts
 */
userSchema.methods.incrementFailedAttempts = function() {
  this.failedLoginAttempts += 1;
  this.lastFailedLogin = new Date();
  return this.save();
};

/**
 * Reset failed login attempts
 */
userSchema.methods.resetFailedAttempts = function() {
  this.failedLoginAttempts = 0;
  this.lastFailedLogin = undefined;
  this.lastLogin = new Date();
  return this.save();
};

/**
 * Add refresh token
 */
userSchema.methods.addRefreshToken = function(token, expiresAt, deviceInfo = {}) {
  // Remove old expired tokens
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
  
  // Add new token
  this.refreshTokens.push({
    token,
    expiresAt,
    deviceInfo
  });
  
  return this.save();
};

/**
 * Remove refresh token
 */
userSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

/**
 * Remove all refresh tokens (logout from all devices)
 */
userSchema.methods.removeAllRefreshTokens = function() {
  this.refreshTokens = [];
  return this.save();
};

/**
 * Check if user has specific permission based on role
 */
userSchema.methods.hasPermission = function(permission) {
  const rolePermissions = {
    admin: ['*'], // All permissions
    restaurant_owner: ['manage_restaurant', 'manage_menu', 'view_orders', 'manage_tables'],
    zone_admin: ['manage_zone', 'manage_vendors', 'manage_shops', 'view_analytics'],
    zone_shop: ['manage_shop', 'manage_shop_menu', 'view_shop_orders'],
    zone_vendor: ['view_vendor_data', 'manage_vendor_profile']
  };
  
  const userPermissions = rolePermissions[this.role] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
};

// Static Methods

/**
 * Find user by email or phone
 */
userSchema.statics.findByEmailOrPhone = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  });
};

/**
 * Find users by role
 */
userSchema.statics.findByRole = function(role) {
  return this.find({ role, status: 'active' });
};

/**
 * Get user statistics
 */
userSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        verified: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$emailVerified', true] },
                  { $eq: ['$phoneVerified', true] }
                ]
              }, 
              1, 
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        role: '$_id',
        _id: 0,
        count: 1,
        active: 1,
        verified: 1,
        activePercentage: {
          $round: [{ $multiply: [{ $divide: ['$active', '$count'] }, 100] }, 2]
        },
        verifiedPercentage: {
          $round: [{ $multiply: [{ $divide: ['$verified', '$count'] }, 100] }, 2]
        }
      }
    }
  ]);
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  // Clean up expired refresh tokens
  if (this.refreshTokens && this.refreshTokens.length > 0) {
    this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
  }
  
  next();
});

// Create and export model
const User = mongoose.model('User', userSchema);

module.exports = User;