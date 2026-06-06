const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['restaurant', 'zone', 'shop', 'platform'],
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.entityType !== 'platform';
    },
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  period: {
    type: String,
    required: [true, 'Period is required'],
    enum: ['hour', 'day', 'week', 'month', 'year'],
    index: true
  },
  metrics: {
    // Order Metrics
    orders: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      averageValue: { type: Number, default: 0 },
      averageItems: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 }
    },
    
    // Revenue Metrics
    revenue: {
      total: { type: Number, default: 0 },
      gross: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
      fees: { type: Number, default: 0 },
      refunds: { type: Number, default: 0 },
      tips: { type: Number, default: 0 }
    },
    
    // Customer Metrics
    customers: {
      total: { type: Number, default: 0 },
      new: { type: Number, default: 0 },
      returning: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      retentionRate: { type: Number, default: 0 }
    },
    
    // Menu Performance
    menu: {
      totalItems: { type: Number, default: 0 },
      activeItems: { type: Number, default: 0 },
      popularItems: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        orders: Number,
        revenue: Number
      }],
      categoryPerformance: [{
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory' },
        name: String,
        orders: Number,
        revenue: Number,
        items: Number
      }]
    },
    
    // Operational Metrics
    operations: {
      averagePreparationTime: { type: Number, default: 0 },
      averageWaitTime: { type: Number, default: 0 },
      peakHours: [{
        hour: Number,
        orders: Number,
        revenue: Number
      }],
      busyDays: [{
        dayOfWeek: Number,
        orders: Number,
        revenue: Number
      }],
      efficiency: {
        ordersPerHour: { type: Number, default: 0 },
        itemsPerOrder: { type: Number, default: 0 },
        preparationEfficiency: { type: Number, default: 0 }
      }
    },
    
    // Growth Metrics
    growth: {
      orderGrowth: { type: Number, default: 0 },
      revenueGrowth: { type: Number, default: 0 },
      customerGrowth: { type: Number, default: 0 },
      itemGrowth: { type: Number, default: 0 }
    },
    
    // Platform Metrics (for platform-level analytics)
    platform: {
      activeRestaurants: { type: Number, default: 0 },
      activeZones: { type: Number, default: 0 },
      activeShops: { type: Number, default: 0 },
      totalUsers: { type: Number, default: 0 },
      subscriptionMetrics: {
        basic: { type: Number, default: 0 },
        premium: { type: Number, default: 0 },
        enterprise: { type: Number, default: 0 }
      }
    }
  },
  
  // Raw data points for detailed analysis
  rawData: {
    hourlyBreakdown: [{
      hour: Number,
      orders: Number,
      revenue: Number,
      customers: Number
    }],
    dailyBreakdown: [{
      day: Number,
      orders: Number,
      revenue: Number,
      customers: Number
    }],
    weeklyBreakdown: [{
      week: Number,
      orders: Number,
      revenue: Number,
      customers: Number
    }]
  },
  
  // Comparison data
  comparison: {
    previousPeriod: {
      orders: Number,
      revenue: Number,
      customers: Number,
      averageOrderValue: Number
    },
    yearOverYear: {
      orders: Number,
      revenue: Number,
      customers: Number,
      averageOrderValue: Number
    }
  },
  
  // Additional metadata
  metadata: {
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: String, default: 'system' },
    version: { type: String, default: '1.0' },
    source: { type: String, default: 'automated' },
    dataQuality: {
      completeness: { type: Number, default: 100 },
      accuracy: { type: Number, default: 100 },
      notes: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
AnalyticsSchema.index({ entityType: 1, entityId: 1, date: -1 });
AnalyticsSchema.index({ entityType: 1, entityId: 1, period: 1, date: -1 });
AnalyticsSchema.index({ date: -1, period: 1 });
AnalyticsSchema.index({ 'metadata.generatedAt': -1 });

// Virtual for entity reference
AnalyticsSchema.virtual('entity', {
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

// Instance method to calculate growth rates
AnalyticsSchema.methods.calculateGrowthRates = function() {
  const current = this.metrics;
  const previous = this.comparison.previousPeriod;
  
  if (!previous || Object.keys(previous).length === 0) {
    return {
      orderGrowth: 0,
      revenueGrowth: 0,
      customerGrowth: 0
    };
  }
  
  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  return {
    orderGrowth: calculateGrowth(current.orders.total, previous.orders),
    revenueGrowth: calculateGrowth(current.revenue.total, previous.revenue),
    customerGrowth: calculateGrowth(current.customers.total, previous.customers)
  };
};

// Instance method to get performance summary
AnalyticsSchema.methods.getPerformanceSummary = function() {
  const metrics = this.metrics;
  
  return {
    totalOrders: metrics.orders.total,
    totalRevenue: metrics.revenue.total,
    averageOrderValue: metrics.customers.averageOrderValue,
    completionRate: metrics.orders.completionRate,
    customerRetention: metrics.customers.retentionRate,
    topPerformingItem: metrics.menu.popularItems[0] || null,
    peakHour: metrics.operations.peakHours.sort((a, b) => b.orders - a.orders)[0] || null,
    growth: this.calculateGrowthRates()
  };
};

// Static method to aggregate analytics for a period
AnalyticsSchema.statics.aggregateForPeriod = async function(entityType, entityId, startDate, endDate, period = 'day') {
  const pipeline = [
    {
      $match: {
        entityType,
        entityId: mongoose.Types.ObjectId(entityId),
        date: { $gte: startDate, $lte: endDate },
        period
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: '$metrics.orders.total' },
        totalRevenue: { $sum: '$metrics.revenue.total' },
        totalCustomers: { $sum: '$metrics.customers.total' },
        averageOrderValue: { $avg: '$metrics.customers.averageOrderValue' },
        completionRate: { $avg: '$metrics.orders.completionRate' },
        data: { $push: '$$ROOT' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || null;
};

// Static method to get top performers
AnalyticsSchema.statics.getTopPerformers = async function(entityType, metric = 'revenue.total', limit = 10, period = 'month') {
  const pipeline = [
    {
      $match: {
        entityType,
        period,
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    },
    {
      $group: {
        _id: '$entityId',
        totalValue: { $sum: `$metrics.${metric}` },
        avgValue: { $avg: `$metrics.${metric}` },
        dataPoints: { $sum: 1 }
      }
    },
    {
      $sort: { totalValue: -1 }
    },
    {
      $limit: limit
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get trend data
AnalyticsSchema.statics.getTrendData = async function(entityType, entityId, metric, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const pipeline = [
    {
      $match: {
        entityType,
        entityId: mongoose.Types.ObjectId(entityId),
        period: 'day',
        date: { $gte: startDate }
      }
    },
    {
      $project: {
        date: 1,
        value: `$metrics.${metric}`
      }
    },
    {
      $sort: { date: 1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to generate daily analytics
AnalyticsSchema.statics.generateDailyAnalytics = async function(entityType, entityId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Get orders for the day
  const Order = mongoose.model('Order');
  const query = {
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  };
  
  // Add entity-specific query
  switch(entityType) {
    case 'restaurant':
      query.restaurantId = entityId;
      break;
    case 'zone':
      query.zoneId = entityId;
      break;
    case 'shop':
      query.shopId = entityId;
      break;
  }
  
  const orders = await Order.find(query);
  
  // Calculate metrics
  const metrics = this.calculateMetricsFromOrders(orders);
  
  // Create or update analytics record
  const analyticsData = {
    entityType,
    entityId,
    date: startOfDay,
    period: 'day',
    metrics,
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'system',
      source: 'daily_job'
    }
  };
  
  return await this.findOneAndUpdate(
    { entityType, entityId, date: startOfDay, period: 'day' },
    analyticsData,
    { upsert: true, new: true }
  );
};

// Helper method to calculate metrics from orders
AnalyticsSchema.statics.calculateMetricsFromOrders = function(orders) {
  const metrics = {
    orders: {
      total: orders.length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      pending: orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length
    },
    revenue: {
      total: orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0),
      gross: orders.reduce((sum, o) => sum + (o.pricing?.subtotal || 0), 0)
    },
    customers: {
      total: new Set(orders.map(o => o.customer.phone)).size
    }
  };
  
  // Calculate derived metrics
  metrics.orders.completionRate = metrics.orders.total > 0 
    ? Math.round((metrics.orders.completed / metrics.orders.total) * 100) 
    : 0;
    
  metrics.orders.averageValue = metrics.orders.total > 0 
    ? Math.round((metrics.revenue.total / metrics.orders.total) * 100) / 100
    : 0;
    
  metrics.customers.averageOrderValue = metrics.customers.total > 0 
    ? Math.round((metrics.revenue.total / metrics.customers.total) * 100) / 100
    : 0;
  
  return metrics;
};

module.exports = mongoose.model('Analytics', AnalyticsSchema);