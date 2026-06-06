import api from '../api/api';
import { logger } from '../logging/logger';

/**
 * Payment Service for handling Razorpay plan upgrade payments
 */
class PaymentService {
  /**
   * Create a payment order for plan upgrade
   * @param {Object} planData - Plan data containing planKey and planType
   * @returns {Promise<Object>} Payment order details
   */
  static async createPlanOrder(planData) {
    try {
      logger.info('Creating payment order', { planData }, 'PaymentService');

      // Mock payment for development if enabled
      if (import.meta.env.VITE_MOCK_PAYMENTS === 'true') {
        logger.info('Using mock payment for development', { planData }, 'PaymentService');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
          success: true,
          data: {
            orderId: `mock_order_${Date.now()}`,
            amount: 299,
            currency: 'INR',
            key: 'mock_razorpay_key',
            receipt: `mock_receipt_${Date.now()}`,
            plan: {
              id: 'mock_plan_id',
              name: 'Mock Plan',
              type: planData.planType || 'restaurant',
              price: 299
            }
          },
          message: 'Mock payment order created successfully'
        };
      }

      const response = await api.post('/payment/create-plan-order', planData);

      logger.info('Payment order created successfully', {
        orderId: response.data.data.orderId
      }, 'PaymentService');

      return response.data;
    } catch (error) {
      logger.error('Failed to create payment order', error, 'PaymentService');
      throw error;
    }
  }

  /**
   * Verify payment after successful Razorpay payment
   * @param {Object} paymentData - Payment verification data
   * @returns {Promise<Object>} Verification result
   */
  static async verifyPlanPayment(paymentData) {
    try {
      logger.info('Verifying payment', {
        orderId: paymentData.razorpay_order_id
      }, 'PaymentService');

      // Mock payment verification for development if enabled
      if (import.meta.env.VITE_MOCK_PAYMENTS === 'true') {
        logger.info('Using mock payment verification for development', { paymentData }, 'PaymentService');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
          success: true,
          data: {
            paymentId: `mock_payment_${Date.now()}`,
            plan: {
              id: 'mock_plan_id',
              name: 'Mock Plan',
              type: 'restaurant',
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString()
            },
            amount: 299
          },
          message: 'Mock payment verified and plan activated successfully'
        };
      }

      const response = await api.post('/payment/verify-plan-payment', paymentData);

      logger.info('Payment verified successfully', {
        paymentId: response.data.data.paymentId
      }, 'PaymentService');

      return response.data;
    } catch (error) {
      logger.error('Payment verification failed', error, 'PaymentService');
      throw error;
    }
  }

  /**
   * Get user's payment history
   * @param {Object} options - Query options (page, limit, status)
   * @returns {Promise<Object>} Payment history
   */
  static async getPaymentHistory(options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.status) params.append('status', options.status);

      const response = await api.get(`/payment/history?${params.toString()}`);

      return response.data;
    } catch (error) {
      logger.error('Failed to get payment history', error, 'PaymentService');
      throw error;
    }
  }

  /**
   * Get current plan details
   * @returns {Promise<Object>} Current plan information
   */
  static async getCurrentPlan() {
    try {
      const response = await api.get('/payment/current-plan');
      return response.data;
    } catch (error) {
      logger.error('Failed to get current plan', error, 'PaymentService');
      throw error;
    }
  }

  /**
   * Initialize Razorpay payment
   * @param {Object} orderData - Order data from backend
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @returns {void}
   */
  static initializeRazorpayPayment(orderData, onSuccess, onError) {
    try {
      // Debug: Log the orderData structure
      console.log('🔍 PaymentService orderData:', orderData);

      // Validate orderData structure
      if (!orderData || !orderData.orderId) {
        throw new Error('Invalid order data received from server');
      }
      
      // Validate required fields for Razorpay
      if (!orderData.key) {
        throw new Error('Razorpay key missing from order data');
      }
      
      if (!orderData.amount || orderData.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount, // Amount already in paise from backend
        currency: orderData.currency || 'INR',
        name: 'Tableserves',
        description: `Upgrade to ${orderData.plan?.name || 'Selected'} Plan`,
        order_id: orderData.orderId,
        receipt: orderData.receipt,
        method: {
          card: true,
          netbanking: true,
          wallet: true,
          upi: true,
          paylater: true
        },
        handler: function (response) {
          logger.info('Razorpay payment successful', {
            paymentId: response.razorpay_payment_id
          }, 'PaymentService');

          onSuccess({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        prefill: {
          name: orderData.user?.name || '',
          email: orderData.user?.email || '',
          contact: orderData.user?.contact || ''
        },
        notes: {
          plan_id: orderData.plan?.id || 'unknown',
          plan_name: orderData.plan?.name || 'Unknown Plan',
          plan_type: orderData.plan?.type || 'unknown'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function () {
            logger.info('Razorpay payment modal dismissed', {}, 'PaymentService');
          }
        }
      };

      // Log the options being sent to Razorpay
      console.log('🔍 Razorpay options:', {
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        order_id: options.order_id,
        description: options.description
      });

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', function (response) {
        console.error('🚨 Razorpay payment failed:', response);
        logger.error('Razorpay payment failed', response.error, 'PaymentService');
        
        const errorDetails = {
          code: response.error?.code || 'UNKNOWN_ERROR',
          description: response.error?.description || 'Payment failed',
          source: response.error?.source || 'razorpay',
          step: response.error?.step || 'payment',
          reason: response.error?.reason || 'unknown',
          metadata: response.error?.metadata || {}
        };
        
        console.error('🔍 Error details:', errorDetails);
        
        // Provide user-friendly error messages
        let userMessage = 'Payment failed. Please try again.';
        if (errorDetails.code === 'BAD_REQUEST_ERROR') {
          userMessage = 'Invalid payment data. Please refresh and try again.';
        } else if (errorDetails.code === 'GATEWAY_ERROR') {
          userMessage = 'Payment gateway error. Please try again in a few minutes.';
        } else if (errorDetails.code === 'NETWORK_ERROR') {
          userMessage = 'Network error. Please check your connection and try again.';
        }
        
        onError({
          ...errorDetails,
          userMessage
        });
      });

      razorpay.open();
    } catch (error) {
      logger.error('Failed to initialize Razorpay payment', error, 'PaymentService');
      onError(error);
    }
  }

  /**
   * Load Razorpay SDK dynamically
   * @returns {Promise<void>}
   */
  static loadRazorpaySDK() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof window.Razorpay !== 'undefined') {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;

      script.onload = () => {
        logger.info('Razorpay SDK loaded successfully', {}, 'PaymentService');
        resolve();
      };

      script.onerror = () => {
        const error = new Error('Failed to load Razorpay SDK');
        logger.error('Razorpay SDK loading failed', error, 'PaymentService');
        reject(error);
      };

      // Add to document head
      document.head.appendChild(script);
    });
  }

  /**
   * Format currency amount for display
   * @param {number} amount - Amount in rupees
   * @param {string} currency - Currency code
   * @returns {string} Formatted amount
   */
  static formatAmount(amount, currency = 'INR') {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount}`;
  }

  /**
   * Calculate tax amount (18% GST for India)
   * @param {number} amount - Base amount
   * @returns {number} Tax amount
   */
  static calculateTax(amount) {
    return Math.round(amount * 0.18);
  }

  /**
   * Calculate total amount including tax
   * @param {number} baseAmount - Base amount
   * @returns {Object} Amount breakdown
   */
  static calculateTotalAmount(baseAmount) {
    const taxAmount = this.calculateTax(baseAmount);
    const totalAmount = baseAmount + taxAmount;

    return {
      baseAmount,
      taxAmount,
      totalAmount,
      formattedBase: this.formatAmount(baseAmount),
      formattedTax: this.formatAmount(taxAmount),
      formattedTotal: this.formatAmount(totalAmount)
    };
  }
}

export default PaymentService;