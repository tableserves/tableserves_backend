const mongoose = require('mongoose');

/**
 * Pending Settlement Model
 * Tracks payments that couldn't be auto-split due to unonboarded shops
 * Requires manual settlement by platform admin
 */
const pendingSettlementSchema = new mongoose.Schema({
  
  // Reference to the shop/restaurant that needs settlement
  entityType: {
    type: String,
    enum: ['restaurant', 'zone_shop'],
    required: true,
  },
  
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType',
  },
  
  // Order information
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  
  orderCode: {
    type: String,
    required: true,
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  currency: {
    type: String,
    default: 'INR',
  },
  
  // Razorpay payment reference
  razorpayPaymentId: {
    type: String,
    default: null,
  },
  
  razorpayOrderId: {
    type: String,
    default: null,
  },
  
  // Reason for pending settlement
  reason: {
    type: String,
    enum: [
      'shop_not_onboarded',
      'kyc_pending',
      'account_suspended',
      'transfer_failed',
      'manual_hold',
      'other'
    ],
    required: true,
  },
  
  reasonDetails: {
    type: String,
    default: '',
  },
  
  // Settlement status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  
  // Settlement details (when completed)
  settlementMethod: {
    type: String,
    enum: ['bank_transfer', 'razorpay_transfer', 'cash', 'other', ''],
    default: '',
  },
  
  settlementReference: {
    type: String,
    default: '',
  },
  
  settledAt: {
    type: Date,
    default: null,
  },
  
  settledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // Notes and communication
  notes: {
    type: String,
    default: '',
  },
  
  internalNotes: {
    type: String,
    default: '',
  },
  
  // Priority for manual processing
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  
  // Retry tracking for failed transfers
  retryCount: {
    type: Number,
    default: 0,
  },
  
  lastRetryAt: {
    type: Date,
    default: null,
  },
  
  maxRetries: {
    type: Number,
    default: 3,
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
pendingSettlementSchema.index({ entityId: 1, status: 1 });
pendingSettlementSchema.index({ orderId: 1 });
pendingSettlementSchema.index({ status: 1, priority: -1, createdAt: 1 });
pendingSettlementSchema.index({ createdAt: -1 });
pendingSettlementSchema.index({ razorpayPaymentId: 1 });

// Compound index for entity queries
pendingSettlementSchema.index({ entityType: 1, entityId: 1, status: 1 });

// Virtual for entity reference
pendingSettlementSchema.virtual('entity', {
  refPath: 'entityType',
  localField: 'entityId',
  foreignField: '_id',
  justOne: true,
});

// Instance method to mark as completed
pendingSettlementSchema.methods.markCompleted = function(settlementData, userId) {
  this.status = 'completed';
  this.settlementMethod = settlementData.method;
  this.settlementReference = settlementData.reference || '';
  this.settledAt = new Date();
  this.settledBy = userId;
  if (settlementData.notes) {
    this.notes = settlementData.notes;
  }
  return this.save();
};

// Instance method to mark as failed
pendingSettlementSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.reasonDetails = reason;
  return this.save();
};

// Instance method to retry settlement
pendingSettlementSchema.methods.retry = function() {
  if (this.retryCount >= this.maxRetries) {
    throw new Error('Maximum retry attempts reached');
  }
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.status = 'processing';
  return this.save();
};

// Static method to get pending settlements summary
pendingSettlementSchema.statics.getSummary = async function(filters = {}) {
  const matchStage = { status: 'pending', ...filters };
  
  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
  
  const total = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      }
    }
  ]);
  
  return {
    byReason: summary,
    total: total[0] || { totalCount: 0, totalAmount: 0 },
  };
};

// Static method to get settlements by entity
pendingSettlementSchema.statics.getByEntity = function(entityType, entityId, status = null) {
  const query = { entityType, entityId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('orderId', 'orderCode totalAmount createdAt')
    .populate('settledBy', 'profile.name email')
    .sort({ createdAt: -1 });
};

// Pre-save middleware to set priority based on amount
pendingSettlementSchema.pre('save', function(next) {
  if (this.isNew && this.priority === 'medium') {
    // Auto-set priority based on amount
    if (this.amount >= 10000) {
      this.priority = 'high';
    } else if (this.amount >= 50000) {
      this.priority = 'urgent';
    } else if (this.amount < 1000) {
      this.priority = 'low';
    }
  }
  next();
});

module.exports = mongoose.model('PendingSettlement', pendingSettlementSchema);
