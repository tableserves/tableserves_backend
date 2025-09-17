const orderPaymentService = require('../../src/services/orderPaymentService');
const { Order } = require('../../src/models');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/utils/logger');

describe('OrderPaymentService', () => {
  let mockOrder;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock order object
    mockOrder = {
      _id: 'order123',
      orderNumber: 'ORD001',
      status: 'pending',
      pricing: {
        total: 100.50,
        currency: 'INR'
      },
      customer: {
        name: 'Test Customer',
        phone: '9999999999',
        email: 'test@example.com'
      },
      tableNumber: '5',
      restaurantId: 'restaurant123',
      payment: {
        status: 'pending',
        razorpayOrderId: null,
        razorpayPaymentId: null,
        razorpaySignature: null,
        signatureVerified: false,
        verificationAttempts: 0,
        expiresAt: null
      },
      setRazorpayOrder: jest.fn().mockResolvedValue(true),
      markAsPaidWithRazorpay: jest.fn().mockResolvedValue(true),
      markPaymentFailed: jest.fn().mockResolvedValue(true),
      isPaymentExpired: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock Razorpay
    orderPaymentService.razorpay = {
      orders: {
        create: jest.fn()
      }
    };

    // Set environment variables
    process.env.RAZORPAY_KEY_ID = 'test_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
  });

  describe('createRazorpayOrder', () => {
    beforeEach(() => {
      Order.findById = jest.fn().mockResolvedValue(mockOrder);
    });

    test('should create Razorpay order successfully', async () => {
      const mockRazorpayOrder = {
        id: 'order_razorpay123',
        amount: 10050,
        currency: 'INR'
      };

      orderPaymentService.razorpay.orders.create.mockResolvedValue(mockRazorpayOrder);

      const result = await orderPaymentService.createRazorpayOrder('order123');

      expect(result).toEqual({
        razorpayOrderId: 'order_razorpay123',
        amount: 10050,
        currency: 'INR',
        keyId: 'test_key_id',
        receipt: expect.stringContaining('order_ORD001_'),
        order: {
          id: 'order123',
          orderNumber: 'ORD001',
          total: 100.50,
          customer: {
            name: 'Test Customer',
            phone: '9999999999',
            email: 'test@example.com'
          }
        }
      });

      expect(mockOrder.setRazorpayOrder).toHaveBeenCalledWith(
        'order_razorpay123',
        expect.any(Date)
      );
    });

    test('should throw error if order not found', async () => {
      Order.findById = jest.fn().mockResolvedValue(null);

      await expect(orderPaymentService.createRazorpayOrder('nonexistent'))
        .rejects.toThrow('Order not found');
    });

    test('should throw error if order is not in pending state', async () => {
      mockOrder.status = 'completed';
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      await expect(orderPaymentService.createRazorpayOrder('order123'))
        .rejects.toThrow('Order is not in pending state');
    });

    test('should throw error if payment is already processing', async () => {
      mockOrder.payment.status = 'processing';
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      await expect(orderPaymentService.createRazorpayOrder('order123'))
        .rejects.toThrow('Payment already initiated or completed');
    });

    test('should handle Razorpay API errors', async () => {
      orderPaymentService.razorpay.orders.create.mockRejectedValue(
        new Error('Razorpay API error')
      );

      await expect(orderPaymentService.createRazorpayOrder('order123'))
        .rejects.toThrow('Payment order creation failed: Razorpay API error');

      expect(mockOrder.markPaymentFailed).toHaveBeenCalledWith(
        'Razorpay order creation failed: Razorpay API error'
      );
    });
  });

  describe('verifyPayment', () => {
    const validPaymentData = {
      razorpay_order_id: 'order_razorpay123',
      razorpay_payment_id: 'pay_razorpay456',
      razorpay_signature: 'valid_signature'
    };

    beforeEach(() => {
      mockOrder.payment.razorpayOrderId = 'order_razorpay123';
      Order.findById = jest.fn().mockResolvedValue(mockOrder);
      
      // Mock signature verification
      orderPaymentService.verifySignature = jest.fn().mockReturnValue(true);
    });

    test('should verify payment successfully', async () => {
      const result = await orderPaymentService.verifyPayment('order123', validPaymentData);

      expect(result).toEqual({
        success: true,
        message: 'Payment verified successfully',
        order: mockOrder
      });

      expect(mockOrder.markAsPaidWithRazorpay).toHaveBeenCalledWith(
        'pay_razorpay456',
        'valid_signature'
      );
      expect(mockOrder.status).toBe('confirmed');
    });

    test('should throw error if order not found', async () => {
      Order.findById = jest.fn().mockResolvedValue(null);

      await expect(orderPaymentService.verifyPayment('nonexistent', validPaymentData))
        .rejects.toThrow('Order not found');
    });

    test('should throw error if Razorpay order ID mismatch', async () => {
      mockOrder.payment.razorpayOrderId = 'different_order_id';

      await expect(orderPaymentService.verifyPayment('order123', validPaymentData))
        .rejects.toThrow('Invalid payment order ID');
    });

    test('should return success if payment already verified', async () => {
      mockOrder.payment.status = 'paid';

      const result = await orderPaymentService.verifyPayment('order123', validPaymentData);

      expect(result).toEqual({
        success: true,
        message: 'Payment already verified',
        order: mockOrder
      });
    });

    test('should throw error if payment expired', async () => {
      mockOrder.isPaymentExpired.mockReturnValue(true);

      await expect(orderPaymentService.verifyPayment('order123', validPaymentData))
        .rejects.toThrow('Payment has expired');

      expect(mockOrder.markPaymentFailed).toHaveBeenCalledWith('Payment expired');
    });

    test('should throw error if signature verification fails', async () => {
      orderPaymentService.verifySignature = jest.fn().mockReturnValue(false);

      await expect(orderPaymentService.verifyPayment('order123', validPaymentData))
        .rejects.toThrow('Payment verification failed');

      expect(mockOrder.markPaymentFailed).toHaveBeenCalledWith('Invalid payment signature');
    });
  });

  describe('verifySignature', () => {
    test('should verify valid signature', () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test456';
      const secret = 'test_secret';
      
      // Create expected signature
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      process.env.RAZORPAY_KEY_SECRET = secret;

      const isValid = orderPaymentService.verifySignature(orderId, paymentId, expectedSignature);
      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test456';
      const invalidSignature = 'invalid_signature';

      process.env.RAZORPAY_KEY_SECRET = 'test_secret';

      const isValid = orderPaymentService.verifySignature(orderId, paymentId, invalidSignature);
      expect(isValid).toBe(false);
    });
  });

  describe('isDuplicatePayment', () => {
    test('should detect duplicate payment', async () => {
      mockOrder.payment.razorpayOrderId = 'existing_order_id';
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      const isDuplicate = await orderPaymentService.isDuplicatePayment('order123', 'new_order_id');
      expect(isDuplicate).toBe(true);
    });

    test('should allow same Razorpay order ID', async () => {
      mockOrder.payment.razorpayOrderId = 'same_order_id';
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      const isDuplicate = await orderPaymentService.isDuplicatePayment('order123', 'same_order_id');
      expect(isDuplicate).toBe(false);
    });

    test('should allow first payment attempt', async () => {
      mockOrder.payment.razorpayOrderId = null;
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      const isDuplicate = await orderPaymentService.isDuplicatePayment('order123', 'new_order_id');
      expect(isDuplicate).toBe(false);
    });
  });

  describe('handleExpiredPayment', () => {
    test('should cleanup expired payment', async () => {
      mockOrder.payment.status = 'processing';
      mockOrder.isPaymentExpired.mockReturnValue(true);
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      const result = await orderPaymentService.handleExpiredPayment('order123');

      expect(result).toEqual({
        success: true,
        message: 'Expired payment cleaned up'
      });
      expect(mockOrder.markPaymentFailed).toHaveBeenCalledWith('Payment expired');
    });

    test('should not cleanup non-expired payment', async () => {
      mockOrder.payment.status = 'processing';
      mockOrder.isPaymentExpired.mockReturnValue(false);
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      const result = await orderPaymentService.handleExpiredPayment('order123');

      expect(result).toEqual({
        success: false,
        message: 'Order not eligible for cleanup'
      });
      expect(mockOrder.markPaymentFailed).not.toHaveBeenCalled();
    });
  });
});
