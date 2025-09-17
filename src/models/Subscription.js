const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Subscription Schema
 * Manages user subscriptions and feature access for the multi-tenant platform
 */
const subscriptionSchema = new Schema({
  // User Reference
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Plan Information
  planKey: {
    type: String,
    required: [true, 'Plan key is required'],
    enum: {
      values: [
        // FREE Plans
        'free_plan',
        // Restaurant Plans
        'restaurant_free', 'restaurant_basic', 'restaurant_advanced', 'restaurant_premium',
        'restaurant_starter', 'restaurant_professional', 'restaurant_enterprise', // Legacy support
        // Zone Plans
        'zone_free', 'zone_basic', 'zone_advanced', 'zone_premium',
        'zone_professional', 'zone_enterprise', // Legacy support
        // Admin Plans
        'admin_platform'
      ],
      message: 'Invalid plan key'
    }
  },

  planType: {
    type: String,
    required: [true, 'Plan type is required'],
    enum: {
      values: ['restaurant', 'zone', 'admin'],
      message: 'Invalid plan type'
    }
  },

  planName: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },

  // Feature Access
  features: {
    // Core Features
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

    vendorManagement: {
      type: Boolean,
      default: false,
      description: 'Manage vendors in zones'
    },

    analytics: {
      type: Boolean,
      default: false,
      description: 'Access to analytics and reports'
    },

    qrCustomization: {
      type: Boolean,
      default: false,
      description: 'Customize QR code appearance'
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

    unlimited: {
      type: Boolean,
      default: false,
      description: 'Unlimited usage (enterprise plans)'
    },

    // Advanced Features
    multiLocation: {
      type: Boolean,
      default: false,
      description: 'Multiple restaurant/zone locations'
    },

    advancedReporting: {
      type: Boolean,
      default: false,
      description: 'Advanced reporting and insights'
    },

    apiAccess: {
      type: Boolean,
      default: false,
      description: 'API access for integrations'
    },

    whiteLabel: {
      type: Boolean,
      default: false,
      description: 'White label solution'
    },

    prioritySupport: {
      type: Boolean,
      default: false,
      description: 'Priority customer support'
    },

    customBranding: {
      type: Boolean,
      default: false,
      description: 'Custom branding and themes'
    }
  },

  // Usage Limits
  limits: {
    maxTables: {
      type: Number,
      default: 10,
      validate: {
        validator: function(value) {
          return value >= 0 || value === -1; // Allow -1 for unlimited
        },
        message: 'Cannot be negative (use -1 for unlimited)'
      },
      description: 'Maximum number of tables (restaurant plans)'
    },

    maxShops: {
      type: Number,
      default: 5,
      validate: {
        validator: function(value) {
          return value >= 0 || value === -1; // Allow -1 for unlimited
        },
        message: 'Cannot be negative (use -1 for unlimited)'
      },
      description: 'Maximum number of shops (zone plans)'
    },

    maxVendors: {
      type: Number,
      default: 10,
      validate: {
        validator: function(value) {
          return value >= 0 || value === -1; // Allow -1 for unlimited
        },
        message: 'Cannot be negative (use -1 for unlimited)'
      },
      description: 'Maximum number of vendors (zone plans)'
    },

    maxCategories: {
      type: Number,
      default: 20,
      validate: {
        validator: function(value) {
          return value >= 1 || value === -1; // Allow -1 for unlimited
        },
        message: 'Must have at least 1 category (use -1 for unlimited)'
      },
      description: 'Maximum number of menu categories'
    },

    maxMenuItems: {
      type: Number,
      default: 100,
      validate: {
        validator: function(value) {
          return value >= 1 || value === -1; // Allow -1 for unlimited
        },
        message: 'Must have at least 1 menu item (use -1 for unlimited)'
      },
      description: 'Maximum number of menu items'
    },

    maxUsers: {
      type: Number,
      default: 5,
      min: [1, 'Must have at least 1 user'],
      description: 'Maximum number of staff users'
    },

    maxOrdersPerMonth: {
      type: Number,
      default: 1000,
      validate: {
        validator: function(value) {
          return value >= 1 || value === -1; // Allow -1 for unlimited
        },
        message: 'Must allow at least 1 order (use -1 for unlimited)'
      },
      description: 'Maximum orders per month'
    },

    maxStorageGB: {
      type: Number,
      default: 5,
      min: [1, 'Must have at least 1GB storage'],
      description: 'Maximum storage in GB for images'
    }
  },

  // Pricing
  pricing: {
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },

    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: {
        values: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'],
        message: 'Invalid currency'
      },
      default: 'USD'
    },

    interval: {
      type: String,
      required: [true, 'Billing interval is required'],
      enum: {
        values: ['monthly', 'yearly', 'lifetime'],
        message: 'Invalid billing interval'
      },
      default: 'monthly'
    },

    trialDays: {
      type: Number,
      default: 14,
      min: [0, 'Trial days cannot be negative'],
      max: [365, 'Trial period cannot exceed 365 days']
    }
  },

  // Subscription Status
  status: {
    type: String,
    required: [true, 'Subscription status is required'],
    enum: {
      values: ['active', 'trial', 'expired', 'cancelled', 'suspended', 'pending'],
      message: 'Invalid subscription status'
    },
    default: 'trial'
  },

  // Dates
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function (value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },

  trialEndDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return !value || value > this.startDate;
      },
      message: 'Trial end date must be after start date'
    }
  },

  // Payment Information
  payment: {
    lastPaymentDate: {
      type: Date
    },

    nextPaymentDate: {
      type: Date
    },

    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto'],
      description: 'Payment method used'
    },

    paymentProvider: {
      type: String,
      enum: ['stripe', 'paypal', 'square', 'manual'],
      description: 'Payment processor used'
    },

    externalSubscriptionId: {
      type: String,
      description: 'External subscription ID from payment provider'
    },

    paymentHistory: [{
      date: {
        type: Date,
        default: Date.now
      },
      amount: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      transactionId: String,
      description: String
    }]
  },

  // Usage Tracking
  usage: {
    currentTables: {
      type: Number,
      default: 0,
      min: [0, 'Current tables cannot be negative']
    },

    currentShops: {
      type: Number,
      default: 0,
      min: [0, 'Current shops cannot be negative']
    },

    currentVendors: {
      type: Number,
      default: 0,
      min: [0, 'Current vendors cannot be negative']
    },

    currentCategories: {
      type: Number,
      default: 0,
      min: [0, 'Current categories cannot be negative']
    },

    currentMenuItems: {
      type: Number,
      default: 0,
      min: [0, 'Current menu items cannot be negative']
    },

    currentUsers: {
      type: Number,
      default: 1,
      min: [1, 'Must have at least 1 user']
    },

    ordersThisMonth: {
      type: Number,
      default: 0,
      min: [0, 'Orders this month cannot be negative']
    },

    storageUsedGB: {
      type: Number,
      default: 0,
      min: [0, 'Storage used cannot be negative']
    },

    lastUsageUpdate: {
      type: Date,
      default: Date.now
    }
  },

  // Subscription Changes
  pendingChanges: {
    newPlanKey: String,
    changeDate: Date,
    reason: String,
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Notes and History
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false,
      description: 'Internal notes not visible to customer'
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
subscriptionSchema.index({ userId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ planKey: 1 });
subscriptionSchema.index({ planType: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ trialEndDate: 1 });
subscriptionSchema.index({ 'payment.nextPaymentDate': 1 });
subscriptionSchema.index({ createdAt: -1 });

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function () {
  if (this.status === 'expired' || this.status === 'cancelled') return 0;

  const endDate = this.status === 'trial' ? this.trialEndDate : this.endDate;
  if (!endDate) return 0;

  const now = new Date();
  const timeDiff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
});

