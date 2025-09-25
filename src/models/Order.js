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
  
  // Multi-Shop Zone Order Management
  orderType: {
    type: String,
    enum: ['single', 'zone_main', 'zone_shop', 'zone_split', 'shop_split'],
    default: 'single',
    description: 'Type of order: single restaurant, zone main (parent), zone shop (child), legacy zone split, or legacy shop split'
  },
  
  // Parent Order (for shop orders that are part of a zone order)
  parentOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    description: 'Reference to parent zone order if this is a shop order'
  },
  
  // Child Orders (for zone main orders that are split across multiple shops)
  childOrderIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Order',
    description: 'References to shop orders for zone main orders'
  }],
  
  // Shop Orders (for zone orders that are split across multiple shops - legacy support)
  shopOrders: [{
    type: Schema.Types.ObjectId,
    ref: 'Order'
  }],
  
  // Order Traceability
  traceability: {
    parentOrderNumber: {
      type: String,
      description: 'Parent order number for shop orders (extracted from order number)'
    },
    uniqueTraceCode: {
      type: String,
      description: 'Unique 3-character code for tracing parent-child relationships'
    },
    shopSequence: {
      type: Number,
      description: 'Sequence number for shop orders within a zone order'
    }
  },
  
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
  
  // Order Status with Multi-Shop Zone Support
  status: {
    type: String,
    required: [true, 'Order status is required'],
    enum: {
      values: [
        'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded',
        'partially_ready', 'partially_completed' // Additional statuses for zone main orders
      ],
      message: 'Invalid order status'
    },
    default: 'pending',
    index: true
  },
  
  // Shop Order Status Summary (for zone main orders)
  shopOrderSummary: {
    totalShops: {
      type: Number,
      default: 0,
      description: 'Total number of shops in this zone order'
    },
    completedShops: {
      type: Number,
      default: 0,
      description: 'Number of shops that have completed their orders'
    },
    readyShops: {
      type: Number,
      default: 0,
      description: 'Number of shops that have their orders ready'
    },
    preparingShops: {
      type: Number,
      default: 0,
      description: 'Number of shops currently preparing orders'
    },
    cancelledShops: {
      type: Number,
      default: 0,
      description: 'Number of shops that cancelled their orders'
    }
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
orderSchema.methods.updateStatus = function(newStatus, updatedBy = null, notes = '', session = null) {
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
      // Since confirmed includes preparing, also set preparation started
      if (!this.timing.preparationStarted) {
        this.timing.preparationStarted = now;
      }
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
  
  // Return the document without saving - let the caller handle saving with proper session
  return this;
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
orderSchema.methods.addFeedback = function(rating, comment = '', isPublic = false) {
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date(),
    isPublic
  };
  
  return this.save();
};

/**
 * Add child order to zone main order
 */
orderSchema.methods.addChildOrder = function(childOrderId) {
  if (this.orderType !== 'zone_main') {
    throw new Error('Only zone main orders can have child orders');
  }
  
  if (!this.childOrderIds.includes(childOrderId)) {
    this.childOrderIds.push(childOrderId);
    this.shopOrderSummary.totalShops = this.childOrderIds.length;
  }
  
  return this.save();
};

/**
 * Update shop order summary for zone main order
 */
orderSchema.methods.updateShopOrderSummary = function(childOrderStatus, operation = 'update') {
  if (this.orderType !== 'zone_main') {
    return this;
  }
  
  const statusCounts = {
    completed: this.shopOrderSummary.completedShops,
    ready: this.shopOrderSummary.readyShops,
    preparing: this.shopOrderSummary.preparingShops,
    cancelled: this.shopOrderSummary.cancelledShops
  };
  
  // Update counts based on the operation
  if (operation === 'add' && statusCounts[childOrderStatus] !== undefined) {
    statusCounts[childOrderStatus]++;
  } else if (operation === 'remove' && statusCounts[childOrderStatus] !== undefined) {
    statusCounts[childOrderStatus] = Math.max(0, statusCounts[childOrderStatus] - 1);
  }
  
  // Update the summary
  this.shopOrderSummary.completedShops = statusCounts.completed;
  this.shopOrderSummary.readyShops = statusCounts.ready;
  this.shopOrderSummary.preparingShops = statusCounts.preparing;
  this.shopOrderSummary.cancelledShops = statusCounts.cancelled;
  
  return this;
};

/**
 * Calculate and update zone main order status based on child orders
 */
orderSchema.methods.updateZoneMainStatus = async function() {
  if (this.orderType !== 'zone_main') {
    return this;
  }
  
  // CRITICAL FIX: Always fetch fresh child orders to ensure we have the latest status
  const childOrders = await this.constructor.find({ 
    parentOrderId: this._id,
    orderType: 'zone_shop'
  }).sort({ createdAt: 1 }); // Sort by creation time for consistency
  
  if (childOrders.length === 0) {
    console.log('⚠️ No child orders found for parent:', this.orderNumber);
    return this;
  }
  
  console.log('📋 FRESH CHILD ORDERS FETCHED:', {
    parentOrderNumber: this.orderNumber,
    childCount: childOrders.length,
    childStatuses: childOrders.map(o => ({
      orderNumber: o.orderNumber,
      status: o.status,
      updatedAt: o.updatedAt
    }))
  });
  
  // Reset summary
  this.shopOrderSummary.totalShops = childOrders.length;
  this.shopOrderSummary.completedShops = 0;
  this.shopOrderSummary.readyShops = 0;
  this.shopOrderSummary.preparingShops = 0;
  this.shopOrderSummary.cancelledShops = 0;
  
  // Count statuses
  const statusCounts = {};
  childOrders.forEach(order => {
    const status = order.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    // Update summary
    if (status === 'completed') this.shopOrderSummary.completedShops++;
    else if (status === 'ready') this.shopOrderSummary.readyShops++;
    else if (['preparing', 'confirmed'].includes(status)) this.shopOrderSummary.preparingShops++; // confirmed includes preparing
    else if (status === 'cancelled') this.shopOrderSummary.cancelledShops++;
  });
  
  const currentStatus = this.status;
  
  // Determine main order status
  let newStatus = this.status;
  const totalOrders = childOrders.length;
  const completedCount = statusCounts.completed || 0;
  const cancelledCount = statusCounts.cancelled || 0;
  const readyCount = statusCounts.ready || 0;
  const activeOrders = totalOrders - cancelledCount; // Non-cancelled orders
  
  console.log('🔍 Zone Main Status Update Analysis (ENHANCED DEBUG):', {
    parentOrderNumber: this.orderNumber,
    currentStatus,
    totalOrders,
    completedCount,
    readyCount,
    cancelledCount,
    activeOrders,
    statusCounts,
    childOrderStatuses: childOrders.map(o => ({ 
      orderNumber: o.orderNumber, 
      status: o.status,
      id: o._id.toString(),
      updatedAt: o.updatedAt
    })),
    isSingleShop: totalOrders === 1,
    singleShopConditions: totalOrders === 1 ? {
      completedCountIs1: completedCount === 1,
      readyCountIs1: readyCount === 1,
      shouldTriggerCompleted: (totalOrders === 1 && completedCount === 1),
      shouldTriggerReady: (totalOrders === 1 && readyCount === 1)
    } : null
  });
  
  /*
   * CRITICAL FIX FOR SINGLE SHOP ZONE ORDERS:
   * Single shop conditions MUST be checked FIRST to prevent getting stuck in 
   * intermediate states. The issue was that single shop orders would hit the
   * general multi-shop logic before the specific single shop logic, causing
   * them to get stuck at 'ready' instead of transitioning to 'completed'.
   */
  
  // Priority-based status determination with ENHANCED single shop handling FIRST
  if (totalOrders === 1 && completedCount === 1) {
    // SPECIFIC FIX: Single shop order completed - should always be completed (HIGHEST PRIORITY)
    newStatus = 'completed';
    console.log('🎯 SINGLE SHOP COMPLETED RULE APPLIED:', {
      parentOrderNumber: this.orderNumber,
      childOrderStatus: childOrders[0].status,
      childOrderNumber: childOrders[0].orderNumber,
      newParentStatus: newStatus
    });
  } else if (totalOrders === 1 && readyCount === 1) {
    // SPECIFIC FIX: Single shop order ready - should be ready (HIGHEST PRIORITY)
    newStatus = 'ready';
    console.log('🎯 SINGLE SHOP READY RULE APPLIED:', {
      parentOrderNumber: this.orderNumber,
      childOrderStatus: childOrders[0].status,
      childOrderNumber: childOrders[0].orderNumber,
      newParentStatus: newStatus
    });
  } else if (totalOrders === 1 && statusCounts.preparing === 1) {
    // Single shop preparing
    newStatus = 'preparing';
    console.log('🎯 SINGLE SHOP PREPARING RULE APPLIED:', {
      parentOrderNumber: this.orderNumber,
      childOrderStatus: childOrders[0].status,
      childOrderNumber: childOrders[0].orderNumber,
      newParentStatus: newStatus
    });

  } else if (totalOrders === 1 && statusCounts.confirmed === 1) {
    // Single shop confirmed
    newStatus = 'confirmed';
    console.log('🎯 SINGLE SHOP CONFIRMED RULE APPLIED:', {
      parentOrderNumber: this.orderNumber,
      childOrderStatus: childOrders[0].status,
      childOrderNumber: childOrders[0].orderNumber,
      newParentStatus: newStatus
    });
  } else if (totalOrders === 1 && statusCounts.cancelled === 1) {
    // Single shop cancelled
    newStatus = 'cancelled';
    console.log('🎯 SINGLE SHOP CANCELLED RULE APPLIED:', {
      parentOrderNumber: this.orderNumber,
      childOrderStatus: childOrders[0].status,
      childOrderNumber: childOrders[0].orderNumber,
      newParentStatus: newStatus
    });
  } else if (completedCount === totalOrders) {
    // All orders completed
    newStatus = 'completed';
  } else if (cancelledCount === totalOrders) {
    // All orders cancelled
    newStatus = 'cancelled';
  } else if (activeOrders > 0 && completedCount === activeOrders) {
    // All active (non-cancelled) orders are completed
    newStatus = 'completed';
  } else if (completedCount > 0 && (completedCount + cancelledCount) === totalOrders) {
    // Some completed, rest cancelled, none active
    newStatus = 'partially_completed';
  } else if ((readyCount + completedCount) === activeOrders && activeOrders > 0) {
    // All active orders are either ready or completed
    if (completedCount > 0) {
      newStatus = 'partially_ready'; // Some completed, some ready
    } else {
      newStatus = 'ready'; // All ready, none completed yet
    }
  } else if ((readyCount + completedCount) > 0) {
    // Some orders ready/completed, but others still preparing
    newStatus = 'partially_ready';
  } else if (Object.keys(statusCounts).some(status => ['preparing', 'confirmed'].includes(status))) {
    // Some orders in preparation
    newStatus = 'preparing';
  } else {
    // Default fallback
    newStatus = 'confirmed';
  }
  
  console.log('🎯 Zone Main Status Decision (ENHANCED: Single Shop Priority First):', {
    parentOrderNumber: this.orderNumber,
    oldStatus: currentStatus,
    newStatus,
    willUpdate: newStatus !== currentStatus,
    isSingleShop: totalOrders === 1,
    priorityLogic: totalOrders === 1 ? {
      completedCount,
      readyCount,
      shouldBeCompleted: completedCount === 1,
      shouldBeReady: readyCount === 1,
      triggerRule: 
        (totalOrders === 1 && completedCount === 1) ? 'SINGLE_SHOP_COMPLETED_PRIORITY' :
        (totalOrders === 1 && readyCount === 1) ? 'SINGLE_SHOP_READY_PRIORITY' : 'OTHER'
    } : 'multi_shop_logic',
    reason: newStatus === 'completed' ? 
      (totalOrders === 1 && completedCount === 1 ? 'Single shop completed (PRIORITY RULE)' :
       completedCount === totalOrders ? 'All orders completed' : 'All active orders completed') :
      newStatus === 'cancelled' ? 'All orders cancelled' :
      newStatus === 'ready' ? 
        (totalOrders === 1 && readyCount === 1 ? 'Single shop ready (PRIORITY RULE)' : 'All active orders ready') :
      newStatus === 'partially_ready' ? 'Some orders ready/completed' :
      newStatus === 'preparing' ? 'Some orders preparing' : 'Default status'
  });
  
  if (newStatus !== this.status) {
    this.status = newStatus;
    
    // Add to status history
    this.statusHistory.push({
      status: newStatus,
      automaticUpdate: true,
      notes: `Status synchronized based on ${totalOrders} shop orders (${completedCount} completed, ${readyCount} ready, ${cancelledCount} cancelled)`
    });
    
    // Update timing fields
    const now = new Date();
    if (newStatus === 'ready' && !this.timing.orderReady) {
      this.timing.orderReady = now;
    } else if (newStatus === 'completed' && !this.timing.orderCompleted) {
      this.timing.orderCompleted = now;
    }
    
    console.log('✅ Zone Main Status Updated:', {
      parentOrderNumber: this.orderNumber,
      from: currentStatus,
      to: newStatus,
      timestamp: now
    });
  } else {
    console.log('🔄 Zone Main Status No Change Needed:', {
      parentOrderNumber: this.orderNumber,
      status: this.status
    });
  }
  
  return this;
};

/**
 * Get order progress information for zone main orders
 */
orderSchema.methods.getOrderProgress = function() {
  if (this.orderType !== 'zone_main') {
    return null;
  }
  
  const total = this.shopOrderSummary.totalShops;
  const completed = this.shopOrderSummary.completedShops;
  const ready = this.shopOrderSummary.readyShops;
  const preparing = this.shopOrderSummary.preparingShops;
  const cancelled = this.shopOrderSummary.cancelledShops;
  
  return {
    total,
    completed,
    ready,
    preparing,
    cancelled,
    pending: total - (completed + ready + preparing + cancelled),
    progressPercentage: total > 0 ? Math.round(((completed + ready) / total) * 100) : 0,
    isFullyCompleted: completed === total && total > 0,
    isFullyCancelled: cancelled === total && total > 0,
    isPartiallyReady: ready > 0 && (ready + completed) < total,
    hasActiveOrders: preparing > 0 || (total - completed - cancelled) > 0
  };
};

/**
 * Extract traceability information from order number
 */
orderSchema.methods.extractTraceabilityInfo = function() {
  if (this.orderType === 'zone_shop' && this.orderNumber) {
    const parentCode = this.constructor.extractParentOrderCode(this.orderNumber);
    const dayCode = new Date(this.createdAt).getDate().toString().padStart(2, '0');
    
    return {
      parentOrderNumber: parentCode ? `ZN${dayCode}${parentCode}` : null,
      uniqueTraceCode: parentCode,
      shopSequence: this.traceability?.shopSequence || null
    };
  }
  
  return null;
};

// Static Methods

/**
 * Extract parent order code from shop order number
 * For shop orders with format XXX+DD+YYY, returns XXX
 */
orderSchema.statics.extractParentOrderCode = function(shopOrderNumber) {
  if (!shopOrderNumber || typeof shopOrderNumber !== 'string') {
    return null;
  }
  
  // Shop order format: XXX+DD+YYY (8 characters total)
  // Extract first 3 characters (XXX) which match the parent order
  if (shopOrderNumber.length === 8 && !shopOrderNumber.startsWith('ZN') && !shopOrderNumber.startsWith('ORD')) {
    return shopOrderNumber.substring(0, 3);
  }
  
  return null;
};

/**
 * Find parent zone order by shop order number
 */
orderSchema.statics.findParentZoneOrder = async function(shopOrderNumber) {
  const parentCode = this.extractParentOrderCode(shopOrderNumber);
  if (!parentCode) {
    return null;
  }
  
  // Find zone order that ends with the same unique code
  const dayCode = new Date().getDate().toString().padStart(2, '0');
  const parentOrderPattern = `ZN${dayCode}${parentCode}`;
  
  return await this.findOne({ 
    orderNumber: parentOrderPattern,
    orderType: 'zone_split'
  });
};
/**
 * Generate zone main order number
 * Format: ZN+DD+XXX
 * @returns {Object} - { orderNumber, uniqueCode }
 */
orderSchema.statics.generateZoneMainOrderNumber = async function() {
  const prefix = 'ZN';
  const dayCode = new Date().getDate().toString().padStart(2, '0'); // DD format (01-31)
  let uniqueCode, orderNumber;
  
  // Ensure uniqueness of the unique code for the day
  do {
    uniqueCode = Math.random().toString(36).substr(2, 3).toUpperCase(); // XXX - 3 unique chars
    orderNumber = `${prefix}${dayCode}${uniqueCode}`;
  } while (await this.findOne({ orderNumber }));
  
  return {
    orderNumber,
    uniqueCode // This will be used for shop orders traceability
  };
};

/**
 * Generate shop order number with traceability to parent
 * Format: XXX+DD+YYY
 * @param {String} parentUniqueCode - The unique code from parent zone order
 * @returns {String} - Shop order number
 */
orderSchema.statics.generateShopOrderNumber = async function(parentUniqueCode) {
  if (!parentUniqueCode || parentUniqueCode.length !== 3) {
    throw new Error('Parent unique code must be exactly 3 characters');
  }
  
  const dayCode = new Date().getDate().toString().padStart(2, '0'); // DD format
  let shopUniqueCode, orderNumber;
  
  // Ensure uniqueness
  do {
    shopUniqueCode = Math.random().toString(36).substr(2, 3).toUpperCase(); // YYY - new unique chars
    orderNumber = `${parentUniqueCode}${dayCode}${shopUniqueCode}`;
  } while (await this.findOne({ orderNumber }));
  
  return orderNumber;
};

/**
 * Enhanced order number generation with type support
 * @param {String} type - Order type: 'single', 'zone_main', 'zone_shop'
 * @param {String} parentUniqueCode - Required for zone_shop orders
 * @returns {Object|String} - Order number or object with number and code
 */
orderSchema.statics.generateOrderNumber = async function(type = 'single', parentUniqueCode = null) {
  if (type === 'zone_main') {
    return await this.generateZoneMainOrderNumber();
  } else if (type === 'zone_shop') {
    if (!parentUniqueCode) {
      throw new Error('Parent unique code is required for shop orders');
    }
    return await this.generateShopOrderNumber(parentUniqueCode);
  } else {
    // Single restaurant order
    const prefix = 'ORD';
    const dayCode = new Date().getDate().toString().padStart(2, '0'); // DD format (01-31)
    let uniqueCode, orderNumber;
    
    do {
      uniqueCode = Math.random().toString(36).substr(2, 3).toUpperCase(); // ZZZ - 3 unique chars
      orderNumber = `${prefix}${dayCode}${uniqueCode}`;
    } while (await this.findOne({ orderNumber }));
    
    return orderNumber;
  }
};

/**
 * Find all child orders for a zone main order
 */
orderSchema.statics.findChildOrders = function(parentOrderId) {
  return this.find({ 
    parentOrderId: parentOrderId,
    orderType: 'zone_shop'
  }).sort({ createdAt: 1 });
};

/**
 * Find parent zone order by child order ID
 */
orderSchema.statics.findParentOrder = function(childOrderId) {
  return this.findOne({ 
    childOrderIds: childOrderId,
    orderType: 'zone_main'
  });
};

/**
 * Find parent zone order by shop order number with enhanced traceability
 */
orderSchema.statics.findParentZoneOrderByNumber = async function(shopOrderNumber) {
  const parentCode = this.extractParentOrderCode(shopOrderNumber);
  if (!parentCode) {
    return null;
  }
  
  // Find zone order that contains the same unique code
  const dayCode = new Date().getDate().toString().padStart(2, '0');
  const parentOrderPattern = `ZN${dayCode}${parentCode}`;
  
  return await this.findOne({ 
    orderNumber: parentOrderPattern,
    orderType: { $in: ['zone_main', 'zone_split'] } // Support both new and legacy formats
  });
};

/**
 * Get comprehensive order statistics with multi-shop zone support
 */
orderSchema.statics.getEnhancedStatistics = function(locationId = null, locationType = 'restaurant', dateRange = {}, includeZoneBreakdown = false) {
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
  
  const pipeline = [
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
        },
        // Multi-shop zone specific metrics
        zoneMainOrders: {
          $sum: { $cond: [{ $eq: ['$orderType', 'zone_main'] }, 1, 0] }
        },
        zoneShopOrders: {
          $sum: { $cond: [{ $eq: ['$orderType', 'zone_shop'] }, 1, 0] }
        },
        avgShopsPerZoneOrder: {
          $avg: { $cond: [
            { $eq: ['$orderType', 'zone_main'] },
            '$shopOrderSummary.totalShops',
            null
          ]}
        }
      }
    }
  ];
  
  if (includeZoneBreakdown && locationType === 'zone') {
    // Add shop-level breakdown for zone analytics
    pipeline.push({
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'parentOrderId',
        as: 'shopBreakdown'
      }
    });
  }
  
  return this.aggregate(pipeline);
};

