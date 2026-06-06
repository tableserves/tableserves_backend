// Order Processing Service - Handles data distribution to different user types

class OrderProcessingService {

  // Process order and distribute data according to restaurant/zone type
  static processOrder(orderData) {
    const {
      orderId,
      restaurantId,
      restaurantType,
      tableId,
      items,
      vendorBreakdown,
      paymentModel,
      grandTotal,
      timestamp
    } = orderData;

    if (restaurantType === 'single') {
      return this.processSingleRestaurantOrder(orderData);
    } else if (restaurantType === 'zone') {
      return this.processZoneOrder(orderData);
    }
  }

  // Process restaurant order (called by ordersSlice)
  static processRestaurantOrder(orderData) {
    // Use the order ID from orderData if provided, otherwise generate one
    const orderId = orderData.orderId || `RS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = orderData.createdAt || new Date().toISOString();
    
    const {
      restaurantId,
      tableId,
      items,
      subtotal,
      taxes,
      total,
      paymentMethod,
      specialInstructions,
      sessionId,
      userId
    } = orderData;

    // Create restaurant order record
    const restaurantOrder = {
      orderId,
      restaurantId,
      tableId,
      sessionId,
      userId,
      items: items.map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
        subtotal: item.price * item.quantity
      })),
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: subtotal || 0,
      taxes: taxes || 0,
      grandTotal: total || subtotal || 0,
      paymentMethod,
      paymentStatus: 'pending',
      specialInstructions,
      status: orderData.status || 'preparing', // Use status from orderData or default to 'preparing'
      statusHistory: [{
        status: orderData.status || 'preparing',
        timestamp,
        updatedBy: 'customer'
      }],
      estimatedTime: orderData.estimatedTime || 25,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store order for restaurant owner dashboard
    this.storeRestaurantOrder(restaurantId, restaurantOrder);

    // Store order analytics data
    this.updateRestaurantAnalytics(restaurantId, {
      orderId,
      revenue: restaurantOrder.grandTotal,
      itemCount: restaurantOrder.totalItems,
      timestamp
    });

    return {
      success: true,
      orderId,
      order: restaurantOrder, // Return the order object for ordersSlice
      restaurantOrder, // Keep this for backwards compatibility
      message: 'Order sent to restaurant'
    };
  }

  // Handle Single Restaurant Mode
  static processSingleRestaurantOrder(orderData) {
    const {
      orderId,
      restaurantId,
      tableId,
      items,
      grandTotal,
      paymentMethod,
      specialInstructions,
      timestamp,
      sessionId
    } = orderData;

    // Create single order record for restaurant owner
    const restaurantOrder = {
      orderId,
      restaurantId,
      tableId,
      sessionId,
      items: items.map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
        subtotal: item.price * item.quantity
      })),
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      grandTotal,
      paymentMethod,
      paymentStatus: 'pending',
      specialInstructions,
      status: orderData.status || 'preparing', // Use status from orderData or default to 'preparing'
      statusHistory: [{
        status: orderData.status || 'preparing',
        timestamp,
        updatedBy: 'customer'
      }],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store order for restaurant owner dashboard
    this.storeRestaurantOrder(restaurantId, restaurantOrder);

    // Store order analytics data
    this.updateRestaurantAnalytics(restaurantId, {
      orderId,
      revenue: grandTotal,
      itemCount: restaurantOrder.totalItems,
      timestamp
    });

    return {
      success: true,
      orderId,
      restaurantOrder,
      message: 'Order sent to restaurant'
    };
  }

  // Handle Food Street (Multi-Vendor Zone) Mode
  static processZoneOrder(orderData) {
    const {
      zoneId,
      tableId,
      items, // This should be the items directly, not vendorBreakdown
      grandTotal,
      paymentMethod,
      specialInstructions,
      sessionId
    } = orderData;
    
    // Use the order ID from orderData if provided, otherwise generate one
    const orderId = orderData.orderId || `ZN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = orderData.createdAt || new Date().toISOString();

    // Create parent order for zone admin
    const zoneOrder = {
      orderId,
      zoneId,
      tableId,
      sessionId,
      // For zone orders, we don't have vendorBreakdown in the same way
      // We'll group items by shop on the backend
      itemCount: items.length,
      grandTotal,
      paymentMethod,
      specialInstructions,
      status: orderData.status || 'confirmed', // Default to 'confirmed' for zone orders
      statusHistory: orderData.statusHistory || [{
        status: orderData.status || 'confirmed',
        timestamp,
        updatedBy: 'customer'
      }],
      createdAt: timestamp,
      updatedAt: new Date().toISOString()
    };

    // Store zone order for zone admin dashboard
    this.storeZoneOrder(zoneId, zoneOrder);

    // For zone orders, we don't create individual vendor orders here
    // That's handled by the backend ZoneOrderSplittingService

    // Update zone analytics
    this.updateZoneAnalytics(zoneId, {
      orderId,
      revenue: grandTotal,
      itemCount: items.length,
      timestamp
    });

    return {
      success: true,
      orderId,
      zoneOrder,
      message: 'Zone order processed successfully'
    };
  }

