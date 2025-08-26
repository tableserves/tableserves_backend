import LocalStorageService from './LocalStorageService';

class AnalyticsService {
  constructor() {
    this.storageKey = 'tableserve_analytics';
    this.initializeData();
  }

  initializeData() {
    const existingData = localStorage.getItem(this.storageKey);
    if (!existingData) {
      const initialData = {
        platform: {
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          activeUsers: 0,
          dailyRevenue: [],
          monthlyRevenue: [],
          revenueByCategory: [],
          paymentMethods: [],
          topPerformers: []
        },
        restaurants: {},
        zones: {},
        shops: {}
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  getData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // Platform Analytics (Super Admin)
  getPlatformAnalytics(timeRange = '7d') {
    const data = this.getData();
    return {
      totalRevenue: data.platform.totalRevenue || 0,
      totalOrders: data.platform.totalOrders || 0,
      totalCustomers: data.platform.totalCustomers || 0,
      activeUsers: data.platform.activeUsers || 0,
      revenueChange: this.calculateGrowth(data.platform.dailyRevenue, timeRange),
      ordersChange: this.calculateGrowth(data.platform.dailyRevenue, timeRange, 'orders'),
      dailyRevenue: data.platform.dailyRevenue || [],
      monthlyRevenue: data.platform.monthlyRevenue || [],
      revenueByCategory: data.platform.revenueByCategory || [],
      paymentMethods: data.platform.paymentMethods || [],
      topPerformers: data.platform.topPerformers || []
    };
  }

  // Restaurant Analytics
  getRestaurantAnalytics(restaurantId, timeRange = '7d') {
    const data = this.getData();
    const restaurant = data.restaurants[restaurantId] || {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      avgRating: 0,
      dailyRevenue: [],
      monthlyRevenue: [],
      popularItems: [],
      recentOrders: []
    };

    return {
      ...restaurant,
      revenueChange: this.calculateGrowth(restaurant.dailyRevenue, timeRange),
      ordersChange: this.calculateGrowth(restaurant.dailyRevenue, timeRange, 'orders'),
      customersChange: this.calculateGrowth(restaurant.dailyRevenue, timeRange, 'customers')
    };
  }

  // Zone Analytics
  getZoneAnalytics(zoneId, timeRange = '7d') {
    const data = this.getData();
    const zone = data.zones[zoneId] || {
      totalRevenue: 0,
      totalOrders: 0,
      activeShops: 0,
      dailyRevenue: [],
      monthlyRevenue: [],
      topShops: []
    };

    const totalShops = LocalStorageService.getZoneVendors(zoneId).length;

    return {
      ...zone,
      totalShops: totalShops,
      revenueChange: this.calculateGrowth(zone.dailyRevenue, timeRange),
      ordersChange: this.calculateGrowth(zone.dailyRevenue, timeRange, 'orders')
    };
  }

  // Enhanced Zone Analytics Methods
  updateZoneAnalytics(zoneId, analyticsData) {
    const data = this.getData();
    if (!data.zones[zoneId]) {
      data.zones[zoneId] = {
        totalRevenue: 0,
        totalOrders: 0,
        totalShops: 0,
        activeShops: 0,
        dailyRevenue: [],
        monthlyRevenue: [],
        topShops: [],
        vendorPerformance: [],
        popularItems: [],
        peakHours: [],
        customerSatisfaction: 0,
        commissionEarned: 0,
        payoutsPending: 0,
        payoutsCompleted: 0
      };
    }

    // Merge new analytics data
    data.zones[zoneId] = {
      ...data.zones[zoneId],
      ...analyticsData,
      lastUpdated: new Date().toISOString()
    };

    this.saveData(data);
    return data.zones[zoneId];
  }

  // Get zone vendor performance
  getZoneVendorPerformance(zoneId) {
    const data = this.getData();
    const zoneData = data.zones[zoneId];
    return zoneData?.vendorPerformance || [];
  }

  // Update vendor performance in zone
  updateVendorPerformance(zoneId, vendorId, performanceData) {
    const data = this.getData();
    if (!data.zones[zoneId]) {
      data.zones[zoneId] = {
        totalRevenue: 0,
        totalOrders: 0,
        totalShops: 0,
        activeShops: 0,
        dailyRevenue: [],
        monthlyRevenue: [],
        topShops: [],
        vendorPerformance: []
      };
    }

    if (!data.zones[zoneId].vendorPerformance) {
      data.zones[zoneId].vendorPerformance = [];
    }

    const existingIndex = data.zones[zoneId].vendorPerformance.findIndex(v => v.vendorId === vendorId);
    if (existingIndex >= 0) {
      data.zones[zoneId].vendorPerformance[existingIndex] = {
        ...data.zones[zoneId].vendorPerformance[existingIndex],
        ...performanceData,
        lastUpdated: new Date().toISOString()
      };
    } else {
      data.zones[zoneId].vendorPerformance.push({
        vendorId,
        ...performanceData,
        lastUpdated: new Date().toISOString()
      });
    }

    this.saveData(data);
    return data.zones[zoneId].vendorPerformance;
  }

  // Get zone revenue breakdown
  getZoneRevenueBreakdown(zoneId, timeRange = '30d') {
    const data = this.getData();
    const zoneData = data.zones[zoneId];

    if (!zoneData) {
      return {
        totalRevenue: 0,
        vendorRevenue: [],
        commissionEarned: 0,
        payoutsPending: 0,
        payoutsCompleted: 0
      };
    }

    return {
      totalRevenue: zoneData.totalRevenue || 0,
      vendorRevenue: zoneData.vendorPerformance?.map(v => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        revenue: v.revenue || 0,
        orders: v.orders || 0,
        commission: v.commission || 0
      })) || [],
      commissionEarned: zoneData.commissionEarned || 0,
      payoutsPending: zoneData.payoutsPending || 0,
      payoutsCompleted: zoneData.payoutsCompleted || 0
    };
  }

  // Shop Analytics
  getShopAnalytics(shopId, timeRange = '7d') {
    const data = this.getData();
    const shop = data.shops[shopId] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgRating: 0,
      menuItems: 0,
      dailyRevenue: [],
      monthlyRevenue: [],
      popularItems: [],
      recentOrders: []
    };

    return {
      ...shop,
      revenueChange: this.calculateGrowth(shop.dailyRevenue, timeRange),
      ordersChange: this.calculateGrowth(shop.dailyRevenue, timeRange, 'orders')
    };
  }

