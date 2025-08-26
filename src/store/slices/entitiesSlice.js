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
import { zoneAPI } from '../../services/api';
import LocalStorageService from '../../services/LocalStorageService';
import dataService from '../../services/DataService';
import vendorService from '../../services/VendorService';
import logger from '../../services/LoggingService';

// ===== RESTAURANT THUNKS =====

// Fetch restaurant details
export const fetchRestaurantDetails = createAsyncThunk(
  'entities/fetchRestaurantDetails',
  async ({ restaurantId, zoneId }, { rejectWithValue }) => {
    try {
      const details = LocalStorageService.getRestaurantDetails({ restaurantId, zoneId });
      
      if (!details) {
        throw new Error('Restaurant not found');
      }

      logger.info('Restaurant details fetched', { restaurantId }, 'entitiesSlice');
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
      // For now, use the mock API approach
      const response = await zoneAPI.getById(zoneId);
      
      logger.info('Zone and shops fetched', { zoneId }, 'entitiesSlice');
      return { zoneId, ...response.data };
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
      // Use the unified vendor service
      const vendors = vendorService.getVendors(zoneId);
      
      logger.info('Vendors fetched successfully', { 
        zoneId, 
        vendorCount: vendors.length 
      }, 'entitiesSlice');
      
      return { zoneId, vendors };
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
      const result = await dataService.addVendorToZone(zoneId, vendorData);
      
      if (result.success) {
        // Refetch vendors to ensure consistency
        dispatch(fetchVendors(zoneId));
        return { zoneId, vendor: result.vendor };
      } else {
        throw new Error(result.error);
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
      // For now, use the mock API approach
      await zoneAPI.deleteVendorInZone(zoneId, vendorId);
      
      // Refetch vendors to ensure consistency
      dispatch(fetchVendors(zoneId));
      
      return { zoneId, vendorId };
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
        state.restaurants[restaurantId] = restaurant;
        state.currentRestaurant = restaurant;
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
        state.restaurants[restaurant.id] = restaurant;
        state.currentRestaurant = restaurant;
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
        state.zones[zoneId] = zone;
        state.currentZone = zone;
        state.zoneShops = shops || [];
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