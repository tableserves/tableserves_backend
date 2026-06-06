/**
 * Storage Migration Service for TableServe Application
 * 
 * This service helps migrate from direct localStorage usage to the enhanced
 * caching service, providing backward compatibility and smooth transition.
 */

import cachingService from '../cache/CachingService';
import logger from '@/services/LoggingService';

class StorageMigrationService {
  constructor() {
    this.migrationVersion = '1.0.0';
    this.migrationKey = 'tableserve_migration_version';
    this.legacyKeys = [
      // Auth related
      'tableserve_auth_token',
      'tableserve_auth_user',
      'tableserve_auth_refresh_token',
      
      // Theme
      'tableserve-theme',
      
      // User preferences
      'tableserve_user_preferences',
      
      // Data storage
      'tableserve_restaurants',
      'tableserve_zones',
      'tableserve_vendors',
      'tableserve_menu_items',
      'tableserve_menu_categories',
      'tableserve_orders',
      
      // Cart and session
      'tableserve_cart',
      'tableserve_session',
      
      // Credentials
      'tableserve_shop_credentials',
      'tableserve_customers',
      
      // Debug and test data
      'tableserve_debug_settings',
      'tableserve_test_data'
    ];
  }

  /**
   * Check if migration is needed and perform it
   */
  async migrate() {
    try {
      const currentVersion = localStorage.getItem(this.migrationKey);
      
      if (currentVersion === this.migrationVersion) {
        logger.info('Storage migration not needed', { currentVersion }, 'StorageMigrationService');
        return { success: true, migrated: false };
      }
      
      logger.info('Starting storage migration', { 
        from: currentVersion || 'legacy', 
        to: this.migrationVersion 
      }, 'StorageMigrationService');
      
      const migrationResult = await this.performMigration();
      
      if (migrationResult.success) {
        localStorage.setItem(this.migrationKey, this.migrationVersion);
        logger.info('Storage migration completed successfully', migrationResult, 'StorageMigrationService');
      }
      
      return migrationResult;
    } catch (error) {
      logger.error('Storage migration failed', error, 'StorageMigrationService');
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform the actual migration
   */
  async performMigration() {
    const migrationResults = {
      success: true,
      migrated: true,
      migratedKeys: [],
      preservedKeys: [],
      removedKeys: [],
      errors: []
    };

    try {
      // Step 1: Migrate essential data to new caching service
      await this.migrateEssentialData(migrationResults);
      
      // Step 2: Preserve important data with new structure
      await this.preserveImportantData(migrationResults);
      
      // Step 3: Clean up legacy data
      await this.cleanupLegacyData(migrationResults);
      
      // Step 4: Optimize storage
      await this.optimizeStorage(migrationResults);
      
      return migrationResults;
    } catch (error) {
      migrationResults.success = false;
      migrationResults.errors.push(error.message);
      return migrationResults;
    }
  }

  /**
   * Migrate essential data that should be cached
   */
  async migrateEssentialData(results) {
    const essentialMappings = {
      'tableserve_auth_token': 'ui_auth_token',
      'tableserve_auth_user': 'ui_auth_user',
      'tableserve-theme': 'ui_theme_mode',
      'tableserve_cart': 'cart_items'
    };

    for (const [oldKey, newKey] of Object.entries(essentialMappings)) {
      try {
        const data = localStorage.getItem(oldKey);
        if (data !== null) {
          let parsedData;
          
          // Handle different data formats
          if (oldKey === 'tableserve-theme') {
            parsedData = data; // Theme is stored as string
          } else {
            try {
              parsedData = JSON.parse(data);
            } catch {
              parsedData = data; // Keep as string if not JSON
            }
          }
          
          // Set in new caching service with appropriate TTL
          const ttl = this.getTTLForKey(newKey);
          cachingService.set(newKey, parsedData, ttl);
          
          // Make it persistent
          cachingService.makePersistent(newKey);
          
          results.migratedKeys.push({ oldKey, newKey });
          logger.debug('Migrated essential data', { oldKey, newKey }, 'StorageMigrationService');
        }
      } catch (error) {
        results.errors.push(`Failed to migrate ${oldKey}: ${error.message}`);
        logger.warn('Failed to migrate essential data', { oldKey, error }, 'StorageMigrationService');
      }
    }
  }

  /**
   * Preserve important data that should remain in localStorage
   */
  async preserveImportantData(results) {
    const preservedKeys = [
      'tableserve_shop_credentials',
      'tableserve_customers',
      'tableserve_subscription_plan'
    ];

    for (const key of preservedKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data !== null) {
          // Keep in localStorage but with new naming convention
          const newKey = `tableserve_preserved_${key.replace('tableserve_', '')}`;
          localStorage.setItem(newKey, data);
          results.preservedKeys.push({ oldKey: key, newKey });
        }
      } catch (error) {
        results.errors.push(`Failed to preserve ${key}: ${error.message}`);
      }
    }
  }

