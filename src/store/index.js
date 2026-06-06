import { configureStore, combineReducers } from '@reduxjs/toolkit';

// Consolidated slices
import menuReducer from './slices/menuSlice';
import ordersReducer from './slices/ordersSlice';
import entitiesReducer from './slices/entitiesSlice';
import uiReducer from './slices/uiSlice';
import realtimeReducer from './slices/realtimeSlice';

// Remaining individual slices
import subscriptionReducer from './slices/subscriptionSlice';
import cartReducer from './slices/cartSlice';

// RTK Query API
import { api } from './api';

// Import custom middleware
import menuItemsMiddleware from './middleware/menuItemsMiddleware';

// No persistence configuration - using server-side sessions only

const rootReducer = combineReducers({
  // Consolidated slices (reduced from 18 to 6 slices + RTK Query)
  menu: menuReducer,           // Replaces: menuCategories, menuItems, menuModifiers, zoneMenuCategories, zoneMenuModifiers
  orders: ordersReducer,       // Replaces: orders, order
  entities: entitiesReducer,   // Replaces: restaurant, zone, vendors
  ui: uiReducer,              // Replaces: auth, theme, dashboard
  realtime: realtimeReducer,   // Real-time WebSocket state
  
  // Individual slices
  subscription: subscriptionReducer,
  cart: cartReducer,
  
  // RTK Query API
  [api.reducerPath]: api.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore RTK Query actions
          'api/executeQuery/pending',
          'api/executeQuery/fulfilled',
          'api/executeQuery/rejected',
          // Ignore menu actions that might contain Promises
          'menu/fetchMenuItems/pending',
          'menu/fetchMenuItems/fulfilled',
          'menu/fetchMenuItems/rejected',
          'menu/fetchMenuCategories/pending',
          'menu/fetchMenuCategories/fulfilled',
          'menu/fetchMenuCategories/rejected',
          'menu/hydrateMenuData/pending',
          'menu/hydrateMenuData/fulfilled',
          'menu/hydrateMenuData/rejected',
          // Ignore entities actions
          'entities/fetchRestaurantDetails/pending',
          'entities/fetchRestaurantDetails/fulfilled',
          'entities/fetchRestaurantDetails/rejected',
          'entities/fetchZoneAndShops/pending',
          'entities/fetchZoneAndShops/fulfilled',
          'entities/fetchZoneAndShops/rejected',
          // Ignore UI actions
          'ui/fetchDashboardStats/pending',
          'ui/fetchDashboardStats/fulfilled',
          'ui/fetchDashboardStats/rejected',
          // Ignore subscription actions
          'subscription/fetchCounts/pending',
          'subscription/fetchCounts/fulfilled',
          'subscription/fetchCounts/rejected',
          'subscription/fetchCurrentSubscription/pending',
          'subscription/fetchCurrentSubscription/fulfilled',
          'subscription/fetchCurrentSubscription/rejected',
          'subscription/fetchSubscriptionLimits/pending',
          'subscription/fetchSubscriptionLimits/fulfilled',
          'subscription/fetchSubscriptionLimits/rejected',
          'ui/initializeTheme',
          // Ignore subscription actions
          'subscription/fetchCurrent/pending',
          'subscription/fetchCurrent/fulfilled',
          'subscription/fetchCurrent/rejected',
          'subscription/fetchLimits/pending',
          'subscription/fetchLimits/fulfilled',
          'subscription/fetchLimits/rejected',
          'subscription/fetchCounts/pending',
          'subscription/fetchCounts/fulfilled',
          'subscription/fetchCounts/rejected',
        ],
        // Ignore RTK Query state paths and other problematic paths
        ignoredActionsPaths: [
          'meta.arg',
          'payload.timestamp',
          'payload.items',
          'payload.categories',
          'payload.modifiers',
          'payload.analytics',
          'payload.menuCategories'
        ],
        ignoredPaths: [
          'api',
          'menu.items',
          'menu.categories',
          'menu.modifiers',
          'entities.restaurants',
          'entities.zones',
          'entities.vendorsByZone',
          'ui.dashboard.stats.restaurantProfile.analytics',
          'ui.dashboard.stats.restaurantProfile.menuCategories',
          'ui.dashboard.stats.profile.analytics',
          'subscription.currentCounts',
          'subscription.limits'
        ],
      },
    })
    .concat(menuItemsMiddleware)
    .concat(api.middleware), // Add RTK Query middleware
});