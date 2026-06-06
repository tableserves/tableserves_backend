const express = require('express');
const router = express.Router();
const { fixContactInformation } = require('../controllers/utilityController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

/**
 * @route POST /api/v1/utility/fix-contacts
 * @desc Fix missing contact information for restaurants and zones
 * @access Private (Admin only)
 */
router.post('/fix-contacts', authenticate, authorize('admin'), fixContactInformation);

module.exports = router;
