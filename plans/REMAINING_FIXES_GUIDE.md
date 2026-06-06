# Remaining Fixes Guide (Bugs #28-47)

## Phase 3: Frontend Socket Services (Bugs #28-39)

### Fix #28-35: Frontend Socket & Storage Issues

#### 1. Update `src/services/socketService.js`
```javascript
// Add imports at top
import { ORDER_EVENTS, ROOM_EVENTS, ROOM_NAMES, CONNECTION_EVENTS } from '../constants/socketEvents';
import simpleTokenService from './SimpleTokenService'; // Use token service instead of localStorage

// Fix socket connection (Bug #35 & #45)
connect() {
  // ... existing code ...
  
  // BEFORE:
  // const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'https://tableserves-5hy4f.ondigitalocean.app';
  // auth: { token: localStorage.getItem('accessToken') }
  
  // AFTER:
  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL;
  if (!websocketUrl) {
    throw new Error('VITE_WEBSOCKET_URL environment variable is required');
  }
  
  // Validate and refresh token if needed
  const token = simpleTokenService.getAccessToken();
  if (!token || !simpleTokenService.isAuthenticated()) {
    console.warn('No valid token for socket connection');
  }
  
  this.socket = io(websocketUrl, {
    // ... existing options ...
    auth: { token }
  });
}

// Add method to join rooms using standardized events
joinRoom(roomType, roomId) {
  if (!this.isConnected) {
    console.warn('Socket not connected, cannot join room');
    return Promise.reject(new Error('Socket not connected'));
  }
  
  return this.emit(ROOM_EVENTS.JOIN_ROOM, { roomType, roomId });
}

leaveRoom(roomType, roomId) {
  if (!this.isConnected) {
    return Promise.resolve();
  }
  
  return this.emit(ROOM_EVENTS.LEAVE_ROOM, { roomType, roomId });
}
```

#### 2. Update `src/services/RealTimeOrderTracker.js`
```javascript
// Add imports
import { ORDER_EVENTS, ROOM_EVENTS, ROOM_NAMES } from '../constants/socketEvents';

// Fix subscribeToOrderUpdates method (Bug #19, #20, #21)
async subscribeToOrderUpdates(tracker) {
  const { orderId, orderNumber, customerPhone } = tracker;

  try {
    if (!RealTimeService.isConnected) {
      await this.ensureConnection();
    }

    // PRIMARY: Join tracking room using standardized event
    if (orderNumber) {
      await RealTimeService.emit(ROOM_EVENTS.TRACK_ORDER, {
        orderNumber,
        customerPhone
      });
      
      logger.info('Joined PRIMARY tracking room', {
        orderNumber,
        event: ROOM_EVENTS.TRACK_ORDER
      });
    }

    logger.info('Subscribed to order real-time updates', {
      orderId,
      orderNumber,
      customerPhone
    });

  } catch (error) {
    logger.error('Failed to subscribe to order updates', { orderId, error: error.message });
    this.handleTrackerError(tracker, error);
  }
}

// Fix setupGlobalEventListeners method (Bug #1, #2, #3, #7, #10)
setupGlobalEventListeners() {
  logger.info('Setting up global real-time event listeners');

  // Listen for ORDER_STATUS_UPDATED (standardized event)
  RealTimeService.addEventListener(ORDER_EVENTS.ORDER_STATUS_UPDATED, (data) => {
    logger.info('🔄 Received ORDER_STATUS_UPDATED event', { data });
    this.handleOrderStatusChange(data);
  });

  // Listen for NEW_ORDER (for new order notifications)
  RealTimeService.addEventListener(ORDER_EVENTS.NEW_ORDER, (data) => {
    logger.info('🆕 Received NEW_ORDER event', { data });
    this.handleNewOrder(data);
  });

  // Listen for ORDER_CREATED (when customer's order is created)
  RealTimeService.addEventListener(ORDER_EVENTS.ORDER_CREATED, (data) => {
    logger.info('✅ Received ORDER_CREATED event', { data });
    this.handleOrderStatusChange({ ...data, status: data.status || 'confirmed' });
  });

  // Connection events
  RealTimeService.addEventListener(CONNECTION_EVENTS.CONNECT, () => {
    logger.info('🔗 WebSocket connected - handling reconnection');
    this.handleReconnection();
  });

  RealTimeService.addEventListener(CONNECTION_EVENTS.DISCONNECT, () => {
    logger.warn('🔌 WebSocket disconnected - handling disconnection');
    this.handleDisconnection();
  });

  logger.info('Global real-time event listeners set up');
}
```

