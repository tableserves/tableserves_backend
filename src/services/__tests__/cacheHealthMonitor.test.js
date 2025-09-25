/**
 * Tests for Cache Health Monitor
 */

const CacheHealthMonitor = require('../cacheHealthMonitor');

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the cache config
jest.mock('../../config/cacheConfig', () => ({
  getMonitoringConfig: () => ({
    enabled: true,
    metricsInterval: 100, // Fast interval for tests
    alertThresholds: {
      errorRate: 0.1,
      latency: 1000,
      memoryUsage: 0.9
    }
  }),
  getMemoryCacheConfig: () => ({
    maxSize: 1024 * 1024,
    maxEntries: 1000
  }),
  getRedisConfig: () => ({
    circuitBreakerThreshold: 5
  }),
  isRedisEnabled: () => true,
  getConfigSummary: () => ({
    redis: { enabled: true },
    fallback: { memory: true },
    environment: 'test'
  })
}));

describe('CacheHealthMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new CacheHealthMonitor();
  });

  afterEach(() => {
    if (monitor) {
      monitor.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default status', () => {
      const status = monitor.getHealthStatus();
      
      expect(status.redis.connected).toBe(false);
      expect(status.fallback.active).toBe(false);
      expect(status.overall.status).toBe('unknown');
    });

    test('should start monitoring automatically', () => {
      expect(monitor.isMonitoring).toBe(true);
    });
  });

  describe('Redis Status Tracking', () => {
    test('should update Redis connection status', () => {
      monitor.updateRedisStatus(true, null, 50);
      
      const status = monitor.getHealthStatus();
      expect(status.redis.connected).toBe(true);
      expect(status.redis.latency).toBe(50);
      expect(status.redis.consecutiveFailures).toBe(0);
    });

    test('should track connection failures', () => {
      const error = new Error('Connection refused');
      monitor.updateRedisStatus(false, error);
      
      const status = monitor.getHealthStatus();
      expect(status.redis.connected).toBe(false);
      expect(status.redis.consecutiveFailures).toBe(1);
      expect(status.redis.lastError).toBe('Connection refused');
    });

    test('should open circuit breaker after threshold failures', () => {
      const error = new Error('Connection refused');
      
      // Trigger multiple failures
      for (let i = 0; i < 6; i++) {
        monitor.updateRedisStatus(false, error);
      }
      
      const status = monitor.getHealthStatus();
      expect(status.redis.circuitBreakerOpen).toBe(true);
    });

    test('should emit events on status changes', (done) => {
      monitor.on('redis:connected', (data) => {
        expect(data.latency).toBe(25);
        done();
      });

      monitor.updateRedisStatus(true, null, 25);
    });
  });

  describe('Fallback Status Tracking', () => {
    test('should update fallback cache status', () => {
      const stats = { size: 1024, entries: 10, hitRate: 0.8 };
      monitor.updateFallbackStatus(true, 'memory', stats);
      
      const status = monitor.getHealthStatus();
      expect(status.fallback.active).toBe(true);
      expect(status.fallback.type).toBe('memory');
      expect(status.fallback.size).toBe(1024);
      expect(status.fallback.hitRate).toBe(0.8);
    });

    test('should emit events on fallback activation', (done) => {
      monitor.on('fallback:activated', (data) => {
        expect(data.type).toBe('memory');
        done();
      });

      monitor.updateFallbackStatus(true, 'memory', {});
    });
  });

  describe('Operation Metrics', () => {
    test('should record successful operations', () => {
      monitor.recordOperation('get', true, 50);
      monitor.recordOperation('set', true, 75);
      
      const metrics = monitor.getMetricsSummary();
      expect(metrics.requests.total).toBe(2);
      expect(metrics.requests.successful).toBe(2);
      expect(metrics.requests.failed).toBe(0);
      expect(metrics.performance.avgLatency).toBe(62.5);
    });

    test('should record failed operations', () => {
      const error = new Error('Cache error');
      error.code = 'CACHE_ERROR';
      
      monitor.recordOperation('get', false, null, error);
      
      const metrics = monitor.getMetricsSummary();
      expect(metrics.requests.failed).toBe(1);
      expect(metrics.errors.total).toBe(1);
      expect(metrics.errors.byType.CACHE_ERROR).toBe(1);
      expect(metrics.errors.lastError.message).toBe('Cache error');
    });

    test('should calculate error rates', () => {
      monitor.recordOperation('get', true, 50);
      monitor.recordOperation('get', false, null, new Error('Error'));
      monitor.recordOperation('get', false, null, new Error('Error'));
      
      const metrics = monitor.getMetricsSummary();
      expect(metrics.errors.rate).toBeCloseTo(0.67, 2);
    });

    test('should track peak latency', () => {
      monitor.recordOperation('get', true, 100);
      monitor.recordOperation('get', true, 200);
      monitor.recordOperation('get', true, 50);
      
      const metrics = monitor.getMetricsSummary();
      expect(metrics.performance.peakLatency).toBe(200);
    });
  });

  describe('Overall Status Calculation', () => {
    test('should be healthy when everything is working', () => {
      monitor.updateRedisStatus(true, null, 50);
      monitor.recordOperation('get', true, 50);
      
      const status = monitor.getHealthStatus();
      expect(status.overall.status).toBe('healthy');
    });

    test('should be degraded when Redis is down but fallback is active', () => {
      monitor.updateRedisStatus(false, new Error('Connection failed'));
      monitor.updateFallbackStatus(true, 'memory', {});
      
      const status = monitor.getHealthStatus();
      expect(status.overall.status).toBe('degraded');
    });

    test('should be critical when Redis is down and no fallback', () => {
      monitor.updateRedisStatus(false, new Error('Connection failed'));
      monitor.updateFallbackStatus(false);
      
      const status = monitor.getHealthStatus();
      expect(status.overall.status).toBe('critical');
    });

    test('should emit status change events', (done) => {
      monitor.on('status:changed', (data) => {
        expect(data.from).toBe('unknown');
        expect(data.to).toBe('degraded');
        done();
      });

      monitor.updateRedisStatus(false, new Error('Connection failed'));
      monitor.updateFallbackStatus(true, 'memory', {});
    });
  });

  describe('Alert System', () => {
    test('should emit high error rate alerts', (done) => {
      monitor.on('alert:high_error_rate', (data) => {
        expect(data.current).toBeGreaterThan(0.1);
        done();
      });

      // Generate high error rate
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation('get', false, null, new Error('Error'));
      }
      monitor.recordOperation('get', true, 50);

      // Trigger alert check
      monitor.checkAlertConditions();
    });

    test('should emit high latency alerts', (done) => {
      monitor.on('alert:high_latency', (data) => {
        expect(data.current).toBeGreaterThan(1000);
        done();
      });

      // Generate high latency
      monitor.recordOperation('get', true, 2000);
      monitor.checkAlertConditions();
    });

    test('should emit circuit breaker alerts', (done) => {
      monitor.on('alert:circuit_breaker_open', (data) => {
        expect(data.consecutiveFailures).toBeGreaterThanOrEqual(5);
        done();
      });

      // Trigger circuit breaker
      const error = new Error('Connection failed');
      for (let i = 0; i < 6; i++) {
        monitor.updateRedisStatus(false, error);
      }
      
      monitor.checkAlertConditions();
    });
  });

  describe('Event System', () => {
    test('should add and remove event listeners', () => {
      const callback = jest.fn();
      
      monitor.on('test:event', callback);
      monitor.emit('test:event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
      
      monitor.off('test:event', callback);
      monitor.emit('test:event', { data: 'test2' });
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should handle errors in event listeners gracefully', () => {
      const errorCallback = () => {
        throw new Error('Listener error');
      };
      
      monitor.on('test:event', errorCallback);
      
      // Should not throw
      expect(() => {
        monitor.emit('test:event', {});
      }).not.toThrow();
    });
  });

  describe('Metrics Cleanup', () => {
    test('should clean up old metrics', async () => {
      // Add some old metrics
      monitor.recordOperation('get', true, 50);
      
      // Manually set old timestamp
      monitor.metrics.requests.lastMinute[0].timestamp = Date.now() - 400000; // 6+ minutes ago
      
      monitor.cleanupOldMetrics();
      
      expect(monitor.metrics.requests.lastMinute).toHaveLength(0);
    });
  });

  describe('Diagnostics', () => {
    test('should provide comprehensive diagnostics', () => {
      const diagnostics = monitor.getDiagnostics();
      
      expect(diagnostics).toHaveProperty('monitoring');
      expect(diagnostics).toHaveProperty('configuration');
      expect(diagnostics).toHaveProperty('status');
      expect(diagnostics).toHaveProperty('alerts');
      expect(diagnostics).toHaveProperty('timestamp');
    });
  });

  describe('Lifecycle Management', () => {
    test('should start and stop monitoring', () => {
      monitor.stopMonitoring();
      expect(monitor.isMonitoring).toBe(false);
      
      monitor.startMonitoring();
      expect(monitor.isMonitoring).toBe(true);
    });

    test('should reset metrics', () => {
      monitor.recordOperation('get', true, 50);
      monitor.resetMetrics();
      
      const metrics = monitor.getMetricsSummary();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.errors.total).toBe(0);
    });

    test('should shutdown cleanly', () => {
      monitor.shutdown();
      expect(monitor.isMonitoring).toBe(false);
      expect(monitor.listeners.size).toBe(0);
    });
  });
});