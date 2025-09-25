/**
 * Tests for Memory Cache Service
 */

const MemoryCacheService = require('../memoryCache');

describe('MemoryCacheService', () => {
  let cache;

  beforeEach(() => {
    cache = new MemoryCacheService({
      maxSize: 1024 * 1024, // 1MB
      maxEntries: 100,
      ttlCheckInterval: 100, // 100ms for faster tests
      enabled: true
    });
  });

  afterEach(() => {
    if (cache) {
      cache.shutdown();
    }
  });

  describe('Basic Operations', () => {
    test('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get('key1');
      expect(result).toBe('value1');
    });

    test('should return null for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    test('should delete values', async () => {
      await cache.set('key1', 'value1');
      const deleted = await cache.del('key1');
      expect(deleted).toBe(true);
      
      const result = await cache.get('key1');
      expect(result).toBeNull();
    });

    test('should check if key exists', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.exists('key1')).toBe(true);
      expect(await cache.exists('nonexistent')).toBe(false);
    });

    test('should handle different data types', async () => {
      const testData = {
        string: 'test',
        number: 42,
        object: { nested: 'value' },
        array: [1, 2, 3],
        boolean: true
      };

      for (const [key, value] of Object.entries(testData)) {
        await cache.set(key, value);
        const result = await cache.get(key);
        expect(result).toEqual(value);
      }
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire entries after TTL', async () => {
      await cache.set('key1', 'value1', 0.1); // 100ms TTL
      
      // Should exist immediately
      expect(await cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await cache.get('key1')).toBeNull();
    });

    test('should not expire entries without TTL', async () => {
      await cache.set('key1', 'value1'); // No TTL
      
      // Wait longer than typical TTL
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should still exist
      expect(await cache.get('key1')).toBe('value1');
    });

    test('should clean up expired entries automatically', async () => {
      await cache.set('key1', 'value1', 0.05); // 50ms TTL
      await cache.set('key2', 'value2'); // No TTL
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await cache.exists('key1')).toBe(false);
      expect(await cache.exists('key2')).toBe(true);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entries when at capacity', async () => {
      // Create cache with small capacity
      const smallCache = new MemoryCacheService({
        maxEntries: 3,
        maxSize: 1024 * 1024
      });

      // Fill cache to capacity
      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // Access key1 to make it recently used
      await smallCache.get('key1');

      // Add new entry, should evict key2 (least recently used)
      await smallCache.set('key4', 'value4');

      expect(await smallCache.exists('key1')).toBe(true); // Recently accessed
      expect(await smallCache.exists('key2')).toBe(false); // Should be evicted
      expect(await smallCache.exists('key3')).toBe(true);
      expect(await smallCache.exists('key4')).toBe(true);

      smallCache.shutdown();
    });

    test('should evict entries when size limit is reached', async () => {
      // Create cache with small size limit
      const smallCache = new MemoryCacheService({
        maxSize: 100, // 100 bytes
        maxEntries: 1000
      });

      // Add entries until size limit is reached
      await smallCache.set('key1', 'a'.repeat(30));
      await smallCache.set('key2', 'b'.repeat(30));
      await smallCache.set('key3', 'c'.repeat(30));

      // This should trigger eviction
      await smallCache.set('key4', 'd'.repeat(30));

      // At least one entry should be evicted
      const stats = smallCache.getStats();
      expect(stats.entries).toBeLessThan(4);

      smallCache.shutdown();
    });
  });

  describe('Pattern Matching', () => {
    test('should clear all entries with * pattern', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      const cleared = await cache.clear('*');
      expect(cleared).toBe(3);
      expect(cache.getStats().entries).toBe(0);
    });

    test('should clear entries matching specific patterns', async () => {
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('order:1', 'order1');
      await cache.set('order:2', 'order2');

      const cleared = await cache.clear('user:*');
      expect(cleared).toBe(2);
      
      expect(await cache.exists('user:1')).toBe(false);
      expect(await cache.exists('user:2')).toBe(false);
      expect(await cache.exists('order:1')).toBe(true);
      expect(await cache.exists('order:2')).toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should track hit and miss counts', async () => {
      await cache.set('key1', 'value1');
      
      // Hits
      await cache.get('key1');
      await cache.get('key1');
      
      // Misses
      await cache.get('nonexistent1');
      await cache.get('nonexistent2');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should track cache size and entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', { data: 'value2' });

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('should reset statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('nonexistent');

      cache.resetStats();
      
      const stats = cache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.evictionCount).toBe(0);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when functioning normally', async () => {
      await cache.set('key1', 'value1');
      
      const health = await cache.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.stats).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });

    test('should return degraded status when near capacity', async () => {
      // Create cache with very small capacity
      const smallCache = new MemoryCacheService({
        maxSize: 100,
        maxEntries: 2
      });

      // Fill to near capacity
      await smallCache.set('key1', 'a'.repeat(90));

      const health = await smallCache.healthCheck();
      expect(health.status).toBe('degraded');

      smallCache.shutdown();
    });

    test('should return disabled status when cache is disabled', async () => {
      const disabledCache = new MemoryCacheService({ enabled: false });
      
      const health = await disabledCache.healthCheck();
      expect(health.status).toBe('disabled');

      disabledCache.shutdown();
    });
  });

  describe('Disabled Cache', () => {
    test('should not perform operations when disabled', async () => {
      const disabledCache = new MemoryCacheService({ enabled: false });

      expect(await disabledCache.set('key1', 'value1')).toBe(false);
      expect(await disabledCache.get('key1')).toBeNull();
      expect(await disabledCache.exists('key1')).toBe(false);
      expect(await disabledCache.clear()).toBe(0);

      disabledCache.shutdown();
    });
  });

  describe('Error Handling', () => {
    test('should handle serialization errors gracefully', async () => {
      // Create circular reference
      const circular = {};
      circular.self = circular;

      const result = await cache.set('circular', circular);
      expect(result).toBe(false);
    });

    test('should handle very large values', async () => {
      const largeValue = 'x'.repeat(2 * 1024 * 1024); // 2MB, larger than cache
      
      const result = await cache.set('large', largeValue);
      expect(result).toBe(false);
    });
  });

  describe('Size Information', () => {
    test('should provide accurate size information', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', { data: 'value2' });

      const sizeInfo = cache.getSizeInfo();
      expect(sizeInfo.entries).toBe(2);
      expect(sizeInfo.sizeBytes).toBeGreaterThan(0);
      expect(sizeInfo.maxSizeBytes).toBe(1024 * 1024);
      expect(sizeInfo.maxEntries).toBe(100);
      expect(sizeInfo.utilizationPercent.entries).toBe(2);
    });
  });
});