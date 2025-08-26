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
              endpoint = `/restaurants/${entityId}/orders`;
              break;
            case 'zone_admin':
              endpoint = `/zones/${entityId}/orders`;
              break;
            case 'zone_shop':
            case 'zone_vendor':
              endpoint = `/vendors/${entityId}/orders`;
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
        return {
          endpoint: queryString ? `${endpoint}?${queryString}` : endpoint,
          method: 'GET',
        };
      },
      providesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || [];
      },
    }),

    // Get order by ID
    getOrder: builder.query({
      query: (orderId) => ({
        endpoint: `/orders/${orderId}`,
        method: 'GET',
      }),
      providesTags: (result, error, orderId) => [{ type: 'Order', id: orderId }],
      transformResponse: (response) => {
        return response.data || null;
      },
    }),

    // Create new order
    createOrder: builder.mutation({
      query: (orderData) => ({
        endpoint: '/orders',
        method: 'POST',
        data: orderData,
      }),
      invalidatesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update order status
    updateOrderStatus: builder.mutation({
      query: ({ orderId, status, estimatedTime }) => ({
        endpoint: `/orders/${orderId}/status`,
        method: 'PUT',
        data: { status, estimatedTime },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        'Order',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
      // Optimistic update
      async onQueryStarted({ orderId, status, estimatedTime }, { dispatch, queryFulfilled }) {
        // Update the specific order cache
        const patchResult = dispatch(
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

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Cancel order
    cancelOrder: builder.mutation({
      query: ({ orderId, reason }) => ({
        endpoint: `/orders/${orderId}/cancel`,
        method: 'PUT',
        data: { reason },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        'Order',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Get live orders (for real-time dashboards)
    getLiveOrders: builder.query({
      query: ({ role, entityId }) => {
        let endpoint = '/orders/live';
        
        switch (role) {
          case 'restaurant_owner':
            endpoint = `/restaurants/${entityId}/orders/live`;
            break;
          case 'zone_admin':
            endpoint = `/zones/${entityId}/orders/live`;
            break;
          case 'zone_shop':
          case 'zone_vendor':
            endpoint = `/vendors/${entityId}/orders/live`;
            break;
        }
        
        return {
          endpoint,
          method: 'GET',
        };
      },
      providesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || [];
      },
      // Polling for real-time updates
      pollingInterval: 30000, // Poll every 30 seconds
    }),

    // Get order statistics
    getOrderStats: builder.query({
      query: ({ role, entityId, period = 'today' }) => {
        let endpoint = `/orders/stats?period=${period}`;
        
        switch (role) {
          case 'restaurant_owner':
            endpoint = `/restaurants/${entityId}/orders/stats?period=${period}`;
            break;
          case 'zone_admin':
            endpoint = `/zones/${entityId}/orders/stats?period=${period}`;
            break;
          case 'zone_shop':
          case 'zone_vendor':
            endpoint = `/vendors/${entityId}/orders/stats?period=${period}`;
            break;
        }
        
        return {
          endpoint,
          method: 'GET',
        };
      },
      providesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || {};
      },
    }),

    // Batch update order statuses
    batchUpdateOrderStatus: builder.mutation({
      query: ({ orderIds, status }) => ({
        endpoint: '/orders/batch-update',
        method: 'PUT',
        data: { orderIds, status },
      }),
      invalidatesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Get order history for a customer
    getCustomerOrderHistory: builder.query({
      query: ({ customerId, limit = 20, offset = 0 }) => ({
        endpoint: `/customers/${customerId}/orders?limit=${limit}&offset=${offset}`,
        method: 'GET',
      }),
      providesTags: ['Order'],
      transformResponse: (response) => {
        return response.data || [];
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