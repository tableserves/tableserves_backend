/**
 * Real-Time Order Tracker
 * Comprehensive real-time order tracking service for both restaurant and zone orders
 * Handles WebSocket connections, status updates, and shop-wise tracking for zones
 */

import RealTimeService from './RealTimeService';
import OrderTrackingAPI from './OrderTrackingAPI';
import { logger } from '../shared/logging/logger';
import { store } from '../store';
import { ORDER_EVENTS, ROOM_EVENTS, CONNECTION_EVENTS } from '../shared/realtime/socketEvents';

class RealTimeOrderTracker {
  constructor() {
    this.activeTrackers = new Map(); // orderId -> tracker instance
    this.zoneShopTrackers = new Map(); // zoneId -> Map(shopId -> tracker)
    this.restaurantTrackers = new Map(); // restaurantId -> tracker
    this.eventListeners = new Map(); // event -> Set(callbacks)
    this.isInitialized = false;
    this.reconnectInterval = null;
    this.healthCheckInterval = null;
  }

  /**
   * Initialize the real-time order tracker
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('RealTimeOrderTracker already initialized');
      return;
    }

    try {
      logger.info('Initializing RealTimeOrderTracker');

      // Ensure RealTimeService is connected
      if (!RealTimeService.isConnected) {
        await RealTimeService.connect();
      }

      // Set up global event listeners
      this.setupGlobalEventListeners();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info('RealTimeOrderTracker initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize RealTimeOrderTracker', { error: error.message });
      throw error;
    }
  }

  /**
   * Track a specific order with real-time updates
   * @param {string} orderNumber - Order number to track (primary identifier)
   * @param {Object} options - Tracking options
   * @returns {Object} Tracker instance
   */
  async trackOrder(orderNumber, options = {}) {
    const {
      orderId, // Database ID passed as additional context
      customerPhone,
      onStatusUpdate,
      onError,
      fetchInterval = 3000 // 3 seconds fallback polling
    } = options;

    try {
      logger.info('Starting order tracking', { orderNumber, orderId });

      // Stop existing tracker for this order (use orderNumber as primary key)
      this.stopOrderTracking(orderNumber);

      // Create new tracker instance
      const tracker = {
        orderId,
        orderNumber,
        customerPhone,
        onStatusUpdate,
        onError,
        fetchInterval,
        lastUpdate: null,
        pollTimer: null,
        isActive: true,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5
      };

      // Store tracker using orderNumber as primary key
      this.activeTrackers.set(orderNumber, tracker);

      logger.info('✅ Tracker stored in activeTrackers Map', {
        orderNumber,
        orderId,
        mapSize: this.activeTrackers.size,
        allKeys: Array.from(this.activeTrackers.keys())
      });

      // Subscribe to real-time updates
      await this.subscribeToOrderUpdates(tracker);

      // Start fallback polling
      this.startFallbackPolling(tracker);

      logger.info('Order tracking started successfully', {
        orderNumber,
        orderId,
        trackerStored: this.activeTrackers.has(orderNumber),
        totalTrackers: this.activeTrackers.size
      });
      return tracker;

    } catch (error) {
      logger.error('Failed to start order tracking', { orderNumber, orderId, error: error.message });
      if (options.onError) options.onError(error);
      throw error;
    }
  }

