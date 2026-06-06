const Report = require('../models/Report');
const Analytics = require('../models/Analytics');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { UploadService } = require('./uploadService');
const analyticsService = require('./analyticsService');
const { logger } = require('../utils/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ReportService {
  constructor() {
    this.reportGenerators = {
      sales_summary: this.generateSalesSummaryReport.bind(this),
      order_analysis: this.generateOrderAnalysisReport.bind(this),
      customer_insights: this.generateCustomerInsightsReport.bind(this),
      menu_performance: this.generateMenuPerformanceReport.bind(this),
      operational_metrics: this.generateOperationalMetricsReport.bind(this),
      financial_report: this.generateFinancialReport.bind(this),
      growth_analysis: this.generateGrowthAnalysisReport.bind(this),
      comparative_analysis: this.generateComparativeAnalysisReport.bind(this),
      custom_query: this.generateCustomQueryReport.bind(this)
    };
  }

  // Execute a report
  async executeReport(reportId, userId = null) {
    try {
      const report = await Report.findById(reportId).populate('entity', 'name');
      
      if (!report) {
        throw new Error('Report not found');
      }

      // Check permissions if userId provided
      if (userId && !report.canUserAccess(userId, 'view')) {
        throw new Error('Access denied to this report');
      }

      const startTime = Date.now();
      
      // Add execution record
      const executionId = await report.addExecution({
        executedBy: userId,
        status: 'running'
      });

      try {
        // Generate report data
        const reportData = await this.generateReportData(report);
        
        // Format report based on requested format
        const formattedReport = await this.formatReport(reportData, report.format, report);
        
        // Save file if needed
        let fileUrl = null;
        let fileSize = 0;
        
        if (report.format !== 'json') {
          const uploadResult = await this.saveReportFile(formattedReport, report);
          fileUrl = uploadResult.url;
          fileSize = uploadResult.size;
        }

        const duration = Date.now() - startTime;

        // Update execution record
        await Report.findOneAndUpdate(
          { _id: reportId, 'executions._id': executionId },
          {
            $set: {
              'executions.$.status': 'completed',
              'executions.$.duration': duration,
              'executions.$.recordsProcessed': Array.isArray(reportData.data) ? reportData.data.length : 1,
              'executions.$.fileUrl': fileUrl,
              'executions.$.fileSize': fileSize
            }
          }
        );

        logger.info('Report executed successfully', {
          reportId,
          userId,
          duration,
          format: report.format,
          recordsProcessed: Array.isArray(reportData.data) ? reportData.data.length : 1
        });

        return {
          report: reportData,
          execution: {
            duration,
            recordsProcessed: Array.isArray(reportData.data) ? reportData.data.length : 1,
            fileUrl,
            format: report.format
          }
        };

      } catch (error) {
        // Update execution record with error
        await Report.findOneAndUpdate(
          { _id: reportId, 'executions._id': executionId },
          {
            $set: {
              'executions.$.status': 'failed',
              'executions.$.duration': Date.now() - startTime,
              'executions.$.error': error.message
            }
          }
        );

        throw error;
      }

    } catch (error) {
      logger.error('Error executing report', { reportId, userId, error: error.message });
      throw error;
    }
  }

  // Generate report data based on report configuration
  async generateReportData(report) {
    const generator = this.reportGenerators[report.type];
    
    if (!generator) {
      throw new Error(`Unknown report type: ${report.type}`);
    }

    return await generator(report);
  }

  // Sales Summary Report
  async generateSalesSummaryReport(report) {
    const { dateRange, metrics } = report.configuration;
    const { startDate, endDate } = this.getDateRange(dateRange);

    const query = {
      entityType: report.entityType,
      date: { $gte: startDate, $lte: endDate }
    };

    if (report.entityId) {
      query.entityId = report.entityId;
    }

    const analytics = await Analytics.find(query).sort({ date: 1 });

    const summary = {
      period: {
        startDate,
        endDate,
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      },
      totals: {
        orders: analytics.reduce((sum, a) => sum + (a.metrics.orders?.total || 0), 0),
        revenue: analytics.reduce((sum, a) => sum + (a.metrics.revenue?.total || 0), 0),
        customers: analytics.reduce((sum, a) => sum + (a.metrics.customers?.total || 0), 0)
      },
      averages: {},
      trends: this.calculateTrends(analytics)
    };

    // Calculate averages
    const days = summary.period.days || 1;
    summary.averages = {
      ordersPerDay: Math.round((summary.totals.orders / days) * 100) / 100,
      revenuePerDay: Math.round((summary.totals.revenue / days) * 100) / 100,
      customersPerDay: Math.round((summary.totals.customers / days) * 100) / 100,
      averageOrderValue: summary.totals.orders > 0 
        ? Math.round((summary.totals.revenue / summary.totals.orders) * 100) / 100 
        : 0
    };

    return {
      title: 'Sales Summary Report',
      generated: new Date(),
      entityType: report.entityType,
      entityName: report.entity?.name || 'Platform',
      data: summary
    };
  }

  // Order Analysis Report
  async generateOrderAnalysisReport(report) {
    const { dateRange, filters } = report.configuration;
    const { startDate, endDate } = this.getDateRange(dateRange);

    const query = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Add entity filter
    switch (report.entityType) {
      case 'restaurant':
        query.restaurantId = report.entityId;
        break;
      case 'zone':
        query.zoneId = report.entityId;
        break;
      case 'shop':
        query.shopId = report.entityId;
        break;
    }

    // Add additional filters
    if (filters?.orderStatus?.length > 0) {
      query.status = { $in: filters.orderStatus };
    }

    if (filters?.priceRange) {
      query.finalAmount = {};
      if (filters.priceRange.min) query.finalAmount.$gte = filters.priceRange.min;
      if (filters.priceRange.max) query.finalAmount.$lte = filters.priceRange.max;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    const analysis = {
      totalOrders: orders.length,
      statusBreakdown: this.getStatusBreakdown(orders),
      timeAnalysis: this.getTimeAnalysis(orders),
      valueAnalysis: this.getValueAnalysis(orders),
      customerAnalysis: this.getCustomerAnalysis(orders)
    };

    return {
      title: 'Order Analysis Report',
      generated: new Date(),
      entityType: report.entityType,
      entityName: report.entity?.name || 'Platform',
      period: { startDate, endDate },
      data: analysis
    };
  }

  // Menu Performance Report
  async generateMenuPerformanceReport(report) {
    const { dateRange } = report.configuration;
    const { startDate, endDate } = this.getDateRange(dateRange);

    const query = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Add entity filter
    switch (report.entityType) {
      case 'restaurant':
        query.restaurantId = report.entityId;
        break;
      case 'zone':
        query.zoneId = report.entityId;
        break;
      case 'shop':
        query.shopId = report.entityId;
        break;
    }

    const orders = await Order.find(query).populate('items.menuItemId', 'name categoryId price');

    const menuPerformance = {
      itemPerformance: this.calculateItemPerformance(orders),
      categoryPerformance: this.calculateCategoryPerformance(orders),
      popularityTrends: this.calculatePopularityTrends(orders),
      revenueContribution: this.calculateRevenueContribution(orders)
    };

    return {
      title: 'Menu Performance Report',
      generated: new Date(),
      entityType: report.entityType,
      entityName: report.entity?.name || 'Platform',
      period: { startDate, endDate },
      data: menuPerformance
    };
  }

  // Customer Insights Report
  async generateCustomerInsightsReport(report) {
    const { dateRange } = report.configuration;
    const { startDate, endDate } = this.getDateRange(dateRange);

    const query = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Add entity filter
    switch (report.entityType) {
      case 'restaurant':
        query.restaurantId = report.entityId;
        break;
      case 'zone':
        query.zoneId = report.entityId;
        break;
      case 'shop':
        query.shopId = report.entityId;
        break;
    }

    const orders = await Order.find(query);

    const customerInsights = {
      customerSegmentation: this.analyzeCustomerSegmentation(orders),
      behaviorPatterns: this.analyzeBehaviorPatterns(orders),
      retentionAnalysis: this.analyzeCustomerRetention(orders),
      valueSegments: this.analyzeCustomerValue(orders)
    };

    return {
      title: 'Customer Insights Report',
      generated: new Date(),
      entityType: report.entityType,
      entityName: report.entity?.name || 'Platform',
      period: { startDate, endDate },
      data: customerInsights
    };
  }

  // Financial Report
  async generateFinancialReport(report) {
    const { dateRange } = report.configuration;
    const { startDate, endDate } = this.getDateRange(dateRange);

    const query = {
      entityType: report.entityType,
      date: { $gte: startDate, $lte: endDate }
    };

    if (report.entityId) {
      query.entityId = report.entityId;
    }

    const analytics = await Analytics.find(query).sort({ date: 1 });

    const financial = {
      revenueBreakdown: this.calculateRevenueBreakdown(analytics),
      profitAnalysis: this.calculateProfitAnalysis(analytics),
      costAnalysis: this.calculateCostAnalysis(analytics),
      margins: this.calculateMargins(analytics),
      projections: this.calculateProjections(analytics)
    };

    return {
      title: 'Financial Report',
      generated: new Date(),
      entityType: report.entityType,
      entityName: report.entity?.name || 'Platform',
      period: { startDate, endDate },
      data: financial
    };
  }

  // Growth Analysis Report
  async generateGrowthAnalysisReport(report) {
    const { dateRange } = report.configuration;
    const { startDate, endDate } = this.getDateRange(dateRange);

    const query = {
      entityType: report.entityType,
      date: { $gte: startDate, $lte: endDate }
    };

    if (report.entityId) {
      query.entityId = report.entityId;
    }

    const analytics = await Analytics.find(query).sort({ date: 1 });

    const growth = {
      overallGrowth: this.calculateOverallGrowth(analytics),
      monthlyGrowth: this.calculateMonthlyGrowth(analytics),
      seasonalTrends: this.calculateSeasonalTrends(analytics),
      forecasting: this.calculateForecast(analytics)
    };

    return {
      title: 'Growth Analysis Report',
      generated: new Date(),
      entityType: report.entityType,
      entityName: report.entity?.name || 'Platform',
      period: { startDate, endDate },
      data: growth
    };
  }

  // Operational Metrics Report
  async generateOperationalMetricsReport(report) {
    const { dateRange } = report.configuration;
    const { startDate, endDate } = this.getDateRange(dateRange);

    const query = {
      entityType: report.entityType,
      date: { $gte: startDate, $lte: endDate }
    };

    if (report.entityId) {
      query.entityId = report.entityId;
    }

    const analytics = await Analytics.find(query).sort({ date: 1 });

    const operational = {
      efficiency: this.calculateEfficiencyMetrics(analytics),
      performance: this.calculatePerformanceMetrics(analytics),
      capacity: this.calculateCapacityMetrics(analytics),
      quality: this.calculateQualityMetrics(analytics)
    };

    return {
      title: 'Operational Metrics Report',
      generated: new Date(),
      entityType: report.entityType,
      entityName: report.entity?.name || 'Platform',
      period: { startDate, endDate },
      data: operational
    };
  }

  // Comparative Analysis Report
  async generateComparativeAnalysisReport(report) {
    // Implementation for comparative analysis
    return {
      title: 'Comparative Analysis Report',
      generated: new Date(),
      data: { message: 'Comparative analysis report implementation pending' }
    };
  }

  // Custom Query Report
  async generateCustomQueryReport(report) {
    // Implementation for custom queries
    return {
      title: 'Custom Query Report',
      generated: new Date(),
      data: { message: 'Custom query report implementation pending' }
    };
  }

  // Format report based on requested format
  async formatReport(reportData, format, report) {
    switch (format) {
      case 'json':
        return reportData;
      case 'csv':
        return await this.formatAsCSV(reportData);
      case 'excel':
        return await this.formatAsExcel(reportData, report);
      case 'pdf':
        return await this.formatAsPDF(reportData, report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Format as CSV
  async formatAsCSV(reportData) {
    // Simple CSV implementation - would need more sophisticated handling for complex data
    const flatten = (obj, prefix = '') => {
      const flattened = {};
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, flatten(obj[key], `${prefix}${key}.`));
        } else {
          flattened[`${prefix}${key}`] = obj[key];
        }
      }
      return flattened;
    };

    const flatData = flatten(reportData.data);
    const headers = Object.keys(flatData);
    const values = Object.values(flatData);

    let csv = headers.join(',') + '\n';
    csv += values.join(',') + '\n';

    return Buffer.from(csv, 'utf-8');
  }

  // Format as Excel
  async formatAsExcel(reportData, report) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(report.name || 'Report');

    // Add header
    worksheet.addRow([reportData.title]);
    worksheet.addRow([`Generated: ${reportData.generated}`]);
    worksheet.addRow([`Entity: ${reportData.entityName}`]);
    worksheet.addRow([]); // Empty row

    // Add data (simplified - would need more complex handling for nested data)
    const data = reportData.data;
    if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        worksheet.addRow([key, JSON.stringify(value)]);
      }
    }

    return await workbook.xlsx.writeBuffer();
  }

  // Format as PDF
  async formatAsPDF(reportData, report) {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    
    // Add content
    doc.fontSize(20).text(reportData.title, 100, 100);
    doc.fontSize(12).text(`Generated: ${reportData.generated}`, 100, 140);
    doc.text(`Entity: ${reportData.entityName}`, 100, 160);
    
    // Add data (simplified)
    let yPosition = 200;
    const data = reportData.data;
    
    if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        doc.text(`${key}: ${JSON.stringify(value)}`, 100, yPosition);
        yPosition += 20;
        
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }
      }
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  // Save report file to storage
  async saveReportFile(fileBuffer, report) {
    const fileName = `${report.name}-${Date.now()}`;
    const extension = this.getFileExtension(report.format);
    
    // For now, return mock data - would integrate with actual file storage
    return {
      url: `/reports/${fileName}.${extension}`,
      size: fileBuffer.length
    };
  }

  // Get file extension for format
  getFileExtension(format) {
    const extensions = {
      csv: 'csv',
      excel: 'xlsx',
      pdf: 'pdf'
    };
    return extensions[format] || 'txt';
  }

  // Utility methods for data analysis
  getDateRange(dateRangeConfig) {
    const now = new Date();
    let startDate, endDate;

    switch (dateRangeConfig.type) {
      case 'custom':
        startDate = new Date(dateRangeConfig.startDate);
        endDate = new Date(dateRangeConfig.endDate);
        break;
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        endDate = now;
        break;
      case 'last_6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        endDate = now;
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        endDate = now;
        break;
      case 'year_to_date':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    return { startDate, endDate };
  }

  // Calculate trends from analytics data
  calculateTrends(analytics) {
    if (analytics.length < 2) return {};

    const first = analytics[0];
    const last = analytics[analytics.length - 1];

    const orderGrowth = this.calculateGrowthRate(
      first.metrics.orders?.total || 0,
      last.metrics.orders?.total || 0
    );

    const revenueGrowth = this.calculateGrowthRate(
      first.metrics.revenue?.total || 0,
      last.metrics.revenue?.total || 0
    );

    return { orderGrowth, revenueGrowth };
  }

  calculateGrowthRate(start, end) {
    if (start === 0) return end > 0 ? 100 : 0;
    return Math.round(((end - start) / start) * 100);
  }

  // Additional analysis methods would be implemented here...
  getStatusBreakdown(orders) {
    const breakdown = {};
    orders.forEach(order => {
      breakdown[order.status] = (breakdown[order.status] || 0) + 1;
    });
    return breakdown;
  }

  getTimeAnalysis(orders) {
    return {
      averagePreparationTime: orders
        .filter(o => o.deliveryInfo?.actualTime)
        .reduce((sum, o) => {
          const prep = new Date(o.deliveryInfo.actualTime) - new Date(o.createdAt);
          return sum + (prep / (1000 * 60)); // minutes
        }, 0) / orders.length || 0
    };
  }

  getValueAnalysis(orders) {
    const values = orders.map(o => o.finalAmount || 0);
    return {
      average: values.reduce((sum, v) => sum + v, 0) / values.length || 0,
      min: Math.min(...values) || 0,
      max: Math.max(...values) || 0
    };
  }

  getCustomerAnalysis(orders) {
    const customers = new Set();
    orders.forEach(o => {
      const id = o.customer.phone || o.customer.email;
      if (id) customers.add(id);
    });
    return {
      uniqueCustomers: customers.size,
      ordersPerCustomer: orders.length / customers.size || 0
    };
  }

  // Scheduled report execution
  async executeScheduledReports() {
    try {
      const dueReports = await Report.findDueReports();
      
      logger.info('Executing scheduled reports', { count: dueReports.length });

      for (const report of dueReports) {
        try {
          await this.executeReport(report._id);
          logger.info('Scheduled report executed', { reportId: report._id, name: report.name });
        } catch (error) {
          logger.error('Failed to execute scheduled report', { 
            reportId: report._id, 
            name: report.name, 
            error: error.message 
          });
        }
      }

    } catch (error) {
      logger.error('Error executing scheduled reports', { error: error.message });
    }
  }

  // Additional placeholder methods for complex calculations
  calculateItemPerformance(orders) { return {}; }
  calculateCategoryPerformance(orders) { return {}; }
  calculatePopularityTrends(orders) { return {}; }
  calculateRevenueContribution(orders) { return {}; }
  analyzeCustomerSegmentation(orders) { return {}; }
  analyzeBehaviorPatterns(orders) { return {}; }
  analyzeCustomerRetention(orders) { return {}; }
  analyzeCustomerValue(orders) { return {}; }
  calculateRevenueBreakdown(analytics) { return {}; }
  calculateProfitAnalysis(analytics) { return {}; }
  calculateCostAnalysis(analytics) { return {}; }
  calculateMargins(analytics) { return {}; }
  calculateProjections(analytics) { return {}; }
  calculateOverallGrowth(analytics) { return {}; }
  calculateMonthlyGrowth(analytics) { return {}; }
  calculateSeasonalTrends(analytics) { return {}; }
  calculateForecast(analytics) { return {}; }
  calculateEfficiencyMetrics(analytics) { return {}; }
  calculatePerformanceMetrics(analytics) { return {}; }
  calculateCapacityMetrics(analytics) { return {}; }
  calculateQualityMetrics(analytics) { return {}; }

  // Calculate next run time for scheduled reports
  calculateNextRun(frequency, dayOfWeek = null, dayOfMonth = null, time = '09:00') {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date();
    
    nextRun.setHours(hours, minutes, 0, 0);
    
    switch (frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
        
      case 'weekly':
        const currentDay = nextRun.getDay();
        const targetDay = dayOfWeek !== null ? dayOfWeek : 1; // Default to Monday
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
        
      case 'monthly':
        const targetDayOfMonth = dayOfMonth !== null ? dayOfMonth : 1;
        nextRun.setDate(targetDayOfMonth);
        
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(targetDayOfMonth);
        }
        break;
        
      case 'quarterly':
        nextRun.setDate(1);
        nextRun.setMonth(Math.floor(nextRun.getMonth() / 3) * 3);
        
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 3);
        }
        break;
        
      case 'yearly':
        nextRun.setMonth(0, 1);
        
        if (nextRun <= now) {
          nextRun.setFullYear(nextRun.getFullYear() + 1);
        }
        break;
        
      default:
        nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }

  // Generate access key for report sharing
  generateAccessKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  // Get available report templates
  getReportTemplates() {
    return {
      sales_summary: {
        name: 'Sales Summary',
        description: 'Overview of sales performance including orders, revenue, and customer metrics',
        defaultMetrics: ['orders_total', 'revenue_total', 'customers_total', 'average_order_value'],
        supportedFormats: ['json', 'csv', 'excel', 'pdf'],
        recommendedPeriod: 'month'
      },
      order_analysis: {
        name: 'Order Analysis',
        description: 'Detailed analysis of order patterns, status distribution, and timing',
        defaultMetrics: ['orders_total', 'orders_completed', 'orders_cancelled', 'completion_rate'],
        supportedFormats: ['json', 'csv', 'excel'],
        recommendedPeriod: 'week'
      },
      customer_insights: {
        name: 'Customer Insights',
        description: 'Customer behavior analysis including new vs returning customers',
        defaultMetrics: ['customers_total', 'customers_new', 'customers_returning', 'average_order_value'],
        supportedFormats: ['json', 'csv', 'excel', 'pdf'],
        recommendedPeriod: 'month'
      },
      menu_performance: {
        name: 'Menu Performance',
        description: 'Analysis of menu item and category performance',
        defaultMetrics: ['popular_items', 'category_performance'],
        supportedFormats: ['json', 'csv', 'excel'],
        recommendedPeriod: 'month'
      },
      operational_metrics: {
        name: 'Operational Metrics',
        description: 'Operational efficiency including preparation times and peak hours',
        defaultMetrics: ['preparation_time', 'peak_hours'],
        supportedFormats: ['json', 'csv', 'excel'],
        recommendedPeriod: 'week'
      },
      financial_report: {
        name: 'Financial Report',
        description: 'Comprehensive financial analysis including revenue breakdown and trends',
        defaultMetrics: ['revenue_total', 'revenue_growth'],
        supportedFormats: ['json', 'excel', 'pdf'],
        recommendedPeriod: 'month'
      },
      growth_analysis: {
        name: 'Growth Analysis',
        description: 'Growth trends and projections across key metrics',
        defaultMetrics: ['growth_trends', 'revenue_growth'],
        supportedFormats: ['json', 'excel', 'pdf'],
        recommendedPeriod: 'month'
      },
      comparative_analysis: {
        name: 'Comparative Analysis',
        description: 'Period-over-period comparison of key performance indicators',
        defaultMetrics: ['orders_total', 'revenue_total', 'customers_total'],
        supportedFormats: ['json', 'excel', 'pdf'],
        recommendedPeriod: 'month'
      },
      custom_query: {
        name: 'Custom Query',
        description: 'Flexible report with custom metrics and filters',
        defaultMetrics: [],
        supportedFormats: ['json', 'csv', 'excel'],
        recommendedPeriod: 'custom'
      }
    };
  }
}

module.exports = new ReportService();