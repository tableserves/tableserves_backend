/**
 * Auth API Slice for TableServe Application
 * 
 * Handles all authentication-related API operations using RTK Query
 */

import { api } from './baseApi';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Login user
    login: builder.mutation({
      query: (credentials) => ({
        endpoint: '/auth/login',
        method: 'POST',
        data: credentials,
      }),
      invalidatesTags: ['Auth', 'User'],
      transformResponse: (response) => {
        // The mock API returns { data: { user, token } }
        return response.data || response;
      },
      transformErrorResponse: (response) => {
        return response.error || response.message || 'Login failed';
      },
    }),

    // Logout user
    logout: builder.mutation({
      query: () => ({
        endpoint: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User'],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // Reset password
    resetPassword: builder.mutation({
      query: (email) => ({
        endpoint: '/auth/reset-password',
        method: 'POST',
        data: { email },
      }),
      transformResponse: (response) => {
        return response.data || { success: true, message: 'Reset email sent' };
      },
    }),

    // Verify token (for protected routes)
    verifyToken: builder.query({
      query: () => ({
        endpoint: '/auth/verify',
        method: 'GET',
      }),
      providesTags: ['Auth'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Refresh token
    refreshToken: builder.mutation({
      query: () => ({
        endpoint: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useResetPasswordMutation,
  useVerifyTokenQuery,
  useRefreshTokenMutation,
} = authApi;