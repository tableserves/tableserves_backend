const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Order Schema
 * Manages customer orders for both restaurants and zones
 */
const orderSchema = new Schema({
  // Order Identification
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true
  },
  
  // Location References (only one should be set)
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  
  zoneId: {
    type: Schema.Types.ObjectId,
    ref: 'Zone'
  },
  
  shopId: {
    type: Schema.Types.ObjectId,
    ref: 'ZoneShop'
  },
  
  // Table Information
  tableNumber: {
    type: String,
    required: [true, 'Table number is required'],
    trim: true
  },
  
  // Customer Information
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    },
    
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, 'Please provide a valid email']
    },
    
    preferences: {
      allergies: [String],
      dietaryRestrictions: [{
        type: String,
        enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher']
      }],
      spiceLevel: {
        type: String,
        enum: ['mild', 'medium', 'hot', 'very-hot'],
        default: 'medium'
      }
    }
  },
  
  // Order Items
  items: [{
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Menu item ID is required']
    },
    
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    
    description: {
      type: String,
      trim: true
    },
    
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Price cannot be negative']
    },
    
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [50, 'Quantity cannot exceed 50']
    },
    
    // Item Modifiers
    modifiers: [{
      name: {
        type: String,
        trim: true
      },
      
      options: [{
        name: {
          type: String,
          trim: true
        },
        price: {
          type: Number,
          default: 0,
          min: [0, 'Option price cannot be negative']
        }
      }],
      
      totalPrice: {
        type: Number,
        default: 0,
        min: [0, 'Modifier total price cannot be negative']
      }
    }],
    
    specialInstructions: {
      type: String,
      maxlength: [500, 'Special instructions cannot exceed 500 characters']
    },
    
    subtotal: {
      type: Number,
      required: [true, 'Item subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    
    // Item Status
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'preparing', 'ready', 'served'],
        message: 'Invalid item status'
      },
      default: 'pending'
    },
    
    prepTime: {
      type: Number,
      min: [0, 'Prep time cannot be negative'],
      description: 'Estimated preparation time in minutes'
    },
    
    notes: {
      type: String,
      maxlength: [200, 'Item notes cannot exceed 200 characters']
    }
  }],
  
  // Pricing Information
  pricing: {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    
    tax: {
      rate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative'],
        max: [0.3, 'Tax rate cannot exceed 30%'],
        default: 0
      },
      amount: {
        type: Number,
        min: [0, 'Tax amount cannot be negative'],
        default: 0
      }
    },
    
    serviceFee: {
      rate: {
        type: Number,
        min: [0, 'Service fee rate cannot be negative'],
        max: [0.2, 'Service fee rate cannot exceed 20%'],
        default: 0
      },
      amount: {
        type: Number,
        min: [0, 'Service fee amount cannot be negative'],
        default: 0
      }
    },
    
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
      },
      value: {
        type: Number,
        min: [0, 'Discount value cannot be negative'],
        default: 0
      },
      amount: {
        type: Number,
        min: [0, 'Discount amount cannot be negative'],
        default: 0
      },
      code: {
        type: String,
        trim: true,
        uppercase: true
      },
      reason: {
        type: String,
        maxlength: [200, 'Discount reason cannot exceed 200 characters']
      }
    },
    
    tip: {
      amount: {
        type: Number,
        min: [0, 'Tip amount cannot be negative'],
        default: 0
      },
      percentage: {
        type: Number,
        min: [0, 'Tip percentage cannot be negative'],
        max: [0.5, 'Tip percentage cannot exceed 50%']
      }
    },
    
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total cannot be negative']
    },
    
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PKR', 'RS'],
      default: 'PKR'
    }
  },
  
  // Order Status
  status: {
    type: String,
    required: [true, 'Order status is required'],
    enum: {
      values: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded'],
      message: 'Invalid order status'
    },
    default: 'pending',
    index: true
  },

  // Payment Information
  payment: {
    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'],
        message: 'Invalid payment status'
      },
      default: 'pending'
    },

    method: {
      type: String,
      enum: ['cash', 'credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'razorpay', 'upi', 'netbanking'],
      description: 'Payment method used'
    },

    transactionId: {
      type: String,
      description: 'Payment processor transaction ID'
    },

    // Razorpay-specific fields
    razorpayOrderId: {
      type: String,
      description: 'Razorpay order ID for payment tracking'
    },

    razorpayPaymentId: {
      type: String,
      description: 'Razorpay payment ID after successful payment'
    },

    razorpaySignature: {
      type: String,
      description: 'Razorpay signature for payment verification'
    },

    signatureVerified: {
      type: Boolean,
      default: false,
      description: 'Whether Razorpay signature has been verified'
    },

    paidAt: {
      type: Date,
      description: 'When payment was completed'
    },

    refundedAt: {
      type: Date,
      description: 'When refund was processed'
    },

    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
      description: 'Amount refunded'
    },

    failureReason: {
      type: String,
      description: 'Reason for payment failure'
    },

    // Payment verification attempts
    verificationAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Verification attempts cannot be negative'],
      description: 'Number of payment verification attempts'
    },

    // Payment expiry for Razorpay orders
    expiresAt: {
      type: Date,
      description: 'When the payment order expires'
    }
  },
  
  // Delivery Information
  delivery: {
    type: {
      type: String,
      enum: {
        values: ['pickup', 'table_service', 'delivery'],
        message: 'Invalid delivery type'
      },
      default: 'table_service'
    },
    
    estimatedTime: {
      type: Number,
      min: [1, 'Estimated time must be at least 1 minute'],
      max: [480, 'Estimated time cannot exceed 8 hours'],
      description: 'Estimated preparation/delivery time in minutes'
    },
    
    actualTime: {
      type: Number,
      min: [1, 'Actual time must be at least 1 minute'],
      description: 'Actual time taken in minutes'
    },
    
    instructions: {
      type: String,
      maxlength: [500, 'Delivery instructions cannot exceed 500 characters']
    },
    
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  
  // Status History
  statusHistory: [{
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded']
    },
    
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
      default: Date.now
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      description: 'User who updated the status'
    },
    
    notes: {
      type: String,
      maxlength: [500, 'Status notes cannot exceed 500 characters']
    },
    
    automaticUpdate: {
      type: Boolean,
      default: false,
      description: 'Whether this was an automatic status update'
    }
  }],
  
  // Special Instructions and Notes
  specialInstructions: {
    type: String,
    maxlength: [1000, 'Special instructions cannot exceed 1000 characters']
  },
  
  internalNotes: {
    type: String,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters'],
    description: 'Staff-only notes'
  },
  
  // Timing
  timing: {
    orderPlaced: {
      type: Date,
      default: Date.now
    },
    
    orderConfirmed: {
      type: Date
    },
    
    preparationStarted: {
      type: Date
    },
    
    orderReady: {
      type: Date
    },
    
    orderCompleted: {
      type: Date
    },
    
    orderCancelled: {
      type: Date
    }
  },
  
  // Rating and Feedback
  feedback: {
    rating: {
      type: Number,
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5']
    },
    
    foodRating: {
      type: Number,
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5']
    },
    
    venueRating: {
      type: Number,
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5']
    },
    
    platformRating: {
      type: Number,
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5']
    },
    
    comment: {
      type: String,
      maxlength: [1000, 'Feedback comment cannot exceed 1000 characters']
    },
    
    submittedAt: {
      type: Date
    },
    
    isPublic: {
      type: Boolean,
      default: false
    }
  },
  
  // Flags
  flags: {
    isUrgent: {
      type: Boolean,
      default: false
    },
    
    isVip: {
      type: Boolean,
      default: false
    },
    
    hasAllergies: {
      type: Boolean,
      default: false
    },
    
    requiresSpecialAttention: {
      type: Boolean,
      default: false
    }
  },
  
  // Source and Device Information
  source: {
    platform: {
      type: String,
      enum: ['web', 'mobile', 'tablet', 'kiosk', 'phone', 'staff'],
      default: 'web'
    },
    
    userAgent: {
      type: String
    },
    
    ipAddress: {
      type: String
    },
    
    referrer: {
      type: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  // Optimistic concurrency: save() will reject if __v changed since fetch.
  // Two concurrent zone-main syncs that race will produce a VersionError on
  // the loser, which is preferable to silent last-write-wins (duplicate
  // status-history entries, wrong previousStatus, etc). Callers should
  // catch VersionError and retry.
  optimisticConcurrency: true
});

