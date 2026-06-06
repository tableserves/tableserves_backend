/**
 * Unified Entities Slice for TableServe Application
 * 
 * Consolidates the following slices:
 * - restaurantSlice (restaurant details and operations)
 * - zoneSlice (zone details and shops)
 * - vendorsSlice (vendor management within zones)
 * 
 * This reduces 3 slices to 1 unified business entities management slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { zoneAPI } from '../../shared/api/api';
import LocalStorageService from '../../shared/storage/LocalStorageService';
import dataService from '../../services/DataService';
import vendorService from '../../services/VendorService';
import logger from '../../services/LoggingService';

// ===== RESTAURANT THUNKS =====

// Fetch restaurant details
export const fetchRestaurantDetails = createAsyncThunk(
  'entities/fetchRestaurantDetails',
  async ({ restaurantId, zoneId }, { rejectWithValue }) => {
    try {
      let details = null;
      
      if (restaurantId) {
        // First priority: Try to fetch from DATABASE using ApiService (same approach as LandingScreen)
        try {
          // Import ApiService here to avoid circular dependencies
          const ApiService = (await import('../../shared/api/ApiService')).default;
          logger.info('Fetching restaurant from database via ApiService', { restaurantId }, 'entitiesSlice');
          
          details = await ApiService.getRestaurant(restaurantId);
          
          if (details) {
            logger.info('Successfully fetched restaurant from database', { 
              restaurantId, 
              name: details.name,
              id: details._id || details.id 
            }, 'entitiesSlice');
            
            // Normalize the restaurant data
            details = {
              id: details._id || details.id || restaurantId,
              _id: details._id || details.id || restaurantId,
              name: details.name,
              description: details.description || '',
              logo: details.logo,
              contactInfo: details.contactInfo,
              address: details.address,
              status: details.status,
              isFromDatabase: true
            };
          }
        } catch (apiError) {
          logger.warn('ApiService database fetch failed, trying localStorage fallback', apiError, 'entitiesSlice');
        }
        
        // Second priority: Try LocalStorageService only if database fetch failed
        if (!details) {
          try {
            details = await LocalStorageService.getRestaurant(restaurantId);
            if (details) {
              logger.info('Found restaurant via LocalStorageService', { restaurantId, name: details?.name }, 'entitiesSlice');
            }
          } catch (error) {
            logger.warn('LocalStorageService failed, trying direct access', error, 'entitiesSlice');
          }
        }
        
        // Third priority: Try direct localStorage access
        if (!details) {
          try {
            const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
            details = restaurants.find(r => r.id == restaurantId || r._id == restaurantId);
            if (details) {
              logger.info('Found restaurant via direct localStorage access', { restaurantId, name: details?.name }, 'entitiesSlice');
            }
          } catch (error) {
            logger.warn('Direct localStorage access failed', error, 'entitiesSlice');
          }
        }
        
        // Last fallback: Create a temporary restaurant object with enhanced fallback name
        if (!details) {
          const fallbackName = `Restaurant ${restaurantId.slice(-6).toUpperCase()}`;
          details = {
            id: restaurantId,
            _id: restaurantId,
            name: fallbackName,
            description: 'Restaurant details loading...',
            isTemporary: true,
            isFallback: true
          };
          logger.warn('Using enhanced temporary restaurant data with fallback name', { 
            restaurantId, 
            fallbackName 
          }, 'entitiesSlice');
        }
      } else if (zoneId) {
        details = await LocalStorageService.getZoneById(zoneId);
      }
      
      if (!details) {
        throw new Error('Restaurant not found');
      }

      logger.info('Restaurant details fetched successfully', { 
        restaurantId, 
        name: details?.name,
        source: details?.isFromDatabase ? 'DATABASE' : details?.isFallback ? 'FALLBACK' : 'LOCALSTORAGE'
      }, 'entitiesSlice');
      
      return { restaurant: details, restaurantId };
    } catch (error) {
      logger.error('Failed to fetch restaurant details', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Create new restaurant
export const createRestaurant = createAsyncThunk(
  'entities/createRestaurant',
  async (restaurantData, { rejectWithValue }) => {
    try {
      const result = await dataService.createRestaurant(restaurantData);
      
      if (result.success) {
        return result.restaurant;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to create restaurant', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// ===== ZONE THUNKS =====

// Fetch zone and its shops
export const fetchZoneAndShops = createAsyncThunk(
  'entities/fetchZoneAndShops',
  async (zoneId, { rejectWithValue }) => {
    try {
      // Import ApiService here to avoid circular dependencies
      const ApiService = (await import('../../shared/api/ApiService')).default;
      
      // Fetch zone shops and zone info using ApiService
      const response = await ApiService.getZoneShops(zoneId);
      
      logger.info('Zone and shops fetched', { zoneId }, 'entitiesSlice');
      return { 
        zoneId, 
        zone: response.zone,
        shops: response.shops 
      };
    } catch (error) {
      logger.error('Failed to fetch zone and shops', error, 'entitiesSlice');
      
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return rejectWithValue(message);
    }
  }
);

// Create new zone
export const createZone = createAsyncThunk(
  'entities/createZone',
  async (zoneData, { rejectWithValue }) => {
    try {
      const result = await dataService.createZone(zoneData);
      
      if (result.success) {
        return result.zone;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to create zone', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// ===== VENDOR THUNKS =====

// Fetch vendors for a zone
export const fetchVendors = createAsyncThunk(
  'entities/fetchVendors',
  async (zoneId, { rejectWithValue }) => {
    try {
      // Use the zone shops API endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/shops/zones/${zoneId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const vendors = result.data.shops.map(shop => ({
          id: shop._id,
          name: shop.name,
          description: shop.description,
          cuisine: shop.category,
          ownerName: shop.ownerId?.profile?.name || 'Unknown',
          ownerPhone: shop.contactInfo?.phone || shop.ownerId?.phone,
          ownerEmail: shop.contactInfo?.email || shop.ownerId?.email,
          status: shop.status,
          logo: shop.logo?.url
        }));
        
        logger.info('Vendors fetched successfully', { 
          zoneId, 
          vendorCount: vendors.length 
        }, 'entitiesSlice');
        
        return { zoneId, vendors };
      } else {
        throw new Error(result.message || 'Failed to fetch vendors');
      }
    } catch (error) {
      logger.error('Failed to fetch vendors', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Add vendor to zone
export const addVendor = createAsyncThunk(
  'entities/addVendor',
  async ({ zoneId, vendorData }, { dispatch, rejectWithValue }) => {
    try {
      // Use the new vendor creation endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/shops/zones/${zoneId}/vendor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`
        },
        body: JSON.stringify(vendorData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refetch vendors to ensure consistency
        dispatch(fetchVendors(zoneId));
        return { zoneId, vendor: result.data.shop, credentials: result.data.loginCredentials };
      } else {
        throw new Error(result.message || 'Failed to create vendor');
      }
    } catch (error) {
      logger.error('Failed to add vendor', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Update vendor
export const updateVendor = createAsyncThunk(
  'entities/updateVendor',
  async ({ zoneId, vendorId, vendorData }, { dispatch, rejectWithValue }) => {
    try {
      // For now, use the mock API approach
      const response = await zoneAPI.updateVendorInZone(zoneId, vendorId, vendorData);
      
      // Refetch vendors to ensure consistency
      dispatch(fetchVendors(zoneId));
      
      return { zoneId, vendorId, vendor: response.data };
    } catch (error) {
      logger.error('Failed to update vendor', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Delete vendor
export const deleteVendor = createAsyncThunk(
  'entities/deleteVendor',
  async ({ zoneId, vendorId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/shops/zones/${zoneId}/shop/${vendorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refetch vendors to ensure consistency
        dispatch(fetchVendors(zoneId));
        return { zoneId, vendorId };
      } else {
        throw new Error(result.message || 'Failed to delete vendor');
      }
    } catch (error) {
      logger.error('Failed to delete vendor', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Synchronize vendor data
export const synchronizeVendorData = createAsyncThunk(
  'entities/synchronizeVendorData',
  async (zoneId, { rejectWithValue }) => {
    try {
      const result = await dataService.synchronizeVendorData(zoneId);
      
      if (result.success) {
        return { zoneId, vendors: result.vendors || [] };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to synchronize vendor data', error, 'entitiesSlice');
      return rejectWithValue(error.message);
    }
  }
);

// ===== SLICE DEFINITION =====

const initialState = {
  // Restaurant state
  restaurants: {},
  currentRestaurant: null,
  restaurantLoading: false,
  restaurantError: null,
  
  // Zone state
  zones: {},
  currentZone: null,
  zoneShops: [],
  zoneLoading: false,
  zoneError: null,
  
  // Vendor state
  vendorsByZone: {},
  vendorLoading: false,
  vendorError: null,
  
  // General state
  lastSyncTime: null,
  operationInProgress: false,
};

export const entitiesSlice = createSlice({
  name: 'entities',
  initialState,
  reducers: {
    // Restaurant actions
    setCurrentRestaurant: (state, action) => {
      state.currentRestaurant = action.payload;
    },
    
    clearRestaurantError: (state) => {
      state.restaurantError = null;
    },
    
    // Zone actions
    setCurrentZone: (state, action) => {
      state.currentZone = action.payload;
    },
    
    clearZoneError: (state) => {
      state.zoneError = null;
    },
    
    // Vendor actions
    setVendorsForZone: (state, action) => {
      const { zoneId, vendors } = action.payload;
      state.vendorsByZone[zoneId] = vendors;
    },
    
    clearVendorError: (state) => {
      state.vendorError = null;
    },
    
    // Update vendor locally (for optimistic updates)
    updateVendorLocal: (state, action) => {
      const { zoneId, vendorId, updates } = action.payload;
      const vendors = state.vendorsByZone[zoneId];
      
      if (vendors) {
        const vendorIndex = vendors.findIndex(v => v.id === vendorId);
        if (vendorIndex !== -1) {
          vendors[vendorIndex] = { ...vendors[vendorIndex], ...updates };
        }
      }
    },
    
    // General actions
    clearAllErrors: (state) => {
      state.restaurantError = null;
      state.zoneError = null;
      state.vendorError = null;
    },
    
    clearAllData: (state) => {
      state.restaurants = {};
      state.zones = {};
      state.vendorsByZone = {};
      state.currentRestaurant = null;
      state.currentZone = null;
      state.zoneShops = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Restaurant Details
      .addCase(fetchRestaurantDetails.pending, (state) => {
        state.restaurantLoading = true;
        state.restaurantError = null;
      })
      .addCase(fetchRestaurantDetails.fulfilled, (state, action) => {
        state.restaurantLoading = false;
        const { restaurant, restaurantId } = action.payload;

        // Ensure restaurant data is serializable (no Promises)
        const cleanRestaurant = restaurant && typeof restaurant === 'object' && !restaurant.then
          ? JSON.parse(JSON.stringify(restaurant, (key, value) => {
              // Remove any Promise objects or functions
              if (value && (typeof value === 'function' || (typeof value === 'object' && value.then))) {
                return null;
              }
              return value;
            }))
          : restaurant;

        state.restaurants[restaurantId] = cleanRestaurant;
        state.currentRestaurant = cleanRestaurant;
      })
      .addCase(fetchRestaurantDetails.rejected, (state, action) => {
        state.restaurantLoading = false;
        state.restaurantError = action.payload;
      })
      
      // Create Restaurant
      .addCase(createRestaurant.pending, (state) => {
        state.restaurantLoading = true;
        state.restaurantError = null;
        state.operationInProgress = true;
      })
      .addCase(createRestaurant.fulfilled, (state, action) => {
        state.restaurantLoading = false;
        state.operationInProgress = false;
        const restaurant = action.payload;

        // Ensure restaurant data is serializable (no Promises)
        const cleanRestaurant = restaurant && typeof restaurant === 'object' && !restaurant.then
          ? JSON.parse(JSON.stringify(restaurant, (key, value) => {
              // Remove any Promise objects or functions
              if (value && (typeof value === 'function' || (typeof value === 'object' && value.then))) {
                return null;
              }
              return value;
            }))
          : restaurant;

        state.restaurants[cleanRestaurant.id] = cleanRestaurant;
        state.currentRestaurant = cleanRestaurant;
      })
      .addCase(createRestaurant.rejected, (state, action) => {
        state.restaurantLoading = false;
        state.operationInProgress = false;
        state.restaurantError = action.payload;
      })
      
      // Zone and Shops
      .addCase(fetchZoneAndShops.pending, (state) => {
        state.zoneLoading = true;
        state.zoneError = null;
      })
      .addCase(fetchZoneAndShops.fulfilled, (state, action) => {
        state.zoneLoading = false;
        const { zoneId, zone, shops } = action.payload;

        // Ensure zone data is serializable (no Promises)
        const cleanZone = zone && typeof zone === 'object' && !zone.then
          ? JSON.parse(JSON.stringify(zone, (key, value) => {
              // Remove any Promise objects or functions
              if (value && (typeof value === 'function' || (typeof value === 'object' && value.then))) {
                return null;
              }
              return value;
            }))
          : zone;

        const cleanShops = Array.isArray(shops)
          ? shops.map(shop => shop && typeof shop === 'object' && !shop.then
              ? JSON.parse(JSON.stringify(shop, (key, value) => {
                  if (value && (typeof value === 'function' || (typeof value === 'object' && value.then))) {
                    return null;
                  }
                  return value;
                }))
              : shop)
          : [];

        state.zones[zoneId] = cleanZone;
        state.currentZone = cleanZone;
        state.zoneShops = cleanShops;
      })
      .addCase(fetchZoneAndShops.rejected, (state, action) => {
        state.zoneLoading = false;
        state.zoneError = action.payload;
      })
      
      // Create Zone
      .addCase(createZone.pending, (state) => {
        state.zoneLoading = true;
        state.zoneError = null;
        state.operationInProgress = true;
      })
      .addCase(createZone.fulfilled, (state, action) => {
        state.zoneLoading = false;
        state.operationInProgress = false;
        const zone = action.payload;
        state.zones[zone.id] = zone;
        state.currentZone = zone;
      })
      .addCase(createZone.rejected, (state, action) => {
        state.zoneLoading = false;
        state.operationInProgress = false;
        state.zoneError = action.payload;
      })
      
      // Fetch Vendors
      .addCase(fetchVendors.pending, (state) => {
        state.vendorLoading = true;
        state.vendorError = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.vendorLoading = false;
        const { zoneId, vendors } = action.payload;
        state.vendorsByZone[zoneId] = vendors;
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.vendorLoading = false;
        state.vendorError = action.payload;
      })
      
      // Add Vendor
      .addCase(addVendor.pending, (state) => {
        state.vendorLoading = true;
        state.vendorError = null;
        state.operationInProgress = true;
      })
      .addCase(addVendor.fulfilled, (state, action) => {
        state.vendorLoading = false;
        state.operationInProgress = false;
        // Vendors will be updated by the subsequent fetchVendors call
      })
      .addCase(addVendor.rejected, (state, action) => {
        state.vendorLoading = false;
        state.operationInProgress = false;
        state.vendorError = action.payload;
      })
      
      // Update Vendor
      .addCase(updateVendor.pending, (state) => {
        state.vendorLoading = true;
        state.vendorError = null;
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        state.vendorLoading = false;
        // Vendors will be updated by the subsequent fetchVendors call
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.vendorLoading = false;
        state.vendorError = action.payload;
      })
      
      // Delete Vendor
      .addCase(deleteVendor.pending, (state) => {
        state.vendorLoading = true;
        state.vendorError = null;
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.vendorLoading = false;
        // Vendors will be updated by the subsequent fetchVendors call
      })
      .addCase(deleteVendor.rejected, (state, action) => {
        state.vendorLoading = false;
        state.vendorError = action.payload;
      })
      
      // Synchronize Vendor Data
      .addCase(synchronizeVendorData.pending, (state) => {
        state.vendorLoading = true;
        state.vendorError = null;
      })
      .addCase(synchronizeVendorData.fulfilled, (state, action) => {
        state.vendorLoading = false;
        const { zoneId, vendors } = action.payload;
        state.vendorsByZone[zoneId] = vendors;
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(synchronizeVendorData.rejected, (state, action) => {
        state.vendorLoading = false;
        state.vendorError = action.payload;
      });
  },
});

// ===== ACTIONS =====
export const {
  setCurrentRestaurant,
  clearRestaurantError,
  setCurrentZone,
  clearZoneError,
  setVendorsForZone,
  clearVendorError,
  updateVendorLocal,
  clearAllErrors,
  clearAllData,
} = entitiesSlice.actions;

// ===== SELECTORS =====

// Restaurant selectors
export const selectRestaurants = (state) => state.entities.restaurants;
export const selectCurrentRestaurant = (state) => state.entities.currentRestaurant;
export const selectRestaurantLoading = (state) => state.entities.restaurantLoading;
export const selectRestaurantError = (state) => state.entities.restaurantError;

export const selectRestaurantById = (state, restaurantId) => 
  state.entities.restaurants[restaurantId];

// Zone selectors
export const selectZones = (state) => state.entities.zones;
export const selectCurrentZone = (state) => state.entities.currentZone;
export const selectZoneShops = (state) => state.entities.zoneShops;
export const selectZoneLoading = (state) => state.entities.zoneLoading;
export const selectZoneError = (state) => state.entities.zoneError;

export const selectZoneById = (state, zoneId) => 
  state.entities.zones[zoneId];

// Vendor selectors
export const selectVendorsByZone = (state) => state.entities.vendorsByZone;
export const selectVendorLoading = (state) => state.entities.vendorLoading;
export const selectVendorError = (state) => state.entities.vendorError;

export const selectVendorsForZone = (state, zoneId) => 
  state.entities.vendorsByZone[zoneId] || [];

export const selectVendorById = (state, zoneId, vendorId) => {
  const vendors = state.entities.vendorsByZone[zoneId] || [];
  return vendors.find(vendor => vendor.id === vendorId);
};

// Combined selectors
export const selectActiveVendorsForZone = createSelector(
  [(state, zoneId) => state.entities.vendorsByZone[zoneId] || []],
  (vendors) => vendors.filter(vendor => vendor.status === 'active')
);

export const selectEntityStats = createSelector(
  [(state) => state.entities.restaurants, (state) => state.entities.zones, (state) => state.entities.vendorsByZone, (state) => state.entities.lastSyncTime],
  (restaurants, zones, vendorsByZone, lastSyncTime) => ({
    restaurantCount: Object.keys(restaurants).length,
    zoneCount: Object.keys(zones).length,
    totalVendors: Object.values(vendorsByZone)
      .reduce((total, vendors) => total + vendors.length, 0),
    lastSyncTime,
  })
);

// Loading state selectors
export const selectAnyLoading = createSelector(
  [(state) => state.entities.restaurantLoading, (state) => state.entities.zoneLoading, (state) => state.entities.vendorLoading, (state) => state.entities.operationInProgress],
  (restaurantLoading, zoneLoading, vendorLoading, operationInProgress) => 
    restaurantLoading || 
    zoneLoading || 
    vendorLoading ||
    operationInProgress
);

export const selectHasErrors = createSelector(
  [(state) => state.entities.restaurantError, (state) => state.entities.zoneError, (state) => state.entities.vendorError],
  (restaurantError, zoneError, vendorError) => 
    Boolean(restaurantError || zoneError || vendorError)
);

export default entitiesSlice.reducer;