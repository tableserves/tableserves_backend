/**
 * RTK Query API Export Index
 * 
 * Centralized export for all API slices and hooks
 */

// Base API
export { default as api } from './baseApi';
import { api as baseApi } from './baseApi';

// Individual API slices
export * from './authApi';
export * from './entitiesApi';
export * from './ordersApi';
export * from './menuApi';

// Type definitions for better TypeScript support (if needed in the future)
// When transitioning to TypeScript, add type exports here

// Utility functions for API management
export const apiUtils = {
  // Reset all API state
  resetApiState: () => baseApi.util.resetApiState(),
  
  // Invalidate all tags
  invalidateAllTags: () => baseApi.util.invalidateTags([
    'Auth',
    'Restaurant', 
    'Zone',
    'Vendor',
    'MenuCategory',
    'MenuItem', 
    'Order',
    'Analytics',
    'User'
  ]),
  
  // Prefetch common data
  prefetchCommonData: (dispatch, { restaurantId, zoneId, vendorId, role }) => {
    // Prefetch based on user role and context
    if (role === 'restaurant_owner' && restaurantId) {
      dispatch(baseApi.endpoints.getRestaurant.initiate(restaurantId));
      dispatch(baseApi.endpoints.getMenuCategories.initiate({ restaurantId }));
      dispatch(baseApi.endpoints.getMenuItems.initiate({ restaurantId }));
    } else if (role === 'zone_admin' && zoneId) {
      dispatch(baseApi.endpoints.getZone.initiate(zoneId));
      dispatch(baseApi.endpoints.getVendors.initiate(zoneId));
    } else if ((role === 'zone_shop' || role === 'zone_vendor') && vendorId) {
      dispatch(baseApi.endpoints.getMenuItems.initiate({ vendorId }));
    }
  }
};