const socketService = require('./socketService');
const notificationService = require('./notificationService');
const { Order, Restaurant, Zone, ZoneShop, User } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const { ORDER_EVENTS, ROOM_NAMES } = require('../constants/socketEvents');

class RealtimeOrderService {
  constructor() {
    this.activeConnections = new Map();
    this.orderSubscriptions = new Map();
  }

  /**
   * Handle new order creation with real-time notifications
   */
  async handleOrderCreated(order) {
    try {
      // Store order in database (already done in controller)

      // Send real-time notifications based on order type
      if (order.restaurantId) {
        await this.notifyRestaurant(order.restaurantId, order);
      } else if (order.zoneId) {
        await this.notifyZone(order.zoneId, order);
      }

      // Notify customer
      await this.notifyCustomer(order.customer, order, 'order_created');

      logger.info('Real-time order creation handled', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        type: order.restaurantId ? 'restaurant' : 'zone'
      });

    } catch (error) {
      logger.error('Failed to handle real-time order creation:', error);
      throw error;
    }
  }

  /**
   * Handle order status updates with real-time notifications
   */
  async handleOrderStatusUpdate(orderId, newStatus, updateInfo = {}) {
    try {
      // Get updated order from database
      const order = await Order.findById(orderId)
        .populate('restaurantId', 'name ownerId')
        .populate('zoneId', 'name ownerId');

      if (!order) {
        throw new Error('Order not found');
      }

      // Send real-time notifications
      if (order.restaurantId) {
        await this.notifyRestaurant(order.restaurantId._id, order);
      } else if (order.zoneId) {
        await this.notifyZone(order.zoneId._id, order);
      }

      // Notify customer of status change
      await this.notifyCustomer(order.customer, order, 'status_updated');

      logger.info('Real-time order status update handled', {
        orderId,
        orderNumber: order.orderNumber,
        oldStatus: updateInfo.oldStatus,
        newStatus,
        updatedBy: updateInfo.updatedBy
      });

    } catch (error) {
      logger.error('Failed to handle real-time order status update:', error);
      throw error;
    }
  }

  /**
   * Notify restaurant of order updates
   */
  async notifyRestaurant(restaurantId, order) {
    try {
      // Check if socketService is available and has getIO method
      if (typeof socketService !== 'undefined' && socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (!io) return;

        const orderData = {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          tableNumber: order.tableNumber,
          customer: {
            name: order.customer.name,
            phone: order.customer.phone
          },
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            status: item.status,
            specialInstructions: item.specialInstructions
          })),
          total: order.pricing.total,
          estimatedTime: order.delivery.estimatedTime,
          specialInstructions: order.specialInstructions,
          timestamp: new Date()
        };

        // Emit events based on order status
        // Use ONLY _isNewOrder flag (set explicitly after creation)
        const isNewOrder = order._isNewOrder === true;

        const restaurantRoom = ROOM_NAMES.RESTAURANT(restaurantId);

        if (isNewOrder) {
          // New order - emit NEW_ORDER event
          io.to(restaurantRoom).emit(ORDER_EVENTS.NEW_ORDER, orderData);
          logger.info('🔔 NEW ORDER notification sent to restaurant', {
            restaurantId,
            orderNumber: order.orderNumber,
            room: restaurantRoom,
            event: ORDER_EVENTS.NEW_ORDER
          });
        } else {
          // Status update - emit ORDER_STATUS_UPDATED event
          const statusUpdateData = {
            ...orderData,
            previousStatus: order.previousStatus,
            newStatus: order.status
          };
          
          io.to(restaurantRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, statusUpdateData);
          logger.info('📝 Order status update sent to restaurant', {
            restaurantId,
            orderNumber: order.orderNumber,
            room: restaurantRoom,
            event: ORDER_EVENTS.ORDER_STATUS_UPDATED,
            oldStatus: order.previousStatus,
            newStatus: order.status
          });
        }

        // Also notify admin dashboard
        const adminNotificationData = {
          restaurantId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.pricing.total,
          restaurantName: order.restaurantName,
          timestamp: new Date()
        };

        const adminRoom = ROOM_NAMES.ADMIN_DASHBOARD;

        if (isNewOrder) {
          // New order - notify admin
          io.to(adminRoom).emit(ORDER_EVENTS.NEW_ORDER, adminNotificationData);
          logger.info('🔔 NEW ORDER notification sent to admin dashboard', {
            restaurantId,
            orderNumber: order.orderNumber,
            room: adminRoom,
            event: ORDER_EVENTS.NEW_ORDER
          });
        } else {
          // Order update - notify admin
          io.to(adminRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, {
            ...adminNotificationData,
            previousStatus: order.previousStatus,
            newStatus: order.status
          });
          logger.info('📝 Order update sent to admin dashboard', {
            restaurantId,
            orderNumber: order.orderNumber,
            room: adminRoom,
            event: ORDER_EVENTS.ORDER_STATUS_UPDATED
          });
        }
      } else {
      }

      logger.info('Restaurant notification sent', {
        restaurantId,
        orderId: order._id,
        status: order.status
      });

    } catch (error) {
      logger.error('Failed to notify restaurant:', error);
    }
  }

  /**
   * Notify zone and shops of order updates
   */
  async notifyZone(zoneId, order) {
    try {
      // Check if socketService is available and has getIO method
      if (typeof socketService !== 'undefined' && socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (!io) return;

        const orderData = {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          tableNumber: order.tableNumber,
          customer: {
            name: order.customer.name,
            phone: order.customer.phone
          },
          total: order.pricing.total,
          shopCount: order.shopOrders?.length || 0,
          timestamp: new Date(),
          zoneId: zoneId,
          zoneName: order.zoneName
        };

        // Use ONLY _isNewOrder flag (set explicitly after creation)
        const isNewOrder = order._isNewOrder === true;

        const zoneRoom = ROOM_NAMES.ZONE(zoneId);

        if (isNewOrder) {
          // New order - emit NEW_ORDER event
          io.to(zoneRoom).emit(ORDER_EVENTS.NEW_ORDER, orderData);
          logger.info('🔔 NEW ORDER notification sent to zone', {
            zoneId,
            orderNumber: order.orderNumber,
            room: zoneRoom,
            event: ORDER_EVENTS.NEW_ORDER
          });
        } else {
          // Status update - emit ORDER_STATUS_UPDATED event
          const statusUpdateData = {
            ...orderData,
            previousStatus: order.previousStatus,
            newStatus: order.status
          };
          
          io.to(zoneRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, statusUpdateData);
          logger.info('📝 Order status update sent to zone', {
            zoneId,
            orderNumber: order.orderNumber,
            room: zoneRoom,
            event: ORDER_EVENTS.ORDER_STATUS_UPDATED,
            oldStatus: order.previousStatus,
            newStatus: order.status
          });
        }

        // If this is a shop order, notify the specific shop
        if (order.shopId) {
          const shopOrderData = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            tableNumber: order.tableNumber,
            customer: {
              name: order.customer.name,
              phone: order.customer.phone
            },
            items: order.items,
            total: order.pricing.total,
            estimatedTime: order.delivery?.estimatedTime,
            specialInstructions: order.specialInstructions,
            timestamp: new Date(),
            shopId: order.shopId,
            shopName: order.shopName,
            zoneId: zoneId
          };

          const shopRoom = ROOM_NAMES.SHOP(order.shopId);

          if (isNewOrder) {
            // New order - emit to shop
            io.to(shopRoom).emit(ORDER_EVENTS.NEW_ORDER, shopOrderData);
            logger.info('🔔 NEW ORDER notification sent to shop', {
              shopId: order.shopId,
              orderNumber: order.orderNumber,
              room: shopRoom,
              event: ORDER_EVENTS.NEW_ORDER
            });
          } else {
            // Status update - emit to shop
            const statusUpdateData = {
              ...shopOrderData,
              previousStatus: order.previousStatus,
              newStatus: order.status
            };
            
            io.to(shopRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, statusUpdateData);
            logger.info('📝 Order status update sent to shop', {
              shopId: order.shopId,
              orderNumber: order.orderNumber,
              room: shopRoom,
              event: ORDER_EVENTS.ORDER_STATUS_UPDATED
            });
          }
        }

        // Also notify admin dashboard about zone orders
        const adminZoneNotificationData = {
          zoneId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.pricing.total,
          zoneName: order.zoneName,
          shopCount: order.shopOrders?.length || 0,
          timestamp: new Date()
        };

        const adminRoom = ROOM_NAMES.ADMIN_DASHBOARD;

        if (isNewOrder) {
          // New zone order - notify admin
          io.to(adminRoom).emit(ORDER_EVENTS.NEW_ORDER, adminZoneNotificationData);
          logger.info('🔔 NEW ZONE ORDER notification sent to admin dashboard', {
            zoneId,
            orderNumber: order.orderNumber,
            room: adminRoom,
            event: ORDER_EVENTS.NEW_ORDER
          });
        } else {
          // Zone order update - notify admin
          io.to(adminRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, {
            ...adminZoneNotificationData,
            previousStatus: order.previousStatus,
            newStatus: order.status
          });
          logger.info('📝 Zone order update sent to admin dashboard', {
            zoneId,
            orderNumber: order.orderNumber,
            room: adminRoom,
            event: ORDER_EVENTS.ORDER_STATUS_UPDATED
          });
        }
      } else {
      }

      logger.info('Zone notification sent', {
        zoneId,
        orderId: order._id,
        status: order.status,
        shopId: order.shopId
      });

    } catch (error) {
      logger.error('Failed to notify zone:', error);
    }
  }

  /**
   * Notify customer of order updates
   */
  async notifyCustomer(customer, order, eventType = 'order_update') {
    try {
      // Check if socketService is available and has getIO method
      if (typeof socketService !== 'undefined' && socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (!io || !customer.phone) return;

        // Use standardized notification data structure
        const notificationData = {
          _id: order._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          previousStatus: order.previousStatus,
          estimatedTime: order.delivery?.estimatedTime,
          total: order.pricing?.total,
          customer: {
            phone: customer.phone
          },
          customerPhone: customer.phone,
          timestamp: new Date()
        };

        // PRIMARY: Use tracking room by order number (MOST IMPORTANT)
        const trackingRoom = ROOM_NAMES.ORDER_TRACKING(order.orderNumber);

        logger.info('Sending customer notification to PRIMARY tracking room', {
          customerPhone: customer.phone,
          orderId: order._id,
          orderNumber: order.orderNumber,
          eventType,
          status: order.status,
          room: trackingRoom
        });

        // Determine which event to emit based on eventType
        let socketEvent;
        switch (eventType) {
          case 'order_created':
            socketEvent = ORDER_EVENTS.ORDER_CREATED;
            break;
          case 'status_updated':
            socketEvent = ORDER_EVENTS.ORDER_STATUS_UPDATED;
            break;
          default:
            socketEvent = ORDER_EVENTS.ORDER_STATUS_UPDATED;
        }

        // Emit to PRIMARY tracking room ONLY
        io.to(trackingRoom).emit(socketEvent, notificationData);

        // Enhanced logging for debugging
        const socketsInRoom = io.sockets.adapter.rooms.get(trackingRoom);
        logger.info('✅ Customer notification emitted to tracking room', {
          room: trackingRoom,
          event: socketEvent,
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          previousStatus: order.previousStatus,
          customerPhone: customer.phone,
          totalSocketsInRoom: socketsInRoom ? socketsInRoom.size : 0,
          socketIdsInRoom: socketsInRoom ? Array.from(socketsInRoom) : [],
          notificationDataKeys: Object.keys(notificationData)
        });
        
        // WARNING: If no sockets in room
        if (!socketsInRoom || socketsInRoom.size === 0) {
          logger.warn('⚠️ NO SOCKETS IN TRACKING ROOM - Customer may not be connected', {
            trackingRoom,
            orderNumber: order.orderNumber,
            customerPhone: customer.phone,
            allRooms: Array.from(io.sockets.adapter.rooms.keys())
          });
        }

      } else {
      }

      logger.info('Customer notification sent', {
        customerPhone: customer.phone,
        orderId: order._id,
        eventType,
        status: order.status,
        rooms: [`customer_${customer.phone}`, `order_${order._id}`, `tracking_${order.orderNumber}`]
      });

    } catch (error) {
      logger.error('Failed to notify customer:', error);
    }
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(status) {
    const messages = {
      'confirmed': 'Your order has been confirmed and is being prepared',
      'preparing': 'Your order is being prepared',
      'ready': 'Your order is ready for pickup/delivery',
      'completed': 'Your order has been completed',
      'cancelled': 'Your order has been cancelled'
    };
    return messages[status] || 'Order status updated';
  }

  /**
   * Subscribe user to order updates
   */
  async subscribeToOrder(userId, orderId, socketId) {
    try {
      if (!this.orderSubscriptions.has(orderId)) {
        this.orderSubscriptions.set(orderId, new Set());
      }

      this.orderSubscriptions.get(orderId).add(socketId);
      this.activeConnections.set(socketId, { userId, orderId });

      logger.info('User subscribed to order updates', {
        userId,
        orderId,
        socketId
      });

    } catch (error) {
      logger.error('Failed to subscribe to order updates:', error);
    }
  }

  /**
   * Unsubscribe user from order updates
   */
  async unsubscribeFromOrder(socketId) {
    try {
      const connection = this.activeConnections.get(socketId);
      if (connection) {
        const { orderId } = connection;

        if (this.orderSubscriptions.has(orderId)) {
          this.orderSubscriptions.get(orderId).delete(socketId);

          // Clean up empty subscriptions
          if (this.orderSubscriptions.get(orderId).size === 0) {
            this.orderSubscriptions.delete(orderId);
          }
        }

        this.activeConnections.delete(socketId);

        logger.info('User unsubscribed from order updates', {
          socketId,
          orderId
        });
      }
    } catch (error) {
      logger.error('Failed to unsubscribe from order updates:', error);
    }
  }

  /**
   * Handle order cancellation logic
   */
  async handleOrderCancellation(order) {
    try {
      // Placeholder for refund logic
      if (order.payment?.status === 'paid') {
        logger.info('Initiating refund for order', { orderId: order._id });
        // In a real implementation, you would call a payment service here
        // e.g., await paymentService.refund(order.transactionId);
      }

      // Update inventory if needed
      for (const item of order.items) {
        if (item.menuItemId) {
          // This would be implemented based on your inventory system
          logger.info('Inventory restoration needed for item', {
            menuItemId: item.menuItemId,
            quantity: item.quantity
          });
        }
      }

      // Send cancellation notifications
      if (order.restaurantId) {
        await this.notifyRestaurant(order.restaurantId, order);
      } else if (order.zoneId) {
        await this.notifyZone(order.zoneId, order);
      }

      await this.notifyCustomer(order.customer, order, 'status_updated');

      logger.info('Order cancellation handled', {
        orderId: order._id,
        reason: order.cancellationReason
      });

    } catch (error) {
      logger.error('Failed to handle order cancellation', {
        orderId: order._id,
        error: error.message
      });
    }
  }

  /**
   * Broadcast order update to all relevant parties
   */
  async broadcastOrderUpdate(order, updateType = 'status_change') {
    try {
      // Always store in database first
      await order.save();

      // Then send real-time notifications
      if (order.restaurantId) {
        await this.notifyRestaurant(order.restaurantId, order);
      } else if (order.zoneId) {
        await this.notifyZone(order.zoneId, order);
      }

      await this.notifyCustomer(order.customer, order, 'status_updated');

      // Notify admin dashboard
      const io = socketService.getIO();
      if (io) {
        const adminRoom = ROOM_NAMES.ADMIN_DASHBOARD;
        io.to(adminRoom).emit(ORDER_EVENTS.ORDER_STATUS_UPDATED, {
          _id: order._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          previousStatus: order.previousStatus,
          total: order.pricing.total,
          businessType: order.restaurantId ? 'restaurant' : 'zone',
          businessId: order.restaurantId || order.zoneId,
          updateType,
          timestamp: new Date()
        });
      }

      logger.info('Order update broadcasted', {
        orderId: order._id,
        status: order.status,
        updateType
      });

    } catch (error) {
      logger.error('Failed to broadcast order update:', error);
      throw error;
    }
  }
}

module.exports = new RealtimeOrderService();