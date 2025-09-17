const { Order } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Order Traceability Service
 * Handles tracking and tracing relationships between zone main orders and shop split orders
 */
class OrderTraceabilityService {

  /**
   * Demonstrate the traceability system with examples
   */
  static demonstrateOrderNumbers() {
    const today = new Date().getDate().toString().padStart(2, '0');
    
    console.log('🔢 TableServe Order Number System Demo');
    console.log('=====================================');
    
    // Zone Main Order Example
    const zoneUniqueCode = 'ABC';
    const zoneMainOrder = `ZN${today}${zoneUniqueCode}`;
    console.log(`\n1. Zone Main Order: ${zoneMainOrder}`);
    console.log(`   Format: ZN + ${today} (day) + ${zoneUniqueCode} (unique code)`);
    
    // Shop Split Orders Examples
    console.log(`\n2. Shop Split Orders (traceable to ${zoneMainOrder}):`);
    const shopOrders = [
      `${zoneUniqueCode}${today}XY1`,
      `${zoneUniqueCode}${today}XY2`, 
      `${zoneUniqueCode}${today}XY3`
    ];
    
    shopOrders.forEach((order, index) => {
      console.log(`   Shop ${index + 1}: ${order}`);
      console.log(`   Format: ${zoneUniqueCode} (parent code) + ${today} (day) + XY${index + 1} (shop unique)`);
    });
    
    // Restaurant Order Example  
    const restaurantOrder = `ORD${today}DEF`;
    console.log(`\n3. Restaurant Order: ${restaurantOrder}`);
    console.log(`   Format: ORD + ${today} (day) + DEF (unique code)`);
    
    console.log('\n✅ Traceability: All shop orders starting with "ABC" belong to zone order ZN' + today + 'ABC');
    
    return {
      zoneMainOrder,
      shopOrders,
      restaurantOrder,
      traceability: `Shop orders can be traced to parent using code: ${zoneUniqueCode}`
    };
  }

  /**
   * Trace a shop order back to its parent zone order
   * @param {String} shopOrderNumber - Shop order number (format: XXX+DD+YYY)
   * @returns {Object} - Traceability information
   */
  static async traceShopOrder(shopOrderNumber) {
    try {
      console.log(`🔍 Tracing shop order: ${shopOrderNumber}`);
      
      // Extract parent code from shop order
      const parentCode = Order.extractParentOrderCode(shopOrderNumber);
      if (!parentCode) {
        return {
          success: false,
          message: 'Invalid shop order number format',
          shopOrder: shopOrderNumber
        };
      }
      
      // Find the parent zone order
      const parentOrder = await Order.findParentZoneOrder(shopOrderNumber);
      
      if (!parentOrder) {
        return {
          success: false,
          message: 'Parent zone order not found',
          shopOrder: shopOrderNumber,
          extractedParentCode: parentCode
        };
      }
      
      // Find all related shop orders
      const relatedShopOrders = await Order.find({
        orderNumber: new RegExp(`^${parentCode}`),
        orderType: { $in: ['shop_split', 'zone_shop'] } // Support both legacy and new types
      }).select('orderNumber shopId status pricing.total');
      
      console.log('✅ Traceability successful:', {
        shopOrder: shopOrderNumber,
        parentOrder: parentOrder.orderNumber,
        relatedShopOrders: relatedShopOrders.length
      });
      
      return {
        success: true,
        shopOrder: shopOrderNumber,
        parentOrder: {
          orderNumber: parentOrder.orderNumber,
          id: parentOrder._id,
          status: parentOrder.status,
          total: parentOrder.pricing?.total || 0,
          createdAt: parentOrder.createdAt
        },
        relatedShopOrders: relatedShopOrders.map(order => ({
          orderNumber: order.orderNumber,
          shopId: order.shopId,
          status: order.status,
          total: order.pricing?.total || 0
        })),
        traceabilityCode: parentCode,
        message: `Shop order traced to parent zone order: ${parentOrder.orderNumber}`
      };
      
    } catch (error) {
      logger.error('Order traceability error:', error);
      return {
        success: false,
        message: 'Failed to trace order',
        error: error.message,
        shopOrder: shopOrderNumber
      };
    }
  }

