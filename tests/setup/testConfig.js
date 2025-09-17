/**
 * Test Configuration for Razorpay Payment Integration
 * 
 * This file contains test credentials and configuration for testing
 * the Razorpay payment integration in a safe environment.
 */

// Razorpay Test Credentials
const RAZORPAY_TEST_CONFIG = {
  // Test Key ID (safe to expose in tests)
  KEY_ID: 'rzp_test_RITcoFYtrdDOn7',
  
  // Test Key Secret (use environment variable in real tests)
  KEY_SECRET: process.env.RAZORPAY_TEST_KEY_SECRET || 'test_secret_key_for_unit_tests',
  
  // Test Webhook Secret
  WEBHOOK_SECRET: process.env.RAZORPAY_TEST_WEBHOOK_SECRET || 'test_webhook_secret',
  
  // Test API Base URL
  API_BASE_URL: 'https://api.razorpay.com/v1'
};

// Test Payment Scenarios
const TEST_PAYMENT_SCENARIOS = {
  // Successful payment test data
  SUCCESS: {
    amount: 10000, // ₹100.00 in paise
    currency: 'INR',
    receipt: 'test_receipt_001',
    notes: {
      test_scenario: 'success',
      order_id: 'test_order_001'
    }
  },

  // Failed payment test data
  FAILURE: {
    amount: 10000,
    currency: 'INR',
    receipt: 'test_receipt_002',
    notes: {
      test_scenario: 'failure',
      order_id: 'test_order_002'
    }
  },

  // Expired payment test data
  EXPIRED: {
    amount: 10000,
    currency: 'INR',
    receipt: 'test_receipt_003',
    notes: {
      test_scenario: 'expired',
      order_id: 'test_order_003'
    }
  }
};

// Test Card Numbers (Razorpay Test Cards)
const TEST_CARDS = {
  // Successful payment
  SUCCESS_VISA: {
    number: '4111111111111111',
    expiry_month: 12,
    expiry_year: 2025,
    cvv: '123',
    name: 'Test User'
  },

  // Failed payment
  FAILURE_VISA: {
    number: '4000000000000002',
    expiry_month: 12,
    expiry_year: 2025,
    cvv: '123',
    name: 'Test User'
  },

  // Insufficient funds
  INSUFFICIENT_FUNDS: {
    number: '4000000000000119',
    expiry_month: 12,
    expiry_year: 2025,
    cvv: '123',
    name: 'Test User'
  }
};

// Test UPI IDs
const TEST_UPI_IDS = {
  SUCCESS: 'success@razorpay',
  FAILURE: 'failure@razorpay'
};

// Test Bank Account Details
const TEST_BANK_ACCOUNTS = {
  SUCCESS: {
    account_number: '1234567890',
    ifsc: 'HDFC0000001',
    name: 'Test User'
  }
};

// Mock Order Data for Tests
const MOCK_ORDER_DATA = {
  BASIC: {
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
      quantity: 1,
      modifiers: []
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
  },

  WITH_MULTIPLE_ITEMS: {
    orderNumber: 'TEST002',
    status: 'pending',
    customer: {
      name: 'Test Customer 2',
      phone: '8888888888',
      email: 'test2@example.com'
    },
    items: [
      {
        name: 'Test Item 1',
        price: 150,
        quantity: 2,
        modifiers: []
      },
      {
        name: 'Test Item 2',
        price: 200,
        quantity: 1,
        modifiers: []
      }
    ],
    pricing: {
      subtotal: 500,
      total: 500,
      currency: 'INR'
    },
    tableNumber: '10',
    restaurantId: 'test_restaurant_id',
    payment: {
      status: 'pending'
    }
  }
};

// Test Environment Configuration
const TEST_ENV_CONFIG = {
  // Database
  MONGODB_URI: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/tableserve_test',
  
  // Server
  PORT: process.env.TEST_PORT || 3001,
  
  // JWT
  JWT_SECRET: 'test_jwt_secret_key',
  
  // Razorpay
  RAZORPAY_KEY_ID: RAZORPAY_TEST_CONFIG.KEY_ID,
  RAZORPAY_KEY_SECRET: RAZORPAY_TEST_CONFIG.KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: RAZORPAY_TEST_CONFIG.WEBHOOK_SECRET,
  
  // Other
  NODE_ENV: 'test',
  LOG_LEVEL: 'error' // Reduce logging during tests
};

// Test Utilities
const TEST_UTILS = {
  /**
   * Generate a valid Razorpay signature for testing
   */
  generateValidSignature: (orderId, paymentId, secret = RAZORPAY_TEST_CONFIG.KEY_SECRET) => {
    const crypto = require('crypto');
    const body = orderId + '|' + paymentId;
    return crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  },

  /**
   * Generate a valid webhook signature for testing
   */
  generateWebhookSignature: (payload, secret = RAZORPAY_TEST_CONFIG.WEBHOOK_SECRET) => {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  },

  /**
   * Create a test order with payment processing state
   */
  createProcessingOrder: (orderId, razorpayOrderId) => ({
    ...MOCK_ORDER_DATA.BASIC,
    _id: orderId,
    payment: {
      status: 'processing',
      razorpayOrderId: razorpayOrderId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    }
  }),

  /**
   * Generate test webhook payload
   */
  generateWebhookPayload: (event, orderId, paymentId) => ({
    entity: 'event',
    account_id: 'acc_test123',
    event: event,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: 10000,
          currency: 'INR',
          status: event === 'payment.captured' ? 'captured' : 'failed',
          order_id: orderId,
          method: 'card',
          captured: event === 'payment.captured',
          created_at: Math.floor(Date.now() / 1000)
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  })
};

module.exports = {
  RAZORPAY_TEST_CONFIG,
  TEST_PAYMENT_SCENARIOS,
  TEST_CARDS,
  TEST_UPI_IDS,
  TEST_BANK_ACCOUNTS,
  MOCK_ORDER_DATA,
  TEST_ENV_CONFIG,
  TEST_UTILS
};
