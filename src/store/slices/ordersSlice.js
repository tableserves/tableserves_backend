/**
 * Unified Orders Slice for TableServe Application
 * 
 * Consolidates the following slices:
 * - orderSlice (single order management)
 * - ordersSlice (multiple orders management)
 * 
 * Updated to use RTK Query for data operations while maintaining real-time functionality
 */

import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import logger from '../../services/LoggingService';

// Note: Data operations are now handled by RTK Query hooks from ordersApi
// This slice focuses on UI state management and real-time event handling

// ===== LEGACY THUNKS (DEPRECATED) =====
// These thunks have been replaced by RTK Query hooks:
// - fetchOrders -> useGetOrdersQuery
// - createOrder -> useCreateOrderMutation
// - updateOrderStatus -> useUpdateOrderStatusMutation
// - fetchLiveOrders -> useGetLiveOrdersQuery
// - fetchOrderDetails -> useGetOrderQuery
// - cancelOrder -> useCancelOrderMutation
//
// Components should now use RTK Query hooks directly instead of dispatching these thunks

// ===== SLICE DEFINITION =====

const initialState = {
  // All orders
  orders: [],
  ordersLoading: false,
  ordersError: null,
  
  // Live orders (for real-time monitoring)
  liveOrders: [],
  liveOrdersLoading: false,
  liveOrdersError: null,
  
  // Current/Selected order
  currentOrder: null,
  currentOrderLoading: false,
  currentOrderError: null,
  
  // Filters and pagination
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
  
  // Context
  currentRole: null,
  currentEntityId: null,
  
  // Real-time updates
  lastUpdateTime: null,
  autoRefresh: false,
};

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    // Set current context
    setCurrentContext: (state, action) => {
      const { role, entityId } = action.payload;
      state.currentRole = role;
      state.currentEntityId = entityId;
    },
    
    // Set filters
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Set pagination
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // Clear current order
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
      state.currentOrderError = null;
    },
    
    // Update order status locally (for optimistic updates)
    updateOrderStatusLocal: (state, action) => {
      const { orderId, status, estimatedTime } = action.payload;
      
      // Update in orders array
      const orderIndex = state.orders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        state.orders[orderIndex].status = status;
        if (estimatedTime !== undefined) {
          state.orders[orderIndex].estimatedTime = estimatedTime;
        }
        state.orders[orderIndex].updatedAt = new Date().toISOString();
      }
      
      // Update in live orders array
      const liveOrderIndex = state.liveOrders.findIndex(order => order.id === orderId);
      if (liveOrderIndex !== -1) {
        state.liveOrders[liveOrderIndex].status = status;
        if (estimatedTime !== undefined) {
          state.liveOrders[liveOrderIndex].estimatedTime = estimatedTime;
        }
        state.liveOrders[liveOrderIndex].updatedAt = new Date().toISOString();
      }
      
      // Update current order if it matches
      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder.status = status;
        if (estimatedTime !== undefined) {
          state.currentOrder.estimatedTime = estimatedTime;
        }
        state.currentOrder.updatedAt = new Date().toISOString();
      }
    },
    
    // Add new order (for real-time updates)
    addNewOrder: (state, action) => {
      const newOrder = action.payload;
      
      // Add to beginning of orders array
      state.orders.unshift(newOrder);
      
      // Add to live orders if it's a new/active order
      if (['new', 'confirmed', 'preparing'].includes(newOrder.status)) {
        state.liveOrders.unshift(newOrder);
      }
      
      state.lastUpdateTime = new Date().toISOString();
    },
    
    // Remove order from live orders (when completed/cancelled)
    removeFromLiveOrders: (state, action) => {
      const orderId = action.payload;
      state.liveOrders = state.liveOrders.filter(order => order.id !== orderId);
    },
    
    // Toggle auto refresh
    toggleAutoRefresh: (state) => {
      state.autoRefresh = !state.autoRefresh;
    },
    
    // Clear all orders data
    clearOrdersData: (state) => {
      state.orders = [];
      state.liveOrders = [];
      state.currentOrder = null;
      state.filters = initialState.filters;
      state.pagination = initialState.pagination;
      state.lastUpdateTime = null;
    },
    
    // Restore order state (for persistence)
    restoreOrderState: (state, action) => {
      const { currentOrder, currentRole, currentEntityId, filters, lastUpdateTime } = action.payload;
      
      if (currentOrder) {
        state.currentOrder = currentOrder;
      }
      
      if (currentRole) {
        state.currentRole = currentRole;
      }
      
      if (currentEntityId) {
        state.currentEntityId = currentEntityId;
      }
      
      if (filters) {
        state.filters = { ...state.filters, ...filters };
      }
      
      if (lastUpdateTime) {
        state.lastUpdateTime = lastUpdateTime;
      }
    },
    
    // Real-time event handlers
    orderCreated: (state, action) => {
      const newOrder = action.payload;
      
      // Add to beginning of orders array
      state.orders.unshift(newOrder);
      
      // Add to live orders if it's a new/active order
      if (['pending', 'confirmed', 'preparing'].includes(newOrder.status)) {
        state.liveOrders.unshift(newOrder);
      }
      
      state.lastUpdateTime = new Date().toISOString();
    },
    
    orderUpdated: (state, action) => {
      const updatedOrder = action.payload;
      const orderId = updatedOrder.orderId || updatedOrder.id;
      
      // Update in orders array
      const orderIndex = state.orders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        state.orders[orderIndex] = { ...state.orders[orderIndex], ...updatedOrder };
      }
      
      // Update in live orders array
      const liveOrderIndex = state.liveOrders.findIndex(order => order.id === orderId);
      if (liveOrderIndex !== -1) {
        state.liveOrders[liveOrderIndex] = { ...state.liveOrders[liveOrderIndex], ...updatedOrder };
        
        // Remove from live orders if completed or cancelled
        if (['completed', 'cancelled'].includes(updatedOrder.status)) {
          state.liveOrders.splice(liveOrderIndex, 1);
        }
      }
      
      // Update current order if it matches
      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder = { ...state.currentOrder, ...updatedOrder };
      }
      
      state.lastUpdateTime = new Date().toISOString();
    },
    
    statusChanged: (state, action) => {
      // Safely handle action payload that might be undefined
      if (!action.payload) {
        console.warn('statusChanged called with undefined payload');
        return;
      }
      
      // Handle different data structures from backend
      const { orderId, oldStatus, newStatus, estimatedTime, timestamp, orderNumber, _id } = action.payload;
      
      // Use the most reliable ID available
      const actualOrderId = orderId || _id || action.payload.id;
      
      // Validate required fields
      if (!actualOrderId || !newStatus) {
        console.warn('statusChanged called with invalid payload:', action.payload);
        return;
      }
      
      console.log('🔄 Redux statusChanged triggered:', { actualOrderId, newStatus, oldStatus, orderNumber });
      
      // Update in orders array
      const orderIndex = state.orders.findIndex(order => 
        order.id === actualOrderId || 
        order._id === actualOrderId || 
        order.orderId === actualOrderId ||
        (orderNumber && order.orderNumber === orderNumber)
      );
      
      if (orderIndex !== -1) {
        console.log('✅ Updating order in orders array:', { 
          index: orderIndex, 
          oldStatus: state.orders[orderIndex].status, 
          newStatus 
        });
        state.orders[orderIndex].status = newStatus;
        if (estimatedTime !== undefined) {
          state.orders[orderIndex].estimatedTime = estimatedTime;
        }
        state.orders[orderIndex].updatedAt = timestamp || new Date().toISOString();
        // Ensure we're updating the correct ID field
        state.orders[orderIndex].id = state.orders[orderIndex].id || actualOrderId;
      }
      // Note: Order not in Redux state is normal - RTK Query manages its own cache
      
      // Update in live orders array
      const liveOrderIndex = state.liveOrders.findIndex(order => 
        order.id === actualOrderId || 
        order._id === actualOrderId || 
        order.orderId === actualOrderId ||
        (orderNumber && order.orderNumber === orderNumber)
      );
      
      if (liveOrderIndex !== -1) {
        console.log('✅ Updating order in live orders array:', { 
          index: liveOrderIndex, 
          oldStatus: state.liveOrders[liveOrderIndex].status, 
          newStatus 
        });
        state.liveOrders[liveOrderIndex].status = newStatus;
        if (estimatedTime !== undefined) {
          state.liveOrders[liveOrderIndex].estimatedTime = estimatedTime;
        }
        state.liveOrders[liveOrderIndex].updatedAt = timestamp || new Date().toISOString();
        // Ensure we're updating the correct ID field
        state.liveOrders[liveOrderIndex].id = state.liveOrders[liveOrderIndex].id || actualOrderId;
        
        // Remove from live orders if completed or cancelled
        if (['completed', 'cancelled'].includes(newStatus)) {
          console.log('🗑️ Removing order from live orders (completed/cancelled)');
          state.liveOrders.splice(liveOrderIndex, 1);
        }
      }
      // Note: Order not in Redux state is normal - RTK Query manages its own cache
      
      // Update current order if it matches
      if (state.currentOrder && (
        state.currentOrder.id === actualOrderId || 
        state.currentOrder._id === actualOrderId ||
        (orderNumber && state.currentOrder.orderNumber === orderNumber)
      )) {
        console.log('✅ Updating current order:', { 
          oldStatus: state.currentOrder.status, 
          newStatus 
        });
        state.currentOrder.status = newStatus;
        if (estimatedTime !== undefined) {
          state.currentOrder.estimatedTime = estimatedTime;
        }
        state.currentOrder.updatedAt = timestamp || new Date().toISOString();
        // Ensure we're updating the correct ID field
        state.currentOrder.id = state.currentOrder.id || actualOrderId;
      }
      
      state.lastUpdateTime = new Date().toISOString();
      console.log('✅ Status update completed for order:', actualOrderId);
    },
  },
