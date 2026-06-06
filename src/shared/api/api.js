import axios from 'axios';
import { safeToastError } from '../utils/toastUtils';
import simpleTokenService from '../auth/SimpleTokenService';

// Configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true,
  // Retry configuration
  retry: 3,
  retryDelay: 1000
};

// Create axios instance with configuration
const api = axios.create(API_CONFIG);

// Add a method to manually refresh tokens
api.refreshToken = async () => {
  const refreshToken = simpleTokenService.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (response.data.success && response.data.data) {
    const { accessToken, refreshToken: newRefreshToken, user } = response.data.data;
    simpleTokenService.storeTokens(accessToken, newRefreshToken, user);
    return { accessToken, refreshToken: newRefreshToken, user };
  }
  
  throw new Error('Token refresh failed');
};

// Helper function to create API handlers with consistent error handling
const createApiHandler = (apiCall) => {
  return async (...args) => {
    try {
      const response = await apiCall(...args);
      return response.data;
    } catch (error) {
      // Error is already handled by the interceptor
      throw error;
    }
  };
};

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // Skip authentication for public menu endpoints
    if (config.url && config.url.includes('/menus/public/')) {
      console.log('Skipping authentication for public menu endpoint:', config.url);
      return config;
    }
    
    const token = simpleTokenService.getAccessToken();
    if (token) {
      if (!token.includes('.')) {
        simpleTokenService.clearTokens();
        throw new Error('Invalid token format');
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for API responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle authentication errors (401 Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = simpleTokenService.getRefreshToken();
        if (!refreshToken) {
          // No refresh token means user needs to log in again
          // Don't throw technical error, just redirect to login
          simpleTokenService.clearTokens();
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          // Return a user-friendly error for the original request
          return Promise.reject({
            ...error,
            message: 'Your session has expired. Please log in again.',
            userFriendly: true
          });
        }

        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: 10000 }
        );

        if (refreshResponse.data.success && refreshResponse.data.data) {
          const { accessToken, refreshToken: newRefreshToken, user } = refreshResponse.data.data;
          
          if (simpleTokenService.storeTokens(accessToken, newRefreshToken, user)) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
        throw new Error('Token refresh failed');
      } catch (refreshError) {
        simpleTokenService.clearTokens();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        // Return user-friendly error instead of technical error
        const userFriendlyError = {
          ...error,
          message: 'Your session has expired. Please log in again.',
          userFriendly: true
        };
        
        throw userFriendlyError;
      }
    }
    
    // Handle other errors
    if (error.response?.status === 403) {
      safeToastError('Access denied. Please check your permissions.');
    } else if (error.response?.status >= 500) {
      safeToastError('Server error. Please try again later.');
    }
    
    return Promise.reject(error);

  }
);

// Enhanced API endpoints with proper error handling
export const healthAPI = {
  basic: createApiHandler(() => api.get('/health')),
  detailed: createApiHandler(() => api.get('/health/detailed')),
  connectivity: createApiHandler(() => api.get('/health/connectivity'))
};

export const authAPI = {
  test: createApiHandler(() => api.get('/auth/test')),
  testJWT: createApiHandler(() => api.get('/auth/test-jwt')),
  login: createApiHandler((credentials) => api.post('/auth/login', credentials)),
  register: createApiHandler((userData) => api.post('/auth/register', userData)),
  logout: createApiHandler(() => api.post('/auth/logout')),
  refreshToken: createApiHandler(() => api.post('/auth/refresh')),
  forgotPassword: createApiHandler((email) => api.post('/auth/forgot-password', { email })),
  resetPassword: createApiHandler((data) => api.post('/auth/reset-password', data)),
  changePassword: createApiHandler((data) => api.post('/auth/change-password', data)),
  getProfile: createApiHandler(() => api.get('/auth/profile')),
  verifyEmail: createApiHandler((data) => api.post('/auth/verify-email', data)),
  verifyPhone: createApiHandler((data) => api.post('/auth/verify-phone', data))
};

