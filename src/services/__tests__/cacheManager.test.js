/**
 * Tests for Cache Manager
 */

const CacheManager = require('../cacheManager');

// Mock all dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../config/cacheConfig', () => ({
  getRedisConfig: () => ({
    socket: { host: 'localhost', port: 6379 },
    lazyConnect: false
  }),
  getMemoryCacheConfig: () => ({
    maxSize: 1024 * 1024,
    maxEntries: 1000,
    enabled: true
  }),
  getPolicies: () => ({
    defaultTTL: 300,
    maxKeyLength: 250,
    maxValueSize: 1024 * 1024
  }),
  isRedisEnabled: () => true,
  isMemoryFallbackEnabled: () => true
}));

// Mock Redis service
const mockRedisService = {
  connect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn(),
  executeOperation: jest.fn(),
  healthCheck: jest.fn(),
  getStatus: jest.fn(),
  close: jest.fn()
};

jest.mock('../enhancedRedisService', () => {
  return jest.fn().mockImplementation(() => mockRedisService);
});

// Mock Memory cache service
const mockMemoryCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  clear: jest.fn(),
  getStats: jest.fn(),
  healthCheck: jest.fn(),
  shutdown: jest.fn()
};

jest.mock('../memoryCache', () => {
  return jest.fn().mockImplementation(() => mockMemoryCache);
});

// Mock Health monitor
const mockHealthMonitor = {
  on: jest.fn(),
  updateFallbackStatus: jest.fn(),
  recordOperation: jest.fn(),
  getHealthStatus: jest.fn(),
  shutdown: jest.fn()
};

