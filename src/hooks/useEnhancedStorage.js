/**
 * Enhanced Storage Hook for TableServe Application
 * 
 * This hook provides a React-friendly interface to the enhanced storage system,
 * replacing direct localStorage usage with intelligent caching and better performance.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import cachingService from '../services/CachingService';
import dataAccessLayer from '../services/DataAccessLayer';
import logger from '../services/LoggingService';

/**
 * Enhanced storage hook with automatic React state synchronization
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @param {Object} options - Configuration options
 * @returns {[value, setValue, { loading, error, refresh, remove }]}
 */
export function useEnhancedStorage(key, defaultValue = null, options = {}) {
  const {
    ttl = 15 * 60 * 1000,        // 15 minutes default TTL
    persistent = false,           // Whether to persist to localStorage
    syncAcrossTabs = false,      // Whether to sync across browser tabs
    autoRefresh = false,         // Whether to automatically refresh stale data
    refreshInterval = 60000,     // Auto refresh interval in ms
    validateData = null,         // Function to validate retrieved data
    transformData = null,        // Function to transform data before storing
  } = options;

  const [value, setValue] = useState(() => {
    try {
      const storedValue = cachingService.get(key, defaultValue);
      return validateData ? validateData(storedValue) ? storedValue : defaultValue : storedValue;
    } catch (error) {
      logger.warn('Failed to initialize storage hook value', { key, error }, 'useEnhancedStorage');
      return defaultValue;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Make the key persistent if requested
  useEffect(() => {
    if (persistent) {
      cachingService.makePersistent(key);
    }
  }, [key, persistent]);

  // Set up tab synchronization if requested
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (event) => {
      if (event.key === `tableserve_cache_${key}` && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (!parsed.expiresAt || Date.now() <= parsed.expiresAt) {
            const newValue = validateData ? 
              (validateData(parsed.data) ? parsed.data : defaultValue) : 
              parsed.data;
            setValue(newValue);
            logger.debug('Storage synchronized across tabs', { key }, 'useEnhancedStorage');
          }
        } catch (error) {
          logger.warn('Failed to sync storage across tabs', { key, error }, 'useEnhancedStorage');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue, validateData, syncAcrossTabs]);

  // Set up auto refresh if requested
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      const currentValue = cachingService.get(key, defaultValue);
      if (currentValue !== value) {
        const newValue = validateData ? 
          (validateData(currentValue) ? currentValue : defaultValue) : 
          currentValue;
        setValue(newValue);
        logger.debug('Storage value auto-refreshed', { key }, 'useEnhancedStorage');
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [key, value, defaultValue, validateData, autoRefresh, refreshInterval]);

  // Enhanced setValue function
  const setEnhancedValue = useCallback((newValue, customTtl = ttl) => {
    try {
      setLoading(true);
      setError(null);

      // Transform data if transformer is provided
      const valueToStore = transformData ? transformData(newValue) : newValue;

      // Validate data if validator is provided
      if (validateData && !validateData(valueToStore)) {
        throw new Error('Data validation failed');
      }

      // Store in cache
      cachingService.set(key, valueToStore, customTtl);

      // Update React state
      setValue(valueToStore);

      logger.debug('Enhanced storage value updated', { key, hasValue: valueToStore !== null }, 'useEnhancedStorage');
    } catch (error) {
      setError(error.message);
      logger.error('Failed to set enhanced storage value', error, 'useEnhancedStorage');
    } finally {
      setLoading(false);
    }
  }, [key, ttl, transformData, validateData]);

  // Refresh function to manually reload from storage
  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      const refreshedValue = cachingService.get(key, defaultValue);
      const newValue = validateData ? 
        (validateData(refreshedValue) ? refreshedValue : defaultValue) : 
        refreshedValue;

      setValue(newValue);
      logger.debug('Enhanced storage value refreshed', { key }, 'useEnhancedStorage');
    } catch (error) {
      setError(error.message);
      logger.error('Failed to refresh enhanced storage value', error, 'useEnhancedStorage');
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue, validateData]);

  // Remove function to delete from storage
  const remove = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      cachingService.delete(key);
      setValue(defaultValue);

      logger.debug('Enhanced storage value removed', { key }, 'useEnhancedStorage');
    } catch (error) {
      setError(error.message);
      logger.error('Failed to remove enhanced storage value', error, 'useEnhancedStorage');
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  // Memoized utilities object
  const utilities = useMemo(() => ({
    loading,
    error,
    refresh,
    remove,
    exists: cachingService.has(key),
    stats: cachingService.getStats(),
  }), [loading, error, refresh, remove, key]);

  return [value, setEnhancedValue, utilities];
}

/**
 * Hook for accessing data through the DataAccessLayer
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value
 * @param {Object} options - Options
 * @returns {[value, setValue, utilities]}
 */
export function useDataAccess(key, defaultValue = null, options = {}) {
  const {
    useCache = true,
    ttl = 15 * 60 * 1000,
    autoSync = false
  } = options;

  const [value, setValue] = useState(() => {
    return dataAccessLayer.getData(key, defaultValue, useCache);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-sync with DataAccessLayer changes
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      const currentValue = dataAccessLayer.getData(key, defaultValue, useCache);
      if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
        setValue(currentValue);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [key, defaultValue, useCache, value, autoSync]);

  const setDataValue = useCallback((newValue) => {
    try {
      setLoading(true);
      setError(null);

      const success = dataAccessLayer.setData(key, newValue, useCache, ttl);
      if (success) {
        setValue(newValue);
      } else {
        throw new Error('Failed to save data');
      }
    } catch (error) {
      setError(error.message);
      logger.error('Failed to set data access value', error, 'useDataAccess');
    } finally {
      setLoading(false);
    }
  }, [key, useCache, ttl]);

  const refresh = useCallback(() => {
    const refreshedValue = dataAccessLayer.getData(key, defaultValue, useCache);
    setValue(refreshedValue);
  }, [key, defaultValue, useCache]);

  const remove = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      const success = dataAccessLayer.deleteData(key);
      if (success) {
        setValue(defaultValue);
      } else {
        throw new Error('Failed to delete data');
      }
    } catch (error) {
      setError(error.message);
      logger.error('Failed to remove data access value', error, 'useDataAccess');
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  const utilities = useMemo(() => ({
    loading,
    error,
    refresh,
    remove,
    stats: dataAccessLayer.getStorageStats(),
  }), [loading, error, refresh, remove]);

  return [value, setDataValue, utilities];
}

/**
 * Hook for storage migration status and controls
 * @returns {Object} Migration utilities
 */
export function useStorageMigration() {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load initial migration status
    import('../services/StorageMigrationService').then(({ default: service }) => {
      setMigrationStatus(service.getMigrationStatus());
    });
  }, []);

  const triggerMigration = useCallback(async () => {
    try {
      setLoading(true);
      const { default: service } = await import('../services/StorageMigrationService');
      const result = await service.migrate();
      setMigrationStatus(service.getMigrationStatus());
      return result;
    } catch (error) {
      logger.error('Migration trigger failed', error, 'useStorageMigration');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const { default: service } = await import('../services/StorageMigrationService');
      setMigrationStatus(service.getMigrationStatus());
    } catch (error) {
      logger.error('Migration status refresh failed', error, 'useStorageMigration');
    }
  }, []);

  return {
    migrationStatus,
    loading,
    triggerMigration,
    refreshStatus,
  };
}

// Backward compatibility adapter for existing localStorage usage
export function useLocalStorage(key, defaultValue, options = {}) {
  logger.warn('useLocalStorage is deprecated, use useEnhancedStorage instead', { key }, 'useLocalStorage');
  
  return useEnhancedStorage(key, defaultValue, {
    persistent: true,
    syncAcrossTabs: true,
    ...options
  });
}