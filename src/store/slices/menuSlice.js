/**
 * Unified Menu Slice for TableServe Application
 * 
 * Consolidates the following slices:
 * - menuCategoriesSlice
 * - menuItemsSlice  
 * - menuModifiersSlice
 * - zoneMenuCategoriesSlice
 * - zoneMenuModifiersSlice
 * 
 * This reduces 5 slices to 1 unified menu management slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import dataAccessLayer from '../../services/DataAccessLayer';
import DatabaseService from '../../services/DatabaseService';
import logger from '../../services/LoggingService';
import { fetchCurrentCounts } from './subscriptionSlice'; // Import fetchCurrentCounts from subscription slice

// ===== ASYNC THUNKS =====

// Menu Items - Database-driven
export const fetchMenuItems = createAsyncThunk(
  'menu/fetchMenuItems',
  async ({ entityId, entityType, limit = 1000, isDashboard = false }, { rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      // Dashboard uses authenticated endpoint to see ALL items (including out-of-stock)
      // Customer/public uses public endpoint
      const isPublicEndpoint = !isDashboard && entityType === 'restaurant';
      const baseEndpoint = isPublicEndpoint
        ? `/menus/public/restaurant/${entityId}/items`
        : `/menus/${ownerType}/${entityId}/items`;

      // Add limit as query parameter
      const endpoint = `${baseEndpoint}?limit=${limit}`;

      const response = await DatabaseService.getData(endpoint);

      const items = Array.isArray(response) ? response : [];
      logger.info('Menu items fetched from database', {
        entityId,
        entityType,
        count: items.length
      }, 'menuSlice');

      return { items, entityType, entityId };
    } catch (error) {
      logger.error('Failed to fetch menu items from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const createMenuItem = createAsyncThunk(
  'menu/createMenuItem',
  async ({ entityId, entityType, categoryId, itemData }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/items`;

      const apiItemData = {
        categoryId,
        name: itemData.name,
        description: itemData.description || '',
        price: itemData.price,
        image: itemData.image && itemData.image !== 'null' && itemData.image.trim() ? itemData.image.trim() : null,
        available: itemData.available !== false,
        isVeg: itemData.isVeg || false,
        isSpicy: itemData.isSpicy || false,
        tags: itemData.tags || [],
        modifiers: itemData.modifiers || []
      };

      console.log('Sending menu item data to API:', apiItemData);

      const response = await DatabaseService.saveData(endpoint, apiItemData, 'POST');

      logger.info('Menu item created successfully in database', {
        itemId: response.id || response._id,
        entityId,
        entityType
      }, 'menuSlice');

      dispatch(fetchMenuItems({ entityId, entityType, isDashboard: true }));

      // Refresh current counts after creating menu item
      dispatch(fetchCurrentCounts());

      return response;
    } catch (error) {
      logger.error('Failed to create menu item in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'menu/updateMenuItem',
  async ({ entityId, entityType, itemId, itemData }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/items/${itemId}`;

      const apiItemData = {
        categoryId: itemData.categoryId,
        name: itemData.name,
        description: itemData.description || '',
        price: itemData.price,
        image: itemData.image && itemData.image !== 'null' && itemData.image.trim() ? itemData.image.trim() : null,
        available: itemData.available !== false,
        isVeg: itemData.isVeg || false,
        isSpicy: itemData.isSpicy || false,
        tags: itemData.tags || [],
        modifiers: itemData.modifiers || []
      };

      console.log('menuSlice updateMenuItem - Sending to backend:', {
        endpoint,
        apiItemData,
        originalImage: itemData.image,
        processedImage: apiItemData.image
      });

      const response = await DatabaseService.saveData(endpoint, apiItemData, 'PUT');

      console.log('menuSlice updateMenuItem - Response from backend:', response);

      logger.info('Menu item updated successfully in database', {
        itemId,
        entityId,
        entityType,
        responseImage: response?.data?.item?.image
      }, 'menuSlice');

      dispatch(fetchMenuItems({ entityId, entityType, isDashboard: true }));
      return response;
    } catch (error) {
      logger.error('Failed to update menu item in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  'menu/deleteMenuItem',
  async ({ entityId, entityType, itemId }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/items/${itemId}`;
      await DatabaseService.deleteData(endpoint);

      logger.info('Menu item deleted successfully from database', {
        itemId,
        entityId,
        entityType
      }, 'menuSlice');

      // Refresh items list
      dispatch(fetchMenuItems({ entityId, entityType, isDashboard: true }));

      // Refresh current counts after deleting menu item
      dispatch(fetchCurrentCounts());

      return itemId;
    } catch (error) {
      logger.error('Failed to delete menu item from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Menu Categories - Database-driven
export const fetchMenuCategories = createAsyncThunk(
  'menu/fetchMenuCategories',
  async ({ entityId, entityType, limit = 1000, isDashboard = false }, { rejectWithValue }) => {
    try {
      // Map entityType to API endpoint format
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      // Dashboard uses authenticated endpoint to see ALL categories (including hidden ones)
      // Customer/public uses public endpoint which only returns active categories
      const isPublicEndpoint = !isDashboard && entityType === 'restaurant';
      const baseEndpoint = isPublicEndpoint
        ? `/menus/public/restaurant/${entityId}/categories`
        : `/menus/${ownerType}/${entityId}/categories`;

      // Add limit as query parameter
      const endpoint = `${baseEndpoint}?limit=${limit}`;

      const response = await DatabaseService.getData(endpoint);

      const categories = Array.isArray(response) ? response : [];
      logger.info('Menu categories fetched from database', {
        entityId,
        entityType,
        count: categories.length
      }, 'menuSlice');

      return { categories, entityType, entityId };
    } catch (error) {
      logger.error('Failed to fetch menu categories from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'menu/createCategory',
  async ({ entityId, entityType, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      // Debug: Log the input data
      console.log('MenuSlice createCategory - Input data:', { entityId, entityType, categoryData });

      // Map entityType to API endpoint format
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/categories`;

      // Prepare category data for API
      const apiCategoryData = {
        name: categoryData.name,
        description: categoryData.description || '',
        sortOrder: categoryData.sortOrder || 0,
        isActive: categoryData.isActive !== false,
        settings: {
          showInMenu: categoryData.isActive !== false,
          allowCustomization: true
        },
        tags: categoryData.tags || []
      };

      // Debug: Log the exact data being sent to backend
      console.log('MenuSlice createCategory - Final apiCategoryData being sent:', apiCategoryData);
      console.log('MenuSlice createCategory - Endpoint:', endpoint);
      console.log('MenuSlice createCategory - Data types:', {
        name: typeof apiCategoryData.name,
        description: typeof apiCategoryData.description,
        sortOrder: typeof apiCategoryData.sortOrder,
        isActive: typeof apiCategoryData.isActive,
        settings: typeof apiCategoryData.settings,
        tags: typeof apiCategoryData.tags
      });

      const response = await DatabaseService.saveData(endpoint, apiCategoryData, 'POST');

      logger.info('Menu category created successfully in database', {
        categoryId: response.id || response._id,
        entityId,
        entityType
      }, 'menuSlice');

      // Refresh categories list
      dispatch(fetchMenuCategories({ entityId, entityType }));

      // Refresh current counts after creating category
      dispatch(fetchCurrentCounts());

      return response;
    } catch (error) {
      logger.error('Failed to create menu category in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'menu/updateCategory',
  async ({ entityId, entityType, categoryId, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      // Map entityType to API endpoint format
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/categories/${categoryId}`;

      // Prepare category data for API
      const apiCategoryData = {
        name: categoryData.name,
        description: categoryData.description || '',
        sortOrder: categoryData.sortOrder || 0,
        isActive: categoryData.isActive !== false,
        settings: {
          showInMenu: categoryData.isActive !== false,
          allowCustomization: true
        },
        tags: categoryData.tags || []
      };

      const response = await DatabaseService.saveData(endpoint, apiCategoryData, 'PUT');

      logger.info('Menu category updated successfully in database', {
        categoryId,
        entityId,
        entityType
      }, 'menuSlice');

      // Don't refetch - the reducer will update the category optimistically
      // This prevents the UI from flickering/disappearing during updates

      // Refresh current counts after updating category
      dispatch(fetchCurrentCounts());

      return response;
    } catch (error) {
      logger.error('Failed to update menu category in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'menu/deleteCategory',
  async ({ entityId, entityType, categoryId }, { dispatch, rejectWithValue }) => {
    try {
      // Map entityType to API endpoint format
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/categories/${categoryId}`;

      await DatabaseService.deleteData(endpoint);

      logger.info('Menu category deleted successfully from database', {
        categoryId,
        entityId,
        entityType
      }, 'menuSlice');

      // Refresh categories list
      dispatch(fetchMenuCategories({ entityId, entityType }));

      // Refresh current counts after deleting category
      dispatch(fetchCurrentCounts());

      return categoryId;
    } catch (error) {
      logger.error('Failed to delete menu category from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Menu Modifiers
export const fetchMenuModifiers = createAsyncThunk(
  'menu/fetchMenuModifiers',
  async ({ entityId, entityType, limit = 1000 }, { rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      // Use public endpoint to avoid authentication issues for consumers
      const isPublicEndpoint = entityType === 'restaurant' || entityType === 'shop' || entityType === 'vendor';
      let baseEndpoint;
      
      if (isPublicEndpoint) {
        // Map vendor to shop for the endpoint path
        const publicType = entityType === 'vendor' ? 'shop' : entityType;
        baseEndpoint = `/menus/public/${publicType}/${entityId}/modifiers`;
      } else {
        baseEndpoint = `/menus/${ownerType}/${entityId}/modifiers`;
      }

      // Add limit as query parameter
      const endpoint = `${baseEndpoint}?limit=${limit}`;

      const response = await DatabaseService.getData(endpoint);

      const modifiers = Array.isArray(response) ? response : [];
      logger.info('Menu modifiers fetched from database', {
        entityId,
        entityType,
        count: modifiers.length
      }, 'menuSlice');

      return { modifiers, entityType, entityId };
    } catch (error) {
      logger.error('Failed to fetch menu modifiers from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const createModifier = createAsyncThunk(
  'menu/createModifier',
  async ({ entityId, entityType, modifierData }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/modifiers`;
      const response = await DatabaseService.saveData(endpoint, modifierData, 'POST');

      logger.info('Menu modifier created successfully in database', {
        modifierId: response.id || response._id,
        entityId,
        entityType
      }, 'menuSlice');

      dispatch(fetchMenuModifiers({ entityId, entityType }));

      // Refresh current counts after creating modifier
      dispatch(fetchCurrentCounts());

      return response;
    } catch (error) {
      logger.error('Failed to create menu modifier in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const updateModifier = createAsyncThunk(
  'menu/updateModifier',
  async ({ entityId, entityType, modifierId, modifierData }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/modifiers/${modifierId}`;
      const response = await DatabaseService.saveData(endpoint, modifierData, 'PUT');

      logger.info('Menu modifier updated successfully in database', {
        modifierId,
        entityId,
        entityType
      }, 'menuSlice');

      dispatch(fetchMenuModifiers({ entityId, entityType }));

      // Refresh current counts after updating modifier
      dispatch(fetchCurrentCounts());

      return response;
    } catch (error) {
      logger.error('Failed to update menu modifier in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const deleteModifier = createAsyncThunk(
  'menu/deleteModifier',
  async ({ entityId, entityType, modifierId }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/modifiers/${modifierId}`;
      await DatabaseService.deleteData(endpoint);

      logger.info('Menu modifier deleted successfully from database', {
        modifierId,
        entityId,
        entityType
      }, 'menuSlice');

      dispatch(fetchMenuModifiers({ entityId, entityType }));

      // Refresh current counts after deleting modifier
      dispatch(fetchCurrentCounts());

      return modifierId;
    } catch (error) {
      logger.error('Failed to delete menu modifier from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Menu Variants (Size, Portion, etc.)
export const fetchMenuVariants = createAsyncThunk(
  'menu/fetchMenuVariants',
  async ({ entityId, entityType, limit = 1000 }, { rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      // Use public endpoint to avoid authentication issues for consumers
      const isPublicEndpoint = entityType === 'restaurant' || entityType === 'shop' || entityType === 'vendor';
      let baseEndpoint;
      
      if (isPublicEndpoint) {
        // Map vendor to shop for the endpoint path
        const publicType = entityType === 'vendor' ? 'shop' : entityType;
        baseEndpoint = `/menus/public/${publicType}/${entityId}/variants`;
      } else {
        baseEndpoint = `/menus/${ownerType}/${entityId}/variants`;
      }

      // Add limit as query parameter
      const endpoint = `${baseEndpoint}?limit=${limit}`;

      const response = await DatabaseService.getData(endpoint);

      const variants = Array.isArray(response) ? response : [];
      logger.info('Menu variants fetched from database', {
        entityId,
        entityType,
        count: variants.length
      }, 'menuSlice');

      return { variants, entityType, entityId };
    } catch (error) {
      logger.error('Failed to fetch menu variants from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const createVariant = createAsyncThunk(
  'menu/createVariant',
  async ({ entityId, entityType, variantData }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/variants`;
      const response = await DatabaseService.saveData(endpoint, variantData, 'POST');

      logger.info('Menu variant created successfully in database', {
        variantId: response.id || response._id,
        entityId,
        entityType
      }, 'menuSlice');

      dispatch(fetchMenuVariants({ entityId, entityType }));

      // Refresh current counts after creating variant
      dispatch(fetchCurrentCounts());

      return response;
    } catch (error) {
      logger.error('Failed to create menu variant in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const updateVariant = createAsyncThunk(
  'menu/updateVariant',
  async ({ entityId, entityType, variantId, variantData }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/variants/${variantId}`;
      const response = await DatabaseService.saveData(endpoint, variantData, 'PUT');

      logger.info('Menu variant updated successfully in database', {
        variantId,
        entityId,
        entityType
      }, 'menuSlice');

      dispatch(fetchMenuVariants({ entityId, entityType }));

      // Refresh current counts after updating variant
      dispatch(fetchCurrentCounts());

      return response;
    } catch (error) {
      logger.error('Failed to update menu variant in database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const deleteVariant = createAsyncThunk(
  'menu/deleteVariant',
  async ({ entityId, entityType, variantId }, { dispatch, rejectWithValue }) => {
    try {
      const ownerType = entityType === 'restaurant' ? 'restaurant' :
        entityType === 'zone' ? 'zone' : 'shop';

      const endpoint = `/menus/${ownerType}/${entityId}/variants/${variantId}`;
      await DatabaseService.deleteData(endpoint);

      logger.info('Menu variant deleted successfully from database', {
        variantId,
        entityId,
        entityType
      }, 'menuSlice');

      dispatch(fetchMenuVariants({ entityId, entityType }));

      // Refresh current counts after deleting variant
      dispatch(fetchCurrentCounts());

      return variantId;
    } catch (error) {
      logger.error('Failed to delete menu variant from database', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Add hydration thunk for initial load from localStorage
export const hydrateMenuData = createAsyncThunk(
  'menu/hydrateMenuData',
  async ({ entityId, entityType, isDashboard = false }, { dispatch, rejectWithValue }) => {
    try {
      // Fetch all data simultaneously
      const [itemsResult, categoriesResult, modifiersResult] = await Promise.allSettled([
        dispatch(fetchMenuItems({ entityId, entityType, isDashboard })),
        dispatch(fetchMenuCategories({ entityId, entityType, isDashboard })),
        dispatch(fetchMenuModifiers({ entityId, entityType }))
      ]);

      logger.info('Menu data hydrated successfully', { entityId, entityType }, 'menuSlice');

      // Ensure all data is serializable (no Promises)
      const items = itemsResult.status === 'fulfilled' && itemsResult.value?.payload?.items
        ? Array.isArray(itemsResult.value.payload.items) ? itemsResult.value.payload.items : []
        : [];

      const categories = categoriesResult.status === 'fulfilled' && categoriesResult.value?.payload?.categories
        ? Array.isArray(categoriesResult.value.payload.categories) ? categoriesResult.value.payload.categories : []
        : [];

      const modifiers = modifiersResult.status === 'fulfilled' && modifiersResult.value?.payload?.modifiers
        ? Array.isArray(modifiersResult.value.payload.modifiers) ? modifiersResult.value.payload.modifiers : []
        : [];

      return {
        items,
        categories,
        modifiers,
        entityId,
        entityType
      };
    } catch (error) {
      logger.error('Failed to hydrate menu data', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// ===== SLICE DEFINITION =====

const initialState = {
  // Menu Items
  items: [],
  itemsLoading: false,
  itemsError: null,

  // Menu Categories
  categories: [],
  categoriesLoading: false,
  categoriesError: null,

  // Menu Modifiers
  modifiers: [],
  modifiersLoading: false,
  modifiersError: null,

  // Menu Variants
  variants: [],
  variantsLoading: false,
  variantsError: null,

  // Current context
  currentEntityType: null, // 'restaurant' or 'zone'
  currentEntityId: null,

  // Cache for performance
  lastFetchTime: null,

  // Persistence status
  isHydrated: false,
};

export const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    // Set current entity context
    setCurrentEntity: (state, action) => {
      const { entityType, entityId } = action.payload;
      state.currentEntityType = entityType;
      state.currentEntityId = entityId;
    },

    // Clear all menu data
    clearMenuData: (state) => {
      state.items = [];
      state.categories = [];
      state.modifiers = [];
      state.currentEntityType = null;
      state.currentEntityId = null;
      state.lastFetchTime = null;
    },

    // Direct setters for performance
    setItems: (state, action) => {
      state.items = action.payload;
      state.lastFetchTime = Date.now();
    },

    setCategories: (state, action) => {
      state.categories = action.payload;
    },

    setModifiers: (state, action) => {
      state.modifiers = action.payload;
    },

    // Mark hydration as complete
    markHydrated: (state) => {
      state.isHydrated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Menu Items
      .addCase(fetchMenuItems.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.itemsLoading = false;
        // Transform items to ensure consistent field names
        const rawItems = Array.isArray(action.payload?.items) ? action.payload.items : [];
        const transformedItems = rawItems.map(item => ({
          ...item,
          // Ensure we have the 'available' field for frontend checks
          available: item.available !== undefined ? item.available : item.isAvailable
        }));
        state.items = transformedItems;
        state.currentEntityType = action.payload?.entityType || null;
        state.currentEntityId = action.payload?.entityId || null;
        state.lastFetchTime = Date.now();
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload;
      })

      // Menu Categories
      .addCase(fetchMenuCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchMenuCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = Array.isArray(action.payload?.categories) ? action.payload.categories : [];
      })
      .addCase(fetchMenuCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload;
      })

      // Menu Modifiers
      .addCase(fetchMenuModifiers.pending, (state) => {
        state.modifiersLoading = true;
        state.modifiersError = null;
      })
      .addCase(fetchMenuModifiers.fulfilled, (state, action) => {
        state.modifiersLoading = false;
        state.modifiers = Array.isArray(action.payload?.modifiers) ? action.payload.modifiers : [];
      })
      .addCase(fetchMenuModifiers.rejected, (state, action) => {
        state.modifiersLoading = false;
        state.modifiersError = action.payload;
      })

      // Menu Variants
      .addCase(fetchMenuVariants.pending, (state) => {
        state.variantsLoading = true;
        state.variantsError = null;
      })
      .addCase(fetchMenuVariants.fulfilled, (state, action) => {
        state.variantsLoading = false;
        state.variants = Array.isArray(action.payload?.variants) ? action.payload.variants : [];
      })
      .addCase(fetchMenuVariants.rejected, (state, action) => {
        state.variantsLoading = false;
        state.variantsError = action.payload;
      })

      // Menu Data Hydration
      .addCase(hydrateMenuData.pending, (state) => {
        state.itemsLoading = true;
        state.categoriesLoading = true;
        state.modifiersLoading = true;
        state.variantsLoading = true;
      })
      .addCase(hydrateMenuData.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.categoriesLoading = false;
        state.modifiersLoading = false;
        state.variantsLoading = false;

        // Ensure only serializable arrays are stored
        // Transform items to ensure consistent field names
        const rawItems = Array.isArray(action.payload?.items) ? action.payload.items : [];
        const transformedItems = rawItems.map(item => ({
          ...item,
          // Ensure we have the 'available' field for frontend checks
          available: item.available !== undefined ? item.available : item.isAvailable
        }));
        state.items = transformedItems;
        state.categories = Array.isArray(action.payload?.categories) ? action.payload.categories : [];
        state.modifiers = Array.isArray(action.payload?.modifiers) ? action.payload.modifiers : [];
        state.variants = Array.isArray(action.payload?.variants) ? action.payload.variants : [];

        state.currentEntityType = action.payload?.entityType || null;
        state.currentEntityId = action.payload?.entityId || null;
        state.isHydrated = true;
        state.lastFetchTime = Date.now();
      })
      .addCase(hydrateMenuData.rejected, (state, action) => {
        state.itemsLoading = false;
        state.categoriesLoading = false;
        state.modifiersLoading = false;
        state.variantsLoading = false;
        state.itemsError = action.payload;
        state.categoriesError = action.payload;
        state.modifiersError = action.payload;
        state.variantsError = action.payload;
        state.isHydrated = true; // Mark as attempted even if failed
      })

      // Update Category - Handle optimistically to prevent UI flicker
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = null;
        
        // Update the specific category in the array instead of replacing the whole array
        const updatedCategory = action.payload;
        if (updatedCategory) {
          // Support both 'id' and '_id' fields
          const categoryId = updatedCategory.id || updatedCategory._id;
          if (categoryId) {
            const index = state.categories.findIndex(cat => 
              (cat.id === categoryId) || (cat._id === categoryId)
            );
            if (index !== -1) {
              // Preserve the ID format that was originally in the state
              state.categories[index] = {
                ...updatedCategory,
                id: state.categories[index].id || categoryId,
                _id: state.categories[index]._id || categoryId
              };
            }
          }
        }
      })

      // Update Menu Item - Handle optimistically to prevent UI flicker
      .addCase(updateMenuItem.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = null;

        // Backend returns { item: {...}, message: "..." } via saveData
        const updatedItem = action.payload?.item || action.payload;
        if (updatedItem && updatedItem.id) {
          const index = state.items.findIndex(item => item.id === updatedItem.id);
          if (index !== -1) {
            state.items[index] = {
              ...updatedItem,
              available: updatedItem.available !== undefined ? updatedItem.available : updatedItem.isAvailable
            };
          }
        }
      })

      // Handle all pending CUD operations
      .addMatcher(
        (action) => [
          createMenuItem.pending, updateMenuItem.pending, deleteMenuItem.pending,
          createCategory.pending, updateCategory.pending, deleteCategory.pending,
          createModifier.pending, updateModifier.pending, deleteModifier.pending,
          createVariant.pending, updateVariant.pending, deleteVariant.pending
        ].includes(action.type),
        (state) => {
          // Set appropriate loading state based on action type
          if (action.type.includes('MenuItem')) {
            state.itemsLoading = true;
          } else if (action.type.includes('Category')) {
            state.categoriesLoading = true;
          } else if (action.type.includes('Modifier')) {
            state.modifiersLoading = true;
          } else if (action.type.includes('Variant')) {
            state.variantsLoading = true;
          }
        }
      )

      // Handle all rejected CUD operations
      .addMatcher(
        (action) => [
          createMenuItem.rejected, updateMenuItem.rejected, deleteMenuItem.rejected,
          createCategory.rejected, updateCategory.rejected, deleteCategory.rejected,
          createModifier.rejected, updateModifier.rejected, deleteModifier.rejected,
          createVariant.rejected, updateVariant.rejected, deleteVariant.rejected
        ].includes(action.type),
        (state, action) => {
          // Set appropriate error state based on action type
          if (action.type.includes('MenuItem')) {
            state.itemsLoading = false;
            state.itemsError = action.payload;
          } else if (action.type.includes('Category')) {
            state.categoriesLoading = false;
            state.categoriesError = action.payload;
          } else if (action.type.includes('Modifier')) {
            state.modifiersLoading = false;
            state.modifiersError = action.payload;
          } else if (action.type.includes('Variant')) {
            state.variantsLoading = false;
            state.variantsError = action.payload;
          }
        }
      )

      // Handle all fulfilled CUD operations (except update which are handled above)
      .addMatcher(
        (action) => [
          createMenuItem.fulfilled, deleteMenuItem.fulfilled,
          createCategory.fulfilled, deleteCategory.fulfilled,
          createModifier.fulfilled, updateModifier.fulfilled, deleteModifier.fulfilled,
          createVariant.fulfilled, updateVariant.fulfilled, deleteVariant.fulfilled
        ].includes(action.type),
        (state, action) => {
          // Clear loading state and errors - data will be refreshed by refetch
          if (action.type.includes('MenuItem')) {
            state.itemsLoading = false;
            state.itemsError = null;
          } else if (action.type.includes('Category')) {
            state.categoriesLoading = false;
            state.categoriesError = null;
          } else if (action.type.includes('Modifier')) {
            state.modifiersLoading = false;
            state.modifiersError = null;
          } else if (action.type.includes('Variant')) {
            state.variantsLoading = false;
            state.variantsError = null;
          }
        }
      );
  },
});

// ===== ACTIONS =====
export const { setCurrentEntity, clearMenuData, setItems, setCategories, setModifiers, markHydrated } = menuSlice.actions;

// ===== SELECTORS =====

// Basic selectors
export const selectMenuItems = (state) => state.menu.items;
export const selectMenuItemsLoading = (state) => state.menu.itemsLoading;
export const selectMenuItemsError = (state) => state.menu.itemsError;
export const selectMenuCategories = (state) => state.menu.categories;
export const selectCategoriesLoading = (state) => state.menu.categoriesLoading;
export const selectCategoriesError = (state) => state.menu.categoriesError;
export const selectMenuModifiers = (state) => state.menu.modifiers;
export const selectModifiersLoading = (state) => state.menu.modifiersLoading;
export const selectModifiersError = (state) => state.menu.modifiersError;
export const selectMenuVariants = (state) => state.menu.variants;
export const selectVariantsLoading = (state) => state.menu.variantsLoading;
export const selectVariantsError = (state) => state.menu.variantsError;

// Memoized derived selectors
export const selectAvailableMenuItems = createSelector(
  [selectMenuItems],
  (items) => items.filter(item => item.available !== undefined ? item.available : item.isAvailable)
);

export const selectActiveCategories = createSelector(
  [selectMenuCategories],
  (categories) => categories.filter(cat => cat.active)
);

// Context selectors
export const selectCurrentEntity = createSelector(
  [(state) => state.menu.currentEntityType, (state) => state.menu.currentEntityId],
  (entityType, entityId) => ({ entityType, entityId })
);

// Parameterized memoized selectors
export const selectCategoryNameExists = createSelector(
  [selectMenuCategories, (state, categoryName) => categoryName, (state, categoryName, excludeId) => excludeId],
  (categories, categoryName, excludeId = null) => {
    return categories.some(cat =>
      cat.name.toLowerCase() === categoryName.toLowerCase() &&
      cat.id !== excludeId
    );
  }
);

export const selectItemsByCategory = createSelector(
  [selectMenuItems, (state, categoryId) => categoryId],
  (items, categoryId) => items.filter(item => item.categoryId === categoryId)
);

export const selectModifiersByType = createSelector(
  [selectMenuModifiers, (state, modifierType) => modifierType],
  (modifiers, modifierType) => modifiers.filter(modifier => modifier.type === modifierType)
);

export default menuSlice.reducer;