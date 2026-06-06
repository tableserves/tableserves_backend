/**
 * Development Tools Utility for TableServe Application
 * 
 * This module provides development and debugging tools that are conditionally
 * available based on the environment configuration.
 */

import EnvironmentConfig, { isFeatureEnabled, getConfig } from '../config/EnvironmentConfig';
import logger from '../services/LoggingService';
import dataAccessLayer from '../services/DataAccessLayer';
import subscriptionService from '../services/SubscriptionService';

class DevelopmentTools {
  constructor() {
    this.isEnabled = isFeatureEnabled('debug.enableDevTools');
    this.initializeDevTools();
  }

  initializeDevTools() {
    if (!this.isEnabled) return;

    // Add development shortcuts to window object
    if (typeof window !== 'undefined') {
      window.tableserveDev = {
        // Environment info
        env: EnvironmentConfig,
        
        // Services access
        logger,
        dataAccess: dataAccessLayer,
        subscription: subscriptionService,
        
        // Utility functions
        clearAllData: this.clearAllData.bind(this),
        generateSampleData: this.generateSampleData.bind(this),
        exportData: this.exportData.bind(this),
        importData: this.importData.bind(this),
        getStorageStats: this.getStorageStats.bind(this),
        runPerformanceTest: this.runPerformanceTest.bind(this),
        debugSubscription: this.debugSubscription.bind(this),
        
        // Debug helpers
        enableVerboseLogging: this.enableVerboseLogging.bind(this),
        disableVerboseLogging: this.disableVerboseLogging.bind(this),
        logCurrentState: this.logCurrentState.bind(this),
        
        // Testing utilities
        simulateSlowNetwork: this.simulateSlowNetwork.bind(this),
        testLocalStorage: this.testLocalStorage.bind(this),
        validateDataIntegrity: this.validateDataIntegrity.bind(this),
      };

      logger.info('Development tools initialized', { 
        toolsCount: Object.keys(window.tableserveDev).length 
      }, 'DevelopmentTools');
    }
  }

  // Data management tools
  clearAllData() {
    if (!this.isEnabled) {
      logger.warn('Development tools not enabled', {}, 'DevelopmentTools');
      return false;
    }

    try {
      const cleared = dataAccessLayer.clearAllData();
      logger.info('All data cleared by developer', {}, 'DevelopmentTools');
      return cleared;
    } catch (error) {
      logger.error('Failed to clear all data', error, 'DevelopmentTools');
      return false;
    }
  }

  generateSampleData() {
    if (!this.isEnabled) {
      logger.warn('Development tools not enabled', {}, 'DevelopmentTools');
      return false;
    }
    
    // PRODUCTION NOTE: Sample data generation disabled for production
    logger.warn('Sample data generation is disabled in production builds', {}, 'DevelopmentTools');
    return false;
  }

  exportData() {
    if (!this.isEnabled) return null;

    try {
      const exportedData = dataAccessLayer.exportData();
      
      // Create downloadable file in browser
      if (typeof window !== 'undefined' && exportedData) {
        const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tableserve-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      logger.info('Data exported successfully', {
        size: JSON.stringify(exportedData).length
      }, 'DevelopmentTools');

      return exportedData;
    } catch (error) {
      logger.error('Failed to export data', error, 'DevelopmentTools');
      return null;
    }
  }

  importData(data) {
    if (!this.isEnabled) return false;

    try {
      const result = dataAccessLayer.importData(data);
      
      if (result.success) {
        logger.info('Data imported successfully', result.results, 'DevelopmentTools');
        
        // Reload page to refresh the UI
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }

      return result;
    } catch (error) {
      logger.error('Failed to import data', error, 'DevelopmentTools');
      return { success: false, error: error.message };
    }
  }

  getStorageStats() {
    if (!this.isEnabled) return null;

    try {
      const stats = dataAccessLayer.getStorageStats();
      logger.info('Storage statistics', stats, 'DevelopmentTools');
      return stats;
    } catch (error) {
      logger.error('Failed to get storage stats', error, 'DevelopmentTools');
      return null;
    }
  }

  // Performance testing
  runPerformanceTest() {
    if (!this.isEnabled || !isFeatureEnabled('performance.enableMonitoring')) {
      return null;
    }

    try {
      const startTime = performance.now();
      
      // Test data operations
      const restaurants = dataAccessLayer.getRestaurants();
      const zones = dataAccessLayer.getZones();
      
      // Test cache performance
      dataAccessLayer.clearCache();
      const cachedRestaurants = dataAccessLayer.getRestaurants();
      
      const endTime = performance.now();
      const testResults = {
        totalTime: endTime - startTime,
        restaurantCount: restaurants.length,
        zoneCount: zones.length,
        cacheCleared: true,
        timestamp: new Date().toISOString()
      };

      logger.info('Performance test completed', testResults, 'DevelopmentTools');
      return testResults;
    } catch (error) {
      logger.error('Performance test failed', error, 'DevelopmentTools');
      return null;
    }
  }

  // Subscription debugging
  debugSubscription() {
    if (!this.isEnabled) return null;

    try {
      const subscription = subscriptionService.getCurrentSubscription();
      const planDetails = subscriptionService.getPlanDetails();
      const statusValidation = subscriptionService.validateSubscriptionStatus();

      const debugInfo = {
        subscription,
        planDetails,
        statusValidation,
        timestamp: new Date().toISOString()
      };

      logger.info('Subscription debug info', debugInfo, 'DevelopmentTools');
      return debugInfo;
    } catch (error) {
      logger.error('Subscription debugging failed', error, 'DevelopmentTools');
      return null;
    }
  }

  // Logging controls
  enableVerboseLogging() {
    if (!this.isEnabled) return false;

    try {
      logger.currentLevel = 3; // DEBUG level
      logger.info('Verbose logging enabled', {}, 'DevelopmentTools');
      return true;
    } catch (error) {
      logger.error('Failed to enable verbose logging', error, 'DevelopmentTools');
      return false;
    }
  }

  disableVerboseLogging() {
    if (!this.isEnabled) return false;

    try {
      logger.currentLevel = 0; // ERROR level only
      logger.info('Verbose logging disabled', {}, 'DevelopmentTools');
      return true;
    } catch (error) {
      logger.error('Failed to disable verbose logging', error, 'DevelopmentTools');
      return false;
    }
  }

  logCurrentState() {
    if (!this.isEnabled) return null;

    try {
      const state = {
        environment: {
          mode: import.meta.env.MODE,
          isDevelopment: EnvironmentConfig.isDevelopment,
          isProduction: EnvironmentConfig.isProduction
        },
        storage: dataAccessLayer.getStorageStats(),
        subscription: subscriptionService.getCurrentSubscription(),
        cache: {
          size: dataAccessLayer.cache?.size || 0,
          keys: Array.from(dataAccessLayer.cache?.keys() || [])
        },
        timestamp: new Date().toISOString()
      };

      logger.info('Current application state', state, 'DevelopmentTools');
      return state;
    } catch (error) {
      logger.error('Failed to log current state', error, 'DevelopmentTools');
      return null;
    }
  }

  // Testing utilities
  simulateSlowNetwork(delay = 2000) {
    if (!this.isEnabled) return false;

    try {
      // Mock slow network by wrapping fetch
      if (typeof window !== 'undefined' && window.fetch) {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
          await new Promise(resolve => setTimeout(resolve, delay));
          return originalFetch(...args);
        };

        // Restore after 30 seconds
        setTimeout(() => {
          window.fetch = originalFetch;
          logger.info('Network simulation restored', {}, 'DevelopmentTools');
        }, 30000);

        logger.info('Slow network simulation enabled', { delay }, 'DevelopmentTools');
        return true;
      }
    } catch (error) {
      logger.error('Failed to simulate slow network', error, 'DevelopmentTools');
    }
    
    return false;
  }