  // Storage methods for different user types
  static storeRestaurantOrder(restaurantId, order) {
    const existingOrders = JSON.parse(localStorage.getItem(`restaurant_orders_${restaurantId}`) || '[]');
    existingOrders.unshift(order); // Add to beginning for latest first
    localStorage.setItem(`restaurant_orders_${restaurantId}`, JSON.stringify(existingOrders));

    // Also store in real-time orders for live dashboard
    const liveOrders = JSON.parse(localStorage.getItem(`live_orders_${restaurantId}`) || '[]');
    liveOrders.unshift(order);
    localStorage.setItem(`live_orders_${restaurantId}`, JSON.stringify(liveOrders));
  }

  static storeZoneOrder(zoneId, order) {
    const existingOrders = JSON.parse(localStorage.getItem(`zone_orders_${zoneId}`) || '[]');
    existingOrders.unshift(order);
    localStorage.setItem(`zone_orders_${zoneId}`, JSON.stringify(existingOrders));

    // Store in live orders for zone admin
    const liveOrders = JSON.parse(localStorage.getItem(`zone_live_orders_${zoneId}`) || '[]');
    liveOrders.unshift(order);
    localStorage.setItem(`zone_live_orders_${zoneId}`, JSON.stringify(liveOrders));
  }

  static storeVendorOrder(vendorId, order) {
    const existingOrders = JSON.parse(localStorage.getItem(`vendor_orders_${vendorId}`) || '[]');
    existingOrders.unshift(order);
    localStorage.setItem(`vendor_orders_${vendorId}`, JSON.stringify(existingOrders));

    // Store in live orders for vendor
    const liveOrders = JSON.parse(localStorage.getItem(`vendor_live_orders_${vendorId}`) || '[]');
    liveOrders.unshift(order);
    localStorage.setItem(`vendor_live_orders_${vendorId}`, JSON.stringify(liveOrders));
  }

