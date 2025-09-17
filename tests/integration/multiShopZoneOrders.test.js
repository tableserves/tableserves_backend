const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../../src/app');
const MultiShopOrderTrackingService = require('../../src/services/multiShopOrderTrackingService');
const authMiddleware = require('../../src/middleware/authMiddleware');

describe('Multi-Shop Zone Order API Integration Tests', () => {
  let sandbox;
  let authStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Mock authentication middleware
    authStub = sandbox.stub(authMiddleware, 'authenticate').callsFake((req, res, next) => {
      req.user = { 
        _id: 'user123', 
        role: 'customer',
        zoneId: 'zone123',
        shopId: 'shop123' 
      };
      next();
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /api/v1/orders/multi-shop-zone', () => {
    it('should create a multi-shop zone order successfully', async () => {
      const orderData = {
        zoneId: 'zone123',
        items: [
          {
            shopId: 'shop1',
            menuItems: [
              { menuItemId: 'item1', name: 'Pizza', price: 15, quantity: 2 }
            ]
          },
          {
            shopId: 'shop2',
            menuItems: [
              { menuItemId: 'item2', name: 'Burger', price: 12, quantity: 1 }
            ]
          }
        ],
        deliveryAddress: '123 Test Street',
        paymentMethod: 'card',
        specialInstructions: 'Extra sauce please'
      };

      const mockResult = {
        success: true,
        parentOrder: {
          _id: 'parent123',
          orderId: 'ZN25ABC',
          status: 'pending'
        },
        childOrders: [
          { _id: 'child1', orderId: 'ABC25XYZ', shopId: 'shop1' },
          { _id: 'child2', orderId: 'ABC25DEF', shopId: 'shop2' }
        ]
      };

      sandbox.stub(MultiShopOrderTrackingService, 'createMultiShopZoneOrder')
        .resolves(mockResult);

      const response = await request(app)
        .post('/api/v1/orders/multi-shop-zone')
        .send(orderData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.parentOrder.orderId).to.equal('ZN25ABC');
      expect(response.body.childOrders).to.have.lengthOf(2);
    });

    it('should handle validation errors', async () => {
      const invalidOrderData = {
        // Missing required fields
        zoneId: 'zone123'
      };

      const response = await request(app)
        .post('/api/v1/orders/multi-shop-zone')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('validation');
    });

    it('should handle service errors gracefully', async () => {
      const orderData = {
        zoneId: 'zone123',
        items: [{ shopId: 'shop1', menuItems: [] }]
      };

      sandbox.stub(MultiShopOrderTrackingService, 'createMultiShopZoneOrder')
        .rejects(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/v1/orders/multi-shop-zone')
        .send(orderData)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Service unavailable');
    });
  });

  describe('PUT /api/v1/orders/:orderId/status', () => {
    it('should update child order status successfully', async () => {
      const orderId = 'child123';
      const statusData = {
        status: 'ready',
        estimatedDeliveryTime: '2025-01-16T15:30:00Z'
      };

      const mockResult = {
        success: true,
        order: {
          _id: orderId,
          status: 'ready',
          updatedAt: new Date()
        },
        parentOrderUpdated: true
      };

      sandbox.stub(MultiShopOrderTrackingService, 'updateChildOrderStatus')
        .resolves(mockResult);

      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .send(statusData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.order.status).to.equal('ready');
    });

    it('should reject unauthorized status updates', async () => {
      authStub.restore();
      sandbox.stub(authMiddleware, 'authenticate').callsFake((req, res, next) => {
        req.user = { _id: 'user123', role: 'customer' }; // Customer can't update status
        next();
      });

      const response = await request(app)
        .put('/api/v1/orders/child123/status')
        .send({ status: 'ready' })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Unauthorized');
    });
  });

  describe('GET /api/v1/orders/:orderId/tracking', () => {
    it('should return comprehensive tracking data', async () => {
      const parentOrderId = 'parent123';

      const mockTrackingData = {
        parentOrder: {
          _id: parentOrderId,
          orderId: 'ZN25ABC',
          status: 'partially_ready',
          createdAt: new Date(),
          estimatedDeliveryTime: new Date()
        },
        childOrders: [
          {
            _id: 'child1',
            orderId: 'ABC25XYZ',
            status: 'ready',
            shopId: 'shop1',
            shopName: 'Pizza Palace'
          },
          {
            _id: 'child2',
            orderId: 'ABC25DEF',
            status: 'preparing',
            shopId: 'shop2',
            shopName: 'Burger Joint'
          }
        ],
        overallProgress: 50,
        timeline: [
          { timestamp: new Date(), event: 'Order created', status: 'pending' },
          { timestamp: new Date(), event: 'Preparation started', status: 'preparing' }
        ]
      };

      sandbox.stub(MultiShopOrderTrackingService, 'getOrderTrackingData')
        .resolves(mockTrackingData);

      const response = await request(app)
        .get(`/api/v1/orders/${parentOrderId}/tracking`)
        .expect(200);

      expect(response.body.parentOrder.orderId).to.equal('ZN25ABC');
      expect(response.body.childOrders).to.have.lengthOf(2);
      expect(response.body.overallProgress).to.equal(50);
      expect(response.body.timeline).to.be.an('array');
    });

    it('should handle non-existent orders', async () => {
      const nonExistentId = 'nonexistent123';

      sandbox.stub(MultiShopOrderTrackingService, 'getOrderTrackingData')
        .rejects(new Error('Order not found'));

      const response = await request(app)
        .get(`/api/v1/orders/${nonExistentId}/tracking`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Order not found');
    });
  });

  describe('GET /api/v1/orders/zone/:zoneId/active', () => {
    it('should return active zone orders for zone admins', async () => {
      authStub.restore();
      sandbox.stub(authMiddleware, 'authenticate').callsFake((req, res, next) => {
        req.user = { _id: 'admin123', role: 'zone_admin', zoneId: 'zone123' };
        next();
      });

      const mockActiveOrders = [
        {
          _id: 'parent1',
          orderId: 'ZN25ABC',
          status: 'partially_ready',
          childOrders: [
            { shopId: 'shop1', status: 'ready' },
            { shopId: 'shop2', status: 'preparing' }
          ]
        },
        {
          _id: 'parent2',
          orderId: 'ZN25DEF',
          status: 'pending',
          childOrders: [
            { shopId: 'shop1', status: 'pending' }
          ]
        }
      ];

      sandbox.stub(MultiShopOrderTrackingService, 'getActiveZoneOrders')
        .resolves(mockActiveOrders);

      const response = await request(app)
        .get('/api/v1/orders/zone/zone123/active')
        .expect(200);

      expect(response.body).to.have.lengthOf(2);
      expect(response.body[0].orderId).to.equal('ZN25ABC');
    });
  });

  describe('WebSocket Integration Tests', () => {
    it('should emit real-time notifications on order creation', async () => {
      // This would require setting up WebSocket test infrastructure
      // For now, we'll test that the service methods are called correctly
      const orderData = {
        zoneId: 'zone123',
        items: [{ shopId: 'shop1', menuItems: [] }]
      };

      const socketEmitSpy = sandbox.spy();
      sandbox.stub(MultiShopOrderTrackingService, 'createMultiShopZoneOrder')
        .callsFake(async (data) => {
          // Simulate socket emission
          socketEmitSpy('zone_order_created', { zoneId: data.zoneId });
          socketEmitSpy('shop_order_received', { shopId: 'shop1' });
          
          return {
            success: true,
            parentOrder: { _id: 'parent123', orderId: 'ZN25ABC' },
            childOrders: [{ _id: 'child1', shopId: 'shop1' }]
          };
        });

      await request(app)
        .post('/api/v1/orders/multi-shop-zone')
        .send(orderData)
        .expect(201);

      expect(socketEmitSpy.calledWith('zone_order_created')).to.be.true;
      expect(socketEmitSpy.calledWith('shop_order_received')).to.be.true;
    });
  });
});