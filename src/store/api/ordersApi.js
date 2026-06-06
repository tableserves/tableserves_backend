/**
 * Orders API Slice for TableServe Application
 * 
 * Handles all order-related API operations using RTK Query
 */

import { api } from './baseApi';

export const ordersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get orders (with filtering)
    getOrders: builder.query({
      query: ({ role, entityId, filters = {} } = {}) => {
        let endpoint = '/orders';
        const params = new URLSearchParams();
        
        if (role && entityId) {
          switch (role) {
            case 'restaurant_owner':
              endpoint = '/orders/management';
              params.append('restaurantId', entityId);
              break;
            case 'zone_admin':
              endpoint = '/orders/management';
              params.append('zoneId', entityId);
              break;
            case 'zone_shop':
            case 'zone_vendor':
              endpoint = '/orders/management';
              params.append('shopId', entityId);
              break;
          }
        }
        
        // Add filters to query params
        if (filters.status) params.append('status', filters.status);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.offset) params.append('offset', filters.offset);
        
        const queryString = params.toString();
        return queryString ? `${endpoint}?${queryString}` : endpoint;
      },
      providesTags: ['Order'],
      transformResponse: (response) => {
        // Handle backend response structure: { success: true, data: [...], pagination: {...} }
        if (response?.data && Array.isArray(response.data)) {
          return {
            orders: response.data, // All orders including completed
            liveOrders: response.data.filter(order => 
              ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status?.toLowerCase())
            ),
            completedOrders: response.data.filter(order => 
              ['completed', 'delivered'].includes(order.status?.toLowerCase())
            ),
            pagination: response.pagination
          };
        }
        
        // Fallback for direct array response
        const orders = Array.isArray(response) ? response : [];
        return {
          orders, // All orders including completed
          liveOrders: orders.filter(order => 
            ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status?.toLowerCase())
          ),
          completedOrders: orders.filter(order => 
            ['completed', 'delivered'].includes(order.status?.toLowerCase())
          ),
          pagination: null
        };
      },
    }),

    // Get order by ID
    getOrder: builder.query({
      query: (orderId) => `/orders/management/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Order', id: orderId }],
      transformResponse: (response) => {
        return response.data || response || null;
      },
      // Prevent automatic retries on error
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
      // Handle errors gracefully
      transformErrorResponse: (response, meta, arg) => {
        console.error('Get Order Error:', {
          status: response?.status,
          data: response?.data,
          orderId: arg
        });
        
        // Stop any further requests on authentication errors
        if (response?.status === 401) {
          console.warn('🛑 Stopping order fetch due to authentication error');
        }
        
        return response;
      },
    }),

    // Create new order
    createOrder: builder.mutation({
      query: (orderData) => ({
        url: '/orders',
        method: 'POST',
        body: orderData,
      }),
      invalidatesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update order status
    updateOrderStatus: builder.mutation({
      query: ({ orderId, status, estimatedTime }) => ({
        url: `/orders/management/${orderId}/status`,
        method: 'PATCH',
        body: { status, estimatedTime },
      }),
      invalidatesTags: (result, error, { orderId }) => {
        // Only invalidate tags if no error occurred
        if (!error) {
          return [
            { type: 'Order', id: orderId },
            'Order',
          ];
        }
        return [];
      },
      transformResponse: (response) => {
        return response?.data || response;
      },
      transformErrorResponse: (response, meta, arg) => {
        return response;
      },
      // Enhanced optimistic update with better error handling
      async onQueryStarted({ orderId, status, estimatedTime }, { dispatch, queryFulfilled, getState }) {
        // Store patch results for potential rollback
        const patchResults = [];
        
        try {
          // Get current state to find the correct entityId
          const state = getState();
          const entityId = state.orders?.currentEntityId;
          const role = state.orders?.currentRole || 'restaurant_owner';
          
          // Update getLiveOrders cache if we have the context
          if (entityId) {
            try {
              const liveOrdersPatch = dispatch(
                ordersApi.util.updateQueryData('getLiveOrders', 
                  { role, entityId }, 
                  (draft) => {
                    if (Array.isArray(draft)) {
                      const orderIndex = draft.findIndex(order => 
                        (order.id === orderId || order._id === orderId)
                      );
                      if (orderIndex !== -1) {
                        draft[orderIndex].status = status;
                        if (estimatedTime !== undefined) {
                          draft[orderIndex].estimatedTime = estimatedTime;
                        }
                        draft[orderIndex].updatedAt = new Date().toISOString();
                      }
                    }
                  }
                )
              );
              patchResults.push(liveOrdersPatch);
            } catch (cacheError) {
              // Silently continue if cache update fails
            }
          }

          // Update the specific order cache
          try {
            const orderPatch = dispatch(
              ordersApi.util.updateQueryData('getOrder', orderId, (draft) => {
                if (draft) {
                  draft.status = status;
                  if (estimatedTime !== undefined) {
                    draft.estimatedTime = estimatedTime;
                  }
                  draft.updatedAt = new Date().toISOString();
                }
              })
            );
            patchResults.push(orderPatch);
          } catch (cacheError) {
            // Silently continue if cache update fails
          }
        } catch (optimisticError) {
          // Continue with API call even if optimistic update fails
        }

        try {
          const result = await queryFulfilled;
        } catch (queryError) {
          console.error('Order status update failed:', queryError);
          // Revert all optimistic updates on error
          patchResults.forEach(patchResult => {
            try {
              if (patchResult?.undo) {
                patchResult.undo();
              }
            } catch (undoError) {
              console.warn('Failed to undo optimistic update:', undoError.message);
            }
          });
        }
      },
    }),

    // Cancel order
    cancelOrder: builder.mutation({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        'Order',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Get live orders (for real-time dashboards) - simplified version
    getLiveOrders: builder.query({
      query: ({ role, entityId, limit = 100000 }) => {
        const params = new URLSearchParams();
        let endpoint = '/orders/management';

        // Log the request for debugging
        console.log('🔍 Live Orders Request:', { role, entityId, limit });

        if (role === 'restaurant_owner' && entityId) {
          params.append('restaurantId', entityId);
        } else if (role === 'zone_admin' && entityId) {
          params.append('zoneId', entityId);
        } else if ((role === 'zone_shop' || role === 'zone_vendor') && entityId) {
          params.append('shopId', entityId);
        } else if (role === 'admin') {
          // For admin role, no entityId filtering needed
          console.log('👑 Admin role detected - fetching all orders');
        } else {
          // For other roles or when no entityId, use default behavior
          console.log('⚠️ Unknown role or missing entityId:', { role, entityId });
        }

        if (limit) params.append('limit', limit);

        const queryString = params.toString();
        const fullUrl = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        console.log('📡 Final API URL:', fullUrl);
        
        return fullUrl;
      },
      providesTags: ['Order'],
      transformResponse: (response) => {
        // Handle backend response structure: { success: true, data: [...], pagination: {...} }
        if (response?.data && Array.isArray(response.data)) {
          // Return ALL orders for management purposes (including completed)
          return response.data;
        }
        
        // Fallback for direct array response
        return Array.isArray(response) ? response : [];
      },
      transformErrorResponse: (response, meta, arg) => {
        console.error('Live Orders Error:', {
          status: response?.status,
          data: response?.data,
          query: arg
        });
        
        // Provide more detailed error information for zone shops
        if (arg?.role === 'zone_shop' && response?.status === 403) {
          console.error('Zone Shop Access Denied - Check shopId ownership');
        }
        
        return response;
      },
      // Reduced polling frequency to avoid excessive requests
      pollingInterval: 30000, // Poll every 30 seconds
      // Skip polling on authentication errors
      skipPollingIfUnfocused: true,
      // Disable polling on error
      refetchOnMountOrArgChange: true,
      // Stop polling on 401 errors
      onQueryStarted: async (arg, { queryFulfilled, getCacheEntry }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          // If authentication error, stop polling by not refetching
          if (error?.error?.status === 401) {
            console.warn('🛑 Stopping live orders polling due to authentication error');
          }
        }
      }
    }),

    // Get order statistics
    getOrderStats: builder.query({
      query: ({ role, entityId, period = 'today' }) => {
        const params = new URLSearchParams();
        params.append('period', period);
        let endpoint = '/orders/statistics';

        switch (role) {
          case 'restaurant_owner':
            params.append('restaurantId', entityId);
            break;
          case 'zone_admin':
            params.append('zoneId', entityId);
            break;
          case 'zone_shop':
          case 'zone_vendor':
            params.append('shopId', entityId);
            break;
        }

        return `${endpoint}?${params.toString()}`;
      },
      providesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || {};
      },
    }),

    // Batch update order statuses
    batchUpdateOrderStatus: builder.mutation({
      query: ({ orderIds, status }) => ({
        url: '/orders/batch-update',
        method: 'PUT',
        body: { orderIds, status },
      }),
      invalidatesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Get order history for a customer
    getCustomerOrderHistory: builder.query({
      query: ({ customerId, limit = 20, offset = 0 }) => `/customers/${customerId}/orders?limit=${limit}&offset=${offset}`,
      providesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || response || [];
      },
    }),

  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
  useGetLiveOrdersQuery,
  useGetOrderStatsQuery,
  useBatchUpdateOrderStatusMutation,
  useGetCustomerOrderHistoryQuery,
} = ordersApi;