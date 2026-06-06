const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * Webhook routes for external services
 * Note: Order payment webhooks have been removed
 * Only subscription payment webhooks remain in paymentRoutes.js
 */

module.exports = router;
