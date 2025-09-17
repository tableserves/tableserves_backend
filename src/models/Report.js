const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true,
    maxlength: [100, 'Report name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Report type is required'],
    enum: [
      'sales_summary',
      'order_analysis',
      'customer_insights',
      'menu_performance',
      'operational_metrics',
      'financial_report',
      'growth_analysis',
      'comparative_analysis',
      'custom_query'
    ]
  },
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['restaurant', 'zone', 'shop', 'platform']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.entityType !== 'platform';
    },
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    time: {
      type: String,
      default: '09:00'
    },
    lastRun: Date,
    nextRun: Date
  },
  configuration: {
    dateRange: {
      type: {
        type: String,
        enum: ['custom', 'last_7_days', 'last_30_days', 'last_3_months', 'last_6_months', 'last_year', 'year_to_date'],
        default: 'last_30_days'
      },
      startDate: Date,
      endDate: Date
    },
    metrics: [{
      type: String,
      enum: [
        'orders_total',
        'orders_completed',
        'orders_cancelled',
        'revenue_total',
        'revenue_growth',
        'customers_total',
        'customers_new',
        'customers_returning',
        'average_order_value',
        'completion_rate',
        'preparation_time',
        'popular_items',
        'category_performance',
        'peak_hours',
        'growth_trends'
      ]
    }],
    filters: {
      orderStatus: [String],
      customerType: [String],
      menuCategories: [mongoose.Schema.Types.ObjectId],
      priceRange: {
        min: Number,
        max: Number
      },
      preparationTime: {
        min: Number,
        max: Number
      }
    },
    groupBy: {
      type: String,
      enum: ['hour', 'day', 'week', 'month', 'category', 'item', 'customer'],
      default: 'day'
    },
    sortBy: {
      field: String,
      order: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'desc'
      }
    },
    limit: {
      type: Number,
      min: 1,
      max: 1000,
      default: 100
    }
  },
  format: {
    type: String,
    enum: ['json', 'csv', 'excel', 'pdf'],
    default: 'json'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'error'],
    default: 'draft',
    index: true
  },
  executions: [{
    executedAt: {
      type: Date,
      default: Date.now
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running'
    },
    duration: Number, // in milliseconds
    recordsProcessed: Number,
    fileUrl: String,
    fileSize: Number,
    error: String,
    metadata: {
      dataSource: String,
      queryExecuted: String,
      parametersUsed: mongoose.Schema.Types.Mixed
    }
  }],
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'edit', 'admin'],
        default: 'view'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    accessKey: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    version: {
      type: String,
      default: '1.0'
    },
    template: {
      type: String
    },
    category: {
      type: String
    },
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex'],
      default: 'simple'
    },
    estimatedExecutionTime: Number,
    dataRetention: {
      type: Number,
      default: 90 // days
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
ReportSchema.index({ entityType: 1, entityId: 1, status: 1 });
ReportSchema.index({ createdBy: 1, status: 1 });
ReportSchema.index({ type: 1, entityType: 1 });
ReportSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });
ReportSchema.index({ tags: 1 });
ReportSchema.index({ createdAt: -1 });

// Virtual for entity reference
ReportSchema.virtual('entity', {
  refPath: function() {
    switch(this.entityType) {
      case 'restaurant': return 'Restaurant';
      case 'zone': return 'Zone';
      case 'shop': return 'ZoneShop';
      default: return null;
    }
  },
  localField: 'entityId',
  foreignField: '_id',
  justOne: true
});

// Virtual for latest execution
ReportSchema.virtual('latestExecution').get(function() {
  if (this.executions && this.executions.length > 0) {
    return this.executions.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))[0];
  }
  return null;
});

// Virtual for execution statistics
ReportSchema.virtual('executionStats').get(function() {
  if (!this.executions || this.executions.length === 0) {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      lastExecuted: null
    };
  }

  const total = this.executions.length;
  const successful = this.executions.filter(e => e.status === 'completed').length;
  const failed = this.executions.filter(e => e.status === 'failed').length;
  const durations = this.executions
    .filter(e => e.duration)
    .map(e => e.duration);
  const averageDuration = durations.length > 0 
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : 0;

  return {
    totalExecutions: total,
    successfulExecutions: successful,
    failedExecutions: failed,
    averageDuration,
    lastExecuted: this.latestExecution?.executedAt || null
  };
});

// Pre-save middleware to calculate next run time
ReportSchema.pre('save', function(next) {
  if (this.schedule.enabled && (this.isNew || this.isModified('schedule'))) {
    this.schedule.nextRun = this.calculateNextRun();
  }
  next();
});