  // Analytics update methods
  static updateRestaurantAnalytics(restaurantId, data) {
    const analytics = JSON.parse(localStorage.getItem(`restaurant_analytics_${restaurantId}`) || '{}');

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    if (!analytics[today]) {
      analytics[today] = { orders: 0, revenue: 0, items: 0 };
    }

    analytics[today].orders += 1;
    analytics[today].revenue += data.revenue;
    analytics[today].items += data.itemCount;

    localStorage.setItem(`restaurant_analytics_${restaurantId}`, JSON.stringify(analytics));

    // Update main restaurant data for Super Admin dashboard
    try {
      const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
      const restaurantIndex = restaurants.findIndex(r => r.id == restaurantId);

      if (restaurantIndex !== -1) {
        // Get current values or initialize
        const currentRevenue = parseInt(restaurants[restaurantIndex].revenue?.replace(/[₹,]/g, '') || '0');
        const currentOrders = restaurants[restaurantIndex].orders || 0;
        const currentTodayOrders = restaurants[restaurantIndex].todayOrders || 0;
        const currentTodayRevenue = parseInt(restaurants[restaurantIndex].todayRevenue?.replace(/[₹,]/g, '') || '0');

        // Update restaurant data with new values
        restaurants[restaurantIndex] = {
          ...restaurants[restaurantIndex],
          status: 'active', // Set to active when processing orders
          orders: currentOrders + 1,
          revenue: `₹${(currentRevenue + data.revenue).toLocaleString()}`,
          todayOrders: currentTodayOrders + 1,
          todayRevenue: `₹${(currentTodayRevenue + data.revenue).toLocaleString()}`,
          lastOrderAt: new Date().toISOString(),
          performance: Math.min(100, Math.floor((currentOrders + 1) / 10) * 10), // Simple performance metric
          updatedAt: new Date().toISOString()
        };

        localStorage.setItem('tableserve_restaurants', JSON.stringify(restaurants));
        console.log('Updated main restaurant data with order analytics');
      }
    } catch (error) {
      console.error('Error updating main restaurant data with analytics:', error);
    }
  }

  static updateZoneAnalytics(zoneId, data) {
    const analytics = JSON.parse(localStorage.getItem(`zone_analytics_${zoneId}`) || '{}');

    const today = new Date().toISOString().split('T')[0];
    if (!analytics[today]) {
      analytics[today] = { orders: 0, revenue: 0, vendors: 0, items: 0 };
    }

    analytics[today].orders += 1;
    analytics[today].revenue += data.revenue;
    analytics[today].vendors += data.vendorCount;
    analytics[today].items += data.totalItems;

    localStorage.setItem(`zone_analytics_${zoneId}`, JSON.stringify(analytics));

    // Update main zone data for Super Admin dashboard
    try {
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
      const zoneIndex = zones.findIndex(z => z.id == zoneId);

      if (zoneIndex !== -1) {
        // Get current values or initialize
        const currentRevenue = parseInt(zones[zoneIndex].totalRevenue?.replace(/[₹,]/g, '') || '0');
        const currentOrders = zones[zoneIndex].totalOrders || 0;
        const currentTodayOrders = zones[zoneIndex].todayOrders || 0;
        const currentTodayRevenue = parseInt(zones[zoneIndex].todayRevenue?.replace(/[₹,]/g, '') || '0');

        // Update zone data with new values
        zones[zoneIndex] = {
          ...zones[zoneIndex],
          status: 'active', // Set to active when processing orders
          totalOrders: currentOrders + 1,
          totalRevenue: `₹${(currentRevenue + data.revenue).toLocaleString()}`,
          todayOrders: currentTodayOrders + 1,
          todayRevenue: `₹${(currentTodayRevenue + data.revenue).toLocaleString()}`,
          lastOrderAt: new Date().toISOString(),
          performance: Math.min(100, Math.floor((currentOrders + 1) / 10) * 10), // Simple performance metric
          updatedAt: new Date().toISOString()
        };

        localStorage.setItem('tableserve_zones', JSON.stringify(zones));
        console.log('Updated main zone data with order analytics');
      }
    } catch (error) {
      console.error('Error updating main zone data with analytics:', error);
    }
  }

