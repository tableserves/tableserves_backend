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
      query: () => ({
        endpoint: '/restaurants',
        method: 'GET',
      }),
      providesTags: ['Restaurant'],
      transformResponse: (response) => {
        return response.data || [];
      },
    }),

    // Get restaurant by ID
    getRestaurant: builder.query({
      query: (id) => ({
        endpoint: `/restaurants/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Restaurant', id }],
      transformResponse: (response) => {
        return response.data || null;
      },
    }),

    // Create restaurant
    createRestaurant: builder.mutation({
      query: (restaurantData) => ({
        endpoint: '/restaurants',
        method: 'POST',
        data: restaurantData,
      }),
      invalidatesTags: ['Restaurant'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update restaurant
    updateRestaurant: builder.mutation({
      query: ({ id, ...data }) => ({
        endpoint: `/restaurants/${id}`,
        method: 'PUT',
        data,
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
        endpoint: `/restaurants/${id}`,
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
        endpoint: `/restaurants/${id}/generate-qr`,
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
      query: (zoneId) => ({
        endpoint: `/zones/${zoneId}`,
        method: 'GET',
      }),
      providesTags: (result, error, zoneId) => [{ type: 'Zone', id: zoneId }],
      transformResponse: (response) => {
        return response.data || null;
      },
    }),

    // Create zone
    createZone: builder.mutation({
      query: (zoneData) => ({
        endpoint: '/zones',
        method: 'POST',
        data: zoneData,
      }),
      invalidatesTags: ['Zone'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update zone
    updateZone: builder.mutation({
      query: ({ id, ...data }) => ({
        endpoint: `/zones/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Zone', id },
        'Zone',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // ===== VENDOR ENDPOINTS =====

    // Get vendors for a zone
    getVendors: builder.query({
      query: (zoneId) => ({
        endpoint: `/zones/${zoneId}/vendors`,
        method: 'GET',
      }),
      providesTags: (result, error, zoneId) => [
        { type: 'Vendor', id: `zone-${zoneId}` },
        'Vendor',
      ],
      transformResponse: (response) => {
        return response.data || [];
      },
    }),

    // Add vendor to zone
    addVendor: builder.mutation({
      query: ({ zoneId, vendorData }) => ({
        endpoint: `/zones/${zoneId}/vendors`,
        method: 'POST',
        data: vendorData,
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

    // Update vendor
    updateVendor: builder.mutation({
      query: ({ zoneId, vendorId, vendorData }) => ({
        endpoint: `/zones/${zoneId}/vendors/${vendorId}`,
        method: 'PUT',
        data: vendorData,
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

    // Delete vendor
    deleteVendor: builder.mutation({
      query: ({ zoneId, vendorId }) => ({
        endpoint: `/zones/${zoneId}/vendors/${vendorId}`,
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

    // Get vendor by ID (individual vendor details)
    getVendor: builder.query({
      query: ({ zoneId, vendorId }) => ({
        endpoint: `/zones/${zoneId}/vendors/${vendorId}`,
        method: 'GET',
      }),
      providesTags: (result, error, { vendorId }) => [
        { type: 'Vendor', id: vendorId },
      ],
      transformResponse: (response) => {
        return response.data || null;
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