export const restaurantAPI = {
  // List and basic operations
  getAll: createApiHandler((params = {}) => api.get('/restaurants', { params })),
  getById: createApiHandler((id) => api.get(`/restaurants/${id}`)),
  getBySlug: createApiHandler((slug) => api.get(`/restaurants/public/${slug}`)),
  create: createApiHandler((data) => api.post('/restaurants', data)),
  update: createApiHandler((id, data) => api.put(`/restaurants/${id}`, data)),
  delete: createApiHandler((id, params = {}) => api.delete(`/restaurants/${id}`, { params })),
  toggleStatus: createApiHandler((id) => api.patch(`/restaurants/${id}/toggle-status`)),
  getStats: createApiHandler((id) => api.get(`/restaurants/${id}/stats`)),
  generateQR: createApiHandler((id) => api.post(`/restaurants/${id}/generate-qr`)),
  updatePassword: createApiHandler((id, data) => api.patch(`/restaurants/${id}/password`, data)),

  // Enhanced methods for database integration
  getRestaurant: createApiHandler((restaurantId) =>
    api.get(`/restaurants/${restaurantId}`)),

  getRestaurantBySlug: createApiHandler((slug) =>
    api.get(`/restaurants/public/${slug}`)),

  updateRestaurant: createApiHandler((restaurantId, data) =>
    api.put(`/restaurants/${restaurantId}`, data)),

  getRestaurantStats: createApiHandler((restaurantId) =>
    api.get(`/restaurants/${restaurantId}/stats`)),

  // Table management
  addTable: createApiHandler((id, tableData) => api.post(`/restaurants/${id}/tables`, tableData)),
  updateTable: createApiHandler((id, tableId, tableData) => api.put(`/restaurants/${id}/tables/${tableId}`, tableData)),
  removeTable: createApiHandler((id, tableId) => api.delete(`/restaurants/${id}/tables/${tableId}`))
};

export const menuAPI = {
  // Restaurant menu methods
  getCategories: createApiHandler((restaurantId) =>
    api.get(`/menus/restaurant/${restaurantId}/categories`)),

  createCategory: createApiHandler((restaurantId, data) =>
    api.post(`/menus/restaurant/${restaurantId}/categories`, data)),

  updateCategory: createApiHandler((restaurantId, categoryId, data) =>
    api.put(`/menus/restaurant/${restaurantId}/categories/${categoryId}`, data)),

  deleteCategory: createApiHandler((restaurantId, categoryId) =>
    api.delete(`/menus/restaurant/${restaurantId}/categories/${categoryId}`)),

  getItems: createApiHandler((restaurantId, categoryId = null) => {
    const url = categoryId
      ? `/menus/restaurant/${restaurantId}/items?categoryId=${categoryId}`
      : `/menus/restaurant/${restaurantId}/items`;
    return api.get(url);
  }),

  createItem: createApiHandler((restaurantId, data) =>
    api.post(`/menus/restaurant/${restaurantId}/items`, data)),

  updateItem: createApiHandler((restaurantId, itemId, data) =>
    api.put(`/menus/restaurant/${restaurantId}/items/${itemId}`, data)),

  deleteItem: createApiHandler((restaurantId, itemId) =>
    api.delete(`/menus/restaurant/${restaurantId}/items/${itemId}`)),

  toggleItemStatus: createApiHandler((restaurantId, itemId) =>
    api.patch(`/menus/restaurant/${restaurantId}/items/${itemId}/status`)),

  // Zone shop menu methods
  getShopCategories: createApiHandler((shopId) =>
    api.get(`/menus/shop/${shopId}/categories`)),

  createShopCategory: createApiHandler((shopId, data) =>
    api.post(`/menus/shop/${shopId}/categories`, data)),

  updateShopCategory: createApiHandler((shopId, categoryId, data) =>
    api.put(`/menus/shop/${shopId}/categories/${categoryId}`, data)),

  deleteShopCategory: createApiHandler((shopId, categoryId) =>
    api.delete(`/menus/shop/${shopId}/categories/${categoryId}`)),

  getShopItems: createApiHandler((shopId, categoryId = null) => {
    const url = categoryId
      ? `/menus/shop/${shopId}/items?categoryId=${categoryId}`
      : `/menus/shop/${shopId}/items`;
    return api.get(url);
  }),

  createShopItem: createApiHandler((shopId, data) =>
    api.post(`/menus/shop/${shopId}/items`, data)),

  updateShopItem: createApiHandler((shopId, itemId, data) =>
    api.put(`/menus/shop/${shopId}/items/${itemId}`, data)),

  deleteShopItem: createApiHandler((shopId, itemId) =>
    api.delete(`/menus/shop/${shopId}/items/${itemId}`)),

  toggleShopItemStatus: createApiHandler((shopId, itemId) =>
    api.patch(`/menus/shop/${shopId}/items/${itemId}/status`))
};