#### 3. Fix `src/services/OrderTrackingService.js` (Bug #28)
```javascript
/**
 * Order Tracking Service
 * localStorage used ONLY for UX convenience (pre-filling forms)
 * ALWAYS fetch fresh data from server
 */
class OrderTrackingService {
  static KEYS = {
    ORDER_NUMBER: 'currentOrderNumber',
    CUSTOMER_PHONE: 'currentOrderPhone',
    // ... other keys
  };

  /**
   * Store order info in localStorage for UX ONLY
   * This is NOT the source of truth - always fetch from server
   */
  static storeOrderInfo(orderData) {
    try {
      // Store for form pre-filling only
      if (orderData.orderNumber) {
        localStorage.setItem(this.KEYS.ORDER_NUMBER, orderData.orderNumber);
      }
      
      const customerPhone = orderData.customer?.phone || orderData.customerPhone;
      if (customerPhone) {
        localStorage.setItem(this.KEYS.CUSTOMER_PHONE, customerPhone);
      }
      
      console.log('Order info stored for UX (not source of truth)');
    } catch (error) {
      console.error('Failed to store order info:', error);
    }
  }

  /**
   * Get order info from localStorage for UX ONLY
   * WARNING: This data may be stale - always fetch from server
   */
  static getCurrentOrderInfo() {
    try {
      return {
        orderNumber: localStorage.getItem(this.KEYS.ORDER_NUMBER),
        customerPhone: localStorage.getItem(this.KEYS.CUSTOMER_PHONE),
        // ... other fields
      };
    } catch (error) {
      console.error('Failed to get order info:', error);
      return {};
    }
  }

  /**
   * Fetch order data from server (ALWAYS use this as source of truth)
   */
  static async fetchCurrentOrder() {
    const info = this.getCurrentOrderInfo();
    
    if (!info.orderNumber || !info.customerPhone) {
      throw new Error('No order tracking information available');
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/orders/track/${info.orderNumber}?phone=${encodeURIComponent(info.customerPhone)}`
      );
      
      if (!response.ok) {
        throw new Error('Order not found or invalid phone number');
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch order');
      }
    } catch (error) {
      console.error('Failed to fetch current order:', error);
      throw error;
    }
  }
}

export default OrderTrackingService;
```

#### 4. Fix `src/services/SubscriptionService.js` (Bug #30)
```javascript
/**
 * Subscription Service
 * NO localStorage - use Redux + API as single source of truth
 */
import { store } from '../store';
import logger from './LoggingService';
import ApiService from './ApiService';

class SubscriptionService {
  /**
   * Get current subscription from Redux store (NOT localStorage)
   */
  getCurrentSubscription() {
    try {
      const state = store.getState();
      return state.subscription?.currentSubscription || null;
    } catch (error) {
      logger.error('Failed to get subscription from Redux', error, 'SubscriptionService');
      return null;
    }
  }

  /**
   * Fetch subscription from server and update Redux
   */
  async fetchSubscription() {
    try {
      const subscription = await ApiService.getCurrentSubscription();
      
      // Update Redux store
      const { setSubscription } = await import('../store/slices/subscriptionSlice');
      store.dispatch(setSubscription(subscription));
      
      logger.info('Subscription fetched and updated in Redux', {
        plan: subscription.planKey
      }, 'SubscriptionService');
      
      return subscription;
    } catch (error) {
      logger.error('Failed to fetch subscription', error, 'SubscriptionService');
      throw error;
    }
  }

