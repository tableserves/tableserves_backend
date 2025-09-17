const request = require('supertest');
const express = require('express');
const analyticsRoutes = require('../../src/routes/analyticsRoutes');

// Create test app
const app = express();
app.use(express.json());

// Local mock helpers to avoid out-of-scope issues
const mockAnalytics = (overrides = {}) => ({
  _id: '64a7b8c9d0e1f2a3b4c5d6f8',
  entityType: 'restaurant',
  entityId: '64a7b8c9d0e1f2a3b4c5d6f0',
  date: new Date(),
  period: 'day',
  metrics: {
    orders: {
      total: 25,
      completed: 20,
      cancelled: 2,
      pending: 3,
      averageValue: 28.50,
      completionRate: 80
    },
    revenue: {
      total: 570.00,
      gross: 570.00,
      net: 542.65,
      fees: 27.35
    },
    customers: {
      total: 15,
      new: 5,
      returning: 10,
      averageOrderValue: 38.00
    }
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock middleware
jest.mock('../../src/middleware/authMiddleware', () => {
  const mockTestHelpers = {
    mockUser: (overrides = {}) => ({
      _id: '64a7b8c9d0e1f2a3b4c5d6e7',
      email: 'test@example.com',
      role: 'admin',
      ...overrides
    })
  };
  
  return {
    authenticate: (req, res, next) => {
      req.user = mockTestHelpers.mockUser({ role: 'admin' });
      next();
    },
    authorize: (...roles) => (req, res, next) => {
      if (roles.includes(req.user.role) || req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ success: false, error: { message: 'Insufficient permissions' } });
      }
    }
  };
});

jest.mock('../../src/middleware/validationMiddleware', () => ({
  validateRequest: (req, res, next) => {
    // Simple validation for testing - check if entityType is valid
    if (req.params.entityType && !['restaurant', 'zone', 'shop', 'platform'].includes(req.params.entityType)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid entity type' } });
    }
    // Check if entityType is missing in body for POST requests
    if (req.method === 'POST' && req.body && !req.body.entityType) {
      return res.status(400).json({ success: false, error: { message: 'Entity type is required' } });
    }
    next();
  }
}));

// Mock services
jest.mock('../../src/services/analyticsService');
jest.mock('../../src/models/Analytics');

app.use('/api/v1/analytics', analyticsRoutes);

describe('Analytics API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/analytics/generate', () => {
    it('should generate analytics successfully', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockAnalyticsData = mockAnalytics();
      analyticsService.generateAnalytics.mockResolvedValue(mockAnalyticsData);

      const response = await request(app)
        .post('/api/v1/analytics/generate')
        .send({
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0',
          period: 'day'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Analytics generated successfully');
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 for invalid entity type', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/generate')
        .send({
          entityType: 'invalid',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing entity type', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/generate')
        .send({
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/analytics/:entityType/:entityId', () => {
    it('should retrieve analytics successfully', async () => {
      const mockAnalyticsArray = [mockAnalytics()];
      
      const Analytics = require('../../src/models/Analytics');
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAnalyticsArray)
      };
      Analytics.find = jest.fn().mockReturnValue(mockFind);

      const response = await request(app)
        .get('/api/v1/analytics/restaurant/64a7b8c9d0e1f2a3b4c5d6f0')
        .query({ period: 'day', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });

    it('should return 400 for invalid entity type', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/invalid/64a7b8c9d0e1f2a3b4c5d6f0');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/analytics/:entityType/:entityId/summary', () => {
    it('should retrieve analytics summary successfully', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockSummary = {
        period: { startDate: new Date().toISOString(), endDate: new Date().toISOString() },
        current: { orders: 100, revenue: 5000 },
        comparison: { orders: 10, revenue: 15 }
      };
      analyticsService.getAnalyticsSummary.mockResolvedValue(mockSummary);

      const response = await request(app)
        .get('/api/v1/analytics/restaurant/64a7b8c9d0e1f2a3b4c5d6f0/summary')
        .query({ period: 'month' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSummary);
    });
  });

  describe('GET /api/v1/analytics/:entityType/:entityId/trends', () => {
    it('should retrieve analytics trends successfully', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockTrends = [
        { date: new Date().toISOString(), value: 100 },
        { date: new Date().toISOString(), value: 150 }
      ];
      analyticsService.getAnalyticsTrends.mockResolvedValue(mockTrends);

      const response = await request(app)
        .get('/api/v1/analytics/restaurant/64a7b8c9d0e1f2a3b4c5d6f0/trends')
        .query({ metric: 'revenue', period: 'day', duration: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTrends);
    });
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should retrieve dashboard analytics for admin', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockDashboard = {
        summary: { totalRestaurants: 10, totalZones: 5 },
        thisMonth: { orders: 500, revenue: 25000 }
      };
      analyticsService.getPlatformDashboard.mockResolvedValue(mockDashboard);

      const response = await request(app)
        .get('/api/v1/analytics/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDashboard);
    });
  });

  describe('GET /api/v1/analytics/:entityType/:entityId/performance', () => {
    it('should retrieve performance metrics successfully', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockPerformance = [
        { itemId: 'item1', name: 'Item 1', orders: 50, revenue: 500 },
        { itemId: 'item2', name: 'Item 2', orders: 30, revenue: 300 }
      ];
      analyticsService.getPerformanceMetrics.mockResolvedValue(mockPerformance);

      const response = await request(app)
        .get('/api/v1/analytics/restaurant/64a7b8c9d0e1f2a3b4c5d6f0/performance')
        .query({ type: 'items', period: 'month', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPerformance);
    });
  });

  describe('GET /api/v1/analytics/:entityType/:entityId/export', () => {
    it('should export analytics as JSON', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockExportData = [mockAnalytics()];
      analyticsService.exportAnalytics.mockResolvedValue(mockExportData);

      const response = await request(app)
        .get('/api/v1/analytics/restaurant/64a7b8c9d0e1f2a3b4c5d6f0/export')
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockExportData);
    });

    it('should export analytics as file', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockFileData = {
        downloadUrl: '/downloads/analytics.csv',
        fileName: 'analytics.csv',
        fileSize: 1024
      };
      analyticsService.exportAnalytics.mockResolvedValue(mockFileData);

      const response = await request(app)
        .get('/api/v1/analytics/restaurant/64a7b8c9d0e1f2a3b4c5d6f0/export')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Export completed successfully');
      expect(response.body.data).toEqual(mockFileData);
    });
  });

  describe('POST /api/v1/analytics/bulk-generate', () => {
    it('should bulk generate analytics successfully', async () => {
      const analyticsService = require('../../src/services/analyticsService');
      const mockResults = {
        success: [
          { entityType: 'restaurant', entityId: '64a7b8c9d0e1f2a3b4c5d6f0' }
        ],
        failed: []
      };
      analyticsService.bulkGenerateAnalytics.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/v1/analytics/bulk-generate')
        .send({
          entities: [
            { entityType: 'restaurant', entityId: '64a7b8c9d0e1f2a3b4c5d6f0' }
          ],
          period: 'day'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bulk analytics generation completed');
      expect(response.body.data).toEqual(mockResults);
    });

    it('should require admin role', async () => {
      // Create new app instance with different auth mock
      const testApp = express();
      testApp.use(express.json());
      
      // Mock non-admin auth for this test
      const mockNonAdminAuth = {
        authenticate: (req, res, next) => {
          req.user = { _id: '64a7b8c9d0e1f2a3b4c5d6e7', role: 'restaurant_owner' };
          next();
        },
        authorize: (...roles) => (req, res, next) => {
          if (roles.includes(req.user.role) || req.user.role === 'admin') {
            next();
          } else {
            res.status(403).json({ success: false, error: { message: 'Insufficient permissions' } });
          }
        }
      };
      
      // Apply the auth mock and routes to test app
      jest.doMock('../../src/middleware/authMiddleware', () => mockNonAdminAuth);
      delete require.cache[require.resolve('../../src/routes/analyticsRoutes')];
      const analyticsRoutesWithMock = require('../../src/routes/analyticsRoutes');
      testApp.use('/api/v1/analytics', analyticsRoutesWithMock);

      const response = await request(testApp)
        .post('/api/v1/analytics/bulk-generate')
        .send({
          entities: [],
          period: 'day'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});