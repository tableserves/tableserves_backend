/**
 * Tests for Cache Configuration Manager
 */

const cacheConfig = require('../cacheConfig');

describe('CacheConfigManager', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Loading', () => {
    test('should load default configuration', () => {
      const config = cacheConfig.getFullConfig();
      
      expect(config.redis.enabled).toBe(true);
      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
      expect(config.fallback.memory.enabled).toBe(true);
      expect(config.policies.defaultTTL).toBe(300);
    });

    test('should disable Redis in test environment by default', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.REDIS_ENABLED;
      
      // Create new instance to test environment-specific behavior
      const CacheConfigManager = require('../cacheConfig').constructor;
      const testConfig = new CacheConfigManager();
      
      expect(testConfig.isRedisEnabled()).toBe(false);
    });

    test('should parse boolean environment variables correctly', () => {
      process.env.REDIS_ENABLED = 'false';
      process.env.FALLBACK_MEMORY_ENABLED = 'true';
      
      const CacheConfigManager = require('../cacheConfig').constructor;
      const testConfig = new CacheConfigManager();
      
      expect(testConfig.isRedisEnabled()).toBe(false);
      expect(testConfig.isMemoryFallbackEnabled()).toBe(true);
    });

    test('should use Redis URL when provided', () => {
      process.env.REDIS_URL = 'redis://localhost:6380';
      
      const CacheConfigManager = require('../cacheConfig').constructor;
      const testConfig = new CacheConfigManager();
      const redisConfig = testConfig.getRedisConfig();
      
      expect(redisConfig.url).toBe('redis://localhost:6380');
    });
  });

  describe('Configuration Validation', () => {
    test('should throw error when Redis enabled but no connection info', () => {
      process.env.REDIS_ENABLED = 'true';
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      
      const CacheConfigManager = require('../cacheConfig').constructor;
      
      expect(() => {
        new CacheConfigManager();
      }).toThrow();
    });

    test('should throw error when no cache is enabled', () => {
      process.env.REDIS_ENABLED = 'false';
      process.env.FALLBACK_MEMORY_ENABLED = 'false';
      process.env.FALLBACK_FILE_ENABLED = 'false';
      
      const CacheConfigManager = require('../cacheConfig').constructor;
      
      expect(() => {
        new CacheConfigManager();
      }).toThrow();
    });
  });

  describe('Configuration Access', () => {
    test('should return null for Redis config when disabled', () => {
      process.env.REDIS_ENABLED = 'false';
      
      const CacheConfigManager = require('../cacheConfig').constructor;
      const testConfig = new CacheConfigManager();
      
      expect(testConfig.getRedisConfig()).toBeNull();
    });

    test('should return memory cache config', () => {
      const memoryConfig = cacheConfig.getMemoryCacheConfig();
      
      expect(memoryConfig).toHaveProperty('enabled');
      expect(memoryConfig).toHaveProperty('maxSize');
      expect(memoryConfig).toHaveProperty('maxEntries');
    });

    test('should return policies', () => {
      const policies = cacheConfig.getPolicies();
      
      expect(policies).toHaveProperty('defaultTTL');
      expect(policies).toHaveProperty('fallbackTTL');
      expect(policies).toHaveProperty('healthCheckInterval');
    });
  });

  describe('Runtime Configuration Updates', () => {
    test('should update configuration at runtime', () => {
      const originalTTL = cacheConfig.getPolicies().defaultTTL;
      const newTTL = 600;
      
      cacheConfig.updateConfig('policies.defaultTTL', newTTL);
      
      expect(cacheConfig.getPolicies().defaultTTL).toBe(newTTL);
      
      // Restore original value
      cacheConfig.updateConfig('policies.defaultTTL', originalTTL);
    });
  });

  describe('Configuration Summary', () => {
    test('should return configuration summary', () => {
      const summary = cacheConfig.getConfigSummary();
      
      expect(summary).toHaveProperty('redis');
      expect(summary).toHaveProperty('fallback');
      expect(summary).toHaveProperty('environment');
      expect(summary).toHaveProperty('timestamp');
    });
  });
});