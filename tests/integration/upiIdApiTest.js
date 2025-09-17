const axios = require('axios');
const mongoose = require('mongoose');
const Restaurant = require('../../src/models/Restaurant');
const User = require('../../src/models/User');

// Test configuration
const BASE_URL = 'http://localhost:5000/api/v1';

/**
 * API Test for UPI ID functionality
 */
async function runUpiIdApiTests() {
  console.log('🧪 Starting UPI ID API Verification Tests...\n');

  let testUser = null;
  let testRestaurant = null;
  let authToken = null;

  try {
    // Step 1: Connect to database
    await connectToDatabase();

    // Step 2: Create test user and restaurant
    await createTestUserAndRestaurant();

    // Step 3: Authenticate as restaurant owner
    await authenticateAsOwner();

    // Step 4: Test UPI ID update via API
    await testUpiIdUpdateApi();

    // Step 5: Test UPI ID retrieval via API
    await testUpiIdRetrievalApi();

    // Step 6: Test validation via API
    await testUpiIdValidationApi();

    // Step 7: Cleanup
    await cleanup();

    console.log('✅ All UPI ID API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    await cleanup();
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
 * Create test user and restaurant
 */
async function createTestUserAndRestaurant() {
  console.log('🔄 Creating test user and restaurant...');

  try {
    // Create test user
    testUser = new User({
      username: `testowner${Date.now()}`,
      email: `testowner${Date.now()}@example.com`,
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uDfG', // 'password123'
      role: 'restaurant_owner',
      isVerified: true
    });

    await testUser.save();
    console.log('  ✅ Test user created');

    // Create test restaurant
    testRestaurant = new Restaurant({
      name: `API Test Restaurant ${Date.now()}`,
      ownerId: testUser._id,
      contact: {
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '123456',
          country: 'India'
        },
        phone: '9876543210',
        email: `apitest${Date.now()}@example.com`
      }
    });

    await testRestaurant.save();
    console.log('  ✅ Test restaurant created');

  } catch (error) {
    throw new Error(`Test setup failed: ${error.message}`);
  }
}

/**
 * Authenticate as restaurant owner
 */
async function authenticateAsOwner() {
  console.log('🔄 Authenticating as restaurant owner...');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: testUser.username,
      password: 'password123'
    });

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ Owner authentication successful');
    } else {
      throw new Error('Authentication failed - no token received');
    }
  } catch (error) {
    throw new Error(`Owner authentication failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Test UPI ID update via API
 */
async function testUpiIdUpdateApi() {
  console.log('🔄 Testing UPI ID update via API...');

  const testUpiId = 'apitest@paytm';

  try {
    const response = await axios.put(`${BASE_URL}/restaurants/${testRestaurant._id}`, {
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

    if (response.data.success) {
      console.log('  ✅ UPI ID updated successfully via API');
      
      // Verify in response
      if (response.data.data.paymentConfig?.upiId === testUpiId) {
        console.log('  ✅ UPI ID returned correctly in API response');
      } else {
        throw new Error(`UPI ID not returned correctly in response: ${response.data.data.paymentConfig?.upiId}`);
      }
    } else {
      throw new Error('API update failed');
    }
  } catch (error) {
    throw new Error(`UPI ID update API test failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Test UPI ID retrieval via API
 */
async function testUpiIdRetrievalApi() {
  console.log('🔄 Testing UPI ID retrieval via API...');

  try {
    const response = await axios.get(`${BASE_URL}/restaurants/${testRestaurant._id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      const restaurant = response.data.data;
      
      if (restaurant.paymentConfig?.upiId === 'apitest@paytm') {
        console.log('  ✅ UPI ID retrieved correctly via API');
      } else {
        throw new Error(`UPI ID retrieval mismatch - Expected: apitest@paytm, Got: ${restaurant.paymentConfig?.upiId}`);
      }

      if (restaurant.paymentConfig?.paymentModel === 'direct') {
        console.log('  ✅ Payment model retrieved correctly via API');
      } else {
        throw new Error(`Payment model mismatch - Expected: direct, Got: ${restaurant.paymentConfig?.paymentModel}`);
      }

      if (restaurant.paymentConfig?.onlinePaymentsEnabled === true) {
        console.log('  ✅ Online payments enabled flag retrieved correctly via API');
      } else {
        throw new Error(`Online payments enabled mismatch - Expected: true, Got: ${restaurant.paymentConfig?.onlinePaymentsEnabled}`);
      }
    } else {
      throw new Error('API retrieval failed');
    }
  } catch (error) {
    throw new Error(`UPI ID retrieval API test failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Test UPI ID validation via API
 */
async function testUpiIdValidationApi() {
  console.log('🔄 Testing UPI ID validation via API...');

  // Test invalid UPI ID
  try {
    const response = await axios.put(`${BASE_URL}/restaurants/${testRestaurant._id}`, {
      paymentConfig: {
        upiId: 'invalid-upi-format',
        paymentModel: 'direct'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // If we reach here, the invalid UPI ID was accepted (which is wrong)
    throw new Error('Invalid UPI ID was accepted by API');
  } catch (error) {
    if (error.response?.status === 400 || error.message.includes('validation')) {
      console.log('  ✅ Invalid UPI ID correctly rejected by API');
    } else {
      throw new Error(`Unexpected error for invalid UPI ID: ${error.message}`);
    }
  }

  // Test valid UPI ID
  try {
    const response = await axios.put(`${BASE_URL}/restaurants/${testRestaurant._id}`, {
      paymentConfig: {
        upiId: 'valid@test.com',
        paymentModel: 'platform'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('  ✅ Valid UPI ID accepted by API');
    } else {
      throw new Error('Valid UPI ID rejected by API');
    }
  } catch (error) {
    throw new Error(`Valid UPI ID test failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('🔄 Cleaning up test data...');

  try {
    if (testRestaurant) {
      await Restaurant.findByIdAndDelete(testRestaurant._id);
      console.log('  ✅ Test restaurant deleted');
    }

    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
      console.log('  ✅ Test user deleted');
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
  runUpiIdApiTests().catch(console.error);
}

module.exports = { runUpiIdApiTests };
