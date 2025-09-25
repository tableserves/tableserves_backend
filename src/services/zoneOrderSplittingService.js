const { Order, Zone, ZoneShop, User, MenuItem } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');
const socketService = require('./socketService');
const MultiShopOrderTrackingService = require('./multiShopOrderTrackingService');
const mongoose = require('mongoose');

/**
 * Zone Order Splitting Service
 * 
 * Enhanced service for handling splitting zone orders across multiple shops
 * Now integrates with MultiShopOrderTrackingService for comprehensive order management
 * 
 * Features:
 * - Backward compatibility with existing implementations
 * - Integration with new multi-shop tracking system
 * - Enhanced error handling and atomic transactions
 * - Improved order ID generation and traceability
 */
class ZoneOrderSplittingService {
  
  /**
   * Process zone order with enhanced splitting logic
   * @param {Object} orderData - Complete order data
   * @returns {Object} - Processed order with shop splits
   */
  static async processZoneOrder(orderData) {
    try {
      logger.info('Processing zone order with enhanced splitting service', {
        zoneId: orderData.zoneId,
        itemCount: orderData.items?.length || 0,
        useNewService: true
      });

      // Use the new MultiShopOrderTrackingService for enhanced functionality
      const result = await MultiShopOrderTrackingService.createMultiShopZoneOrder(orderData);
      
      return {
        success: result.success,
        mainOrder: result.mainOrder,
        shopOrders: result.shopOrders,
        message: result.message,
        splitCount: result.shopOrders.length,
        orderNumber: result.orderNumber,
        estimatedTime: result.estimatedTime
      };
      
    } catch (error) {
      logger.error('Enhanced zone order processing failed, falling back to legacy method', {
        error: error.message,
        zoneId: orderData.zoneId
      });
      
      // Fallback to legacy implementation for backward compatibility
      return await this.processZoneOrderLegacy(orderData);
    }
  }