  /**
   * Track orders for a zone shop with real-time updates
   * @param {string} zoneId - Zone ID
   * @param {string} shopId - Shop ID
   * @param {Object} options - Tracking options
   * @returns {Object} Zone shop tracker instance
   */
  async trackZoneShopOrders(zoneId, shopId, options = {}) {
    const {
      onOrderUpdate,
      onStatusUpdate,
      onNewOrder,
      onError,
      fetchInterval = 15000 // 15 seconds for live orders
    } = options;

    try {
      logger.info('Starting zone shop order tracking', { zoneId, shopId });

      // Initialize zone trackers map if needed
      if (!this.zoneShopTrackers.has(zoneId)) {
        this.zoneShopTrackers.set(zoneId, new Map());
      }

      const zoneTrackers = this.zoneShopTrackers.get(zoneId);

      // Stop existing tracker for this shop
      this.stopZoneShopTracking(zoneId, shopId);

      // Create new tracker instance
      const tracker = {
        zoneId,
        shopId,
        onOrderUpdate,
        onStatusUpdate,
        onNewOrder,
        onError,
        fetchInterval,
        lastFetch: null,
        orders: new Map(), // orderId -> order data
        pollTimer: null,
        isActive: true,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5
      };

      // Store tracker
      zoneTrackers.set(shopId, tracker);

      // Subscribe to real-time updates for this shop
      await this.subscribeToZoneShopUpdates(tracker);

      // Start live order fetching
      this.startZoneShopPolling(tracker);

      logger.info('Zone shop order tracking started successfully', { zoneId, shopId });
      return tracker;

    } catch (error) {
      logger.error('Failed to start zone shop order tracking', { zoneId, shopId, error: error.message });
      if (options.onError) options.onError(error);
      throw error;
    }
  }

