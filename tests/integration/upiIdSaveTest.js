const axios = require('axios');
const mongoose = require('mongoose');
const Restaurant = require('../../src/models/Restaurant');

// Test configuration
const BASE_URL = 'http://localhost:5000/api/v1';
const TEST_TIMEOUT = 30000;

// Test data
const testRestaurantData = {
  name: 'Test UPI Restaurant',
  email: 'test@upirestaurant.com',
  phone: '9876543210',
  address: {
    street: 'Test Street',
    city: 'Test City',
    state: 'Test State',
    zipCode: '123456',
    country: 'India'
  }
};

const testUpiIds = {
  valid: [
    'test@paytm',
    'john.doe@okaxis',
    '9876543210@upi',
    'user123@icici',
    'test-user@hdfc'
  ],
  invalid: [
    'invalid-upi',
    'user@',
    '@paytm',
    'user space@paytm',
    'user@pay tm'
  ]
};

let authToken = null;
let testRestaurantId = null;

/**
 * Comprehensive UPI ID Save Test Suite
 */
async function runUpiIdSaveTests() {
  console.log('🧪 Starting UPI ID Save Verification Tests...\n');

  try {
    // Step 1: Connect to database
    await connectToDatabase();

    // Step 2: Authenticate as admin
    await authenticateAsAdmin();

    // Step 3: Create test restaurant
    await createTestRestaurant();

    // Step 4: Test UPI ID validation during save
    await testUpiIdValidation();

    // Step 5: Test UPI ID persistence
    await testUpiIdPersistence();

    // Step 6: Test payment configuration retrieval
    await testPaymentConfigRetrieval();

    // Step 7: Test restaurant payment methods
    await testRestaurantPaymentMethods();

    // Step 8: Cleanup
    await cleanup();

    console.log('✅ All UPI ID save tests completed successfully!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Connect to MongoDB database
 */
async function connectToDatabase() {
  console.log('🔄 Connecting to database...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://tableserves02:VGlbikiaK5WTfMGr@tableserves.w4jzk34.mongodb.net/?retryWrites=true&w=majority&appName=TableServes');
    console.log('✅ Database connected successfully');
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Authenticate as admin user
 */
async function authenticateAsAdmin() {
  console.log('🔄 Authenticating as admin...');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'superadmin',
      password: 'superadmin123'
    });

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ Admin authentication successful');
    } else {
      throw new Error('Authentication failed - no token received');
    }
  } catch (error) {
    throw new Error(`Admin authentication failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Create test restaurant
 */
async function createTestRestaurant() {
  console.log('🔄 Creating test restaurant...');
  
  try {
    const response = await axios.post(`${BASE_URL}/restaurants`, testRestaurantData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success && response.data.data._id) {
      testRestaurantId = response.data.data._id;
      console.log('✅ Test restaurant created:', testRestaurantId);
    } else {
      throw new Error('Restaurant creation failed - no ID received');
    }
  } catch (error) {
    throw new Error(`Restaurant creation failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Test UPI ID validation during save operations
 */
async function testUpiIdValidation() {
  console.log('🔄 Testing UPI ID validation...');

  // Test valid UPI IDs
  for (const upiId of testUpiIds.valid) {
    console.log(`  Testing valid UPI ID: ${upiId}`);
    
    try {
      const response = await axios.put(`${BASE_URL}/restaurants/${testRestaurantId}`, {
        paymentConfig: {
          upiId: upiId,
          paymentModel: 'direct'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log(`    ✅ Valid UPI ID accepted: ${upiId}`);
      } else {
        throw new Error(`Valid UPI ID rejected: ${upiId}`);
      }
    } catch (error) {
      throw new Error(`Valid UPI ID test failed for ${upiId}: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test invalid UPI IDs
  for (const upiId of testUpiIds.invalid) {
    console.log(`  Testing invalid UPI ID: ${upiId}`);
    
    try {
      const response = await axios.put(`${BASE_URL}/restaurants/${testRestaurantId}`, {
        paymentConfig: {
          upiId: upiId,
          paymentModel: 'direct'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // If we reach here, the invalid UPI ID was accepted (which is wrong)
      throw new Error(`Invalid UPI ID was accepted: ${upiId}`);
    } catch (error) {
      if (error.response?.status === 400 || error.message.includes('validation')) {
        console.log(`    ✅ Invalid UPI ID correctly rejected: ${upiId}`);
      } else {
        throw new Error(`Unexpected error for invalid UPI ID ${upiId}: ${error.message}`);
      }
    }
  }

  console.log('✅ UPI ID validation tests completed');
}

/**
 * Test UPI ID persistence and retrieval
 */
async function testUpiIdPersistence() {
  console.log('🔄 Testing UPI ID persistence...');

  const testUpiId = 'persistence@test.com';

  // Save UPI ID
  try {
    await axios.put(`${BASE_URL}/restaurants/${testRestaurantId}`, {
      paymentConfig: {
        upiId: testUpiId,
        paymentModel: 'direct',
        onlinePaymentsEnabled: true
      }
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('  ✅ UPI ID saved successfully');
  } catch (error) {
    throw new Error(`UPI ID save failed: ${error.response?.data?.message || error.message}`);
  }

  // Retrieve and verify UPI ID
  try {
    const response = await axios.get(`${BASE_URL}/restaurants/${testRestaurantId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const restaurant = response.data.data;
    
    if (restaurant.paymentConfig?.upiId === testUpiId) {
      console.log('  ✅ UPI ID retrieved correctly from API');
    } else {
      throw new Error(`UPI ID mismatch - Expected: ${testUpiId}, Got: ${restaurant.paymentConfig?.upiId}`);
    }

    // Verify in database directly
    const dbRestaurant = await Restaurant.findById(testRestaurantId);
    if (dbRestaurant.paymentConfig?.upiId === testUpiId) {
      console.log('  ✅ UPI ID verified in database');
    } else {
      throw new Error(`Database UPI ID mismatch - Expected: ${testUpiId}, Got: ${dbRestaurant.paymentConfig?.upiId}`);
    }

  } catch (error) {
    throw new Error(`UPI ID retrieval failed: ${error.response?.data?.message || error.message}`);
  }

  console.log('✅ UPI ID persistence tests completed');
}

/**
 * Test payment configuration retrieval
 */
async function testPaymentConfigRetrieval() {
  console.log('🔄 Testing payment configuration retrieval...');

  try {
    const dbRestaurant = await Restaurant.findById(testRestaurantId);
    
    // Test canAcceptOnlinePayments method
    const canAccept = dbRestaurant.canAcceptOnlinePayments();
    if (canAccept) {
      console.log('  ✅ canAcceptOnlinePayments() returns true');
    } else {
      throw new Error('canAcceptOnlinePayments() should return true when UPI ID is configured');
    }

    // Test getPaymentStatus method
    const paymentStatus = dbRestaurant.getPaymentStatus();
    if (paymentStatus.hasUpiId && paymentStatus.canAcceptOnlinePayments && paymentStatus.upiId) {
      console.log('  ✅ getPaymentStatus() returns correct status');
    } else {
      throw new Error(`getPaymentStatus() returned incorrect status: ${JSON.stringify(paymentStatus)}`);
    }

  } catch (error) {
    throw new Error(`Payment configuration test failed: ${error.message}`);
  }

  console.log('✅ Payment configuration retrieval tests completed');
}

/**
 * Test restaurant payment methods
 */
async function testRestaurantPaymentMethods() {
  console.log('🔄 Testing restaurant payment methods...');

  try {
    // Test with UPI ID configured
    const dbRestaurant = await Restaurant.findById(testRestaurantId);
    
    if (dbRestaurant.canAcceptOnlinePayments()) {
      console.log('  ✅ Restaurant can accept online payments with UPI ID');
    } else {
      throw new Error('Restaurant should be able to accept online payments when UPI ID is configured');
    }

    // Test without UPI ID
    await Restaurant.findByIdAndUpdate(testRestaurantId, {
      $set: { 'paymentConfig.upiId': '' }
    });

    const updatedRestaurant = await Restaurant.findById(testRestaurantId);
    if (!updatedRestaurant.canAcceptOnlinePayments()) {
      console.log('  ✅ Restaurant cannot accept online payments without UPI ID');
    } else {
      throw new Error('Restaurant should not be able to accept online payments when UPI ID is empty');
    }

  } catch (error) {
    throw new Error(`Restaurant payment methods test failed: ${error.message}`);
  }

  console.log('✅ Restaurant payment methods tests completed');
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('🔄 Cleaning up test data...');

  try {
    if (testRestaurantId) {
      await Restaurant.findByIdAndDelete(testRestaurantId);
      console.log('  ✅ Test restaurant deleted');
    }

    await mongoose.connection.close();
    console.log('  ✅ Database connection closed');
  } catch (error) {
    console.warn('⚠️ Cleanup warning:', error.message);
  }

  console.log('✅ Cleanup completed');
}

// Run the test suite
if (require.main === module) {
  runUpiIdSaveTests().catch(console.error);
}

module.exports = { runUpiIdSaveTests };
