/**
 * Tests for Enhanced Redis Service
 */

const EnhancedRedisService = require('../enhancedRedisService');

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  quit: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn(),
  info: jest.fn(),
  multi: jest.fn(),
  on: jest.fn()
};

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock cache config
jest.mock('../../config/cacheConfig', () => ({
  getRedisConfig: () => ({
    socket: {
      host: 'localhost',
      port: 6379,
      connectTimeout: 5000,
      reconnectStrategy: jest.fn()
    },
    lazyConnect: false,
    circuitBreakerThreshold: 3
  }),
  isRedisEnabled: () => true
}));

describe('EnhancedRedisService', () => {
  let redisService;
  let mockHealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockHealthMonitor = {
      updateRedisStatus: jest.fn(),
      recordOperation: jest.fn(),
      emit: jest.fn()
    };

    redisService = new EnhancedRedisService(mockHealthMonitor);
  });

  afterEach(async () => {
    if (redisService) {
      await redisService.close();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default circuit breaker state', () => {
      const status = redisService.getCircuitBreakerStatus();
      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(0);
    });

    test('should initialize performance tracking', () => {
      const stats = redisService.getPerformanceStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.successfulOperations).toBe(0);
      expect(stats.failedOperations).toBe(0);
    });
  });

  describe('Connection Management', () => {
    test('should connect successfully', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      await redisService.connect();
      
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(redisService.isConnected).toBe(true);
    });

    test('should handle connection failures', async () => {
      const error = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(error);
      
      await expect(redisService.connect()).rejects.toThrow('Connection failed');
      expect(redisService.isConnected).toBe(false);
    });

    test('should not attempt connection when circuit breaker is open', async () => {
      // Force circuit breaker open
      redisService.circuitBreaker.state = 'OPEN';
      redisService.circuitBreaker.nextAttemptTime = Date.now() + 30000;
      
      await expect(redisService.connect()).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after threshold failures', () => {
      const threshold = redisService.circuitBreaker.threshold;
      
      // Simulate failures
      for (let i = 0; i < threshold; i++) {
        redisService.recordFailure();
      }
      
      redisService.openCircuitBreaker();
      
      expect(redisService.circuitBreaker.state).toBe('OPEN');
      expect(redisService.circuitBreaker.nextAttemptTime).toBeGreaterThan(Date.now());
    });

    test('should transition to half-open after timeout', () => {
      // Set circuit breaker to open with past timeout
      redisService.circuitBreaker.state = 'OPEN';
      redisService.circuitBreaker.nextAttemptTime = Date.now() - 1000;
      
      const canAttempt = redisService.canAttemptConnection();
      
      expect(canAttempt).toBe(true);
      expect(redisService.circuitBreaker.state).toBe('HALF_OPEN');
    });

    test('should close circuit breaker on successful operation in half-open state', async () => {
      mockRedisClient.connect.mockResolvedValue();
      mockRedisClient.ping.mockResolvedValue('PONG');
      
      redisService.circuitBreaker.state = 'HALF_OPEN';
      redisService.isConnected = true;
      
      await redisService.executeOperation('ping');
      
      expect(redisService.circuitBreaker.state).toBe('CLOSED');
    });

    test('should open circuit breaker on failure in half-open state', async () => {
      const error = new Error('Operation failed');
      mockRedisClient.ping.mockRejectedValue(error);
      
      redisService.circuitBreaker.state = 'HALF_OPEN';
      redisService.isConnected = true;
      
      await expect(redisService.executeOperation('ping')).rejects.toThrow();
      expect(redisService.circuitBreaker.state).toBe('OPEN');
    });
  });

  describe('Redis Operations', () => {
    beforeEach(() => {
      redisService.isConnected = true;
      mockRedisClient.connect.mockResolvedValue();
    });

    test('should execute get operation successfully', async () => {
      mockRedisClient.get.mockResolvedValue('test-value');
      
      const result = await redisService.get('test-key');
      
      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    test('should execute set operation successfully', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      
      const result = await redisService.set('test-key', 'test-value');
      
      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    test('should execute setEx operation with TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await redisService.set('test-key', 'test-value', { ttl: 300 });
      
      expect(result).toBe('OK');
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 300, 'test-value');
    });

    test('should execute delete operation', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await redisService.del('test-key');
      
      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['test-key']);
    });

    test('should handle operation failures', async () => {
      const error = new Error('Redis operation failed');
      mockRedisClient.get.mockRejectedValue(error);
      
      await expect(redisService.get('test-key')).rejects.toThrow();
      expect(mockHealthMonitor.recordOperation).toHaveBeenCalledWith(
        'redis', false, expect.any(Number), error
      );
    });

    test('should block operations when circuit breaker is open', async () => {
      redisService.circuitBreaker.state = 'OPEN';
      
      await expect(redisService.get('test-key')).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(() => {
      redisService.isConnected = true;
    });

    test('should record successful operations', async () => {
      mockRedisClient.get.mockResolvedValue('value');
      
      await redisService.get('key');
      
      const stats = redisService.getPerformanceStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successfulOperations).toBe(1);
      expect(stats.failedOperations).toBe(0);
    });

    test('should record failed operations', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Failed'));
      
      try {
        await redisService.get('key');
      } catch (error) {
        // Expected to fail
      }
      
      const stats = redisService.getPerformanceStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successfulOperations).toBe(0);
      expect(stats.failedOperations).toBe(1);
    });

    test('should calculate average latency', async () => {
      mockRedisClient.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('value'), 10))
      );
      
      await redisService.get('key1');
      await redisService.get('key2');
      
      const stats = redisService.getPerformanceStats();
      expect(stats.avgLatency).toBeGreaterThan(0);
    });

    test('should reset statistics', () => {
      redisService.performance.totalOperations = 10;
      redisService.performance.successfulOperations = 8;
      
      redisService.resetStats();
      
      const stats = redisService.getPerformanceStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.successfulOperations).toBe(0);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when connected', async () => {
      redisService.isConnected = true;
      mockRedisClient.ping.mockResolvedValue('PONG');
      
      const health = await redisService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
    });

    test('should return unhealthy status on ping failure', async () => {
      redisService.isConnected = false;
      mockRedisClient.ping.mockRejectedValue(new Error('Ping failed'));
      
      const health = await redisService.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
    });

    test('should return circuit breaker status when open', async () => {
      redisService.circuitBreaker.state = 'OPEN';
      redisService.circuitBreaker.nextAttemptTime = Date.now() + 30000;
      
      const health = await redisService.healthCheck();
      
      expect(health.status).toBe('circuit_breaker_open');
      expect(health.circuitBreaker.state).toBe('OPEN');
    });
  });

  describe('Event Handling', () => {
    test('should handle connection success events', () => {
      redisService.onConnectionSuccess();
      
      expect(redisService.isConnected).toBe(true);
      expect(mockHealthMonitor.updateRedisStatus).toHaveBeenCalledWith(
        true, null, redisService.performance.lastLatency
      );
    });

    test('should handle connection failure events', () => {
      const error = new Error('Connection failed');
      
      redisService.onConnectionFailure(error);
      
      expect(redisService.isConnected).toBe(false);
      expect(mockHealthMonitor.updateRedisStatus).toHaveBeenCalledWith(false, error);
    });
  });

  describe('Administrative Operations', () => {
    test('should reset circuit breaker manually', () => {
      redisService.circuitBreaker.state = 'OPEN';
      redisService.circuitBreaker.failureCount = 5;
      
      redisService.resetCircuitBreaker();
      
      expect(redisService.circuitBreaker.state).toBe('CLOSED');
      expect(redisService.circuitBreaker.failureCount).toBe(0);
    });

    test('should provide comprehensive status', () => {
      const status = redisService.getStatus();
      
      expect(status).toHaveProperty('connection');
      expect(status).toHaveProperty('circuitBreaker');
      expect(status).toHaveProperty('performance');
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('timestamp');
    });
  });

  describe('Connection Lifecycle', () => {
    test('should close connection gracefully', async () => {
      redisService.isConnected = true;
      mockRedisClient.quit.mockResolvedValue();
      
      await redisService.close();
      
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(redisService.isConnected).toBe(false);
      expect(redisService.client).toBeNull();
    });

    test('should handle close errors gracefully', async () => {
      redisService.isConnected = true;
      mockRedisClient.quit.mockRejectedValue(new Error('Close failed'));
      
      await redisService.close();
      
      expect(redisService.isConnected).toBe(false);
      expect(redisService.client).toBeNull();
    });
  });
});