// Virtual for trial status
subscriptionSchema.virtual('isTrialActive').get(function () {
  return this.status === 'trial' && this.trialEndDate && this.trialEndDate > new Date();
});

// Virtual for subscription active status
subscriptionSchema.virtual('isActive').get(function () {
  return ['active', 'trial'].includes(this.status) && this.endDate > new Date();
});

// Instance Methods

/**
 * Check if user can use a specific feature
 */
subscriptionSchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] === true;
};

/**
 * Check if user is within usage limits
 */
subscriptionSchema.methods.isWithinLimit = function (limitType, currentUsage = null) {
  if (this.features.unlimited) return true;

  const limit = this.limits[limitType];
  if (limit === null || limit === undefined) return true;

  const usage = currentUsage !== null ? currentUsage : this.usage[`current${limitType.charAt(0).toUpperCase() + limitType.slice(1)}`];
  return usage <= limit;
};

/**
 * Get usage percentage for a specific limit
 */
subscriptionSchema.methods.getUsagePercentage = function (limitType) {
  if (this.features.unlimited) return 0;

  const limit = this.limits[limitType];
  if (!limit) return 0;

  const usage = this.usage[`current${limitType.charAt(0).toUpperCase() + limitType.slice(1)}`] || 0;
  return Math.round((usage / limit) * 100);
};