  /**
   * Check vendor limit (fetch fresh data from server)
   */
  async checkVendorLimit(zoneId, currentCount = null) {
    try {
      // Always fetch fresh subscription data
      const subscription = await this.fetchSubscription();
      
      if (!subscription) {
        return {
          allowed: true,
          unlimited: true,
          message: 'No subscription limits'
        };
      }

      const maxVendors = subscription.maxVendors;
      
      if (maxVendors === null || maxVendors === undefined) {
        return {
          allowed: true,
          unlimited: true,
          message: 'Unlimited vendors allowed'
        };
      }

      // Get current count from API if not provided
      if (currentCount === null) {
        const vendors = await ApiService.getZoneVendors(zoneId);
        currentCount = vendors.length;
      }

      const canAddMore = currentCount < maxVendors;
      
      return {
        allowed: canAddMore,
        currentCount,
        maxCount: maxVendors,
        remaining: Math.max(0, maxVendors - currentCount),
        message: canAddMore 
          ? `${maxVendors - currentCount} vendors remaining`
          : `Vendor limit reached (${currentCount}/${maxVendors})`
      };
    } catch (error) {
      logger.error('Vendor limit check failed', error, 'SubscriptionService');
      return {
        allowed: false,
        error: error.message
      };
    }
  }
}

const subscriptionService = new SubscriptionService();
export default subscriptionService;
```

#### 5. Fix `src/store/slices/uiSlice.js` (Bug #32)
```javascript
// Remove dual storage - use sessionStorage ONLY

// BEFORE:
const storedUser = sessionStorage.getItem('tableserve_user_data') || localStorage.getItem('userData');

// AFTER:
const storedUser = sessionStorage.getItem('tableserve_user_data');

// Update logout action to clear sessionStorage only
logout: (state) => {
  state.auth.user = null;
  state.auth.accessToken = null;
  state.auth.refreshToken = null;
  state.auth.businessEntity = null;
  state.auth.isAuthenticated = false;
  state.auth.error = null;

  // Clear dashboard data
  state.dashboard.stats = null;
  state.dashboard.currentRole = null;

  // Clear notifications
  state.notifications = [];

  // Clear sessionStorage ONLY
  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn('Failed to clear sessionStorage:', error);
  }

  // Broadcast logout to other tabs
  if (!state.auth.isLoggingOut) {
    state.auth.isLoggingOut = true;
    multiTabAuthService.broadcastLogout();
    setTimeout(() => {
      state.auth.isLoggingOut = false;
    }, 100);
  }

  console.log('uiSlice: Authentication cleared');
},
```

#### 6. Fix Dashboard Real-Time Updates (Bug #37, #38, #39)
```javascript
// In restaurant/zone dashboard components, add socket listeners

import { ORDER_EVENTS } from '../constants/socketEvents';
import RealTimeService from '../services/RealTimeService';

useEffect(() => {
  // Subscribe to new orders
  const unsubscribeNewOrder = RealTimeService.addEventListener(ORDER_EVENTS.NEW_ORDER, (data) => {
    console.log('New order received, refreshing dashboard');
    dispatch(fetchDashboardStats(userRole));
  });

  // Subscribe to order status updates
  const unsubscribeStatusUpdate = RealTimeService.addEventListener(ORDER_EVENTS.ORDER_STATUS_UPDATED, (data) => {
    console.log('Order status updated, refreshing dashboard');
    dispatch(fetchDashboardStats(userRole));
  });

  return () => {
    unsubscribeNewOrder();
    unsubscribeStatusUpdate();
  };
}, [dispatch, userRole]);
```

---

## Phase 4: Order Status Flow (Bugs #40-44)

### Fix #40-42: Status Flow Standardization

#### 1. Update Documentation
```markdown
# ORDER_STATUS_FLOW.md

