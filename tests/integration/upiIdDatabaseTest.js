const mongoose = require('mongoose');
const Restaurant = require('../../src/models/Restaurant');

/**
 * Direct Database UPI ID Test Suite
 * Tests UPI ID validation and persistence directly in MongoDB
 */
async function runUpiIdDatabaseTests() {
  console.log('🧪 Starting UPI ID Database Verification Tests...\n');

  try {
    // Step 1: Connect to database
    await connectToDatabase();

    // Step 2: Test UPI ID validation in schema
    await testSchemaValidation();

    // Step 3: Test UPI ID persistence
    await testDatabasePersistence();

    // Step 4: Test restaurant payment methods
    await testPaymentMethods();

    // Step 5: Test data retrieval
    await testDataRetrieval();

    // Step 6: Cleanup
    await cleanup();

    console.log('✅ All UPI ID database tests completed successfully!');

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
 * Test UPI ID validation in Mongoose schema
 */
async function testSchemaValidation() {
  console.log('🔄 Testing UPI ID schema validation...');

  const validUpiIds = [
    'test@paytm',
    'john.doe@okaxis',
    '9876543210@upi',
    'user123@icici',
    'test-user@hdfc'
  ];

  const invalidUpiIds = [
    'invalid-upi',
    'user@',
    '@paytm',
    'user space@paytm',
    'user@pay tm'
  ];

  // Test valid UPI IDs
  for (const upiId of validUpiIds) {
    console.log(`  Testing valid UPI ID: ${upiId}`);
    
    try {
      const restaurant = new Restaurant({
        name: `Test Restaurant ${Date.now()}`,
        ownerId: new mongoose.Types.ObjectId(), // Required field
        contact: {
          address: {
            street: 'Test Street',
            city: 'Test City',
            state: 'Test State',
            zipCode: '123456',
            country: 'India'
          },
          phone: '9876543210',
          email: `test${Date.now()}@example.com`
        },
        paymentConfig: {
          upiId: upiId,
          paymentModel: 'direct'
        }
      });

      await restaurant.save();
      console.log(`    ✅ Valid UPI ID accepted: ${upiId}`);
      
      // Clean up
      await Restaurant.findByIdAndDelete(restaurant._id);
    } catch (error) {
      throw new Error(`Valid UPI ID test failed for ${upiId}: ${error.message}`);
    }
  }

  // Test invalid UPI IDs
  for (const upiId of invalidUpiIds) {
    console.log(`  Testing invalid UPI ID: ${upiId}`);
    
    try {
      const restaurant = new Restaurant({
        name: `Test Restaurant ${Date.now()}`,
        ownerId: new mongoose.Types.ObjectId(), // Required field
        contact: {
          address: {
            street: 'Test Street',
            city: 'Test City',
            state: 'Test State',
            zipCode: '123456',
            country: 'India'
          },
          phone: '9876543210',
          email: `test${Date.now()}@example.com`
        },
        paymentConfig: {
          upiId: upiId,
          paymentModel: 'direct'
        }
      });

      await restaurant.save();
      
      // If we reach here, the invalid UPI ID was accepted (which is wrong)
      await Restaurant.findByIdAndDelete(restaurant._id);
      throw new Error(`Invalid UPI ID was accepted: ${upiId}`);
    } catch (error) {
      if (error.message.includes('validation') || error.message.includes('Invalid UPI ID format')) {
        console.log(`    ✅ Invalid UPI ID correctly rejected: ${upiId}`);
      } else {
        throw new Error(`Unexpected error for invalid UPI ID ${upiId}: ${error.message}`);
      }
    }
  }

  console.log('✅ UPI ID schema validation tests completed');
}

/**
 * Test UPI ID persistence in database
 */
async function testDatabasePersistence() {
  console.log('🔄 Testing UPI ID database persistence...');

  const testUpiId = 'persistence@test.com';
  let restaurantId = null;

  try {
    // Create restaurant with UPI ID
    const restaurant = new Restaurant({
      name: `Persistence Test Restaurant ${Date.now()}`,
      ownerId: new mongoose.Types.ObjectId(), // Required field
      contact: {
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '123456',
          country: 'India'
        },
        phone: '9876543210',
        email: `persistence${Date.now()}@example.com`
      },
      paymentConfig: {
        upiId: testUpiId,
        paymentModel: 'direct',
        onlinePaymentsEnabled: true
      }
    });

    await restaurant.save();
    restaurantId = restaurant._id;
    console.log('  ✅ Restaurant with UPI ID saved successfully');

    // Retrieve from database and verify
    const retrievedRestaurant = await Restaurant.findById(restaurantId);
    
    if (retrievedRestaurant.paymentConfig?.upiId === testUpiId) {
      console.log('  ✅ UPI ID retrieved correctly from database');
    } else {
      throw new Error(`UPI ID mismatch - Expected: ${testUpiId}, Got: ${retrievedRestaurant.paymentConfig?.upiId}`);
    }

    if (retrievedRestaurant.paymentConfig?.paymentModel === 'direct') {
      console.log('  ✅ Payment model saved correctly');
    } else {
      throw new Error(`Payment model mismatch - Expected: direct, Got: ${retrievedRestaurant.paymentConfig?.paymentModel}`);
    }

    if (retrievedRestaurant.paymentConfig?.onlinePaymentsEnabled === true) {
      console.log('  ✅ Online payments enabled flag saved correctly');
    } else {
      throw new Error(`Online payments enabled mismatch - Expected: true, Got: ${retrievedRestaurant.paymentConfig?.onlinePaymentsEnabled}`);
    }

    // Test update operation
    await Restaurant.findByIdAndUpdate(restaurantId, {
      $set: {
        'paymentConfig.upiId': 'updated@test.com',
        'paymentConfig.paymentModel': 'platform'
      }
    });

    const updatedRestaurant = await Restaurant.findById(restaurantId);
    
    if (updatedRestaurant.paymentConfig?.upiId === 'updated@test.com') {
      console.log('  ✅ UPI ID updated successfully');
    } else {
      throw new Error(`UPI ID update failed - Expected: updated@test.com, Got: ${updatedRestaurant.paymentConfig?.upiId}`);
    }

    // Clean up
    await Restaurant.findByIdAndDelete(restaurantId);

  } catch (error) {
    // Clean up on error
    if (restaurantId) {
      await Restaurant.findByIdAndDelete(restaurantId).catch(() => {});
    }
    throw new Error(`Database persistence test failed: ${error.message}`);
  }

  console.log('✅ UPI ID database persistence tests completed');
}

/**
 * Test restaurant payment methods
 */
async function testPaymentMethods() {
  console.log('🔄 Testing restaurant payment methods...');

  let restaurantId = null;

  try {
    // Create restaurant with UPI ID
    const restaurant = new Restaurant({
      name: `Payment Methods Test Restaurant ${Date.now()}`,
      ownerId: new mongoose.Types.ObjectId(), // Required field
      contact: {
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '123456',
          country: 'India'
        },
        phone: '9876543210',
        email: `payment${Date.now()}@example.com`
      },
      paymentConfig: {
        upiId: 'payment@test.com',
        paymentModel: 'direct'
      }
    });

    await restaurant.save();
    restaurantId = restaurant._id;

    // Test canAcceptOnlinePayments method
    if (restaurant.canAcceptOnlinePayments()) {
      console.log('  ✅ canAcceptOnlinePayments() returns true with UPI ID');
    } else {
      throw new Error('canAcceptOnlinePayments() should return true when UPI ID is configured');
    }

    // Test getPaymentStatus method
    const paymentStatus = restaurant.getPaymentStatus();
    
    if (paymentStatus.hasUpiId && paymentStatus.canAcceptOnlinePayments && paymentStatus.upiId === 'payment@test.com') {
      console.log('  ✅ getPaymentStatus() returns correct status with UPI ID');
    } else {
      throw new Error(`getPaymentStatus() returned incorrect status: ${JSON.stringify(paymentStatus)}`);
    }

    // Test without UPI ID
    restaurant.paymentConfig.upiId = '';
    await restaurant.save();

    if (!restaurant.canAcceptOnlinePayments()) {
      console.log('  ✅ canAcceptOnlinePayments() returns false without UPI ID');
    } else {
      throw new Error('canAcceptOnlinePayments() should return false when UPI ID is empty');
    }

    const emptyPaymentStatus = restaurant.getPaymentStatus();
    
    if (!emptyPaymentStatus.hasUpiId && !emptyPaymentStatus.canAcceptOnlinePayments && !emptyPaymentStatus.upiId) {
      console.log('  ✅ getPaymentStatus() returns correct status without UPI ID');
    } else {
      throw new Error(`getPaymentStatus() returned incorrect status for empty UPI ID: ${JSON.stringify(emptyPaymentStatus)}`);
    }

    // Clean up
    await Restaurant.findByIdAndDelete(restaurantId);

  } catch (error) {
    // Clean up on error
    if (restaurantId) {
      await Restaurant.findByIdAndDelete(restaurantId).catch(() => {});
    }
    throw new Error(`Payment methods test failed: ${error.message}`);
  }

  console.log('✅ Restaurant payment methods tests completed');
}

