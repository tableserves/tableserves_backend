const request = require('supertest');
const app = require('../server');
const User = require('../src/models/User');
const Plan = require('../src/models/Plan');
const PlanPayment = require('../src/models/PlanPayment');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

describe('Payment API Tests', () => {
  let authToken;
  let testUser;
  let testPlan;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Plan.deleteMany({ key: /test.*/ });
    await PlanPayment.deleteMany({});

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test.payment@example.com',
      password: 'password123',
      role: 'restaurant_owner',
      businessType: 'restaurant',
      isVerified: true
    });

    // Create test plan
    testPlan = await Plan.create({
      name: 'Test Basic Plan',
      key: 'test_basic',
      planType: 'restaurant',
      price: 299,
      currency: 'INR',
      duration: 30,
      limits: {
        maxMenus: 5,
        maxCategories: 20,
        maxMenuItems: 100
      },
      features: {
        menuManagement: true,
        orderManagement: true,
        analytics: false
      },
      active: true,
      sortOrder: 1
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Plan.deleteMany({ key: /test.*/ });
    await PlanPayment.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/v1/payment/create-plan-order', () => {
    it('should create a payment order successfully', async () => {
      const response = await request(app)
        .post('/api/v1/payment/create-plan-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: testPlan._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('currency', 'INR');
      expect(response.body.data).toHaveProperty('key');
      expect(response.body.data.plan.name).toBe(testPlan.name);
    });

    it('should return 404 for invalid plan ID', async () => {
      const invalidPlanId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/api/v1/payment/create-plan-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: invalidPlanId.toString()
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Plan not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/payment/create-plan-order')
        .send({
          planId: testPlan._id.toString()
        });

      expect(response.status).toBe(401);
    });

    it('should validate plan type matches user business type', async () => {
      // Create a zone plan
      const zonePlan = await Plan.create({
        name: 'Test Zone Plan',
        key: 'test_zone',
        planType: 'zone',
        price: 999,
        currency: 'INR',
        duration: 30,
        limits: { maxMenus: 10 },
        features: { menuManagement: true },
        active: true,
        sortOrder: 1
      });

      const response = await request(app)
        .post('/api/v1/payment/create-plan-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: zonePlan._id.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Plan type does not match');
    });
  });

  describe('POST /api/v1/payment/verify-plan-payment', () => {
    let testPayment;

    beforeEach(async () => {
      // Create a test payment record
      testPayment = await PlanPayment.create({
        userId: testUser._id,
        planId: testPlan._id,
        razorpayOrderId: 'order_test123',
        amount: 299,
        currency: 'INR',
        status: 'pending'
      });
    });

    it('should handle payment verification (mock)', async () => {
      // Note: This is a mock test since we can't generate real Razorpay signatures in tests
      const response = await request(app)
        .post('/api/v1/payment/verify-plan-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'invalid_signature_for_test'
        });

      // This should fail signature verification
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing payment data', async () => {
      const response = await request(app)
        .post('/api/v1/payment/verify-plan-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: 'order_test123'
          // Missing payment_id and signature
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/payment/webhook', () => {
    it('should handle webhook events', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              order_id: 'order_test123',
              status: 'captured',
              amount: 29900 // Amount in paise
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/payment/webhook')
        .send(webhookPayload);

      // Webhook should always return 200 to acknowledge receipt
      expect(response.status).toBe(200);
    });
  });
});

describe('Plan API Tests', () => {
  let authToken;
  let testUser;
  let testPlans;

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Plan.deleteMany({ key: /test.*/ });

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test.plans@example.com',
      password: 'password123',
      role: 'restaurant_owner',
      businessType: 'restaurant',
      isVerified: true
    });

    // Create test plans
    testPlans = await Plan.create([
      {
        name: 'Test Free',
        key: 'test_free',
        planType: 'restaurant',
        price: 0,
        currency: 'INR',
        duration: null,
        limits: { maxMenus: 1 },
        features: { menuManagement: true },
        active: true,
        sortOrder: 1
      },
      {
        name: 'Test Basic',
        key: 'test_basic',
        planType: 'restaurant',
        price: 299,
        currency: 'INR',
        duration: 30,
        limits: { maxMenus: 5 },
        features: { menuManagement: true },
        active: true,
        sortOrder: 2
      }
    ]);

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/v1/plans', () => {
    it('should get all plans for user business type', async () => {
      const response = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].planType).toBe('restaurant');
    });
  });

  describe('GET /api/v1/plans/usage', () => {
    it('should get user plan usage', async () => {
      const response = await request(app)
        .get('/api/v1/plans/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('plan');
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data).toHaveProperty('limits');
    });
  });

  describe('GET /api/v1/plans/recommendations', () => {
    it('should get plan recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/plans/recommendations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
