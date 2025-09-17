const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * TableServe Rating Schema
 * Manages platform-level ratings and feedback for TableServe service
 */
const tableServeRatingSchema = new Schema({
  // Order Reference
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    uppercase: true,
    index: true
  },
  
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true
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
      index: true
    },
    
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  
  // Location References
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
    ref: 'ZoneShop',
    index: true
  },
  
  // TableServe Service Rating
  serviceRating: {
    type: Number,
    required: [true, 'Service rating is required'],
    min: [1, 'Service rating must be between 1 and 5'],
    max: [5, 'Service rating must be between 1 and 5']
  },
  
  // TableServe Service Feedback
  serviceFeedback: {
    type: String,
    maxlength: [1000, 'Service feedback cannot exceed 1000 characters'],
    trim: true
  },
  
  // Rating Categories
  categories: {
    appExperience: {
      type: Number,
      min: [1, 'App experience rating must be between 1 and 5'],
      max: [5, 'App experience rating must be between 1 and 5']
    },
    
    orderingProcess: {
      type: Number,
      min: [1, 'Ordering process rating must be between 1 and 5'],
      max: [5, 'Ordering process rating must be between 1 and 5']
    },
    
    paymentExperience: {
      type: Number,
      min: [1, 'Payment experience rating must be between 1 and 5'],
      max: [5, 'Payment experience rating must be between 1 and 5']
    },
    
    overallSatisfaction: {
      type: Number,
      min: [1, 'Overall satisfaction rating must be between 1 and 5'],
      max: [5, 'Overall satisfaction rating must be between 1 and 5']
    }
  },
  
  // Additional Information
  tableNumber: {
    type: String,
    trim: true
  },
  
  // Metadata
  isPublic: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Admin Response
  adminResponse: {
    message: {
      type: String,
      maxlength: [500, 'Admin response cannot exceed 500 characters']
    },
    
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    respondedAt: {
      type: Date
    }
  },
  

  
  // Platform Information
  platform: {
    type: String,
    enum: ['web', 'mobile', 'tablet'],
    default: 'web'
  },
  
  // Source Information
  source: {
    userAgent: String,
    ipAddress: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
tableServeRatingSchema.index({ orderNumber: 1, 'customer.phone': 1 });
tableServeRatingSchema.index({ serviceRating: 1 });
tableServeRatingSchema.index({ createdAt: -1 });
tableServeRatingSchema.index({ restaurantId: 1, createdAt: -1 });
tableServeRatingSchema.index({ zoneId: 1, createdAt: -1 });


// Virtual for average category rating
tableServeRatingSchema.virtual('averageCategoryRating').get(function() {
  const categories = this.categories;
  if (!categories) return null;
  
  const ratings = [
    categories.appExperience,
    categories.orderingProcess,
    categories.paymentExperience,
    categories.overallSatisfaction
  ].filter(rating => rating != null);
  
  if (ratings.length === 0) return null;
  
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

// Static method to get platform statistics
tableServeRatingSchema.statics.getPlatformStatistics = async function(dateRange = {}) {
  const matchStage = {};
  
  if (dateRange.from || dateRange.to) {
    matchStage.createdAt = {};
    if (dateRange.from) matchStage.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) matchStage.createdAt.$lte = new Date(dateRange.to);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRatings: { $sum: 1 },
        averageServiceRating: { $avg: '$serviceRating' },
        averageAppExperience: { $avg: '$categories.appExperience' },
        averageOrderingProcess: { $avg: '$categories.orderingProcess' },
        averagePaymentExperience: { $avg: '$categories.paymentExperience' },
        averageOverallSatisfaction: { $avg: '$categories.overallSatisfaction' },
        ratingDistribution: {
          $push: '$serviceRating'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalRatings: 1,
        averageServiceRating: { $round: ['$averageServiceRating', 2] },
        averageAppExperience: { $round: ['$averageAppExperience', 2] },
        averageOrderingProcess: { $round: ['$averageOrderingProcess', 2] },
        averagePaymentExperience: { $round: ['$averagePaymentExperience', 2] },
        averageOverallSatisfaction: { $round: ['$averageOverallSatisfaction', 2] },
        ratingDistribution: 1
      }
    }
  ]);
  
  return stats[0] || {
    totalRatings: 0,
    averageServiceRating: 0,
    averageAppExperience: 0,
    averageOrderingProcess: 0,
    averagePaymentExperience: 0,
    averageOverallSatisfaction: 0,
    ratingDistribution: []
  };
};

// Static method to get recent ratings for dashboard
tableServeRatingSchema.statics.getRecentRatings = async function(limit = 10) {
  return this.find()
    .populate('restaurantId', 'name')
    .populate('zoneId', 'name')
    .populate('shopId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('orderNumber customer serviceRating serviceFeedback createdAt restaurantId zoneId shopId tableNumber');
};

// Pre-save middleware
tableServeRatingSchema.pre('save', function(next) {
  // Ensure order number is uppercase
  if (this.orderNumber) {
    this.orderNumber = this.orderNumber.toUpperCase();
  }
  
  next();
});

// Create and export model
const TableServeRating = mongoose.model('TableServeRating', tableServeRatingSchema);

module.exports = TableServeRating;
