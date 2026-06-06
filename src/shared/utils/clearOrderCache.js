/**
 * Utility to clear all order-related cached data
 * Run this to fix 404 errors and data inconsistencies
 */

export const clearOrderCache = () => {
  console.log('🧹 Clearing order cache and localStorage data...');
  
  const keysToRemove = [];
  
  // Scan for order-related keys in localStorage
  for (let key in localStorage) {
    if (key.includes('order') || 
        key.includes('vendor_') || 
        key.includes('zone_') || 
        key.includes('shop_') || 
        key.includes('live_') ||
        key.includes('rtk') ||
        key.includes('cache')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove identified keys
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
    }
  });
  
  // Clear session storage as well
  try {
    sessionStorage.clear();
    console.log('🗑️ Cleared sessionStorage');
  } catch (error) {
    console.warn('Failed to clear sessionStorage:', error);
  }
  
  console.log(`✅ Cleared ${keysToRemove.length} cache entries`);
  console.log('🔄 Please refresh the page to load fresh data');
  
  return keysToRemove.length;
};

// Auto-run when imported in development
if (import.meta.env.DEV) {
  console.log('🔧 Development mode: Order cache utility loaded');
  console.log('💡 Run clearOrderCache() in console to clear all cached data');
  
  // Make it available globally in development
  if (typeof window !== 'undefined') {
    window.clearOrderCache = clearOrderCache;
  }
}

export default clearOrderCache;