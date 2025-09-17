const request = require('supertest');
const app = require('../../server');
const { Order } = require('../../src/models');
const crypto = require('crypto');

describe('Payment Flow Integration Tests', () => {
  let testOrder;
  let razorpayOrderId;
  let razorpayPaymentId;
  let validSignature;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_RITcoFYtrdDOn7';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  });

  beforeEach(async () => {
    // Create a test order
    testOrder = new Order({
      orderNumber: 'TEST001',
      status: 'pending',
      customer: {
        name: 'Test Customer',
        phone: '9999999999',
        email: 'test@example.com'
      },
      items: [{
        name: 'Test Item',
        price: 100,
        quantity: 1
      }],
      pricing: {
        subtotal: 100,
        total: 100,
        currency: 'INR'
      },
      tableNumber: '5',
      restaurantId: 'test_restaurant_id',
      payment: {
        status: 'pending'
      }
    });

    await testOrder.save();

    // Generate test payment data
    razorpayOrderId = 'order_test_' + Date.now();
    razorpayPaymentId = 'pay_test_' + Date.now();
    
    // Generate valid signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
  });

  afterEach(async () => {
    // Cleanup test data
    if (testOrder) {
      await Order.findByIdAndDelete(testOrder._id);
    }
  });

  describe('POST /api/v1/orders/create-payment', () => {
    test('should create payment order successfully', async () => {
      const response = await request(app)
        .post('/api/v1/orders/create-payment')
        .send({
          orderId: testOrder._id.toString()
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          razorpayOrderId: expect.stringMatching(/^order_/),
          amount: 10000, // 100 * 100 (paise)
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          order: {
            id: testOrder._id.toString(),
            orderNumber: 'TEST001',
            total: 100
          }
        }
      });

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('processing');
      expect(updatedOrder.payment.razorpayOrderId).toBeTruthy();
    });

    test('should return 400 for invalid order ID', async () => {
      const response = await request(app)
        .post('/api/v1/orders/create-payment')
        .send({
          orderId: 'invalid_id'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Validation failed')
        }
      });
    });

    test('should return 404 for non-existent order', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .post('/api/v1/orders/create-payment')
        .send({
          orderId: nonExistentId
        })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Order not found'
        }
      });
    });

    test('should handle rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(12).fill().map(() => 
        request(app)
          .post('/api/v1/orders/create-payment')
          .send({
            orderId: testOrder._id.toString()
          })
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimitedResponse = responses.find(res => res.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
        }
      });
    });
  });

  describe('POST /api/v1/orders/verify-payment', () => {
    beforeEach(async () => {
      // Set up order with Razorpay order ID
      testOrder.payment.status = 'processing';
      testOrder.payment.razorpayOrderId = razorpayOrderId;
      testOrder.payment.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      await testOrder.save();
    });

    test('should verify payment successfully', async () => {
      const response = await request(app)
        .post('/api/v1/orders/verify-payment')
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: validSignature
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Payment verified successfully',
        data: {
          order: {
            _id: testOrder._id.toString(),
            status: 'confirmed'
          }
        }
      });

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('paid');
      expect(updatedOrder.payment.razorpayPaymentId).toBe(razorpayPaymentId);
      expect(updatedOrder.payment.signatureVerified).toBe(true);
      expect(updatedOrder.status).toBe('confirmed');
    });

    test('should reject invalid signature', async () => {
      const response = await request(app)
        .post('/api/v1/orders/verify-payment')
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: 'invalid_signature'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Payment verification failed'
        }
      });

      // Verify order was marked as failed
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('failed');
    });

    test('should reject mismatched order ID', async () => {
      const response = await request(app)
        .post('/api/v1/orders/verify-payment')
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: 'order_different_id',
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: validSignature
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid payment order ID'
        }
      });
    });

    test('should handle expired payment', async () => {
      // Set payment as expired
      testOrder.payment.expiresAt = new Date(Date.now() - 1000); // 1 second ago
      await testOrder.save();

      const response = await request(app)
        .post('/api/v1/orders/verify-payment')
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: validSignature
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Payment has expired'
        }
      });
    });

    test('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/v1/orders/verify-payment')
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: 'invalid_format',
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: validSignature
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PAYMENT_VALIDATION_ERROR'
        }
      });
    });
  });

  describe('Complete Payment Flow', () => {
    test('should complete full payment flow successfully', async () => {
      // Step 1: Create payment order
      const createResponse = await request(app)
        .post('/api/v1/orders/create-payment')
        .send({
          orderId: testOrder._id.toString()
        })
        .expect(200);

      const { razorpayOrderId: createdOrderId } = createResponse.body.data;

      // Step 2: Generate signature for the created order
      const paymentId = 'pay_test_' + Date.now();
      const body = createdOrderId + '|' + paymentId;
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      // Step 3: Verify payment
      const verifyResponse = await request(app)
        .post('/api/v1/orders/verify-payment')
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: createdOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        })
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        success: true,
        message: 'Payment verified successfully'
      });

      // Verify final order state
      const finalOrder = await Order.findById(testOrder._id);
      expect(finalOrder.status).toBe('confirmed');
      expect(finalOrder.payment.status).toBe('paid');
      expect(finalOrder.payment.signatureVerified).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle duplicate payment creation attempts', async () => {
      // Create first payment
      await request(app)
        .post('/api/v1/orders/create-payment')
        .send({
          orderId: testOrder._id.toString()
        })
        .expect(200);

      // Try to create second payment
      const response = await request(app)
        .post('/api/v1/orders/create-payment')
        .send({
          orderId: testOrder._id.toString()
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Payment already initiated or completed'
        }
      });
    });

    test('should handle payment verification for non-processing order', async () => {
      // Order is still in pending state (no payment created)
      const response = await request(app)
        .post('/api/v1/orders/verify-payment')
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: validSignature
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid payment order ID'
        }
      });
    });
  });
});
