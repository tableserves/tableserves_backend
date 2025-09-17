const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { defaultRateLimiter } = require('../middleware/userRateLimit');
const { ValidationRules, handleValidation } = require('../middleware/validationMiddleware');
const { createRouteHandler } = require('../middleware/routeErrorHandler');
const catchAsync = require('../utils/catchAsync');
const { APIError } = require('../middleware/errorHandler');
const { User, Subscription, Restaurant, Zone } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const SubscriptionService = require('../services/subscriptionService');

const router = express.Router();
const wrapAsync = createRouteHandler;

// Apply rate limiting
router.use(defaultRateLimiter);

/**
 * @route POST /api/v1/business-setup/complete
 * @desc Complete business setup with type selection and subscription
 * @access Private (requires authentication)
 */
router.post('/complete', 
  authenticate,
  wrapAsync(async (req, res) => {
    const { businessType, businessData } = req.body;
    const userId = req.user.id;

    if (!businessType || !['restaurant', 'zone'].includes(businessType)) {
      throw new APIError('Valid business type is required (restaurant or zone)', 400);
    }

    if (!businessData || !businessData.name) {
      throw new APIError('Business data with name is required', 400);
    }

    // Update user role and business type
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Update user role and business type
    user.role = businessType === 'restaurant' ? 'restaurant_owner' : 'zone_admin';
    user.businessType = businessType;
    user.status = 'active'; // Activate user after business type selection
    await user.save();

    // Create free subscription using subscription service
    const subscription = await SubscriptionService.createFreePlan(userId, businessType);

    let businessEntity;

    // Create business entity based on type
    if (businessType === 'restaurant') {
      const restaurantData = {
        ownerId: userId,
        subscriptionId: subscription._id,
        name: businessData.name,
        description: businessData.description || `${businessData.name} - Restaurant`,
        contact: {
          address: {
            street: businessData.address?.street || '',
            city: businessData.address?.city || '',
            state: businessData.address?.state || '',
            zipCode: businessData.address?.zipCode || '',
            country: businessData.address?.country || 'US'
          },
          phone: user.phone,
          email: user.email
        },
        settings: {
          theme: {
            primaryColor: '#f97316',
            secondaryColor: '#ea580c',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            fontFamily: 'Inter'
          },
          ordering: {
            isEnabled: true,
            requireCustomerInfo: true,
            allowSpecialInstructions: true,
            estimatedPrepTime: 20,
            autoAcceptOrders: false
          },
          payment: {
            acceptCash: true,
            acceptCard: false,
            taxRate: 0.08,
            serviceFee: 0.05,
            tipOptions: [0.10, 0.15, 0.20],
            currency: 'USD'
          }
        },
        isActive: true,
        isPublished: false
      };

      businessEntity = new Restaurant(restaurantData);
      await businessEntity.save();

    } else if (businessType === 'zone') {
      const zoneData = {
        adminId: userId, // Zone model uses adminId, not ownerId
        subscriptionId: subscription._id,
        name: businessData.name,
        description: businessData.description || `${businessData.name} - Food Zone`,
        location: businessData.address?.street || 'Location not specified',
        contactInfo: {
          email: user.email,
          phone: user.phone
        },
        settings: {
          theme: {
            primaryColor: '#3b82f6',
            secondaryColor: '#1d4ed8'
          },
          orderSettings: {
            acceptOrders: true,
            minimumOrderAmount: 0,
            estimatedPreparationTime: 25,
            maxOrdersPerHour: 50
          },
          paymentSettings: {
            acceptCash: true,
            acceptCards: false,
            acceptDigitalPayments: false
          }
        },
        active: true
      };

      businessEntity = new Zone(zoneData);
      await businessEntity.save();
    }

    loggerUtils.logBusiness('Business setup completed', userId, {
      businessType,
      businessId: businessEntity._id,
      subscriptionId: subscription._id
    });

    res.status(201).json({
      success: true,
      message: 'Business setup completed successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profile: user.profile,
          subscription: subscription
        },
        business: businessEntity,
        subscription: subscription
      }
    });
  }, 'completeBusinessSetup')
);

module.exports = router;
