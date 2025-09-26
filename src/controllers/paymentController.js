const Razorpay = require('razorpay');
const crypto = require('crypto');
const Plan = require('../models/Plan');
const PlanPayment = require('../models/PlanPayment');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const { APIError } = require('../utils/apiError');
const { logger } = require('../utils/logger');

// Initialize Razorpay instance (only if keys are provided)
console.log('🔧 Initializing Razorpay...');
console.log('🔑 RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'present' : 'missing');
console.log('🔑 RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'present' : 'missing');

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
  } catch (error) {
    console.error('❌ Razorpay initialization failed:', error.message);
  }
} else {
  console.log('❌ Razorpay keys missing - payment functionality disabled');
}

class PaymentController {
  /**
   * Create Razorpay order for plan purchase
   * @route POST /api/v1/payment/create-plan-order
   * @access Private
   */
  static createPlanOrder = catchAsync(async (req, res) => {
    const { planId, planKey, planType } = req.body;
    const userId = req.user.id;

    // Debug logging
    console.log('🔄 Payment order creation started');
    console.log('📋 Request body:', req.body);
    console.log('👤 User ID:', userId);
    console.log('🔑 Razorpay configured:', !!razorpay);

    // Check if Razorpay is configured
    if (!razorpay) {
      console.log('❌ Razorpay not configured');
      throw new APIError('Payment service not configured. Please contact administrator.', 503);
    }

    // Validate plan exists and is active - support both planId and planKey/planType
    let plan;
    console.log('🔍 Looking for plan with:', { planId, planKey, planType });

    if (planId) {
      console.log('📋 Searching by planId:', planId);
      plan = await Plan.findOne({ _id: planId, active: true });
    } else if (planKey && planType) {
      console.log('📋 Searching by planKey and planType:', { planKey, planType });
      plan = await Plan.findOne({ key: planKey, planType: planType, active: true });
    } else {
      console.log('❌ Missing plan identifiers');
      throw new APIError('Either planId or both planKey and planType are required', 400);
    }

    console.log('📋 Plan found:', plan ? `${plan.name} (${plan.key})` : 'null');

    if (!plan) {
      console.log('❌ Plan not found or inactive');
      throw new APIError('Plan not found or inactive', 404);
    }

    // Check user's current subscription status from both User model and Subscription model
    const user = await User.findById(userId).populate('currentPlanId');

    // Also check the Subscription model for active subscriptions
    const Subscription = require('../models/Subscription');
    const activeSubscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: new Date() }
    }).populate('planKey');

    console.log('👤 User plan status from User model:', {
      hasActivePlan: user.hasActivePlan,
      planStatus: user.planStatus,
      currentPlanId: user.currentPlanId?._id,
      currentPlanType: user.currentPlanId?.planType,
      currentPlanKey: user.currentPlanId?.key,
      planExpiryDate: user.planExpiryDate
    });

    console.log('📋 Active subscription from Subscription model:', {
      subscriptionExists: !!activeSubscription,
      subscriptionId: activeSubscription?._id,
      planKey: activeSubscription?.planKey,
      planType: activeSubscription?.planType,
      status: activeSubscription?.status,
      endDate: activeSubscription?.endDate,
      startDate: activeSubscription?.startDate
    });

    console.log('🎯 Requested plan:', {
      requestedPlanType: plan.planType,
      requestedPlanKey: plan.key,
      requestedPlanId: plan._id,
      requestedPlanPrice: plan.price
    });

    // Check if user already has this exact plan active (from either source)
    const hasExactPlanFromUser = user.hasActivePlan &&
                                user.currentPlanId?.planType === plan.planType &&
                                user.currentPlanId?.key === plan.key;

    // For subscription comparison, map the planKey format
    let hasExactPlanFromSubscription = false;
    if (activeSubscription && activeSubscription.planType === plan.planType) {
      const subscriptionPlanKey = activeSubscription.planKey;
      let mappedPlanKey = subscriptionPlanKey;

      // Remove the planType prefix if it exists
      if (subscriptionPlanKey.startsWith(`${activeSubscription.planType}_`)) {
        mappedPlanKey = subscriptionPlanKey.replace(`${activeSubscription.planType}_`, '');
      }

      hasExactPlanFromSubscription = mappedPlanKey === plan.key;
    }

    if (hasExactPlanFromUser || hasExactPlanFromSubscription) {
      console.log('❌ User already has this exact plan active');
      throw new APIError('You already have this plan active', 400);
    }

    // Check for plan type mismatch
    if (activeSubscription && activeSubscription.planType !== plan.planType) {
      console.log('❌ Plan type mismatch - cannot change plan type');
      throw new APIError('Cannot change plan type. Please contact support for assistance.', 400);
    }

    // Check for downgrades - prevent users from downgrading to a lower-priced plan
    if (activeSubscription) {
      // Map subscription planKey to Plan model key format
      // Subscription uses: 'restaurant_advanced', Plan uses: 'advanced'
      const subscriptionPlanKey = activeSubscription.planKey;
      let mappedPlanKey = subscriptionPlanKey;

      // Remove the planType prefix if it exists
      if (subscriptionPlanKey.startsWith(`${activeSubscription.planType}_`)) {
        mappedPlanKey = subscriptionPlanKey.replace(`${activeSubscription.planType}_`, '');
      }

      console.log('🔄 Plan key mapping:', {
        subscriptionPlanKey,
        mappedPlanKey,
        planType: activeSubscription.planType
      });

      // Get the current plan details to compare prices
      const currentPlan = await Plan.findOne({
        key: mappedPlanKey,
        planType: activeSubscription.planType
      });

      if (currentPlan && currentPlan.price > plan.price) {
        console.log('❌ Downgrade attempt detected:', {
          currentPlanPrice: currentPlan.price,
          requestedPlanPrice: plan.price,
          currentPlanKey: currentPlan.key,
          requestedPlanKey: plan.key,
          currentPlanName: currentPlan.name,
          requestedPlanName: plan.name
        });
        throw new APIError(
          `Cannot downgrade from ${currentPlan.name} (₹${currentPlan.price}) to ${plan.name} (₹${plan.price}). Please contact support if you need to change your plan.`,
          400
        );
      }

      if (currentPlan) {
        console.log('✅ Current plan found for comparison:', {
          currentPlanName: currentPlan.name,
          currentPlanPrice: currentPlan.price,
          requestedPlanName: plan.name,
          requestedPlanPrice: plan.price,
          isUpgrade: currentPlan.price < plan.price
        });
      } else {
        console.log('⚠️ Current plan not found in Plan model:', {
          subscriptionPlanKey,
          mappedPlanKey,
          planType: activeSubscription.planType
        });
      }
    }

    console.log('✅ Plan validation passed - user can purchase this plan');

    // Calculate amounts
    const amount = plan.price;
    const taxAmount = Math.round(amount * 0.18); // 18% GST
    const totalAmount = amount + taxAmount;
    console.log('💰 Payment amounts calculated:', { amount, taxAmount, totalAmount });

    // Generate unique receipt (max 40 characters for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const userIdShort = userId.toString().slice(-8); // Last 8 characters of user ID
    const receipt = `plan_${userIdShort}_${timestamp}`;
    console.log('🧾 Receipt generated:', receipt, `(${receipt.length} chars)`);

    // Create Razorpay order
    console.log('🔄 Creating Razorpay order...');
    let razorpayOrder;
    try {
      const orderData = {
        amount: totalAmount * 100, // Convert rupees to paise (₹353 = 35300 paise)
        currency: plan.currency,
        receipt: receipt,
        notes: {
          userId: userId,
          planId: plan._id.toString(), // Use plan._id instead of planId which might be undefined
          planType: plan.planType,
          planName: plan.name
        }
      };
      console.log('📋 Razorpay order data:', orderData);

      razorpayOrder = await razorpay.orders.create(orderData);
      console.log('✅ Razorpay order created:', razorpayOrder.id);
    } catch (razorpayError) {
      console.error('❌ Razorpay order creation failed:', {
        error: razorpayError.message,
        statusCode: razorpayError.statusCode,
        description: razorpayError.description,
        source: razorpayError.source,
        step: razorpayError.step,
        reason: razorpayError.reason,
        field: razorpayError.field,
        fullError: razorpayError
      });

      // Check if it's an authentication error
      if (razorpayError.statusCode === 401) {
        // Authentication failed
        if (process.env.NODE_ENV === 'development') {
          throw new APIError(
            'Razorpay authentication failed. For development, you can enable mock payments by setting VITE_MOCK_PAYMENTS=true in your .env file, or use valid test credentials.',
            400
          );
        } else {
          throw new APIError(
            'Payment gateway configuration error. Please contact support or configure valid Razorpay credentials.',
            400
          );
        }
      } else if (razorpayError.statusCode === 400) {
        // Bad request - show specific validation error
        const errorDescription = razorpayError.error?.description || razorpayError.description || 'Invalid request data';
        throw new APIError(`Payment order validation failed: ${errorDescription}`, 400);
      }

      throw new APIError(`Payment order creation failed: ${razorpayError.message || 'Unknown error'}`, 400);
    }

    // Create payment record in database
    console.log('💾 Creating payment record in database...');
    const paymentData = {
      userId,
      planId: plan._id, // Use plan._id instead of planId which might be undefined
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: plan.currency,
      taxAmount,
      totalAmount,
      receipt,
      status: 'pending',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        source: 'web'
      },
      expiresAt: new Date(Date.now() + (15 * 60 * 1000)) // 15 minutes
    };
    console.log('📋 Payment data:', paymentData);

    const payment = new PlanPayment(paymentData);
    await payment.save();
    console.log('✅ Payment record saved:', payment._id);

    logger.info('Plan order created', {
      userId,
      planId,
      orderId: razorpayOrder.id,
      amount: totalAmount
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: totalAmount,
        currency: plan.currency,
        key: process.env.RAZORPAY_KEY_ID,
        receipt,
        plan: {
          id: plan._id,
          name: plan.name,
          type: plan.planType,
          price: plan.price
        },
        user: {
          name: user.profile?.name || user.email.split('@')[0],
          email: user.email,
          contact: user.phone || ''
        }
      },
      message: 'Payment order created successfully'
    });
  });

  /**
   * Verify Razorpay payment and activate plan
   * @route POST /api/v1/payment/verify-plan-payment
   * @access Private
   */
  static verifyPlanPayment = catchAsync(async (req, res) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;
    const userId = req.user.id;

    // Check if Razorpay is configured
    if (!razorpay) {
      throw new APIError('Payment service not configured. Please contact administrator.', 503);
    }

    // Find payment record
    const payment = await PlanPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId
    }).populate('planId');

    if (!payment) {
      throw new APIError('Payment record not found', 404);
    }

    if (payment.status === 'paid') {
      throw new APIError('Payment already verified', 400);
    }

    if (payment.isExpired()) {
      throw new APIError('Payment has expired', 400);
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      // Update payment as failed
      payment.status = 'failed';
      payment.failureReason = 'Invalid signature';
      payment.verificationAttempts += 1;
      await payment.save();

      logger.warn('Payment signature verification failed', {
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });

      throw new APIError('Payment verification failed', 400);
    }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    payment.signatureVerified = true;
    
    // Calculate plan dates
    const planDates = payment.calculatePlanDates(payment.planId.durationDays);
    payment.planStartDate = planDates.startDate;
    payment.planEndDate = planDates.endDate;

    await payment.save();

    // Update user plan
    const user = await User.findById(userId);
    await user.activatePlan(payment.planId._id, planDates.endDate, payment._id);

    console.log('🔍 User role for subscription update:', {
      userId: userId,
      userRole: user.role,
      planType: payment.planId.planType,
      planKey: payment.planId.key
    });

    // For restaurant owners, also update their restaurant's subscription
    if (user.role === 'restaurant_owner') {
      console.log('🔄 Processing restaurant owner subscription update...');
      try {
        const Restaurant = require('../models/Restaurant');
        const Subscription = require('../models/Subscription');

        // Find the restaurant owned by this user
        const restaurant = await Restaurant.findOne({ ownerId: userId });
        console.log('🔍 Restaurant lookup result:', {
          userId: userId,
          restaurantFound: !!restaurant,
          restaurantId: restaurant?._id,
          restaurantName: restaurant?.name,
          existingSubscriptionId: restaurant?.subscriptionId
        });

        if (restaurant) {
          // Create or update subscription for the restaurant
          let subscription = await Subscription.findById(restaurant.subscriptionId);
          console.log('🔍 Restaurant subscription check:', {
            subscriptionId: restaurant.subscriptionId,
            subscriptionExists: !!subscription,
            currentPlanKey: subscription?.planKey,
            currentStatus: subscription?.status
          });

          if (!subscription) {
            console.log('📝 Creating new subscription for restaurant...');
            // Create new subscription if none exists
            subscription = new Subscription({
              userId: userId,
              planKey: `${payment.planId.planType}_${payment.planId.key}`,
              planType: payment.planId.planType,
              planName: payment.planId.name,
              features: payment.planId.features || {},
              limits: payment.planId.limits || {},
              pricing: {
                amount: payment.planId.price,
                currency: payment.planId.currency || 'INR',
                interval: 'monthly',
                trialDays: 0
              },
              status: 'active',
              startDate: planDates.startDate,
              endDate: planDates.endDate,
              usage: {
                currentTables: 0,
                currentShops: 0,
                currentVendors: 0,
                currentCategories: 0,
                currentMenuItems: 0,
                currentUsers: 1,
                ordersThisMonth: 0,
                storageUsedGB: 0,
                lastUsageUpdate: new Date()
              },
              payment: {
                paymentHistory: [{
                  paymentId: payment._id,
                  amount: payment.totalAmount,
                  currency: payment.planId.currency || 'INR',
                  status: 'paid',
                  paidAt: new Date(),
                  razorpayPaymentId: payment.razorpayPaymentId,
                  razorpayOrderId: payment.razorpayOrderId
                }]
              },
              notes: []
            });

            await subscription.save();
            console.log('✅ New restaurant subscription created:', subscription._id);

            // Link subscription to restaurant
            restaurant.subscriptionId = subscription._id;
          } else {
            console.log('📝 Updating existing restaurant subscription...');
            // Update existing subscription
            subscription.planKey = `${payment.planId.planType}_${payment.planId.key}`;
            subscription.planName = payment.planId.name;
            subscription.features = payment.planId.features || {};
            subscription.limits = payment.planId.limits || {};
            subscription.pricing.amount = payment.planId.price;
            subscription.status = 'active';
            subscription.startDate = planDates.startDate;
            subscription.endDate = planDates.endDate;

            // Add payment to history
            subscription.payment.paymentHistory.push({
              paymentId: payment._id,
              amount: payment.totalAmount,
              currency: payment.planId.currency || 'INR',
              status: 'paid',
              paidAt: new Date(),
              razorpayPaymentId: payment.razorpayPaymentId,
              razorpayOrderId: payment.razorpayOrderId
            });

            await subscription.save();
            console.log('✅ Restaurant subscription updated:', {
              subscriptionId: subscription._id,
              newPlanKey: subscription.planKey,
              newStatus: subscription.status,
              newEndDate: subscription.endDate
            });
          }

          // Update restaurant's subscription plan field for frontend compatibility
          let subscriptionPlan = 'free';
          switch (payment.planId.key) {
            case 'enterprise':
            case 'premium':
              subscriptionPlan = 'premium';
              break;
            case 'professional':
            case 'advanced':
              subscriptionPlan = 'advanced';
              break;
            case 'starter':
            case 'basic':
              subscriptionPlan = 'basic';
              break;
            default:
              subscriptionPlan = 'free';
              break;
          }

          restaurant.subscriptionPlan = subscriptionPlan;
          await restaurant.save();

          console.log('✅ Restaurant subscription updated:', {
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            subscriptionId: subscription._id,
            planKey: subscription.planKey,
            subscriptionPlan: subscriptionPlan
          });
        } else {
          console.warn('⚠️ Restaurant not found for restaurant owner:', userId);
        }
      } catch (error) {
        console.error('❌ Error updating restaurant subscription:', error);
        // Don't fail the payment verification if restaurant update fails
      }
    }

    // For zone admins, also update their zone's subscription
    if (user.role === 'zone_admin') {
      console.log('🔄 Processing zone admin subscription update...');
      try {
        const Zone = require('../models/Zone');
        const Subscription = require('../models/Subscription');

        // Find the zone owned by this user
        const zone = await Zone.findOne({ adminId: userId });
        console.log('🔍 Zone lookup result:', {
          userId: userId,
          zoneFound: !!zone,
          zoneId: zone?._id,
          zoneName: zone?.name,
          existingSubscriptionId: zone?.subscriptionId
        });

        if (zone) {
          // Create or update subscription for the zone
          let subscription = await Subscription.findById(zone.subscriptionId);
          console.log('🔍 Existing subscription check:', {
            subscriptionId: zone.subscriptionId,
            subscriptionExists: !!subscription,
            currentPlanKey: subscription?.planKey,
            currentStatus: subscription?.status
          });

          if (!subscription) {
            console.log('📝 Creating new subscription for zone...');
            // Create new subscription if none exists
            subscription = new Subscription({
              userId: userId,
              planKey: `${payment.planId.planType}_${payment.planId.key}`,
              planType: payment.planId.planType,
              planName: payment.planId.name,
              features: payment.planId.features || {},
              limits: payment.planId.limits || {},
              pricing: {
                amount: payment.planId.price,
                currency: payment.planId.currency || 'INR',
                interval: 'monthly',
                trialDays: 0
              },
              status: 'active',
              startDate: planDates.startDate,
              endDate: planDates.endDate,
              usage: {
                currentTables: 0,
                currentShops: 0,
                currentVendors: 0,
                currentCategories: 0,
                currentMenuItems: 0,
                currentUsers: 1,
                ordersThisMonth: 0,
                storageUsedGB: 0,
                lastUsageUpdate: new Date()
              },
              payment: {
                paymentHistory: [{
                  paymentId: payment._id,
                  amount: payment.totalAmount,
                  currency: payment.planId.currency || 'INR',
                  status: 'paid',
                  paidAt: new Date(),
                  razorpayPaymentId: payment.razorpayPaymentId,
                  razorpayOrderId: payment.razorpayOrderId
                }]
              },
              notes: []
            });

            await subscription.save();
            console.log('✅ New subscription created:', subscription._id);

            // Link subscription to zone
            zone.subscriptionId = subscription._id;
          } else {
            console.log('📝 Updating existing subscription...');
            // Update existing subscription
            subscription.planKey = `${payment.planId.planType}_${payment.planId.key}`;
            subscription.planName = payment.planId.name;
            subscription.features = payment.planId.features || {};
            subscription.limits = payment.planId.limits || {};
            subscription.pricing.amount = payment.planId.price;
            subscription.status = 'active';
            subscription.startDate = planDates.startDate;
            subscription.endDate = planDates.endDate;

            // Add payment to history
            subscription.payment.paymentHistory.push({
              paymentId: payment._id,
              amount: payment.totalAmount,
              currency: payment.planId.currency || 'INR',
              status: 'paid',
              paidAt: new Date(),
              razorpayPaymentId: payment.razorpayPaymentId,
              razorpayOrderId: payment.razorpayOrderId
            });

            await subscription.save();
            console.log('✅ Subscription updated:', {
              subscriptionId: subscription._id,
              newPlanKey: subscription.planKey,
              newStatus: subscription.status,
              newEndDate: subscription.endDate
            });
          }

          // Update zone's subscription plan field for frontend compatibility
          let subscriptionPlan = 'free';
          switch (payment.planId.key) {
            case 'enterprise':
            case 'premium':
              subscriptionPlan = 'premium';
              break;
            case 'professional':
            case 'advanced':
              subscriptionPlan = 'advanced';
              break;
            case 'starter':
            case 'basic':
              subscriptionPlan = 'basic';
              break;
            default:
              subscriptionPlan = 'free';
              break;
          }

          zone.subscriptionPlan = subscriptionPlan;
          await zone.save();

          console.log('✅ Zone subscription updated:', {
            zoneId: zone._id,
            zoneName: zone.name,
            subscriptionId: subscription._id,
            planKey: subscription.planKey,
            subscriptionPlan: subscriptionPlan
          });
        } else {
          console.warn('⚠️ Zone not found for zone admin:', userId);
        }
      } catch (error) {
        console.error('❌ Error updating zone subscription:', error);
        // Don't fail the payment verification if zone update fails
      }
    }

    logger.info('Payment verified and plan activated', {
      userId,
      planId: payment.planId._id,
      paymentId: payment._id,
      expiryDate: planDates.endDate
    });

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        plan: {
          id: payment.planId._id,
          name: payment.planId.name,
          type: payment.planId.planType,
          startDate: planDates.startDate,
          endDate: planDates.endDate
        },
        amount: payment.totalAmount
      },
      message: 'Payment verified and plan activated successfully'
    });
  });

  /**
   * Handle Razorpay webhooks
   * @route POST /api/v1/payment/razorpay-webhook
   * @access Public (but verified)
   */
  static handleWebhook = catchAsync(async (req, res) => {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);

    // Skip webhook verification in development
    if (process.env.RAZORPAY_WEBHOOK_SECRET !== 'dev_skip_webhook_verification') {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(webhookBody)
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        logger.warn('Invalid webhook signature received');
        throw new APIError('Invalid webhook signature', 400);
      }
    } else {
      logger.info('Webhook verification skipped in development mode');
    }

    const event = req.body;
    
    logger.info('Webhook received', {
      event: event.event,
      paymentId: event.payload?.payment?.entity?.id,
      orderId: event.payload?.payment?.entity?.order_id
    });

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      
      // Find payment record
      const payment = await PlanPayment.findOne({
        razorpayOrderId: paymentEntity.order_id
      }).populate('planId userId');

      if (payment) {
        payment.webhookReceived = true;
        payment.webhookData = event;

        // If payment wasn't already verified via frontend, verify it now
        if (payment.status === 'pending') {
          payment.razorpayPaymentId = paymentEntity.id;
          payment.status = 'paid';
          payment.paymentMethod = paymentEntity.method;

          // Calculate plan dates if not already set
          if (!payment.planStartDate) {
            const planDates = payment.calculatePlanDates(payment.planId.durationDays);
            payment.planStartDate = planDates.startDate;
            payment.planEndDate = planDates.endDate;
          }

          await payment.save();

          // Update user plan if not already updated
          const user = await User.findById(payment.userId._id);
          if (!user.hasActivePlan || user.currentPlanId?.toString() !== payment.planId._id.toString()) {
            await user.activatePlan(payment.planId._id, payment.planEndDate, payment._id);

            // For restaurant owners, also update their restaurant's subscription
            if (user.role === 'restaurant_owner') {
              console.log('🔄 Processing restaurant owner subscription update via webhook...');
              try {
                const Restaurant = require('../models/Restaurant');
                const Subscription = require('../models/Subscription');

                // Find the restaurant owned by this user
                const restaurant = await Restaurant.findOne({ ownerId: user._id });
                console.log('🔍 Restaurant lookup result (webhook):', {
                  userId: user._id,
                  restaurantFound: !!restaurant,
                  restaurantId: restaurant?._id,
                  restaurantName: restaurant?.name
                });

                if (restaurant) {
                  // Create or update subscription for the restaurant
                  let subscription = await Subscription.findById(restaurant.subscriptionId);

                  if (!subscription) {
                    // Create new subscription if none exists
                    subscription = new Subscription({
                      userId: user._id,
                      planKey: `${payment.planId.planType}_${payment.planId.key}`,
                      planType: payment.planId.planType,
                      planName: payment.planId.name,
                      features: payment.planId.features || {},
                      limits: payment.planId.limits || {},
                      pricing: {
                        amount: payment.planId.price,
                        currency: payment.planId.currency || 'INR',
                        interval: 'monthly',
                        trialDays: 0
                      },
                      status: 'active',
                      startDate: payment.planStartDate,
                      endDate: payment.planEndDate,
                      usage: {
                        currentTables: 0,
                        currentShops: 0,
                        currentVendors: 0,
                        currentCategories: 0,
                        currentMenuItems: 0,
                        currentUsers: 1,
                        ordersThisMonth: 0,
                        storageUsedGB: 0,
                        lastUsageUpdate: new Date()
                      },
                      payment: {
                        paymentHistory: [{
                          paymentId: payment._id,
                          amount: payment.totalAmount,
                          currency: payment.planId.currency || 'INR',
                          status: 'paid',
                          paidAt: new Date(),
                          razorpayPaymentId: payment.razorpayPaymentId,
                          razorpayOrderId: payment.razorpayOrderId
                        }]
                      },
                      notes: []
                    });

                    await subscription.save();

                    // Link subscription to restaurant
                    restaurant.subscriptionId = subscription._id;
                  } else {
                    // Update existing subscription
                    subscription.planKey = `${payment.planId.planType}_${payment.planId.key}`;
                    subscription.planName = payment.planId.name;
                    subscription.features = payment.planId.features || {};
                    subscription.limits = payment.planId.limits || {};
                    subscription.pricing.amount = payment.planId.price;
                    subscription.status = 'active';
                    subscription.startDate = payment.planStartDate;
                    subscription.endDate = payment.planEndDate;

                    // Add payment to history
                    subscription.payment.paymentHistory.push({
                      paymentId: payment._id,
                      amount: payment.totalAmount,
                      currency: payment.planId.currency || 'INR',
                      status: 'paid',
                      paidAt: new Date(),
                      razorpayPaymentId: payment.razorpayPaymentId,
                      razorpayOrderId: payment.razorpayOrderId
                    });

                    await subscription.save();
                  }

                  // Update restaurant's subscription plan field for frontend compatibility
                  let subscriptionPlan = 'free';
                  switch (payment.planId.key) {
                    case 'enterprise':
                    case 'premium':
                      subscriptionPlan = 'premium';
                      break;
                    case 'professional':
                    case 'advanced':
                      subscriptionPlan = 'advanced';
                      break;
                    case 'starter':
                    case 'basic':
                      subscriptionPlan = 'basic';
                      break;
                    default:
                      subscriptionPlan = 'free';
                      break;
                  }

                  restaurant.subscriptionPlan = subscriptionPlan;
                  await restaurant.save();

                  console.log('✅ Restaurant subscription updated via webhook:', {
                    restaurantId: restaurant._id,
                    restaurantName: restaurant.name,
                    subscriptionId: subscription._id,
                    planKey: subscription.planKey,
                    subscriptionPlan: subscriptionPlan
                  });
                } else {
                  console.warn('⚠️ Restaurant not found for restaurant owner via webhook:', user._id);
                }
              } catch (error) {
                console.error('❌ Error updating restaurant subscription via webhook:', error);
                // Don't fail the webhook processing if restaurant update fails
              }
            }

            // For zone admins, also update their zone's subscription via webhook
            if (user.role === 'zone_admin') {
              console.log('🔄 Processing zone admin subscription update via webhook...');
              try {
                const Zone = require('../models/Zone');
                const Subscription = require('../models/Subscription');

                // Find the zone owned by this user
                const zone = await Zone.findOne({ adminId: user._id });
                console.log('🔍 Zone lookup result (webhook):', {
                  userId: user._id,
                  zoneFound: !!zone,
                  zoneId: zone?._id,
                  zoneName: zone?.name
                });

                if (zone) {
                  // Create or update subscription for the zone
                  let subscription = await Subscription.findById(zone.subscriptionId);

                  if (!subscription) {
                    // Create new subscription if none exists
                    subscription = new Subscription({
                      userId: user._id,
                      planKey: `${payment.planId.planType}_${payment.planId.key}`,
                      planType: payment.planId.planType,
                      planName: payment.planId.name,
                      features: payment.planId.features || {},
                      limits: payment.planId.limits || {},
                      pricing: {
                        amount: payment.planId.price,
                        currency: payment.planId.currency || 'INR',
                        interval: 'monthly',
                        trialDays: 0
                      },
                      status: 'active',
                      startDate: payment.planStartDate,
                      endDate: payment.planEndDate,
                      usage: {
                        currentTables: 0,
                        currentShops: 0,
                        currentVendors: 0,
                        currentCategories: 0,
                        currentMenuItems: 0,
                        currentUsers: 1,
                        ordersThisMonth: 0,
                        storageUsedGB: 0,
                        lastUsageUpdate: new Date()
                      },
                      payment: {
                        paymentHistory: [{
                          paymentId: payment._id,
                          amount: payment.totalAmount,
                          currency: payment.planId.currency || 'INR',
                          status: 'paid',
                          paidAt: new Date(),
                          razorpayPaymentId: payment.razorpayPaymentId,
                          razorpayOrderId: payment.razorpayOrderId
                        }]
                      },
                      notes: []
                    });

                    await subscription.save();

                    // Link subscription to zone
                    zone.subscriptionId = subscription._id;
                  } else {
                    // Update existing subscription
                    subscription.planKey = `${payment.planId.planType}_${payment.planId.key}`;
                    subscription.planName = payment.planId.name;
                    subscription.features = payment.planId.features || {};
                    subscription.limits = payment.planId.limits || {};
                    subscription.pricing.amount = payment.planId.price;
                    subscription.status = 'active';
                    subscription.startDate = payment.planStartDate;
                    subscription.endDate = payment.planEndDate;

                    // Add payment to history
                    subscription.payment.paymentHistory.push({
                      paymentId: payment._id,
                      amount: payment.totalAmount,
                      currency: payment.planId.currency || 'INR',
                      status: 'paid',
                      paidAt: new Date(),
                      razorpayPaymentId: payment.razorpayPaymentId,
                      razorpayOrderId: payment.razorpayOrderId
                    });

                    await subscription.save();
                  }

                  // Update zone's subscription plan field for frontend compatibility
                  let subscriptionPlan = 'free';
                  switch (payment.planId.key) {
                    case 'enterprise':
                    case 'premium':
                      subscriptionPlan = 'premium';
                      break;
                    case 'professional':
                    case 'advanced':
                      subscriptionPlan = 'advanced';
                      break;
                    case 'starter':
                    case 'basic':
                      subscriptionPlan = 'basic';
                      break;
                    default:
                      subscriptionPlan = 'free';
                      break;
                  }

                  zone.subscriptionPlan = subscriptionPlan;
                  await zone.save();

                  console.log('✅ Zone subscription updated via webhook:', {
                    zoneId: zone._id,
                    zoneName: zone.name,
                    subscriptionId: subscription._id,
                    planKey: subscription.planKey,
                    subscriptionPlan: subscriptionPlan
                  });
                } else {
                  console.warn('⚠️ Zone not found for zone admin via webhook:', user._id);
                }
              } catch (error) {
                console.error('❌ Error updating zone subscription via webhook:', error);
                // Don't fail the webhook processing if zone update fails
              }
            }
          }

          logger.info('Payment activated via webhook', {
            userId: payment.userId._id,
            planId: payment.planId._id,
            paymentId: payment._id
          });
        } else {
          await payment.save(); // Just update webhook data
        }
      }
    }

    // Handle payment.failed event
    if (event.event === 'payment.failed') {
      const paymentEntity = event.payload.payment.entity;
      
      const payment = await PlanPayment.findOne({
        razorpayOrderId: paymentEntity.order_id
      });

      if (payment && payment.status === 'pending') {
        payment.status = 'failed';
        payment.failureReason = paymentEntity.error_description || 'Payment failed';
        payment.errorCode = paymentEntity.error_code;
        payment.webhookReceived = true;
        payment.webhookData = event;
        await payment.save();

        logger.info('Payment marked as failed via webhook', {
          paymentId: payment._id,
          reason: payment.failureReason
        });
      }
    }

    res.status(200).json({ success: true });
  });

  /**
   * Get user's payment history
   * @route GET /api/v1/payment/history
   * @access Private
   */
  static getPaymentHistory = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const options = { limit: parseInt(limit) };
    if (status) options.status = status;

    const payments = await PlanPayment.findByUser(userId, options)
      .skip((page - 1) * limit);

    const total = await PlanPayment.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  /**
   * Get current plan details
   * @route GET /api/v1/payment/current-plan
   * @access Private
   */
  static getCurrentPlan = catchAsync(async (req, res) => {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('currentPlanId');

    if (!user.currentPlanId) {
      return res.status(200).json({
        success: true,
        data: {
          plan: null,
          status: 'free',
          message: 'User is on free plan'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        plan: user.currentPlanId,
        status: user.planStatus,
        expiryDate: user.planExpiryDate,
        daysRemaining: user.planDaysRemaining,
        isExpired: user.isPlanExpired
      }
    });
  });
}

module.exports = PaymentController;
