// import axios from 'axios'; // Commented out for frontend-only development

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Mock axios instance for frontend-only development
const api = {
  get: (url) => {
    console.log(`MOCK API CALL: GET ${url}`);
    return Promise.resolve({ data: {} });
  },
  post: (url, data) => {
    console.log(`MOCK API CALL: POST ${url}`, data);
    return Promise.resolve({ data: {} });
  },
  put: (url, data) => {
    console.log(`MOCK API CALL: PUT ${url}`, data);
    return Promise.resolve({ data: {} });
  },
  delete: (url) => {
    console.log(`MOCK API CALL: DELETE ${url}`);
    return Promise.resolve({ data: {} });
  },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },
};

// Request interceptor to add auth token (mocked)
api.interceptors.request.use = (onFulfilled, onRejected) => {
  // console.log('MOCK: Request interceptor registered');
};

// Response interceptor for error handling (mocked)
api.interceptors.response.use = (onFulfilled, onRejected) => {
  // console.log('MOCK: Response interceptor registered');
};

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
};

export const restaurantAPI = {
  getAll: () => api.get('/restaurants'),
  getById: (id) => api.get(`/restaurants/${id}`),
  create: (data) => api.post('/restaurants', data),
  update: (id, data) => api.put(`/restaurants/${id}`, data),
  delete: (id) => api.delete(`/restaurants/${id}`),
  generateQR: (id) => api.post(`/restaurants/${id}/generate-qr`),
};

export const zoneAPI = {
  getById: (zoneId) => {
    console.log(`MOCK API CALL: GET /zones/${zoneId}`);
    try {
      // Get zone data from localStorage
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
      const zone = zones.find(z => z.id === zoneId || z.id === zoneId.toString());
      
      if (!zone) {
        return Promise.reject(new Error(`Zone with ID ${zoneId} not found`));
      }
      
      // Get shops/vendors for this zone
      const vendors = JSON.parse(localStorage.getItem(`tableserve_zone_vendors_${zoneId}`) || '[]');
      const shops = JSON.parse(localStorage.getItem(`tableserve_zone_shops_${zoneId}`) || '[]');
      
      // Combine vendors and shops
      const allShops = [...vendors, ...shops];
      
      return Promise.resolve({ 
        data: {
          zone: zone,
          shops: allShops
        }
      });
    } catch (error) {
      console.error('Error fetching zone data:', error);
      return Promise.reject(error);
    }
  },
  getVendorsByZone: (zoneId) => {
    console.log(`MOCK API CALL: GET /zones/${zoneId}/vendors`);
    try {
      const vendors = JSON.parse(localStorage.getItem(`tableserve_zone_vendors_${zoneId}`) || '[]');
      return Promise.resolve({ data: vendors });
    } catch (error) {
      return Promise.reject(error);
    }
  },
  addVendorToZone: (zoneId, vendorData) => api.post(`/zones/${zoneId}/vendors`, vendorData),
  updateVendorInZone: (zoneId, vendorId, vendorData) => api.put(`/zones/${zoneId}/vendors/${vendorId}`, vendorData),
  deleteVendorInZone: (zoneId, vendorId) => api.delete(`/zones/${zoneId}/vendors/${vendorId}`),
  getZoneMenuCategories: (zoneId) => api.get(`/zones/${zoneId}/menu/categories`),
  createZoneMenuCategory: (zoneId, data) => api.post(`/zones/${zoneId}/menu/categories`, data),
  updateZoneMenuCategory: (zoneId, categoryId, data) => api.put(`/zones/${zoneId}/menu/categories/${categoryId}`, data),
  deleteZoneMenuCategory: (zoneId, categoryId) => api.delete(`/zones/${zoneId}/menu/categories/${categoryId}`),
  getZoneMenuModifiers: (zoneId) => api.get(`/zones/${zoneId}/menu/modifiers`),
  createZoneMenuModifier: (zoneId, data) => api.post(`/zones/${zoneId}/menu/modifiers`, data),
  updateZoneMenuModifier: (zoneId, modifierId, data) => api.put(`/zones/${zoneId}/menu/modifiers/${modifierId}`, data),
  deleteZoneMenuModifier: (zoneId, modifierId) => api.delete(`/zones/${zoneId}/menu/modifiers/${modifierId}`),
};

export const menuAPI = {
  getByRestaurant: (restaurantId) => Promise.resolve({ data: [] }), // Mocked for frontend development
  getCategoriesByRestaurant: (restaurantId) => Promise.resolve({ data: [] }), // Mocked for frontend development
  createCategory: (restaurantId, data) => api.post(`/restaurants/${restaurantId}/categories`, data),
  updateCategory: (restaurantId, categoryId, data) => api.put(`/restaurants/${restaurantId}/categories/${categoryId}`, data),
  deleteCategory: (restaurantId, categoryId) => api.delete(`/restaurants/${restaurantId}/categories/${categoryId}`),
  createItem: (restaurantId, categoryId, data) => api.post(`/restaurants/${restaurantId}/categories/${categoryId}/items`, data),
  updateItem: (restaurantId, itemId, data) => api.put(`/restaurants/${restaurantId}/items/${itemId}`, data),
  deleteItem: (restaurantId, itemId) => api.delete(`/restaurants/${restaurantId}/items/${itemId}`),
};

export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getByRestaurant: (restaurantId) => api.get(`/restaurants/${restaurantId}/orders`),
  updateStatus: (orderId, status) => api.put(`/orders/${orderId}/status`, { status }),
  getById: (orderId) => api.get(`/orders/${orderId}`),
};

export const analyticsAPI = {
  getRestaurantAnalytics: (restaurantId, period) => api.get(`/analytics/restaurant/${restaurantId}?period=${period}`),
  getPlatformAnalytics: (period) => api.get(`/analytics/platform?period=${period}`),
  exportReport: (type, params) => api.get(`/analytics/export/${type}`, { params }),
};

export default api;