/**
 * Test data retrieval scenarios
 */
async function testDataRetrieval() {
  console.log('🔄 Testing data retrieval scenarios...');

  let restaurantId = null;

  try {
    // Create restaurant with complete payment config
    const restaurant = new Restaurant({
      name: `Data Retrieval Test Restaurant ${Date.now()}`,
      ownerId: new mongoose.Types.ObjectId(), // Required field
      contact: {
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '123456',
          country: 'India'
        },
        phone: '9876543210',
        email: `retrieval${Date.now()}@example.com`
      },
      paymentConfig: {
        upiId: 'retrieval@test.com',
        paymentModel: 'direct',
        onlinePaymentsEnabled: true
      }
    });

    await restaurant.save();
    restaurantId = restaurant._id;

    // Test findById with payment config
    const foundRestaurant = await Restaurant.findById(restaurantId);
    
    if (foundRestaurant && foundRestaurant.paymentConfig?.upiId === 'retrieval@test.com') {
      console.log('  ✅ findById retrieves payment config correctly');
    } else {
      throw new Error('findById failed to retrieve payment config');
    }

    // Test query with payment config filter
    const restaurantsWithUpi = await Restaurant.find({
      'paymentConfig.upiId': { $exists: true, $ne: '' }
    });

    if (restaurantsWithUpi.length > 0) {
      console.log('  ✅ Query for restaurants with UPI ID works correctly');
    } else {
      throw new Error('Query for restaurants with UPI ID failed');
    }

    // Test aggregation pipeline
    const paymentStats = await Restaurant.aggregate([
      {
        $match: {
          'paymentConfig.upiId': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$paymentConfig.paymentModel',
          count: { $sum: 1 }
        }
      }
    ]);

    if (Array.isArray(paymentStats)) {
      console.log('  ✅ Aggregation pipeline with payment config works correctly');
    } else {
      throw new Error('Aggregation pipeline failed');
    }

    // Clean up
    await Restaurant.findByIdAndDelete(restaurantId);

  } catch (error) {
    // Clean up on error
    if (restaurantId) {
      await Restaurant.findByIdAndDelete(restaurantId).catch(() => {});
    }
    throw new Error(`Data retrieval test failed: ${error.message}`);
  }

  console.log('✅ Data retrieval tests completed');
}

/**
 * Cleanup test data and close connections
 */
async function cleanup() {
  console.log('🔄 Cleaning up...');

  try {
    // Clean up any remaining test restaurants
    await Restaurant.deleteMany({
      name: { $regex: /Test Restaurant|Persistence Test|Payment Methods Test|Data Retrieval Test/ }
    });

    await mongoose.connection.close();
    console.log('  ✅ Database connection closed');
  } catch (error) {
    console.warn('⚠️ Cleanup warning:', error.message);
  }

  console.log('✅ Cleanup completed');
}

// Run the test suite
if (require.main === module) {
  runUpiIdDatabaseTests().catch(console.error);
}

module.exports = { runUpiIdDatabaseTests };
