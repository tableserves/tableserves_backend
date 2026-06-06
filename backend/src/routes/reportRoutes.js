const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// Apply authentication to all report routes
router.use(authenticate);

// Controllers
const {
  createReport,
  getReports,
  getReport,
  updateReport,
  executeReport,
  getReportExecutions,
  scheduleReport,
  shareReport,
  cloneReport,
  deleteReport,
  getReportTemplates
} = require('../controllers/reportController');

// Validation schemas
const { body, param, query } = require('express-validator');

// Validation rules
const createReportValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Report name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .isIn([
      'sales_summary',
      'order_analysis',
      'customer_insights',
      'menu_performance',
      'operational_metrics',
      'financial_report',
      'growth_analysis',
      'comparative_analysis',
      'custom_query'
    ])
    .withMessage('Invalid report type'),
  body('entityType')
    .isIn(['restaurant', 'zone', 'shop', 'platform'])
    .withMessage('Invalid entity type'),
  body('entityId')
    .optional()
    .isMongoId()
    .withMessage('Invalid entity ID'),
  body('configuration.dateRange.type')
    .optional()
    .isIn(['custom', 'last_7_days', 'last_30_days', 'last_3_months', 'last_6_months', 'last_year', 'year_to_date'])
    .withMessage('Invalid date range type'),
  body('configuration.dateRange.startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('configuration.dateRange.endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('configuration.metrics')
    .optional()
    .isArray()
    .withMessage('Metrics must be an array'),
  body('configuration.groupBy')
    .optional()
    .isIn(['hour', 'day', 'week', 'month', 'category', 'item', 'customer'])
    .withMessage('Invalid groupBy value'),
  body('configuration.limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  body('format')
    .optional()
    .isIn(['json', 'csv', 'excel', 'pdf'])
    .withMessage('Invalid report format')
];

const updateReportValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Report name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('configuration.dateRange.type')
    .optional()
    .isIn(['custom', 'last_7_days', 'last_30_days', 'last_3_months', 'last_6_months', 'last_year', 'year_to_date'])
    .withMessage('Invalid date range type'),
  body('configuration.dateRange.startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('configuration.dateRange.endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived', 'error'])
    .withMessage('Invalid status')
];

const reportsQueryValidation = [
  query('type')
    .optional()
    .isIn([
      'sales_summary',
      'order_analysis',
      'customer_insights',
      'menu_performance',
      'operational_metrics',
      'financial_report',
      'growth_analysis',
      'comparative_analysis',
      'custom_query'
    ])
    .withMessage('Invalid report type'),
  query('entityType')
    .optional()
    .isIn(['restaurant', 'zone', 'shop', 'platform'])
    .withMessage('Invalid entity type'),
  query('entityId')
    .optional()
    .isMongoId()
    .withMessage('Invalid entity ID'),
  query('status')
    .optional()
    .isIn(['draft', 'active', 'archived', 'error'])
    .withMessage('Invalid status'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1')
];

const scheduleValidation = [
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid frequency'),
  body('dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be between 0 and 6'),
  body('dayOfMonth')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Day of month must be between 1 and 31'),
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format')
];

const shareValidation = [
  body('userIds')
    .optional()
    .isArray()
    .withMessage('User IDs must be an array'),
  body('userIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('permission')
    .optional()
    .isIn(['view', 'edit', 'admin'])
    .withMessage('Invalid permission level'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('generateAccessKey')
    .optional()
    .isBoolean()
    .withMessage('generateAccessKey must be a boolean')
];

const cloneValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Report name must be between 2 and 100 characters')
];

const executionsQueryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1')
];

// Apply authentication to all routes
router.use(authenticate);

// Routes

/**
 * @route   GET /api/v1/reports/templates
 * @desc    Get available report templates
 * @access  Private
 */
router.get('/templates', (req, res, next) => getReportTemplates(req, res, next));

/**
 * @route   POST /api/v1/reports
 * @desc    Create a new report
 * @access  Private (Admin, Restaurant Owner, Zone Admin)
 */
router.post('/',
  authorize('admin', 'restaurant_owner', 'zone_admin'),
  createReportValidation,
  handleValidation,
  wrapAsync(createReport, 'createReport')
);

/**
 * @route   GET /api/v1/reports
 * @desc    Get all reports for user
 * @access  Private
 */
router.get('/',
  reportsQueryValidation,
  handleValidation,
  wrapAsync(getReports, 'getReports')
);

/**
 * @route   GET /api/v1/reports/:id
 * @desc    Get single report
 * @access  Private
 */
router.get('/:id',
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(getReport, 'getReport')
);

/**
 * @route   PUT /api/v1/reports/:id
 * @desc    Update report
 * @access  Private
 */
router.put('/:id',
  authorize('admin', 'restaurant_owner', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  updateReportValidation,
  handleValidation,
  wrapAsync(updateReport, 'updateReport')
);

/**
 * @route   POST /api/v1/reports/:id/execute
 * @desc    Execute report
 * @access  Private
 */
router.post('/:id/execute',
  authorize('admin', 'restaurant_owner', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(executeReport, 'executeReport')
);

/**
 * @route   GET /api/v1/reports/:id/executions
 * @desc    Get report execution history
 * @access  Private
 */
router.get('/:id/executions',
  ValidationRules.validateObjectId('id'),
  executionsQueryValidation,
  handleValidation,
  wrapAsync(getReportExecutions, 'getReportExecutions')
);

/**
 * @route   POST /api/v1/reports/:id/schedule
 * @desc    Schedule report execution
 * @access  Private
 */
router.post('/:id/schedule',
  authorize('admin', 'restaurant_owner', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  scheduleValidation,
  handleValidation,
  wrapAsync(scheduleReport, 'scheduleReport')
);

/**
 * @route   POST /api/v1/reports/:id/share
 * @desc    Share report with users
 * @access  Private
 */
router.post('/:id/share',
  authorize('admin', 'restaurant_owner', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  shareValidation,
  handleValidation,
  wrapAsync(shareReport, 'shareReport')
);

/**
 * @route   POST /api/v1/reports/:id/clone
 * @desc    Clone existing report
 * @access  Private
 */
router.post('/:id/clone',
  authorize('admin', 'restaurant_owner', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  cloneValidation,
  handleValidation,
  wrapAsync(cloneReport, 'cloneReport')
);

/**
 * @route   DELETE /api/v1/reports/:id
 * @desc    Delete report
 * @access  Private
 */
router.delete('/:id',
  authorize('admin', 'restaurant_owner', 'zone_admin'),
  ValidationRules.validateObjectId('id'),
  handleValidation,
  wrapAsync(deleteReport, 'deleteReport')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;