  // Update analytics data
  updatePlatformAnalytics(newData) {
    const data = this.getData();
    data.platform = { ...data.platform, ...newData };
    this.saveData(data);
  }

  updateRestaurantAnalytics(restaurantId, newData) {
    const data = this.getData();
    if (!data.restaurants[restaurantId]) {
      data.restaurants[restaurantId] = {};
    }
    data.restaurants[restaurantId] = { ...data.restaurants[restaurantId], ...newData };
    this.saveData(data);
  }

  updateZoneAnalytics(zoneId, newData) {
    const data = this.getData();
    if (!data.zones[zoneId]) {
      data.zones[zoneId] = {};
    }
    data.zones[zoneId] = { ...data.zones[zoneId], ...newData };
    this.saveData(data);
  }

  updateShopAnalytics(shopId, newData) {
    const data = this.getData();
    if (!data.shops[shopId]) {
      data.shops[shopId] = {};
    }
    data.shops[shopId] = { ...data.shops[shopId], ...newData };
    this.saveData(data);
  }

  // Add revenue entry
  addRevenueEntry(entityType, entityId, amount, orders = 1) {
    const today = new Date().toISOString().split('T')[0];
    const data = this.getData();

    // Update platform data
    data.platform.totalRevenue += amount;
    data.platform.totalOrders += orders;
    this.addDailyEntry(data.platform.dailyRevenue, today, amount, orders);

    // Update entity-specific data
    if (entityType === 'restaurant') {
      if (!data.restaurants[entityId]) data.restaurants[entityId] = { totalRevenue: 0, totalOrders: 0, dailyRevenue: [] };
      data.restaurants[entityId].totalRevenue += amount;
      data.restaurants[entityId].totalOrders += orders;
      this.addDailyEntry(data.restaurants[entityId].dailyRevenue, today, amount, orders);
    } else if (entityType === 'zone') {
      if (!data.zones[entityId]) data.zones[entityId] = { totalRevenue: 0, totalOrders: 0, dailyRevenue: [] };
      data.zones[entityId].totalRevenue += amount;
      data.zones[entityId].totalOrders += orders;
      this.addDailyEntry(data.zones[entityId].dailyRevenue, today, amount, orders);
    } else if (entityType === 'shop') {
      if (!data.shops[entityId]) data.shops[entityId] = { totalRevenue: 0, totalOrders: 0, dailyRevenue: [] };
      data.shops[entityId].totalRevenue += amount;
      data.shops[entityId].totalOrders += orders;
      this.addDailyEntry(data.shops[entityId].dailyRevenue, today, amount, orders);
    }

    this.saveData(data);
  }

