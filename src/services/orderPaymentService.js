const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Order } = require('../models');
const { APIError } = require('../utils/apiError');
const { logger } = require('../utils/logger');

/**
 * Order Payment Service
 * Handles Razorpay integration for order payments
 */
class OrderPaymentService {
  constructor() {
    // Initialize Razorpay instance
    this.razorpay = null;
    this.initializeRazorpay();
  }

  /**
   * Initialize Razorpay instance
   */
  initializeRazorpay() {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        this.razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        logger.info('OrderPaymentService: Razorpay initialized successfully');
      } catch (error) {
        logger.error('OrderPaymentService: Razorpay initialization failed', error);
      }
    } else {
      logger.warn('OrderPaymentService: Razorpay keys missing - payment functionality disabled');
    }
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured() {
    return !!this.razorpay;
  }

  /**
   * Create Razorpay order for an existing order
   * @param {string} orderId - MongoDB order ID
   * @param {Object} options - Additional options
   * @returns {Object} Razorpay order details
   */
  async createRazorpayOrder(orderId, options = {}) {
    if (!this.isConfigured()) {
      throw new APIError('Payment service not configured', 503);
    }

    // Find the order with restaurant/zone data
    const order = await Order.findById(orderId)
      .populate('restaurantId', 'name paymentConfig')
      .populate('zoneId', 'name paymentConfig');

    if (!order) {
      throw new APIError('Order not found', 404);
    }

    // Check if order is in valid state for payment
    if (order.status !== 'pending') {
      throw new APIError('Order is not in pending state', 400);
    }

    // Check if payment is already processing or paid
    if (['processing', 'paid'].includes(order.payment.status)) {
      throw new APIError('Payment already initiated or completed', 400);
    }

    // Validate restaurant/zone payment configuration
    const paymentConfig = await this.validatePaymentConfiguration(order);
    if (!paymentConfig.canAcceptOnlinePayments) {
      throw new APIError(paymentConfig.errorMessage, 400);
    }

    // Calculate amount in paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(order.pricing.total * 100);

    // Generate receipt
    const receipt = `order_${order.orderNumber}_${Date.now()}`;

    try {
      // Create Razorpay order
      const razorpayOrderData = {
        amount: amountInPaise,
        currency: order.pricing.currency || 'INR',
        receipt: receipt,
        notes: {
          order_id: order._id.toString(),
          order_number: order.orderNumber,
          customer_name: order.customer.name,
          customer_phone: order.customer.phone,
          table_number: order.tableNumber,
          restaurant_id: order.restaurantId?.toString() || '',
          zone_id: order.zoneId?.toString() || '',
          recipient_upi_id: paymentConfig.upiId,
          payment_model: paymentConfig.paymentModel,
          entity_type: paymentConfig.entityType,
          entity_name: paymentConfig.entityName
        }
      };

      logger.info('Creating Razorpay order', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: amountInPaise,
        currency: razorpayOrderData.currency
      });

      const razorpayOrder = await this.razorpay.orders.create(razorpayOrderData);

      // Update order with Razorpay order ID
      const expiresAt = new Date(Date.now() + (15 * 60 * 1000)); // 15 minutes
      await order.setRazorpayOrder(razorpayOrder.id, expiresAt);

      logger.info('Razorpay order created successfully', {
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise
      });

      return {
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: razorpayOrderData.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        receipt: receipt,
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          total: order.pricing.total,
          customer: {
            name: order.customer.name,
            phone: order.customer.phone,
            email: order.customer.email
          }
        },
        paymentConfig: {
          upiId: paymentConfig.upiId,
          paymentModel: paymentConfig.paymentModel,
          entityType: paymentConfig.entityType,
          entityName: paymentConfig.entityName
        }
      };

    } catch (error) {
      logger.error('Failed to create Razorpay order', {
        orderId: order._id,
        error: error.message,
        stack: error.stack
      });

      // Mark payment as failed
      await order.markPaymentFailed(`Razorpay order creation failed: ${error.message}`);

      throw new APIError(`Payment order creation failed: ${error.message}`, 400);
    }
  }

  /**
   * Verify Razorpay payment
   * @param {string} orderId - MongoDB order ID
   * @param {Object} paymentData - Razorpay payment response
   * @returns {Object} Verification result
   */
  async verifyPayment(orderId, paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    if (!this.isConfigured()) {
      throw new APIError('Payment service not configured', 503);
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new APIError('Order not found', 404);
    }

    // Verify that the Razorpay order ID matches
    if (order.payment.razorpayOrderId !== razorpay_order_id) {
      logger.warn('Razorpay order ID mismatch', {
        orderId: order._id,
        expectedRazorpayOrderId: order.payment.razorpayOrderId,
        receivedRazorpayOrderId: razorpay_order_id
      });
      throw new APIError('Invalid payment order ID', 400);
    }

    // Check if payment is already verified
    if (order.payment.status === 'paid') {
      return {
        success: true,
        message: 'Payment already verified',
        order: order
      };
    }

    // Check if payment has expired
    if (order.isPaymentExpired()) {
      await order.markPaymentFailed('Payment expired');
      throw new APIError('Payment has expired', 400);
    }

    try {
      // Verify signature
      const isSignatureValid = this.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

      if (!isSignatureValid) {
        logger.warn('Payment signature verification failed', {
          orderId: order._id,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id
        });

        await order.markPaymentFailed('Invalid payment signature');
        throw new APIError('Payment verification failed', 400);
      }

      // Mark order as paid
      await order.markAsPaidWithRazorpay(razorpay_payment_id, razorpay_signature);

      // Update order status to confirmed
      order.status = 'confirmed';
      order.timing.orderConfirmed = new Date();
      await order.save();

      logger.info('Payment verified successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        razorpayPaymentId: razorpay_payment_id,
        amount: order.pricing.total
      });

      return {
        success: true,
        message: 'Payment verified successfully',
        order: order
      };

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      logger.error('Payment verification error', {
        orderId: order._id,
        error: error.message,
        stack: error.stack
      });

      await order.markPaymentFailed(`Verification error: ${error.message}`);
      throw new APIError('Payment verification failed', 500);
    }
  }

  /**
   * Verify Razorpay signature
   * @param {string} razorpayOrderId 
   * @param {string} razorpayPaymentId 
   * @param {string} razorpaySignature 
   * @returns {boolean}
   */
  verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Use secure comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpaySignature, 'hex')
    );
  }

  /**
   * Handle Razorpay webhook
   * @param {Object} webhookData - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {Object} Processing result
   */
  async handleWebhook(webhookData, signature) {
    if (!this.isConfigured()) {
      throw new APIError('Payment service not configured', 503);
    }

    // Verify webhook signature if webhook secret is configured
    if (process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET !== 'dev_skip_webhook_verification') {
      const isValidSignature = this.verifyWebhookSignature(webhookData, signature);
      if (!isValidSignature) {
        logger.warn('Invalid webhook signature received');
        throw new APIError('Invalid webhook signature', 400);
      }
    }

    const { event, payload } = webhookData;

    logger.info('Processing Razorpay webhook', {
      event: event,
      paymentId: payload.payment?.entity?.id,
      orderId: payload.payment?.entity?.order_id
    });

    try {
      switch (event) {
        case 'payment.captured':
          return await this.handlePaymentCaptured(payload.payment.entity);
        
        case 'payment.failed':
          return await this.handlePaymentFailed(payload.payment.entity);
        
        default:
          logger.info('Unhandled webhook event', { event });
          return { success: true, message: 'Event acknowledged but not processed' };
      }
    } catch (error) {
      logger.error('Webhook processing error', {
        event: event,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} webhookData 
   * @param {string} signature 
   * @returns {boolean}
   */
  verifyWebhookSignature(webhookData, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(webhookData))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }

  /**
   * Handle payment captured webhook
   * @param {Object} paymentEntity 
   * @returns {Object}
   */
  async handlePaymentCaptured(paymentEntity) {
    const { id: paymentId, order_id: razorpayOrderId } = paymentEntity;

    // Find order by Razorpay order ID
    const order = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
    
    if (!order) {
      logger.warn('Order not found for webhook payment', { razorpayOrderId, paymentId });
      return { success: false, message: 'Order not found' };
    }

    // If payment is already verified, skip processing
    if (order.payment.status === 'paid') {
      logger.info('Payment already processed', { orderId: order._id, paymentId });
      return { success: true, message: 'Payment already processed' };
    }

    // Update payment details
    order.payment.razorpayPaymentId = paymentId;
    order.payment.status = 'paid';
    order.payment.method = paymentEntity.method || 'razorpay';
    order.payment.paidAt = new Date();
    order.payment.signatureVerified = true; // Webhook verification serves as signature verification

    // Update order status
    order.status = 'confirmed';
    order.timing.orderConfirmed = new Date();

    await order.save();

    logger.info('Payment captured via webhook', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentId: paymentId,
      amount: order.pricing.total
    });

    return { success: true, message: 'Payment captured successfully' };
  }

  /**
   * Handle payment failed webhook
   * @param {Object} paymentEntity 
   * @returns {Object}
   */
  async handlePaymentFailed(paymentEntity) {
    const { id: paymentId, order_id: razorpayOrderId, error_description } = paymentEntity;

    // Find order by Razorpay order ID
    const order = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
    
    if (!order) {
      logger.warn('Order not found for failed payment webhook', { razorpayOrderId, paymentId });
      return { success: false, message: 'Order not found' };
    }

    // Mark payment as failed
    await order.markPaymentFailed(error_description || 'Payment failed');

    logger.info('Payment failed via webhook', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentId: paymentId,
      reason: error_description
    });

    return { success: true, message: 'Payment failure processed' };
  }

  /**
   * Handle expired payments and cleanup
   * @param {string} orderId - MongoDB order ID
   * @returns {Object} Cleanup result
   */
  async handleExpiredPayment(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Only handle if payment is in processing state and expired
      if (order.payment.status === 'processing' && order.isPaymentExpired()) {
        await order.markPaymentFailed('Payment expired');

        logger.info('Expired payment cleaned up', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          razorpayOrderId: order.payment.razorpayOrderId
        });

        return { success: true, message: 'Expired payment cleaned up' };
      }

      return { success: false, message: 'Order not eligible for cleanup' };
    } catch (error) {
      logger.error('Error handling expired payment', {
        orderId: orderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check for duplicate payment attempts
   * @param {string} orderId - MongoDB order ID
   * @param {string} razorpayOrderId - Razorpay order ID
   * @returns {boolean} True if duplicate
   */
  async isDuplicatePayment(orderId, razorpayOrderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return false;
      }

      // Check if there's already a different Razorpay order for this order
      if (order.payment.razorpayOrderId && order.payment.razorpayOrderId !== razorpayOrderId) {
        logger.warn('Duplicate payment attempt detected', {
          orderId: orderId,
          existingRazorpayOrderId: order.payment.razorpayOrderId,
          newRazorpayOrderId: razorpayOrderId
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking duplicate payment', {
        orderId: orderId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Retry payment verification with exponential backoff
   * @param {string} orderId - MongoDB order ID
   * @param {Object} paymentData - Payment verification data
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Object} Verification result
   */
  async retryPaymentVerification(orderId, paymentData, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Payment verification attempt', {
          orderId: orderId,
          attempt: attempt,
          maxRetries: maxRetries
        });

        const result = await this.verifyPayment(orderId, paymentData);
        return result;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn('Payment verification failed, retrying', {
            orderId: orderId,
            attempt: attempt,
            error: error.message,
            retryDelay: delay
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('Payment verification failed after all retries', {
      orderId: orderId,
      maxRetries: maxRetries,
      finalError: lastError.message
    });

    throw lastError;
  }

  /**
   * Validate payment configuration for restaurant or zone
   * @param {Object} order - Order object with populated restaurant/zone
   * @returns {Object} Validation result
   */
  async validatePaymentConfiguration(order) {
    try {
      let entity, entityType;

      if (order.restaurantId) {
        entity = order.restaurantId;
        entityType = 'restaurant';
      } else if (order.zoneId) {
        entity = order.zoneId;
        entityType = 'zone';
      } else {
        return {
          canAcceptOnlinePayments: false,
          errorMessage: 'Order is not associated with a restaurant or zone'
        };
      }

      // Check if UPI ID is configured
      const upiId = entity.paymentConfig?.upiId;
      if (!upiId || !upiId.trim()) {
        return {
          canAcceptOnlinePayments: false,
          errorMessage: `${entityType === 'restaurant' ? 'Restaurant' : 'Zone'} has not configured UPI ID for online payments. Please contact the ${entityType} to set up payment configuration.`,
          entityType,
          entityName: entity.name
        };
      }

      // Validate UPI ID format
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
      if (!upiRegex.test(upiId)) {
        return {
          canAcceptOnlinePayments: false,
          errorMessage: `${entityType === 'restaurant' ? 'Restaurant' : 'Zone'} has invalid UPI ID configuration. Please contact the ${entityType} to fix payment setup.`,
          entityType,
          entityName: entity.name
        };
      }

      return {
        canAcceptOnlinePayments: true,
        upiId: upiId,
        paymentModel: entity.paymentConfig?.paymentModel || 'direct',
        entityType,
        entityName: entity.name
      };
    } catch (error) {
      logger.error('Error validating payment configuration', {
        orderId: order._id,
        error: error.message
      });

      return {
        canAcceptOnlinePayments: false,
        errorMessage: 'Unable to validate payment configuration. Please try again.'
      };
    }
  }
}

// Export singleton instance
module.exports = new OrderPaymentService();
