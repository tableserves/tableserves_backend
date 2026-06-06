/**
 * RTK Query API Configuration for TableServe Application
 * 
 * This file sets up the base API configuration using RTK Query for real-time data fetching,
 * caching, and synchronization with the backend database.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import simpleTokenService from '../../shared/auth/SimpleTokenService';

// Health check query that uses root URL (not /api/v1)
const healthQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ,
  credentials: 'include',
});
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL ,
  prepareHeaders: (headers, { getState }) => {
    // Get token using simple token service
    const token = simpleTokenService.getAccessToken();

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
      console.log('🔑 RTK Query request with token');
    } else {
      console.warn('⚠️ RTK Query request without token');
    }

    headers.set('content-type', 'application/json');
    return headers;
  },
  credentials: 'include',
  // Disable automatic retries to prevent infinite loops
  timeout: 10000, // 10 second timeout
});

// Track authentication failures to prevent infinite loops
let authFailureHandled = false;

// Enhanced base query with error handling and retry logic
const enhancedBaseQuery = async (args, api, extraOptions) => {
  try {
    // Log API call for development with detailed info
    if (process.env.NODE_ENV === 'development') {
      const token = simpleTokenService.getAccessToken();
      console.log(`🔍 RTK Query API Call:`, {
        method: args.method || 'GET',
        url: args.url,
        body: args.body,
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });
    }
    
    let result = await baseQuery(args, api, extraOptions);
    
    // Enhanced error handling and debugging
    if (result.error) {
      const errorStatus = result.error.status;
      const errorData = result.error.data;
      
      console.error('❌ RTK Query Error:', {
        status: errorStatus,
        data: errorData,
        url: args.url,
        method: args.method || 'GET',
        isServerError: errorStatus >= 500,
        isClientError: errorStatus >= 400 && errorStatus < 500,
        isNetworkError: errorStatus === 'FETCH_ERROR'
      });
      
      // Handle authentication errors - prevent infinite loop
      if (errorStatus === 401) {
        if (!authFailureHandled) {
          authFailureHandled = true;
          console.warn('🔑 Authentication failed - clearing tokens and redirecting to login');
          simpleTokenService.clearTokens();
          
          // Reset all RTK Query cache to stop polling
          api.dispatch(api.util.resetApiState());
          
          // Dispatch logout action
          api.dispatch({ type: 'ui/logout' });
          
          // Redirect to login after a short delay to allow cleanup
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
        
        // Return error without further processing to stop retries
        return result;
      }
      
      // For 500 errors, check if the response actually indicates success
      if (errorStatus === 500 && errorData) {
        // Check if the error response actually contains success data
        if (errorData.success === true || (errorData.message && errorData.message.includes('successfully'))) {
          console.warn('🤔 Server returned 500 but with success data - treating as success:', errorData);
          // Convert error to success response
          return {
            data: errorData,
            meta: result.meta
          };
        }
      }
      
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`✅ RTK Query Success:`, {
        url: args.url,
        status: result.meta?.response?.status,
        dataLength: result.data ? JSON.stringify(result.data).length : 0,
        hasData: !!result.data,
        success: result.data?.success
      });
    }
    
    return result;
  } catch (error) {
    console.error('💥 RTK Query Exception:', {
      url: args.url,
      error: error.message,
      stack: error.stack
    });
    return { error: { status: 'FETCH_ERROR', error: error.message } };
  }
};

// Create the main API slice
export const api = createApi({
  reducerPath: 'api',
  baseQuery: enhancedBaseQuery,
  tagTypes: [
    'User', 'Auth', 'Restaurant', 'Zone', 'Shop', 'Vendor',
    'Order', 'Menu', 'MenuItem', 'MenuCategory', 
    'Table', 'QRCode', 'Analytics', 'Notification'
  ],
  // Prevent automatic refetching on errors to avoid infinite loops
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  // Keep unused data for 60 seconds
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    // Base health check endpoint - uses root path not /api/v1
    getHealth: builder.query({
      queryFn: async () => {
        try {
          const result = await healthQuery('/health', {}, {});
          return { data: result.data };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      transformResponse: (response) => response.data || response,
    }),
  }),
});

// Export the auto-generated hooks
export const {
  useGetHealthQuery,
} = api;

export default api;