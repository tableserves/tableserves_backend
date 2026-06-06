const Analytics = require('../models/Analytics');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const User = require('../models/User');
const { logger } = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.cache = new Map();
  }

  // Generate comprehensive analytics for an entity
  async generateAnalytics(entityType, entityId, period = 'day', date = new Date()) {
    try {
      const startDate = this.getStartDate(date, period);
      const endDate = this.getEndDate(date, period);

      // Get orders for the period
      const orders = await this.getOrdersForPeriod(entityType, entityId, startDate, endDate);
      
      // Calculate metrics
      const metrics = await this.calculateMetrics(orders, entityType, entityId);
      
      // Get comparison data
      const comparison = await this.getComparisonData(entityType, entityId, period, date);
      
      // Generate raw data breakdown
      const rawData = this.generateRawDataBreakdown(orders, period);

      // Create analytics record
      const analyticsData = {
        entityType,
        entityId,
        date: startDate,
        period,
        metrics,
        rawData,
        comparison,
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'analytics-service',
          source: 'automated'
        }
      };

      // Save or update analytics
      const analytics = await Analytics.findOneAndUpdate(
        { entityType, entityId, date: startDate, period },
        analyticsData,
        { upsert: true, new: true }
      );

      logger.info('Analytics generated successfully', { 
        entityType, 
        entityId, 
        period, 
        date: startDate 
      });

      return analytics;

    } catch (error) {
      logger.error('Error generating analytics', { 
        entityType, 
        entityId, 
        period, 
        error: error.message 
      });
      throw error;
    }
  }

  // Get orders for a specific period and entity
  async getOrdersForPeriod(entityType, entityId, startDate, endDate) {
    const query = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Add entity-specific filter
    switch (entityType) {
      case 'restaurant':
        query.restaurantId = entityId;
        break;
      case 'zone':
        query.zoneId = entityId;
        break;
      case 'shop':
        query.shopId = entityId;
        break;
      case 'platform':
        // No additional filter for platform-wide analytics
        break;
      default:
        throw new Error(`Invalid entity type: ${entityType}`);
    }

    return await Order.find(query)
      .populate('items.menuItemId', 'name categoryId price')
      .sort({ createdAt: 1 });
  }

  // Calculate comprehensive metrics from orders
  async calculateMetrics(orders, entityType, entityId) {
    const metrics = {
      orders: this.calculateOrderMetrics(orders),
      revenue: this.calculateRevenueMetrics(orders),
      customers: this.calculateCustomerMetrics(orders),
      menu: await this.calculateMenuMetrics(orders, entityType, entityId),
      operations: this.calculateOperationalMetrics(orders),
      growth: {} // Will be populated with comparison data
    };

    // Add platform-specific metrics if needed
    if (entityType === 'platform') {
      metrics.platform = await this.calculatePlatformMetrics();
    }

    return metrics;
  }

  // Calculate order-related metrics
  calculateOrderMetrics(orders) {
    const total = orders.length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const pending = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;

    const totalValue = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
    const totalItems = orders.reduce((sum, o) => sum + (o.items?.length || 0), 0);

    return {
      total,
      completed,
      cancelled,
      pending,
      averageValue: total > 0 ? Math.round((totalValue / total) * 100) / 100 : 0,
      averageItems: total > 0 ? Math.round((totalItems / total) * 100) / 100 : 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  // Calculate revenue metrics
  calculateRevenueMetrics(orders) {
    const total = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
    const gross = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const fees = orders.reduce((sum, o) => sum + (o.fees || 0), 0);
    const refunds = orders.reduce((sum, o) => sum + (o.refundAmount || 0), 0);
    const tips = orders.reduce((sum, o) => sum + (o.tipAmount || 0), 0);

    return {
      total: Math.round(total * 100) / 100,
      gross: Math.round(gross * 100) / 100,
      net: Math.round((total - fees - refunds) * 100) / 100,
      fees: Math.round(fees * 100) / 100,
      refunds: Math.round(refunds * 100) / 100,
      tips: Math.round(tips * 100) / 100
    };
  }

  // Calculate customer metrics
  calculateCustomerMetrics(orders) {
    const uniqueCustomers = new Set();
    const customerOrders = new Map();

    orders.forEach(order => {
      const customerId = order.customer.phone || order.customer.email;
      if (customerId) {
        uniqueCustomers.add(customerId);
        
        if (!customerOrders.has(customerId)) {
          customerOrders.set(customerId, []);
        }
        customerOrders.get(customerId).push(order);
      }
    });

    const total = uniqueCustomers.size;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
    
    // Calculate returning customers (customers with more than one order)
    const returning = Array.from(customerOrders.values()).filter(orders => orders.length > 1).length;
    const newCustomers = total - returning;

    return {
      total,
      new: newCustomers,
      returning,
      averageOrderValue: total > 0 ? Math.round((totalRevenue / total) * 100) / 100 : 0,
      retentionRate: total > 0 ? Math.round((returning / total) * 100) : 0
    };
  }

  // Calculate menu performance metrics
  async calculateMenuMetrics(orders, entityType, entityId) {
    // Get total menu items for the entity
    const menuQuery = {};
    switch (entityType) {
      case 'restaurant':
        menuQuery.restaurantId = entityId;
        break;
      case 'zone':
        menuQuery.zoneId = entityId;
        break;
      case 'shop':
        menuQuery.shopId = entityId;
        break;
    }

    const totalItems = await MenuItem.countDocuments(menuQuery);
    const activeItems = await MenuItem.countDocuments({ ...menuQuery, available: true });

    // Calculate popular items
    const itemPerformance = new Map();
    const categoryPerformance = new Map();

    orders.forEach(order => {
      order.items?.forEach(item => {
        const itemId = item.menuItemId?._id?.toString();
        const categoryId = item.menuItemId?.categoryId?.toString();
        
        if (itemId) {
          if (!itemPerformance.has(itemId)) {
            itemPerformance.set(itemId, {
              itemId,
              name: item.name || item.menuItemId?.name,
              orders: 0,
              revenue: 0,
              quantity: 0
            });
          }
          
          const itemData = itemPerformance.get(itemId);
          itemData.orders += 1;
          itemData.revenue += item.subtotal || 0;
          itemData.quantity += item.quantity || 1;
        }

        if (categoryId) {
          if (!categoryPerformance.has(categoryId)) {
            categoryPerformance.set(categoryId, {
              categoryId,
              name: '', // Will be populated later
              orders: 0,
              revenue: 0,
              items: 0
            });
          }
          
          const categoryData = categoryPerformance.get(categoryId);
          categoryData.orders += 1;
          categoryData.revenue += item.subtotal || 0;
        }
      });
    });

    // Sort and limit popular items
    const popularItems = Array.from(itemPerformance.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    const categoryPerf = Array.from(categoryPerformance.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    return {
      totalItems,
      activeItems,
      popularItems,
      categoryPerformance: categoryPerf
    };
  }

  // Calculate operational metrics
  calculateOperationalMetrics(orders) {
    const completedOrders = orders.filter(o => o.status === 'completed' && o.deliveryInfo?.actualTime);
    
    // Calculate preparation times
    const preparationTimes = completedOrders.map(order => {
      const created = new Date(order.createdAt);
      const completed = new Date(order.deliveryInfo.actualTime);
      return Math.round((completed - created) / (1000 * 60)); // minutes
    });

    const averagePreparationTime = preparationTimes.length > 0
      ? Math.round(preparationTimes.reduce((sum, time) => sum + time, 0) / preparationTimes.length)
      : 0;

    // Calculate peak hours
    const hourlyData = new Map();
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { hour, orders: 0, revenue: 0 });
      }
      
      const data = hourlyData.get(hour);
      data.orders += 1;
      data.revenue += order.finalAmount || 0;
    });

    const peakHours = Array.from(hourlyData.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // Calculate busy days
    const dailyData = new Map();
    orders.forEach(order => {
      const dayOfWeek = new Date(order.createdAt).getDay();
      if (!dailyData.has(dayOfWeek)) {
        dailyData.set(dayOfWeek, { dayOfWeek, orders: 0, revenue: 0 });
      }
      
      const data = dailyData.get(dayOfWeek);
      data.orders += 1;
      data.revenue += order.finalAmount || 0;
    });

    const busyDays = Array.from(dailyData.values())
      .sort((a, b) => b.orders - a.orders);

    return {
      averagePreparationTime,
      averageWaitTime: averagePreparationTime, // Simplified for now
      peakHours,
      busyDays,
      efficiency: {
        ordersPerHour: orders.length > 0 ? Math.round(orders.length / 24 * 100) / 100 : 0,
        itemsPerOrder: orders.length > 0 
          ? Math.round((orders.reduce((sum, o) => sum + (o.items?.length || 0), 0) / orders.length) * 100) / 100 
          : 0,
        preparationEfficiency: 100 // Placeholder - would need more complex calculation
      }
    };
  }

  // Calculate platform-wide metrics
  async calculatePlatformMetrics() {
    const [activeRestaurants, activeZones, activeShops, totalUsers] = await Promise.all([
      Restaurant.countDocuments({ active: true }),
      Zone.countDocuments({ active: true }),
      ZoneShop.countDocuments({ status: 'active' }),
      User.countDocuments({ isActive: true })
    ]);

    // Get subscription metrics
    const subscriptionMetrics = await User.aggregate([
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subscription',
          foreignField: '_id',
          as: 'subscriptionData'
        }
      },
      {
        $unwind: { path: '$subscriptionData', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$subscriptionData.planKey',
          count: { $sum: 1 }
        }
      }
    ]);

    const subscriptionCounts = {
      basic: 0,
      premium: 0,
      enterprise: 0
    };

    subscriptionMetrics.forEach(metric => {
      if (metric._id?.includes('basic')) subscriptionCounts.basic += metric.count;
      else if (metric._id?.includes('premium')) subscriptionCounts.premium += metric.count;
      else if (metric._id?.includes('enterprise')) subscriptionCounts.enterprise += metric.count;
    });

    return {
      activeRestaurants,
      activeZones,
      activeShops,
      totalUsers,
      subscriptionMetrics: subscriptionCounts
    };
  }

  // Get comparison data for growth calculations
  async getComparisonData(entityType, entityId, period, currentDate) {
    try {
      // Calculate previous period date
      const previousDate = this.getPreviousDate(currentDate, period);
      const previousStartDate = this.getStartDate(previousDate, period);
      const previousEndDate = this.getEndDate(previousDate, period);

      // Get previous period orders
      const previousOrders = await this.getOrdersForPeriod(entityType, entityId, previousStartDate, previousEndDate);
      
      // Calculate basic metrics for comparison
      const previousMetrics = {
        orders: previousOrders.length,
        revenue: previousOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0),
        customers: new Set(previousOrders.map(o => o.customer.phone || o.customer.email)).size
      };

      previousMetrics.averageOrderValue = previousMetrics.orders > 0 
        ? Math.round((previousMetrics.revenue / previousMetrics.orders) * 100) / 100 
        : 0;

      // Get year-over-year data if applicable
      let yearOverYear = {};
      if (period === 'month' || period === 'year') {
        const yearAgoDate = new Date(currentDate);
        yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
        
        const yearAgoStartDate = this.getStartDate(yearAgoDate, period);
        const yearAgoEndDate = this.getEndDate(yearAgoDate, period);
        
        const yearAgoOrders = await this.getOrdersForPeriod(entityType, entityId, yearAgoStartDate, yearAgoEndDate);
        
        yearOverYear = {
          orders: yearAgoOrders.length,
          revenue: yearAgoOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0),
          customers: new Set(yearAgoOrders.map(o => o.customer.phone || o.customer.email)).size
        };

        yearOverYear.averageOrderValue = yearOverYear.orders > 0 
          ? Math.round((yearOverYear.revenue / yearOverYear.orders) * 100) / 100 
          : 0;
      }

      return {
        previousPeriod: previousMetrics,
        yearOverYear
      };

    } catch (error) {
      logger.error('Error getting comparison data', { error: error.message });
      return {
        previousPeriod: {},
        yearOverYear: {}
      };
    }
  }

  // Generate raw data breakdown for detailed analysis
  generateRawDataBreakdown(orders, period) {
    const breakdown = {
      hourlyBreakdown: [],
      dailyBreakdown: [],
      weeklyBreakdown: []
    };

    if (period === 'day') {
      // Hourly breakdown for daily analytics
      const hourlyData = new Map();
      
      for (let hour = 0; hour < 24; hour++) {
        hourlyData.set(hour, { hour, orders: 0, revenue: 0, customers: new Set() });
      }

      orders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        const data = hourlyData.get(hour);
        if (data) {
          data.orders += 1;
          data.revenue += order.finalAmount || 0;
          const customerId = order.customer.phone || order.customer.email;
          if (customerId) data.customers.add(customerId);
        }
      });

      breakdown.hourlyBreakdown = Array.from(hourlyData.values()).map(data => ({
        hour: data.hour,
        orders: data.orders,
        revenue: Math.round(data.revenue * 100) / 100,
        customers: data.customers.size
      }));
    }

    return breakdown;
  }

  // Get real-time analytics (cached for performance)
  async getRealTimeAnalytics(entityType, entityId) {
    const cacheKey = `realtime_${entityType}_${entityId}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // Get today's orders
      const todayOrders = await this.getOrdersForPeriod(entityType, entityId, startOfDay, now);
      
      // Calculate real-time metrics
      const realTimeMetrics = {
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0),
        activeOrders: todayOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
        completedToday: todayOrders.filter(o => o.status === 'completed').length,
        averageOrderValue: todayOrders.length > 0 
          ? Math.round((todayOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0) / todayOrders.length) * 100) / 100
          : 0,
        peakHourToday: this.getCurrentPeakHour(todayOrders),
        hourlyTrend: this.getHourlyTrend(todayOrders)
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: realTimeMetrics,
        timestamp: Date.now()
      });

      return realTimeMetrics;

    } catch (error) {
      logger.error('Error getting real-time analytics', { 
        entityType, 
        entityId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Get current peak hour from today's orders
  getCurrentPeakHour(orders) {
    const hourlyData = new Map();
    
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyData.set(hour, (hourlyData.get(hour) || 0) + 1);
    });

    let peakHour = 0;
    let maxOrders = 0;

    for (const [hour, count] of hourlyData.entries()) {
      if (count > maxOrders) {
        maxOrders = count;
        peakHour = hour;
      }
    }

    return { hour: peakHour, orders: maxOrders };
  }

  // Get hourly trend for the current day
  getHourlyTrend(orders) {
    const currentHour = new Date().getHours();
    const hourlyData = new Array(currentHour + 1).fill(0);

    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (hour <= currentHour) {
        hourlyData[hour] += 1;
      }
    });

    return hourlyData.map((count, hour) => ({ hour, orders: count }));
  }

  // Utility methods for date calculations
  getStartDate(date, period) {
    const startDate = new Date(date);
    
    switch (period) {
      case 'hour':
        startDate.setMinutes(0, 0, 0);
        break;
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const day = startDate.getDay();
        const diff = startDate.getDate() - day;
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }
    
    return startDate;
  }

  getEndDate(date, period) {
    const endDate = new Date(date);
    
    switch (period) {
      case 'hour':
        endDate.setMinutes(59, 59, 999);
        break;
      case 'day':
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const day = endDate.getDay();
        const diff = endDate.getDate() - day + 6;
        endDate.setDate(diff);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
    }
    
    return endDate;
  }

  getPreviousDate(date, period) {
    const previousDate = new Date(date);
    
    switch (period) {
      case 'hour':
        previousDate.setHours(previousDate.getHours() - 1);
        break;
      case 'day':
        previousDate.setDate(previousDate.getDate() - 1);
        break;
      case 'week':
        previousDate.setDate(previousDate.getDate() - 7);
        break;
      case 'month':
        previousDate.setMonth(previousDate.getMonth() - 1);
        break;
      case 'year':
        previousDate.setFullYear(previousDate.getFullYear() - 1);
        break;
    }
    
    return previousDate;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Scheduled job to generate daily analytics
  async generateDailyAnalytics() {
    try {
      logger.info('Starting daily analytics generation');

      // Get all active entities
      const [restaurants, zones, shops] = await Promise.all([
        Restaurant.find({ active: true }, '_id'),
        Zone.find({ active: true }, '_id'),
        ZoneShop.find({ status: 'active' }, '_id')
      ]);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Generate analytics for all entities
      const promises = [];

      restaurants.forEach(restaurant => {
        promises.push(this.generateAnalytics('restaurant', restaurant._id, 'day', yesterday));
      });

      zones.forEach(zone => {
        promises.push(this.generateAnalytics('zone', zone._id, 'day', yesterday));
      });

      shops.forEach(shop => {
        promises.push(this.generateAnalytics('shop', shop._id, 'day', yesterday));
      });

      // Generate platform analytics
      promises.push(this.generateAnalytics('platform', null, 'day', yesterday));

      await Promise.allSettled(promises);

      logger.info('Daily analytics generation completed', { 
        processed: promises.length,
        date: yesterday.toISOString().split('T')[0]
      });

    } catch (error) {
      logger.error('Error in daily analytics generation', { error: error.message });
    }
  }

  // Get analytics summary with comparison
  async getAnalyticsSummary(entityType, entityId, period = 'month', compareWith = 'previous') {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, period);
      
      // Get current period analytics
      const currentQuery = {
        entityType,
        date: { $gte: startDate, $lte: endDate }
      };
      
      if (entityType !== 'platform') {
        currentQuery.entityId = entityId;
      }
      
      const currentAnalytics = await Analytics.find(currentQuery).sort({ date: 1 });
      
      // Calculate current period totals
      const current = {
        orders: currentAnalytics.reduce((sum, a) => sum + (a.metrics.orders?.total || 0), 0),
        revenue: currentAnalytics.reduce((sum, a) => sum + (a.metrics.revenue?.total || 0), 0),
        customers: currentAnalytics.reduce((sum, a) => sum + (a.metrics.customers?.total || 0), 0)
      };
      
      // Get comparison period
      let comparison = {};
      if (compareWith === 'previous') {
        const prevEndDate = this.getPreviousDate(endDate, period);
        const prevStartDate = this.getStartDate(prevEndDate, period);
        
        const prevQuery = {
          entityType,
          date: { $gte: prevStartDate, $lte: prevEndDate }
        };
        
        if (entityType !== 'platform') {
          prevQuery.entityId = entityId;
        }
        
        const prevAnalytics = await Analytics.find(prevQuery);
        
        const previous = {
          orders: prevAnalytics.reduce((sum, a) => sum + (a.metrics.orders?.total || 0), 0),
          revenue: prevAnalytics.reduce((sum, a) => sum + (a.metrics.revenue?.total || 0), 0),
          customers: prevAnalytics.reduce((sum, a) => sum + (a.metrics.customers?.total || 0), 0)
        };
        
        comparison = {
          orders: previous.orders > 0 ? ((current.orders - previous.orders) / previous.orders * 100) : 0,
          revenue: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue * 100) : 0,
          customers: previous.customers > 0 ? ((current.customers - previous.customers) / previous.customers * 100) : 0
        };
      }
      
      return {
        period: { startDate, endDate, type: period },
        current,
        comparison,
        trend: currentAnalytics.map(a => ({
          date: a.date,
          orders: a.metrics.orders?.total || 0,
          revenue: a.metrics.revenue?.total || 0,
          customers: a.metrics.customers?.total || 0
        }))
      };
      
    } catch (error) {
      logger.error('Error getting analytics summary', { error: error.message });
      throw error;
    }
  }

  // Get analytics trends
  async getAnalyticsTrends(entityType, entityId, metric = 'revenue', period = 'day', duration = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      
      switch (period) {
        case 'hour':
          startDate.setHours(startDate.getHours() - duration);
          break;
        case 'day':
          startDate.setDate(startDate.getDate() - duration);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - (duration * 7));
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - duration);
          break;
      }
      
      const query = {
        entityType,
        period,
        date: { $gte: startDate, $lte: endDate }
      };
      
      if (entityType !== 'platform') {
        query.entityId = entityId;
      }
      
      const analytics = await Analytics.find(query).sort({ date: 1 });
      
      return analytics.map(a => ({
        date: a.date,
        value: a.metrics[metric]?.total || a.metrics[metric] || 0
      }));
      
    } catch (error) {
      logger.error('Error getting analytics trends', { error: error.message });
      throw error;
    }
  }

  // Get platform dashboard analytics
  async getPlatformDashboard() {
    try {
      const today = new Date();
      const thisMonth = this.getStartDate(today, 'month');
      
      // Get platform analytics for this month
      const analytics = await Analytics.find({
        entityType: 'platform',
        date: { $gte: thisMonth }
      }).sort({ date: -1 });
      
      const latest = analytics[0];
      
      return {
        summary: {
          totalRestaurants: latest?.metrics.platform?.activeRestaurants || 0,
          totalZones: latest?.metrics.platform?.activeZones || 0,
          totalShops: latest?.metrics.platform?.activeShops || 0,
          totalUsers: latest?.metrics.platform?.totalUsers || 0
        },
        thisMonth: {
          orders: analytics.reduce((sum, a) => sum + (a.metrics.orders?.total || 0), 0),
          revenue: analytics.reduce((sum, a) => sum + (a.metrics.revenue?.total || 0), 0),
          customers: analytics.reduce((sum, a) => sum + (a.metrics.customers?.total || 0), 0)
        },
        subscriptions: latest?.metrics.platform?.subscriptionMetrics || { basic: 0, premium: 0, enterprise: 0 }
      };
      
    } catch (error) {
      logger.error('Error getting platform dashboard', { error: error.message });
      throw error;
    }
  }

  // Get entity dashboard analytics
  async getEntityDashboard(entityType, entityId) {
    try {
      const realTime = await this.getRealTimeAnalytics(entityType, entityId);
      const summary = await this.getAnalyticsSummary(entityType, entityId, 'month');
      
      return {
        realTime,
        summary
      };
      
    } catch (error) {
      logger.error('Error getting entity dashboard', { error: error.message });
      throw error;
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(entityType, entityId, type = 'items', period = 'month', limit = 10) {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, period);
      
      const query = {
        entityType,
        date: { $gte: startDate, $lte: endDate }
      };
      
      if (entityType !== 'platform') {
        query.entityId = entityId;
      }
      
      const analytics = await Analytics.find(query);
      
      if (type === 'items') {
        const itemPerformance = new Map();
        
        analytics.forEach(a => {
          if (a.metrics.menu?.popularItems) {
            a.metrics.menu.popularItems.forEach(item => {
              const existing = itemPerformance.get(item.itemId.toString()) || {
                name: item.name,
                orders: 0,
                revenue: 0
              };
              existing.orders += item.orders;
              existing.revenue += item.revenue;
              itemPerformance.set(item.itemId.toString(), existing);
            });
          }
        });
        
        return Array.from(itemPerformance.entries())
          .map(([itemId, data]) => ({ itemId, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      } else {
        const categoryPerformance = new Map();
        
        analytics.forEach(a => {
          if (a.metrics.menu?.categoryPerformance) {
            a.metrics.menu.categoryPerformance.forEach(cat => {
              const existing = categoryPerformance.get(cat.categoryId.toString()) || {
                name: cat.name,
                orders: 0,
                revenue: 0,
                items: cat.items
              };
              existing.orders += cat.orders;
              existing.revenue += cat.revenue;
              categoryPerformance.set(cat.categoryId.toString(), existing);
            });
          }
        });
        
        return Array.from(categoryPerformance.entries())
          .map(([categoryId, data]) => ({ categoryId, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      }
      
    } catch (error) {
      logger.error('Error getting performance metrics', { error: error.message });
      throw error;
    }
  }

  // Export analytics data
  async exportAnalytics(entityType, entityId, options) {
    try {
      const { format = 'json', startDate, endDate, period = 'day' } = options;
      
      const query = { entityType, period };
      
      if (entityType !== 'platform') {
        query.entityId = entityId;
      }
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }
      
      const analytics = await Analytics.find(query).sort({ date: 1 });
      
      if (format === 'json') {
        return analytics;
      }
      
      // For CSV/Excel formats, return URL to download
      // This would typically involve creating a file and uploading to cloud storage
      const fileName = `analytics_${entityType}_${Date.now()}.${format}`;
      
      return {
        url: `/downloads/${fileName}`,
        fileName,
        size: JSON.stringify(analytics).length
      };
      
    } catch (error) {
      logger.error('Error exporting analytics', { error: error.message });
      throw error;
    }
  }

  // Bulk generate analytics
  async bulkGenerateAnalytics(entities, period = 'day', startDate = null, endDate = null) {
    try {
      const targetDate = endDate || new Date();
      const promises = [];
      const results = {
        success: [],
        failed: []
      };
      
      for (const entity of entities) {
        const promise = this.generateAnalytics(
          entity.entityType,
          entity.entityId,
          period,
          targetDate
        ).then((result) => {
          results.success.push({
            entityType: entity.entityType,
            entityId: entity.entityId,
            analyticsId: result._id
          });
        }).catch((error) => {
          results.failed.push({
            entityType: entity.entityType,
            entityId: entity.entityId,
            error: error.message
          });
        });
        
        promises.push(promise);
      }
      
      await Promise.allSettled(promises);
      
      logger.info('Bulk analytics generation completed', {
        total: entities.length,
        success: results.success.length,
        failed: results.failed.length
      });
      
      return results;
      
    } catch (error) {
      logger.error('Error in bulk analytics generation', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AnalyticsService();