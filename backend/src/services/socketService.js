const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');
const { ORDER_EVENTS, ROOM_EVENTS, ROOM_NAMES, RESTAURANT_EVENTS, SHOP_EVENTS, ERROR_EVENTS } = require('../constants/socketEvents');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  init(server) {
    try {
      this.io = new Server(server, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:5173",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      // Set up authentication middleware
      this.io.use((socket, next) => this.authenticateSocket(socket, next));

      // Handle connections
      this.io.on('connection', (socket) => this.handleConnection(socket));

      logger.info('Socket.io initialized successfully');
      return this.io;
    } catch (error) {
      logger.error('Failed to initialize Socket.io:', error);
      throw error;
    }
  }

  getIO() {
    return this.io;
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        return next(new Error('Authentication failed'));
      }

      socket.user = user;

      logger.info('Socket authenticated', { userId: socket.user.id, socketId: socket.id });
      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error: error.message });
      next(new Error('Authentication failed'));
    }
  }

  handleConnection(socket) {
    logger.info('New socket connection', { socketId: socket.id, userId: socket.user?.id });

    if (socket.user) {
      this.connectedUsers.set(socket.user.id.toString(), socket.id);
      socket.join(`user_${socket.user.id}`);

      // Enhanced room management based on user role
      const userRole = socket.user.role;
      const userId = socket.user.id;

      // Join role-based rooms with null checks
      if (userRole === 'restaurant_owner' && socket.user.restaurantId) {
        const restaurantRoom = ROOM_NAMES.RESTAURANT(socket.user.restaurantId);
        socket.join(restaurantRoom);
        logger.debug('User joined restaurant room', { userId, room: restaurantRoom });
      } else if (userRole === 'zone_admin' && socket.user.zoneId) {
        const zoneRoom = ROOM_NAMES.ZONE(socket.user.zoneId);
        socket.join(zoneRoom);
        logger.debug('User joined zone room', { userId, room: zoneRoom });
      } else if ((userRole === 'zone_shop' || userRole === 'zone_vendor') && socket.user.shopId) {
        const shopRoom = ROOM_NAMES.SHOP(socket.user.shopId);
        socket.join(shopRoom);
        logger.debug('User joined shop room', { userId, room: shopRoom });
        
        // Also join the zone room for zone-wide notifications
        if (socket.user.zoneId) {
          const zoneRoom = ROOM_NAMES.ZONE(socket.user.zoneId);
          socket.join(zoneRoom);
          logger.debug('Shop user also joined zone room', { userId, room: zoneRoom });
        }
      } else if (userRole === 'admin' || userRole === 'super_admin') {
        const adminRoom = ROOM_NAMES.ADMIN_DASHBOARD;
        socket.join(adminRoom);
        logger.debug('User joined admin room', { userId, room: adminRoom });
      }

      // Enhanced customer room management
      if (socket.user.phone) {
        const customerRoom = ROOM_NAMES.CUSTOMER(socket.user.phone);
        socket.join(customerRoom);
        logger.debug('User joined customer room', { userId, room: customerRoom });
      }

      logger.info('User joined rooms', {
        userId,
        role: userRole,
        rooms: Array.from(socket.rooms)
      });
    }

    // Set up event handlers
    socket.on(ROOM_EVENTS.JOIN_ROOM, (data) => this.handleJoinRoom(socket, data));
    socket.on(ROOM_EVENTS.LEAVE_ROOM, (data) => this.handleLeaveRoom(socket, data));
    socket.on('order_status_update', (data) => this.handleOrderStatusUpdate(socket, data));
    socket.on(RESTAURANT_EVENTS.RESTAURANT_STATUS_UPDATED, (data) => this.handleRestaurantStatusUpdate(socket, data));

    // Enhanced event handlers for multi-shop zone orders
    this.setupOrderEventHandlers(socket);
    this.setupZoneEventHandlers(socket);
    this.setupShopEventHandlers(socket);
    this.setupCustomerEventHandlers(socket);

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  handleJoinRoom(socket, data) {
    const { roomType, roomId } = data;

    if (!roomType || !roomId) {
      socket.emit(ERROR_EVENTS.ERROR, { message: 'Room type and ID required' });
      return;
    }

    // Use standardized room naming
    let roomName;
    switch (roomType) {
      case 'restaurant':
        roomName = ROOM_NAMES.RESTAURANT(roomId);
        break;
      case 'zone':
        roomName = ROOM_NAMES.ZONE(roomId);
        break;
      case 'shop':
        roomName = ROOM_NAMES.SHOP(roomId);
        break;
      case 'tracking':
        roomName = ROOM_NAMES.ORDER_TRACKING(roomId);
        break;
      case 'customer':
        roomName = ROOM_NAMES.CUSTOMER(roomId);
        break;
      case 'user':
        roomName = ROOM_NAMES.USER(roomId);
        break;
      default:
        socket.emit(ERROR_EVENTS.ERROR, { message: `Invalid room type: ${roomType}` });
        return;
    }

    socket.join(roomName);

    logger.info('Socket joined room', {
      socketId: socket.id,
      userId: socket.user?.id,
      room: roomName,
      roomType,
      roomId
    });

    socket.emit(ROOM_EVENTS.ROOM_JOINED, { room: roomName, roomType, roomId });
  }

  handleLeaveRoom(socket, data) {
    const { roomType, roomId } = data;

    if (!roomType || !roomId) {
      socket.emit(ERROR_EVENTS.ERROR, { message: 'Room type and ID required' });
      return;
    }

    // Use standardized room naming
    let roomName;
    switch (roomType) {
      case 'restaurant':
        roomName = ROOM_NAMES.RESTAURANT(roomId);
        break;
      case 'zone':
        roomName = ROOM_NAMES.ZONE(roomId);
        break;
      case 'shop':
        roomName = ROOM_NAMES.SHOP(roomId);
        break;
      case 'tracking':
        roomName = ROOM_NAMES.ORDER_TRACKING(roomId);
        break;
      case 'customer':
        roomName = ROOM_NAMES.CUSTOMER(roomId);
        break;
      case 'user':
        roomName = ROOM_NAMES.USER(roomId);
        break;
      default:
        socket.emit(ERROR_EVENTS.ERROR, { message: `Invalid room type: ${roomType}` });
        return;
    }

    socket.leave(roomName);

    logger.info('Socket left room', {
      socketId: socket.id,
      userId: socket.user?.id,
      room: roomName,
      roomType,
      roomId
    });

    socket.emit(ROOM_EVENTS.ROOM_LEFT, { room: roomName, roomType, roomId });
  }

  async handleOrderStatusUpdate(socket, data) {
    const { orderId, status, notes } = data;

    if (!socket.user) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const order = await Order.findById(orderId);
      if (!order) {
        socket.emit('error', { message: 'Order not found' });
        return;
      }

      const isOwner = order.restaurantId?.toString() === socket.user.id.toString() ||
                      order.zoneId?.toString() === socket.user.id.toString() ||
                      order.shopId?.toString() === socket.user.id.toString();

      if (socket.user.role !== 'admin' && !isOwner) {
        socket.emit('error', { message: 'Access denied to this order' });
        return;
      }

      // ✅ FIX: include orderNumber so broadcastOrderUpdate can find the tracking room
      this.broadcastOrderUpdate(orderId, {
        orderId,
        orderNumber: order.orderNumber, // ← ADD THIS
        status,
        notes,
        updatedBy: socket.user.id,
        timestamp: new Date().toISOString()
      });

      logger.info('Order status updated via socket', { 
        orderId, 
        orderNumber: order.orderNumber,
        status, 
        updatedBy: socket.user.id 
      });
    } catch (error) {
      logger.error('Error handling order status update', { orderId, error: error.message });
      socket.emit('error', { message: 'Error updating order status' });
    }
  }

  // ... (handleDisconnection remains the same)

  async validateRoomAccess(user, roomType, roomId) {
    if (!user) {
      return roomType === 'order' || roomType === 'public';
    }

    if (user.role === 'admin') {
      return true;
    }

    switch (roomType) {
      case 'restaurant':
        const restaurant = await Restaurant.findById(roomId);
        return restaurant && restaurant.ownerId.toString() === user.id.toString();
      case 'zone':
        const zone = await Zone.findById(roomId);
        return zone && zone.adminId.toString() === user.id.toString();
      case 'shop':
        const shop = await ZoneShop.findById(roomId);
        return shop && shop.ownerId.toString() === user.id.toString();
      case 'order':
        const order = await Order.findById(roomId);
        return order && (
          order.customerId?.toString() === user.id.toString() ||
          order.restaurantId?.toString() === user.id.toString() ||
          order.zoneId?.toString() === user.id.toString() ||
          order.shopId?.toString() === user.id.toString()
        );
      case 'user':
        return `user_${user.id}` === `user_${roomId}`;
      default:
        return false;
    }
  }

  async handleRestaurantStatusUpdate(socket, data) {
    const { restaurantId, status } = data;

    if (!socket.user) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        socket.emit('error', { message: 'Restaurant not found' });
        return;
      }

      // Check if user has permission to update restaurant status
      const isOwner = restaurant.ownerId.toString() === socket.user.id.toString();
      const isAdmin = socket.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        socket.emit('error', { message: 'Unauthorized to update restaurant status' });
        return;
      }

      // Update restaurant status
      restaurant.status = status;
      await restaurant.save();

      // Broadcast to all connected clients in restaurant room
      this.io.to(`restaurant_${restaurantId}`).emit('restaurant_status_updated', {
        restaurantId,
        status,
        updatedBy: socket.user.id,
        timestamp: new Date().toISOString()
      });

      logger.info('Restaurant status updated via socket', {
        restaurantId,
        status,
        updatedBy: socket.user.id
      });

    } catch (error) {
      logger.error('Error updating restaurant status via socket:', error);
      socket.emit('error', { message: 'Failed to update restaurant status' });
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    logger.info('Socket disconnected', { socketId: socket.id, userId: socket.user?.id });
    
    if (socket.user) {
      this.connectedUsers.delete(socket.user.id.toString());
      
      // Emit user offline status to relevant rooms
      if (socket.user.role === 'zone_shop' && socket.user.shopId) {
        socket.to(`zone_${socket.user.zoneId}`).emit('shop_user_offline', {
          userId: socket.user.id,
          shopId: socket.user.shopId,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Setup order-specific event handlers
   */
  setupOrderEventHandlers(socket) {
    // Order tracking subscription - use TRACK_ORDER event
    socket.on(ROOM_EVENTS.TRACK_ORDER, (data) => {
      const { orderNumber, customerPhone } = data;
      if (orderNumber) {
        const trackingRoom = ROOM_NAMES.ORDER_TRACKING(orderNumber);
        socket.join(trackingRoom);
        
        // Enhanced logging for debugging
        const socketsInRoom = this.io.sockets.adapter.rooms.get(trackingRoom);
        logger.info('🔔 Customer joined order tracking room', {
          socketId: socket.id,
          orderNumber,
          trackingRoom,
          customerPhone,
          userId: socket.user?.id,
          allSocketRooms: Array.from(socket.rooms),
          totalSocketsInTrackingRoom: socketsInRoom ? socketsInRoom.size : 0,
          socketIdsInRoom: socketsInRoom ? Array.from(socketsInRoom) : []
        });
        
        logger.debug('User subscribed to order tracking', {
          userId: socket.user?.id,
          orderNumber,
          room: trackingRoom,
          socketId: socket.id
        });
        
        // Send confirmation back to client
        socket.emit(ROOM_EVENTS.ROOM_JOINED, { 
          room: trackingRoom, 
          roomType: 'tracking', 
          roomId: orderNumber 
        });
      }
    });

    // Stop tracking order
    socket.on(ROOM_EVENTS.STOP_TRACKING_ORDER, (data) => {
      const { orderNumber } = data;
      if (orderNumber) {
        const trackingRoom = ROOM_NAMES.ORDER_TRACKING(orderNumber);
        socket.leave(trackingRoom);
        logger.debug('User stopped tracking order', {
          userId: socket.user?.id,
          orderNumber,
          room: trackingRoom,
          socketId: socket.id
        });
        socket.emit(ROOM_EVENTS.ROOM_LEFT, { room: trackingRoom, roomType: 'tracking', roomId: orderNumber });
      }
    });
  }

  /**
   * Setup zone-specific event handlers
   */
  setupZoneEventHandlers(socket) {
    // Zone order monitoring for zone admins
    socket.on(ROOM_EVENTS.SUBSCRIBE_ZONE_ORDERS, (data) => {
      const { zoneId } = data;
      if (zoneId && (socket.user?.role === 'zone_admin' || socket.user?.role === 'admin')) {
        const zoneRoom = ROOM_NAMES.ZONE(zoneId);
        socket.join(zoneRoom);
        logger.debug('User subscribed to zone order monitoring', {
          userId: socket.user?.id,
          zoneId,
          room: zoneRoom,
          socketId: socket.id
        });
        socket.emit(ROOM_EVENTS.ROOM_JOINED, { room: zoneRoom, roomType: 'zone', roomId: zoneId });
      }
    });

    // Unsubscribe from zone orders
    socket.on(ROOM_EVENTS.UNSUBSCRIBE_ZONE_ORDERS, (data) => {
      const { zoneId } = data;
      if (zoneId) {
        const zoneRoom = ROOM_NAMES.ZONE(zoneId);
        socket.leave(zoneRoom);
        logger.debug('User unsubscribed from zone orders', {
          userId: socket.user?.id,
          zoneId,
          room: zoneRoom,
          socketId: socket.id
        });
        socket.emit(ROOM_EVENTS.ROOM_LEFT, { room: zoneRoom, roomType: 'zone', roomId: zoneId });
      }
    });
  }

  /**
   * Setup shop-specific event handlers
   */
  setupShopEventHandlers(socket) {
    // Shop order monitoring for shop owners/vendors
    socket.on(ROOM_EVENTS.SUBSCRIBE_SHOP_ORDERS, (data) => {
      const { shopId } = data;
      if (shopId && (socket.user?.role === 'zone_shop' || socket.user?.role === 'zone_vendor')) {
        const shopRoom = ROOM_NAMES.SHOP(shopId);
        socket.join(shopRoom);
        logger.debug('User subscribed to shop order monitoring', {
          userId: socket.user?.id,
          shopId,
          room: shopRoom,
          socketId: socket.id
        });
        socket.emit(ROOM_EVENTS.ROOM_JOINED, { room: shopRoom, roomType: 'shop', roomId: shopId });
      }
    });

    // Unsubscribe from shop orders
    socket.on(ROOM_EVENTS.UNSUBSCRIBE_SHOP_ORDERS, (data) => {
      const { shopId } = data;
      if (shopId) {
        const shopRoom = ROOM_NAMES.SHOP(shopId);
        socket.leave(shopRoom);
        logger.debug('User unsubscribed from shop orders', {
          userId: socket.user?.id,
          shopId,
          room: shopRoom,
          socketId: socket.id
        });
        socket.emit(ROOM_EVENTS.ROOM_LEFT, { room: shopRoom, roomType: 'shop', roomId: shopId });
      }
    });

    // Shop status updates
    socket.on('update_shop_status', (data) => {
      const { shopId, status } = data;
      if (shopId && socket.user?.shopId === shopId) {
        const zoneRoom = ROOM_NAMES.ZONE(socket.user.zoneId);
        socket.to(zoneRoom).emit(SHOP_EVENTS.SHOP_STATUS_UPDATED, {
          shopId,
          status,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Setup customer-specific event handlers
   */
  setupCustomerEventHandlers(socket) {
    // Customer order tracking - use TRACK_ORDER event (same as setupOrderEventHandlers)
    // This is a duplicate handler for backward compatibility
    socket.on(ROOM_EVENTS.TRACK_ORDER, (data) => {
      const { orderNumber, customerPhone } = data;
      if (orderNumber && customerPhone) {
        const trackingRoom = ROOM_NAMES.ORDER_TRACKING(orderNumber);
        socket.join(trackingRoom);
        logger.debug('Customer subscribed to order tracking', {
          orderNumber,
          customerPhone,
          room: trackingRoom,
          socketId: socket.id
        });
        socket.emit(ROOM_EVENTS.ROOM_JOINED, { room: trackingRoom, roomType: 'tracking', roomId: orderNumber });
      }
    });

    // Stop tracking order
    socket.on(ROOM_EVENTS.STOP_TRACKING_ORDER, (data) => {
      const { orderNumber } = data;
      if (orderNumber) {
        const trackingRoom = ROOM_NAMES.ORDER_TRACKING(orderNumber);
        socket.leave(trackingRoom);
        logger.debug('Customer stopped tracking order', {
          orderNumber,
          room: trackingRoom,
          socketId: socket.id
        });
        socket.emit(ROOM_EVENTS.ROOM_LEFT, { room: trackingRoom, roomType: 'tracking', roomId: orderNumber });
      }
    });
  }

  // Enhanced notification methods for multi-shop zone orders
  addUserToRoom(userId, roomName) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(roomName);
        logger.info('User added to room', { userId, roomName });
      }
    }
  }

  removeUserFromRoom(userId, roomName) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(roomName);
        logger.info('User removed from room', { userId, roomName });
      }
    }
  }

  // Multi-shop zone order specific notifications
  notifyZoneOrderCreated(zoneId, orderData) {
    const eventData = {
      ...orderData,
      timestamp: new Date(),
      eventId: `zone_order_created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    const zoneRoom = ROOM_NAMES.ZONE(zoneId);
    this.io.to(zoneRoom).emit(ORDER_EVENTS.NEW_ORDER, eventData);
    logger.debug('Zone order created notification sent', { zoneId, room: zoneRoom, event: ORDER_EVENTS.NEW_ORDER });
    return true;
  }

  notifyShopOrderReceived(shopId, orderData) {
    const eventData = {
      ...orderData,
      timestamp: new Date(),
      eventId: `shop_order_received_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    const shopRoom = ROOM_NAMES.SHOP(shopId);
    this.io.to(shopRoom).emit(ORDER_EVENTS.NEW_ORDER, eventData);
    logger.debug('Shop order received notification sent', { shopId, room: shopRoom, event: ORDER_EVENTS.NEW_ORDER });
    return true;
  }

  notifyOrderStatusUpdate(orderNumber, statusData) {
    const eventData = {
      ...statusData,
      timestamp: new Date(),
      eventId: `order_status_updated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    // Notify tracking room
    const trackingRoom = ROOM_NAMES.ORDER_TRACKING(orderNumber);
    this.io.to(trackingRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, eventData);
    logger.debug('Order status update notification sent', { orderNumber, room: trackingRoom, event: ORDER_EVENTS.ORDER_STATUS_UPDATED });
    return true;
  }

  notifyZoneOrderProgress(zoneId, progressData) {
    const eventData = {
      ...progressData,
      timestamp: new Date(),
      eventId: `zone_order_progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    this.io.to(`zone_orders_${zoneId}`).emit('zone_order_progress', eventData);
    return true;
  }

  notifyCustomerOrderUpdate(customerPhone, orderData) {
    const eventData = {
      ...orderData,
      timestamp: new Date(),
      eventId: `customer_order_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    this.io.to(`customer_${customerPhone}`).emit('customer_order_update', eventData);
    return true;
  }

  async broadcastOrderUpdate(orderId, updateData) {
    // ✅ FIX: emit FLAT data, not wrapped in { type, data: {...} }
    // Frontend's handleOrderStatusChange reads data.orderNumber, data.status directly
    const broadcastData = {
      ...updateData,
      _id: orderId,
      orderId: orderId,
      timestamp: new Date().toISOString()
    };

    // Notify the customer tracking room (primary fix)
    if (updateData.orderNumber) {
      const trackingRoom = ROOM_NAMES.ORDER_TRACKING(updateData.orderNumber);
      this.io.to(trackingRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, broadcastData);
      logger.info('Emitted to tracking room', { trackingRoom, status: updateData.status });
    } else {
      logger.warn('broadcastOrderUpdate called without orderNumber — tracking room skipped', { orderId });
    }

    // Also notify the restaurant/zone/shop rooms
    try {
      const order = await Order.findById(orderId);
      if (order) {
        if (order.restaurantId) {
          const restaurantRoom = ROOM_NAMES.RESTAURANT(order.restaurantId);
          this.io.to(restaurantRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, broadcastData);
        }
        if (order.zoneId) {
          const zoneRoom = ROOM_NAMES.ZONE(order.zoneId);
          this.io.to(zoneRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, broadcastData);
        }
        if (order.shopId) {
          const shopRoom = ROOM_NAMES.SHOP(order.shopId);
          this.io.to(shopRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, broadcastData);
        }
      }
    } catch (error) {
      logger.error('Error broadcasting order update to owner rooms', { orderId, error: error.message });
    }

    logger.info('Order update broadcasted', { orderId, status: updateData.status });
  }

  // ... (rest of the file remains the same)
}

module.exports = new SocketService();