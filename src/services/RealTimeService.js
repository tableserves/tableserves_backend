import { io } from 'socket.io-client';
import { store } from '../store';
import { logger } from '../shared/logging/logger';
import { 
  connectionEstablished, 
  connectionLost, 
  connectionAttempting, 
  connectionError,
  roomSubscribed,
  roomUnsubscribed,
  messageReceived,
  messageSent,
  latencyUpdated,
  notificationReceived,
  systemAnnouncement,
  uptimeUpdated
} from '../store/slices/realtimeSlice';
import { 
  orderCreated, 
  orderUpdated, 
  statusChanged 
} from '../store/slices/ordersSlice';

class RealTimeService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 8; // Increased for better resilience
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.eventListeners = new Map();
    this.subscriptions = new Set();
    
    // Connection state
    this.connectionPromise = null;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error, offline
    
    // Enhanced error handling
    this.errorTypes = {
      NETWORK_ERROR: 'NETWORK_ERROR',
      AUTH_ERROR: 'AUTH_ERROR',
      SERVER_ERROR: 'SERVER_ERROR',
      TIMEOUT_ERROR: 'TIMEOUT_ERROR',
      CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN'
    };
    
    // Circuit breaker pattern
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      nextAttempt: null
    };
    
    // Network state monitoring
    this.isOnline = navigator.onLine;
    this.networkListeners = new Set();
    
    // Performance monitoring
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      reconnections: 0,
      lastLatency: 0,
      averageLatency: 0,
      connectionTime: null,
      totalDowntime: 0,
      lastConnectionLoss: null,
      connectionSuccessRate: 100,
      totalAttempts: 0,
      successfulAttempts: 0
    };

    // Data sync handlers
    this.pendingRequests = new Map();
    this.requestTimeout = 30000; // Increased timeout to 30 seconds for better reliability
    
    // Initialize network listeners
    this.initializeNetworkListeners();
  }

  /**
   * Initialize network state listeners
   */
  initializeNetworkListeners() {
    const handleOnline = () => {
      this.isOnline = true;
      logger.info('Network connection restored');
      
      // Attempt reconnection if we were disconnected due to network issues
      if (this.connectionState === 'error' || this.connectionState === 'offline') {
        logger.info('Attempting reconnection after network restoration');
        this.retryConnection();
      }
    };
    
    const handleOffline = () => {
      this.isOnline = false;
      this.connectionState = 'offline';
      logger.warn('Network connection lost');
      
      store.dispatch(connectionError({
        error: 'Network connection lost',
        errorType: this.errorTypes.NETWORK_ERROR,
        timestamp: new Date().toISOString()
      }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Store listeners for cleanup
    this.networkListeners.add(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  }

  /**
   * Categorize error types for better handling
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    
    // Network errors
    if (message.includes('econnrefused') || 
        message.includes('connection refused') ||
        message.includes('err_connection_refused') ||
        code === 'econnrefused' ||
        !this.isOnline) {
      return this.errorTypes.NETWORK_ERROR;
    }
    
    // Timeout errors
    if (message.includes('timeout') || 
        message.includes('etimedout') ||
        code.includes('timeout')) {
      return this.errorTypes.TIMEOUT_ERROR;
    }
    
    // Authentication errors
    if (message.includes('unauthorized') ||
        message.includes('auth') ||
        message.includes('token') ||
        error.status === 401 ||
        error.status === 403) {
      return this.errorTypes.AUTH_ERROR;
    }
    
    // Server errors
    if (message.includes('server') ||
        error.status >= 500) {
      return this.errorTypes.SERVER_ERROR;
    }
    
    return 'UNKNOWN';
  }

  /**
   * Update circuit breaker state based on operation result
   */
  updateCircuitBreaker(result, errorType = null) {
    const now = Date.now();
    
    if (result === 'SUCCESS') {
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.state = 'CLOSED';
      this.metrics.successfulAttempts++;
    } else if (result === 'FAILURE') {
      this.circuitBreaker.failureCount++;
      
      // Don't count network errors against circuit breaker in offline mode
      if (!this.isOnline && errorType === this.errorTypes.NETWORK_ERROR) {
        return;
      }
      
      if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
        this.circuitBreaker.state = 'OPEN';
        this.circuitBreaker.nextAttempt = now + this.circuitBreaker.timeout;
        
        logger.warn('Circuit breaker opened due to repeated failures', {
          failureCount: this.circuitBreaker.failureCount,
          nextAttempt: new Date(this.circuitBreaker.nextAttempt).toISOString()
        });
      }
    }
    
    // Update connection success rate
    this.metrics.connectionSuccessRate = this.metrics.totalAttempts > 0 
      ? Math.round((this.metrics.successfulAttempts / this.metrics.totalAttempts) * 100)
      : 100;
    
    // Ensure success rate is a valid number
    if (isNaN(this.metrics.connectionSuccessRate) || this.metrics.connectionSuccessRate < 0) {
      this.metrics.connectionSuccessRate = 0;
    } else if (this.metrics.connectionSuccessRate > 100) {
      this.metrics.connectionSuccessRate = 100;
    }
  }

  /**
   * Determine if we should retry based on error type and conditions
   */
  shouldRetry(errorType, error) {
    // Don't retry if offline
    if (!this.isOnline) {
      return false;
    }
    
    // Don't retry if circuit breaker is open
    if (this.circuitBreaker.state === 'OPEN') {
      return false;
    }
    
    // Don't retry if max attempts reached
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }
    
    // Don't retry on auth errors (need new token)
    if (errorType === this.errorTypes.AUTH_ERROR) {
      return false;
    }
    
    // Retry on network, timeout, and server errors
    return [this.errorTypes.NETWORK_ERROR, this.errorTypes.TIMEOUT_ERROR, this.errorTypes.SERVER_ERROR].includes(errorType);
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorType, error) {
    switch (errorType) {
      case this.errorTypes.NETWORK_ERROR:
        return '🔴 Cannot connect to server. Please check your internet connection and ensure the server is running.';
      case this.errorTypes.TIMEOUT_ERROR:
        return '⏱️ Connection timeout. The server is taking too long to respond.';
      case this.errorTypes.AUTH_ERROR:
        return '🔒 Authentication failed. Please log in again.';
      case this.errorTypes.SERVER_ERROR:
        return '🛠️ Server error. Please try again later.';
      case this.errorTypes.CIRCUIT_BREAKER_OPEN:
        return '🚪 Connection temporarily disabled due to repeated failures. Will retry automatically.';
      default:
        return `❌ Connection failed: ${error.message || 'Unknown error'}`;
    }
  }
  async fetchData(key) {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time service');
    }

    return new Promise((resolve, reject) => {
      const requestId = `fetch_${Date.now()}_${Math.random()}`;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.socket.emit('fetch_data', { key, requestId });
    });
  }

  /**
   * Update data on the server
   * @param {string} key - Data key
   * @param {*} data - Data to update
   * @returns {Promise<void>}
   */
  async updateData(key, data) {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time service');
    }

    return new Promise((resolve, reject) => {
      const requestId = `update_${Date.now()}_${Math.random()}`;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.socket.emit('update_data', { key, data, requestId });
    });
  }

  /**
   * Subscribe to real-time updates for a specific key
   * @param {string} key - Data key
   * @param {Function} callback - Update callback
   */
  subscribeToUpdates(key, callback) {
    if (!this.isConnected) {
      logger.warn('Cannot subscribe while disconnected', { key });
      return;
    }

    this.socket.emit('subscribe', { key });
    const listeners = this.eventListeners.get(key) || new Set();
    listeners.add(callback);
    this.eventListeners.set(key, listeners);
  }

  /**
   * Unsubscribe from real-time updates
   * @param {string} key - Data key
   * @param {Function} callback - Update callback
   */
  unsubscribeFromUpdates(key, callback) {
    const listeners = this.eventListeners.get(key);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(key);
        this.socket.emit('unsubscribe', { key });
      }
    }
  }

  /**
   * Initialize the WebSocket connection
   */
  async connect(token = null) {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return this.connectionPromise;
    }

    this.connectionState = 'connecting';
    const startTime = Date.now();

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Extract base URL for socket.io connection
        const socketUrl = import.meta.env.VITE_WEBSOCKET_URL ||
                         (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1')
                           .replace(/\/api\/v\d+\/?$/, '')
                           .replace(/\/api\/?$/, '')
                           .replace(/\/$/, '');
        
        logger.info('Attempting WebSocket connection', { socketUrl });
        
        const socketOptions = {
          transports: ['websocket', 'polling'],
          upgrade: true,
          timeout: 20000,
          forceNew: false,
          autoConnect: true,
          auth: token ? { token } : {},
          query: {
            clientType: 'web',
            version: '1.0.0',
            timestamp: Date.now()
          }
        };

        this.socket = io(socketUrl, socketOptions);

        // Connection event handlers
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.metrics.connectionTime = Date.now() - startTime;
          this.metrics.totalAttempts++;
          this.metrics.successfulAttempts++;
          
          // Update circuit breaker on successful connection
          this.updateCircuitBreaker('SUCCESS');
          
          // Track downtime if this was a reconnection
          if (this.metrics.lastConnectionLoss) {
            const downtime = Date.now() - this.metrics.lastConnectionLoss;
            this.metrics.totalDowntime += downtime;
            this.metrics.lastConnectionLoss = null;
          }
          
          logger.info('WebSocket connected', { 
            connectionTime: this.metrics.connectionTime,
            socketId: this.socket.id,
            attempt: this.metrics.totalAttempts,
            successRate: this.metrics.connectionSuccessRate,
            circuitBreakerState: this.circuitBreaker.state
          });

          // Dispatch Redux action
          store.dispatch(connectionEstablished({
            socketId: this.socket.id,
            timestamp: new Date().toISOString(),
            connectionTime: this.metrics.connectionTime,
            successRate: this.metrics.connectionSuccessRate
          }));

          this.startHeartbeat();
          this.resubscribeToRooms();
          resolve(this.socket);
        });

        this.socket.on('disconnect', (reason) => {
          this.isConnected = false;
          this.connectionState = 'disconnected';
          this.stopHeartbeat();
          
          // Track connection loss time for downtime calculation
          this.metrics.lastConnectionLoss = Date.now();
          
          logger.warn('WebSocket disconnected', { 
            reason,
            totalUptime: this.metrics.connectionTime ? Date.now() - this.metrics.connectionTime : 0
          });
          
          // Dispatch Redux action
          store.dispatch(connectionLost({
            reason,
            timestamp: new Date().toISOString()
          }));
          
          // Handle server-initiated disconnection
          if (reason === 'io server disconnect') {
            // Server disconnected, don't reconnect automatically
            this.connectionState = 'error';
            logger.warn('Server initiated disconnect - manual reconnection required');
          } else if (reason.includes('transport') || reason.includes('ping timeout')) {
            // Network-related disconnection, attempt reconnection
            logger.info('Network-related disconnect detected, will attempt reconnection');
            this.connectionState = 'error';
          }
        });

        this.socket.on('connect_error', (error) => {
          this.connectionState = 'error';
          this.metrics.totalAttempts++;
          
          // Enhanced error categorization
          const errorType = this.categorizeError(error);
          const errorContext = {
            socketUrl,
            error: error.message,
            description: error.description,
            context: error.context,
            type: error.type,
            code: error.code,
            errorType,
            attempt: this.reconnectAttempts + 1,
            isOnline: this.isOnline,
            circuitBreakerState: this.circuitBreaker.state
          };
          
          logger.error('❌ WebSocket connection error', errorContext);
          
          // Update circuit breaker
          this.updateCircuitBreaker('FAILURE', errorType);
          
          // Check if we should continue retrying
          const shouldRetry = this.shouldRetry(errorType, error);
          
          // Dispatch Redux action with detailed error info
          store.dispatch(connectionError({
            error: error.message,
            errorType,
            socketUrl,
            attempt: this.reconnectAttempts + 1,
            shouldRetry,
            circuitBreakerState: this.circuitBreaker.state,
            timestamp: new Date().toISOString()
          }));
          
          if (shouldRetry && this.circuitBreaker.state !== 'OPEN') {
            this.scheduleReconnect();
          } else {
            const errorMessage = this.getErrorMessage(errorType, error);
            logger.error('WebSocket connection failed - stopping retries', { 
              error: errorMessage, 
              errorType, 
              attempts: this.reconnectAttempts,
              circuitBreakerState: this.circuitBreaker.state
            });
            reject(new Error(errorMessage));
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          this.metrics.reconnections++;
          logger.info('WebSocket reconnected', { attemptNumber });
        });

        // Message handlers
        this.socket.on('error', (error) => {
          logger.error('WebSocket error', error);
        });

        this.socket.on('pong', (timestamp) => {
          const latency = Date.now() - timestamp;
          this.updateLatencyMetrics(latency);
          
          // Dispatch latency update to Redux
          store.dispatch(latencyUpdated({ latency }));
        });

        // Real-time event handlers
        this.setupEventHandlers();

      } catch (error) {
        this.connectionState = 'error';
        logger.error('Failed to initialize WebSocket', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionState = 'disconnected';
      this.subscriptions.clear();
      
      // Clear pending requests
      this.pendingRequests.forEach((request) => {
        clearTimeout(request.timeout);
        request.reject(new Error('Service disconnected'));
      });
      this.pendingRequests.clear();
      
      logger.info('WebSocket disconnected manually');
    }
  }

  /**
   * Cleanup all resources and listeners
   */
  cleanup() {
    this.disconnect();
    
    // Remove network listeners
    this.networkListeners.forEach(cleanup => cleanup());
    this.networkListeners.clear();
    
    // Clear all event listeners
    this.eventListeners.clear();
    
    logger.info('RealTimeService cleanup completed');
  }

  /**
   * Schedule reconnection with enhanced exponential backoff and circuit breaker
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    
    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      const timeUntilRetry = this.circuitBreaker.nextAttempt - Date.now();
      if (timeUntilRetry > 0) {
        logger.info('Circuit breaker is open, delaying reconnection', {
          timeUntilRetry: Math.round(timeUntilRetry / 1000),
          attempt: this.reconnectAttempts
        });
        
        setTimeout(() => {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.scheduleReconnect();
        }, timeUntilRetry);
        return;
      }
    }
    
    // Enhanced backoff calculation with jitter
    const baseDelay = this.reconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 6));
    const jitter = Math.random() * 0.3 * baseDelay; // Add 30% jitter
    const delay = Math.min(baseDelay + jitter, 60000); // Max 1 minute
    
    logger.info('Scheduling reconnection', { 
      attempt: this.reconnectAttempts, 
      delay: Math.round(delay), 
      maxAttempts: this.maxReconnectAttempts,
      circuitBreakerState: this.circuitBreaker.state,
      isOnline: this.isOnline
    });
    
    setTimeout(() => {
      // Check if we're still in error state and should retry
      if ((this.connectionState === 'error' || this.circuitBreaker.state === 'HALF_OPEN') && 
          this.reconnectAttempts <= this.maxReconnectAttempts &&
          this.isOnline) {
        
        logger.info('Attempting to reconnect...', { 
          attempt: this.reconnectAttempts,
          circuitBreakerState: this.circuitBreaker.state
        });
        
        // Dispatch reconnection attempt to Redux
        store.dispatch(connectionAttempting());
        
        try {
          this.socket?.connect();
        } catch (error) {
          logger.error('Reconnection attempt failed', error);
          
          this.updateCircuitBreaker('FAILURE', this.categorizeError(error));
          
          if (this.reconnectAttempts < this.maxReconnectAttempts && this.circuitBreaker.state !== 'OPEN') {
            this.scheduleReconnect();
          } else {
            logger.error('Max reconnection attempts reached or circuit breaker open');
            store.dispatch(connectionError({
              error: 'Max reconnection attempts reached',
              circuitBreakerState: this.circuitBreaker.state,
              timestamp: new Date().toISOString()
            }));
          }
        }
      } else if (!this.isOnline) {
        logger.info('Device is offline, will retry when network is restored');
      }
    }, delay);
  }

  /**
   * Start heartbeat to monitor connection
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.socket.emit('ping', Date.now());
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update latency metrics
   */
  updateLatencyMetrics(latency) {
    this.metrics.lastLatency = latency;
    this.metrics.averageLatency = this.metrics.averageLatency === 0 
      ? latency 
      : (this.metrics.averageLatency + latency) / 2;
  }

  /**
   * Setup real-time event handlers
   */
  setupEventHandlers() {
    // Data sync handlers
    this.socket.on('fetch_data_response', ({ requestId, data, error }) => {
      const request = this.pendingRequests.get(requestId);
      if (request) {
        clearTimeout(request.timeout);
        this.pendingRequests.delete(requestId);
        error ? request.reject(new Error(error)) : request.resolve(data);
      }
    });

    this.socket.on('update_data_response', ({ requestId, error }) => {
      const request = this.pendingRequests.get(requestId);
      if (request) {
        clearTimeout(request.timeout);
        this.pendingRequests.delete(requestId);
        error ? request.reject(new Error(error)) : request.resolve();
      }
    });

    this.socket.on('data_updated', ({ key, data }) => {
      const listeners = this.eventListeners.get(key);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            logger.error('Error in data update callback', { error, key });
          }
        });
      }
    });

    // Order tracking events
    this.socket.on('order_created', (data) => {
      this.metrics.messagesReceived++;
      this.handleOrderCreated(data);
    });

    this.socket.on('new_order', (data) => {
      this.metrics.messagesReceived++;
      this.triggerEvent('new_order', data);
    });

    this.socket.on('order_update', (data) => {
      this.metrics.messagesReceived++;
      this.triggerEvent('order_update', data);
    });

    this.socket.on('order_updated', (data) => {
      this.metrics.messagesReceived++;
      this.handleOrderUpdated(data);
      this.triggerEvent('order_updated', data);
    });

    this.socket.on('order_status_changed', (data) => {
      this.metrics.messagesReceived++;
      this.triggerEvent('order_status_changed', data);
      this.handleOrderStatusChanged(data);
    });

    // Backend also emits order_status_updated - handle both
    this.socket.on('order_status_updated', (data) => {
      console.log('🔔 RealTimeService received order_status_updated event:', data);
      this.metrics.messagesReceived++;
      this.triggerEvent('order_status_updated', data);
      this.triggerEvent('order_status_changed', data); // Also trigger the standard event
      this.handleOrderStatusChanged(data);
    });

    // Customer-specific order events
    this.socket.on('order_confirmed', (data) => {
      this.metrics.messagesReceived++;
      this.triggerEvent('order_confirmed', data);
      this.triggerEvent('order_status_changed', { ...data, newStatus: 'confirmed' });
    });

    // Menu events
    this.socket.on('menu_item_updated', (data) => {
      this.metrics.messagesReceived++;
      this.handleMenuItemUpdated(data);
    });

    // Table events
    this.socket.on('table_updated', (data) => {
      this.metrics.messagesReceived++;
      this.handleTableUpdated(data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      this.metrics.messagesReceived++;
      this.handleNotification(data);
    });

    // System events
    this.socket.on('system_announcement', (data) => {
      this.metrics.messagesReceived++;
      this.handleSystemAnnouncement(data);
    });

    // Room events - forward to local event listeners for confirmation handling
    this.socket.on('room_joined', (data) => {
      this.metrics.messagesReceived++;
      logger.info('Room joined confirmation received', data);
      this.triggerEvent('room_joined', data);
    });

    this.socket.on('room_left', (data) => {
      this.metrics.messagesReceived++;
      logger.debug('Room left confirmation received', data);
      this.triggerEvent('room_left', data);
    });
  }

  /**
   * Join a room for real-time updates
   */
  joinRoom(roomType, roomId) {
    if (!this.isConnected) {
      logger.warn('Cannot join room: not connected');
      return false;
    }

    const roomKey = `${roomType}_${roomId}`;
    
    if (this.subscriptions.has(roomKey)) {
      return true; // Already subscribed
    }

    this.socket.emit('join_room', { roomType, roomId });
    this.subscriptions.add(roomKey);
    
    // Dispatch Redux action
    store.dispatch(roomSubscribed({ roomType, roomId }));
    
    logger.info('Joined room', { roomType, roomId });
    return true;
  }

  /**
   * Leave a room
   */
  leaveRoom(roomType, roomId) {
    if (!this.isConnected) {
      return false;
    }

    const roomKey = `${roomType}_${roomId}`;
    
    this.socket.emit('leave_room', { roomType, roomId });
    this.subscriptions.delete(roomKey);
    
    // Dispatch Redux action
    store.dispatch(roomUnsubscribed({ roomType, roomId }));
    
    logger.info('Left room', { roomType, roomId });
    return true;
  }

  /**
   * Resubscribe to all rooms after reconnection
   */
  resubscribeToRooms() {
    for (const roomKey of this.subscriptions) {
      const [roomType, roomId] = roomKey.split('_');
      this.socket.emit('join_room', { roomType, roomId });
    }
    
    if (this.subscriptions.size > 0) {
      logger.info('Resubscribed to rooms', { count: this.subscriptions.size });
    }
  }

  /**
   * Send order status update
   */
  updateOrderStatus(orderId, status, notes = '') {
    if (!this.isConnected) {
      logger.warn('Cannot update order status: not connected');
      return false;
    }

    this.socket.emit('order_status_update', {
      orderId,
      status,
      notes,
      timestamp: new Date().toISOString()
    });

    this.metrics.messagesSent++;
    
    // Dispatch Redux action
    store.dispatch(messageSent({ type: 'order_status_update' }));
    
    logger.info('Order status update sent', { orderId, status });
    return true;
  }

  /**
   * Event handlers
   */
  handleOrderCreated(data) {
    // Dispatch to Redux store
    store.dispatch(orderCreated(data.data));
    store.dispatch(messageReceived({ 
      type: 'order_created', 
      timestamp: data.timestamp 
    }));
    
    // Trigger custom event listeners
    this.triggerEvent('orderCreated', data.data);
  }

  handleOrderUpdated(data) {
    // Handle both wrapped and direct data formats
    let orderData = data;
    
    // Check if data is wrapped in a 'data' property
    if (data && data.data && typeof data.data === 'object') {
      orderData = data.data;
    }
    // If data is already the order object directly
    else if (data && typeof data === 'object' && (data.orderId || data.orderNumber)) {
      orderData = data;
    }
    // Invalid format
    else {
      console.warn('handleOrderUpdated: Invalid data format received:', data);
      return;
    }
    
    store.dispatch(orderUpdated(orderData));
    store.dispatch(messageReceived({ 
      type: 'order_updated', 
      timestamp: data.timestamp || orderData.timestamp || new Date().toISOString()
    }));
    
    this.triggerEvent('orderUpdated', orderData);
  }

  handleOrderStatusChanged(data) {
    // Handle both wrapped and direct data formats
    let orderData = data;
    
    // Check if data is wrapped in a 'data' property (some events come this way)
    if (data && data.data && typeof data.data === 'object') {
      orderData = data.data;
    }
    // If data is already the order object directly (new format)
    else if (data && typeof data === 'object' && (data.orderId || data.orderNumber || data._id)) {
      orderData = data;
    }
    // Invalid format
    else {
      console.warn('handleOrderStatusChanged: Invalid data format received:', data);
      return;
    }
    
    // Extract all possible identifiers
    const orderId = orderData.orderId || orderData._id || orderData.id;
    const orderNumber = orderData.orderNumber;
    const newStatus = orderData.newStatus || orderData.status;
    const oldStatus = orderData.oldStatus || orderData.previousStatus;
    
    logger.info('🔄 Processing order status change', {
      orderId,
      orderNumber,
      oldStatus,
      newStatus,
      dataStructure: data.data ? 'wrapped' : 'direct',
      fullDataKeys: Object.keys(orderData)
    });
    
    // Create a normalized data object for Redux
    const normalizedData = {
      orderId,
      _id: orderId, // For backward compatibility
      id: orderId, // For backward compatibility
      orderNumber,
      oldStatus,
      newStatus,
      status: newStatus, // For backward compatibility
      estimatedTime: orderData.estimatedTime,
      timestamp: data.timestamp || orderData.timestamp || new Date().toISOString()
    };
    
    // Dispatch to Redux store
    store.dispatch(statusChanged(normalizedData));
    store.dispatch(messageReceived({ 
      type: 'order_status_changed', 
      timestamp: normalizedData.timestamp
    }));
    
    // Trigger custom event listeners with the order data
    this.triggerEvent('orderStatusChanged', normalizedData);
    
    // Also trigger the legacy event name for compatibility
    this.triggerEvent('statusChanged', normalizedData);
  }

  handleMenuItemUpdated(data) {
    store.dispatch({ 
      type: 'menu/itemUpdated', 
      payload: data.data 
    });
    
    this.triggerEvent('menuItemUpdated', data.data);
  }

  handleTableUpdated(data) {
    store.dispatch({ 
      type: 'tables/tableUpdated', 
      payload: data.data 
    });
    
    this.triggerEvent('tableUpdated', data.data);
  }

  handleNotification(data) {
    store.dispatch(notificationReceived(data.data));
    store.dispatch(messageReceived({ 
      type: 'notification', 
      timestamp: data.timestamp 
    }));
    
    this.triggerEvent('notification', data.data);
  }

  handleSystemAnnouncement(data) {
    store.dispatch(systemAnnouncement(data.data));
    store.dispatch(messageReceived({ 
      type: 'system_announcement', 
      timestamp: data.timestamp 
    }));
    
    this.triggerEvent('systemAnnouncement', data.data);
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
   * Alias for addEventListener (compatibility with DataAccessLayer)
   */
  on(event, callback) {
    return this.addEventListener(event, callback);
  }

  /**
   * Alias for removeEventListener
   */
  off(event, callback) {
    return this.removeEventListener(event, callback);
  }

  /**
   * Emit event through the actual WebSocket connection to the server
   * @param {string} event - Socket event name
   * @param {*} data - Data to send
   * @returns {Promise} Resolves with server acknowledgment
   */
  emit(event, data) {
    if (!this.isConnected || !this.socket) {
      logger.warn('Cannot emit event: not connected', { event });
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (response) => {
        if (response?.error) {
          logger.error('Socket emit error', { event, error: response.error });
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      // Resolve after timeout if server doesn't ack (fire-and-forget events)
      setTimeout(() => resolve(), 5000);
    });
  }

  /**
   * Emit event to local custom listeners only (not socket events)
   */
  emitLocal(event, data) {
    return this.triggerEvent(event, data);
  }

  /**
   * Trigger custom event listeners
   */
  triggerEvent(event, data) {
    if (this.eventListeners.has(event)) {
      for (const callback of this.eventListeners.get(event)) {
        try {
          callback(data);
        } catch (error) {
          logger.error('Error in event listener', { event, error });
        }
      }
    }
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      subscriptions: Array.from(this.subscriptions)
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      state: this.connectionState,
      socketId: this.socket?.id || null,
      latency: this.metrics.lastLatency,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Manually retry connection (for user-initiated retries)
   */
  async retryConnection(token = null) {
    if (this.connectionState === 'connecting') {
      logger.warn('Connection attempt already in progress');
      return this.connectionPromise;
    }

    // Reset state for manual retry
    this.reconnectAttempts = 0;
    this.connectionState = 'disconnected';
    
    // Reset circuit breaker for manual retries
    if (this.circuitBreaker.state === 'OPEN') {
      logger.info('Resetting circuit breaker for manual retry');
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failureCount = 0;
    }
    
    logger.info('Manual connection retry initiated', {
      isOnline: this.isOnline,
      circuitBreakerState: this.circuitBreaker.state
    });
    
    return this.connect(token);
  }

  /**
   * Check if service is healthy and connected
   */
  isHealthy() {
    const now = Date.now();
    const uptime = this.metrics.connectionTime ? now - this.metrics.connectionTime : 0;
    
    return {
      // Connection status
      connected: this.isConnected,
      state: this.connectionState,
      
      // Network status
      isOnline: this.isOnline,
      
      // Performance metrics
      latency: this.metrics.lastLatency,
      averageLatency: this.metrics.averageLatency,
      uptime,
      totalDowntime: this.metrics.totalDowntime,
      
      // Connection reliability
      reconnectAttempts: this.reconnectAttempts,
      totalAttempts: this.metrics.totalAttempts,
      successfulAttempts: this.metrics.successfulAttempts,
      connectionSuccessRate: this.metrics.connectionSuccessRate,
      
      // Circuit breaker status
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failureCount: this.circuitBreaker.failureCount,
        nextAttempt: this.circuitBreaker.nextAttempt,
        timeUntilRetry: this.circuitBreaker.nextAttempt ? Math.max(0, this.circuitBreaker.nextAttempt - now) : 0
      },
      
      // Subscriptions
      subscriptions: this.subscriptions.size,
      subscribedRooms: Array.from(this.subscriptions),
      
      // Overall health score (0-100)
      healthScore: this.calculateHealthScore()
    };
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore() {
    let score = 0;
    
    // Connection status (40 points)
    if (this.isConnected) score += 40;
    else if (this.connectionState === 'connecting') score += 20;
    
    // Network status (20 points)
    if (this.isOnline) score += 20;
    
    // Connection reliability (20 points)
    const successRate = this.metrics.connectionSuccessRate || 0;
    score += Math.min(20, Math.max(0, successRate * 0.2));
    
    // Circuit breaker status (10 points)
    if (this.circuitBreaker.state === 'CLOSED') score += 10;
    else if (this.circuitBreaker.state === 'HALF_OPEN') score += 5;
    
    // Latency performance (10 points)
    const latency = this.metrics.lastLatency || 0;
    if (latency < 100) score += 10;
    else if (latency < 500) score += 5;
    else if (latency < 1000) score += 2;
    
    // Ensure score is a valid number between 0-100
    score = Math.max(0, Math.min(100, Math.round(score)));
    return isNaN(score) ? 0 : score;
  }

  /**
   * Subscribe to room
   */
  subscribeToRoom(roomType, roomId) {
    return this.joinRoom(roomType, roomId);
  }

  /**
   * Unsubscribe from room
   */
  unsubscribeFromRoom(roomType, roomId) {
    return this.leaveRoom(roomType, roomId);
  }

  /**
   * Send message
   */
  sendMessage(event, data) {
    if (!this.isConnected) {
      logger.warn('Cannot send message: not connected');
      return false;
    }
    
    this.socket.emit(event, data);
    this.metrics.messagesSent++;
    
    // Dispatch Redux action
    store.dispatch(messageSent({ type: event }));
    
    logger.debug('Message sent', { event, data });
    return true;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      state: this.connectionState,
      socketId: this.socket?.id || null,
      latency: this.metrics.lastLatency,
      reconnectAttempts: this.reconnectAttempts,
      isOnline: this.isOnline,
      circuitBreakerState: this.circuitBreaker.state,
      connectionSuccessRate: this.metrics.connectionSuccessRate,
      healthScore: this.calculateHealthScore(),
      usingMockService: false,
      backendUnavailable: !this.isConnected && this.connectionState === 'error'
    };
  }

  /**
   * Get enhanced metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      subscriptions: Array.from(this.subscriptions),
      isOnline: this.isOnline,
      circuitBreaker: this.circuitBreaker,
      healthScore: this.calculateHealthScore(),
      usingMockService: false,
      backendUnavailable: !this.isConnected && this.connectionState === 'error'
    };
  }

  /**
   * Force reconnection (admin function)
   */
  forceReconnect(token = null) {
    logger.info('Force reconnection requested');
    
    if (this.socket) {
      this.disconnect();
    }
    
    setTimeout(() => {
      this.connect(token);
    }, 1000);
  }

  /**
   * Handle connection health monitoring
   */
  startConnectionMonitoring() {
    // Monitor connection health every minute
    setInterval(() => {
      if (this.isConnected) {
        const health = this.isHealthy();
        
        // Log health status
        logger.debug('Connection health check', health);
        
        // Alert on high latency
        if (health.latency > 5000) {
          logger.warn('High latency detected', { latency: health.latency });
        }
        
        // Update uptime metrics
        store.dispatch(uptimeUpdated({ uptime: health.uptime }));
      }
    }, 60000); // Every minute
  }
}

// Export singleton instance
export default new RealTimeService();