  testLocalStorage() {
    if (!this.isEnabled) return null;

    try {
      const testKey = 'tableserve_dev_test';
      const testData = { test: true, timestamp: Date.now() };
      
      // Test write
      localStorage.setItem(testKey, JSON.stringify(testData));
      
      // Test read
      const retrieved = JSON.parse(localStorage.getItem(testKey));
      
      // Test delete
      localStorage.removeItem(testKey);
      
      const testResults = {
        writeSuccess: true,
        readSuccess: retrieved.test === true,
        deleteSuccess: localStorage.getItem(testKey) === null,
        timestamp: new Date().toISOString()
      };

      logger.info('LocalStorage test completed', testResults, 'DevelopmentTools');
      return testResults;
    } catch (error) {
      logger.error('LocalStorage test failed', error, 'DevelopmentTools');
      return { error: error.message };
    }
  }

  validateDataIntegrity() {
    if (!this.isEnabled) return null;

    try {
      const restaurants = dataAccessLayer.getRestaurants();
      const zones = dataAccessLayer.getZones();
      
      const validation = {
        restaurants: {
          count: restaurants.length,
          valid: restaurants.every(r => r.id && r.name && r.ownerName),
          duplicateIds: this.findDuplicateIds(restaurants)
        },
        zones: {
          count: zones.length,
          valid: zones.every(z => z.id && z.name && z.ownerName),
          duplicateIds: this.findDuplicateIds(zones)
        },
        timestamp: new Date().toISOString()
      };

      logger.info('Data integrity validation completed', validation, 'DevelopmentTools');
      return validation;
    } catch (error) {
      logger.error('Data integrity validation failed', error, 'DevelopmentTools');
      return { error: error.message };
    }
  }

  findDuplicateIds(items) {
    const ids = items.map(item => item.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    return [...new Set(duplicates)];
  }

  // Environment configuration helpers
  static getEnvironmentInfo() {
    return {
      mode: import.meta.env.MODE,
      isDevelopment: EnvironmentConfig.isDevelopment,
      isTest: EnvironmentConfig.isTest,
      isProduction: EnvironmentConfig.isProduction,
      debugFeaturesEnabled: isFeatureEnabled('debug.enableDebugRoutes'),
      demoFeaturesEnabled: isFeatureEnabled('debug.enableDemoFeatures'),
      apiMockingEnabled: isFeatureEnabled('features.apiMocking'),
      performanceMonitoringEnabled: isFeatureEnabled('performance.enableMonitoring')
    };
  }

  static shouldShowFeature(featurePath) {
    return isFeatureEnabled(featurePath);
  }

  static getFeatureConfig(configPath, defaultValue = null) {
    return getConfig(configPath, defaultValue);
  }
}

// Create singleton instance
const developmentTools = new DevelopmentTools();

// Export both the instance and the class for static methods
export default developmentTools;
export { DevelopmentTools };