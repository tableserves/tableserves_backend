/**
 * RTK Query API Configuration for TableServe Application
 * 
 * This file sets up the base API configuration using RTK Query for better data fetching,
 * caching, and synchronization. It works with the existing mock API structure but can
 * easily transition to real backend APIs.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { authAPI, restaurantAPI, zoneAPI, menuAPI, orderAPI, analyticsAPI } from '../../services/api.js';
import logger from '../../services/LoggingService.js';

// Base query function that works with our mock API setup
const baseQuery = fetchBaseQuery({
  baseUrl: '/',
  prepareHeaders: (headers, { getState }) => {
    // Get token from the UI slice
    const token = getState().ui?.auth?.token;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Custom base query that works with our mock API structure
const customBaseQuery = async (args, api, extraOptions) => {
  const { endpoint, method = 'GET', data } = args;
  
  try {
    // Log API call for development
    logger.api(method, endpoint, data);
    
    // For now, route to our existing mock API functions
    // This allows us to gradually migrate to real APIs
    let result;
    
    // Simple routing based on endpoint patterns
    if (endpoint.startsWith('/auth/')) {
      result = await routeAuthAPI(endpoint, method, data);
    } else if (endpoint.startsWith('/restaurants/')) {
      result = await routeRestaurantAPI(endpoint, method, data);
    } else if (endpoint.startsWith('/zones/')) {
      result = await routeZoneAPI(endpoint, method, data);
    } else if (endpoint.startsWith('/orders/')) {
      result = await routeOrderAPI(endpoint, method, data);
    } else if (endpoint.startsWith('/analytics/')) {
      result = await routeAnalyticsAPI(endpoint, method, data);
    } else {
      // Default to base query for unhandled endpoints
      result = await baseQuery(args, api, extraOptions);
    }
    
    return { data: result };
  } catch (error) {
    logger.error('API call failed', error, 'RTK Query');
    return { error: { status: 'FETCH_ERROR', error: error.message } };
  }
};

// Routing functions for different API endpoints
async function routeAuthAPI(endpoint, method, data) {
  switch (endpoint) {
    case '/auth/login':
      return await authAPI.login(data);
    case '/auth/logout':
      return await authAPI.logout();
    case '/auth/reset-password':
      return await authAPI.resetPassword(data?.email);
    default:
      throw new Error(`Unknown auth endpoint: ${endpoint}`);
  }
}

async function routeRestaurantAPI(endpoint, method, data) {
  const pathParts = endpoint.split('/');
  
  if (endpoint === '/restaurants' && method === 'GET') {
    return await restaurantAPI.getAll();
  } else if (endpoint === '/restaurants' && method === 'POST') {
    return await restaurantAPI.create(data);
  } else if (pathParts.length === 3 && method === 'GET') {
    // /restaurants/:id
    const id = pathParts[2];
    return await restaurantAPI.getById(id);
  } else if (pathParts.length === 3 && method === 'PUT') {
    // /restaurants/:id
    const id = pathParts[2];
    return await restaurantAPI.update(id, data);
  } else if (pathParts.length === 3 && method === 'DELETE') {
    // /restaurants/:id
    const id = pathParts[2];
    return await restaurantAPI.delete(id);
  } else if (endpoint.includes('/generate-qr')) {
    const id = pathParts[2];
    return await restaurantAPI.generateQR(id);
  }
  
  throw new Error(`Unknown restaurant endpoint: ${endpoint}`);
}

async function routeZoneAPI(endpoint, method, data) {
  const pathParts = endpoint.split('/');
  
  if (pathParts.length >= 3) {
    const zoneId = pathParts[2];
    
    if (endpoint === `/zones/${zoneId}` && method === 'GET') {
      return await zoneAPI.getById(zoneId);
    } else if (endpoint === `/zones/${zoneId}/vendors` && method === 'GET') {
      return await zoneAPI.getVendorsByZone(zoneId);
    } else if (endpoint === `/zones/${zoneId}/vendors` && method === 'POST') {
      return await zoneAPI.addVendorToZone(zoneId, data);
    } else if (endpoint.includes('/vendors/') && method === 'PUT') {
      const vendorId = pathParts[4];
      return await zoneAPI.updateVendorInZone(zoneId, vendorId, data);
    } else if (endpoint.includes('/vendors/') && method === 'DELETE') {
      const vendorId = pathParts[4];
      return await zoneAPI.deleteVendorInZone(zoneId, vendorId);
    }
  }
  
  throw new Error(`Unknown zone endpoint: ${endpoint}`);
}

async function routeOrderAPI(endpoint, method, data) {
  const pathParts = endpoint.split('/');
  
  if (endpoint === '/orders' && method === 'POST') {
    return await orderAPI.create(data);
  } else if (pathParts.length === 3 && method === 'GET') {
    // /orders/:id
    const orderId = pathParts[2];
    return await orderAPI.getById(orderId);
  } else if (endpoint.includes('/status') && method === 'PUT') {
    const orderId = pathParts[2];
    return await orderAPI.updateStatus(orderId, data.status);
  }
  
  throw new Error(`Unknown order endpoint: ${endpoint}`);
}

async function routeAnalyticsAPI(endpoint, method, data) {
  const pathParts = endpoint.split('/');
  
  if (endpoint.includes('/restaurant/')) {
    const restaurantId = pathParts[3];
    const period = data?.period || 'month';
    return await analyticsAPI.getRestaurantAnalytics(restaurantId, period);
  } else if (endpoint.includes('/platform')) {
    const period = data?.period || 'month';
    return await analyticsAPI.getPlatformAnalytics(period);
  }
  
  throw new Error(`Unknown analytics endpoint: ${endpoint}`);
}

// Create the main API
export const api = createApi({
  reducerPath: 'api',
  baseQuery: customBaseQuery,
  tagTypes: [
    'Auth',
    'Restaurant',
    'Zone', 
    'Vendor',
    'MenuCategory',
    'MenuItem',
    'Order',
    'Analytics',
    'User'
  ],
  endpoints: () => ({}),
});

export default api;