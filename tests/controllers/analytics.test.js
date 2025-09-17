const analyticsController = require('../../src/controllers/analyticsController');
const analyticsService = require('../../src/services/analyticsService');
const TestHelpers = require('../helpers');

// Mock the analytics service
jest.mock('../../src/services/analyticsService');

describe('Analytics Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAnalytics', () => {
    it('should generate analytics successfully for restaurant', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0',
          period: 'day'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockAnalytics = TestHelpers.mockAnalytics();
      analyticsService.generateAnalytics.mockResolvedValue(mockAnalytics);

      await analyticsController.generateAnalytics(req, res);

      expect(analyticsService.generateAnalytics).toHaveBeenCalledWith(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0',
        'day',
        expect.any(Date)
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Analytics generated successfully',
        data: mockAnalytics
      });
    });

    it('should throw error for invalid entity type', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          entityType: 'invalid',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      await expect(analyticsController.generateAnalytics(req, res))
        .rejects.toThrow('Invalid entity type');
    });

    it('should throw error for missing entity type', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      await expect(analyticsController.generateAnalytics(req, res))
        .rejects.toThrow('Entity type is required');
    });

    it('should throw error for missing entity ID for non-platform analytics', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          entityType: 'restaurant'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      await expect(analyticsController.generateAnalytics(req, res))
        .rejects.toThrow('Entity ID is required for non-platform analytics');
    });
  });

  describe('getAnalytics', () => {
    it('should retrieve analytics successfully', async () => {
      const req = TestHelpers.mockRequest({
        params: {
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        query: {
          period: 'day',
          limit: '10'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockAnalytics = [TestHelpers.mockAnalytics()];
      
      // Mock Analytics.find() chain
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAnalytics)
      };

      // Mock the Analytics model
      const Analytics = require('../../src/models/Analytics');
      Analytics.find = jest.fn().mockReturnValue(mockFind);

      await analyticsController.getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: mockAnalytics.length,
        data: mockAnalytics
      });
    });

    it('should throw error for invalid entity type', async () => {
      const req = TestHelpers.mockRequest({
        params: {
          entityType: 'invalid',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      await expect(analyticsController.getAnalytics(req, res))
        .rejects.toThrow('Invalid entity type');
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should retrieve analytics summary successfully', async () => {
      const req = TestHelpers.mockRequest({
        params: {
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        query: {
          period: 'month'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockSummary = {
        period: { startDate: new Date(), endDate: new Date() },
        current: { orders: 100, revenue: 5000 },
        comparison: { orders: 10, revenue: 15 }
      };
      
      analyticsService.getAnalyticsSummary.mockResolvedValue(mockSummary);

      await analyticsController.getAnalyticsSummary(req, res);

      expect(analyticsService.getAnalyticsSummary).toHaveBeenCalledWith(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0',
        'month',
        'previous'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary
      });
    });
  });

  describe('getAnalyticsTrends', () => {
    it('should retrieve analytics trends successfully', async () => {
      const req = TestHelpers.mockRequest({
        params: {
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        query: {
          metric: 'revenue',
          period: 'day',
          duration: '30'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockTrends = [
        { date: new Date(), value: 100 },
        { date: new Date(), value: 150 }
      ];
      
      analyticsService.getAnalyticsTrends.mockResolvedValue(mockTrends);

      await analyticsController.getAnalyticsTrends(req, res);

      expect(analyticsService.getAnalyticsTrends).toHaveBeenCalledWith(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0',
        'revenue',
        'day',
        30
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTrends
      });
    });
  });

  describe('getDashboardAnalytics', () => {
    it('should retrieve platform dashboard for admin', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockDashboard = {
        summary: { totalRestaurants: 10, totalZones: 5 },
        thisMonth: { orders: 500, revenue: 25000 }
      };
      
      analyticsService.getPlatformDashboard.mockResolvedValue(mockDashboard);

      await analyticsController.getDashboardAnalytics(req, res);

      expect(analyticsService.getPlatformDashboard).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDashboard
      });
    });

    it('should retrieve entity dashboard for non-admin', async () => {
      const req = TestHelpers.mockRequest({
        query: {
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        user: TestHelpers.mockUser({ role: 'restaurant_owner' })
      });
      const res = TestHelpers.mockResponse();

      const mockDashboard = {
        realTime: { todayOrders: 10, todayRevenue: 500 },
        summary: { current: {}, comparison: {} }
      };
      
      analyticsService.getEntityDashboard.mockResolvedValue(mockDashboard);

      await analyticsController.getDashboardAnalytics(req, res);

      expect(analyticsService.getEntityDashboard).toHaveBeenCalledWith(
        'restaurant',
        '64a7b8c9d0e1f2a3b4c5d6f0'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDashboard
      });
    });

    it('should throw error for non-admin without entity info', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser({ role: 'restaurant_owner' })
      });
      const res = TestHelpers.mockResponse();

      await expect(analyticsController.getDashboardAnalytics(req, res))
        .rejects.toThrow('Entity type and ID are required for non-admin users');
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics as JSON', async () => {
      const req = TestHelpers.mockRequest({
        params: {
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        query: {
          format: 'json'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockExportData = [TestHelpers.mockAnalytics()];
      analyticsService.exportAnalytics.mockResolvedValue(mockExportData);

      await analyticsController.exportAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockExportData
      });
    });

    it('should export analytics as file', async () => {
      const req = TestHelpers.mockRequest({
        params: {
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        query: {
          format: 'csv'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockFileData = {
        url: '/downloads/analytics.csv',
        fileName: 'analytics.csv',
        size: 1024
      };
      analyticsService.exportAnalytics.mockResolvedValue(mockFileData);

      await analyticsController.exportAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Export completed successfully',
        data: mockFileData
      });
    });
  });

  describe('bulkGenerateAnalytics', () => {
    it('should generate analytics for multiple entities', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          entities: [
            { entityType: 'restaurant', entityId: '64a7b8c9d0e1f2a3b4c5d6f0' },
            { entityType: 'zone', entityId: '64a7b8c9d0e1f2a3b4c5d6f2' }
          ],
          period: 'day'
        },
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();

      const mockResults = {
        success: [
          { entityType: 'restaurant', entityId: '64a7b8c9d0e1f2a3b4c5d6f0' }
        ],
        failed: []
      };
      
      analyticsService.bulkGenerateAnalytics.mockResolvedValue(mockResults);

      await analyticsController.bulkGenerateAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Bulk analytics generation completed',
        data: mockResults
      });
    });

    it('should require admin role', async () => {
      const req = TestHelpers.mockRequest({
        body: { entities: [] },
        user: TestHelpers.mockUser({ role: 'restaurant_owner' })
      });
      const res = TestHelpers.mockResponse();

      await expect(analyticsController.bulkGenerateAnalytics(req, res))
        .rejects.toThrow('Only administrators can bulk generate analytics');
    });
  });
});