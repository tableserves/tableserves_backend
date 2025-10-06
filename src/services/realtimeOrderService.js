const socketService = require('./socketService');
const notificationService = require('./notificationService');
const { Order, Restaurant, Zone, ZoneShop, User } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');

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

        // Emit different events based on order status
        // Check both isNew (Mongoose flag) and _isNewOrder (custom flag)
        const isNewOrder = order._isNewOrder === true || (order.status === 'pending' && order.isNew !== false);

        if (isNewOrder) {
          // New order
          io.to(`restaurant_${restaurantId}`).emit('new_order', orderData);
          logger.info('🔔 NEW ORDER notification sent to restaurant', {
            restaurantId,
            orderNumber: order.orderNumber,
            room: `restaurant_${restaurantId}`
          });
        } else {
          // Order update
          io.to(`restaurant_${restaurantId}`).emit('order_update', orderData);
        }

        // Also emit status change event if status changed
        if (order.previousStatus && order.previousStatus !== order.status) {
          io.to(`restaurant_${restaurantId}`).emit('order_status_changed', {
            ...orderData,
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

        // Reuse the isNewOrder variable from above
        if (isNewOrder) {
          // New order - notify admin
          io.to('admin_dashboard').emit('new_order', adminNotificationData);
          logger.info('🔔 NEW ORDER notification sent to admin dashboard', {
            restaurantId,
            orderNumber: order.orderNumber
          });
        } else {
          // Order update - notify admin
          io.to('admin_dashboard').emit('restaurant_order_update', adminNotificationData);
        }
      } else {
        console.log('SocketService not available for restaurant notification');
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

        // Emit different events based on order status
        const isNewOrder = order._isNewOrder === true || (order.status === 'pending' && order.isNew !== false);

        if (isNewOrder) {
          // New order - emit to zone
          io.to(`zone_${zoneId}`).emit('new_order', orderData);
          logger.info('🔔 NEW ORDER notification sent to zone', {
            zoneId,
            orderNumber: order.orderNumber,
            room: `zone_${zoneId}`
          });
        } else {
          // Order update - emit to zone
          io.to(`zone_${zoneId}`).emit('zone_order_update', orderData);
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
            estimatedTime: order.delivery.estimatedTime,
            specialInstructions: order.specialInstructions,
            timestamp: new Date(),
            shopId: order.shopId,
            shopName: order.shopName,
            zoneId: zoneId
          };

          // Emit different events based on order status
          const isNewShopOrder = order._isNewOrder === true || (order.status === 'pending' && order.isNew !== false);

          if (isNewShopOrder) {
            // New order - emit to shop
            io.to(`shop_${order.shopId}`).emit('new_order', shopOrderData);
            logger.info('🔔 NEW ORDER notification sent to shop', {
              shopId: order.shopId,
              orderNumber: order.orderNumber,
              room: `shop_${order.shopId}`
            });
          } else {
            // Order update - emit to shop
            io.to(`shop_${order.shopId}`).emit('shop_order_update', shopOrderData);
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

        // Reuse the isNewOrder variable from above
        if (isNewOrder) {
          // New zone order - notify admin
          io.to('admin_dashboard').emit('new_order', adminZoneNotificationData);
          logger.info('🔔 NEW ZONE ORDER notification sent to admin dashboard', {
            zoneId,
            orderNumber: order.orderNumber
          });
        } else {
          // Zone order update - notify admin
          io.to('admin_dashboard').emit('zone_order_update', adminZoneNotificationData);
        }
      } else {
        console.log('SocketService not available for zone notification');
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

        const customerRoom = `customer_${customer.phone}`;

        const notificationData = {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          estimatedTime: order.delivery?.estimatedTime,
          total: order.pricing?.total,
          customerPhone: customer.phone, // Include customer phone for better tracking
          timestamp: new Date()
        };

        logger.info('Sending customer notification', {
          customerPhone: customer.phone,
          orderId: order._id,
          orderNumber: order.orderNumber,
          eventType,
          status: order.status,
          room: customerRoom
        });

        // PRIMARY: Emit to tracking room by order number (MOST IMPORTANT)
        // This ensures each order gets its own dedicated real-time update channel
        const trackingRoom = `tracking_${order.orderNumber}`;
        const statusUpdateData = {
          ...notificationData,
          message: this.getStatusMessage(order.status),
          newStatus: order.status,
          oldStatus: order.previousStatus
        };

        // Send appropriate event based on type to PRIMARY room
        switch (eventType) {
          case 'order_created':
            io.to(trackingRoom).emit('order_confirmed', notificationData);
            break;
          case 'status_updated':
            // Emit both event types to the primary tracking room
            io.to(trackingRoom).emit('order_status_updated', statusUpdateData);
            io.to(trackingRoom).emit('order_status_changed', statusUpdateData);

            logger.info('Status update events emitted to PRIMARY tracking room', {
              orderNumber: order.orderNumber,
              room: trackingRoom,
              newStatus: order.status,
              oldStatus: order.previousStatus
            });
            break;
          default:
            io.to(trackingRoom).emit('order_update', notificationData);
        }

        // SECONDARY: Broadcast to order-specific room for direct order tracking
        const orderRoom = `order_${order._id}`;
        io.to(orderRoom).emit('order_status_changed', {
          ...notificationData,
          newStatus: order.status,
          oldStatus: order.previousStatus
        });

        // TERTIARY: Emit to customer phone room for general notifications
        // Note: This is now lower priority to avoid conflicts with multiple orders per phone
        switch (eventType) {
          case 'order_created':
            io.to(customerRoom).emit('order_confirmed', notificationData);
            break;
          case 'status_updated':
            io.to(customerRoom).emit('order_status_updated', statusUpdateData);
            io.to(customerRoom).emit('order_status_changed', statusUpdateData);
            break;
          default:
            io.to(customerRoom).emit('order_update', notificationData);
        }

        logger.info('All order status events emitted with priority order', {
          primaryRoom: trackingRoom,
          secondaryRoom: orderRoom,
          tertiaryRoom: customerRoom,
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        });

      } else {
        console.log('SocketService not available for customer notification');
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
        io.to('admin_dashboard').emit('order_update', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
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