  /**
   * Legacy zone order processing (maintained for backward compatibility)
   * @param {Object} orderData - Complete order data
   * @returns {Object} - Processed order with shop splits
   */
  static async processZoneOrderLegacy(orderData) {
    const {
      zoneId,
      tableNumber,
      customer,
      items,
      pricing,
      paymentMethod,
      specialInstructions
    } = orderData;

    try {
      // Validate zone exists
      const zone = await Zone.findById(zoneId);
      if (!zone) {
        throw new APIError('Zone not found', 404);
      }

      // Group items by shop
      const shopGroups = await this.groupItemsByShop(items, zoneId);
      
      if (shopGroups.length === 0) {
        throw new APIError('No valid shops found for the ordered items', 400);
      }

      // Generate main order number with unique code for traceability
      const { orderNumber: mainOrderNumber, uniqueCode } = await this.generateZoneOrderNumber();
      
      console.log('🏢 Zone Order Number Generation:', {
        mainOrderNumber,
        uniqueCode,
        format: 'ZN + DD + XXX',
        traceabilityNote: `Shop orders will use ${uniqueCode} as prefix for traceability`
      });
      
      // Use legacy order type for backward compatibility
      const mainOrder = new Order({
        orderNumber: mainOrderNumber,
        orderType: 'zone_main', // Use the new order type for better consistency
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
        shopOrders: [] // Will be populated with shop order IDs
      });

      await mainOrder.save();

      // Create individual shop orders
      const shopOrders = [];
      let totalEstimatedTime = 0;

      for (const shopGroup of shopGroups) {
        // Generate shop order number with traceability to main order
        const shopOrderNumber = await this.generateShopOrderNumber(uniqueCode);
        
        console.log('🏪 Shop Order Number Generated:', {
          shopOrderNumber,
          parentUniqueCode: uniqueCode,
          format: 'XXX + DD + YYY',
          traceabilityNote: `Can be traced back to ${mainOrderNumber} using code ${uniqueCode}`
        });
        
        // Calculate shop-specific pricing
        const shopSubtotal = shopGroup.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shopTaxAmount = shopSubtotal * (pricing.tax.rate || 0);
        const shopServiceFee = shopSubtotal * (pricing.serviceFee.rate || 0);
        const shopTotal = shopSubtotal + shopTaxAmount + shopServiceFee;

        const shopOrder = new Order({
          orderNumber: shopOrderNumber,
          orderType: 'zone_shop', // Use the new order type for consistency
          parentOrderId: mainOrder._id,
          zoneId: zoneId,
          shopId: shopGroup.shopId,
          tableNumber: tableNumber,
          customer: customer,
          items: shopGroup.items,
          pricing: {
            subtotal: shopSubtotal,
            tax: {
              rate: pricing.tax.rate,
              amount: shopTaxAmount
            },
            serviceFee: {
              rate: pricing.serviceFee.rate,
              amount: shopServiceFee
            },
            total: shopTotal,
            currency: pricing.currency
          },
          payment: {
            method: paymentMethod, // Use the same payment method as the main order
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
          parentOrder: mainOrder._id // Legacy field for backward compatibility
        });

        await shopOrder.save();
        shopOrders.push(shopOrder);

        // Update main order with shop order reference
        mainOrder.shopOrders.push(shopOrder._id);

        // Send real-time notification to shop
        await this.notifyShop(shopGroup.shopId, shopOrder);

        totalEstimatedTime = Math.max(totalEstimatedTime, shopGroup.estimatedTime || 20);
      }

      // Update main order with final details
      mainOrder.delivery.estimatedTime = totalEstimatedTime;
      await mainOrder.save();

      // Send real-time notification to zone admin
      await this.notifyZoneAdmin(zoneId, mainOrder, shopOrders);

      // Send real-time notification to customer
      await this.notifyCustomer(customer, mainOrder);

      loggerUtils.logBusiness('Zone order processed with splitting', mainOrder._id, {
        zoneId,
        shopCount: shopOrders.length,
        totalAmount: pricing.total,
        orderNumber: mainOrderNumber
      });

      return {
        success: true,
        mainOrder: mainOrder,
        shopOrders: shopOrders,
        message: `Order split across ${shopOrders.length} shops`
      };

    } catch (error) {
      logger.error('Zone order processing failed:', error);
      throw error;
    }
  }

  /**
   * Group order items by their respective shops
   * @param {Array} items - Order items
   * @param {String} zoneId - Zone ID
   * @returns {Array} - Grouped items by shop
   */
  static async groupItemsByShop(items, zoneId) {
    const shopGroups = new Map();

    // Get all shops in the zone first
    const zoneShops = await ZoneShop.find({ 
      zoneId: zoneId, 
      status: 'active' 
    }).select('_id name settings.estimatedPreparationTime');

    const shopIds = zoneShops.map(shop => shop._id.toString());
    const shopMap = new Map(zoneShops.map(shop => [shop._id.toString(), shop]));

    // Process each item to find which shop it belongs to
    for (const item of items) {
      // Find the menu item to get its shopId
      const menuItem = await MenuItem.findById(item.menuItemId).select('shopId name');
      
      if (!menuItem || !menuItem.shopId) {
        logger.warn(`Item ${item.name} not found or doesn't belong to any shop`);
        continue;
      }

      const shopId = menuItem.shopId.toString();
      
      // Check if this shop is in the zone
      if (!shopIds.includes(shopId)) {
        logger.warn(`Item ${item.name} belongs to shop ${shopId} which is not in zone ${zoneId}`);
        continue;
      }

      if (!shopGroups.has(shopId)) {
        const shop = shopMap.get(shopId);
        shopGroups.set(shopId, {
          shopId: shop._id,
          shopName: shop.name,
          items: [],
          estimatedTime: shop.settings?.estimatedPreparationTime || 20
        });
      }

      shopGroups.get(shopId).items.push(item);
    }

    return Array.from(shopGroups.values());
  }

  /**
   * Generate unique zone main order number
   * Format: ZN+DD+XXX
   * @returns {Object} - { orderNumber, uniqueCode }
   */
  static async generateZoneOrderNumber() {
    const prefix = 'ZN';
    const dayCode = new Date().getDate().toString().padStart(2, '0'); // DD format (01-31)
    const uniqueCode = Math.random().toString(36).substr(2, 3).toUpperCase(); // XXX - 3 unique chars
    const orderNumber = `${prefix}${dayCode}${uniqueCode}`;
    
    return {
      orderNumber,
      uniqueCode // This will be used for shop orders
    };
  }

  /**
   * Generate shop order number with traceability
   * Format: XXX+DD+YYY
   * @param {String} parentUniqueCode - The unique code from parent zone order
   * @returns {String} - Shop order number
   */
  static async generateShopOrderNumber(parentUniqueCode) {
    const dayCode = new Date().getDate().toString().padStart(2, '0'); // DD format
    const shopUniqueCode = Math.random().toString(36).substr(2, 3).toUpperCase(); // YYY - new unique chars
    return `${parentUniqueCode}${dayCode}${shopUniqueCode}`;
  }

  /**
   * Send real-time notification to shop
   * @param {String} shopId - Shop ID
   * @param {Object} order - Shop order
   */
  static async notifyShop(shopId, order) {
    try {
      // Check if socketService is available and has getIO method
      if (typeof socketService !== 'undefined' && socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (io) {
          io.to(`shop_${shopId}`).emit('new_order', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            items: order.items,
            customer: order.customer,
            tableNumber: order.tableNumber,
            total: order.pricing.total,
            estimatedTime: order.delivery.estimatedTime,
            specialInstructions: order.specialInstructions,
            timestamp: new Date()
          });
        }
      } else {
        console.log('SocketService not available for shop notification');
      }

      logger.info(`Shop notification sent for order ${order.orderNumber}`, {
        shopId,
        orderId: order._id
      });
    } catch (error) {
      logger.error('Failed to notify shop:', error);
    }
  }

