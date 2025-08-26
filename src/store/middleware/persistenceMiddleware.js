/**
 * Redux Persistence Middleware for TableServe
 * 
 * Automatically saves and restores Redux state to/from localStorage
 * to prevent data loss on page refresh.
 */

import logger from '../../services/LoggingService';

// Keys for localStorage
const REDUX_PERSIST_KEY = 'tableserve_redux_state';
const REDUX_PERSIST_TIMESTAMP_KEY = 'tableserve_redux_timestamp';

// State expiry time (30 minutes)
const STATE_EXPIRY_TIME = 30 * 60 * 1000;

/**
 * Save Redux state to localStorage
 */
export const saveStateToStorage = (state) => {
  try {
    const stateToSave = {
      orders: {
        currentOrder: state.orders?.currentOrder,
        orders: state.orders?.orders || [],
        liveOrders: state.orders?.liveOrders || [],
        currentRole: state.orders?.currentRole,
        currentEntityId: state.orders?.currentEntityId,
        filters: state.orders?.filters,
        lastUpdateTime: state.orders?.lastUpdateTime
      },
      // Add other slices as needed
      user: state.user ? {
        isAuthenticated: state.user.isAuthenticated,
        userInfo: state.user.userInfo,
        currentRole: state.user.currentRole
      } : null
    };

    const timestamp = Date.now();
    
    localStorage.setItem(REDUX_PERSIST_KEY, JSON.stringify(stateToSave));
    localStorage.setItem(REDUX_PERSIST_TIMESTAMP_KEY, timestamp.toString());
    
    logger.info('Redux state saved to localStorage', { 
      timestamp,
      hasCurrentOrder: !!stateToSave.orders.currentOrder,
      ordersCount: stateToSave.orders.orders.length 
    }, 'persistenceMiddleware');
  } catch (error) {
    logger.error('Failed to save Redux state to localStorage', error, 'persistenceMiddleware');
  }
};

/**
 * Load Redux state from localStorage
 */
export const loadStateFromStorage = () => {
  try {
    const serializedState = localStorage.getItem(REDUX_PERSIST_KEY);
    const timestamp = localStorage.getItem(REDUX_PERSIST_TIMESTAMP_KEY);
    
    if (!serializedState || !timestamp) {
      return undefined;
    }

    // Check if state has expired
    const savedTime = parseInt(timestamp);
    const currentTime = Date.now();
    
    if (currentTime - savedTime > STATE_EXPIRY_TIME) {
      logger.info('Saved Redux state has expired, clearing...', { 
        savedTime, 
        currentTime, 
        age: currentTime - savedTime 
      }, 'persistenceMiddleware');
      
      localStorage.removeItem(REDUX_PERSIST_KEY);
      localStorage.removeItem(REDUX_PERSIST_TIMESTAMP_KEY);
      return undefined;
    }

    const state = JSON.parse(serializedState);
    
    logger.info('Redux state loaded from localStorage', { 
      timestamp: savedTime,
      hasCurrentOrder: !!state.orders?.currentOrder,
      ordersCount: state.orders?.orders?.length || 0 
    }, 'persistenceMiddleware');
    
    return state;
  } catch (error) {
    logger.error('Failed to load Redux state from localStorage', error, 'persistenceMiddleware');
    
    // Clear corrupted data
    localStorage.removeItem(REDUX_PERSIST_KEY);
    localStorage.removeItem(REDUX_PERSIST_TIMESTAMP_KEY);
    
    return undefined;
  }
};

/**
 * Clear persisted state
 */
export const clearPersistedState = () => {
  try {
    localStorage.removeItem(REDUX_PERSIST_KEY);
    localStorage.removeItem(REDUX_PERSIST_TIMESTAMP_KEY);
    
    logger.info('Persisted Redux state cleared', {}, 'persistenceMiddleware');
  } catch (error) {
    logger.error('Failed to clear persisted state', error, 'persistenceMiddleware');
  }
};

/**
 * Redux middleware for automatic state persistence
 */
export const persistenceMiddleware = (store) => (next) => (action) => {
  // Execute the action first
  const result = next(action);
  
  // Actions that should trigger state saving
  const persistActions = [
    'orders/createOrder/fulfilled',
    'orders/fetchOrderDetails/fulfilled',
    'orders/updateOrderStatus/fulfilled',
    'orders/addNewOrder',
    'orders/updateOrderStatusLocal',
    'user/loginSuccess',
    'user/logout'
  ];
  
  // Save state after specific actions
  if (persistActions.some(actionType => action.type.includes(actionType))) {
    // Use setTimeout to ensure state is updated after action
    setTimeout(() => {
      saveStateToStorage(store.getState());
    }, 0);
  }
  
  return result;
};

/**
 * Enhanced state loader that also attempts to recover current order
 */
export const loadStateWithOrderRecovery = (params = {}) => {
  const persistedState = loadStateFromStorage();
  
  // If no persisted state, try to recover current order from localStorage
  if (!persistedState?.orders?.currentOrder) {
    const { restaurantId, zoneId, tableId, userId } = params;
    
    if (restaurantId || zoneId) {
      const entityId = restaurantId || zoneId;
      const recentOrderKey = `recent_order_${entityId}_${tableId}_${userId}`;
      const recentOrderId = localStorage.getItem(recentOrderKey);
      
      if (recentOrderId) {
        logger.info('Attempting to recover current order from recent order ID', { 
          recentOrderId, 
          entityId, 
          tableId, 
          userId 
        }, 'persistenceMiddleware');
        
        // Return partial state that will trigger order fetch
        return {
          orders: {
            currentOrder: null,
            currentOrderLoading: false,
            currentOrderError: null,
            orders: [],
            liveOrders: [],
            currentRole: null,
            currentEntityId: entityId,
            shouldFetchOrder: recentOrderId, // Special flag to trigger fetch
            filters: {
              status: 'all',
              dateRange: null,
              searchTerm: '',
            },
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
            },
            lastUpdateTime: null,
            autoRefresh: false,
          }
        };
      }
    }
  }
  
  return persistedState;
};

export default persistenceMiddleware;