export const userAPI = {
  getProfile: createApiHandler(() => api.get('/auth/profile')),
  updateProfile: createApiHandler((data) => api.patch('/users/me', data)),
  changePassword: createApiHandler((data) =>
    api.patch('/users/me/password', data)),
  uploadAvatar: createApiHandler((file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  })
};

export const uploadAPI = {
  uploadFile: createApiHandler((file, folder = 'uploads') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Folder': folder
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        // You can dispatch this to a Redux store or use a callback
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });
  })
};

export const analyticsAPI = {
  getDashboardStats: createApiHandler(() => api.get('/analytics/dashboard')),
  getSalesReport: createApiHandler((params) => api.get('/analytics/sales', { params })),
  getCustomerAnalytics: createApiHandler((params) => api.get('/analytics/customers', { params })),
  getPopularItems: createApiHandler((params) => api.get('/analytics/items/popular', { params })),
  getRevenueTrends: createApiHandler((params) => api.get('/analytics/revenue/trends', { params })),
  getOrderAnalytics: createApiHandler((params) => api.get('/analytics/orders', { params })),
  getPlatformAnalytics: createApiHandler((timeRange) => api.get(`/analytics/platform?timeRange=${timeRange}`))
};

// Admin API endpoints
export const adminAPI = {
  // Dashboard and analytics
  getDashboard: createApiHandler(() => api.get('/admin/dashboard')),
  getAnalytics: createApiHandler((params = {}) => api.get('/admin/analytics', { params })),

  // User management
  getAllUsers: createApiHandler((params = {}) => api.get('/admin/users', { params })),
  getUser: createApiHandler((id) => api.get(`/admin/users/${id}`)),
  updateUserStatus: createApiHandler((id, status) => api.patch(`/admin/users/${id}/status`, { status })),
  updateUserSubscription: createApiHandler((id, subscriptionData) => api.patch(`/admin/users/${id}/subscription`, subscriptionData)),
  deleteUser: createApiHandler((id) => api.delete(`/admin/users/${id}`)),

  // Restaurant management
  getRestaurants: createApiHandler((params = {}) => api.get('/admin/restaurants', { params })),

  // Zone management
  getZones: createApiHandler((params = {}) => api.get('/admin/zones', { params })),

  // System management
  getLogs: createApiHandler((params = {}) => api.get('/admin/logs', { params })),
  getHealth: createApiHandler(() => api.get('/admin/health'))
};