// Note: The extraReducers for the old thunks have been removed.
// Data fetching is now handled by RTK Query hooks in components.
// This slice focuses on UI state management and real-time event handling.
});

// ===== ACTIONS =====
export const {
  setCurrentContext,
  setFilters,
  setPagination,
  clearCurrentOrder,
  updateOrderStatusLocal,
  addNewOrder,
  removeFromLiveOrders,
  toggleAutoRefresh,
  clearOrdersData,
  restoreOrderState,
  orderCreated,
  orderUpdated,
  statusChanged,
} = ordersSlice.actions;

// ===== SELECTORS =====

// Basic selectors
export const selectAllOrders = (state) => state.orders.orders;
export const selectLiveOrders = (state) => state.orders.liveOrders;
export const selectCurrentOrder = (state) => state.orders.currentOrder;
export const selectOrdersLoading = (state) => state.orders.ordersLoading;
export const selectOrdersError = (state) => state.orders.ordersError;
export const selectFilters = (state) => state.orders.filters;
export const selectPagination = (state) => state.orders.pagination;

// Memoized derived selectors
export const selectOrdersByStatus = createSelector(
  [selectAllOrders, (state, status) => status],
  (orders, status) => orders.filter(order => order.status === status)
);

export const selectLiveOrdersByStatus = createSelector(
  [selectLiveOrders, (state, status) => status],
  (liveOrders, status) => liveOrders.filter(order => order.status === status)
);