## Standard Order Status Flow

pending → confirmed → ready → completed

**Note:** The `preparing` status has been REMOVED. 
The `confirmed` status now represents both confirmation AND preparation.

## Status Descriptions
- `pending`: Order placed, awaiting restaurant confirmation
- `confirmed`: Restaurant confirmed and is preparing the order
- `ready`: Order is ready for pickup/delivery
- `completed`: Order has been completed
- `cancelled`: Order was cancelled
```

#### 2. Update Backend Status Validation
```javascript
// backend/src/services/multiShopOrderTrackingService.js

static validateStatusTransition(currentStatus, newStatus) {
  // SIMPLIFIED flow: pending → confirmed → ready → completed
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['ready', 'cancelled'], // confirmed includes preparing
    'ready': ['completed', 'cancelled'],
    'completed': [], // Final state
    'cancelled': [] // Final state
  };

  const allowedTransitions = validTransitions[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    throw new APIError(
      `Invalid status transition from "${currentStatus}" to "${newStatus}". ` +
      `Allowed: ${allowedTransitions.join(', ')}. ` +
      `Flow: pending → confirmed → ready → completed`,
      400
    );
  }
}
```

#### 3. Update Frontend Status Labels
```javascript
// src/components/customer/common/OrderTracking.jsx

const getStatusLabel = (status) => {
  const statusMap = {
    'pending': 'Order Placed',
    'confirmed': 'Confirmed & Preparing', // Combined status
    'ready': 'Ready for Pickup',
    'completed': 'Order Completed',
    'cancelled': 'Order Cancelled'
  };
  return statusMap[status] || status;
};

const getStatusDescription = (status) => {
  const descriptions = {
    'pending': 'Your order has been received and is awaiting confirmation',
    'confirmed': 'The restaurant has confirmed your order and is preparing it',
    'ready': 'Your order is ready for pickup or delivery',
    'completed': 'Thank you for choosing us! Enjoy your meal!',
    'cancelled': 'This order has been cancelled'
  };
  return descriptions[status] || 'Order status unknown';
};
```

### Fix #43: Always Set previousStatus
```javascript
// In Order model updateStatus method

updateStatus(newStatus, updatedBy, notes = '', session = null) {
  // ALWAYS set previousStatus before changing status
  this.previousStatus = this.status;
  this.status = newStatus;
  
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    notes
  });
  
  // ... rest of method
}
```

### Fix #44: Multi-Shop Status Aggregation
```javascript
// In Order model updateZoneMainStatus method

async updateZoneMainStatus(session = null) {
  const childOrders = await Order.find({
    parentOrderId: this._id
  }).session(session);

  if (childOrders.length === 0) return;

  const statusCounts = {
    pending: 0,
    confirmed: 0,
    ready: 0,
    completed: 0,
    cancelled: 0
  };

  childOrders.forEach(order => {
    statusCounts[order.status]++;
  });

  // Update summary
  this.shopOrderSummary = {
    totalShops: childOrders.length,
    completedShops: statusCounts.completed,
    readyShops: statusCounts.ready,
    preparingShops: statusCounts.confirmed,
    cancelledShops: statusCounts.cancelled
  };

  // Determine parent status based on aggregation rules
  const previousStatus = this.status;

  if (statusCounts.cancelled === childOrders.length) {
    // All shops cancelled
    this.status = 'cancelled';
  } else if (statusCounts.completed === childOrders.length - statusCounts.cancelled) {
    // All non-cancelled shops completed
    this.status = 'completed';
  } else if (statusCounts.ready + statusCounts.completed >= childOrders.length - statusCounts.cancelled) {
    // All non-cancelled shops are ready or completed
    this.status = 'ready';
  } else if (statusCounts.confirmed > 0 || statusCounts.ready > 0) {
    // At least one shop is confirmed or ready
    this.status = 'confirmed';
  } else {
    // All shops still pending
    this.status = 'pending';
  }

  // Set previousStatus
  this.previousStatus = previousStatus;
}
```

---

## Phase 5: Additional Issues (Bugs #45-47)

### Fix #45: Remove Hardcoded Socket URL
```javascript
// src/services/socketService.js