  /**
   * Clean up legacy data that's no longer needed
   */
  async cleanupLegacyData(results) {
    // Data that can be safely removed (will be fetched from API/generated as needed)
    const removableKeys = [
      'tableserve_restaurants',
      'tableserve_zones', 
      'tableserve_vendors',
      'tableserve_menu_items',
      'tableserve_menu_categories',
      'tableserve_orders',
      'tableserve_debug_settings',
      'tableserve_test_data'
    ];

    for (const key of removableKeys) {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          results.removedKeys.push(key);
        }
      } catch (error) {
        results.errors.push(`Failed to remove ${key}: ${error.message}`);
      }
    }

    // Remove all migrated keys from localStorage
    for (const { oldKey } of results.migratedKeys) {
      try {
        localStorage.removeItem(oldKey);
      } catch (error) {
        results.errors.push(`Failed to cleanup ${oldKey}: ${error.message}`);
      }
    }
  }

  /**
   * Optimize storage by removing empty or invalid entries
   */
  async optimizeStorage(results) {
    try {
      const keysToCheck = [];
      
      // Collect all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tableserve_')) {
          keysToCheck.push(key);
        }
      }

      // Check each key for validity
      for (const key of keysToCheck) {
        try {
          const value = localStorage.getItem(key);
          
          // Remove empty or invalid entries
          if (value === null || value === 'undefined' || value === 'null' || value.trim() === '') {
            localStorage.removeItem(key);
            results.removedKeys.push(key);
          } else if (value.startsWith('{') || value.startsWith('[')) {
            // Validate JSON entries
            try {
              JSON.parse(value);
            } catch {
              localStorage.removeItem(key);
              results.removedKeys.push(key);
            }
          }
        } catch (error) {
          // Remove problematic keys
          localStorage.removeItem(key);
          results.removedKeys.push(key);
        }
      }
      
      results.optimized = true;
    } catch (error) {
      results.errors.push(`Storage optimization failed: ${error.message}`);
    }
  }

  /**
   * Get appropriate TTL for different types of data
   */
  getTTLForKey(key) {
    const ttlMap = {
      'ui_auth_token': 24 * 60 * 60 * 1000,      // 24 hours
      'ui_auth_user': 24 * 60 * 60 * 1000,       // 24 hours
      'ui_theme_mode': 7 * 24 * 60 * 60 * 1000,  // 7 days
      'cart_items': 7 * 24 * 60 * 60 * 1000,     // 7 days
      'subscription_plan': 60 * 60 * 1000,       // 1 hour
    };

    return ttlMap[key] || 15 * 60 * 1000; // 15 minutes default
  }

  /**
   * Create a storage adapter for backward compatibility
   */
  createStorageAdapter() {
    return {
      getItem: (key) => {
        // Check if this is a migrated key
        const migratedKey = this.getMigratedKey(key);
        if (migratedKey) {
          return cachingService.get(migratedKey);
        }
        
        // Fall back to localStorage
        return localStorage.getItem(key);
      },
      
      setItem: (key, value) => {
        // Check if this should use caching service
        const migratedKey = this.getMigratedKey(key);
        if (migratedKey) {
          const ttl = this.getTTLForKey(migratedKey);
          cachingService.set(migratedKey, value, ttl);
          return;
        }
        
        // Fall back to localStorage
        localStorage.setItem(key, value);
      },
      
      removeItem: (key) => {
        const migratedKey = this.getMigratedKey(key);
        if (migratedKey) {
          cachingService.delete(migratedKey);
          return;
        }
        
        localStorage.removeItem(key);
      },
      
      clear: () => {
        cachingService.clear(true);
        localStorage.clear();
      }
    };
  }

  /**
   * Get the migrated key name for a legacy key
   */
  getMigratedKey(legacyKey) {
    const mappings = {
      'tableserve_auth_token': 'ui_auth_token',
      'tableserve_auth_user': 'ui_auth_user',
      'tableserve-theme': 'ui_theme_mode',
      'tableserve_cart': 'cart_items'
    };
    
    return mappings[legacyKey];
  }

  /**
   * Get migration status and statistics
   */
  getMigrationStatus() {
    const currentVersion = localStorage.getItem(this.migrationKey);
    const cacheStats = cachingService.getStats();
    
    return {
      migrationVersion: this.migrationVersion,
      currentVersion,
      isMigrated: currentVersion === this.migrationVersion,
      cacheStats,
      legacyKeysFound: this.legacyKeys.filter(key => localStorage.getItem(key) !== null)
    };
  }
}

// Create singleton instance
const storageMigrationService = new StorageMigrationService();

export default storageMigrationService;