  /**
   * Send real-time notification to zone admin
   * @param {String} zoneId - Zone ID
   * @param {Object} mainOrder - Main order
   * @param {Array} shopOrders - Shop orders
   */
  static async notifyZoneAdmin(zoneId, mainOrder, shopOrders) {
    try {
      // Check if socketService is available and has getIO method
      if (typeof socketService !== 'undefined' && socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (io) {
          io.to(`zone_${zoneId}`).emit('new_zone_order', {
            orderId: mainOrder._id,
            orderNumber: mainOrder.orderNumber,
            shopCount: shopOrders.length,
            totalAmount: mainOrder.pricing.total,
            customer: mainOrder.customer,
            tableNumber: mainOrder.tableNumber,
            shopOrders: shopOrders.map(order => ({
              shopId: order.shopId,
              orderNumber: order.orderNumber,
              itemCount: order.items.length,
              subtotal: order.pricing.subtotal
            })),
            timestamp: new Date()
          });
        }
      } else {
        console.log('SocketService not available for zone admin notification');
      }

      logger.info(`Zone admin notification sent for order ${mainOrder.orderNumber}`, {
        zoneId,
        orderId: mainOrder._id
      });
    } catch (error) {
      logger.error('Failed to notify zone admin:', error);
    }
  }

