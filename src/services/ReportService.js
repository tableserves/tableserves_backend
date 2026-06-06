import LocalStorageService from './LocalStorageService';
import DataService from './DataService';

class ReportService {
  // Generate comprehensive reports with real data
  static async generateReport(reportType, dateRange, format) {
    const reportData = await this.getReportData(reportType, dateRange);
    const reportContent = this.formatReportContent(reportData, reportType, format);

    return {
      data: reportData,
      content: reportContent,
      filename: this.generateFilename(reportType, dateRange, format),
      size: this.estimateFileSize(reportData, format)
    };
  }

  // Get real data for different report types
  static async getReportData(reportType, dateRange) {
    const restaurants = await LocalStorageService.getRestaurants();
    const zones = LocalStorageService.getZones();
    const dateFilter = this.getDateFilter(dateRange);

    switch (reportType) {
      case 'revenue':
        return this.generateRevenueReport(restaurants, zones, dateFilter);
      case 'orders':
        return this.generateOrdersReport(restaurants, zones, dateFilter);
      case 'customers':
        return this.generateCustomersReport(restaurants, zones, dateFilter);
      case 'restaurants':
        return this.generateRestaurantPerformanceReport(restaurants, dateFilter);
      case 'tables':
        return this.generateTableUtilizationReport(restaurants, dateFilter);
      case 'analytics':
        return this.generatePlatformAnalyticsReport(restaurants, zones, dateFilter);
      default:
        return this.generateRevenueReport(restaurants, zones, dateFilter);
    }
  }

  // Revenue Report with real data
  static generateRevenueReport(restaurants, zones, dateFilter) {
    const restaurantsArray = Array.isArray(restaurants) ? restaurants : [];
    const zonesArray = Array.isArray(zones) ? zones : [];

    const totalRevenue = this.calculateTotalRevenue(restaurantsArray, zonesArray);
    const restaurantRevenue = restaurantsArray.map(r => ({
      id: r?.id || 'unknown',
      name: r?.name || 'Unknown Restaurant',
      revenue: r?.revenue || 0,
      orders: r?.orders || 0,
      avgOrderValue: r?.revenue && r?.orders ? (r.revenue / r.orders).toFixed(2) : 0,
      status: r?.status || 'unknown',
      subscriptionPlan: r?.subscriptionPlan || 'unknown'
    }));

    const zoneRevenue = zonesArray.map(z => ({
      id: z?.id || 'unknown',
      name: z?.name || 'Unknown Zone',
      revenue: z?.totalRevenue || 0,
      commission: z?.commissionEarned || 0,
      shops: z?.shops?.length || 0,
      status: z.status
    }));

    return {
      summary: {
        totalRevenue,
        totalRestaurants: restaurantsArray.length,
        totalZones: zonesArray.length,
        activeRestaurants: restaurantsArray.filter(r => r && r.status === 'active').length,
        activeZones: zonesArray.filter(z => z && z.status === 'active').length,
        averageRevenuePerRestaurant: restaurantsArray.length > 0 ? (totalRevenue / restaurantsArray.length).toFixed(2) : 0
      },
      restaurantBreakdown: restaurantRevenue,
      zoneBreakdown: zoneRevenue,
      trends: this.generateRevenueTrends(restaurants, zones),
      topPerformers: this.getTopPerformers(restaurantRevenue, zoneRevenue)
    };
  }