// Indexes for performance
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ zoneId: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });
orderSchema.index({ 'payment.razorpayPaymentId': 1 });
orderSchema.index({ tableNumber: 1, restaurantId: 1 });
orderSchema.index({ createdAt: -1 });

// Compound indexes
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ zoneId: 1, status: 1, createdAt: -1 });

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  if (!this.items || !Array.isArray(this.items)) return 0;
  return this.items.reduce((total, item) => total + (item.quantity || 0), 0);
});

// Virtual for order duration
orderSchema.virtual('duration').get(function() {
  if (!this.timing || !this.timing.orderCompleted) return null;
  
  const start = this.timing.orderPlaced;
  const end = this.timing.orderCompleted;
  if (!start || !end) return null;
  return Math.round((end - start) / (1000 * 60)); // minutes
});

// Virtual for preparation time
orderSchema.virtual('prepTime').get(function() {
  if (!this.timing || !this.timing.preparationStarted || !this.timing.orderReady) return null;
  
  const start = this.timing.preparationStarted;
  const end = this.timing.orderReady;
  if (!start || !end) return null;
  return Math.round((end - start) / (1000 * 60)); // minutes
});

// Virtual for estimated completion time
orderSchema.virtual('estimatedCompletion').get(function() {
  if (!this.delivery || !this.delivery.estimatedTime) return null;
  if (!this.timing) return null;
  
  const startTime = this.timing.orderConfirmed || this.timing.orderPlaced;
  if (!startTime) return null;
  return new Date(startTime.getTime() + (this.delivery.estimatedTime * 60 * 1000));
});

