/**
 * Persistence Initialization Component
 * 
 * Handles state restoration and persistence initialization when the app starts
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { loadStateWithOrderRecovery } from '../../store/middleware/persistenceMiddleware';
import { restoreOrderState } from '../../store/slices/ordersSlice';
import { initializeAuth } from '../../store/slices/uiSlice';
import logger from '../../services/LoggingService';

const PersistenceInitializer = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    // Initialize authentication state from storage
    logger.info('Initializing authentication state', {}, 'PersistenceInitializer');
    dispatch(initializeAuth());

    // Extract route parameters for order recovery
    const pathParts = location.pathname.split('/');
    const routeParams = {};

    // Parse TableServe route structure
    if (pathParts.includes('restaurant')) {
      const restaurantIndex = pathParts.indexOf('restaurant');
      routeParams.restaurantId = pathParts[restaurantIndex + 1];

      const tableIndex = pathParts.indexOf('table');
      if (tableIndex !== -1) {
        routeParams.tableId = pathParts[tableIndex + 1];
      }

      const userIndex = pathParts.indexOf('user');
      if (userIndex !== -1) {
        routeParams.userId = pathParts[userIndex + 1];
      }
    } else if (pathParts.includes('zone')) {
      const zoneIndex = pathParts.indexOf('zone');
      routeParams.zoneId = pathParts[zoneIndex + 1];

      const tableIndex = pathParts.indexOf('table');
      if (tableIndex !== -1) {
        routeParams.tableId = pathParts[tableIndex + 1];
      }

      const userIndex = pathParts.indexOf('user');
      if (userIndex !== -1) {
        routeParams.userId = pathParts[userIndex + 1];
      }
    }

    // Attempt to load persisted state with order recovery
    try {
      logger.info('Initializing persistence with route params', routeParams, 'PersistenceInitializer');

      const persistedState = loadStateWithOrderRecovery(routeParams);

      if (persistedState?.orders) {
        logger.info('Restoring order state from persistence', {
          hasCurrentOrder: !!persistedState.orders.currentOrder,
          shouldFetchOrder: persistedState.orders.shouldFetchOrder
        }, 'PersistenceInitializer');

        // Restore the order state
        dispatch(restoreOrderState(persistedState.orders));

        // Order fetching is now handled by RTK Query in individual components
        if (persistedState.orders.shouldFetchOrder) {
          logger.info('Order should be fetched by components using RTK Query', {
            orderId: persistedState.orders.shouldFetchOrder
          }, 'PersistenceInitializer');
        }
      } else {
        logger.info('No persisted order state found', {}, 'PersistenceInitializer');
      }
    } catch (error) {
      logger.error('Error initializing persistence', error, 'PersistenceInitializer');
    }
  }, [dispatch, location.pathname]);

  // This component doesn't render anything
  return null;
};

export default PersistenceInitializer;