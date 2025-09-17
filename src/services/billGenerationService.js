const { Order, Restaurant, Zone, ZoneShop, User } = require('../models');
const { logger, loggerUtils } = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

/**
 * Bill Generation Service
 * Handles bill generation for both restaurant and zone orders
 */
class BillGenerationService {

  /**
   * Generate bill for an order
   * @param {String} orderId - Order ID
   * @returns {Object} - Generated bill data
   */
  static async generateBill(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('restaurantId', 'name contact settings')
        .populate('zoneId', 'name contact settings')
        .populate('shopOrders');

      if (!order) {
        throw new APIError('Order not found', 404);
      }

      // Generate bill based on order type
      if (order.orderType === 'zone_split') {
        return await this.generateZoneBill(order);
      } else {
        return await this.generateRestaurantBill(order);
      }

    } catch (error) {
      logger.error('Bill generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate restaurant bill
   * @param {Object} order - Restaurant order
   * @returns {Object} - Bill data
   */
  static async generateRestaurantBill(order) {
    const restaurant = order.restaurantId;
    
    const billData = {
      billNumber: this.generateBillNumber('REST'),
      orderId: order._id,
      orderNumber: order.orderNumber,
      type: 'restaurant',
      business: {
        name: restaurant.name,
        address: restaurant.contact.address,
        phone: restaurant.contact.phone,
        email: restaurant.contact.email
      },
      customer: order.customer,
      tableNumber: order.tableNumber,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        modifiers: item.modifiers || [],
        subtotal: item.subtotal,
        notes: item.specialInstructions
      })),
      pricing: order.pricing,
      payment: {
        method: order.payment.method,
        status: order.payment.status,
        transactionId: order.payment.transactionId
      },
      timestamps: {
        orderCreated: order.createdAt,
        billGenerated: new Date()
      },
      specialInstructions: order.specialInstructions
    };

    // Store bill in order
    order.bill = billData;
    await order.save();

    loggerUtils.logBusiness('Restaurant bill generated', order._id, {
      billNumber: billData.billNumber,
      total: order.pricing.total,
      restaurantId: restaurant._id
    });

    return billData;
  }

  /**
   * Generate zone bill (consolidated from multiple shops)
   * @param {Object} order - Zone order with shop orders
   * @returns {Object} - Consolidated bill data
   */
  static async generateZoneBill(order) {
    const zone = order.zoneId;
    const shopOrders = order.shopOrders;

    // Get detailed shop information
    const shopDetails = await Promise.all(
      shopOrders.map(async (shopOrderId) => {
        const shopOrder = await Order.findById(shopOrderId).populate('shopId', 'name contact');
        return {
          shop: shopOrder.shopId,
          order: shopOrder,
          items: shopOrder.items
        };
      })
    );

    const billData = {
      billNumber: this.generateBillNumber('ZONE'),
      orderId: order._id,
      orderNumber: order.orderNumber,
      type: 'zone_consolidated',
      business: {
        name: zone.name,
        address: zone.contact.address,
        phone: zone.contact.phone,
        email: zone.contact.email
      },
      customer: order.customer,
      tableNumber: order.tableNumber,
      shops: shopDetails.map(detail => ({
        shopId: detail.shop._id,
        shopName: detail.shop.name,
        orderNumber: detail.order.orderNumber,
        items: detail.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          modifiers: item.modifiers || [],
          subtotal: item.subtotal,
          notes: item.specialInstructions
        })),
        subtotal: detail.order.pricing.subtotal,
        tax: detail.order.pricing.tax.amount,
        serviceFee: detail.order.pricing.serviceFee.amount,
        total: detail.order.pricing.total
      })),
      consolidatedItems: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        modifiers: item.modifiers || [],
        subtotal: item.subtotal,
        shopName: this.findItemShop(item, shopDetails),
        notes: item.specialInstructions
      })),
      pricing: order.pricing,
      payment: {
        method: order.payment.method,
        status: order.payment.status,
        transactionId: order.payment.transactionId
      },
      timestamps: {
        orderCreated: order.createdAt,
        billGenerated: new Date()
      },
      specialInstructions: order.specialInstructions,
      splitDetails: {
        totalShops: shopDetails.length,
        shopBreakdown: shopDetails.map(detail => ({
          shopName: detail.shop.name,
          itemCount: detail.items.length,
          subtotal: detail.order.pricing.subtotal
        }))
      }
    };

    // Store bill in main order
    order.bill = billData;
    await order.save();

    // Also store bill reference in shop orders
    for (const shopOrder of shopOrders) {
      const shopOrderDoc = await Order.findById(shopOrder);
      shopOrderDoc.consolidatedBill = billData.billNumber;
      await shopOrderDoc.save();
    }

    loggerUtils.logBusiness('Zone consolidated bill generated', order._id, {
      billNumber: billData.billNumber,
      total: order.pricing.total,
      zoneId: zone._id,
      shopCount: shopDetails.length
    });

    return billData;
  }

  /**
   * Generate unique bill number
   * @param {String} prefix - Bill prefix (REST or ZONE)
   * @returns {String} - Bill number
   */
  static generateBillNumber(prefix = 'BILL') {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Find which shop an item belongs to
   * @param {Object} item - Order item
   * @param {Array} shopDetails - Shop details array
   * @returns {String} - Shop name
   */
  static findItemShop(item, shopDetails) {
    for (const detail of shopDetails) {
      const shopItem = detail.items.find(shopItem => 
        shopItem.menuItemId === item.menuItemId || shopItem.name === item.name
      );
      if (shopItem) {
        return detail.shop.name;
      }
    }
    return 'Unknown Shop';
  }

  /**
   * Get bill by order ID
   * @param {String} orderId - Order ID
   * @returns {Object} - Bill data
   */
  static async getBillByOrderId(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new APIError('Order not found', 404);
      }

      if (!order.bill) {
        // Generate bill if it doesn't exist
        return await this.generateBill(orderId);
      }

      return order.bill;

    } catch (error) {
      logger.error('Failed to get bill:', error);
      throw error;
    }
  }

  /**
   * Update payment status in bill
   * @param {String} orderId - Order ID
   * @param {String} paymentStatus - Payment status
   * @param {String} transactionId - Transaction ID
   * @returns {Object} - Updated bill
   */
  static async updatePaymentStatus(orderId, paymentStatus, transactionId = null) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new APIError('Order not found', 404);
      }

      // Update order payment status
      order.payment.status = paymentStatus;
      if (transactionId) {
        order.payment.transactionId = transactionId;
      }

      // Update bill if it exists
      if (order.bill) {
        order.bill.payment.status = paymentStatus;
        if (transactionId) {
          order.bill.payment.transactionId = transactionId;
        }
        order.bill.timestamps.paymentUpdated = new Date();
      }

      await order.save();

      // If this is a zone order, update shop orders too
      if (order.orderType === 'zone_split' && order.shopOrders) {
        await Order.updateMany(
          { _id: { $in: order.shopOrders } },
          { 
            'payment.status': paymentStatus,
            ...(transactionId && { 'payment.parentTransactionId': transactionId })
          }
        );
      }

      loggerUtils.logBusiness('Payment status updated in bill', orderId, {
        paymentStatus,
        transactionId,
        billNumber: order.bill?.billNumber
      });

      return order.bill;

    } catch (error) {
      logger.error('Failed to update payment status in bill:', error);
      throw error;
    }
  }
}

module.exports = BillGenerationService;