// Pre-save middleware
orderSchema.pre('save', async function(next) {
  // Generate order number if new
  if (this.isNew && !this.orderNumber) {
    if (this.orderType === 'zone_main') {
      const result = await this.constructor.generateZoneMainOrderNumber();
      this.orderNumber = result.orderNumber;
      this.traceability.uniqueTraceCode = result.uniqueCode;
    } else if (this.orderType === 'zone_shop' && this.traceability?.uniqueTraceCode) {
      this.orderNumber = await this.constructor.generateShopOrderNumber(this.traceability.uniqueTraceCode);
    } else {
      this.orderNumber = await this.constructor.generateOrderNumber('single');
    }
  }
  
  // Set traceability info for shop orders
  if (this.isNew && this.orderType === 'zone_shop' && this.orderNumber) {
    const traceInfo = this.extractTraceabilityInfo();
    if (traceInfo) {
      this.traceability.parentOrderNumber = traceInfo.parentOrderNumber;
      this.traceability.uniqueTraceCode = traceInfo.uniqueTraceCode;
    }
  }
  
  // Add initial status to history if new
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      automaticUpdate: true,
      notes: `Order created as ${this.orderType} type`
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
  
  // Initialize shop order summary for zone main orders
  if (this.isNew && this.orderType === 'zone_main') {
    this.shopOrderSummary = {
      totalShops: 0,
      completedShops: 0,
      readyShops: 0,
      preparingShops: 0,
      cancelledShops: 0
    };
  }
  
  next();
});

// Create and export model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;