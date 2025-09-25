const { Order, Zone, ZoneShop, User, MenuItem } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');
const socketService = require('./socketService');
const orderCacheService = require('./orderCacheService');
const mongoose = require('mongoose');

/**
 * Multi-Shop Order Tracking Service
 * 
 * Comprehensive service for managing multi-shop zone-based order tracking system
 * Features:
 * - Atomic transaction support for order creation
 * - Real-time status coordination across multiple shops
 * - Parent-child order relationship management
 * - Enhanced error handling and recovery
 * - Performance optimization for concurrent operations
 */
class MultiShopOrderTrackingService {

  /**
   * Create a new multi-shop zone order with atomic transactions
   * @param {Object} orderData - Complete order data
   * @returns {Object} - Created order result with shop splits
   */
  static async createMultiShopZoneOrder(orderData) {
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(async () => {
        const {
          zoneId,
          tableNumber,
          customer,
          items,
          pricing,
          paymentMethod,
          specialInstructions
        } = orderData;

        // Validate zone exists and is active
        const zone = await Zone.findById(zoneId).session(session);
        if (!zone) {
          throw new APIError('Zone not found', 404);
        }

        if (zone.status !== 'active') {
          throw new APIError('Zone is not currently accepting orders', 400);
        }

        // Group items by shop with enhanced validation
        const shopGroups = await this.groupItemsByShop(items, zoneId, session);

        if (shopGroups.length === 0) {
          throw new APIError('No valid shops found for the ordered items', 400);
        }

        // Validate that all shops are active and can fulfill orders
        await this.validateShopsForOrder(shopGroups, session);

        // Generate main order number with unique code for traceability
        const { orderNumber: mainOrderNumber, uniqueCode } = await Order.generateZoneMainOrderNumber();

        logger.info('Creating multi-shop zone order', {
          mainOrderNumber,
          uniqueCode,
          zoneId,
          shopCount: shopGroups.length,
          totalItems: items.length,
          totalAmount: pricing.total
        });

        // Create main zone order (parent order for customer tracking and billing)
        const mainOrder = new Order({
          orderNumber: mainOrderNumber,
          orderType: 'zone_main',
          zoneId: zoneId,
          tableNumber: tableNumber,
          customer: customer,
          items: items,
          pricing: pricing,
          payment: {
            method: paymentMethod,
            status: 'pending'
          },
          status: 'pending',
          delivery: {
            type: 'table_service',
            estimatedTime: Math.max(...shopGroups.map(g => g.estimatedTime || 20)),
            instructions: specialInstructions || ''
          },
          specialInstructions: specialInstructions,
          childOrderIds: [],
          shopOrderSummary: {
            totalShops: shopGroups.length,
            completedShops: 0,
            readyShops: 0,
            preparingShops: 0,
            cancelledShops: 0
          },
          traceability: {
            uniqueTraceCode: uniqueCode
          }
        });

        await mainOrder.save({ session });

        // Create individual shop orders with enhanced error handling
        const shopOrders = [];
        let totalEstimatedTime = 0;

        for (let i = 0; i < shopGroups.length; i++) {
          const shopGroup = shopGroups[i];

          try {
            // Generate shop order number with traceability to main order
            const shopOrderNumber = await Order.generateShopOrderNumber(uniqueCode);

            // Calculate shop-specific pricing with precision
            const shopSubtotal = shopGroup.items.reduce((sum, item) => {
              return sum + (parseFloat(item.price) * parseInt(item.quantity));
            }, 0);

            const taxRate = pricing.tax?.rate || 0;
            const serviceFeeRate = pricing.serviceFee?.rate || 0;

            const shopTaxAmount = shopSubtotal * taxRate;
            const shopServiceFee = shopSubtotal * serviceFeeRate;
            const shopTotal = shopSubtotal + shopTaxAmount + shopServiceFee;

            const shopOrder = new Order({
              orderNumber: shopOrderNumber,
              orderType: 'zone_shop',
              parentOrderId: mainOrder._id,
              zoneId: zoneId,
              shopId: shopGroup.shopId,
              tableNumber: tableNumber,
              customer: customer,
              items: shopGroup.items,
              pricing: {
                subtotal: Math.round(shopSubtotal * 100) / 100,
                tax: {
                  rate: taxRate,
                  amount: Math.round(shopTaxAmount * 100) / 100
                },
                serviceFee: {
                  rate: serviceFeeRate,
                  amount: Math.round(shopServiceFee * 100) / 100
                },
                total: Math.round(shopTotal * 100) / 100,
                currency: pricing.currency || 'USD'
              },
              payment: {
                method: paymentMethod,
                status: 'pending',
                parentPayment: mainOrder._id
              },
              status: 'pending',
              delivery: {
                type: 'table_service',
                estimatedTime: shopGroup.estimatedTime || 20,
                instructions: specialInstructions || ''
              },
              specialInstructions: specialInstructions,
              traceability: {
                parentOrderNumber: mainOrderNumber,
                uniqueTraceCode: uniqueCode,
                shopSequence: i + 1
              }
            });

            await shopOrder.save({ session });
            shopOrders.push(shopOrder);

            // Update main order with child order reference
            mainOrder.childOrderIds.push(shopOrder._id);

            totalEstimatedTime = Math.max(totalEstimatedTime, shopGroup.estimatedTime || 20);

            logger.info('Shop order created successfully', {
              shopOrderNumber,
              parentOrderNumber: mainOrderNumber,
              shopId: shopGroup.shopId,
              itemCount: shopGroup.items.length,
              shopTotal
            });

          } catch (shopError) {
            logger.error('Failed to create shop order', {
              shopId: shopGroup.shopId,
              error: shopError.message,
              mainOrderNumber
            });
            throw new APIError(`Failed to create order for shop ${shopGroup.shopName}: ${shopError.message}`, 500);
          }
        }

        // Update main order with final details
        mainOrder.delivery.estimatedTime = totalEstimatedTime;
        await mainOrder.save({ session });

        loggerUtils.logBusiness('Multi-shop zone order created successfully', mainOrder._id, {
          zoneId,
          shopCount: shopOrders.length,
          totalAmount: pricing.total,
          orderNumber: mainOrderNumber,
          uniqueCode
        });

        return {
          success: true,
          mainOrder: mainOrder.toObject(),
          shopOrders: shopOrders.map(order => order.toObject()),
          message: `Order created and split across ${shopOrders.length} shops`,
          orderNumber: mainOrderNumber,
          estimatedTime: totalEstimatedTime
        };
      });

      // Send real-time notifications after successful transaction
      await this.sendOrderCreationNotifications(result.mainOrder, result.shopOrders);

      // Cache the created order data for faster retrieval with graceful fallback
      try {
        await orderCacheService.cacheOrderTracking(result.mainOrder._id, {
          parentOrder: result.mainOrder,
          childOrders: result.shopOrders,
          overallProgress: 0,
          timeline: [{
            timestamp: new Date().toISOString(),
            event: 'Order created',
            status: 'pending',
            description: `Multi-shop order created across ${result.shopOrders.length} shops`
          }]
        });
        logger.debug('New order data cached successfully');
      } catch (cacheError) {
        logger.warn('Failed to cache new order data, continuing without cache', {
          orderNumber: result.mainOrder.orderNumber,
          cacheError: cacheError.message
        });
      }

      return result;

    } catch (error) {
      logger.error('Multi-shop zone order creation failed', {
        error: error.message,
        stack: error.stack,
        orderData: { ...orderData, items: `${orderData.items?.length} items` }
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(`Failed to create multi-shop zone order: ${error.message}`, 500);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update shop order status with parent order synchronization
   * @param {String} shopOrderId - Shop order ID
   * @param {String} newStatus - New status
   * @param {String} updatedBy - User who updated the status
   * @param {Object} additionalData - Additional update data
   * @returns {Object} - Update result
   */
  static async updateShopOrderStatus(shopOrderId, newStatus, updatedBy = null, additionalData = {}) {
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(async () => {
        // Find and validate shop order
        const shopOrder = await Order.findById(shopOrderId).session(session);
        if (!shopOrder) {
          throw new APIError('Shop order not found', 404);
        }

        if (shopOrder.orderType !== 'zone_shop' && shopOrder.orderType !== 'shop_split') {
          throw new APIError('Order is not a shop order', 400);
        }

        // Validate status transition
        this.validateStatusTransition(shopOrder.status, newStatus);

        const oldStatus = shopOrder.status;

        // Update shop order status (without saving yet)
        shopOrder.updateStatus(newStatus, updatedBy, additionalData.notes || '', session);

        // CRITICAL: Ensure shop order is saved with new status BEFORE parent update
        await shopOrder.save({ session });

        logger.debug('Shop order status updated and saved', {
          shopOrderId,
          shopOrderNumber: shopOrder.orderNumber,
          oldStatus,
          newStatus,
          updatedBy
        });

        // Find and update parent order
        const parentOrder = await Order.findById(shopOrder.parentOrderId).session(session);

        if (parentOrder && parentOrder.orderType === 'zone_main') {
          // Update parent order status based on all child orders
          await parentOrder.updateZoneMainStatus();
          await parentOrder.save({ session });

          logger.info('Shop order status updated with parent synchronization', {
            shopOrderId,
            shopOrderNumber: shopOrder.orderNumber,
            oldStatus,
            newStatus,
            parentOrderId: parentOrder._id,
            parentOrderNumber: parentOrder.orderNumber,
            parentNewStatus: parentOrder.status,
            updatedBy
          });

          return {
            shopOrder: shopOrder.toObject(),
            parentOrder: parentOrder.toObject(),
            statusChanged: oldStatus !== newStatus,
            parentStatusChanged: true
          };
        }

        return {
          shopOrder: shopOrder.toObject(),
          parentOrder: null,
          statusChanged: oldStatus !== newStatus,
          parentStatusChanged: false
        };
      });

      // Send real-time notifications after successful transaction
      await this.sendStatusUpdateNotifications(result.shopOrder, result.parentOrder, updatedBy);

      // Invalidate related cache entries with graceful fallback
      try {
        await orderCacheService.invalidateOrderCache(
          result.shopOrder._id,
          result.parentOrder?._id,
          result.parentOrder?.zoneId,
          result.shopOrder.shopId
        );
        logger.debug('Cache invalidated successfully after order status update');
      } catch (cacheError) {
        logger.warn('Failed to invalidate cache after order status update', {
          shopOrderId,
          cacheError: cacheError.message
        });
      }

      return result;

    } catch (error) {
      logger.error('Shop order status update failed', {
        shopOrderId,
        newStatus,
        error: error.message,
        updatedBy
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(`Failed to update shop order status: ${error.message}`, 500);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get comprehensive order tracking information with caching
   * @param {String} orderNumber - Order number (parent or child)
   * @param {String} customerPhone - Customer phone for verification
   * @returns {Object} - Comprehensive tracking information
   */
  static async getOrderTrackingInfo(orderNumber, customerPhone = null) {
    try {
      // Try to get from cache first with graceful fallback
      let cachedData = null;
      try {
        cachedData = await orderCacheService.getCachedOrderTracking(orderNumber);
        if (cachedData) {
          logger.debug('Returning cached order tracking data', { orderNumber });
          return cachedData;
        }
      } catch (cacheError) {
        logger.warn('Cache retrieval failed, proceeding without cache', {
          orderNumber,
          cacheError: cacheError.message
        });
      }

      // Find the order (could be parent or child)
      let order = await Order.findOne({
        orderNumber: orderNumber.toUpperCase(),
        ...(customerPhone && { 'customer.phone': customerPhone })
      })
        .populate('restaurantId', 'name contact')
        .populate('zoneId', 'name settings')
        .populate('shopId', 'name contact');

      if (!order) {
        throw new APIError('Order not found', 404);
      }

      let trackingInfo = {
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
        customer: order.customer,
        tableNumber: order.tableNumber,
        items: order.items,
        pricing: order.pricing,
        timing: order.timing,
        delivery: order.delivery,
        statusHistory: order.statusHistory,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };

      if (order.orderType === 'zone_main') {
        // For parent orders, include child order information
        const childOrders = await Order.find({
          parentOrderId: order._id
        })
          .populate('shopId', 'name contact')
          .sort({ 'traceability.shopSequence': 1 });

        trackingInfo.shopOrders = childOrders.map(childOrder => ({
          orderNumber: childOrder.orderNumber,
          shopId: childOrder.shopId,
          shopName: childOrder.shopId?.name,
          status: childOrder.status,
          items: childOrder.items,
          pricing: childOrder.pricing,
          timing: childOrder.timing,
          estimatedTime: childOrder.delivery?.estimatedTime,
          statusHistory: childOrder.statusHistory
        }));

        trackingInfo.orderProgress = order.getOrderProgress();
        trackingInfo.shopOrderSummary = order.shopOrderSummary;

      } else if (order.orderType === 'zone_shop') {
        // For child orders, include parent order information
        const parentOrder = await Order.findById(order.parentOrderId)
          .populate('zoneId', 'name');

        if (parentOrder) {
          trackingInfo.parentOrder = {
            orderNumber: parentOrder.orderNumber,
            status: parentOrder.status,
            orderProgress: parentOrder.getOrderProgress(),
            shopOrderSummary: parentOrder.shopOrderSummary,
            estimatedTime: parentOrder.delivery?.estimatedTime
          };

          // Get sibling orders for comprehensive view
          const siblingOrders = await Order.find({
            parentOrderId: parentOrder._id,
            _id: { $ne: order._id }
          })
            .populate('shopId', 'name')
            .select('orderNumber shopId status timing delivery.estimatedTime')
            .sort({ 'traceability.shopSequence': 1 });

          trackingInfo.siblingOrders = siblingOrders.map(sibling => ({
            orderNumber: sibling.orderNumber,
            shopName: sibling.shopId?.name,
            status: sibling.status,
            estimatedTime: sibling.delivery?.estimatedTime
          }));
        }

        trackingInfo.traceability = order.traceability;
      }

      // Add real-time update capabilities
      trackingInfo.realTimeUpdates = {
        enabled: true,
        updateInterval: 30000, // 30 seconds
        lastUpdate: new Date().toISOString()
      };

      // Cache the tracking information for future requests with graceful fallback
      try {
        await orderCacheService.cacheOrderTracking(order._id, trackingInfo);
        logger.debug('Order tracking data cached successfully', { orderNumber });
      } catch (cacheError) {
        logger.warn('Failed to cache order tracking data, continuing without cache', {
          orderNumber,
          cacheError: cacheError.message
        });
      }

      return trackingInfo;

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      logger.error('Failed to get order tracking info', {
        orderNumber,
        error: error.message
      });

      throw new APIError(`Failed to retrieve order tracking information: ${error.message}`, 500);
    }
  }

  /**
   * Group order items by their respective shops with enhanced validation
   * @param {Array} items - Order items
   * @param {String} zoneId - Zone ID
   * @param {Object} session - Database session for transactions
   * @returns {Array} - Grouped items by shop
   */
  static async groupItemsByShop(items, zoneId, session = null) {
    const shopGroups = new Map();

    // Get all active shops in the zone
    const zoneShops = await ZoneShop.find({
      zoneId: zoneId,
      status: 'active'
    })
      .select('_id name settings.estimatedPreparationTime settings.operatingHours')
      .session(session);

    if (zoneShops.length === 0) {
      throw new APIError('No active shops found in this zone', 400);
    }

    const shopIds = zoneShops.map(shop => shop._id.toString());
    const shopMap = new Map(zoneShops.map(shop => [shop._id.toString(), shop]));

    // Process each item to find which shop it belongs to
    for (const item of items) {
      if (!item.menuItemId) {
        logger.warn(`Item ${item.name} missing menuItemId`);
        continue;
      }

      // Find the menu item to get its shopId
      const menuItem = await MenuItem.findById(item.menuItemId)
        .select('shopId name isAvailable price')
        .session(session);

      if (!menuItem) {
        logger.warn(`Menu item ${item.menuItemId} not found`);
        continue;
      }

      if (!menuItem.isAvailable) {
        throw new APIError(`Item "${menuItem.name}" is currently unavailable`, 400);
      }

      const shopId = menuItem.shopId.toString();

      // Check if this shop is in the zone and active
      if (!shopIds.includes(shopId)) {
        logger.warn(`Item ${item.name} belongs to shop ${shopId} which is not active in zone ${zoneId}`);
        continue;
      }

      // Validate item pricing
      if (Math.abs(parseFloat(item.price) - parseFloat(menuItem.price)) > 0.01) {
        logger.warn(`Price mismatch for item ${item.name}: expected ${menuItem.price}, got ${item.price}`);
      }

      if (!shopGroups.has(shopId)) {
        const shop = shopMap.get(shopId);
        shopGroups.set(shopId, {
          shopId: shop._id,
          shopName: shop.name,
          items: [],
          estimatedTime: shop.settings?.estimatedPreparationTime || 20,
          operatingHours: shop.settings?.operatingHours
        });
      }

      shopGroups.get(shopId).items.push({
        ...item,
        actualPrice: menuItem.price // Use the actual price from menu
      });
    }

    const groupsArray = Array.from(shopGroups.values());

    if (groupsArray.length === 0) {
      throw new APIError('No valid items found for shops in this zone', 400);
    }

    return groupsArray;
  }

  /**
   * Validate that shops can fulfill the order
   */
  static async validateShopsForOrder(shopGroups, session = null) {
    for (const shopGroup of shopGroups) {
      const shop = await ZoneShop.findById(shopGroup.shopId)
        .select('status settings')
        .session(session);

      if (!shop || shop.status !== 'active') {
        throw new APIError(`Shop "${shopGroup.shopName}" is not available for orders`, 400);
      }

      // Check operating hours if configured
      if (shop.settings?.operatingHours) {
        const now = new Date();
        const currentHour = now.getHours();
        const { openTime, closeTime } = shop.settings.operatingHours;

        if (openTime && closeTime) {
          const isOpen = currentHour >= openTime && currentHour < closeTime;
          if (!isOpen) {
            throw new APIError(`Shop "${shopGroup.shopName}" is currently closed`, 400);
          }
        }
      }
    }
  }

  /**
   * Validate status transition
   */
  static validateStatusTransition(currentStatus, newStatus) {
    // Simplified order flow: pending → preparing → ready → completed
    const validTransitions = {
      'pending': ['preparing', 'cancelled'], // Shop accepts and starts preparing directly
      'preparing': ['ready', 'cancelled'], // Must finish preparing before ready
      'ready': ['completed', 'cancelled'], // Must complete from ready state
      'completed': [], // Final state - no further transitions
      'cancelled': [] // Final state - no transitions from cancelled
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    logger.debug('Validating status transition', {
      currentStatus,
      newStatus,
      allowedTransitions,
      isValid: allowedTransitions.includes(newStatus),
      flow: 'pending → preparing → ready → completed'
    });

    if (!allowedTransitions.includes(newStatus)) {
      logger.error('Invalid status transition attempted', {
        currentStatus,
        newStatus,
        allowedTransitions,
        properFlow: 'pending → preparing → ready → completed'
      });

      throw new APIError(
        `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ')}. Proper flow: pending → preparing → ready → completed`,
        400
      );
    }
  }

  /**
   * Send order creation notifications
   */
  static async sendOrderCreationNotifications(mainOrder, shopOrders) {
    try {
      // Notify each shop
      for (const shopOrder of shopOrders) {
        await this.notifyShop(shopOrder.shopId, shopOrder, 'new_order');
      }

      // Notify zone admin
      await this.notifyZoneAdmin(mainOrder.zoneId, mainOrder, shopOrders, 'new_zone_order');

      // Notify customer
      await this.notifyCustomer(mainOrder.customer, mainOrder, 'order_created');

    } catch (error) {
      logger.error('Failed to send order creation notifications', {
        mainOrderId: mainOrder._id,
        error: error.message
      });
    }
  }

  /**
   * Send status update notifications
   */
  static async sendStatusUpdateNotifications(shopOrder, parentOrder, updatedBy) {
    try {
      // Notify shop
      await this.notifyShop(shopOrder.shopId, shopOrder, 'status_updated');

      // Notify zone admin if parent order exists
      if (parentOrder) {
        await this.notifyZoneAdmin(parentOrder.zoneId, parentOrder, [shopOrder], 'status_updated');

        // Notify customer about parent order status change
        await this.notifyCustomer(parentOrder.customer, parentOrder, 'status_updated');
      }

    } catch (error) {
      logger.error('Failed to send status update notifications', {
        shopOrderId: shopOrder._id,
        parentOrderId: parentOrder?._id,
        error: error.message
      });
    }
  }

  /**
   * Send real-time notification to shop
   */
  static async notifyShop(shopId, order, eventType) {
    try {
      if (socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (io) {
          const eventData = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            items: order.items,
            customer: order.customer,
            tableNumber: order.tableNumber,
            total: order.pricing.total,
            estimatedTime: order.delivery?.estimatedTime,
            specialInstructions: order.specialInstructions,
            timestamp: new Date(),
            eventType
          };

          io.to(`shop_${shopId}`).emit(eventType, eventData);

          logger.debug(`Shop notification sent: ${eventType}`, {
            shopId,
            orderNumber: order.orderNumber,
            eventType
          });
        }
      }
    } catch (error) {
      logger.error('Failed to notify shop', {
        shopId,
        orderNumber: order.orderNumber,
        eventType,
        error: error.message
      });
    }
  }

  /**
   * Send real-time notification to zone admin
   */
  static async notifyZoneAdmin(zoneId, mainOrder, shopOrders, eventType) {
    try {
      if (socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (io) {
          const eventData = {
            orderId: mainOrder._id,
            orderNumber: mainOrder.orderNumber,
            orderType: mainOrder.orderType,
            status: mainOrder.status,
            shopCount: shopOrders.length,
            totalAmount: mainOrder.pricing.total,
            customer: mainOrder.customer,
            tableNumber: mainOrder.tableNumber,
            orderProgress: mainOrder.getOrderProgress?.() || null,
            shopOrderSummary: mainOrder.shopOrderSummary,
            shopOrders: shopOrders.map(order => ({
              orderNumber: order.orderNumber,
              shopId: order.shopId,
              status: order.status,
              itemCount: order.items?.length || 0,
              subtotal: order.pricing?.subtotal || 0
            })),
            timestamp: new Date(),
            eventType
          };

          io.to(`zone_${zoneId}`).emit(eventType, eventData);

          logger.debug(`Zone admin notification sent: ${eventType}`, {
            zoneId,
            orderNumber: mainOrder.orderNumber,
            eventType
          });
        }
      }
    } catch (error) {
      logger.error('Failed to notify zone admin', {
        zoneId,
        orderNumber: mainOrder.orderNumber,
        eventType,
        error: error.message
      });
    }
  }

  /**
   * Send real-time notification to customer
   */
  static async notifyCustomer(customer, order, eventType) {
    try {
      if (socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (io && customer.phone) {
          const eventData = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            orderProgress: order.getOrderProgress?.() || null,
            estimatedTime: order.delivery?.estimatedTime,
            total: order.pricing.total,
            timestamp: new Date(),
            eventType
          };

          io.to(`customer_${customer.phone}`).emit(eventType, eventData);

          logger.debug(`Customer notification sent: ${eventType}`, {
            customerPhone: customer.phone,
            orderNumber: order.orderNumber,
            eventType
          });
        }
      }
    } catch (error) {
      logger.error('Failed to notify customer', {
        customerPhone: customer.phone,
        orderNumber: order.orderNumber,
        eventType,
        error: error.message
      });
    }
  }

  /**
   * Get real-time order analytics for zone
   */
  static async getZoneOrderAnalytics(zoneId, timeRange = 'today') {
    try {
      const startDate = this.getDateRangeStart(timeRange);
      const endDate = new Date();

      const pipeline = [
        {
          $match: {
            zoneId: new mongoose.Types.ObjectId(zoneId),
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              orderType: '$orderType',
              status: '$status'
            },
            count: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.total' },
            avgOrderValue: { $avg: '$pricing.total' }
          }
        },
        {
          $group: {
            _id: '$_id.orderType',
            statusBreakdown: {
              $push: {
                status: '$_id.status',
                count: '$count',
                totalRevenue: '$totalRevenue',
                avgOrderValue: '$avgOrderValue'
              }
            },
            totalOrders: { $sum: '$count' },
            totalRevenue: { $sum: '$totalRevenue' }
          }
        }
      ];

      const analytics = await Order.aggregate(pipeline);

      return {
        timeRange,
        period: { startDate, endDate },
        analytics: analytics,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Failed to get zone order analytics', {
        zoneId,
        timeRange,
        error: error.message
      });
      throw new APIError('Failed to retrieve order analytics', 500);
    }
  }

  /**
   * Helper method to get date range start
   */
  static getDateRangeStart(timeRange) {
    const now = new Date();

    switch (timeRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return weekStart;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }
}

module.exports = MultiShopOrderTrackingService;