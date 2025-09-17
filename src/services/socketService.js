const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');
const ZoneShop = require('../models/ZoneShop');

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

      // Join role-based rooms
      if (userRole === 'restaurant_owner' && socket.user.restaurantId) {
        socket.join(`restaurant_${socket.user.restaurantId}`);
      } else if (userRole === 'zone_admin' && socket.user.zoneId) {
        socket.join(`zone_${socket.user.zoneId}`);
      } else if ((userRole === 'zone_shop' || userRole === 'zone_vendor') && socket.user.shopId) {
        socket.join(`shop_${socket.user.shopId}`);
        // Also join the zone room for zone-wide notifications
        if (socket.user.zoneId) {
          socket.join(`zone_${socket.user.zoneId}`);
        }
      } else if (userRole === 'admin' || userRole === 'super_admin') {
        socket.join('admin_room');
      }

      // Enhanced customer room management
      if (socket.user.phone) {
        socket.join(`customer_${socket.user.phone}`);
      }

      logger.info('User joined rooms', {
        userId,
        role: userRole,
        rooms: Array.from(socket.rooms)
      });
    }

    // Set up event handlers
    socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
    socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
    socket.on('order_status_update', (data) => this.handleOrderStatusUpdate(socket, data));
    socket.on('restaurant_status_update', (data) => this.handleRestaurantStatusUpdate(socket, data));

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
      socket.emit('error', { message: 'Room type and ID required' });
      return;
    }

    const roomName = `${roomType}_${roomId}`;
    socket.join(roomName);

    logger.info('Socket joined room', {
      socketId: socket.id,
      userId: socket.user?.id,
      room: roomName
    });

    socket.emit('room_joined', { room: roomName });
  }

  handleLeaveRoom(socket, data) {
    const { roomType, roomId } = data;

    if (!roomType || !roomId) {
      socket.emit('error', { message: 'Room type and ID required' });
      return;
    }

    const roomName = `${roomType}_${roomId}`;
    socket.leave(roomName);

    logger.info('Socket left room', {
      socketId: socket.id,
      userId: socket.user?.id,
      room: roomName
    });

    socket.emit('room_left', { room: roomName });
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

      this.broadcastOrderUpdate(orderId, {
        orderId,
        status,
        notes,
        updatedBy: socket.user.id,
        timestamp: new Date().toISOString()
      });

      logger.info('Order status updated via socket', { 
        orderId, 
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
    // Order status update subscription
    socket.on('subscribe_order_updates', (data) => {
      const { orderNumber, customerPhone } = data;
      if (orderNumber) {
        socket.join(`order_${orderNumber}`);
        logger.debug('User subscribed to order updates', {
          userId: socket.user?.id,
          orderNumber,
          socketId: socket.id
        });
      }
    });

    // Unsubscribe from order updates
    socket.on('unsubscribe_order_updates', (data) => {
      const { orderNumber } = data;
      if (orderNumber) {
        socket.leave(`order_${orderNumber}`);
        logger.debug('User unsubscribed from order updates', {
          userId: socket.user?.id,
          orderNumber,
          socketId: socket.id
        });
      }
    });
  }

  /**
   * Setup zone-specific event handlers
   */
  setupZoneEventHandlers(socket) {
    // Zone order monitoring for zone admins
    socket.on('subscribe_zone_orders', (data) => {
      const { zoneId } = data;
      if (zoneId && (socket.user?.role === 'zone_admin' || socket.user?.role === 'admin')) {
        socket.join(`zone_orders_${zoneId}`);
        logger.debug('User subscribed to zone order monitoring', {
          userId: socket.user?.id,
          zoneId,
          socketId: socket.id
        });
      }
    });
  }

  /**
   * Setup shop-specific event handlers
   */
  setupShopEventHandlers(socket) {
    // Shop order monitoring for shop owners/vendors
    socket.on('subscribe_shop_orders', (data) => {
      const { shopId } = data;
      if (shopId && (socket.user?.role === 'zone_shop' || socket.user?.role === 'zone_vendor')) {
        socket.join(`shop_orders_${shopId}`);
        logger.debug('User subscribed to shop order monitoring', {
          userId: socket.user?.id,
          shopId,
          socketId: socket.id
        });
      }
    });

    // Shop status updates
    socket.on('update_shop_status', (data) => {
      const { shopId, status } = data;
      if (shopId && socket.user?.shopId === shopId) {
        socket.to(`zone_${socket.user.zoneId}`).emit('shop_status_updated', {
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
    // Customer order tracking
    socket.on('track_order', (data) => {
      const { orderNumber, customerPhone } = data;
      if (orderNumber && customerPhone) {
        socket.join(`customer_order_${orderNumber}`);
        logger.debug('Customer subscribed to order tracking', {
          orderNumber,
          customerPhone,
          socketId: socket.id
        });
      }
    });

    // Stop tracking order
    socket.on('stop_tracking_order', (data) => {
      const { orderNumber } = data;
      if (orderNumber) {
        socket.leave(`customer_order_${orderNumber}`);
        logger.debug('Customer stopped tracking order', {
          orderNumber,
          socketId: socket.id
        });
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
    this.io.to(`zone_${zoneId}`).emit('zone_order_created', eventData);
    return true;
  }

  notifyShopOrderReceived(shopId, orderData) {
    const eventData = {
      ...orderData,
      timestamp: new Date(),
      eventId: `shop_order_received_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    this.io.to(`shop_${shopId}`).emit('shop_order_received', eventData);
    return true;
  }

  notifyOrderStatusUpdate(orderNumber, statusData) {
    const eventData = {
      ...statusData,
      timestamp: new Date(),
      eventId: `order_status_updated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    // Notify all subscribers to this order
    this.io.to(`order_${orderNumber}`).emit('order_status_updated', eventData);
    this.io.to(`customer_order_${orderNumber}`).emit('order_status_updated', eventData);
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
    const broadcastData = {
      type: 'order_updated',
      data: updateData,
      timestamp: new Date().toISOString()
    };

    this.io.to(`order_${orderId}`).emit('order_updated', broadcastData);

    try {
      const order = await Order.findById(orderId);
      if (order) {
        if (order.restaurantId) {
          this.io.to(`restaurant_${order.restaurantId}`).emit('order_updated', broadcastData);
        }
        if (order.zoneId) {
          this.io.to(`zone_${order.zoneId}`).emit('order_updated', broadcastData);
        }
        if (order.shopId) {
          this.io.to(`shop_${order.shopId}`).emit('order_updated', broadcastData);
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