  /**
   * Send real-time notification to customer
   * @param {Object} customer - Customer data
   * @param {Object} order - Main order
   */
  static async notifyCustomer(customer, order) {
    try {
      // Check if socketService is available and has getIO method
      if (typeof socketService !== 'undefined' && socketService && typeof socketService.getIO === 'function') {
        const io = socketService.getIO();
        if (io && customer.phone) {
          io.to(`customer_${customer.phone}`).emit('order_confirmed', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            estimatedTime: order.delivery.estimatedTime,
            total: order.pricing.total,
            timestamp: new Date()
          });
        }
      } else {
        console.log('SocketService not available for customer notification');
      }

      logger.info(`Customer notification sent for order ${order.orderNumber}`, {
        customerPhone: customer.phone,
        orderId: order._id
      });
    } catch (error) {
      logger.error('Failed to notify customer:', error);
    }
  }

  /**
   * Update shop order status with enhanced coordination
   * @param {String} shopOrderId - Shop order ID
   * @param {String} newStatus - New status
   * @param {String} updatedBy - User who updated the status
   * @param {Object} additionalData - Additional update data
   */
  static async updateShopOrderStatus(shopOrderId, newStatus, updatedBy = null, additionalData = {}) {
    try {
      logger.info('Updating shop order status with enhanced service', {
        shopOrderId,
        newStatus,
        updatedBy,
        useNewService: true
      });

      // Use the new MultiShopOrderTrackingService for enhanced functionality
      const result = await MultiShopOrderTrackingService.updateShopOrderStatus(
        shopOrderId, 
        newStatus, 
        updatedBy, 
        additionalData
      );
      
      return result.shopOrder;
      
    } catch (error) {
      logger.error('Enhanced shop order status update failed, falling back to legacy method', {
        error: error.message,
        shopOrderId,
        newStatus
      });
      
      // Fallback to legacy implementation
      return await this.updateShopOrderStatusLegacy(shopOrderId, newStatus, updatedBy);
    }
  }

  /**
   * Legacy shop order status update (maintained for backward compatibility)
   * @param {String} shopOrderId - Shop order ID
   * @param {String} newStatus - New status
   * @param {String} updatedBy - User who updated the status
   */
  static async updateShopOrderStatusLegacy(shopOrderId, newStatus, updatedBy = null) {
    try {
      const shopOrder = await Order.findById(shopOrderId);
      if (!shopOrder) {
        throw new APIError('Shop order not found', 404);
      }

      const oldStatus = shopOrder.status;
      await shopOrder.updateStatus(newStatus, updatedBy);

      // Check if we need to update main order status
      const mainOrder = await Order.findById(shopOrder.parentOrderId);

      if (mainOrder) {
        await this.syncMainOrderStatus(mainOrder);
        
        // Notify customer of status change
        await this.notifyCustomer(mainOrder.customer, mainOrder);
      }

      // Notify shop of status change
      await this.notifyShop(shopOrder.shopId, shopOrder);

      logger.info(`Shop order status updated: ${oldStatus} -> ${newStatus}`, {
        shopOrderId,
        mainOrderId: shopOrder.parentOrderId,
        updatedBy
      });

      return shopOrder;
    } catch (error) {
      logger.error('Failed to update shop order status:', error);
      throw error;
    }
  }

  /**
   * Enhanced main order status synchronization
   * @param {Object} mainOrder - Main order with populated shop orders
   */
  static async syncMainOrderStatus(mainOrder) {
    try {
      // Use enhanced synchronization if available
      if (mainOrder.updateZoneMainStatus && typeof mainOrder.updateZoneMainStatus === 'function') {
        await mainOrder.updateZoneMainStatus();
        await mainOrder.save();
        return;
      }
      
      // Fallback to legacy sync
      return await this.syncMainOrderStatusLegacy(mainOrder);
      
    } catch (error) {
      logger.error('Enhanced main order sync failed, using legacy method', {
        mainOrderId: mainOrder._id,
        error: error.message
      });
      
      return await this.syncMainOrderStatusLegacy(mainOrder);
    }
  }

  /**
   * Legacy main order status synchronization
   * @param {Object} mainOrder - Main order with populated shop orders
   */
  static async syncMainOrderStatusLegacy(mainOrder) {
    try {
      console.log('🔄 Starting main order status sync for:', mainOrder.orderNumber);
      
      const shopOrders = await Order.find({ parentOrderId: mainOrder._id });
      
      if (shopOrders.length === 0) {
        console.log('⚠️ No shop orders found for main order:', mainOrder.orderNumber);
        return;
      }

      const statuses = shopOrders.map(order => order.status);
      let newMainStatus = mainOrder.status;
      const currentStatus = mainOrder.status;

      console.log('📊 Shop order statuses analysis:', {
        mainOrderNumber: mainOrder.orderNumber,
        currentMainStatus: currentStatus,
        shopOrderStatuses: shopOrders.map(o => ({ orderNumber: o.orderNumber, status: o.status })),
        statusCounts: {
          completed: statuses.filter(s => s === 'completed').length,
          cancelled: statuses.filter(s => s === 'cancelled').length,
          ready: statuses.filter(s => s === 'ready').length,
          preparing: statuses.filter(s => s === 'preparing').length,
          pending: statuses.filter(s => s === 'pending').length,
          total: statuses.length
        }
      });

      // **ENHANCED SYNC LOGIC WITH SINGLE SHOP PRIORITY**: Use new status types if available
      const completedCount = statuses.filter(s => s === 'completed').length;
      const cancelledCount = statuses.filter(s => s === 'cancelled').length;
      const readyCount = statuses.filter(s => s === 'ready').length;
      const activeCount = statuses.length - cancelledCount; // Non-cancelled orders
      
      // CRITICAL FIX: Single shop conditions MUST be checked FIRST
      if (statuses.length === 1 && completedCount === 1) {
        // HIGHEST PRIORITY: Single shop order completed
        newMainStatus = 'completed';
      } else if (statuses.length === 1 && readyCount === 1) {
        // HIGHEST PRIORITY: Single shop order ready
        newMainStatus = 'ready';
      } else if (statuses.every(status => status === 'completed')) {
        newMainStatus = 'completed';
      } else if (statuses.every(status => status === 'cancelled')) {
        newMainStatus = 'cancelled';
      } else if (activeCount > 0 && completedCount === activeCount) {
        // All active (non-cancelled) orders are completed
        newMainStatus = 'completed';
      } else if (statuses.some(status => status === 'completed') && statuses.some(status => status === 'cancelled') && 
                 !statuses.some(status => ['pending', 'preparing', 'ready'].includes(status))) {
        // Mixed completed and cancelled with no active orders
        newMainStatus = 'partially_completed';
      } else if ((readyCount + completedCount) === activeCount && activeCount > 0) {
        // All active orders are either ready or completed
        if (completedCount > 0) {
          newMainStatus = 'partially_ready'; // Some completed, some ready
        } else {
          newMainStatus = 'ready'; // All ready, none completed yet
        }
      } else if (statuses.some(status => status === 'preparing')) {
        newMainStatus = 'preparing';
      } else if (statuses.some(status => status === 'confirmed') || statuses.some(status => status === 'pending')) {
        newMainStatus = 'confirmed';
      }

      console.log('🎯 Legacy Status sync decision (ENHANCED: Single Shop Priority):', {
        mainOrderNumber: mainOrder.orderNumber,
        oldStatus: currentStatus,
        newStatus: newMainStatus,
        willUpdate: newMainStatus !== currentStatus,
        isSingleShop: statuses.length === 1,
        statusBreakdown: {
          total: statuses.length,
          completed: completedCount,
          ready: readyCount,
          cancelled: cancelledCount,
          active: activeCount
        },
        triggerRule: 
          (statuses.length === 1 && completedCount === 1) ? 'SINGLE_SHOP_COMPLETED_PRIORITY' :
          (statuses.length === 1 && readyCount === 1) ? 'SINGLE_SHOP_READY_PRIORITY' :
          newMainStatus === 'completed' ? 
            (completedCount === statuses.length ? 'All orders completed' : 'All active orders completed') :
            newMainStatus === 'cancelled' ? 'All orders cancelled' :
            newMainStatus === 'ready' ? 'All active orders ready' :
            newMainStatus === 'preparing' ? 'Some orders preparing' : 'Default sync'
      });

      if (newMainStatus !== currentStatus) {
        // Use the enhanced updateZoneMainStatus method if available
        if (mainOrder.updateZoneMainStatus && typeof mainOrder.updateZoneMainStatus === 'function') {
          await mainOrder.updateZoneMainStatus();
          await mainOrder.save();
        } else {
          // Fallback to simple status update
          await mainOrder.updateStatus(newMainStatus, 'system');
        }
        
        console.log('✅ Main order status updated successfully:', {
          orderNumber: mainOrder.orderNumber,
          from: currentStatus,
          to: newMainStatus
        });
        
        // Notify zone admin of main order status change
        await this.notifyZoneAdmin(mainOrder.zoneId, mainOrder, shopOrders);
        
        // Log business event
        loggerUtils.logBusiness('Zone main order status synced', mainOrder._id, {
          oldStatus: currentStatus,
          newStatus: newMainStatus,
          shopOrderCount: shopOrders.length,
          syncTrigger: 'shop_status_change'
        });
      } else {
        console.log('🔄 No status change needed for main order:', mainOrder.orderNumber);
      }

    } catch (error) {
      console.error('❌ Failed to sync main order status:', {
        mainOrderNumber: mainOrder?.orderNumber,
        error: error.message,
        stack: error.stack
      });
      logger.error('Failed to sync main order status:', error);
    }
  }
}

module.exports = ZoneOrderSplittingService;
