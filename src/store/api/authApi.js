/**
 * Auth API Slice for TableServe Application
 * 
 * Handles all authentication-related API operations using RTK Query
 */

import { api } from './baseApi';
import { getUserFriendlyErrorMessage } from '../../shared/utils/errorMessageUtils';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Register user
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth', 'User'],
      transformResponse: (response) => {
        console.log('Registration transformResponse:', response);
        return response.data || response;
      },
      transformErrorResponse: (response, meta, arg) => {
        console.log('Registration transformErrorResponse:', response);

        // Extract user-friendly error message
        const userFriendlyMessage = getUserFriendlyErrorMessage(response, 'signup');
        
        // Return enhanced error response
        return {
          ...response,
          message: userFriendlyMessage,
          originalResponse: response // Keep original for debugging
        };
      },
    }),

    // Login user
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'User'],
      transformResponse: (response) => {
        console.log('Login transformResponse:', response);
        return response.data || response;
      },
      transformErrorResponse: (response, meta, arg) => {
        console.log('Login transformErrorResponse:', response);

        // Extract user-friendly error message
        const userFriendlyMessage = getUserFriendlyErrorMessage(response, 'login');
        
        // Return enhanced error response
        return {
          ...response,
          message: userFriendlyMessage,
          originalResponse: response // Keep original for debugging
        };
      },
    }),

    // Logout user
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User'],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // Request password reset
    resetPassword: builder.mutation({
      query: (email) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
      transformResponse: (response) => {
        return response.data || { success: true, message: 'Reset email sent' };
      },
    }),

    // Update password with token
    updatePasswordWithToken: builder.mutation({
      query: ({ token, password, confirmPassword }) => {
        // Log the token being sent for debugging
        console.log('authApi: Sending reset password request', {
          tokenLength: token.length,
          tokenPreview: token.substring(0, 10) + '...',
          fullToken: token // Be careful with this in production
        });
        
        // Use the token directly without additional encoding since it should already be properly encoded
        // Only encode if it contains characters that need encoding
        let safeToken = token;
        try {
          // Check if token is already encoded by trying to decode it
          const decoded = decodeURIComponent(token);
          // If decoding results in the same token, it wasn't encoded
          if (decoded === token) {
            // Only encode if needed
            safeToken = encodeURIComponent(token);
          } else {
            // Token is already encoded, use as is
            safeToken = token;
          }
        } catch (e) {
          // If there's an error, encode it to be safe
          safeToken = encodeURIComponent(token);
        }
        
        console.log('authApi: Using token in URL', {
          originalToken: token,
          safeToken: safeToken,
          needsEncoding: safeToken !== token
        });
        
        return {
          url: `/auth/reset-password/${safeToken}`,
          method: 'POST',
          body: { password, confirmPassword },
        };
      },
      transformResponse: (response) => {
        return response.data || { success: true, message: 'Password updated successfully' };
      },
    }),

    // Send email OTP
    sendEmailOTP: builder.mutation({
      query: (data) => ({
        url: '/auth/send-email-otp',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response) => {
        return response.data || { success: true, message: 'OTP sent successfully' };
      },
    }),

    // Verify email OTP
    verifyEmailOTP: builder.mutation({
      query: (data) => ({
        url: '/auth/verify-email-otp',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response) => {
        return response.data || { success: true, message: 'OTP verified successfully' };
      },
    }),

    // Verify token (for protected routes)
    verifyToken: builder.query({
      query: () => '/auth/verify',
      providesTags: ['Auth'],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Refresh token
    refreshToken: builder.mutation({
      query: () => ({
        url: '/auth/refresh',
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
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useResetPasswordMutation,
  useUpdatePasswordWithTokenMutation,
  useVerifyTokenQuery,
  useRefreshTokenMutation,
  useSendEmailOTPMutation,
  useVerifyEmailOTPMutation,
} = authApi;