  // Orders Report with real data
  static generateOrdersReport(restaurants, zones, dateFilter) {
    const totalOrders = this.calculateTotalOrders(restaurants, zones);

    // Get order data from localStorage
    const allOrders = [];
    restaurants.forEach(r => {
      const orders = JSON.parse(localStorage.getItem(`restaurant_orders_${r.id}`) || '[]');
      orders.forEach(order => {
        allOrders.push({
          ...order,
          restaurantId: r.id,
          restaurantName: r.name,
          type: 'restaurant'
        });
      });
    });

    zones.forEach(z => {
      const orders = JSON.parse(localStorage.getItem(`zone_orders_${z.id}`) || '[]');
      orders.forEach(order => {
        allOrders.push({
          ...order,
          zoneId: z.id,
          zoneName: z.name,
          type: 'zone'
        });
      });
    });

    // Filter orders by date range
    const filteredOrders = this.filterOrdersByDate(allOrders, dateFilter);

    return {
      summary: {
        totalOrders,
        ordersInPeriod: filteredOrders.length,
        averageOrderValue: this.calculateAverageOrderValue(filteredOrders),
        ordersByStatus: this.groupOrdersByStatus(filteredOrders),
        ordersByType: this.groupOrdersByType(filteredOrders)
      },
      orderDetails: filteredOrders.slice(0, 1000), // Limit to 1000 for performance
      hourlyDistribution: this.getHourlyOrderDistribution(filteredOrders),
      dailyTrends: this.getDailyOrderTrends(filteredOrders),
      popularItems: this.getPopularItems(filteredOrders)
    };
  }

