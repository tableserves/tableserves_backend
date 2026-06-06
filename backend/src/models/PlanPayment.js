const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * PlanPayment Schema
 * Tracks all payment transactions for plan upgrades
 */
const planPaymentSchema = new Schema({
  // User and Plan References
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    required: [true, 'Plan ID is required'],
    index: true
  },

  // Razorpay Payment Details
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    unique: true,
    index: true
  },

  razorpayPaymentId: {
    type: String,
    default: null,
    index: true
  },

  razorpaySignature: {
    type: String,
    default: null
  },

  // Payment Amount Information
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative'],
    set: function(value) {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
  },

  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'INR',
    enum: ['INR', 'USD'],
    uppercase: true
  },

  // Tax Information
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative'],
    set: function(value) {
      return Math.round(value * 100) / 100;
    }
  },

  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
    set: function(value) {
      return Math.round(value * 100) / 100;
    }
  },

  // Payment Status
  status: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
      message: 'Invalid payment status'
    },
    default: 'pending',
    index: true
  },

  // Payment Method Information
  paymentMethod: {
    type: String,
    default: null
  },

  // Receipt Information
  receipt: {
    type: String,
    required: [true, 'Receipt is required'],
    unique: true // This creates an index automatically
  },

  // Plan Activation Details
  planStartDate: {
    type: Date,
    default: null
  },

  planEndDate: {
    type: Date,
    default: null
  },

  // Failure Information
  failureReason: {
    type: String,
    default: null
  },

  errorCode: {
    type: String,
    default: null
  },

  errorDescription: {
    type: String,
    default: null
  },

  // Webhook Information
  webhookReceived: {
    type: Boolean,
    default: false
  },

  webhookData: {
    type: Schema.Types.Mixed,
    default: null
  },

  // Verification Information
  signatureVerified: {
    type: Boolean,
    default: false
  },

  verificationAttempts: {
    type: Number,
    default: 0,
    min: [0, 'Verification attempts cannot be negative']
  },

  // Metadata
  metadata: {
    userAgent: {
      type: String,
      default: null
    },

    ipAddress: {
      type: String,
      default: null
    },

    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },

    notes: {
      type: String,
      default: null
    }
  },

  // Expiry Information
  expiresAt: {
    type: Date,
    required: [true, 'Payment expiry is required'],
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
planPaymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
planPaymentSchema.index({ planId: 1, status: 1 });
planPaymentSchema.index({ status: 1, createdAt: -1 });
planPaymentSchema.index({ razorpayOrderId: 1, razorpayPaymentId: 1 });
// Note: receipt already has unique index from schema definition
// Note: expiresAt already has TTL index from schema definition

// Virtual for formatted amount
planPaymentSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN')}`;
});

// Virtual for formatted total amount
planPaymentSchema.virtual('formattedTotalAmount').get(function() {
  return `₹${this.totalAmount.toLocaleString('en-IN')}`;
});

// Virtual for payment duration (if plan is active)
planPaymentSchema.virtual('planDuration').get(function() {
  if (this.planStartDate && this.planEndDate) {
    const diffTime = Math.abs(this.planEndDate - this.planStartDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Virtual for payment age
planPaymentSchema.virtual('paymentAge').get(function() {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  return diffMinutes;
});

// Static method to find payments by user
planPaymentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate('planId', 'name key planType price')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to find successful payments
planPaymentSchema.statics.findSuccessfulPayments = function(options = {}) {
  const query = { status: 'paid' };
  
  if (options.userId) {
    query.userId = options.userId;
  }

  if (options.planId) {
    query.planId = options.planId;
  }

  return this.find(query)
    .populate('userId', 'email profile.name')
    .populate('planId', 'name key planType')
    .sort({ createdAt: -1 });
};

// Instance method to check if payment is expired
planPaymentSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to check if payment can be retried
planPaymentSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.verificationAttempts < 3;
};

// Instance method to calculate plan dates
planPaymentSchema.methods.calculatePlanDates = function(planDurationDays = 30) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + (planDurationDays * 24 * 60 * 60 * 1000));
  
  return {
    startDate,
    endDate
  };
};

// Pre-save middleware to set expiry date
planPaymentSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiry to 15 minutes from creation for pending payments
    this.expiresAt = new Date(Date.now() + (15 * 60 * 1000));
  }

  // Calculate total amount if not set
  if (this.isNew && !this.totalAmount) {
    this.totalAmount = this.amount + (this.taxAmount || 0);
  }

  next();
});

// Pre-save middleware to update plan dates when payment is successful
planPaymentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'paid' && !this.planStartDate) {
    const dates = this.calculatePlanDates();
    this.planStartDate = dates.startDate;
    this.planEndDate = dates.endDate;
  }
  next();
});

// Post-save middleware to update user plan when payment is successful
planPaymentSchema.post('save', async function(doc) {
  if (doc.status === 'paid' && doc.planStartDate && doc.planEndDate) {
    try {
      const User = require('./User');
      await User.findByIdAndUpdate(doc.userId, {
        currentPlanId: doc.planId,
        planExpiryDate: doc.planEndDate,
        planStatus: 'active'
      });
    } catch (error) {
      console.error('Error updating user plan after payment:', error);
    }
  }
});

module.exports = mongoose.model('PlanPayment', planPaymentSchema);