// Instance Methods

/**
 * Update order status
 */
orderSchema.methods.updateStatus = function(newStatus, updatedBy = null, notes = '', session = null) {
  const oldStatus = this.status;
  
  // ALWAYS set previousStatus before changing status
  this.previousStatus = this.status;
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    updatedBy,
    notes,
    automaticUpdate: !updatedBy
  });
  
  // Update timing fields
  const now = new Date();
  switch (newStatus) {
    case 'confirmed':
      this.timing.orderConfirmed = now;
      // Since confirmed includes preparing, also set preparation started
      if (!this.timing.preparationStarted) {
        this.timing.preparationStarted = now;
      }
      break;
    case 'ready':
      this.timing.orderReady = now;
      break;
    case 'completed':
      this.timing.orderCompleted = now;
      break;
    case 'cancelled':
      this.timing.orderCancelled = now;
      break;
  }
  
  // Return the document without saving - let the caller handle saving with proper session
  return this;
};

/**
 * Add item to order
 */
orderSchema.methods.addItem = function(itemData) {
  if (!this.items) this.items = [];
  this.items.push(itemData);
  this.recalculateTotal();
  return this.save();
};

/**
 * Remove item from order
 */
orderSchema.methods.removeItem = function(itemId) {
  if (!this.items || !Array.isArray(this.items)) {
    throw new Error('No items in order');
  }
  this.items.id(itemId).remove();
  this.recalculateTotal();
  return this.save();
};

/**
 * Update item quantity
 */
orderSchema.methods.updateItemQuantity = function(itemId, newQuantity) {
  if (!this.items || !Array.isArray(this.items)) {
    throw new Error('No items in order');
  }
  const item = this.items.id(itemId);
  if (!item) throw new Error('Item not found');
  
  item.quantity = newQuantity;
  // Safely handle modifiers - ensure it's an array before using reduce
  const modifiersTotal = (item.modifiers && Array.isArray(item.modifiers)) 
    ? item.modifiers.reduce((sum, mod) => sum + (mod.totalPrice || 0), 0) 
    : 0;
  item.subtotal = (item.price + modifiersTotal) * newQuantity;
  
  this.recalculateTotal();
  return this.save();
};

/**
 * Recalculate order total
 */
orderSchema.methods.recalculateTotal = function() {
  // Calculate subtotal from items
  if (!this.items || !Array.isArray(this.items)) {
    this.pricing.subtotal = 0;
  } else {
    this.pricing.subtotal = this.items.reduce((total, item) => total + (item.subtotal || 0), 0);
  }
  
  // Calculate tax
  this.pricing.tax.amount = this.pricing.subtotal * (this.pricing.tax.rate || 0);
  
  // Calculate service fee
  this.pricing.serviceFee.amount = this.pricing.subtotal * (this.pricing.serviceFee.rate || 0);
  
  // Calculate discount
  if (this.pricing.discount.type === 'percentage') {
    this.pricing.discount.amount = this.pricing.subtotal * ((this.pricing.discount.value || 0) / 100);
  } else {
    this.pricing.discount.amount = Math.min(this.pricing.discount.value || 0, this.pricing.subtotal);
  }
  
  // Calculate total
  this.pricing.total = this.pricing.subtotal 
    + (this.pricing.tax.amount || 0)
    + (this.pricing.serviceFee.amount || 0)
    - (this.pricing.discount.amount || 0)
    + (this.pricing.tip.amount || 0);
  
  return this;
};

/**
 * Mark order as paid
 */
orderSchema.methods.markAsPaid = function(paymentMethod, transactionId = null) {
  this.payment.status = 'paid';
  this.payment.method = paymentMethod;
  this.payment.transactionId = transactionId;
  this.payment.paidAt = new Date();

  return this.save();
};

/**
 * Mark order as paid with Razorpay details
 */
orderSchema.methods.markAsPaidWithRazorpay = function(razorpayPaymentId, razorpaySignature, paymentMethod = 'razorpay') {
  this.payment.status = 'paid';
  this.payment.method = paymentMethod;
  this.payment.razorpayPaymentId = razorpayPaymentId;
  this.payment.razorpaySignature = razorpaySignature;
  this.payment.signatureVerified = true;
  this.payment.paidAt = new Date();

  return this.save();
};

/**
 * Mark payment as failed
 */