// Instance method to calculate next run time
ReportSchema.methods.calculateNextRun = function() {
  if (!this.schedule.enabled) return null;

  const now = new Date();
  const nextRun = new Date();

  switch (this.schedule.frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      break;
    
    case 'weekly':
      const targetDayOfWeek = this.schedule.dayOfWeek || 1; // Default to Monday
      const currentDayOfWeek = now.getDay();
      let daysUntilNext = targetDayOfWeek - currentDayOfWeek;
      if (daysUntilNext <= 0) daysUntilNext += 7;
      nextRun.setDate(now.getDate() + daysUntilNext);
      break;
    
    case 'monthly':
      const targetDay = Math.min(this.schedule.dayOfMonth || 1, 28); // Avoid month-end issues
      nextRun.setMonth(now.getMonth() + 1);
      nextRun.setDate(targetDay);
      break;
    
    case 'quarterly':
      nextRun.setMonth(now.getMonth() + 3);
      nextRun.setDate(this.schedule.dayOfMonth || 1);
      break;
    
    case 'yearly':
      nextRun.setFullYear(now.getFullYear() + 1);
      nextRun.setMonth(0); // January
      nextRun.setDate(this.schedule.dayOfMonth || 1);
      break;
  }

  // Set the time
  const [hours, minutes] = (this.schedule.time || '09:00').split(':');
  nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return nextRun;
};

// Instance method to generate access key
ReportSchema.methods.generateAccessKey = function() {
  const crypto = require('crypto');
  this.sharing.accessKey = crypto.randomBytes(32).toString('hex');
  return this.sharing.accessKey;
};

// Instance method to add execution record
ReportSchema.methods.addExecution = function(executionData) {
  this.executions.push({
    executedAt: new Date(),
    ...executionData
  });

  // Keep only last 50 executions
  if (this.executions.length > 50) {
    this.executions = this.executions.slice(-50);
  }

  // Update last run time if scheduled
  if (this.schedule.enabled) {
    this.schedule.lastRun = new Date();
    this.schedule.nextRun = this.calculateNextRun();
  }

  return this.save();
};

// Instance method to check if user can access report
ReportSchema.methods.canUserAccess = function(userId, permission = 'view') {
  // Creator has full access
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }

  // Check if publicly shared
  if (this.sharing.isPublic && permission === 'view') {
    return true;
  }

  // Check explicit sharing
  const sharedEntry = this.sharing.sharedWith.find(
    entry => entry.userId.toString() === userId.toString()
  );

  if (!sharedEntry) return false;

  // Check permission level
  const permissionLevels = { 'view': 1, 'edit': 2, 'admin': 3 };
  const requiredLevel = permissionLevels[permission] || 1;
  const userLevel = permissionLevels[sharedEntry.permission] || 1;

  return userLevel >= requiredLevel;
};

// Static method to find reports for execution
ReportSchema.statics.findDueReports = function() {
  const now = new Date();
  return this.find({
    'schedule.enabled': true,
    'schedule.nextRun': { $lte: now },
    status: 'active'
  });
};

// Static method to get popular report templates
ReportSchema.statics.getPopularTemplates = async function() {
  const templates = await this.aggregate([
    {
      $match: { status: 'active' }
    },
    {
      $group: {
        _id: {
          type: '$type',
          template: '$metadata.template'
        },
        count: { $sum: 1 },
        avgExecutions: { $avg: { $size: '$executions' } },
        favoriteCount: { $avg: { $size: '$favorites' } }
      }
    },
    {
      $sort: { count: -1, favoriteCount: -1 }
    },
    {
      $limit: 10
    }
  ]);

  return templates;
};

// Static method to get user's reports
ReportSchema.statics.findUserReports = function(userId, options = {}) {
  const { status, type, limit = 20, page = 1 } = options;
  
  const query = {
    $or: [
      { createdBy: userId },
      { 'sharing.sharedWith.userId': userId },
      { 'sharing.isPublic': true }
    ]
  };

  if (status) query.status = status;
  if (type) query.type = type;

  return this.find(query)
    .populate('createdBy', 'profile.name email')
    .populate('entity', 'name')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static method to cleanup old executions
ReportSchema.statics.cleanupOldExecutions = async function() {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  await this.updateMany(
    {},
    {
      $pull: {
        executions: {
          executedAt: { $lt: cutoffDate }
        }
      }
    }
  );
};

module.exports = mongoose.model('Report', ReportSchema);