connect() {
  // BEFORE:
  // const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'https://tableserves-5hy4f.ondigitalocean.app';
  
  // AFTER:
  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL;
  
  if (!websocketUrl) {
    throw new Error('VITE_WEBSOCKET_URL environment variable is required. Please set it in your .env file.');
  }
  
  this.socket = io(websocketUrl, {
    // ... options
  });
}
```

### Fix #46: Report Cache Errors to Monitoring
```javascript
// backend/src/services/orderCacheService.js

// Add Sentry or monitoring service
const Sentry = require('@sentry/node'); // If using Sentry

class OrderCacheService {
  async cacheOrderTracking(orderId, trackingData) {
    try {
      // ... cache logic
    } catch (error) {
      logger.error('Cache operation failed', { orderId, error: error.message });
      
      // Report to monitoring service
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
          tags: {
            service: 'orderCache',
            operation: 'cacheOrderTracking'
          },
          extra: { orderId }
        });
      }
      
      // Don't throw - graceful degradation
    }
  }
}
```

### Fix #47: Add Cache TTL
```javascript
// backend/src/services/orderCacheService.js

class OrderCacheService {
  constructor() {
    this.cache = new Map();
    this.TTL = 5 * 60 * 1000; // 5 minutes
  }

  async cacheOrderTracking(orderId, trackingData) {
    try {
      const cacheEntry = {
        data: trackingData,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.TTL
      };
      
      this.cache.set(orderId, cacheEntry);
      
      logger.debug('Order tracking data cached with TTL', {
        orderId,
        ttl: this.TTL,
        expiresAt: new Date(cacheEntry.expiresAt).toISOString()
      });
    } catch (error) {
      logger.error('Failed to cache order tracking', { orderId, error: error.message });
    }
  }

  async getCachedOrderTracking(orderNumber) {
    try {
      const cacheEntry = this.cache.get(orderNumber);
      
      if (!cacheEntry) {
        return null;
      }
      
      // Check if expired
      if (Date.now() > cacheEntry.expiresAt) {
        logger.debug('Cache entry expired', { orderNumber });
        this.cache.delete(orderNumber);
        return null;
      }
      
      logger.debug('Cache hit', { orderNumber });
      return cacheEntry.data;
    } catch (error) {
      logger.error('Failed to get cached order tracking', { orderNumber, error: error.message });
      return null;
    }
  }

  // Add cleanup method to remove expired entries
  cleanupExpiredEntries() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.info('Cleaned up expired cache entries', { removedCount });
    }
  }
}

// Run cleanup every minute
setInterval(() => {
  orderCacheService.cleanupExpiredEntries();
}, 60 * 1000);
```

---

## Testing Checklist

After applying all fixes:

- [ ] New order notification reaches restaurant dashboard
- [ ] Order status updates reach customer tracking page in real-time
- [ ] Multi-shop zone orders update all shops simultaneously
- [ ] Admin dashboard receives all order types
- [ ] Subscription changes reflect immediately (no localStorage)
- [ ] Order tracking works without localStorage fallback
- [ ] Socket reconnection works properly
- [ ] Multiple customers can track orders on same table
- [ ] Status transitions follow documented flow (no `preparing`)
- [ ] Cache expires after 5 minutes
- [ ] Cache errors reported to monitoring
- [ ] Socket URL must be in environment variables (no fallback)

---

## Environment Variables Required

Add to `.env` files:

```bash
# Backend
NODE_ENV=production
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_WEBSOCKET_URL=http://localhost:5000
```

---

**All 47 bugs will be fixed after applying these changes!**
