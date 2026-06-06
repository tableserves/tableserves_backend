/**
 * Socket Event Constants
 * Central registry for all socket.io event names
 * 
 * RULES:
 * 1. Use snake_case for all event names
 * 2. Never hardcode event names - always import from this file
 * 3. Add new events here first, then implement
 */

// ===== ORDER EVENTS =====
const ORDER_EVENTS = {
  // Order Creation
  NEW_ORDER: 'new_order',
  ORDER_CREATED: 'order_created',
  
  // Order Status Updates
  ORDER_STATUS_UPDATED: 'order_status_updated',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_READY: 'order_ready',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',
  
  // Generic Order Updates
  ORDER_UPDATE: 'order_update',
};

// ===== ROOM SUBSCRIPTION EVENTS =====
const ROOM_EVENTS = {
  // Generic Room Management
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  
  // Order Tracking
  TRACK_ORDER: 'track_order',
  STOP_TRACKING_ORDER: 'stop_tracking_order',
  
  // Restaurant/Zone/Shop Subscriptions
  SUBSCRIBE_RESTAURANT_ORDERS: 'subscribe_restaurant_orders',
  SUBSCRIBE_ZONE_ORDERS: 'subscribe_zone_orders',
  SUBSCRIBE_SHOP_ORDERS: 'subscribe_shop_orders',
  
  UNSUBSCRIBE_RESTAURANT_ORDERS: 'unsubscribe_restaurant_orders',
  UNSUBSCRIBE_ZONE_ORDERS: 'unsubscribe_zone_orders',
  UNSUBSCRIBE_SHOP_ORDERS: 'unsubscribe_shop_orders',
};

// ===== ROOM NAMING PATTERNS =====
const ROOM_NAMES = {
  // Order Tracking Rooms (PRIMARY - use orderNumber)
  ORDER_TRACKING: (orderNumber) => `tracking_${orderNumber}`,
  
  // Business Entity Rooms
  RESTAURANT: (restaurantId) => `restaurant_${restaurantId}`,
  ZONE: (zoneId) => `zone_${zoneId}`,
  SHOP: (shopId) => `shop_${shopId}`,
  
  // Customer Rooms
  CUSTOMER: (phone) => `customer_${phone}`,
  
  // User Rooms
  USER: (userId) => `user_${userId}`,
  
  // Admin Rooms
  ADMIN_DASHBOARD: 'admin_dashboard',
};

// ===== CONNECTION EVENTS =====
const CONNECTION_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_FAILED: 'reconnect_failed',
};

// ===== RESTAURANT EVENTS =====
const RESTAURANT_EVENTS = {
  RESTAURANT_STATUS_UPDATED: 'restaurant_status_updated',
};

// ===== SHOP EVENTS =====
const SHOP_EVENTS = {
  SHOP_STATUS_UPDATED: 'shop_status_updated',
  SHOP_USER_OFFLINE: 'shop_user_offline',
};

// ===== ERROR EVENTS =====
const ERROR_EVENTS = {
  ERROR: 'error',
  AUTHENTICATION_ERROR: 'authentication_error',
  AUTHORIZATION_ERROR: 'authorization_error',
};

// ===== EXPORT ALL =====
module.exports = {
  ORDER_EVENTS,
  ROOM_EVENTS,
  ROOM_NAMES,
  CONNECTION_EVENTS,
  RESTAURANT_EVENTS,
  SHOP_EVENTS,
  ERROR_EVENTS,
  
  // Convenience: Export all events as flat object
  EVENTS: {
    ...ORDER_EVENTS,
    ...ROOM_EVENTS,
    ...CONNECTION_EVENTS,
    ...RESTAURANT_EVENTS,
    ...SHOP_EVENTS,
    ...ERROR_EVENTS,
  },
};