  // Customer Report with real data
  static generateCustomersReport(restaurants, zones, dateFilter) {
    // Generate customer data from orders
    const customerData = this.extractCustomerDataFromOrders(restaurants, zones);

    return {
      summary: {
        totalCustomers: customerData.length,
        activeCustomers: customerData.filter(c => c.lastOrderDate && this.isWithinDateRange(c.lastOrderDate, dateFilter)).length,
        averageOrdersPerCustomer: customerData.length > 0 ? (customerData.reduce((sum, c) => sum + c.totalOrders, 0) / customerData.length).toFixed(2) : 0,
        averageSpendPerCustomer: customerData.length > 0 ? (customerData.reduce((sum, c) => sum + c.totalSpent, 0) / customerData.length).toFixed(2) : 0,
        customerRetentionRate: this.calculateRetentionRate(customerData)
      },
      customerSegments: this.segmentCustomers(customerData),
      topCustomers: customerData.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 50),
      customerBehavior: this.analyzeCustomerBehavior(customerData),
      geographicDistribution: this.getGeographicDistribution(customerData)
    };
  }

  // Restaurant Performance Report
  static generateRestaurantPerformanceReport(restaurants, dateFilter) {
    return {
      summary: {
        totalRestaurants: restaurants.length,
        activeRestaurants: restaurants.filter(r => r.status === 'active').length,
        suspendedRestaurants: restaurants.filter(r => r.status === 'suspended').length,
        averageRating: this.calculateAverageRating(restaurants)
      },
      performanceMetrics: restaurants.map(r => ({
        id: r.id,
        name: r.name,
        owner: r.ownerName,
        status: r.status,
        subscriptionPlan: r.subscriptionPlan,
        revenue: r.revenue || 0,
        orders: r.orders || 0,
        tables: r.tables || 0,
        menuItems: r.menuItems?.length || 0,
        rating: r.rating || 0,
        createdAt: r.createdAt,
        lastActive: r.lastActive || r.updatedAt
      })),
      subscriptionBreakdown: this.getSubscriptionBreakdown(restaurants),
      performanceTrends: this.getPerformanceTrends(restaurants)
    };
  }

  // Table Utilization Report
  static generateTableUtilizationReport(restaurants, dateFilter) {
    const tableData = restaurants.map(r => ({
      restaurantId: r.id,
      restaurantName: r.name,
      totalTables: r.tables || 0,
      utilizationRate: Math.random() * 100, // Mock utilization rate
      averageTurnover: Math.random() * 5 + 1, // Mock turnover rate
      peakHours: ['12:00-14:00', '19:00-21:00'], // Mock peak hours
      revenue: r.revenue || 0
    }));

    return {
      summary: {
        totalTables: tableData.reduce((sum, r) => sum + r.totalTables, 0),
        averageUtilization: tableData.length > 0 ? (tableData.reduce((sum, r) => sum + r.utilizationRate, 0) / tableData.length).toFixed(2) : 0,
        averageTurnover: tableData.length > 0 ? (tableData.reduce((sum, r) => sum + r.averageTurnover, 0) / tableData.length).toFixed(2) : 0
      },
      restaurantTableData: tableData,
      utilizationTrends: this.generateUtilizationTrends(tableData),
      recommendations: this.generateTableRecommendations(tableData)
    };
  }

  // Platform Analytics Report
  static generatePlatformAnalyticsReport(restaurants, zones, dateFilter) {
    const stats = DataService.getSuperAdminStats();

    return {
      platformOverview: {
        totalRestaurants: stats.totalRestaurants,
        totalZones: stats.totalZones,
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        activeUsers: stats.activeUsers,
        monthlyGrowth: stats.monthlyGrowth
      },
      growthMetrics: this.calculateGrowthMetrics(restaurants, zones),
      userEngagement: this.calculateUserEngagement(restaurants, zones),
      systemPerformance: this.getSystemPerformanceMetrics(),
      marketInsights: this.generateMarketInsights(restaurants, zones)
    };
  }

  // Helper methods for calculations
  static calculateTotalRevenue(restaurants, zones) {
    const restaurantsArray = Array.isArray(restaurants) ? restaurants : [];
    const zonesArray = Array.isArray(zones) ? zones : [];

    const restaurantRevenue = restaurantsArray.reduce((sum, r) => {
      if (!r) return sum;
      return sum + (parseFloat(r.revenue) || 0);
    }, 0);

    const zoneRevenue = zonesArray.reduce((sum, z) => {
      if (!z) return sum;
      return sum + (parseFloat(z.totalRevenue) || 0);
    }, 0);

    return restaurantRevenue + zoneRevenue;
  }

  static calculateTotalOrders(restaurants, zones) {
    const restaurantsArray = Array.isArray(restaurants) ? restaurants : [];
    const zonesArray = Array.isArray(zones) ? zones : [];

    const restaurantOrders = restaurantsArray.reduce((sum, r) => {
      if (!r) return sum;
      return sum + (r.orders || 0);
    }, 0);

    const zoneOrders = zonesArray.reduce((sum, z) => {
      if (!z) return sum;
      return sum + (z.totalOrders || 0);
    }, 0);

    return restaurantOrders + zoneOrders;
  }

  static getDateFilter(dateRange) {
    const now = new Date();
    const filters = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      yesterday: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      last7days: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      last30days: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      last90days: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      thismonth: new Date(now.getFullYear(), now.getMonth(), 1),
      lastmonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      thisyear: new Date(now.getFullYear(), 0, 1)
    };
    return filters[dateRange] || filters.last30days;
  }

  // Generate filename for download
  static generateFilename(reportType, dateRange, format) {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${reportType}-report-${dateRange}-${timestamp}.${format}`;
  }

  // Estimate file size
  static estimateFileSize(data, format) {
    const dataSize = JSON.stringify(data).length;
    const multipliers = { pdf: 3, excel: 2, csv: 1 };
    const estimatedBytes = dataSize * (multipliers[format] || 1);

    if (estimatedBytes < 1024) return `${estimatedBytes} B`;
    if (estimatedBytes < 1024 * 1024) return `${(estimatedBytes / 1024).toFixed(1)} KB`;
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Additional helper methods
  static generateRevenueTrends(restaurants, zones) {
    // Mock trend data - in real app, this would analyze historical data
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        revenue: Math.random() * 5000 + 1000,
        orders: Math.floor(Math.random() * 50 + 10)
      };
    });
    return last30Days;
  }

  static getTopPerformers(restaurantRevenue, zoneRevenue) {
    const topRestaurants = restaurantRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const topZones = zoneRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return { restaurants: topRestaurants, zones: topZones };
  }

  static filterOrdersByDate(orders, dateFilter) {
    const ordersArray = Array.isArray(orders) ? orders : [];
    return ordersArray.filter(order => {
      if (!order) return false;
      const orderDate = new Date(order.orderTime || order.timestamp || order.createdAt);
      return orderDate >= dateFilter;
    });
  }

  static calculateAverageOrderValue(orders) {
    const ordersArray = Array.isArray(orders) ? orders : [];
    if (ordersArray.length === 0) return 0;

    const totalValue = ordersArray.reduce((sum, order) => {
      if (!order) return sum;
      return sum + (order.total || order.grandTotal || 0);
    }, 0);

    return (totalValue / ordersArray.length).toFixed(2);
  }

  static groupOrdersByStatus(orders) {
    const statusGroups = {};
    orders.forEach(order => {
      const status = order.status || 'unknown';
      statusGroups[status] = (statusGroups[status] || 0) + 1;
    });
    return statusGroups;
  }

  static groupOrdersByType(orders) {
    const typeGroups = {};
    orders.forEach(order => {
      const type = order.type || 'unknown';
      typeGroups[type] = (typeGroups[type] || 0) + 1;
    });
    return typeGroups;
  }

  static getHourlyOrderDistribution(orders) {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      orders: 0
    }));

    orders.forEach(order => {
      const orderDate = new Date(order.orderTime || order.timestamp || order.createdAt);
      const hour = orderDate.getHours();
      hourlyData[hour].orders++;
    });

    return hourlyData;
  }

  static getDailyOrderTrends(orders) {
    const dailyData = {};
    orders.forEach(order => {
      const orderDate = new Date(order.orderTime || order.timestamp || order.createdAt);
      const dateKey = orderDate.toLocaleDateString('en-CA');
      dailyData[dateKey] = (dailyData[dateKey] || 0) + 1;
    });

    return Object.entries(dailyData).map(([date, count]) => ({
      date,
      orders: count
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  static getPopularItems(orders) {
    const itemCounts = {};
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const itemName = item.name || item.itemName;
          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    return Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  static extractCustomerDataFromOrders(restaurants, zones) {
    const customerMap = {};

    // Extract from restaurant orders
    restaurants.forEach(r => {
      const orders = JSON.parse(localStorage.getItem(`restaurant_orders_${r.id}`) || '[]');
      orders.forEach(order => {
        const customerId = order.customerPhone || order.customerEmail || order.customerId;
        if (customerId) {
          if (!customerMap[customerId]) {
            customerMap[customerId] = {
              id: customerId,
              name: order.customerName || 'Unknown Customer',
              phone: order.customerPhone,
              email: order.customerEmail,
              totalOrders: 0,
              totalSpent: 0,
              lastOrderDate: null,
              firstOrderDate: null,
              favoriteRestaurant: null
            };
          }

          const customer = customerMap[customerId];
          customer.totalOrders++;
          customer.totalSpent += order.total || order.grandTotal || 0;

          const orderDate = new Date(order.orderTime || order.timestamp || order.createdAt);
          if (!customer.lastOrderDate || orderDate > new Date(customer.lastOrderDate)) {
            customer.lastOrderDate = orderDate.toISOString();
          }
          if (!customer.firstOrderDate || orderDate < new Date(customer.firstOrderDate)) {
            customer.firstOrderDate = orderDate.toISOString();
          }
        }
      });
    });

    return Object.values(customerMap);
  }

  static calculateRetentionRate(customerData) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeCustomers = customerData.filter(c =>
      c.lastOrderDate && new Date(c.lastOrderDate) >= thirtyDaysAgo
    ).length;

    return customerData.length > 0 ? ((activeCustomers / customerData.length) * 100).toFixed(2) : 0;
  }

  static segmentCustomers(customerData) {
    const segments = {
      new: customerData.filter(c => c.totalOrders <= 2).length,
      regular: customerData.filter(c => c.totalOrders > 2 && c.totalOrders <= 10).length,
      loyal: customerData.filter(c => c.totalOrders > 10).length,
      highValue: customerData.filter(c => c.totalSpent > 1000).length
    };
    return segments;
  }

  static analyzeCustomerBehavior(customerData) {
    const avgOrdersPerCustomer = customerData.length > 0 ?
      (customerData.reduce((sum, c) => sum + c.totalOrders, 0) / customerData.length).toFixed(2) : 0;

    const avgSpendPerCustomer = customerData.length > 0 ?
      (customerData.reduce((sum, c) => sum + c.totalSpent, 0) / customerData.length).toFixed(2) : 0;

    return {
      averageOrdersPerCustomer: avgOrdersPerCustomer,
      averageSpendPerCustomer: avgSpendPerCustomer,
      repeatCustomerRate: customerData.filter(c => c.totalOrders > 1).length / customerData.length * 100
    };
  }

  static getGeographicDistribution(customerData) {
    // Mock geographic data - in real app, this would use actual location data
    return [
      { location: 'New York', customers: Math.floor(customerData.length * 0.3) },
      { location: 'Los Angeles', customers: Math.floor(customerData.length * 0.2) },
      { location: 'Chicago', customers: Math.floor(customerData.length * 0.15) },
      { location: 'Houston', customers: Math.floor(customerData.length * 0.1) },
      { location: 'Other', customers: Math.floor(customerData.length * 0.25) }
    ];
  }

  static calculateAverageRating(restaurants) {
    const ratingsSum = restaurants.reduce((sum, r) => sum + (r.rating || 0), 0);
    return restaurants.length > 0 ? (ratingsSum / restaurants.length).toFixed(2) : 0;
  }

  static getSubscriptionBreakdown(restaurants) {
    const breakdown = {};
    restaurants.forEach(r => {
      const plan = r.subscriptionPlan || 'Unknown';
      breakdown[plan] = (breakdown[plan] || 0) + 1;
    });
    return breakdown;
  }

  static getPerformanceTrends(restaurants) {
    // Mock performance trends - in real app, this would analyze historical data
    return restaurants.map(r => ({
      restaurantId: r.id,
      name: r.name,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      growthRate: (Math.random() * 20 - 10).toFixed(2) // -10% to +10%
    }));
  }

  static generateUtilizationTrends(tableData) {
    return tableData.map(r => ({
      restaurantId: r.restaurantId,
      name: r.restaurantName,
      weeklyTrend: Array.from({ length: 7 }, () => Math.random() * 100)
    }));
  }

  static generateTableRecommendations(tableData) {
    return tableData.map(r => {
      const recommendations = [];
      if (r.utilizationRate < 50) {
        recommendations.push('Consider reducing table count or improving marketing');
      }
      if (r.utilizationRate > 90) {
        recommendations.push('Consider adding more tables or optimizing turnover');
      }
      if (r.averageTurnover < 2) {
        recommendations.push('Focus on improving service speed');
      }
      return {
        restaurantId: r.restaurantId,
        name: r.restaurantName,
        recommendations: recommendations.length > 0 ? recommendations : ['Performance is optimal']
      };
    });
  }

  static calculateGrowthMetrics(restaurants, zones) {
    // Mock growth metrics - in real app, this would compare with historical data
    return {
      restaurantGrowth: '12.5%',
      zoneGrowth: '8.3%',
      revenueGrowth: '15.2%',
      orderGrowth: '18.7%'
    };
  }

  static calculateUserEngagement(restaurants, zones) {
    return {
      dailyActiveUsers: Math.floor(Math.random() * 1000 + 500),
      monthlyActiveUsers: Math.floor(Math.random() * 5000 + 2000),
      averageSessionDuration: '12.5 minutes',
      bounceRate: '23.4%'
    };
  }

  static getSystemPerformanceMetrics() {
    return {
      uptime: '99.9%',
      averageResponseTime: '245ms',
      errorRate: '0.1%',
      throughput: '1,250 requests/minute'
    };
  }

  static generateMarketInsights(restaurants, zones) {
    return {
      topCuisines: ['Italian', 'Chinese', 'Mexican', 'Indian', 'American'],
      peakOrderTimes: ['12:00-14:00', '19:00-21:00'],
      averageOrderValue: '$25.50',
      customerSatisfactionScore: '4.6/5'
    };
  }

  static isWithinDateRange(date, dateFilter) {
    return new Date(date) >= dateFilter;
  }

  // Format report content for different formats
  static formatReportContent(data, reportType, format) {
    switch (format) {
      case 'csv':
        return this.formatAsCSV(data, reportType);
      case 'excel':
        return this.formatAsExcel(data, reportType);
      case 'pdf':
        return this.formatAsPDF(data, reportType);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  static formatAsCSV(data, reportType) {
    // Convert data to CSV format
    let csv = '';

    if (reportType === 'revenue' && data.restaurantBreakdown) {
      csv += 'Restaurant ID,Name,Revenue,Orders,Avg Order Value,Status,Subscription Plan\n';
      data.restaurantBreakdown.forEach(r => {
        csv += `${r.id},"${r.name}",${r.revenue},${r.orders},${r.avgOrderValue},${r.status},${r.subscriptionPlan}\n`;
      });
    } else if (reportType === 'orders' && data.orderDetails) {
      csv += 'Order ID,Customer,Restaurant,Total,Status,Order Time\n';
      data.orderDetails.forEach(o => {
        csv += `${o.id || o.orderId},"${o.customerName || 'Unknown'}","${o.restaurantName || o.zoneName || 'Unknown'}",${o.total || o.grandTotal || 0},${o.status},${o.orderTime || o.timestamp}\n`;
      });
    }

    return csv;
  }

  static formatAsExcel(data, reportType) {
    // For Excel format, we'll return structured data that can be converted to Excel
    return {
      type: 'excel',
      data: data,
      reportType: reportType,
      sheets: this.createExcelSheets(data, reportType)
    };
  }

  static formatAsPDF(data, reportType) {
    // For PDF format, we'll return structured data that can be converted to PDF
    return {
      type: 'pdf',
      data: data,
      reportType: reportType,
      title: this.getReportTitle(reportType),
      sections: this.createPDFSections(data, reportType)
    };
  }

  static createExcelSheets(data, reportType) {
    const sheets = [];

    if (reportType === 'revenue') {
      sheets.push({
        name: 'Summary',
        data: [
          ['Metric', 'Value'],
          ['Total Revenue', data.summary?.totalRevenue || 0],
          ['Total Restaurants', data.summary?.totalRestaurants || 0],
          ['Total Zones', data.summary?.totalZones || 0],
          ['Active Restaurants', data.summary?.activeRestaurants || 0],
          ['Active Zones', data.summary?.activeZones || 0]
        ]
      });

      if (data.restaurantBreakdown) {
        sheets.push({
          name: 'Restaurant Revenue',
          data: [
            ['ID', 'Name', 'Revenue', 'Orders', 'Avg Order Value', 'Status', 'Plan'],
            ...data.restaurantBreakdown.map(r => [
              r.id, r.name, r.revenue, r.orders, r.avgOrderValue, r.status, r.subscriptionPlan
            ])
          ]
        });
      }
    }

    return sheets;
  }

  static createPDFSections(data, reportType) {
    const sections = [];

    sections.push({
      title: 'Executive Summary',
      content: this.generateExecutiveSummary(data, reportType)
    });

    if (data.summary) {
      sections.push({
        title: 'Key Metrics',
        content: this.formatSummaryForPDF(data.summary)
      });
    }

    return sections;
  }

  static getReportTitle(reportType) {
    const titles = {
      revenue: 'Revenue Analysis Report',
      orders: 'Order Statistics Report',
      customers: 'Customer Insights Report',
      restaurants: 'Restaurant Performance Report',
      tables: 'Table Utilization Report',
      analytics: 'Platform Analytics Report'
    };
    return titles[reportType] || 'Business Report';
  }

  static generateExecutiveSummary(data, reportType) {
    if (reportType === 'revenue' && data.summary) {
      return `This revenue report provides a comprehensive analysis of platform performance.
              Total revenue across ${data.summary.totalRestaurants} restaurants and ${data.summary.totalZones} zones
              amounts to $${data.summary.totalRevenue}. The average revenue per restaurant is $${data.summary.averageRevenuePerRestaurant}.`;
    }
    return 'This report provides insights into platform performance and business metrics.';
  }

  static formatSummaryForPDF(summary) {
    return Object.entries(summary).map(([key, value]) => `${key}: ${value}`).join('\n');
  }
}

export default ReportService;
