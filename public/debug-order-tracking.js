// Debug script to test order tracking issue
// This simulates the order creation and retrieval process

// Test data
const testOrderData = {
  orderId: `TS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
  restaurantId: 'test-restaurant-123',
  userId: 'test-user-456',
  tableId: 'test-table-789',
  items: [
    { id: '1', name: 'Test Item 1', price: 150, quantity: 2 },
    { id: '2', name: 'Test Item 2', price: 200, quantity: 1 }
  ],
  subtotal: 500,
  taxes: 50,
  total: 550,
  status: 'preparing',
  createdAt: new Date().toISOString(),
  estimatedTime: 25
};

console.log('=== Order Tracking Debug Test ===');
console.log('Test Order Data:', testOrderData);

// 1. Simulate order creation - store order in restaurant orders
const restaurantOrders = [];
restaurantOrders.unshift(testOrderData);
localStorage.setItem(`restaurant_orders_${testOrderData.restaurantId}`, JSON.stringify(restaurantOrders));

// 2. Store recent order ID (as CheckoutScreen does)
const recentOrderKey = `recent_order_${testOrderData.restaurantId}_${testOrderData.tableId}_${testOrderData.userId}`;
localStorage.setItem(recentOrderKey, testOrderData.orderId);

console.log('Stored order with key:', recentOrderKey);
console.log('Stored order ID:', testOrderData.orderId);

// 3. Test retrieval (as OrderTrackingScreen does)
const retrievedOrderId = localStorage.getItem(recentOrderKey);
console.log('Retrieved order ID:', retrievedOrderId);

// 4. Test getOrderById simulation
function testGetOrderById(orderId) {
  console.log('Searching for order with ID:', orderId);
  
  // Search in restaurant orders
  const restaurants = [{ id: testOrderData.restaurantId, name: 'Test Restaurant' }];
  
  for (const restaurant of restaurants) {
    const orders = JSON.parse(localStorage.getItem(`restaurant_orders_${restaurant.id}`) || '[]');
    console.log('Found orders in restaurant storage:', orders.length);
    
    const order = orders.find(o => {
      console.log('Checking order:', { orderId: o.orderId, id: o.id });
      return o.orderId === orderId || o.id === orderId;
    });
    
    if (order) {
      console.log('Order found!', order);
      return {
        ...order,
        entityType: 'restaurant',
        entityId: restaurant.id,
        entityName: restaurant.name
      };
    }
  }
  
  console.log('Order not found');
  return null;
}

// 5. Test the search
const foundOrder = testGetOrderById(retrievedOrderId);
console.log('Final result:', foundOrder);

// 6. Clean up test data
localStorage.removeItem(`restaurant_orders_${testOrderData.restaurantId}`);
localStorage.removeItem(recentOrderKey);

console.log('=== Debug Test Complete ===');