// Order API endpoints
export const orderAPI = {
  getAll: createApiHandler((params = {}) => api.get('/orders', { params })),
  getById: createApiHandler((id) => api.get(`/orders/${id}`)),
  getCustomerOrder: createApiHandler((id, customerPhone, tableNumber) => 
    api.get(`/orders/customer/${id}`, { 
      params: { customerPhone, ...(tableNumber && { tableNumber }) } 
    })),
  create: createApiHandler((orderData) => api.post('/orders', orderData)),
  updateStatus: createApiHandler((id, status) => api.put(`/orders/${id}/status`, { status })),
  getByNumber: createApiHandler((orderNumber) => api.get(`/orders/track/${orderNumber}`)),
  getRecent: createApiHandler((params = {}) => api.get('/orders/recent', { params })),
  addFeedback: createApiHandler((orderNumber, feedback) => api.post(`/orders/track/${orderNumber}/feedback`, feedback)),
  getStats: createApiHandler((params = {}) => api.get('/orders/stats', { params }))
};

// Zone API endpoints
export const zoneAPI = {
  getAll: createApiHandler((params = {}) => api.get('/zones', { params })),
  getById: createApiHandler((id) => api.get(`/zones/${id}`)),
  create: createApiHandler((zoneData) => api.post('/zones', zoneData)),
  update: createApiHandler((id, zoneData) => api.put(`/zones/${id}`, zoneData)),
  delete: createApiHandler((id, params = {}) => api.delete(`/zones/${id}`, { params })),
  getStats: createApiHandler((id) => api.get(`/zones/${id}/stats`)),
  toggleStatus: createApiHandler((id) => api.patch(`/zones/${id}/toggle-status`)),
  getByLocation: createApiHandler((params = {}) => api.get('/zones/search/location', { params })),
  getPlatformStats: createApiHandler(() => api.get('/zones/platform/stats')),
  // Menu categories endpoints
  getZoneMenuCategories: createApiHandler((zoneId) => api.get(`/menus/zone/${zoneId}/categories`)),
  createZoneMenuCategory: createApiHandler((zoneId, categoryData) => api.post(`/menus/zone/${zoneId}/categories`, categoryData)),
  updateZoneMenuCategory: createApiHandler((zoneId, categoryId, categoryData) => api.put(`/menus/zone/${zoneId}/categories/${categoryId}`, categoryData)),
  deleteZoneMenuCategory: createApiHandler((zoneId, categoryId) => api.delete(`/menus/zone/${zoneId}/categories/${categoryId}`))
};