orderSchema.methods.markPaymentFailed = function(reason = 'Payment failed') {
  this.payment.status = 'failed';
  this.payment.failureReason = reason;
  this.payment.verificationAttempts += 1;

  return this.save();
};

/**
 * Set Razorpay order details
 */
orderSchema.methods.setRazorpayOrder = function(razorpayOrderId, expiresAt = null) {
  this.payment.razorpayOrderId = razorpayOrderId;
  this.payment.status = 'processing';
  if (expiresAt) {
    this.payment.expiresAt = expiresAt;
  }

  return this.save();
};

/**
 * Check if payment has expired
 */
orderSchema.methods.isPaymentExpired = function() {
  if (!this.payment.expiresAt) return false;
  return new Date() > this.payment.expiresAt;
};

/**
 * Add feedback
 */
orderSchema.methods.addFeedback = function(ratingData, comment = '', isPublic = false) {
  // Backwards compatibility for single rating
  if (typeof ratingData === 'number') {
    this.feedback = {
      rating: ratingData,
      comment,
      submittedAt: new Date(),
      isPublic
    };
  } else {
    // New multi-rating structure
    this.feedback = {
      rating: ratingData.rating || Math.round(((ratingData.foodRating || 0) + (ratingData.venueRating || 0) + (ratingData.platformRating || 0)) / 3) || 5,
      foodRating: ratingData.foodRating,
      venueRating: ratingData.venueRating,
      platformRating: ratingData.platformRating,
      comment: ratingData.comment || comment,
      submittedAt: new Date(),
      isPublic
    };
  }
  
  return this.save();
};

/**
 * Generate order number
 * Format: ORD+DD+XXX
 */
orderSchema.statics.generateOrderNumber = async function() {
  const prefix = 'ORD';
  const dayCode = new Date().getDate().toString().padStart(2, '0');
  let uniqueCode, orderNumber;

  do {
    uniqueCode = Math.random().toString(36).substr(2, 3).toUpperCase();
    orderNumber = `${prefix}${dayCode}${uniqueCode}`;
  } while (await this.findOne({ orderNumber }));

  return orderNumber;
};

/**
 * Order statistics aggregation
 */
orderSchema.statics.getEnhancedStatistics = function(locationId = null, locationType = 'restaurant', dateRange = {}) {
  const matchStage = {};

  if (locationId) {
    if (locationType === 'zone') {
      matchStage.zoneId = locationId;
    } else if (locationType === 'shop') {
      matchStage.shopId = locationId;
    } else {
      matchStage[`${locationType}Id`] = locationId;
    }
  }

  if (dateRange.from || dateRange.to) {
    matchStage.createdAt = {};
    if (dateRange.from) matchStage.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) matchStage.createdAt.$lte = new Date(dateRange.to);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' },
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
      }
    }
  ]);
};

// Snapshot the persisted payment status on document load so the pre-save
// hook can detect and validate the transition. Without this we'd have to
// re-fetch from the DB in pre('save') which adds a round-trip on every save.
orderSchema.post('init', function() {
  this._originalPaymentStatus = this.payment?.status;
});

// Whitelist of allowed payment status transitions. Anything not listed here
// is rejected to prevent data corruption (e.g., paid → failed, refunded → paid).
const ALLOWED_PAYMENT_TRANSITIONS = {
  pending:    ['pending', 'processing', 'paid', 'failed', 'cancelled'],
  processing: ['processing', 'paid', 'failed', 'cancelled'],
  paid:       ['paid', 'refunded'],
  failed:     ['failed', 'processing', 'cancelled'],
  refunded:   ['refunded'],
  cancelled:  ['cancelled']
};

// Pre-save middleware
orderSchema.pre('save', async function(next) {
  // Validate payment status transitions on existing documents.
  if (!this.isNew && this.isModified('payment.status') && this._originalPaymentStatus) {
    const oldStatus = this._originalPaymentStatus;
    const newStatus = this.payment.status;
    const allowed = ALLOWED_PAYMENT_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(newStatus)) {
      return next(new Error(
        `Invalid payment status transition: ${oldStatus} → ${newStatus}`
      ));
    }
  }

  // Generate order number if new
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await this.constructor.generateOrderNumber();
  }

  // Add initial status to history if new
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      automaticUpdate: true,
      notes: 'Order created'
    });
  }

  // Recalculate total if items changed
  if (this.isModified('items') || this.isModified('pricing')) {
    this.recalculateTotal();
  }

  // Set flags based on customer preferences
  if (this.customer.preferences.allergies && this.customer.preferences.allergies.length > 0) {
    this.flags.hasAllergies = true;
  }

  next();
});

// Refresh the snapshot after every save so consecutive saves on the same
// document instance validate transitions against the new persisted state.
orderSchema.post('save', function() {
  this._originalPaymentStatus = this.payment?.status;
});

// Create and export model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;