  addDailyEntry(dailyArray, date, revenue, orders) {
    const existingEntry = dailyArray.find(entry => entry.date === date);
    if (existingEntry) {
      existingEntry.revenue += revenue;
      existingEntry.orders += orders;
    } else {
      dailyArray.push({ date, revenue, orders });
    }

    // Keep only last 90 days
    dailyArray.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (dailyArray.length > 90) {
      dailyArray.splice(90);
    }
  }

  calculateGrowth(dailyData, timeRange, metric = 'revenue') {
    if (!dailyData || dailyData.length < 2) return 0;

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const recentData = dailyData.slice(0, days);
    const previousData = dailyData.slice(days, days * 2);

    if (recentData.length === 0 || previousData.length === 0) return 0;

    const recentTotal = recentData.reduce((sum, entry) => sum + (entry[metric] || 0), 0);
    const previousTotal = previousData.reduce((sum, entry) => sum + (entry[metric] || 0), 0);

    if (previousTotal === 0) return recentTotal > 0 ? 100 : 0;
    return ((recentTotal - previousTotal) / previousTotal) * 100;
  }

  // Get filtered data for Super Admin using real data from LocalStorageService
  getFilteredAnalytics(entityFilter, timeRange = '7d') {
    if (entityFilter === 'restaurants') {
      const restaurants = LocalStorageService.getRestaurants();
      return {
        entities: restaurants.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name,
          type: 'restaurant',
          totalRevenue: restaurant.revenue || 0,
          totalOrders: restaurant.orders || 0,
          status: restaurant.status,
          subscriptionPlan: restaurant.subscriptionPlan,
          revenueChange: Math.random() * 20 - 10 // Mock growth for now
        })),
        totalRevenue: restaurants.reduce((sum, r) => sum + (r.revenue || 0), 0),
        totalOrders: restaurants.reduce((sum, r) => sum + (r.orders || 0), 0)
      };
    } else if (entityFilter === 'zones') {
      const zones = LocalStorageService.getZones();
      return {
        entities: zones.map(zone => ({
          id: zone.id,
          name: zone.name,
          type: 'zone',
          totalRevenue: zone.totalRevenue || 0,
          totalOrders: zone.totalOrders || 0,
          status: zone.status,
          subscriptionPlan: zone.subscriptionPlan,
          totalShops: zone.shops?.length || 0,
          revenueChange: Math.random() * 15 - 7.5 // Mock growth for now
        })),
        totalRevenue: zones.reduce((sum, z) => sum + (z.totalRevenue || 0), 0),
        totalOrders: zones.reduce((sum, z) => sum + (z.totalOrders || 0), 0)
      };
    } else {
      return this.getPlatformAnalytics(timeRange);
    }
  }

  // Reset all data (for testing)
  resetData() {
    localStorage.removeItem(this.storageKey);
    this.initializeData();
  }
}

export default new AnalyticsService();
