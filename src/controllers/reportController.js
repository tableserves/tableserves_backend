const Report = require('../models/Report');
const reportService = require('../services/reportService');
const { APIError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { logger } = require('../utils/logger');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');

// Helper function to check ownership
const checkOwnership = async (user, entityType, entityId) => {
  if (user.role === 'admin' || entityType === 'platform') {
    return;
  }

  let resource;
  let ownerField;

  switch (entityType) {
    case 'restaurant':
      resource = await Restaurant.findById(entityId);
      ownerField = 'ownerId';
      break;
    case 'zone':
      resource = await Zone.findById(entityId);
      ownerField = 'adminId';
      break;
    case 'shop':
      resource = await ZoneShop.findById(entityId);
      ownerField = 'ownerId';
      break;
    default:
      return;
  }

  if (!resource) {
    throw new APIError(`${entityType} not found`, 404);
  }

  if (resource[ownerField].toString() !== user.id.toString()) {
    throw new APIError(`Access denied to this ${entityType}`, 403);
  }
};


/**
 * @desc    Create new report
 * @route   POST /api/v1/reports
 * @access  Private (Admin, Restaurant Owner, Zone Admin)
 */
const createReport = catchAsync(async (req, res) => {
  const reportData = {
    ...req.body,
    createdBy: req.user.id
  };

  await checkOwnership(req.user, reportData.entityType, reportData.entityId);

  const report = new Report(reportData);
  await report.save();

  await report.populate('createdBy', 'profile.name email');

  logger.info('Report created', { 
    reportId: report._id, 
    createdBy: req.user.id,
    reportType: report.type,
    entityType: report.entityType
  });

  res.status(201).json({
    success: true,
    message: 'Report created successfully',
    data: report
  });
});

// ... (rest of the file remains the same)
