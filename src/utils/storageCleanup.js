/**
 * Storage Cleanup Utility
 * Handles localStorage quota exceeded errors by cleaning up old and unnecessary data
 */

class StorageCleanup {
  
  /**
   * Get localStorage usage information
   * @returns {object} Storage usage stats
   */
  static getStorageUsage() {
    let totalSize = 0;
    const itemSizes = {};
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = (localStorage[key].length + key.length) * 2; // UTF-16 encoding
        itemSizes[key] = size;
        totalSize += size;
      }
    }
    
    return {
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      itemCount: Object.keys(itemSizes).length,
      itemSizes: itemSizes,
      largestItems: Object.entries(itemSizes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([key, size]) => ({
          key,
          size,
          sizeMB: (size / (1024 * 1024)).toFixed(2)
        }))
    };
  }
  
  /**
   * Clean up old order data to free space
   * Keeps only recent orders (last 30 days)
   */
  static cleanupOldOrders() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let cleanedCount = 0;
    let freedSpace = 0;
    
    // Clean restaurant orders
    for (let key in localStorage) {
      if (key.startsWith('restaurant_orders_') || 
          key.startsWith('live_orders_') ||
          key.startsWith('zone_orders_') ||
          key.startsWith('vendor_orders_') ||
          key.startsWith('zone_live_orders_') ||
          key.startsWith('vendor_live_orders_')) {
        
        try {
          const originalSize = localStorage[key].length;
          const orders = JSON.parse(localStorage[key] || '[]');
          
          // Filter orders to keep only recent ones
          const recentOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt || order.timestamp);
            return orderDate >= thirtyDaysAgo;
          });
          
          if (recentOrders.length !== orders.length) {
            localStorage.setItem(key, JSON.stringify(recentOrders));
            const newSize = localStorage[key].length;
            const freed = originalSize - newSize;
            freedSpace += freed;
            cleanedCount++;
            
            console.log(`Cleaned ${key}: ${orders.length} → ${recentOrders.length} orders, freed ${(freed/1024).toFixed(1)}KB`);
          }
        } catch (error) {
          console.error(`Error cleaning ${key}:`, error);
        }
      }
    }
    
    return { cleanedCount, freedSpace: (freedSpace / 1024).toFixed(1) + 'KB' };
  }
  
  /**
   * Clean up large analytics data
   * Keep only essential analytics data
   */
  static cleanupAnalyticsData() {
    let cleanedCount = 0;
    let freedSpace = 0;
    
    // Clean analytics data
    for (let key in localStorage) {
      if (key.includes('_analytics_') || key.includes('_stats_')) {
        try {
          const originalSize = localStorage[key].length;
          const analytics = JSON.parse(localStorage[key] || '{}');
          
          // Keep only last 7 days of analytics
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const recentAnalytics = {};
          for (let date in analytics) {
            const analyticsDate = new Date(date);
            if (analyticsDate >= sevenDaysAgo) {
              recentAnalytics[date] = analytics[date];
            }
          }
          
          if (Object.keys(recentAnalytics).length !== Object.keys(analytics).length) {
            localStorage.setItem(key, JSON.stringify(recentAnalytics));
            const newSize = localStorage[key].length;
            const freed = originalSize - newSize;
            freedSpace += freed;
            cleanedCount++;
            
            console.log(`Cleaned ${key}: ${Object.keys(analytics).length} → ${Object.keys(recentAnalytics).length} days, freed ${(freed/1024).toFixed(1)}KB`);
          }
        } catch (error) {
          console.error(`Error cleaning analytics ${key}:`, error);
        }
      }
    }
    
    return { cleanedCount, freedSpace: (freedSpace / 1024).toFixed(1) + 'KB' };
  }
  
  /**
   * Remove duplicate or corrupted data
   */
  static cleanupDuplicateData() {
    let cleanedCount = 0;
    let freedSpace = 0;
    
    const keysToCheck = [];
    for (let key in localStorage) {
      keysToCheck.push(key);
    }
    
    keysToCheck.forEach(key => {
      try {
        const value = localStorage[key];
        
        // Check for very large items (over 1MB)
        if (value.length > 1024 * 1024) {
          console.warn(`Large localStorage item detected: ${key} (${(value.length / (1024*1024)).toFixed(2)}MB)`);
          
          // Try to parse and clean if it's JSON
          try {
            const data = JSON.parse(value);
            if (Array.isArray(data)) {
              // Keep only last 100 items for arrays
              const truncated = data.slice(-100);
              const newValue = JSON.stringify(truncated);
              
              if (newValue.length < value.length) {
                localStorage.setItem(key, newValue);
                const freed = value.length - newValue.length;
                freedSpace += freed;
                cleanedCount++;
                
                console.log(`Truncated ${key}: ${data.length} → ${truncated.length} items, freed ${(freed/1024).toFixed(1)}KB`);
              }
            }
          } catch (parseError) {
            // If it's not JSON or too corrupted, consider removing
            console.warn(`Corrupted data in ${key}, consider manual cleanup`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${key}:`, error);
      }
    });
    
    return { cleanedCount, freedSpace: (freedSpace / 1024).toFixed(1) + 'KB' };
  }
  
  /**
   * Comprehensive cleanup - run all cleanup methods
   */
  static performFullCleanup() {
    console.log('🧹 Starting localStorage cleanup...');
    
    const beforeUsage = this.getStorageUsage();
    console.log(`📊 Before cleanup: ${beforeUsage.totalSizeMB}MB used (${beforeUsage.itemCount} items)`);
    
    // Run all cleanup methods
    const ordersResult = this.cleanupOldOrders();
    const analyticsResult = this.cleanupAnalyticsData();
    const duplicatesResult = this.cleanupDuplicateData();
    
    const afterUsage = this.getStorageUsage();
    console.log(`📊 After cleanup: ${afterUsage.totalSizeMB}MB used (${afterUsage.itemCount} items)`);
    
    const totalFreed = (beforeUsage.totalSize - afterUsage.totalSize) / 1024;
    
    return {
      before: beforeUsage,
      after: afterUsage,
      totalFreedKB: totalFreed.toFixed(1),
      operations: {
        orders: ordersResult,
        analytics: analyticsResult,
        duplicates: duplicatesResult
      }
    };
  }
  
  /**
   * Emergency cleanup when quota is exceeded
   */
  static emergencyCleanup() {
    console.log('🚨 Emergency storage cleanup triggered!');
    
    try {
      // Remove the largest non-essential items first
      const usage = this.getStorageUsage();
      
      // Remove large analytics and order history
      const largeKeys = usage.largestItems
        .filter(item => 
          item.key.includes('_orders_') || 
          item.key.includes('_analytics_') ||
          item.key.includes('_stats_') ||
          (item.key.startsWith('persist:') && item.sizeMB > 1)
        )
        .slice(0, 5); // Remove top 5 largest items
      
      let totalFreed = 0;
      largeKeys.forEach(item => {
        try {
          totalFreed += item.size;
          localStorage.removeItem(item.key);
          console.log(`🗑️ Removed ${item.key} (${item.sizeMB}MB)`);
        } catch (error) {
          console.error(`Error removing ${item.key}:`, error);
        }
      });
      
      // Run normal cleanup
      this.performFullCleanup();
      
      return {
        success: true,
        freedMB: (totalFreed / (1024 * 1024)).toFixed(2),
        removedItems: largeKeys.length
      };
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default StorageCleanup;