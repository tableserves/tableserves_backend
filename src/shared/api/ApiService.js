import api from './api';
import simpleTokenService from '../auth/SimpleTokenService';

class ApiService {
  // Version check for debugging
  static version = '1.0.1';

  // Generic GET method for any endpoint
  static async get(endpoint) {
    try {
      console.log('ApiService.get: Making HTTP request to:', endpoint);
      const response = await api.get(endpoint);
      console.log('ApiService.get: Response received:', {
        status: response.status,
        data: response.data
      });
      return response.data;
    } catch (error) {
      console.error('ApiService.get: Request failed:', {
        endpoint,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // Generic POST method for any endpoint
  static async post(endpoint, data = {}) {
    try {
      console.log('ApiService.post: Making HTTP request to:', endpoint, 'with data:', data);
      const response = await api.post(endpoint, data);
      console.log('ApiService.post: Response received:', {
        status: response.status,
        data: response.data
      });
      return response.data;
    } catch (error) {
      console.error('ApiService.post: Request failed:', {
        endpoint,
        data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // Restaurant API endpoints
  static async getRestaurant(restaurantId) {
    try {
      console.log('🔍 ApiService.getRestaurant: Fetching restaurant from DATABASE:', restaurantId);
      console.log('🚫 ApiService.getRestaurant: NOT using localStorage - making HTTP request to backend');
      
      // Use the public-by-ID endpoint for unauthenticated (consumer) access
      let response;
      try {
        response = await api.get(`/restaurants/public/id/${restaurantId}`);
        console.log('✅ ApiService.getRestaurant: Successfully fetched via public ID endpoint');
      } catch (publicError) {
        console.log('⚠️ ApiService.getRestaurant: Public ID endpoint failed, trying direct ID endpoint:', publicError.response?.status);
        response = await api.get(`/restaurants/${restaurantId}`);
        console.log('✅ ApiService.getRestaurant: Successfully fetched via direct ID endpoint');
      }
      
      console.log('📋 ApiService.getRestaurant: Raw HTTP response from DATABASE:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      console.log('  - Restaurant name:', response.data?.data?.name || response.data?.name);
      console.log('  - Source: REAL-TIME DATABASE HTTP REQUEST (NOT localStorage)');
      
      const restaurantData = response.data?.data || response.data;
      console.log('✅ ApiService.getRestaurant: Returning restaurant from DATABASE:', {
        id: restaurantData._id || restaurantData.id,
        name: restaurantData.name
      });
      
      return restaurantData;
    } catch (error) {
      console.error('❌ ApiService.getRestaurant: DATABASE request failed:', {
        restaurantId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.message || 'Failed to fetch restaurant from database');
    }
  }

  // Zone API endpoints
  static async getZoneShops(zoneId) {
    try {
      console.log('🔍 ApiService.getZoneShops: Starting DATABASE fetch for zoneId:', zoneId);
      console.log('🚫 ApiService.getZoneShops: NOT using localStorage - making HTTP request to backend');
      
      // Check if zoneId is valid
      if (!zoneId || zoneId.length < 24) {
        console.error('❌ ApiService.getZoneShops: Invalid zoneId provided:', zoneId);
        throw new Error('Invalid zone ID provided');
      }
      
      // Correct endpoint based on the backend routes
      const response = await api.get(`/shops/zones/${zoneId}`);
      
      console.log('📋 ApiService.getZoneShops: Raw HTTP response from DATABASE:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      console.log('  - Shops count:', Array.isArray(response.data?.data?.shops) ? response.data.data.shops.length : 'N/A');
      console.log('  - Source: REAL-TIME DATABASE HTTP REQUEST (NOT localStorage)');
      
      const shops = response.data?.data?.shops || response.data?.shops || response.data || [];
      console.log('✅ ApiService.getZoneShops: Returning', shops.length, 'shops from DATABASE');
      
      return {
        shops,
        zone: response.data?.data?.zone || null
      };
    } catch (error) {
      console.error('❌ ApiService.getZoneShops: DATABASE request failed:', {
        zoneId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        console.warn('⚠️ ApiService.getZoneShops: Zone not found in database. This might be due to an invalid zone ID or the zone has been deleted.');
        // Return empty data instead of throwing to prevent UI crashes
        return {
          shops: [],
          zone: null
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to fetch zone shops from database');
    }
  }

  static async createZoneShop(zoneId, shopData) {
    try {
      const response = await api.post('/shops', { ...shopData, zoneId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create zone shop');
    }
  }

  static async updateZoneShop(zoneId, shopId, shopData) {
    try {
      const response = await api.put(`/shops/zones/${zoneId}/shop/${shopId}`, shopData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update zone shop');
    }
  }

  static async deleteZoneShop(zoneId, shopId) {
    try {
      const response = await api.delete(`/shops/zones/${zoneId}/shop/${shopId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete zone shop');
    }
  }

  static async getZoneShopProfile(zoneId, shopId) {
    try {
      console.log('🔍 ApiService.getZoneShopProfile: Fetching shop profile for:', { 
        zoneId, 
        shopId,
        endpoint: `/shops/zones/${zoneId}/shop/${shopId}`
      });
      
      const response = await api.get(`/shops/zones/${zoneId}/shop/${shopId}`);
      
      console.log('📊 ApiService.getZoneShopProfile: Raw response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        shop: response.data?.data?.shop || response.data?.shop,
        shopStatus: response.data?.data?.shop?.status || response.data?.shop?.status
      });
      
      const shopData = response.data?.data?.shop || response.data?.shop || response.data;
      
      console.log('✅ ApiService.getZoneShopProfile: Processed shop data:', {
        shopData,
        hasStatus: !!shopData?.status,
        status: shopData?.status,
        statusType: typeof shopData?.status
      });
      
      return shopData;
    } catch (error) {
      console.error('❌ ApiService.getZoneShopProfile: Error occurred:', {
        zoneId,
        shopId,
        endpoint: `/shops/zones/${zoneId}/shop/${shopId}`,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        errorData: error.response?.data
      });
      throw new Error(error.response?.data?.message || 'Failed to fetch shop profile');
    }
  }

  static async updateZoneShopStatus(zoneId, shopId, statusData) {
    try {
      console.log('🔧 ApiService.updateZoneShopStatus: Starting update:', { 
        zoneId, 
        shopId, 
        statusData,
        endpoint: `/shops/zones/${zoneId}/shop/${shopId}/availability`
      });
      
      // Use the new availability endpoint which allows shop owners to update their own status
      const response = await api.patch(`/shops/zones/${zoneId}/shop/${shopId}/availability`, statusData);
      
      console.log('✅ ApiService.updateZoneShopStatus: Response received:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });
      
      // Verify the update was successful
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Update confirmed successful with status:', response.status);
        console.log('🏪 Shop availability updated:', {
          shopId,
          newStatus: statusData.status,
          message: response.data?.message
        });
      } else {
        console.warn('⚠️ Unexpected response status:', response.status);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ ApiService.updateZoneShopStatus: Error occurred:', {
        zoneId,
        shopId,
        statusData,
        endpoint: `/shops/zones/${zoneId}/shop/${shopId}/availability`,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        errorDetails: error.response?.data,
        fullError: error
      });
      
      if (error.response?.status === 401) {
        console.log('🔄 ApiService.updateZoneShopStatus: Attempting token refresh...');
        await api.refreshToken();
        const response = await api.patch(`/shops/zones/${zoneId}/shop/${shopId}/availability`, statusData);
        console.log('✅ Retry after token refresh successful:', response.data);
        return response.data;
      }
      
      throw new Error(error.response?.data?.message || 'Failed to update shop status');
    }
  }

  // Vendor API endpoints
  static async getZoneVendors(zoneId) {
    try {
      console.log('ApiService.getZoneVendors: Fetching vendors for zoneId:', zoneId);
      const response = await api.get(`/zones/${zoneId}/vendors`);
      console.log('ApiService.getZoneVendors: Response received:', {
        status: response.status,
        data: response.data,
        vendorsCount: Array.isArray(response.data?.data) ? response.data.data.length : 'N/A'
      });
      
      const vendors = response.data?.data || response.data || [];
      console.log('ApiService.getZoneVendors: Returning vendors:', vendors);
      
      return vendors;
    } catch (error) {
      console.error('ApiService.getZoneVendors: Error occurred:', {
        zoneId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        console.log('ApiService.getZoneVendors: Attempting token refresh...');
        await api.refreshToken();
        const response = await api.get(`/zones/${zoneId}/vendors`);
        console.log('ApiService.getZoneVendors: Retry response:', {
          status: response.status,
          data: response.data
        });
        return response.data?.data || response.data || [];
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch zone vendors');
    }
  }

  static async createZoneVendor(zoneId, vendorData) {
    try {
      const response = await api.post('/vendors', { ...vendorData, zoneId });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.post('/vendors', { ...vendorData, zoneId });
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to create zone vendor');
    }
  }

  // Menu API endpoints - Zone level (Updated for customer use)
  static async getZoneMenu(zoneId) {
    try {
      console.log('🔍 ApiService.getZoneMenu: Starting DATABASE fetch for zoneId:', zoneId);
      console.log('🚫 ApiService.getZoneMenu: NOT using localStorage - making HTTP request to backend');
      
      // Use public endpoint for customer access with correct route pattern /public/:ownerType/:ownerId
      const response = await api.get(`/menus/public/zone/${zoneId}`);
      
      console.log('📋 ApiService.getZoneMenu: Raw HTTP response from DATABASE:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      console.log('  - Categories count:', Array.isArray(response.data?.data?.categories) ? response.data.data.categories.length : 'N/A');
      console.log('  - Source: REAL-TIME DATABASE HTTP REQUEST (NOT localStorage)');
      
      const result = response.data?.data || response.data;
      console.log('✅ ApiService.getZoneMenu: Returning zone menu from DATABASE:', result);
      
      return result;
    } catch (error) {
      console.error('❌ ApiService.getZoneMenu: DATABASE request failed:', {
        zoneId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: `/menus/public/zone/${zoneId}`
      });
      
      // If 404, try to fetch individual shop menus as fallback
      if (error.response?.status === 404) {
        console.warn('⚠️ ApiService.getZoneMenu: Zone menu endpoint not found, trying to fetch shops and their individual menus as fallback');
        try {
          const { shops } = await this.getZoneShops(zoneId);
          const allCategories = [];
          const allItems = [];
          
          for (const shop of shops) {
            try {
              const shopCategories = await this.getMenuCategories(shop._id);
              const shopItems = await this.getMenuItems(shop._id);
              
              // Add shop info to categories and items
              shopCategories.forEach(cat => {
                allCategories.push({ ...cat, shopId: shop._id, shopName: shop.name });
              });
              
              shopItems.forEach(item => {
                allItems.push({ ...item, shopId: shop._id, shopName: shop.name });
              });
            } catch (shopError) {
              console.warn(`Failed to fetch menu for shop ${shop._id}:`, shopError);
            }
          }
          
          // Group items by category
          const categoriesWithItems = allCategories.map(category => ({
            ...category,
            items: allItems.filter(item => item.categoryId === category.id || item.categoryId === category._id)
          }));
          
          console.log('✅ ApiService.getZoneMenu: Fallback successful, returning aggregated menu from shops');
          return { categories: categoriesWithItems };
        } catch (fallbackError) {
          console.error('❌ ApiService.getZoneMenu: Fallback also failed:', fallbackError);
          throw new Error('Failed to fetch zone menu from database and fallback failed');
        }
      }
      
      throw new Error(error.response?.data?.message || 'Failed to fetch zone menu from database');
    }
  }

  static async getMenuCategories(entityId) {
    try {
      // Use public endpoint for customer access
      const response = await api.get(`/menus/public/shop/${entityId}/categories`);
      console.log('ApiService.getMenuCategories: Response received:', {
        status: response.status,
        data: response.data,
        categoriesCount: Array.isArray(response.data?.data) ? response.data.data.length : 'N/A'
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('ApiService.getMenuCategories: Error occurred:', {
        entityId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.message || 'Failed to fetch menu categories');
    }
  }

  // Menu API endpoints - Shop level (Updated for customer use)
  static async getMenuItems(shopId) {
    try {
      console.log('🔍 ApiService.getMenuItems: Starting DATABASE fetch for shopId:', shopId);
      console.log('🚫 ApiService.getMenuItems: NOT using localStorage - making HTTP request to backend');
      
      // Use public endpoint for customer access
      const response = await api.get(`/menus/public/shop/${shopId}/items`);
      
      console.log('📋 ApiService.getMenuItems: Raw HTTP response from DATABASE:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      console.log('  - Items count:', Array.isArray(response.data?.data) ? response.data.data.length : 'N/A');
      console.log('  - Source: REAL-TIME DATABASE HTTP REQUEST (NOT localStorage)');
      
      const result = response.data?.data || response.data;
      console.log('✅ ApiService.getMenuItems: Returning', Array.isArray(result) ? result.length : 0, 'items from DATABASE');
      
      return result;
    } catch (error) {
      console.error('❌ ApiService.getMenuItems: DATABASE request failed:', {
        shopId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.message || 'Failed to fetch menu items from database');
    }
  }

  static async getMenuModifiers(shopId) {
    try {
      console.log('🔧 ApiService.getMenuModifiers: Starting DATABASE fetch for shopId:', shopId);
      console.log('🚫 ApiService.getMenuModifiers: NOT using localStorage - making HTTP request to backend');
      
      // Use the public menu modifiers endpoint for shop-specific modifiers
      const response = await api.get(`/menus/public/shop/${shopId}/modifiers`);
      
      console.log('📋 ApiService.getMenuModifiers: Raw HTTP response from DATABASE:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      console.log('  - Modifiers count:', Array.isArray(response.data?.data) ? response.data.data.length : 'N/A');
      console.log('  - Source: REAL-TIME DATABASE HTTP REQUEST (NOT localStorage)');
      
      const result = response.data?.data || response.data;
      console.log('✅ ApiService.getMenuModifiers: Returning', Array.isArray(result) ? result.length : 0, 'modifiers from DATABASE');
      
      return result;
    } catch (error) {
      console.error('❌ ApiService.getMenuModifiers: DATABASE request failed:', {
        shopId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      // Don't throw error for modifiers - they are optional
      console.warn('⚠️ ApiService.getMenuModifiers: Returning empty array as fallback');
      return [];
    }
  }

  static async getMenuVariants(shopId) {
    try {
      const response = await api.get(`/menus/public/shop/${shopId}/variants`);
      const result = response.data?.data || response.data;
      return Array.isArray(result) ? result : [];
    } catch (error) {
      return [];
    }
  }

  static async createMenuItem(ownerId, itemData, ownerType = 'shop') {
    try {
      const response = await api.post(`/menus/${ownerType}/${ownerId}/items`, itemData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.post(`/menus/${ownerType}/${ownerId}/items`, itemData);
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to create menu item');
    }
  }

  static async updateMenuItem(shopId, itemId, itemData) {
    try {
      const response = await api.put(`/menus/shop/${shopId}/items/${itemId}`, itemData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.put(`/menus/shop/${shopId}/items/${itemId}`, itemData);
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to update menu item');
    }
  }

  static async deleteMenuItem(shopId, itemId) {
    try {
      const response = await api.delete(`/menus/shop/${shopId}/items/${itemId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.delete(`/menus/shop/${shopId}/items/${itemId}`);
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to delete menu item');
    }
  }

  static async deleteZoneVendor(zoneId, vendorId) {
    try {
      const response = await api.delete(`/vendors/${vendorId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.delete(`/vendors/${vendorId}`);
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to delete vendor');
    }
  }

  static async updateZoneVendor(zoneId, vendorId, vendorData) {
    try {
      const response = await api.put(`/vendors/${vendorId}`, vendorData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.put(`/vendors/${vendorId}`, vendorData);
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to update vendor');
    }
  }

  static async updateVendorCredentials(zoneId, vendorId, credentialData) {
    try {
      const response = await api.put(`/zones/${zoneId}/vendors/${vendorId}`, {
        loginCredentials: credentialData
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.put(`/zones/${zoneId}/vendors/${vendorId}`, {
          loginCredentials: credentialData
        });
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to update vendor credentials');
    }
  }

  // Orders API endpoints
  static async getZoneOrders(zoneId, params = {}) {
    try {
      const response = await api.get(`/orders/zones/${zoneId}`, { params });
      return response.data?.orders || response.data || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch zone orders');
    }
  }

  static async getShopOrders(zoneId, shopId, params = {}) {
    try {
      console.log('📋 ApiService.getShopOrders: Fetching orders for zone shop:', {
        zoneId,
        shopId,
        params,
        endpoint: '/orders/management'
      });
      
      // Use the management endpoint with shopId query parameter
      const response = await api.get('/orders/management', { 
        params: { 
          shopId, 
          ...params 
        } 
      });
      
      console.log('📋 ApiService.getShopOrders: Raw response:', {
        status: response.status,
        data: response.data,
        ordersCount: Array.isArray(response.data?.orders) ? response.data.orders.length : 
                    Array.isArray(response.data) ? response.data.length : 'Unknown'
      });
      
      const orders = response.data?.orders || response.data || [];
      console.log('✅ ApiService.getShopOrders: Returning', orders.length, 'orders');
      
      return orders;
    } catch (error) {
      console.error('❌ ApiService.getShopOrders: Failed to fetch shop orders:', {
        zoneId,
        shopId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        await api.refreshToken();
        try {
          const response = await api.get('/orders/management', { 
            params: { 
              shopId, 
              ...params 
            } 
          });
          return response.data?.orders || response.data || [];
        } catch (retryError) {
          console.error('❌ ApiService.getShopOrders: Retry also failed:', retryError);
          throw new Error(retryError.response?.data?.message || 'Failed to fetch shop orders after retry');
        }
      }
      
      throw new Error(error.response?.data?.message || 'Failed to fetch shop orders');
    }
  }

  static async updateOrderStatus(orderId, statusData) {
    try {
      const response = await api.put(`/orders/${orderId}/status`, statusData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.put(`/orders/${orderId}/status`, statusData);
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  }

  static async getOrderHistory(zoneId, shopId, params = {}) {
    try {
      console.log('📋 ApiService.getOrderHistory: Fetching order history for zone shop:', {
        zoneId,
        shopId,
        params,
        endpoint: '/orders/management'
      });
      
      // Use the management endpoint with shopId and status filter for completed orders
      const response = await api.get('/orders/management', { 
        params: { 
          shopId,
          status: 'completed', // Only get completed orders for history
          ...params 
        } 
      });
      
      console.log('📋 ApiService.getOrderHistory: Raw response:', {
        status: response.status,
        data: response.data,
        dataType: typeof response.data,
        dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : 'N/A',
        hasOrders: response.data?.orders !== undefined,
        ordersType: typeof response.data?.orders,
        ordersIsArray: Array.isArray(response.data?.orders),
        ordersCount: Array.isArray(response.data?.orders) ? response.data.orders.length : 
                    Array.isArray(response.data) ? response.data.length : 'Unknown',
        fullResponseData: JSON.stringify(response.data, null, 2)
      });
      
      // Extract orders with multiple fallback strategies
      let orders = [];
      if (Array.isArray(response.data?.orders)) {
        orders = response.data.orders;
      } else if (Array.isArray(response.data?.data)) {
        orders = response.data.data;
      } else if (Array.isArray(response.data)) {
        orders = response.data;
      }
      
      console.log('✅ ApiService.getOrderHistory: Extracted orders:', {
        orders,
        ordersType: typeof orders,
        ordersIsArray: Array.isArray(orders),
        ordersLength: Array.isArray(orders) ? orders.length : 'Not an array'
      });
      console.log('✅ ApiService.getOrderHistory: Returning', Array.isArray(orders) ? orders.length : 'non-array', 'completed orders');
      
      return { data: orders }; // Wrap in data object to match expected format
    } catch (error) {
      console.error('❌ ApiService.getOrderHistory: Failed to fetch order history:', {
        zoneId,
        shopId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        await api.refreshToken();
        try {
          const response = await api.get('/orders/management', { 
            params: { 
              shopId,
              status: 'completed',
              ...params 
            } 
          });
          // Use same robust extraction logic for retry
          let orders = [];
          if (Array.isArray(response.data?.orders)) {
            orders = response.data.orders;
          } else if (Array.isArray(response.data?.data)) {
            orders = response.data.data;
          } else if (Array.isArray(response.data)) {
            orders = response.data;
          }
          return { data: orders };
        } catch (retryError) {
          console.error('❌ ApiService.getOrderHistory: Retry also failed:', retryError);
          throw new Error(retryError.response?.data?.message || 'Failed to fetch order history after retry');
        }
      }
      
      throw new Error(error.response?.data?.message || 'Failed to fetch order history');
    }
  }

  // Analytics API endpoints
  static async getZoneAnalytics(zoneId, timeRange = '7d') {
    try {
      const response = await api.get(`/analytics/zones/${zoneId}?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch zone analytics');
    }
  }

  static async getShopAnalytics(zoneId, shopId, timeRange = '7d') {
    try {
      const response = await api.get(`/analytics/shops/${shopId}?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await api.refreshToken();
        const response = await api.get(`/analytics/shops/${shopId}?timeRange=${timeRange}`);
        return response.data;
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch shop analytics');
    }
  }
}

export default ApiService;