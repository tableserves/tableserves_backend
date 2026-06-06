/**
 * Enhanced Redis Service
 * Redis connection with circuit breaker pattern and improved error handling
 */

const redis = require('redis');
const { logger } = require('../utils/logger');
const cacheConfig = require('../config/cacheConfig');

class EnhancedRedisService {
  constructor(healthMonitor = null) {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.healthMonitor = healthMonitor;
    
    // Circuit breaker state
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      threshold: 5,
      timeout: 30000, // 30 seconds
      halfOpenMaxCalls: 3,
      halfOpenCallCount: 0
    };

    // Connection state
    this.connectionState = {
      attempts: 0,
      lastAttempt: null,
      lastSuccess: null,
      backoffDelay: 1000,
      maxBackoffDelay: 30000,
      jitterFactor: 0.1
    };

    // Performance tracking
    this.performance = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      avgLatency: 0,
      lastLatency: null
    };

    // Configuration
    this.config = cacheConfig.getRedisConfig();
    
    if (this.config && cacheConfig.isRedisEnabled()) {
      this.circuitBreaker.threshold = this.config.socket?.reconnectStrategy ? 
        cacheConfig.getRedisConfig()?.circuitBreakerThreshold || 5 : 5;
      
      // Initialize connection with lazy loading
      if (!this.config.lazyConnect) {
        this.connect().catch(error => {
          logger.warn('Initial Redis connection failed, will retry later', { error: error.message });
        });
      }
    } else {
      logger.info('Redis is disabled or not configured');
    }
  }

  /**
   * Initialize Redis connection with circuit breaker protection
   */
  async connect() {
    if (!this.config || !cacheConfig.isRedisEnabled()) {
      throw new Error('Redis is not enabled or configured');
    }

    if (this.isConnecting || this.isConnected) {
      return this.client;
    }

    // Check circuit breaker
    if (!this.canAttemptConnection()) {
      throw new Error('Circuit breaker is OPEN - Redis connection attempts blocked');
    }

    this.isConnecting = true;
    this.connectionState.attempts++;
    this.connectionState.lastAttempt = Date.now();

    try {
      // Create Redis client
      this.client = redis.createClient({
        ...this.config,
        socket: {
          ...this.config.socket,
          reconnectStrategy: (retries) => this.reconnectStrategy(retries)
        }
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Connect with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 
          this.config.socket?.connectTimeout || 5000);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Connection successful
      this.onConnectionSuccess();
      
      return this.client;

    } catch (error) {
      this.onConnectionFailure(error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Check if connection attempt is allowed by circuit breaker
   */
  canAttemptConnection() {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.halfOpenCallCount = 0;
          logger.info('Circuit breaker transitioning to HALF_OPEN');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return this.circuitBreaker.halfOpenCallCount < this.circuitBreaker.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Custom reconnection strategy with exponential backoff and jitter
   */
  reconnectStrategy(retries) {
    if (!this.canAttemptConnection()) {
      logger.warn('Reconnection blocked by circuit breaker');
      return false;
    }

    if (retries >= 10) {
      logger.error('Max reconnection attempts reached');
      this.openCircuitBreaker();
      return false;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.connectionState.backoffDelay * Math.pow(2, retries),
      this.connectionState.maxBackoffDelay
    );

    const jitter = baseDelay * this.connectionState.jitterFactor * Math.random();
    const delay = Math.floor(baseDelay + jitter);

    logger.info(`Redis reconnection attempt ${retries + 1} in ${delay}ms`);
    return delay;
  }

  /**
   * Set up Redis client event handlers
   */
  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.onConnectionSuccess();
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', { error: error.message });
      this.onConnectionFailure(error);
    });

    this.client.on('end', () => {
      logger.info('Redis connection ended');
      this.isConnected = false;
      if (this.healthMonitor) {
        this.healthMonitor.updateRedisStatus(false);
      }
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
      this.isConnected = false;
    });
  }

  /**
   * Handle successful connection
   */
  onConnectionSuccess() {
    this.isConnected = true;
    this.connectionState.lastSuccess = Date.now();
    this.connectionState.backoffDelay = 1000; // Reset backoff
    
    // Reset circuit breaker on successful connection
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.closeCircuitBreaker();
    } else if (this.circuitBreaker.state === 'CLOSED') {
      this.circuitBreaker.failureCount = 0;
    }

    if (this.healthMonitor) {
      this.healthMonitor.updateRedisStatus(true, null, this.performance.lastLatency);
    }

    logger.info('Redis connection established successfully');
  }

  /**
   * Handle connection failure
   */
  onConnectionFailure(error) {
    this.isConnected = false;
    this.recordFailure();

    if (this.healthMonitor) {
      this.healthMonitor.updateRedisStatus(false, error);
    }

    // Check if we should open circuit breaker
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
      this.openCircuitBreaker();
    }
  }

  /**
   * Record operation failure for circuit breaker
   */
  recordFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    this.performance.failedOperations++;
  }

  /**
   * Open circuit breaker
   */
  openCircuitBreaker() {
    this.circuitBreaker.state = 'OPEN';
    this.circuitBreaker.nextAttemptTime = Date.now() + this.circuitBreaker.timeout;
    
    logger.warn('Circuit breaker OPENED', {
      failureCount: this.circuitBreaker.failureCount,
      nextAttemptTime: new Date(this.circuitBreaker.nextAttemptTime).toISOString()
    });

    if (this.healthMonitor) {
      this.healthMonitor.emit('circuit_breaker:opened', {
        failureCount: this.circuitBreaker.failureCount,
        timeout: this.circuitBreaker.timeout
      });
    }
  }

  /**
   * Close circuit breaker
   */
  closeCircuitBreaker() {
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.halfOpenCallCount = 0;
    
    logger.info('Circuit breaker CLOSED - Redis connection restored');

    if (this.healthMonitor) {
      this.healthMonitor.emit('circuit_breaker:closed', {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Execute Redis operation with circuit breaker protection
   */
  async executeOperation(operation, ...args) {
    if (!this.config || !cacheConfig.isRedisEnabled()) {
      throw new Error('Redis is not enabled');
    }

    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN - operation blocked');
    }

    const startTime = Date.now();
    
    try {
      // Ensure connection
      await this.ensureConnection();

      // Track half-open state
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.circuitBreaker.halfOpenCallCount++;
      }

      // Execute operation
      const result = await this.client[operation](...args);
      
      // Record success
      this.recordSuccess(Date.now() - startTime);
      
      // Close circuit breaker if in half-open state
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.closeCircuitBreaker();
      }

      return result;

    } catch (error) {
      this.recordOperationFailure(error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(latency) {
    this.performance.totalOperations++;
    this.performance.successfulOperations++;
    this.performance.lastLatency = latency;
    
    // Update average latency
    const totalLatency = this.performance.avgLatency * (this.performance.totalOperations - 1) + latency;
    this.performance.avgLatency = totalLatency / this.performance.totalOperations;

    if (this.healthMonitor) {
      this.healthMonitor.recordOperation('redis', true, latency);
    }
  }

  /**
   * Record failed operation
   */
  recordOperationFailure(error, latency) {
    this.performance.totalOperations++;
    this.performance.failedOperations++;
    this.recordFailure();

    if (this.healthMonitor) {
      this.healthMonitor.recordOperation('redis', false, latency, error);
    }

    // If in half-open state and operation fails, open circuit breaker
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.openCircuitBreaker();
    }
  }

  /**
   * Ensure Redis connection is available
   */
  async ensureConnection() {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    if (!this.isConnected || !this.client) {
      throw new Error('Redis connection unavailable');
    }
  }

  /**
   * Redis operation methods with circuit breaker protection
   */
  async get(key) {
    return this.executeOperation('get', key);
  }

  async set(key, value, options = {}) {
    if (options.ttl) {
      return this.executeOperation('setEx', key, options.ttl, value);
    }
    return this.executeOperation('set', key, value);
  }

  async setEx(key, ttl, value) {
    return this.executeOperation('setEx', key, ttl, value);
  }

  async del(key) {
    if (Array.isArray(key)) {
      return this.executeOperation('del', key);
    }
    return this.executeOperation('del', [key]);
  }

  async exists(key) {
    return this.executeOperation('exists', key);
  }

  async keys(pattern) {
    return this.executeOperation('keys', pattern);
  }

  async ping() {
    return this.executeOperation('ping');
  }

  async info(section) {
    return this.executeOperation('info', section);
  }

  async multi() {
    await this.ensureConnection();
    return this.client.multi();
  }

  /**
   * Health check with circuit breaker awareness
   */
  async healthCheck() {
    try {
      if (this.circuitBreaker.state === 'OPEN') {
        return {
          status: 'circuit_breaker_open',
          connected: false,
          circuitBreaker: this.getCircuitBreakerStatus(),
          nextAttemptTime: new Date(this.circuitBreaker.nextAttemptTime).toISOString(),
          timestamp: new Date().toISOString()
        };
      }

      await this.ping();
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        circuitBreaker: this.getCircuitBreakerStatus(),
        performance: this.getPerformanceStats(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        circuitBreaker: this.getCircuitBreakerStatus(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      state: this.circuitBreaker.state,
      failureCount: this.circuitBreaker.failureCount,
      threshold: this.circuitBreaker.threshold,
      lastFailureTime: this.circuitBreaker.lastFailureTime ? 
        new Date(this.circuitBreaker.lastFailureTime).toISOString() : null,
      nextAttemptTime: this.circuitBreaker.nextAttemptTime ? 
        new Date(this.circuitBreaker.nextAttemptTime).toISOString() : null
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const successRate = this.performance.totalOperations > 0 
      ? this.performance.successfulOperations / this.performance.totalOperations 
      : 0;

    return {
      totalOperations: this.performance.totalOperations,
      successfulOperations: this.performance.successfulOperations,
      failedOperations: this.performance.failedOperations,
      successRate: Math.round(successRate * 100) / 100,
      avgLatency: Math.round(this.performance.avgLatency),
      lastLatency: this.performance.lastLatency
    };
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      attempts: this.connectionState.attempts,
      lastAttempt: this.connectionState.lastAttempt ? 
        new Date(this.connectionState.lastAttempt).toISOString() : null,
      lastSuccess: this.connectionState.lastSuccess ? 
        new Date(this.connectionState.lastSuccess).toISOString() : null,
      config: {
        host: this.config?.socket?.host || this.config?.url,
        port: this.config?.socket?.port,
        lazyConnect: this.config?.lazyConnect
      }
    };
  }

  /**
   * Force circuit breaker reset (admin operation)
   */
  resetCircuitBreaker() {
    this.closeCircuitBreaker();
    logger.info('Circuit breaker manually reset');
  }

  /**
   * Reset performance statistics
   */
  resetStats() {
    this.performance = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      avgLatency: 0,
      lastLatency: null
    };
    logger.info('Redis performance statistics reset');
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        logger.info('Redis connection closed gracefully');
      }
    } catch (error) {
      logger.error('Error closing Redis connection', { error: error.message });
    } finally {
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Get comprehensive status for monitoring
   */
  getStatus() {
    return {
      connection: this.getConnectionInfo(),
      circuitBreaker: this.getCircuitBreakerStatus(),
      performance: this.getPerformanceStats(),
      enabled: cacheConfig.isRedisEnabled(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = EnhancedRedisService;