// Subscription API endpoints
export const subscriptionAPI = {
  // User subscription endpoints
  getCurrentSubscription: createApiHandler(() => api.get('/subscriptions/current')),
  upgradePlan: createApiHandler((planData) => api.post('/subscriptions/upgrade', planData)),
  cancelSubscription: createApiHandler((subscriptionId, reason) =>
    api.post(`/subscriptions/${subscriptionId}/cancel`, { reason })),
  getSubscriptionUsage: createApiHandler((subscriptionId) =>
    api.get(`/subscriptions/${subscriptionId}/usage`)),
  getAvailablePlans: createApiHandler((planType) =>
    api.get(`/subscriptions/plans?type=${planType}`)),
  checkSubscriptionLimits: createApiHandler((feature) =>
    api.get(`/subscriptions/limits/check?feature=${feature}`)),
  processSubscriptionPayment: createApiHandler((paymentData) =>
    api.post('/subscriptions/payment', paymentData)),
  verifySubscriptionPayment: createApiHandler((paymentId) =>
    api.post(`/subscriptions/payment/${paymentId}/verify`)),
  getSubscriptionNotifications: createApiHandler(() =>
    api.get('/subscriptions/notifications')),
  markNotificationRead: createApiHandler((notificationId) =>
    api.patch(`/subscriptions/notifications/${notificationId}/read`)),
  getSubscriptionMetrics: createApiHandler(() =>
    api.get('/subscriptions/metrics')),

  // Admin subscription endpoints
  getAllSubscriptions: createApiHandler((filters) =>
    api.get('/subscriptions/admin/subscriptions', { params: filters })),
  getSubscriptionDetails: createApiHandler((subscriptionId) =>
    api.get(`/subscriptions/admin/subscriptions/${subscriptionId}`)),
  extendSubscription: createApiHandler((subscriptionId, extensionData) =>
    api.post(`/subscriptions/admin/subscriptions/${subscriptionId}/extend`, extensionData)),
  getSubscriptionAnalytics: createApiHandler((timeRange) =>
    api.get(`/subscriptions/admin/subscriptions/analytics?timeRange=${timeRange}`)),
  generateSubscriptionReport: createApiHandler((options) =>
    api.post('/subscriptions/admin/subscriptions/report', options)),
  getExpiringSubscriptions: createApiHandler((days) =>
    api.get(`/subscriptions/admin/subscriptions/expiring?days=${days}`)),
  sendSubscriptionReminder: createApiHandler((subscriptionId) =>
    api.post(`/subscriptions/admin/subscriptions/${subscriptionId}/remind`)),
  updateSubscriptionStatus: createApiHandler((subscriptionId, status) =>
    api.patch(`/subscriptions/admin/subscriptions/${subscriptionId}/status`, { status })),
  getRevenueAnalytics: createApiHandler((timeRange) =>
    api.get(`/subscriptions/admin/subscriptions/revenue?timeRange=${timeRange}`)),
  getPlanDistribution: createApiHandler(() =>
    api.get('/subscriptions/admin/subscriptions/distribution')),
  createCustomSubscription: createApiHandler((subscriptionData) =>
    api.post('/subscriptions/admin/subscriptions/custom', subscriptionData)),
  getSubscriptionHistory: createApiHandler((userId) =>
    api.get(`/admin/subscriptions/history/${userId}`)),
  bulkUpdateSubscriptions: createApiHandler((subscriptionIds, updateData) =>
    api.patch('/admin/subscriptions/bulk-update', { subscriptionIds, updateData })),
  exportSubscriptionData: createApiHandler((format, filters) =>
    api.get(`/admin/subscriptions/export?format=${format}`, {
      params: filters,
      responseType: 'blob'
    })),
  getSubscriptionTrends: createApiHandler((timeRange) =>
    api.get(`/admin/subscriptions/trends?timeRange=${timeRange}`)),
  getChurnAnalysis: createApiHandler(() =>
    api.get('/admin/subscriptions/churn-analysis')),
  getSubscriptionForecast: createApiHandler((months) =>
    api.get(`/admin/subscriptions/forecast?months=${months}`)),

  // Delete subscription
  deleteSubscription: createApiHandler((id, params = {}) => api.delete(`/admin/subscriptions/${id}`, { params }))
};

// QR Code API endpoints
export const qrCodeAPI = {
  // Generate QR codes
  generateQRCode: createApiHandler((businessType, businessId, options = {}) =>
    api.post(`/qr/${businessType}/${businessId}/generate`, options)),

  // Get QR code
  getQRCode: createApiHandler((businessType, businessId) =>
    api.get(`/qr/${businessType}/${businessId}`)),

  // Regenerate QR code
  regenerateQRCode: createApiHandler((businessType, businessId, options = {}) =>
    api.post(`/qr/${businessType}/${businessId}/regenerate`, options)),

  // Validate QR code (public)
  validateQRCode: createApiHandler((qrCodeId) =>
    api.get(`/qr/validate/${qrCodeId}`)),

  // Deactivate QR code
  deactivateQRCode: createApiHandler((businessType, businessId) =>
    api.post(`/qr/${businessType}/${businessId}/deactivate`)),

  // Admin endpoints
  getAllQRCodes: createApiHandler((filters = {}) =>
    api.get('/admin/qr-codes', { params: filters })),

  // Bulk operations
  bulkGenerateQRCodes: createApiHandler((businesses) =>
    api.post('/admin/qr-codes/bulk-generate', { businesses })),

  bulkDeactivateQRCodes: createApiHandler((qrCodeIds) =>
    api.post('/admin/qr-codes/bulk-deactivate', { qrCodeIds }))
};

export default api;