  /**
   * Get all shop orders for a zone main order
   * @param {String} zoneOrderNumber - Zone main order number (format: ZN+DD+XXX)
   * @returns {Array} - List of related shop orders
   */
  static async getShopOrdersForZoneOrder(zoneOrderNumber) {
    try {
      // Extract unique code from zone order (last 3 characters)
      const uniqueCode = zoneOrderNumber.slice(-3);
      
      // Find all shop orders that start with this code
      const shopOrders = await Order.find({
        orderNumber: new RegExp(`^${uniqueCode}`),
        orderType: { $in: ['shop_split', 'zone_shop'] }, // Support both legacy and new types
        parentOrder: { $exists: true }
      })
      .populate('shopId', 'name')
      .populate('parentOrder', 'orderNumber')
      .select('orderNumber shopId status pricing.total items createdAt');
      
      return {
        success: true,
        zoneOrder: zoneOrderNumber,
        uniqueCode,
        shopOrders: shopOrders.map(order => ({
          orderNumber: order.orderNumber,
          shopName: order.shopId?.name || 'Unknown Shop',
          status: order.status,
          total: order.pricing?.total || 0,
          itemCount: order.items?.length || 0,
          createdAt: order.createdAt
        })),
        totalShopOrders: shopOrders.length
      };
      
    } catch (error) {
      logger.error('Failed to get shop orders for zone order:', error);
      return {
        success: false,
        message: 'Failed to retrieve shop orders',
        error: error.message,
        zoneOrder: zoneOrderNumber
      };
    }
  }

  /**
   * Validate order number formats
   * @param {String} orderNumber - Order number to validate
   * @returns {Object} - Validation result with format details
   */
  static validateOrderNumber(orderNumber) {
    if (!orderNumber || typeof orderNumber !== 'string') {
      return { valid: false, message: 'Order number must be a non-empty string' };
    }

    const today = new Date().getDate().toString().padStart(2, '0');
    
    // Zone Main Order: ZN+DD+XXX (8 characters)
    if (orderNumber.startsWith('ZN') && orderNumber.length === 8) {
      const dayCode = orderNumber.substring(2, 4);
      const uniqueCode = orderNumber.substring(4, 7);
      return {
        valid: true,
        type: 'zone_main',
        format: 'ZN+DD+XXX',
        dayCode,
        uniqueCode,
        isToday: dayCode === today
      };
    }
    
    // Restaurant Order: ORD+DD+ZZZ (8 characters)  
    if (orderNumber.startsWith('ORD') && orderNumber.length === 8) {
      const dayCode = orderNumber.substring(3, 5);
      const uniqueCode = orderNumber.substring(5, 8);
      return {
        valid: true,
        type: 'restaurant',
        format: 'ORD+DD+ZZZ',
        dayCode,
        uniqueCode,
        isToday: dayCode === today
      };
    }
    
    // Shop Split Order: XXX+DD+YYY (8 characters, not starting with ZN or ORD)
    if (orderNumber.length === 8 && !orderNumber.startsWith('ZN') && !orderNumber.startsWith('ORD')) {
      const parentCode = orderNumber.substring(0, 3);
      const dayCode = orderNumber.substring(3, 5);
      const shopUniqueCode = orderNumber.substring(5, 8);
      return {
        valid: true,
        type: 'shop_split',
        format: 'XXX+DD+YYY',
        parentCode,
        dayCode,
        shopUniqueCode,
        isToday: dayCode === today
      };
    }
    
    return {
      valid: false,
      message: 'Invalid order number format. Expected: ZN+DD+XXX, ORD+DD+ZZZ, or XXX+DD+YYY'
    };
  }
}

module.exports = OrderTraceabilityService;