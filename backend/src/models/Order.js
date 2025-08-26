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
    required: [true, 'Order number is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z0-9]{8,12}$/, 'Order number must be 8-12 alphanumeric characters']
  },
  
  // Location References (only one should be set)
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    index: true
  },
  
  zoneId: {
    type: Schema.Types.ObjectId,
    ref: 'Zone',
    index: true
  },
  
  shopId: {
    type: Schema.Types.ObjectId,
    ref: 'Shop',
    index: true
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
      trim: true,
      match: [/^[\\+]?[1-9][\\d]{0,15}$/, 'Please provide a valid phone number']
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
        required: [true, 'Modifier name is required'],
        trim: true
      },
      
      options: [{
        name: {
          type: String,
          required: [true, 'Option name is required'],
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
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      default: 'USD'
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
      enum: ['cash', 'credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'],
      description: 'Payment method used'
    },
    
    transactionId: {
      type: String,
      description: 'Payment processor transaction ID'
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
  toObject: { virtuals: true }
});

// Indexes for performance
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ zoneId: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ tableNumber: 1, restaurantId: 1 });
orderSchema.index({ createdAt: -1 });

// Compound indexes
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ zoneId: 1, status: 1, createdAt: -1 });

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order duration
orderSchema.virtual('duration').get(function() {
  if (!this.timing.orderCompleted) return null;
  
  const start = this.timing.orderPlaced;
  const end = this.timing.orderCompleted;
  return Math.round((end - start) / (1000 * 60)); // minutes
});

// Virtual for preparation time
orderSchema.virtual('prepTime').get(function() {
  if (!this.timing.preparationStarted || !this.timing.orderReady) return null;
  
  const start = this.timing.preparationStarted;
  const end = this.timing.orderReady;
  return Math.round((end - start) / (1000 * 60)); // minutes
});

// Virtual for estimated completion time
orderSchema.virtual('estimatedCompletion').get(function() {
  if (!this.delivery.estimatedTime) return null;
  
  const startTime = this.timing.orderConfirmed || this.timing.orderPlaced;
  return new Date(startTime.getTime() + (this.delivery.estimatedTime * 60 * 1000));
});

// Instance Methods

/**
 * Update order status
 */
orderSchema.methods.updateStatus = function(newStatus, updatedBy = null, notes = '') {
  const oldStatus = this.status;
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
      break;
    case 'preparing':
      this.timing.preparationStarted = now;
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
  
  return this.save();
};

/**
 * Add item to order
 */
orderSchema.methods.addItem = function(itemData) {
  this.items.push(itemData);
  this.recalculateTotal();
  return this.save();
};

/**
 * Remove item from order
 */
orderSchema.methods.removeItem = function(itemId) {
  this.items.id(itemId).remove();
  this.recalculateTotal();
  return this.save();
};

/**
 * Update item quantity
 */
orderSchema.methods.updateItemQuantity = function(itemId, newQuantity) {
  const item = this.items.id(itemId);
  if (!item) throw new Error('Item not found');
  
  item.quantity = newQuantity;
  item.subtotal = (item.price + item.modifiers.reduce((sum, mod) => sum + mod.totalPrice, 0)) * newQuantity;
  
  this.recalculateTotal();
  return this.save();
};

/**
 * Recalculate order total
 */
orderSchema.methods.recalculateTotal = function() {
  // Calculate subtotal from items
  this.pricing.subtotal = this.items.reduce((total, item) => total + item.subtotal, 0);
  
  // Calculate tax
  this.pricing.tax.amount = this.pricing.subtotal * this.pricing.tax.rate;
  
  // Calculate service fee
  this.pricing.serviceFee.amount = this.pricing.subtotal * this.pricing.serviceFee.rate;
  
  // Calculate discount
  if (this.pricing.discount.type === 'percentage') {
    this.pricing.discount.amount = this.pricing.subtotal * (this.pricing.discount.value / 100);
  } else {
    this.pricing.discount.amount = Math.min(this.pricing.discount.value, this.pricing.subtotal);
  }
  
  // Calculate total
  this.pricing.total = this.pricing.subtotal 
    + this.pricing.tax.amount 
    + this.pricing.serviceFee.amount 
    - this.pricing.discount.amount 
    + this.pricing.tip.amount;
  
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
 * Add feedback
 */
orderSchema.methods.addFeedback = function(rating, comment = '', isPublic = false) {
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date(),
    isPublic
  };
  
  return this.save();
};

// Static Methods

/**
 * Generate unique order number
 */
orderSchema.statics.generateOrderNumber = async function() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  let orderNumber = `ORD${timestamp}${random}`;
  
  // Ensure uniqueness
  while (await this.findOne({ orderNumber })) {
    const newRandom = Math.random().toString(36).substr(2, 4).toUpperCase();
    orderNumber = `ORD${timestamp}${newRandom}`;
  }
  
  return orderNumber;
};

/**
 * Find orders by status
 */
orderSchema.statics.findByStatus = function(status, locationId = null, locationType = 'restaurant') {
  const query = { status };
  
  if (locationId) {
    query[`${locationType}Id`] = locationId;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get order statistics
 */
orderSchema.statics.getStatistics = function(locationId = null, locationType = 'restaurant', dateRange = {}) {
  const matchStage = {};
  
  if (locationId) {
    matchStage[`${locationType}Id`] = locationId;
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
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Pre-save middleware
orderSchema.pre('save', async function(next) {
  // Generate order number if new
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await this.constructor.generateOrderNumber();
  }
  
  // Add initial status to history if new
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      automaticUpdate: true
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

// Create and export model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;