export const selectOrdersCount = createSelector(
  [selectAllOrders, selectLiveOrders],
  (orders, liveOrders) => ({
    total: orders.length,
    new: liveOrders.filter(o => o.status === 'new').length,
    preparing: liveOrders.filter(o => o.status === 'preparing').length,
    ready: liveOrders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  })
);

export const selectFilteredOrders = createSelector(
  [selectAllOrders, selectFilters],
  (orders, filters) => {
    let filtered = [...orders];
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    
    // Apply search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(term) ||
        order.customerName?.toLowerCase().includes(term) ||
        order.items?.some(item => item.name.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }
);

export const selectRecentOrders = createSelector(
  [selectAllOrders, (state, limit) => limit || 10],
  (orders, limit) => {
    return orders
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
);

export default ordersSlice.reducer;

// ===== MIGRATION GUIDE =====
// This slice has been migrated from localStorage-based operations to RTK Query.
// 
// OLD PATTERN (Deprecated):
// ```
// import { fetchOrders, createOrder } from '../slices/ordersSlice';
// const dispatch = useDispatch();
// dispatch(fetchOrders({ role: 'restaurant_owner', entityId: restaurantId }));
// ```
//
// NEW PATTERN (Recommended):
// ```
// import { useGetOrdersQuery, useCreateOrderMutation } from '../api/ordersApi';
// const { data: orders, isLoading } = useGetOrdersQuery({ role: 'restaurant_owner', entityId: restaurantId });
// const [createOrder] = useCreateOrderMutation();
// ```
//
// Real-time events are still handled by this slice:
// - orderCreated, orderUpdated, statusChanged (from WebSocket)
// - UI state management (filters, pagination, current order)
// - Optimistic updates (updateOrderStatusLocal)