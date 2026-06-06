const express = require('express');
const testController = require('../controllers/testController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler, routeErrorHandler, requestTimer } = require('../middleware/routeErrorHandler');

const router = express.Router();

// Add request timing middleware
router.use(requestTimer);

// Use the standardized route handler
const wrapAsync = createRouteHandler;

// Apply authentication to test routes (admin only for security)
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route GET /api/v1/test/database/operations
 * @desc Comprehensive database operations test
 * @access Private (Admin only)
 */
router.get('/database/operations',
  wrapAsync(testController.testDatabaseOperations, 'testDatabaseOperations')
);

/**
 * @route GET /api/v1/test/database/metrics
 * @desc Database health metrics
 * @access Private (Admin only)
 */
router.get('/database/metrics',
  wrapAsync(testController.getHealthMetrics, 'getHealthMetrics')
);

/**
 * @route POST /api/v1/test/data-persistence
 * @desc Specific data persistence tests
 * @access Private (Admin only)
 */
router.post('/data-persistence',
  wrapAsync(testController.testDataPersistence, 'testDataPersistence')
);

// Apply the enhanced error handling middleware
router.use(routeErrorHandler);

module.exports = router;