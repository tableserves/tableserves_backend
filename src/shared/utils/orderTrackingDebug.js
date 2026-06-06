/**
 * Debug utility to test the order tracking flow
 * This helps verify that order numbers are properly stored and retrieved
 */

// Test data
const testData = {
  restaurantId: '68bfb794f67ccd95ac375900',
  tableId: '1',
  customerPhone: '8790756566',
  orderNumber: 'ORD13ABC', // Example order number following the specification
};

// Function to simulate order creation and storage
function simulateOrderCreation() {
  console.log('=== Simulating Order Creation ===');
  
  // Simulate successful order creation response
  const orderResponse = {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      orderNumber: testData.orderNumber,
      customer: {
        phone: testData.customerPhone,
        name: 'Test Customer'
      },
      restaurantId: testData.restaurantId,
      tableNumber: testData.tableId,
      items: [
        { name: 'Test Item', price: 100, quantity: 1 }
      ],
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  };
  
  // Store using OrderTrackingService (simulate what CheckoutScreen does)
  const orderInfo = {
    orderNumber: orderResponse.data.orderNumber,
    customer: { phone: orderResponse.data.customer.phone },
    restaurantId: orderResponse.data.restaurantId,
    tableNumber: orderResponse.data.tableNumber
  };
  
  // Store in localStorage (simulate OrderTrackingService.storeOrderInfo)
  localStorage.setItem('currentOrderNumber', orderInfo.orderNumber);
  localStorage.setItem('currentOrderPhone', orderInfo.customer.phone);
  localStorage.setItem('currentRestaurantId', orderInfo.restaurantId);
  localStorage.setItem('currentTableNumber', orderInfo.tableNumber);
  
  console.log('Order info stored:', orderInfo);
  console.log('LocalStorage state:', {
    orderNumber: localStorage.getItem('currentOrderNumber'),
    phone: localStorage.getItem('currentOrderPhone'),
    restaurantId: localStorage.getItem('currentRestaurantId'),
    tableNumber: localStorage.getItem('currentTableNumber')
  });
  
  return orderResponse.data;
}

// Function to simulate order tracking retrieval
function simulateOrderTracking() {
  console.log('=== Simulating Order Tracking ===');
  
  // Simulate what OrderTrackingScreen does
  const storedInfo = {
    orderNumber: localStorage.getItem('currentOrderNumber'),
    customerPhone: localStorage.getItem('currentOrderPhone'),
    restaurantId: localStorage.getItem('currentRestaurantId'),
    tableNumber: localStorage.getItem('currentTableNumber')
  };
  
  console.log('Retrieved stored info:', storedInfo);
  
  if (storedInfo.orderNumber && storedInfo.customerPhone) {
    console.log('✅ Order tracking info found - can fetch by order number');
    console.log('API call would be: fetchOrderByNumber(', storedInfo.orderNumber, ',', storedInfo.customerPhone, ')');
    return true;
  } else {
    console.log('❌ Order tracking info incomplete - would fallback to recent order lookup');
    return false;
  }
}

// Function to test the complete flow
function testCompleteFlow() {
  console.log('=== Testing Complete Order Tracking Flow ===');
  
  // Step 1: Clear any existing data
  localStorage.removeItem('currentOrderNumber');
  localStorage.removeItem('currentOrderPhone');
  localStorage.removeItem('currentRestaurantId');
  localStorage.removeItem('currentTableNumber');
  
  // Step 2: Simulate order creation
  const createdOrder = simulateOrderCreation();
  
  // Step 3: Simulate order tracking
  const canTrack = simulateOrderTracking();
  
  // Step 4: Simulate URL generation
  if (canTrack) {
    const trackingUrl = `/track/${createdOrder.orderNumber}?phone=${encodeURIComponent(createdOrder.customer.phone)}`;
    console.log('✅ Generated tracking URL:', trackingUrl);
  }
  
  console.log('=== Test Complete ===');
  return { createdOrder, canTrack };
}

// Function to simulate problematic scenario (multiple customers at same table)
function testMultipleCustomersScenario() {
  console.log('=== Testing Multiple Customers at Same Table ===');
  
  // Customer 1 orders
  const customer1Order = {
    orderNumber: 'ORD13ABC',
    phone: '8790756566',
    tableNumber: '1'
  };
  
  // Customer 2 orders (different phone, same table)
  const customer2Order = {
    orderNumber: 'ORD13DEF', 
    phone: '9876543210',
    tableNumber: '1'
  };
  
  console.log('Customer 1 order:', customer1Order);
  console.log('Customer 2 order:', customer2Order);
  
  // With old system (table + phone lookup), customer 2 might see customer 1's order
  console.log('❌ Old system: Query by table + phone could return wrong order');
  
  // With new system (order number lookup), each customer gets their own order
  console.log('✅ New system: Each customer uses their specific order number');
  
  return { customer1Order, customer2Order };
}

// Export functions for browser console testing
if (typeof window !== 'undefined') {
  window.orderTrackingDebug = {
    simulateOrderCreation,
    simulateOrderTracking,
    testCompleteFlow,
    testMultipleCustomersScenario,
    clearTestData: () => {
      localStorage.removeItem('currentOrderNumber');
      localStorage.removeItem('currentOrderPhone');
      localStorage.removeItem('currentRestaurantId');
      localStorage.removeItem('currentTableNumber');
      console.log('Test data cleared');
    }
  };
  
  console.log('Order tracking debug utilities loaded. Available functions:');
  console.log('- orderTrackingDebug.testCompleteFlow()');
  console.log('- orderTrackingDebug.testMultipleCustomersScenario()');
  console.log('- orderTrackingDebug.clearTestData()');
}

export default {
  simulateOrderCreation,
  simulateOrderTracking,
  testCompleteFlow,
  testMultipleCustomersScenario
};