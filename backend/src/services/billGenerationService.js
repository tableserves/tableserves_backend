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
        .populate('shopId', 'name contact');

      if (!order) {
        throw new APIError('Order not found', 404);
      }

      if (order.zoneId) {
        return await this.generateZoneBill(order);
      }
      return await this.generateRestaurantBill(order);

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
   * Generate zone bill (single shop)
   */
  static async generateZoneBill(order) {
    const zone = order.zoneId;
    const shop = order.shopId;

    const billData = {
      billNumber: this.generateBillNumber('ZONE'),
      orderId: order._id,
      orderNumber: order.orderNumber,
      type: 'zone',
      business: {
        zoneName: zone?.name,
        zoneAddress: zone?.contact?.address,
        shopId: shop?._id,
        shopName: shop?.name,
        shopPhone: shop?.contact?.phone,
        shopEmail: shop?.contact?.email
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

    order.bill = billData;
    await order.save();

    loggerUtils.logBusiness('Zone bill generated', order._id, {
      billNumber: billData.billNumber,
      total: order.pricing.total,
      zoneId: zone?._id,
      shopId: shop?._id
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
