/**
 * Entities API Slice for TableServe Application
 * 
 * Handles all entity-related API operations (restaurants, zones, vendors) using RTK Query
 */

import { api } from './baseApi';

export const entitiesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ===== RESTAURANT ENDPOINTS =====
    
    // Get all restaurants
    getRestaurants: builder.query({
      query: () => '/restaurants',
      providesTags: ['Restaurant'],
      transformResponse: (response) => {
        return response.data || response || [];
      },
    }),

    // Get restaurant by ID
    getRestaurant: builder.query({
      query: (id) => `/restaurants/${id}`,
      providesTags: (result, error, id) => [{ type: 'Restaurant', id }],
      transformResponse: (response) => {
        return response.data || response || null;
      },
    }),

    // Create restaurant
    createRestaurant: builder.mutation({
      query: (restaurantData) => ({
        url: '/restaurants',
        method: 'POST',
        body: restaurantData,
      }),
      invalidatesTags: ['Restaurant'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update restaurant
    updateRestaurant: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/restaurants/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Restaurant', id },
        'Restaurant',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete restaurant
    deleteRestaurant: builder.mutation({
      query: (id) => ({
        url: `/restaurants/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Restaurant'],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // Generate QR code for restaurant
    generateRestaurantQR: builder.mutation({
      query: (id) => ({
        url: `/restaurants/${id}/generate-qr`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Restaurant', id }],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // ===== ZONE ENDPOINTS =====

    // Get zone by ID
    getZone: builder.query({
      query: (zoneId) => `/zones/${zoneId}`,
      providesTags: (result, error, zoneId) => [{ type: 'Zone', id: zoneId }],
      transformResponse: (response) => {
        return response.data || response || null;
      },
    }),

    // Create zone
    createZone: builder.mutation({
      query: (zoneData) => ({
        url: '/zones',
        method: 'POST',
        body: zoneData,
      }),
      invalidatesTags: ['Zone'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update zone
    updateZone: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/zones/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Zone', id },
        'Zone',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // ===== SHOP/VENDOR ENDPOINTS =====

    // Get shops for a zone (vendors are shops in the backend)
    getVendors: builder.query({
      query: (zoneId) => `/shops/zones/${zoneId}`,
      providesTags: (result, error, zoneId) => [
        { type: 'Vendor', id: `zone-${zoneId}` },
        'Vendor',
      ],
      transformResponse: (response) => {
        return response.data || response || [];
      },
    }),

    // Add shop/vendor to zone
    addVendor: builder.mutation({
      query: ({ zoneId, vendorData }) => ({
        url: `/shops/zones/${zoneId}`,
        method: 'POST',
        body: vendorData,
      }),
      invalidatesTags: (result, error, { zoneId }) => [
        { type: 'Vendor', id: `zone-${zoneId}` },
        { type: 'Zone', id: zoneId },
        'Vendor',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update shop/vendor
    updateVendor: builder.mutation({
      query: ({ zoneId, vendorId, vendorData }) => ({
        url: `/shops/zones/${zoneId}/shop/${vendorId}`,
        method: 'PUT',
        body: vendorData,
      }),
      invalidatesTags: (result, error, { zoneId, vendorId }) => [
        { type: 'Vendor', id: vendorId },
        { type: 'Vendor', id: `zone-${zoneId}` },
        'Vendor',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete shop/vendor
    deleteVendor: builder.mutation({
      query: ({ zoneId, vendorId }) => ({
        url: `/shops/zones/${zoneId}/shop/${vendorId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { zoneId }) => [
        { type: 'Vendor', id: `zone-${zoneId}` },
        { type: 'Zone', id: zoneId },
        'Vendor',
      ],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // Get shop/vendor by ID (individual vendor details)
    getVendor: builder.query({
      query: ({ zoneId, vendorId }) => `/shops/zones/${zoneId}/shop/${vendorId}`,
      providesTags: (result, error, { vendorId }) => [
        { type: 'Vendor', id: vendorId },
      ],
      transformResponse: (response) => {
        return response.data || response || null;
      },
    }),
  }),
});

export const {
  // Restaurant hooks
  useGetRestaurantsQuery,
  useGetRestaurantQuery,
  useCreateRestaurantMutation,
  useUpdateRestaurantMutation,
  useDeleteRestaurantMutation,
  useGenerateRestaurantQRMutation,

  // Zone hooks
  useGetZoneQuery,
  useCreateZoneMutation,
  useUpdateZoneMutation,

  // Vendor hooks
  useGetVendorsQuery,
  useAddVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetVendorQuery,
} = entitiesApi;