jest.mock('../cacheHealthMonitor', () => {
  return jest.fn().mockImplementation(() => mockHealthMonitor);
});

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockRedisService.connect.mockResolvedValue();
    mockRedisService.healthCheck.mockResolvedValue({ status: 'healthy' });
    mockRedisService.getStatus.mockReturnValue({ connected: true });
    
    mockMemoryCache.getStats.mockReturnValue({ entries: 0, size: 0 });
    mockMemoryCache.healthCheck.mockResolvedValue({ status: 'healthy' });
    
    mockHealthMonitor.getHealthStatus.mockReturnValue({
      overall: { status: 'healthy' },
      redis: { connected: true },
      fallback: { active: false }
    });
  });

  afterEach(async () => {
    if (cacheManager) {
      await cacheManager.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize with Redis as primary provider', async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10)); // Allow async initialization
      
      expect(cacheManager.currentProvider).toBe('redis');
      expect(cacheManager.state.redisAvailable).toBe(true);
      expect(cacheManager.state.fallbackActive).toBe(false);
    });

    test('should fallback to memory cache when Redis fails', async () => {
      mockRedisService.connect.mockRejectedValue(new Error('Redis connection failed'));
      
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(cacheManager.currentProvider).toBe('memory');
      expect(cacheManager.state.fallbackActive).toBe(true);
      expect(cacheManager.state.fallbackType).toBe('memory');
    });

    test('should set up health monitoring event handlers', async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockHealthMonitor.on).toHaveBeenCalledWith('redis:connected', expect.any(Function));
      expect(mockHealthMonitor.on).toHaveBeenCalledWith('redis:disconnected', expect.any(Function));
      expect(mockHealthMonitor.on).toHaveBeenCalledWith('circuit_breaker:opened', expect.any(Function));
      expect(mockHealthMonitor.on).toHaveBeenCalledWith('circuit_breaker:closed', expect.any(Function));
    });
  });

  describe('Cache Operations - Redis Primary', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should get value from Redis', async () => {
      mockRedisService.get.mockResolvedValue('"test-value"');
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBe('"test-value"');
      expect(mockRedisService.get).toHaveBeenCalledWith('test-key');
    });

    test('should set value in Redis', async () => {
      mockRedisService.set.mockResolvedValue('OK');
      
      const result = await cacheManager.set('test-key', 'test-value', 300);
      
      expect(result).toBe(true);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'test-key', 
        '"test-value"', 
        { ttl: 300 }
      );
    });

    test('should delete value from Redis', async () => {
      mockRedisService.del.mockResolvedValue(1);
      
      const result = await cacheManager.del('test-key');
      
      expect(result).toBe(true);
      expect(mockRedisService.del).toHaveBeenCalledWith('test-key');
    });

    test('should check if key exists in Redis', async () => {
      mockRedisService.exists.mockResolvedValue(1);
      
      const result = await cacheManager.exists('test-key');
      
      expect(result).toBe(true);
      expect(mockRedisService.exists).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Fallback Logic', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should fallback to memory cache when Redis get fails', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));
      mockMemoryCache.get.mockResolvedValue('fallback-value');
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBe('fallback-value');
      expect(mockRedisService.get).toHaveBeenCalledWith('test-key');
      expect(mockMemoryCache.get).toHaveBeenCalledWith('test-key');
    });

    test('should fallback to memory cache when Redis set fails', async () => {
      mockRedisService.set.mockRejectedValue(new Error('Redis error'));
      mockMemoryCache.set.mockResolvedValue(true);
      
      const result = await cacheManager.set('test-key', 'test-value');
      
      expect(result).toBe(true);
      expect(mockMemoryCache.set).toHaveBeenCalledWith('test-key', 'test-value', 300);
    });

    test('should activate fallback when Redis operations fail', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));
      mockMemoryCache.get.mockResolvedValue('value');
      
      await cacheManager.get('test-key');
      
      expect(cacheManager.state.fallbackActive).toBe(true);
      expect(cacheManager.currentProvider).toBe('memory');
    });
  });

  describe('Memory Cache Primary', () => {
    beforeEach(async () => {
      mockRedisService.connect.mockRejectedValue(new Error('Redis unavailable'));
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should use memory cache when Redis is unavailable', async () => {
      mockMemoryCache.get.mockResolvedValue('memory-value');
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBe('memory-value');
      expect(mockMemoryCache.get).toHaveBeenCalledWith('test-key');
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    test('should set value in memory cache', async () => {
      mockMemoryCache.set.mockResolvedValue(true);
      
      const result = await cacheManager.set('test-key', 'test-value');
      
      expect(result).toBe(true);
      expect(mockMemoryCache.set).toHaveBeenCalledWith('test-key', 'test-value', 300);
    });
  });

  describe('Clear Operations', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should clear all caches with * pattern', async () => {
      mockRedisService.executeOperation.mockResolvedValue('OK');
      mockMemoryCache.clear.mockResolvedValue(5);
      
      const result = await cacheManager.clear('*');
      
      expect(result).toBeGreaterThan(0);
      expect(mockRedisService.executeOperation).toHaveBeenCalledWith('flushDb');
      expect(mockMemoryCache.clear).toHaveBeenCalledWith('*');
    });

    test('should clear specific pattern from both caches', async () => {
      mockRedisService.keys.mockResolvedValue(['user:1', 'user:2']);
      mockRedisService.del.mockResolvedValue(2);
      mockMemoryCache.clear.mockResolvedValue(3);
      
      const result = await cacheManager.clear('user:*');
      
      expect(result).toBe(5);
      expect(mockRedisService.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedisService.del).toHaveBeenCalledWith(['user:1', 'user:2']);
      expect(mockMemoryCache.clear).toHaveBeenCalledWith('user:*');
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should return comprehensive health status', async () => {
      const health = await cacheManager.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('providers');
      expect(health).toHaveProperty('current');
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('timestamp');
    });

    test('should handle health check errors gracefully', async () => {
      mockRedisService.healthCheck.mockRejectedValue(new Error('Health check failed'));
      
      const health = await cacheManager.healthCheck();
      
      expect(health.status).toBe('error');
      expect(health.error).toBe('Health check failed');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should handle Redis connected event', () => {
      cacheManager.state.redisAvailable = false;
      cacheManager.currentProvider = 'memory';
      
      cacheManager.onRedisConnected();
      
      expect(cacheManager.state.redisAvailable).toBe(true);
      expect(cacheManager.currentProvider).toBe('redis');
      expect(cacheManager.state.fallbackActive).toBe(false);
    });

    test('should handle Redis disconnected event', () => {
      cacheManager.state.redisAvailable = true;
      
      cacheManager.onRedisDisconnected();
      
      expect(cacheManager.state.redisAvailable).toBe(false);
      expect(cacheManager.state.fallbackActive).toBe(true);
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should validate cache keys', async () => {
      await expect(cacheManager.get('')).rejects.toThrow('Cache key must be a non-empty string');
      await expect(cacheManager.get(null)).rejects.toThrow('Cache key must be a non-empty string');
      await expect(cacheManager.get('a'.repeat(300))).rejects.toThrow('Cache key too long');
    });

    test('should validate cache values', async () => {
      await expect(cacheManager.set('key', undefined)).rejects.toThrow('Cache value cannot be undefined');
      
      const largeValue = 'x'.repeat(2 * 1024 * 1024); // 2MB
      await expect(cacheManager.set('key', largeValue)).rejects.toThrow('Cache value too large');
    });
  });

  describe('Administrative Operations', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should force fallback activation', () => {
      cacheManager.forceFallback();
      
      expect(cacheManager.state.fallbackActive).toBe(true);
      expect(cacheManager.currentProvider).toBe('memory');
    });

    test('should force Redis reconnection', async () => {
      mockRedisService.connect.mockResolvedValue();
      
      await cacheManager.forceRedisReconnect();
      
      expect(mockRedisService.connect).toHaveBeenCalled();
    });

    test('should handle Redis reconnection failure', async () => {
      mockRedisService.connect.mockRejectedValue(new Error('Connection failed'));
      
      await expect(cacheManager.forceRedisReconnect()).rejects.toThrow('Connection failed');
    });
  });

  describe('Status and Metrics', () => {
    beforeEach(async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    test('should provide comprehensive status', () => {
      const status = cacheManager.getStatus();
      
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('currentProvider');
      expect(status).toHaveProperty('providers');
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('configuration');
      expect(status).toHaveProperty('timestamp');
    });

    test('should record operation metrics', () => {
      cacheManager.recordOperation('get', true, 50, 'redis', null);
      
      expect(cacheManager.state.operationCount).toBe(1);
      expect(mockHealthMonitor.recordOperation).toHaveBeenCalledWith('get', true, 50, null);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown all services gracefully', async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await cacheManager.shutdown();
      
      expect(mockHealthMonitor.shutdown).toHaveBeenCalled();
      expect(mockRedisService.close).toHaveBeenCalled();
      expect(mockMemoryCache.shutdown).toHaveBeenCalled();
    });

    test('should handle shutdown errors gracefully', async () => {
      cacheManager = new CacheManager();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      mockRedisService.close.mockRejectedValue(new Error('Close failed'));
      
      await expect(cacheManager.shutdown()).rejects.toThrow('Close failed');
    });
  });
});