  /**
   * Track orders for a restaurant with real-time updates
   * @param {string} restaurantId - Restaurant ID
   * @param {Object} options - Tracking options
   * @returns {Object} Restaurant tracker instance
   */
  async trackRestaurantOrders(restaurantId, options = {}) {
    const {
      onOrderUpdate,
      onStatusUpdate,
      onNewOrder,
      onError,
      fetchInterval = 15000 // 15 seconds for live orders
    } = options;

    try {
      logger.info('Starting restaurant order tracking', { restaurantId });

      // Stop existing tracker for this restaurant
      this.stopRestaurantTracking(restaurantId);

      // Create new tracker instance
      const tracker = {
        restaurantId,
        onOrderUpdate,
        onStatusUpdate,
        onNewOrder,
        onError,
        fetchInterval,
        lastFetch: null,
        orders: new Map(), // orderId -> order data
        pollTimer: null,
        isActive: true,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5
      };

      // Store tracker
      this.restaurantTrackers.set(restaurantId, tracker);

      // Subscribe to real-time updates for this restaurant
      await this.subscribeToRestaurantUpdates(tracker);

      // Start live order fetching
      this.startRestaurantPolling(tracker);

      logger.info('Restaurant order tracking started successfully', { restaurantId });
      return tracker;

    } catch (error) {
      logger.error('Failed to start restaurant order tracking', { restaurantId, error: error.message });
      if (options.onError) options.onError(error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for a specific order
   */
  async subscribeToOrderUpdates(tracker) {
    const { orderId, orderNumber, customerPhone } = tracker;

    try {
      // Ensure WebSocket connection
      if (!RealTimeService.isConnected) {
        await this.ensureConnection();
      }

      // PRIMARY: Join tracking room using standardized event
      if (orderNumber) {
        // Emit join request
        await RealTimeService.emit(ROOM_EVENTS.TRACK_ORDER, {
          orderNumber,
          customerPhone
        });
        
        // Wait for room join confirmation with timeout
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            logger.warn('Room join confirmation timeout', { orderNumber });
            resolve();
          }, 3000);
          
          const confirmHandler = (data) => {
            if (data.roomId === orderNumber && data.roomType === 'tracking') {
              logger.info('✅ Room join CONFIRMED by server', {
                orderNumber,
                room: data.room,
                roomType: data.roomType
              });
              clearTimeout(timeout);
              RealTimeService.removeEventListener(ROOM_EVENTS.ROOM_JOINED, confirmHandler);
              resolve();
            }
          };
          
          RealTimeService.addEventListener(ROOM_EVENTS.ROOM_JOINED, confirmHandler);
        });
        
        logger.info('Joined PRIMARY tracking room', {
          orderNumber,
          event: ROOM_EVENTS.TRACK_ORDER
        });
      }

      logger.info('Subscribed to order real-time updates', {
        orderId,
        orderNumber,
        customerPhone
      });

    } catch (error) {
      logger.error('Failed to subscribe to order updates', { orderId, error: error.message });
      this.handleTrackerError(tracker, error);
    }
  }

  /**
   * Subscribe to real-time updates for zone shop orders
   */
  async subscribeToZoneShopUpdates(tracker) {
    const { zoneId, shopId } = tracker;

    try {
      // Ensure WebSocket connection
      if (!RealTimeService.isConnected) {
        await this.ensureConnection();
      }

      // Subscribe to zone room for zone-wide updates
      RealTimeService.joinRoom('zone', zoneId);

      // Subscribe to shop room for shop-specific updates
      RealTimeService.joinRoom('shop', shopId);

      logger.info('Subscribed to zone shop real-time updates', { zoneId, shopId });

    } catch (error) {
      logger.error('Failed to subscribe to zone shop updates', { zoneId, shopId, error: error.message });
      this.handleTrackerError(tracker, error);
    }
  }

  /**
   * Subscribe to real-time updates for restaurant orders
   */
  async subscribeToRestaurantUpdates(tracker) {
    const { restaurantId } = tracker;

    try {
      // Ensure WebSocket connection
      if (!RealTimeService.isConnected) {
        await this.ensureConnection();
      }

      // Subscribe to restaurant room
      RealTimeService.joinRoom('restaurant', restaurantId);

      logger.info('Subscribed to restaurant real-time updates', { restaurantId });

    } catch (error) {
      logger.error('Failed to subscribe to restaurant updates', { restaurantId, error: error.message });
      this.handleTrackerError(tracker, error);
    }
  }

  /**
   * Start fallback polling for order updates
   * DISABLED: Backend endpoint is broken, relying on WebSocket only
   */
  startFallbackPolling(tracker) {
    const { orderId, orderNumber, fetchInterval } = tracker;
    
    // DISABLED: The /api/v1/orders/customer/{orderId} endpoint is returning 500 errors
    // We're relying entirely on WebSocket updates for now
    logger.info('Fallback polling DISABLED - using WebSocket only', { 
      orderId, 
      orderNumber,
      reason: 'Backend endpoint /api/v1/orders/customer/{orderId} is broken'
    });
    
    // Don't start polling to avoid infinite error loops
    return;
    
    /* ORIGINAL CODE - DISABLED
    tracker.pollTimer = setInterval(async () => {
      if (!tracker.isActive) return;

      try {
        logger.debug('Polling for order updates', { orderId });

        // Fetch latest order data with customer phone for verification
        const orderData = await OrderTrackingAPI.fetchOrderById(orderId, customerPhone);

        // Check if status changed
        if (tracker.lastUpdate?.status !== orderData.status) {
          logger.info('Order status changed (polling)', {
            orderId,
            oldStatus: tracker.lastUpdate?.status,
            newStatus: orderData.status
          });

          if (tracker.onStatusUpdate) {
            tracker.onStatusUpdate(orderData);
          }
        }

        tracker.lastUpdate = orderData;
        tracker.reconnectAttempts = 0; // Reset on successful fetch

      } catch (error) {
        logger.warn('Order polling failed', { orderId, error: error.message });
        this.handleTrackerError(tracker, error);
      }
    }, fetchInterval);

    logger.debug('Started fallback polling for order', { orderId, fetchInterval });
    */
  }

  /**
   * Start polling for zone shop orders
   */
  startZoneShopPolling(tracker) {
    const { zoneId, shopId, fetchInterval } = tracker;

    tracker.pollTimer = setInterval(async () => {
      if (!tracker.isActive) return;

      try {
        logger.debug('Polling for zone shop orders', { zoneId, shopId });

        // Fetch latest orders
        const orders = await OrderTrackingAPI.fetchZoneShopOrders(shopId, {
          status: ['pending', 'confirmed', 'preparing', 'ready']
        });

        // Process order updates
        this.processOrderUpdates(tracker, orders);

        tracker.lastFetch = Date.now();
        tracker.reconnectAttempts = 0; // Reset on successful fetch

      } catch (error) {
        logger.warn('Zone shop order polling failed', { zoneId, shopId, error: error.message });
        this.handleTrackerError(tracker, error);
      }
    }, fetchInterval);

    logger.debug('Started zone shop order polling', { zoneId, shopId, fetchInterval });
  }

  /**
   * Start polling for restaurant orders
   */
  startRestaurantPolling(tracker) {
    const { restaurantId, fetchInterval } = tracker;

    tracker.pollTimer = setInterval(async () => {
      if (!tracker.isActive) return;

      try {
        logger.debug('Polling for restaurant orders', { restaurantId });

        // Fetch latest orders
        const orders = await OrderTrackingAPI.fetchRestaurantOrders(restaurantId, {
          status: ['pending', 'confirmed', 'preparing', 'ready']
        });

        // Process order updates
        this.processOrderUpdates(tracker, orders);

        tracker.lastFetch = Date.now();
        tracker.reconnectAttempts = 0; // Reset on successful fetch

      } catch (error) {
        logger.warn('Restaurant order polling failed', { restaurantId, error: error.message });
        this.handleTrackerError(tracker, error);
      }
    }, fetchInterval);

    logger.debug('Started restaurant order polling', { restaurantId, fetchInterval });
  }

  /**
   * Process order updates for zone/restaurant trackers
   */
  processOrderUpdates(tracker, orders) {
    const previousOrders = tracker.orders;
    const currentOrders = new Map();

    // Process each order
    orders.forEach(order => {
      const orderId = order._id || order.orderId;
      currentOrders.set(orderId, order);

      const previousOrder = previousOrders.get(orderId);

      if (!previousOrder) {
        // New order
        logger.info('New order detected', { orderId, orderNumber: order.orderNumber });
        if (tracker.onNewOrder) {
          tracker.onNewOrder(order);
        }
      } else if (previousOrder.status !== order.status) {
        // Status update
        logger.info('Order status update detected', {
          orderId,
          orderNumber: order.orderNumber,
          oldStatus: previousOrder.status,
          newStatus: order.status
        });
        if (tracker.onStatusUpdate) {
          tracker.onStatusUpdate(order, previousOrder);
        }
      } else if (JSON.stringify(previousOrder) !== JSON.stringify(order)) {
        // Other updates
        logger.debug('Order data update detected', { orderId, orderNumber: order.orderNumber });
        if (tracker.onOrderUpdate) {
          tracker.onOrderUpdate(order, previousOrder);
        }
      }
    });

    // Update tracker orders
    tracker.orders = currentOrders;
  }

  /**
   * Set up global event listeners for real-time updates
   */
  setupGlobalEventListeners() {
    logger.info('Setting up global real-time event listeners');

    // Listen for ORDER_STATUS_UPDATED (standardized event)
    RealTimeService.addEventListener(ORDER_EVENTS.ORDER_STATUS_UPDATED, (data) => {
      logger.info('🔄 RealTimeOrderTracker received ORDER_STATUS_UPDATED event', { data });
      this.handleOrderStatusChange(data);
    });

    // Listen for NEW_ORDER (for new order notifications)
    RealTimeService.addEventListener(ORDER_EVENTS.NEW_ORDER, (data) => {
      logger.info('🆕 Received NEW_ORDER event', { data });
      this.handleNewOrder(data);
    });

    // Listen for ORDER_CREATED (when customer's order is created)
    RealTimeService.addEventListener(ORDER_EVENTS.ORDER_CREATED, (data) => {
      logger.info('✅ Received ORDER_CREATED event', { data });
      this.handleOrderStatusChange({ ...data, status: data.status || 'confirmed' });
    });

    // Connection events
    RealTimeService.addEventListener(CONNECTION_EVENTS.CONNECT, () => {
      logger.info('🔗 WebSocket connected - handling reconnection');
      this.handleReconnection();
    });

    RealTimeService.addEventListener(CONNECTION_EVENTS.DISCONNECT, () => {
      logger.warn('🔌 WebSocket disconnected - handling disconnection');
      this.handleDisconnection();
    });

    logger.info('✅ Global real-time event listeners set up successfully');
  }

  /**
   * Handle order status change from WebSocket
   */
  handleOrderStatusChange(data) {
    // Handle different data structures from backend
    const orderId = data.orderId || data._id || data.id;
    const orderNumber = data.orderNumber;
    const newStatus = data.newStatus || data.status;
    const oldStatus = data.oldStatus || data.previousStatus;

    logger.info('🔄 Real-time order status change received', {
      orderId,
      orderNumber,
      oldStatus,
      newStatus,
      dataKeys: Object.keys(data),
      fullData: data,
      activeTrackersCount: this.activeTrackers.size,
      activeTrackerKeys: Array.from(this.activeTrackers.keys())
    });

    let trackerFound = false;

    // PRIORITY 1: Try to find tracker by orderNumber FIRST (since that's the primary key)
    if (orderNumber) {
      const trackerByOrderNumber = this.activeTrackers.get(orderNumber);
      if (trackerByOrderNumber && trackerByOrderNumber.onStatusUpdate) {
        logger.info('📍 Found tracker by orderNumber (PRIMARY KEY), calling onStatusUpdate', {
          orderNumber,
          trackerExists: !!trackerByOrderNumber,
          hasCallback: !!trackerByOrderNumber.onStatusUpdate,
          newStatus,
          oldStatus
        });

        trackerByOrderNumber.onStatusUpdate({
          _id: trackerByOrderNumber.orderId || orderId,
          orderId: trackerByOrderNumber.orderId || orderId,
          orderNumber,
          status: newStatus,
          previousStatus: oldStatus,
          ...data
        });
        trackerFound = true;
      } else {
        // Only log warning if we have other trackers (i.e., we're on a tracking page)
        if (this.activeTrackers.size > 0) {
          logger.warn('⚠️ No tracker found for orderNumber (primary key)', {
            orderNumber,
            searchedKey: orderNumber,
            availableTrackers: Array.from(this.activeTrackers.keys()),
            mapSize: this.activeTrackers.size,
            trackerExists: !!trackerByOrderNumber,
            hasCallback: trackerByOrderNumber?.onStatusUpdate,
            allTrackerDetails: Array.from(this.activeTrackers.entries()).map(([key, tracker]) => ({
              key,
              orderNumber: tracker.orderNumber,
              orderId: tracker.orderId,
              hasCallback: !!tracker.onStatusUpdate
            }))
          });
        }
      }
    }

    // PRIORITY 2: Try to find tracker by orderId if orderNumber didn't work
    if (!trackerFound && orderId) {
      const trackerById = this.activeTrackers.get(orderId);
      if (trackerById && trackerById.onStatusUpdate) {
        logger.info('📍 Found tracker by orderId, calling onStatusUpdate', {
          orderId,
          trackerExists: !!trackerById,
          hasCallback: !!trackerById.onStatusUpdate
        });

        trackerById.onStatusUpdate({
          _id: orderId,
          orderId,
          orderNumber,
          status: newStatus,
          previousStatus: oldStatus,
          ...data
        });
        trackerFound = true;
      }
    }

    // PRIORITY 3: Search through all trackers by orderNumber (case insensitive)
    if (!trackerFound && orderNumber) {
      for (const [trackerId, tracker] of this.activeTrackers.entries()) {
        if (tracker.orderNumber &&
          tracker.orderNumber.toLowerCase() === orderNumber.toLowerCase() &&
          tracker.onStatusUpdate) {
          logger.info('📍 Found tracker by orderNumber (case insensitive search), calling onStatusUpdate', {
            trackerId,
            orderNumber,
            trackerOrderNumber: tracker.orderNumber,
            newStatus,
            oldStatus
          });

          tracker.onStatusUpdate({
            _id: tracker.orderId || orderId,
            orderId: tracker.orderId || orderId,
            orderNumber,
            status: newStatus,
            previousStatus: oldStatus,
            ...data
          });
          trackerFound = true;
          break;
        }
      }
    }

    // PRIORITY 4: Try to find tracker by customer phone if still not found
    if (!trackerFound && data.customerPhone) {
      for (const [trackerId, tracker] of this.activeTrackers.entries()) {
        if (tracker.customerPhone === data.customerPhone && tracker.onStatusUpdate) {
          logger.info('📍 Found tracker by customerPhone, calling onStatusUpdate', {
            trackerId,
            customerPhone: data.customerPhone,
            trackerPhone: tracker.customerPhone
          });

          tracker.onStatusUpdate({
            _id: tracker.orderId || orderId,
            orderId: tracker.orderId || orderId,
            orderNumber: tracker.orderNumber,
            status: newStatus,
            previousStatus: oldStatus,
            ...data
          });
          trackerFound = true;
          break;
        }
      }
    }

    if (!trackerFound) {
      // Only log warning if we have trackers registered (i.e., we're on a tracking page)
      // Restaurant/admin dashboards don't use RealTimeOrderTracker, they use Redux directly
      if (this.activeTrackers.size > 0) {
        logger.warn('❌ No matching tracker found for order', {
          orderId,
          orderNumber,
          customerPhone: data.customerPhone,
          activeTrackers: Array.from(this.activeTrackers.keys()),
          trackersWithOrderNumbers: Array.from(this.activeTrackers.entries()).map(([id, tracker]) => ({
            id,
            orderNumber: tracker.orderNumber,
            customerPhone: tracker.customerPhone
          }))
        });
      } else {
        // Debug log only - this is normal for restaurant/admin dashboards
        logger.debug('ℹ️ Order status update received but no trackers registered (normal for restaurant/admin dashboards)', {
          orderId,
          orderNumber,
          customerPhone: data.customerPhone
        });
      }
    } else {
      logger.info('✅ Successfully called onStatusUpdate callback for order', {
        orderId,
        orderNumber,
        newStatus,
        oldStatus
      });
    }

    // Update zone/restaurant trackers
    if (orderId) {
      this.updateTrackersForOrder(orderId, data);
    }

    // Trigger custom event listeners
    this.triggerEvent('orderStatusChange', data);

    // Also trigger the legacy event name for compatibility
    this.triggerEvent('statusChanged', data);
  }

  /**
   * Handle new order from WebSocket
   */
  handleNewOrder(data) {
    const { restaurantId, zoneId, shopId } = data;

    logger.info('Real-time new order received', { restaurantId, zoneId, shopId });

    // Update restaurant trackers
    if (restaurantId) {
      const tracker = this.restaurantTrackers.get(restaurantId);
      if (tracker && tracker.onNewOrder) {
        tracker.onNewOrder(data);
      }
    }

    // Update zone shop trackers
    if (zoneId && shopId) {
      const zoneTrackers = this.zoneShopTrackers.get(zoneId);
      if (zoneTrackers) {
        const tracker = zoneTrackers.get(shopId);
        if (tracker && tracker.onNewOrder) {
          tracker.onNewOrder(data);
        }
      }
    }

    // Trigger custom event listeners
    this.triggerEvent('newOrder', data);
  }

  /**
   * Handle order update from WebSocket
   */
  handleOrderUpdate(data) {
    const orderId = data.orderId || data._id;
    const orderNumber = data.orderNumber;

    logger.debug('Real-time order update received', { orderId, orderNumber, data });

    // Update individual order trackers by orderId
    if (orderId) {
      const tracker = this.activeTrackers.get(orderId);
      if (tracker && tracker.onOrderUpdate) {
        tracker.onOrderUpdate(data);
      }
    }

    // Also try to find tracker by orderNumber if orderId not found
    if (!orderId && orderNumber) {
      for (const [trackerId, tracker] of this.activeTrackers.entries()) {
        if (tracker.orderNumber === orderNumber && tracker.onOrderUpdate) {
          tracker.onOrderUpdate(data);
          break;
        }
      }
    }

    // Update zone/restaurant trackers
    if (orderId) {
      this.updateTrackersForOrder(orderId, data);
    }

    // Trigger custom event listeners
    this.triggerEvent('orderUpdate', data);
  }

  /**
   * Update all relevant trackers for an order
   */
  updateTrackersForOrder(orderId, orderData) {
    // Update restaurant trackers
    for (const tracker of this.restaurantTrackers.values()) {
      if (tracker.orders.has(orderId)) {
        tracker.orders.set(orderId, orderData);
        if (tracker.onOrderUpdate) {
          tracker.onOrderUpdate(orderData);
        }
      }
    }

    // Update zone shop trackers
    for (const zoneTrackers of this.zoneShopTrackers.values()) {
      for (const tracker of zoneTrackers.values()) {
        if (tracker.orders.has(orderId)) {
          tracker.orders.set(orderId, orderData);
          if (tracker.onOrderUpdate) {
            tracker.onOrderUpdate(orderData);
          }
        }
      }
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  async handleReconnection() {
    logger.info('WebSocket reconnected, resubscribing to all trackers');

    try {
      // Resubscribe individual order trackers
      for (const tracker of this.activeTrackers.values()) {
        logger.info('Resubscribing order tracker after reconnection', {
          orderNumber: tracker.orderNumber,
          orderId: tracker.orderId
        });
        await this.subscribeToOrderUpdates(tracker);
      }

      // Resubscribe restaurant trackers
      for (const tracker of this.restaurantTrackers.values()) {
        await this.subscribeToRestaurantUpdates(tracker);
      }

      // Resubscribe zone shop trackers
      for (const zoneTrackers of this.zoneShopTrackers.values()) {
        for (const tracker of zoneTrackers.values()) {
          await this.subscribeToZoneShopUpdates(tracker);
        }
      }

      logger.info('All trackers resubscribed after reconnection', {
        orderTrackers: this.activeTrackers.size,
        restaurantTrackers: this.restaurantTrackers.size,
        zoneTrackers: this.zoneShopTrackers.size
      });

    } catch (error) {
      logger.error('Failed to resubscribe trackers after reconnection', { error: error.message });
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnection() {
    logger.warn('WebSocket disconnected, trackers will rely on polling');

    // Trigger event for UI notification
    this.triggerEvent('connectionLost', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle tracker errors with exponential backoff
   */
  handleTrackerError(tracker, error) {
    tracker.reconnectAttempts++;

    if (tracker.reconnectAttempts > tracker.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached for tracker', {
        trackerId: tracker.orderId || tracker.shopId || tracker.restaurantId,
        error: error.message
      });

      if (tracker.onError) {
        tracker.onError(error);
      }

      return;
    }

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, tracker.reconnectAttempts - 1), 30000);

    logger.warn('Tracker error, will retry', {
      trackerId: tracker.orderId || tracker.shopId || tracker.restaurantId,
      attempt: tracker.reconnectAttempts,
      delay,
      error: error.message
    });

    setTimeout(async () => {
      try {
        // Try to reestablish connection
        await this.ensureConnection();

        // Resubscribe based on tracker type
        if (tracker.orderId) {
          await this.subscribeToOrderUpdates(tracker);
        } else if (tracker.shopId) {
          await this.subscribeToZoneShopUpdates(tracker);
        } else if (tracker.restaurantId) {
          await this.subscribeToRestaurantUpdates(tracker);
        }

        logger.info('Tracker reconnected successfully', {
          trackerId: tracker.orderId || tracker.shopId || tracker.restaurantId
        });

        tracker.reconnectAttempts = 0;

      } catch (retryError) {
        logger.error('Tracker reconnection failed', {
          trackerId: tracker.orderId || tracker.shopId || tracker.restaurantId,
          error: retryError.message
        });

        this.handleTrackerError(tracker, retryError);
      }
    }, delay);
  }

  /**
   * Ensure WebSocket connection is established
   */
  async ensureConnection() {
    if (!RealTimeService.isConnected) {
      logger.info('Reconnecting to WebSocket service');
      await RealTimeService.connect();
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      const health = RealTimeService.isHealthy();

      if (health.healthScore < 50) {
        logger.warn('RealTimeService health score is low', { healthScore: health.healthScore });

        // Try to reconnect if needed
        if (!RealTimeService.isConnected) {
          RealTimeService.retryConnection();
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop tracking for a specific order
   */
  stopOrderTracking(orderNumber) {
    const tracker = this.activeTrackers.get(orderNumber);
    if (tracker) {
      tracker.isActive = false;
      if (tracker.pollTimer) {
        clearInterval(tracker.pollTimer);
      }
      this.activeTrackers.delete(orderNumber);
      logger.info('Stopped order tracking', { orderNumber, orderId: tracker.orderId });
    }
  }

  /**
   * Stop tracking for a zone shop
   */
  stopZoneShopTracking(zoneId, shopId) {
    const zoneTrackers = this.zoneShopTrackers.get(zoneId);
    if (zoneTrackers) {
      const tracker = zoneTrackers.get(shopId);
      if (tracker) {
        tracker.isActive = false;
        if (tracker.pollTimer) {
          clearInterval(tracker.pollTimer);
        }
        zoneTrackers.delete(shopId);

        // Clean up empty zone tracker map
        if (zoneTrackers.size === 0) {
          this.zoneShopTrackers.delete(zoneId);
        }

        logger.info('Stopped zone shop tracking', { zoneId, shopId });
      }
    }
  }

  /**
   * Stop tracking for a restaurant
   */
  stopRestaurantTracking(restaurantId) {
    const tracker = this.restaurantTrackers.get(restaurantId);
    if (tracker) {
      tracker.isActive = false;
      if (tracker.pollTimer) {
        clearInterval(tracker.pollTimer);
      }
      this.restaurantTrackers.delete(restaurantId);
      logger.info('Stopped restaurant tracking', { restaurantId });
    }
  }

  /**
   * Stop all tracking
   */
  stopAllTracking() {
    // Stop individual order trackers
    for (const tracker of this.activeTrackers.values()) {
      tracker.isActive = false;
      if (tracker.pollTimer) {
        clearInterval(tracker.pollTimer);
      }
    }
    this.activeTrackers.clear();

    // Stop restaurant trackers
    for (const tracker of this.restaurantTrackers.values()) {
      tracker.isActive = false;
      if (tracker.pollTimer) {
        clearInterval(tracker.pollTimer);
      }
    }
    this.restaurantTrackers.clear();

    // Stop zone shop trackers
    for (const zoneTrackers of this.zoneShopTrackers.values()) {
      for (const tracker of zoneTrackers.values()) {
        tracker.isActive = false;
        if (tracker.pollTimer) {
          clearInterval(tracker.pollTimer);
        }
      }
    }
    this.zoneShopTrackers.clear();

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Stopped all order tracking');
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  /**
   * Trigger event
   */
  triggerEvent(event, data) {
    if (this.eventListeners.has(event)) {
      for (const callback of this.eventListeners.get(event)) {
        try {
          callback(data);
        } catch (error) {
          logger.error('Error in event listener', { event, error: error.message });
        }
      }
    }
  }

  /**
   * Get tracker statistics
   */
  getStats() {
    return {
      activeOrderTrackers: this.activeTrackers.size,
      restaurantTrackers: this.restaurantTrackers.size,
      zoneShopTrackers: Array.from(this.zoneShopTrackers.values())
        .reduce((total, zoneTrackers) => total + zoneTrackers.size, 0),
      isInitialized: this.isInitialized,
      realTimeServiceHealth: RealTimeService.isHealthy()
    };
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    this.stopAllTracking();
    this.eventListeners.clear();
    this.isInitialized = false;
    logger.info('RealTimeOrderTracker cleanup completed');
  }
}

// Export singleton instance
export default new RealTimeOrderTracker();