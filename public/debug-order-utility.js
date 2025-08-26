/**
 * Debug utility for testing order creation and tracking
 * Use this in browser console to create test orders and debug tracking issues
 */

window.TableServeDebug = {
  
  // Create a test order for debugging
  createTestOrder: (restaurantId = '1756106072040', tableId = '1', userId = '1756106072040') => {
    const testOrder = {
      orderId: `TS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      restaurantId,
      tableId,
      userId,
      items: [
        {
          id: '1',
          name: 'Test Burger',
          price: 250,
          quantity: 2,
          image: '/placeholder-food.jpg'
        },
        {
          id: '2', 
          name: 'Test Fries',
          price: 100,
          quantity: 1,
          image: '/placeholder-food.jpg'
        }
      ],
      subtotal: 600,
      taxes: 60,
      total: 660,
      grandTotal: 660,
      paymentMethod: 'digital',
      status: 'preparing',
      createdAt: new Date().toISOString(),
      estimatedTime: 25,
      restaurantName: 'Test Restaurant',
      tableNumber: tableId
    };

    // Store in restaurant orders
    const orderStorageKey = `restaurant_orders_${restaurantId}`;
    const existingOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
    existingOrders.unshift(testOrder);
    localStorage.setItem(orderStorageKey, JSON.stringify(existingOrders));

    // Store recent order ID
    const recentOrderKey = `recent_order_${restaurantId}_${tableId}_${userId}`;
    localStorage.setItem(recentOrderKey, testOrder.orderId);

    console.log('✅ Test order created:', {
      orderId: testOrder.orderId,
      storageKey: orderStorageKey,
      recentOrderKey,
      testOrder
    });

    return testOrder;
  },

  // Check what orders exist for a restaurant/table/user
  checkOrders: (restaurantId = '1756106072040', tableId = '1', userId = '1756106072040') => {
    console.log('=== Order Check Debug ===');
    
    const recentOrderKey = `recent_order_${restaurantId}_${tableId}_${userId}`;
    const recentOrderId = localStorage.getItem(recentOrderKey);
    
    const orderStorageKey = `restaurant_orders_${restaurantId}`;
    const allOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
    
    const tableOrders = allOrders.filter(order => 
      (order.tableId === tableId || order.tableNumber === tableId) &&
      (order.userId === userId || !order.userId)
    );

    console.log('Recent order lookup:', {
      key: recentOrderKey,
      value: recentOrderId
    });

    console.log('All orders for restaurant:', {
      key: orderStorageKey,
      count: allOrders.length,
      orders: allOrders.map(o => ({
        orderId: o.orderId,
        tableId: o.tableId,
        userId: o.userId,
        status: o.status
      }))
    });

    console.log('Filtered table orders:', {
      count: tableOrders.length,
      orders: tableOrders.map(o => ({
        orderId: o.orderId,
        tableId: o.tableId,
        userId: o.userId,
        status: o.status
      }))
    });

    console.log('=== End Order Check ===');
    return { recentOrderId, allOrders, tableOrders };
  },

  // Clear all order data
  clearOrders: (restaurantId = '1756106072040', tableId = '1', userId = '1756106072040') => {
    const orderStorageKey = `restaurant_orders_${restaurantId}`;
    const recentOrderKey = `recent_order_${restaurantId}_${tableId}_${userId}`;
    
    localStorage.removeItem(orderStorageKey);
    localStorage.removeItem(recentOrderKey);
    
    console.log('✅ Cleared order data:', {
      orderStorageKey,
      recentOrderKey
    });
  },

  // Test the complete flow
  testCompleteFlow: (restaurantId = '1756106072040', tableId = '1', userId = '1756106072040') => {
    console.log('🧪 Testing complete order flow...');
    
    // 1. Clear existing data
    this.clearOrders(restaurantId, tableId, userId);
    
    // 2. Create test order
    const testOrder = this.createTestOrder(restaurantId, tableId, userId);
    
    // 3. Check orders
    this.checkOrders(restaurantId, tableId, userId);
    
    // 4. Generate tracking URL
    const trackingUrl = `/tableserve/restaurant/${restaurantId}/table/${tableId}/user/${userId}/tracking`;
    
    console.log('🔗 Navigate to tracking page:', trackingUrl);
    console.log('✅ Complete flow test finished');
    
    return {
      testOrder,
      trackingUrl
    };
  }
};

console.log('🛠️ TableServe Debug utility loaded. Available commands:');
console.log('- TableServeDebug.createTestOrder() - Create a test order');
console.log('- TableServeDebug.checkOrders() - Check existing orders');
console.log('- TableServeDebug.clearOrders() - Clear all order data'); 
console.log('- TableServeDebug.testCompleteFlow() - Test the complete flow');