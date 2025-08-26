/**
 * Unified Orders Slice for TableServe Application
 * 
 * Consolidates the following slices:
 * - orderSlice (single order management)
 * - ordersSlice (multiple orders management)
 * 
 * This reduces 2 slices to 1 unified order management slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import OrderProcessingService from '../../services/OrderProcessingService';
import logger from '../../services/LoggingService';

// ===== ASYNC THUNKS =====

// Fetch orders based on user role and entity
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async ({ role, entityId, filters = {} }, { rejectWithValue }) => {
    try {
      let orders;
      
      switch (role) {
        case 'admin':
          orders = OrderProcessingService.getAllOrders();
          break;
        case 'restaurant_owner':
          orders = OrderProcessingService.getOrdersForRestaurant(entityId);
          break;
        case 'zone_admin':
          orders = OrderProcessingService.getOrdersForZone(entityId);
          break;
        case 'zone_shop':
        case 'zone_vendor':
          orders = OrderProcessingService.getOrdersForShop(entityId);
          break;
        default:
          throw new Error(`Invalid role for fetching orders: ${role}`);
      }

      // Apply filters if provided
      if (filters.status) {
        orders = orders.filter(order => order.status === filters.status);
      }
      
      if (filters.dateRange) {
        const { startDate, endDate } = filters.dateRange;
        orders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startDate && orderDate <= endDate;
        });
      }

      logger.info('Orders fetched successfully', { 
        role, 
        entityId, 
        count: orders.length, 
        filters 
      }, 'ordersSlice');

      return { orders, role, entityId, filters };
    } catch (error) {
      logger.error('Failed to fetch orders', error, 'ordersSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Create a new order
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      // Process order through OrderProcessingService
      let result;
      
      if (orderData.restaurantId) {
        // Restaurant order
        result = OrderProcessingService.processRestaurantOrder(orderData);
      } else if (orderData.zoneId) {
        // Zone order (multiple vendors)
        result = OrderProcessingService.processZoneOrder(orderData);
      } else {
        throw new Error('Order must have either restaurantId or zoneId');
      }

      if (result.success) {
        logger.info('Order created successfully', { 
          orderId: result.orderId,
          type: orderData.restaurantId ? 'restaurant' : 'zone'
        }, 'ordersSlice');
        
        return result;
      } else {
        throw new Error(result.message || 'Failed to create order');
      }
    } catch (error) {
      logger.error('Failed to create order', error, 'ordersSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Update order status
export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, newStatus, user, estimatedTime }, { rejectWithValue }) => {
    try {
      const updatedOrder = OrderProcessingService.updateOrderStatus(
        orderId,
        newStatus,
        user.name,
        user.role,
        user.role === 'restaurant_owner' ? user.restaurantId : user.zoneId,
        estimatedTime
      );

      if (updatedOrder) {
        logger.info('Order status updated successfully', { 
          orderId, 
          newStatus, 
          updatedBy: user.name 
        }, 'ordersSlice');
        
        return updatedOrder;
      } else {
        throw new Error('Order not found or update failed');
      }
    } catch (error) {
      logger.error('Failed to update order status', error, 'ordersSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Fetch live orders (for real-time dashboards)
export const fetchLiveOrders = createAsyncThunk(
  'orders/fetchLiveOrders',
  async ({ role, entityId }, { rejectWithValue }) => {
    try {
      let liveOrders;
      
      switch (role) {
        case 'restaurant_owner':
          liveOrders = OrderProcessingService.getLiveOrdersForRestaurant(entityId);
          break;
        case 'zone_admin':
          liveOrders = OrderProcessingService.getLiveOrdersForZone(entityId);
          break;
        case 'zone_shop':
        case 'zone_vendor':
          liveOrders = OrderProcessingService.getLiveOrdersForShop(entityId);
          break;
        default:
          throw new Error(`Invalid role for fetching live orders: ${role}`);
      }

      return { liveOrders, role, entityId };
    } catch (error) {
      logger.error('Failed to fetch live orders', error, 'ordersSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Get order details by ID
export const fetchOrderDetails = createAsyncThunk(
  'orders/fetchOrderDetails',
  async ({ orderId }, { rejectWithValue }) => {
    try {
      const orderDetails = OrderProcessingService.getOrderById(orderId);
      
      if (!orderDetails) {
        throw new Error('Order not found');
      }

      return orderDetails;
    } catch (error) {
      logger.error('Failed to fetch order details', error, 'ordersSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Cancel an order
export const cancelOrder = createAsyncThunk(
  'orders/cancelOrder',
  async ({ orderId, reason, user }, { rejectWithValue }) => {
    try {
      const cancelledOrder = OrderProcessingService.cancelOrder(orderId, reason, user.name);
      
      if (cancelledOrder) {
        logger.info('Order cancelled successfully', { orderId, reason, cancelledBy: user.name }, 'ordersSlice');
        return cancelledOrder;
      } else {
        throw new Error('Failed to cancel order');
      }
    } catch (error) {
      logger.error('Failed to cancel order', error, 'ordersSlice');
      return rejectWithValue(error.message);
    }
  }
);

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
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.ordersLoading = true;
        state.ordersError = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.ordersLoading = false;
        state.orders = action.payload.orders;
        state.currentRole = action.payload.role;
        state.currentEntityId = action.payload.entityId;
        state.filters = { ...state.filters, ...action.payload.filters };
        state.pagination.total = action.payload.orders.length;
        state.lastUpdateTime = new Date().toISOString();
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.ordersLoading = false;
        state.ordersError = action.payload;
      })
      
      // Fetch Live Orders
      .addCase(fetchLiveOrders.pending, (state) => {
        state.liveOrdersLoading = true;
        state.liveOrdersError = null;
      })
      .addCase(fetchLiveOrders.fulfilled, (state, action) => {
        state.liveOrdersLoading = false;
        state.liveOrders = action.payload.liveOrders;
        state.lastUpdateTime = new Date().toISOString();
      })
      .addCase(fetchLiveOrders.rejected, (state, action) => {
        state.liveOrdersLoading = false;
        state.liveOrdersError = action.payload;
      })
      
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.currentOrderLoading = true;
        state.currentOrderError = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.currentOrderLoading = false;
        
        // For restaurant orders, set as current order
        if (action.payload.order) {
          state.currentOrder = action.payload.order;
          state.orders.unshift(action.payload.order);
          state.liveOrders.unshift(action.payload.order);
        }
        
        // For zone orders, add all vendor orders
        if (action.payload.vendorOrders) {
          action.payload.vendorOrders.forEach(vendorOrder => {
            state.orders.unshift(vendorOrder);
            state.liveOrders.unshift(vendorOrder);
          });
          state.currentOrder = action.payload.zoneOrder;
        }
        
        state.lastUpdateTime = new Date().toISOString();
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.currentOrderLoading = false;
        state.currentOrderError = action.payload;
      })
      
      // Update Order Status
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const updatedOrder = action.payload;
        
        // Update in orders array
        const orderIndex = state.orders.findIndex(order => order.id === updatedOrder.id);
        if (orderIndex !== -1) {
          state.orders[orderIndex] = updatedOrder;
        }
        
        // Update in live orders array
        const liveOrderIndex = state.liveOrders.findIndex(order => order.id === updatedOrder.id);
        if (liveOrderIndex !== -1) {
          if (['completed', 'cancelled'].includes(updatedOrder.status)) {
            // Remove from live orders if completed/cancelled
            state.liveOrders.splice(liveOrderIndex, 1);
          } else {
            state.liveOrders[liveOrderIndex] = updatedOrder;
          }
        }
        
        // Update current order if it matches
        if (state.currentOrder && state.currentOrder.id === updatedOrder.id) {
          state.currentOrder = updatedOrder;
        }
        
        state.lastUpdateTime = new Date().toISOString();
      })
      
      // Fetch Order Details
      .addCase(fetchOrderDetails.pending, (state) => {
        state.currentOrderLoading = true;
        state.currentOrderError = null;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.currentOrderLoading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.currentOrderLoading = false;
        state.currentOrderError = action.payload;
      })
      
      // Cancel Order
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const cancelledOrder = action.payload;
        
        // Update in orders array
        const orderIndex = state.orders.findIndex(order => order.id === cancelledOrder.id);
        if (orderIndex !== -1) {
          state.orders[orderIndex] = cancelledOrder;
        }
        
        // Remove from live orders
        state.liveOrders = state.liveOrders.filter(order => order.id !== cancelledOrder.id);
        
        // Update current order if it matches
        if (state.currentOrder && state.currentOrder.id === cancelledOrder.id) {
          state.currentOrder = cancelledOrder;
        }
        
        state.lastUpdateTime = new Date().toISOString();
      });
  },
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