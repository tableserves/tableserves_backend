const analyticsService = require('../../src/services/analyticsService');
const TestHelpers = require('../helpers');

// Mock the models
jest.mock('../../src/models/Analytics');
jest.mock('../../src/models/Order');
jest.mock('../../src/models/MenuItem');
jest.mock('../../src/models/Restaurant');
jest.mock('../../src/models/Zone');
jest.mock('../../src/models/ZoneShop');

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAnalytics', () => {
    it('should generate analytics for restaurant', async () => {
      const mockOrders = [
        TestHelpers.mockOrder({
          status: 'completed',
          finalAmount: 25.99,
          customer: { phone: '+1234567890' },
          items: [{ menuItemId: 'item1', quantity: 2, subtotal: 25.99 }]
        }),
        TestHelpers.mockOrder({
          status: 'pending',
          finalAmount: 15.50,
          customer: { phone: '+0987654321' },
          items: [{ menuItemId: 'item2', quantity: 1, subtotal: 15.50 }]
        })
      ];

      const Order = require('../../src/models/Order');
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockOrders)
      };
      Order.find = jest.fn().mockReturnValue(mockFind);

      const Analytics = require('../../src/models/Analytics');
      const mockAnalytics = TestHelpers.mockAnalytics();
      Analytics.findOneAndUpdate = jest.fn().mockResolvedValue(mockAnalytics);

      const result = await analyticsService.generateAnalytics(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0',
        'day',
        new Date()
      );

      expect(Order.find).toHaveBeenCalled();
      expect(Analytics.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const Order = require('../../src/models/Order');
      Order.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(analyticsService.generateAnalytics(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0'
      )).rejects.toThrow('Database error');
    });
  });

  describe('calculateOrderMetrics', () => {
    it('should calculate order metrics correctly', () => {
      const orders = [
        TestHelpers.mockOrder({ status: 'completed', finalAmount: 25.99, items: [{}, {}] }),
        TestHelpers.mockOrder({ status: 'completed', finalAmount: 15.50, items: [{}] }),
        TestHelpers.mockOrder({ status: 'cancelled', finalAmount: 30.00, items: [{}, {}, {}] }),
        TestHelpers.mockOrder({ status: 'pending', finalAmount: 20.00, items: [{}] })
      ];

      const metrics = analyticsService.calculateOrderMetrics(orders);

      expect(metrics.total).toBe(4);
      expect(metrics.completed).toBe(2);
      expect(metrics.cancelled).toBe(1);
      expect(metrics.pending).toBe(1);
      expect(metrics.averageValue).toBe(22.87); // (25.99 + 15.50 + 30.00 + 20.00) / 4
      expect(metrics.averageItems).toBe(1.75); // (2 + 1 + 3 + 1) / 4
      expect(metrics.completionRate).toBe(50); // 2/4 * 100
    });

    it('should handle empty orders array', () => {
      const metrics = analyticsService.calculateOrderMetrics([]);

      expect(metrics.total).toBe(0);
      expect(metrics.completed).toBe(0);
      expect(metrics.cancelled).toBe(0);
      expect(metrics.pending).toBe(0);
      expect(metrics.averageValue).toBe(0);
      expect(metrics.averageItems).toBe(0);
      expect(metrics.completionRate).toBe(0);
    });
  });

  describe('calculateRevenueMetrics', () => {
    it('should calculate revenue metrics correctly', () => {
      const orders = [
        TestHelpers.mockOrder({ 
          finalAmount: 25.99, 
          totalAmount: 28.00, 
          fees: 2.01,
          refundAmount: 0,
          tipAmount: 3.00 
        }),
        TestHelpers.mockOrder({ 
          finalAmount: 15.50, 
          totalAmount: 16.00, 
          fees: 0.50,
          refundAmount: 0,
          tipAmount: 2.00 
        })
      ];

      const metrics = analyticsService.calculateRevenueMetrics(orders);

      expect(metrics.total).toBe(41.49); // 25.99 + 15.50
      expect(metrics.gross).toBe(44.00); // 28.00 + 16.00
      expect(metrics.fees).toBe(2.51); // 2.01 + 0.50
      expect(metrics.refunds).toBe(0);
      expect(metrics.tips).toBe(5.00); // 3.00 + 2.00
      expect(metrics.net).toBe(38.98); // 41.49 - 2.51 - 0
    });
  });

  describe('calculateCustomerMetrics', () => {
    it('should calculate customer metrics correctly', () => {
      const orders = [
        TestHelpers.mockOrder({ 
          customer: { phone: '+1234567890' }, 
          finalAmount: 25.99 
        }),
        TestHelpers.mockOrder({ 
          customer: { phone: '+1234567890' }, // Same customer
          finalAmount: 15.50 
        }),
        TestHelpers.mockOrder({ 
          customer: { phone: '+0987654321' }, // Different customer
          finalAmount: 30.00 
        })
      ];

      const metrics = analyticsService.calculateCustomerMetrics(orders);

      expect(metrics.total).toBe(2); // 2 unique customers
      expect(metrics.returning).toBe(1); // 1 customer with >1 order
      expect(metrics.new).toBe(1); // 2 - 1 = 1 new customer
      expect(metrics.averageOrderValue).toBeCloseTo(35.75, 1); // 71.49 / 2 customers
      expect(metrics.retentionRate).toBe(50); // 1/2 * 100
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should get analytics summary with comparison', async () => {
      const mockCurrentAnalytics = [
        TestHelpers.mockAnalytics({
          metrics: {
            orders: { total: 50 },
            revenue: { total: 1000 },
            customers: { total: 30 }
          }
        })
      ];

      const mockPreviousAnalytics = [
        TestHelpers.mockAnalytics({
          metrics: {
            orders: { total: 40 },
            revenue: { total: 800 },
            customers: { total: 25 }
          }
        })
      ];

      const Analytics = require('../../src/models/Analytics');
      Analytics.find = jest.fn()
        .mockResolvedValueOnce(mockCurrentAnalytics)
        .mockResolvedValueOnce(mockPreviousAnalytics);

      const result = await analyticsService.getAnalyticsSummary(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0',
        'month',
        'previous'
      );

      expect(result.current.orders).toBe(50);
      expect(result.current.revenue).toBe(1000);
      expect(result.current.customers).toBe(30);
      expect(result.comparison.orders).toBe(25); // (50-40)/40*100
      expect(result.comparison.revenue).toBe(25); // (1000-800)/800*100
      expect(result.comparison.customers).toBe(20); // (30-25)/25*100
    });
  });

  describe('getAnalyticsTrends', () => {
    it('should get analytics trends', async () => {
      const mockAnalytics = [
        TestHelpers.mockAnalytics({
          date: new Date('2024-01-01'),
          metrics: { revenue: { total: 500 } }
        }),
        TestHelpers.mockAnalytics({
          date: new Date('2024-01-02'),
          metrics: { revenue: { total: 750 } }
        })
      ];

      const Analytics = require('../../src/models/Analytics');
      const mockFind = {
        sort: jest.fn().mockResolvedValue(mockAnalytics)
      };
      Analytics.find = jest.fn().mockReturnValue(mockFind);

      const result = await analyticsService.getAnalyticsTrends(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0',
        'revenue',
        'day',
        30
      );

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(500);
      expect(result[1].value).toBe(750);
    });
  });

  describe('getPlatformDashboard', () => {
    it('should get platform dashboard analytics', async () => {
      const mockAnalytics = [
        TestHelpers.mockAnalytics({
          metrics: {
            platform: {
              activeRestaurants: 10,
              activeZones: 5,
              activeShops: 25,
              totalUsers: 100
            },
            orders: { total: 500 },
            revenue: { total: 10000 },
            customers: { total: 200 }
          }
        })
      ];

      const Analytics = require('../../src/models/Analytics');
      const mockFind = {
        sort: jest.fn().mockResolvedValue(mockAnalytics)
      };
      Analytics.find = jest.fn().mockReturnValue(mockFind);

      const result = await analyticsService.getPlatformDashboard();

      expect(result.summary.totalRestaurants).toBe(10);
      expect(result.summary.totalZones).toBe(5);
      expect(result.summary.totalShops).toBe(25);
      expect(result.summary.totalUsers).toBe(100);
      expect(result.thisMonth.orders).toBe(500);
      expect(result.thisMonth.revenue).toBe(10000);
    });
  });

  describe('bulkGenerateAnalytics', () => {
    it('should generate analytics for multiple entities', async () => {
      const entities = [
        { entityType: 'restaurant', entityId: '64a7b8c9d0e1f2a3b4c5d6f0' },
        { entityType: 'zone', entityId: '64a7b8c9d0e1f2a3b4c5d6f2' }
      ];

      // Mock successful generation
      const mockAnalytics = TestHelpers.mockAnalytics();
      jest.spyOn(analyticsService, 'generateAnalytics')
        .mockResolvedValue(mockAnalytics);

      const result = await analyticsService.bulkGenerateAnalytics(entities);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(analyticsService.generateAnalytics).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      const entities = [
        { entityType: 'restaurant', entityId: '64a7b8c9d0e1f2a3b4c5d6f0' },
        { entityType: 'zone', entityId: '64a7b8c9d0e1f2a3b4c5d6f2' }
      ];

      // Mock one success and one failure
      jest.spyOn(analyticsService, 'generateAnalytics')
        .mockResolvedValueOnce(TestHelpers.mockAnalytics())
        .mockRejectedValueOnce(new Error('Generation failed'));

      const result = await analyticsService.bulkGenerateAnalytics(entities);

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Generation failed');
    });
  });
});