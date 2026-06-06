const express = require('express');
const PlanUsageController = require('../controllers/planUsageController');
const { authenticate } = require('../middleware/authMiddleware');
const { param, query } = require('express-validator');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/v1/plan-usage/:ownerType/:ownerId
 * @desc    Get current plan usage for the authenticated user
 * @access  Private
 */
router.get('/:ownerType/:ownerId',
  [
    param('ownerType').isIn(['restaurant', 'zone', 'shop']).withMessage('Invalid owner type'),
    param('ownerId').isMongoId().withMessage('Invalid owner ID'),
    handleValidation
  ],
  PlanUsageController.getCurrentUsage
);

/**
 * @route   GET /api/v1/plan-usage/:ownerType/:ownerId/check/:action
 * @desc    Check if user can perform a specific action
 * @access  Private
 */
router.get('/:ownerType/:ownerId/check/:action',
  [
    param('ownerType').isIn(['restaurant', 'zone', 'shop']).withMessage('Invalid owner type'),
    param('ownerId').isMongoId().withMessage('Invalid owner ID'),
    param('action').isIn(['create-category', 'create-menu-item']).withMessage('Invalid action'),
    query('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
    handleValidation
  ],
  PlanUsageController.checkActionAvailability
);

module.exports = router;