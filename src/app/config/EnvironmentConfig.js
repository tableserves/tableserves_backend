/**
 * Environment Configuration for Tableserves Application
 * 
 * This module provides environment-aware configuration for features,
 * debug tools, and development utilities.
 */

// Environment detection
const isDevelopment = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test';
const isProduction = import.meta.env.MODE === 'production';

// Environment-specific configuration
const EnvironmentConfig = {
  // Environment flags
  isDevelopment,
  isTest,
  isProduction,
  
  // Debug features configuration
  debug: {
    // Enable debug routes and components
    enableDebugRoutes: isDevelopment || isTest,
    
    // Enable test components
    enableTestComponents: isDevelopment || isTest,
    
    // Enable demo features
    enableDemoFeatures: isDevelopment || isTest,
    
    // Enable development tools
    enableDevTools: isDevelopment,
    
    // Enable mock data generation
    enableMockData: isDevelopment || isTest,
    
    // Enable verbose logging
    enableVerboseLogging: isDevelopment,
    
    // Enable performance monitoring
    enablePerformanceMonitoring: isDevelopment,
    
    // Enable auto-refresh features
    enableAutoRefresh: isDevelopment,
  },
  
  // Feature flags for conditional functionality
  features: {
    // QR Demo and testing features
    qrDemo: isDevelopment || isTest,
    qrTest: isDevelopment || isTest,
    
    // Theme testing
    themeTest: isDevelopment,
    
    // Autofill protection testing
    autofillTest: isDevelopment,
    
    // Admin tools
    adminDeveloperTools: isDevelopment,
    
    // Sample data generation
    sampleDataGeneration: isDevelopment || isTest,
    
    // Advanced debugging panels
    debugPanels: isDevelopment,
    
    // API mocking
    apiMocking: isDevelopment || isTest,
    
    // Error boundary details
    errorBoundaryDetails: isDevelopment,
    
    // Redux DevTools
    reduxDevTools: isDevelopment,
  },
  
  // API configuration
  api: {
    // Use mock API in development
    useMockApi: isDevelopment || isTest,
    
    // API base URL — production targets api.tableserves.com, development uses local backend
    baseUrl: isProduction
      ? import.meta.env.VITE_API_BASE_URL || 'https://api.tableserves.com/api/v1'
      : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
    
    // Request timeout
    timeout: isDevelopment ? 30000 : 10000,
    
    // Enable request/response logging
    enableLogging: isDevelopment,
  },
  
  // Performance configuration
  performance: {
    // Enable performance monitoring
    enableMonitoring: isDevelopment,
    
    // Cache timeout (development has shorter cache)
    cacheTimeout: isDevelopment ? 60000 : 300000, // 1 min vs 5 min
    
    // Bundle analyzer
    enableBundleAnalyzer: isDevelopment && import.meta.env.VITE_ANALYZE === 'true',
  },
  
  // Security configuration
  security: {
    // Enable CSRF protection
    enableCSRF: isProduction,
    
    // Enable rate limiting
    enableRateLimit: isProduction,
    
    // Enable security headers
    enableSecurityHeaders: isProduction,
    
    // Session timeout
    sessionTimeout: isProduction ? 3600000 : 86400000, // 1 hour vs 24 hours
  },
  
  // Data configuration
  data: {
    // Enable data persistence
    enablePersistence: true,
    
    // Enable data export/import
    enableDataExport: isDevelopment || isTest,
    
    // Enable data reset functionality
    enableDataReset: isDevelopment || isTest,
    
    // Storage quota management
    enableStorageQuotaManagement: isProduction,
  },
  
  // UI configuration
  ui: {
    // Enable animations
    enableAnimations: !isTest, // Disable in tests for performance
    
    // Enable transitions
    enableTransitions: !isTest,
    
    // Enable tooltips
    enableTooltips: true,
    
    // Enable keyboard shortcuts
    enableKeyboardShortcuts: isDevelopment,
    
    // Enable accessibility tools
    enableA11yTools: isDevelopment,
  },
  
  // Logging configuration
  logging: {
    // Log levels: ERROR, WARN, INFO, DEBUG
    level: isDevelopment ? 'DEBUG' : 'ERROR',
    
    // Enable console logging
    enableConsole: isDevelopment || isTest,
    
    // Enable remote logging
    enableRemote: isProduction,
    
    // Log retention (in milliseconds)
    retention: isDevelopment ? 86400000 : 604800000, // 1 day vs 1 week
    
    // Maximum log entries
    maxEntries: isDevelopment ? 1000 : 500,
  },
  
  // Build configuration
  build: {
    // Enable source maps
    enableSourceMaps: isDevelopment,
    
    // Enable hot reload
    enableHotReload: isDevelopment,
    
    // Bundle optimization
    optimizeBundle: isProduction,
    
    // Code splitting
    enableCodeSplitting: isProduction,
  }
};

// Helper functions for feature checking
export const isFeatureEnabled = (featurePath) => {
  const pathParts = featurePath.split('.');
  let current = EnvironmentConfig;
  
  for (const part of pathParts) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }
  
  return Boolean(current);
};

export const getConfig = (configPath, defaultValue = null) => {
  const pathParts = configPath.split('.');
  let current = EnvironmentConfig;
  
  for (const part of pathParts) {
    if (current[part] === undefined) {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current;
};

// Environment-specific component wrapper
export const DevOnly = ({ children }) => {
  return isFeatureEnabled('debug.enableDebugRoutes') ? children : null;
};

export const ProdOnly = ({ children }) => {
  return isProduction ? children : null;
};

export const TestOnly = ({ children }) => {
  return isTest ? children : null;
};

// Debug route checker
export const shouldRenderDebugRoute = () => {
  return isFeatureEnabled('debug.enableDebugRoutes');
};

// Demo feature checker
export const shouldRenderDemoFeature = () => {
  return isFeatureEnabled('debug.enableDemoFeatures');
};

// Console override for production
if (isProduction && !isFeatureEnabled('logging.enableConsole')) {
  // Override console methods in production
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  // Keep console.warn and console.error for important messages
}

// Performance monitoring setup
if (isFeatureEnabled('performance.enableMonitoring')) {
  // Enable performance observer for development
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 100) { // Log slow operations
            console.warn(`[Performance] Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }
}

export default EnvironmentConfig;