  static updateVendorAnalytics(vendorId, data) {
    const analytics = JSON.parse(localStorage.getItem(`vendor_analytics_${vendorId}`) || '{}');

    const today = new Date().toISOString().split('T')[0];
    if (!analytics[today]) {
      analytics[today] = { orders: 0, revenue: 0, items: 0 };
    }

    analytics[today].orders += 1;
    analytics[today].revenue += data.revenue;
    analytics[today].items += data.itemCount;

    localStorage.setItem(`vendor_analytics_${vendorId}`, JSON.stringify(analytics));

    // Update vendor data in zone vendors
    try {
      // First, find which zone this vendor belongs to
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
      let vendorZoneId = null;

      // Look through all zones to find the vendor
      for (const zone of zones) {
        const zoneVendors = JSON.parse(localStorage.getItem(`tableserve_zone_vendors_${zone.id}`) || '[]');
        const vendorIndex = zoneVendors.findIndex(v => v.id == vendorId);

        if (vendorIndex !== -1) {
          // Found the vendor in this zone
          vendorZoneId = zone.id;

          // Get current values or initialize
          const currentRevenue = parseInt(zoneVendors[vendorIndex].monthlyRevenue || '0');
          const currentOrders = zoneVendors[vendorIndex].totalOrders || 0;

          // Update vendor data
          zoneVendors[vendorIndex] = {
            ...zoneVendors[vendorIndex],
            status: 'active', // Set to active when processing orders
            totalOrders: currentOrders + 1,
            monthlyRevenue: currentRevenue + data.revenue,
            lastOrderAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          localStorage.setItem(`tableserve_zone_vendors_${zone.id}`, JSON.stringify(zoneVendors));
          console.log('Updated vendor data with order analytics');
          break;
        }
      }
    } catch (error) {
      console.error('Error updating vendor data with analytics:', error);
    }
  }

  // Order status update methods
  static updateOrderStatus(orderId, newStatus, updatedBy, userType, userId) {
    if (userType === 'restaurant') {
      this.updateRestaurantOrderStatus(userId, orderId, newStatus, updatedBy);
    } else if (userType === 'zone') {
      this.updateZoneOrderStatus(userId, orderId, newStatus, updatedBy);
    } else if (userType === 'vendor') {
      this.updateVendorOrderStatus(userId, orderId, newStatus, updatedBy);
    }
  }

  static updateRestaurantOrderStatus(restaurantId, orderId, newStatus, updatedBy) {
    const orders = JSON.parse(localStorage.getItem(`restaurant_orders_${restaurantId}`) || '[]');
    const liveOrders = JSON.parse(localStorage.getItem(`live_orders_${restaurantId}`) || '[]');

    const updateOrder = (orderList) => {
      return orderList.map(order => {
        if (order.orderId === orderId) {
          return {
            ...order,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            statusHistory: [
              ...order.statusHistory,
              {
                status: newStatus,
                timestamp: new Date().toISOString(),
                updatedBy
              }
            ]
          };
        }
        return order;
      });
    };

    const updatedOrders = updateOrder(orders);
    const updatedLiveOrders = updateOrder(liveOrders);

    localStorage.setItem(`restaurant_orders_${restaurantId}`, JSON.stringify(updatedOrders));
    localStorage.setItem(`live_orders_${restaurantId}`, JSON.stringify(updatedLiveOrders));

    // Update main restaurant data for Super Admin dashboard
    try {
      const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
      const restaurantIndex = restaurants.findIndex(r => r.id == restaurantId);

      if (restaurantIndex !== -1) {
        // Update restaurant status in main data
        restaurants[restaurantIndex] = {
          ...restaurants[restaurantIndex],
          lastOrderStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        localStorage.setItem('tableserve_restaurants', JSON.stringify(restaurants));
        console.log('Updated main restaurant data with order status change');
      }
    } catch (error) {
      console.error('Error updating main restaurant data with order status:', error);
    }
  }

  static updateZoneOrderStatus(zoneId, orderId, newStatus, updatedBy) {
    const orders = JSON.parse(localStorage.getItem(`zone_orders_${zoneId}`) || '[]');
    const liveOrders = JSON.parse(localStorage.getItem(`zone_live_orders_${zoneId}`) || '[]');

    const updateOrder = (orderList) => {
      return orderList.map(order => {
        if (order.orderId === orderId) {
          return {
            ...order,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            statusHistory: [
              ...order.statusHistory,
              {
                status: newStatus,
                timestamp: new Date().toISOString(),
                updatedBy
              }
            ]
          };
        }
        return order;
      });
    };

    const updatedOrders = updateOrder(orders);
    const updatedLiveOrders = updateOrder(liveOrders);

    localStorage.setItem(`zone_orders_${zoneId}`, JSON.stringify(updatedOrders));
    localStorage.setItem(`zone_live_orders_${zoneId}`, JSON.stringify(updatedLiveOrders));

    // Update main zone data for Super Admin dashboard
    try {
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
      const zoneIndex = zones.findIndex(z => z.id == zoneId);

      if (zoneIndex !== -1) {
        // Update zone status in main data
        zones[zoneIndex] = {
          ...zones[zoneIndex],
          lastOrderStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        localStorage.setItem('tableserve_zones', JSON.stringify(zones));
        console.log('Updated main zone data with order status change');
      }
    } catch (error) {
      console.error('Error updating main zone data with order status:', error);
    }
  }

  static updateVendorOrderStatus(vendorId, orderId, newStatus, updatedBy) {
    const orders = JSON.parse(localStorage.getItem(`vendor_orders_${vendorId}`) || '[]');
    const liveOrders = JSON.parse(localStorage.getItem(`vendor_live_orders_${vendorId}`) || '[]');

    const updateOrder = (orderList) => {
      return orderList.map(order => {
        if (order.orderId === orderId) {
          return {
            ...order,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            statusHistory: [
              ...order.statusHistory,
              {
                status: newStatus,
                timestamp: new Date().toISOString(),
                updatedBy
              }
            ]
          };
        }
        return order;
      });
    };

    const updatedOrders = updateOrder(orders);
    const updatedLiveOrders = updateOrder(liveOrders);

    localStorage.setItem(`vendor_orders_${vendorId}`, JSON.stringify(updatedOrders));
    localStorage.setItem(`vendor_live_orders_${vendorId}`, JSON.stringify(updatedLiveOrders));

    // Update vendor data in zone vendors
    try {
      // First, find which zone this vendor belongs to
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');

      // Look through all zones to find the vendor
      for (const zone of zones) {
        const zoneVendors = JSON.parse(localStorage.getItem(`tableserve_zone_vendors_${zone.id}`) || '[]');
        const vendorIndex = zoneVendors.findIndex(v => v.id == vendorId);

        if (vendorIndex !== -1) {
          // Found the vendor in this zone
          // Update vendor data
          zoneVendors[vendorIndex] = {
            ...zoneVendors[vendorIndex],
            lastOrderStatusUpdate: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          localStorage.setItem(`tableserve_zone_vendors_${zone.id}`, JSON.stringify(zoneVendors));
          console.log('Updated vendor data with order status change');

          // Also update the main zone data
          const zoneIndex = zones.findIndex(z => z.id == zone.id);
          if (zoneIndex !== -1) {
            zones[zoneIndex] = {
              ...zones[zoneIndex],
              lastVendorUpdate: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            localStorage.setItem('tableserve_zones', JSON.stringify(zones));
            console.log('Updated main zone data with vendor order status change');
          }

          break;
        }
      }
    } catch (error) {
      console.error('Error updating vendor data with order status:', error);
    }
  }

  // Get orders for different user types
  static getOrdersForUser(userType, userId) {
    if (userType === 'restaurant') {
      return JSON.parse(localStorage.getItem(`restaurant_orders_${userId}`) || '[]');
    } else if (userType === 'zone') {
      return JSON.parse(localStorage.getItem(`zone_orders_${userId}`) || '[]');
    } else if (userType === 'vendor') {
      return JSON.parse(localStorage.getItem(`vendor_orders_${userId}`) || '[]');
    }
    return [];
  }

  static getLiveOrdersForUser(userType, userId) {
    if (userType === 'restaurant') {
      return JSON.parse(localStorage.getItem(`live_orders_${userId}`) || '[]');
    } else if (userType === 'zone') {
      return JSON.parse(localStorage.getItem(`zone_live_orders_${userId}`) || '[]');
    } else if (userType === 'vendor') {
      return JSON.parse(localStorage.getItem(`vendor_live_orders_${userId}`) || '[]');
    }
    return [];
  }

  // ===== NEW METHODS FOR ORDERS SLICE COMPATIBILITY =====

  // Get all orders (for admin role)
  static getAllOrders() {
    try {
      const allOrders = [];
      
      // Get all restaurants and their orders
      const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
      restaurants.forEach(restaurant => {
        const orders = this.getOrdersForRestaurant(restaurant.id);
        orders.forEach(order => {
          allOrders.push({
            ...order,
            entityType: 'restaurant',
            entityId: restaurant.id,
            entityName: restaurant.name
          });
        });
      });
      
      // Get all zones and their orders
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
      zones.forEach(zone => {
        const orders = this.getOrdersForZone(zone.id);
        orders.forEach(order => {
          allOrders.push({
            ...order,
            entityType: 'zone',
            entityId: zone.id,
            entityName: zone.name
          });
        });
      });
      
      // Sort by creation date (newest first)
      return allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error getting all orders:', error);
      return [];
    }
  }

  // Get orders for a specific restaurant
  static getOrdersForRestaurant(restaurantId) {
    try {
      return JSON.parse(localStorage.getItem(`restaurant_orders_${restaurantId}`) || '[]');
    } catch (error) {
      console.error(`Error getting orders for restaurant ${restaurantId}:`, error);
      return [];
    }
  }

  // Get orders for a specific zone
  static getOrdersForZone(zoneId) {
    try {
      return JSON.parse(localStorage.getItem(`zone_orders_${zoneId}`) || '[]');
    } catch (error) {
      console.error(`Error getting orders for zone ${zoneId}:`, error);
      return [];
    }
  }

  // Get orders for a specific shop/vendor
  static getOrdersForShop(shopId) {
    try {
      return JSON.parse(localStorage.getItem(`vendor_orders_${shopId}`) || '[]');
    } catch (error) {
      console.error(`Error getting orders for shop ${shopId}:`, error);
      return [];
    }
  }

  // Get live orders for a specific restaurant
  static getLiveOrdersForRestaurant(restaurantId) {
    try {
      const orders = JSON.parse(localStorage.getItem(`live_orders_${restaurantId}`) || '[]');
      // Filter for active orders only
      return orders.filter(order => 
        ['ordered', 'preparing', 'ready'].includes(order.status)
      );
    } catch (error) {
      console.error(`Error getting live orders for restaurant ${restaurantId}:`, error);
      return [];
    }
  }

  // Get live orders for a specific zone
  static getLiveOrdersForZone(zoneId) {
    try {
      const orders = JSON.parse(localStorage.getItem(`zone_live_orders_${zoneId}`) || '[]');
      // Filter for active orders only
      return orders.filter(order => 
        ['ordered', 'preparing', 'ready'].includes(order.status)
      );
    } catch (error) {
      console.error(`Error getting live orders for zone ${zoneId}:`, error);
      return [];
    }
  }

  // Get live orders for a specific shop/vendor
  static getLiveOrdersForShop(shopId) {
    try {
      const orders = JSON.parse(localStorage.getItem(`vendor_live_orders_${shopId}`) || '[]');
      // Filter for active orders only
      return orders.filter(order => 
        ['ordered', 'preparing', 'ready'].includes(order.status)
      );
    } catch (error) {
      console.error(`Error getting live orders for shop ${shopId}:`, error);
      return [];
    }
  }

  // Get order by ID (searches across all entity types)
  static getOrderById(orderId) {
    try {
      console.log('OrderProcessingService.getOrderById: Searching for order:', orderId);
      
      // First, search in restaurant orders from main restaurants list
      const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
      console.log('Found restaurants in main list:', restaurants.length);
      
      for (const restaurant of restaurants) {
        const orders = this.getOrdersForRestaurant(restaurant.id);
        console.log(`Checking restaurant ${restaurant.id}: ${orders.length} orders`);
        
        const order = orders.find(o => {
          const matches = o.orderId === orderId || o.id === orderId;
          if (matches) {
            console.log('Found order in restaurant:', restaurant.id, order);
          }
          return matches;
        });
        
        if (order) {
          return {
            ...order,
            entityType: 'restaurant',
            entityId: restaurant.id,
            entityName: restaurant.name
          };
        }
      }
      
      // Also search all localStorage keys for restaurant orders (in case restaurant isn't in main list)
      for (let key in localStorage) {
        if (key.startsWith('restaurant_orders_')) {
          const restaurantId = key.replace('restaurant_orders_', '');
          
          // Skip if already checked above
          if (restaurants.find(r => r.id == restaurantId)) {
            continue;
          }
          
          try {
            const orders = JSON.parse(localStorage.getItem(key) || '[]');
            console.log(`Checking additional restaurant storage ${restaurantId}: ${orders.length} orders`);
            
            const order = orders.find(o => {
              const matches = o.orderId === orderId || o.id === orderId;
              if (matches) {
                console.log('Found order in additional restaurant storage:', restaurantId, order);
              }
              return matches;
            });
            
            if (order) {
              return {
                ...order,
                entityType: 'restaurant',
                entityId: restaurantId,
                entityName: `Restaurant ${restaurantId}`
              };
            }
          } catch (error) {
            console.error(`Error parsing orders for ${key}:`, error);
          }
        }
      }
      
      // Search in zone orders
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
      console.log('Found zones in main list:', zones.length);
      
      for (const zone of zones) {
        const orders = this.getOrdersForZone(zone.id);
        console.log(`Checking zone ${zone.id}: ${orders.length} orders`);
        
        const order = orders.find(o => {
          const matches = o.orderId === orderId || o.id === orderId;
          if (matches) {
            console.log('Found order in zone:', zone.id, order);
          }
          return matches;
        });
        
        if (order) {
          return {
            ...order,
            entityType: 'zone',
            entityId: zone.id,
            entityName: zone.name
          };
        }
        
        // Also search in vendor orders within this zone
        const vendors = zone.vendors || [];
        for (const vendor of vendors) {
          const vendorOrders = this.getOrdersForShop(vendor.id);
          const order = vendorOrders.find(o => o.orderId === orderId || o.id === orderId);
          if (order) {
            console.log('Found order in vendor:', vendor.id, order);
            return {
              ...order,
              entityType: 'vendor',
              entityId: vendor.id,
              entityName: vendor.name,
              zoneId: zone.id,
              zoneName: zone.name
            };
          }
        }
      }
      
      console.log('Order not found anywhere:', orderId);
      return null;
    } catch (error) {
      console.error(`Error getting order by ID ${orderId}:`, error);
      return null;
    }
  }

  // Update order status
  static updateOrderStatus(orderId, newStatus, updatedBy, userRole, entityId, estimatedTime) {
    try {
      const order = this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      const timestamp = new Date().toISOString();
      const updatedOrder = {
        ...order,
        status: newStatus,
        updatedAt: timestamp,
        estimatedTime: estimatedTime || order.estimatedTime,
        statusHistory: [
          ...order.statusHistory,
          {
            status: newStatus,
            timestamp,
            updatedBy,
            userRole
          }
        ]
      };
      
      // Update in the appropriate storage
      if (order.entityType === 'restaurant') {
        const orders = this.getOrdersForRestaurant(order.entityId);
        const updatedOrders = orders.map(o => 
          (o.orderId === orderId || o.id === orderId) ? updatedOrder : o
        );
        localStorage.setItem(`restaurant_orders_${order.entityId}`, JSON.stringify(updatedOrders));
        
        // Also update live orders
        const liveOrders = this.getLiveOrdersForRestaurant(order.entityId);
        const updatedLiveOrders = liveOrders.map(o => 
          (o.orderId === orderId || o.id === orderId) ? updatedOrder : o
        );
        localStorage.setItem(`live_orders_${order.entityId}`, JSON.stringify(updatedLiveOrders));
      }
      
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      return null;
    }
  }

  // Cancel order
  static cancelOrder(orderId, reason, cancelledBy) {
    try {
      return this.updateOrderStatus(orderId, 'cancelled', cancelledBy, 'customer', null);
    } catch (error) {
      console.error('Error cancelling order:', error);
      return null;
    }
  }
}

export default OrderProcessingService;