/**
 * Update usage statistics
 */
subscriptionSchema.methods.updateUsage = function (usageData) {
  Object.keys(usageData).forEach(key => {
    if (this.usage[key] !== undefined) {
      this.usage[key] = usageData[key];
    }
  });
  this.usage.lastUsageUpdate = new Date();
  return this.save();
};

/**
 * Add payment record
 */
subscriptionSchema.methods.addPayment = function (paymentData) {
  this.payment.paymentHistory.push(paymentData);

  if (paymentData.status === 'completed') {
    this.payment.lastPaymentDate = paymentData.date || new Date();

    // Calculate next payment date based on interval
    const nextPayment = new Date(this.payment.lastPaymentDate);
    if (this.pricing.interval === 'monthly') {
      nextPayment.setMonth(nextPayment.getMonth() + 1);
    } else if (this.pricing.interval === 'yearly') {
      nextPayment.setFullYear(nextPayment.getFullYear() + 1);
    }
    this.payment.nextPaymentDate = nextPayment;
  }

  return this.save();
};

/**
 * Add note to subscription
 */
subscriptionSchema.methods.addNote = function (content, createdBy, isInternal = false) {
  this.notes.push({
    content,
    createdBy,
    isInternal
  });
  return this.save();
};

/**
 * Check if subscription needs renewal
 */
subscriptionSchema.methods.needsRenewal = function () {
  if (this.pricing.interval === 'lifetime') return false;

  const now = new Date();
  const warningDays = 7; // Warn 7 days before expiry
  const warningDate = new Date(this.endDate.getTime() - (warningDays * 24 * 60 * 60 * 1000));

  return now >= warningDate && this.status === 'active';
};

// Static Methods

/**
 * Get subscription statistics
 */
subscriptionSchema.statics.getStatistics = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          planType: '$planType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'active'] },
              '$pricing.amount',
              0
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.planType',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalRevenue: { $sum: '$totalRevenue' }
      }
    }
  ]);
};

/**
 * Find expiring subscriptions
 */
subscriptionSchema.statics.findExpiring = function (days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: 'active',
    endDate: { $lte: futureDate },
    'pricing.interval': { $ne: 'lifetime' }
  }).populate('userId', 'email profile.name');
};

/**
 * Find trial subscriptions
 */
subscriptionSchema.statics.findTrials = function () {
  return this.find({
    status: 'trial'
  }).populate('userId', 'email profile.name');
};

// Pre-save middleware
subscriptionSchema.pre('save', function (next) {
  // Calculate trial end date if not set
  if (this.isNew && !this.trialEndDate && this.pricing.trialDays > 0) {
    this.trialEndDate = new Date(this.startDate.getTime() + (this.pricing.trialDays * 24 * 60 * 60 * 1000));
  }

  // Update subscription status based on dates
  const now = new Date();

  if (this.status === 'trial' && this.trialEndDate && now > this.trialEndDate) {
    this.status = 'expired';
  } else if (this.status === 'active' && now > this.endDate) {
    this.status = 'expired';
  }

  next();
});

// Note: Indexes are already defined above to avoid duplicates

// Create and export model
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;