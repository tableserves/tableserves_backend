import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import StorageCleanup from '../utils/storageCleanup';

// Consolidated slices
import menuReducer from './slices/menuSlice';
import ordersReducer from './slices/ordersSlice';
import entitiesReducer from './slices/entitiesSlice';
import uiReducer from './slices/uiSlice';

// Remaining individual slices
import subscriptionReducer from './slices/subscriptionSlice';
import cartReducer from './slices/cartSlice';

// RTK Query API
import { api } from './api';

// Import custom middleware
import menuItemsMiddleware from './middleware/menuItemsMiddleware';
import persistenceMiddleware from './middleware/persistenceMiddleware';

// Custom storage with quota error handling
const customStorage = {
  ...storage,
  setItem: async (key, value) => {
    try {
      await storage.setItem(key, value);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, attempting cleanup...');
        
        // Perform emergency cleanup
        const cleanupResult = StorageCleanup.emergencyCleanup();
        
        if (cleanupResult.success) {
          console.log(`✅ Cleanup successful, freed ${cleanupResult.freedMB}MB`);
          
          // Try to store again after cleanup
          try {
            await storage.setItem(key, value);
            console.log('✅ Successfully stored data after cleanup');
          } catch (retryError) {
            console.error('❌ Still unable to store after cleanup:', retryError);
            // Fallback: store only essential data
            if (key === 'persist:root') {
              try {
                const data = JSON.parse(value);
                const essentialData = {
                  ui: data.ui, // Keep auth and theme
                  cart: data.cart, // Keep current cart
                  _persist: data._persist
                };
                await storage.setItem(key, JSON.stringify(essentialData));
                console.log('✅ Stored essential data only');
              } catch (essentialError) {
                console.error('❌ Failed to store essential data:', essentialError);
              }
            }
          }
        } else {
          console.error('❌ Emergency cleanup failed:', cleanupResult.error);
        }
      } else {
        console.error('Storage error:', error);
        throw error;
      }
    }
  }
};

const persistConfig = {
  key: 'root',
  version: 1,
  storage: customStorage,
  whitelist: ['ui', 'cart', 'orders'], // Include orders for persistence
  // Partial persistence for orders to avoid large data
  transforms: [
    {
      in: (inboundState, key) => {
        if (key === 'orders') {
          // Only persist essential order data
          return {
            currentOrder: inboundState.currentOrder,
            currentRole: inboundState.currentRole,
            currentEntityId: inboundState.currentEntityId,
            filters: inboundState.filters,
            lastUpdateTime: inboundState.lastUpdateTime
          };
        }
        return inboundState;
      },
      out: (outboundState, key) => {
        if (key === 'orders') {
          // Restore with default values for non-persisted data
          return {
            ...outboundState,
            orders: outboundState.orders || [],
            liveOrders: outboundState.liveOrders || [],
            ordersLoading: outboundState.ordersLoading || false,
            ordersError: outboundState.ordersError || null,
            liveOrdersLoading: outboundState.liveOrdersLoading || false,
            liveOrdersError: outboundState.liveOrdersError || null,
            currentOrderLoading: outboundState.currentOrderLoading || false,
            currentOrderError: outboundState.currentOrderError || null,
            pagination: outboundState.pagination || {
              page: 1,
              limit: 20,
              total: 0,
            },
            autoRefresh: outboundState.autoRefresh || false,
          };
        }
        return outboundState;
      }
    }
  ]
};

const rootReducer = combineReducers({
  // Consolidated slices (reduced from 18 to 6 slices + RTK Query)
  menu: menuReducer,           // Replaces: menuCategories, menuItems, menuModifiers, zoneMenuCategories, zoneMenuModifiers
  orders: ordersReducer,       // Replaces: orders, order
  entities: entitiesReducer,   // Replaces: restaurant, zone, vendors
  ui: uiReducer,              // Replaces: auth, theme, dashboard
  
  // Individual slices
  subscription: subscriptionReducer,
  cart: cartReducer,
  
  // RTK Query API
  [api.reducerPath]: api.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
    .concat(menuItemsMiddleware)
    .concat(persistenceMiddleware) // Add our custom persistence middleware
    .concat(api.middleware), // Add RTK Query middleware
});

export const persistor = persistStore(store);