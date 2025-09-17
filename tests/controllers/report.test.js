const reportController = require('../../src/controllers/reportController');
const reportService = require('../../src/services/reportService');
const TestHelpers = require('../helpers');

// Mock the report service and model
jest.mock('../../src/services/reportService');
jest.mock('../../src/models/Report');

describe('Report Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('should create a new report successfully', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          name: 'Test Report',
          type: 'sales_summary',
          entityType: 'restaurant',
          entityId: '64a7b8c9d0e1f2a3b4c5d6f0'
        },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      const mockReport = {
        _id: '64a7b8c9d0e1f2a3b4c5d6f8',
        name: 'Test Report',
        type: 'sales_summary',
        entityType: 'restaurant',
        entityId: '64a7b8c9d0e1f2a3b4c5d6f0',
        createdBy: req.user.id,
        save: jest.fn().mockResolvedValue(),
        populate: jest.fn().mockResolvedValue()
      };

      const Report = require('../../src/models/Report');
      Report.mockImplementation(() => mockReport);

      await reportController.createReport(req, res);

      expect(mockReport.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Report created successfully',
        data: mockReport
      });
    });

    it('should throw error for missing report name', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          type: 'sales_summary',
          entityType: 'restaurant'
        },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      await expect(reportController.createReport(req, res))
        .rejects.toThrow('Report name is required');
    });

    it('should throw error for missing entity ID for non-platform reports', async () => {
      const req = TestHelpers.mockRequest({
        body: {
          name: 'Test Report',
          type: 'sales_summary',
          entityType: 'restaurant'
        },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      await expect(reportController.createReport(req, res))
        .rejects.toThrow('Entity ID is required for non-platform reports');
    });
  });

  describe('getReports', () => {
    it('should retrieve reports with pagination', async () => {
      const req = TestHelpers.mockRequest({
        query: {
          page: '1',
          limit: '10',
          status: 'active'
        },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      const mockReports = [
        {
          _id: '64a7b8c9d0e1f2a3b4c5d6f8',
          name: 'Test Report 1',
          type: 'sales_summary'
        },
        {
          _id: '64a7b8c9d0e1f2a3b4c5d6f9',
          name: 'Test Report 2',
          type: 'order_analysis'
        }
      ];

      const Report = require('../../src/models/Report');
      Report.countDocuments = jest.fn().mockResolvedValue(2);
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReports)
      };
      Report.find = jest.fn().mockReturnValue(mockFind);

      await reportController.getReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: mockReports.length,
        pagination: {
          page: 1,
          pages: 1,
          total: 2,
          limit: 10
        },
        data: mockReports
      });
    });
  });

  describe('executeReport', () => {
    it('should execute report successfully', async () => {
      const req = TestHelpers.mockRequest({
        params: { id: '64a7b8c9d0e1f2a3b4c5d6f8' },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      const mockReport = {
        _id: '64a7b8c9d0e1f2a3b4c5d6f8',
        status: 'active',
        canUserAccess: jest.fn().mockReturnValue(true)
      };

      const mockResult = {
        report: { title: 'Sales Summary', data: {} },
        execution: { duration: 1000, recordsProcessed: 100 }
      };

      const Report = require('../../src/models/Report');
      Report.findById = jest.fn().mockResolvedValue(mockReport);
      reportService.executeReport.mockResolvedValue(mockResult);

      await reportController.executeReport(req, res);

      expect(reportService.executeReport).toHaveBeenCalledWith(
        '64a7b8c9d0e1f2a3b4c5d6f8',
        req.user.id
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Report executed successfully',
        data: mockResult
      });
    });

    it('should throw error for non-existent report', async () => {
      const req = TestHelpers.mockRequest({
        params: { id: '64a7b8c9d0e1f2a3b4c5d6f8' },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      const Report = require('../../src/models/Report');
      Report.findById = jest.fn().mockResolvedValue(null);

      await expect(reportController.executeReport(req, res))
        .rejects.toThrow('Report not found');
    });

    it('should throw error for inactive report', async () => {
      const req = TestHelpers.mockRequest({
        params: { id: '64a7b8c9d0e1f2a3b4c5d6f8' },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      const mockReport = {
        _id: '64a7b8c9d0e1f2a3b4c5d6f8',
        status: 'archived',
        canUserAccess: jest.fn().mockReturnValue(true)
      };

      const Report = require('../../src/models/Report');
      Report.findById = jest.fn().mockResolvedValue(mockReport);

      await expect(reportController.executeReport(req, res))
        .rejects.toThrow('Cannot execute inactive report');
    });
  });

  describe('scheduleReport', () => {
    it('should schedule report successfully', async () => {
      const req = TestHelpers.mockRequest({
        params: { id: '64a7b8c9d0e1f2a3b4c5d6f8' },
        body: {
          enabled: true,
          frequency: 'weekly',
          dayOfWeek: 1,
          time: '09:00'
        },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      const mockReport = {
        _id: '64a7b8c9d0e1f2a3b4c5d6f8',
        canUserAccess: jest.fn().mockReturnValue(true),
        schedule: { enabled: false },
        save: jest.fn().mockResolvedValue()
      };

      const Report = require('../../src/models/Report');
      Report.findById = jest.fn().mockResolvedValue(mockReport);
      reportService.calculateNextRun = jest.fn().mockReturnValue(new Date());

      await reportController.scheduleReport(req, res);

      expect(mockReport.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Report schedule updated successfully',
        data: mockReport.schedule
      });
    });
  });

  describe('shareReport', () => {
    it('should share report with users', async () => {
      const req = TestHelpers.mockRequest({
        params: { id: '64a7b8c9d0e1f2a3b4c5d6f8' },
        body: {
          userIds: ['64a7b8c9d0e1f2a3b4c5d6ea'],
          permission: 'view',
          isPublic: false
        },
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();

      const mockReport = {
        _id: '64a7b8c9d0e1f2a3b4c5d6f8',
        createdBy: req.user.id,
        sharing: { sharedWith: [] },
        save: jest.fn().mockResolvedValue(),
        populate: jest.fn().mockResolvedValue()
      };

      const Report = require('../../src/models/Report');
      Report.findById = jest.fn().mockResolvedValue(mockReport);

      await reportController.shareReport(req, res);

      expect(mockReport.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Report sharing updated successfully',
        data: mockReport.sharing
      });
    });

    it('should throw error for non-creator/admin', async () => {
      const req = TestHelpers.mockRequest({
        params: { id: '64a7b8c9d0e1f2a3b4c5d6f8' },
        body: { userIds: [] },
        user: TestHelpers.mockUser({ id: 'different-user-id' })
      });
      const res = TestHelpers.mockResponse();

      const mockReport = {
        _id: '64a7b8c9d0e1f2a3b4c5d6f8',
        createdBy: 'original-creator-id'
      };

      const Report = require('../../src/models/Report');
      Report.findById = jest.fn().mockResolvedValue(mockReport);

      await expect(reportController.shareReport(req, res))
        .rejects.toThrow('Only the report creator or admin can share reports');
    });
  });

  describe('getReportTemplates', () => {
    it('should return available report templates', async () => {
      const req = TestHelpers.mockRequest();
      const res = TestHelpers.mockResponse();

      const mockTemplates = {
        sales_summary: {
          name: 'Sales Summary',
          description: 'Overview of sales performance',
          defaultMetrics: ['orders_total', 'revenue_total']
        }
      };

      reportService.getReportTemplates.mockReturnValue(mockTemplates);

      await reportController.getReportTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTemplates
      });
    });
  });
});