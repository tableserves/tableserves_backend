const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const MultiShopOrderTrackingService = require('../../src/services/multiShopOrderTrackingService');
const Order = require('../../src/models/Order');
const SocketService = require('../../src/services/socketService');

describe('MultiShopOrderTrackingService', () => {
  let sandbox;
  let mockSession;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockSession = {
      withTransaction: sandbox.stub(),
      endSession: sandbox.stub()
    };
    sandbox.stub(mongoose, 'startSession').returns(mockSession);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createMultiShopZoneOrder', () => {
    it('should create parent and child orders atomically', async () => {
      const orderData = {
        customerId: 'customer123',
        zoneId: 'zone123',
        items: [
          { shopId: 'shop1', menuItems: [{ name: 'Item1', price: 10 }] },
          { shopId: 'shop2', menuItems: [{ name: 'Item2', price: 15 }] }
        ],
        deliveryAddress: 'Test Address',
        totalAmount: 25
      };

      const mockParentOrder = {
        _id: 'parent123',
        orderId: 'ZN25ABC',
        orderType: 'zone_main',
        save: sandbox.stub().resolves()
      };

      const mockChildOrders = [
        { _id: 'child1', orderId: 'ABC25XYZ', save: sandbox.stub().resolves() },
        { _id: 'child2', orderId: 'ABC25DEF', save: sandbox.stub().resolves() }
      ];

      sandbox.stub(Order.prototype, 'save').resolves();
      sandbox.stub(Order, 'findByIdAndUpdate').resolves();
      sandbox.stub(SocketService.prototype, 'notifyZoneOrderCreated').resolves();
      sandbox.stub(SocketService.prototype, 'notifyShopOrderReceived').resolves();

      mockSession.withTransaction.callsFake(async (callback) => {
        return await callback();
      });

      const result = await MultiShopOrderTrackingService.createMultiShopZoneOrder(orderData);

      expect(mongoose.startSession.calledOnce).to.be.true;
      expect(mockSession.withTransaction.calledOnce).to.be.true;
      expect(mockSession.endSession.calledOnce).to.be.true;
    });

    it('should handle transaction rollback on error', async () => {
      const orderData = {
        customerId: 'customer123',
        zoneId: 'zone123',
        items: []
      };

      const error = new Error('Database error');
      mockSession.withTransaction.rejects(error);

      try {
        await MultiShopOrderTrackingService.createMultiShopZoneOrder(orderData);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.equal('Database error');
        expect(mockSession.endSession.calledOnce).to.be.true;
      }
    });
  });

  describe('updateChildOrderStatus', () => {
    it('should update child order and sync parent status', async () => {
      const childOrderId = 'child123';
      const newStatus = 'ready';
      
      const mockChildOrder = {
        _id: childOrderId,
        parentOrderId: 'parent123',
        status: 'preparing',
        save: sandbox.stub().resolves()
      };

      const mockParentOrder = {
        _id: 'parent123',
        childOrderIds: ['child123', 'child456'],
        status: 'pending',
        save: sandbox.stub().resolves()
      };

      const mockSiblingOrders = [
        { status: 'ready' },
        { status: 'delivered' }
      ];

      sandbox.stub(Order, 'findById')
        .onFirstCall().resolves(mockChildOrder)
        .onSecondCall().resolves(mockParentOrder);
      
      sandbox.stub(Order, 'find').resolves(mockSiblingOrders);
      sandbox.stub(SocketService.prototype, 'notifyOrderStatusUpdate').resolves();

      const result = await MultiShopOrderTrackingService.updateChildOrderStatus(
        childOrderId, 
        newStatus, 
        'shop123'
      );

      expect(result.success).to.be.true;
      expect(mockChildOrder.save.calledOnce).to.be.true;
    });

    it('should handle invalid status transitions', async () => {
      const childOrderId = 'child123';
      const invalidStatus = 'invalid_status';

      try {
        await MultiShopOrderTrackingService.updateChildOrderStatus(
          childOrderId, 
          invalidStatus, 
          'shop123'
        );
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.include('Invalid status transition');
      }
    });
  });

  describe('getOrderTrackingData', () => {
    it('should return comprehensive tracking data for customers', async () => {
      const parentOrderId = 'parent123';
      const userRole = 'customer';

      const mockParentOrder = {
        _id: parentOrderId,
        orderId: 'ZN25ABC',
        status: 'partially_ready',
        childOrderIds: ['child1', 'child2'],
        populate: sandbox.stub().returnsThis(),
        lean: sandbox.stub().resolves({
          _id: parentOrderId,
          orderId: 'ZN25ABC',
          status: 'partially_ready',
          childOrders: [
            { _id: 'child1', status: 'ready', shopId: 'shop1' },
            { _id: 'child2', status: 'preparing', shopId: 'shop2' }
          ]
        })
      };

      sandbox.stub(Order, 'findById').returns(mockParentOrder);

      const result = await MultiShopOrderTrackingService.getOrderTrackingData(
        parentOrderId, 
        userRole
      );

      expect(result.parentOrder).to.exist;
      expect(result.childOrders).to.have.lengthOf(2);
      expect(result.overallProgress).to.be.a('number');
    });
  });

  describe('generateOrderId', () => {
    it('should generate valid parent order ID format', () => {
      const parentId = MultiShopOrderTrackingService.generateOrderId();
      expect(parentId).to.match(/^ZN\d{2}[A-Z]{3}$/);
    });

    it('should generate valid child order ID format', () => {
      const parentCode = 'ABC';
      const childId = MultiShopOrderTrackingService.generateOrderId(parentCode);
      expect(childId).to.match(/^ABC\d{2}[A-Z]{3}$/);
    });
  });

  describe('validateStatusTransition', () => {
    it('should validate correct status transitions', () => {
      const validTransitions = [
        { from: 'pending', to: 'preparing' },
        { from: 'preparing', to: 'ready' },
        { from: 'ready', to: 'delivered' },
        { from: 'pending', to: 'cancelled' }
      ];

      validTransitions.forEach(({ from, to }) => {
        expect(() => {
          MultiShopOrderTrackingService.validateStatusTransition(from, to);
        }).to.not.throw();
      });
    });

    it('should reject invalid status transitions', () => {
      const invalidTransitions = [
        { from: 'delivered', to: 'preparing' },
        { from: 'cancelled', to: 'ready' },
        { from: 'ready', to: 'pending' }
      ];

      invalidTransitions.forEach(({ from, to }) => {
        expect(() => {
          MultiShopOrderTrackingService.validateStatusTransition(from, to);
        }).to.throw('Invalid status transition');
      });
    });
  });
});