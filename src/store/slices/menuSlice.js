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
import logger from '../../services/LoggingService';

// ===== ASYNC THUNKS =====

// Menu Items
export const fetchMenuItems = createAsyncThunk(
  'menu/fetchMenuItems',
  async ({ restaurantId, shopId, zoneId, entityType = 'restaurant' }, { rejectWithValue }) => {
    try {
      const items = dataAccessLayer.getMenuItems({ restaurantId, shopId, zoneId });
      return { items, entityType, entityId: restaurantId || shopId };
    } catch (error) {
      logger.error('Failed to fetch menu items', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const createMenuItem = createAsyncThunk(
  'menu/createMenuItem',
  async ({ entityId, entityType, categoryId, itemData }, { dispatch, rejectWithValue }) => {
    try {
      const currentItems = dataAccessLayer.getMenuItems({ 
        restaurantId: entityType === 'restaurant' ? entityId : null,
        shopId: entityType === 'vendor' ? entityId : null,
        zoneId: entityType === 'vendor' ? itemData.zoneId : null
      });
      
      const newItem = {
        id: Date.now().toString(),
        ...itemData,
        categoryId,
        entityId,
        entityType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedItems = [...currentItems, newItem];
      const success = dataAccessLayer.saveMenuItems(entityId, updatedItems, entityType);
      
      if (success) {
        dispatch(fetchMenuItems({ 
          restaurantId: entityType === 'restaurant' ? entityId : null,
          shopId: entityType === 'vendor' ? entityId : null,
          zoneId: entityType === 'vendor' ? itemData.zoneId : null,
          entityType 
        }));
        logger.info('Menu item created successfully', { itemId: newItem.id, entityId }, 'menuSlice');
        return newItem;
      } else {
        throw new Error('Failed to save menu item');
      }
    } catch (error) {
      logger.error('Failed to create menu item', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'menu/updateMenuItem',
  async ({ entityId, entityType, itemId, itemData }, { dispatch, rejectWithValue }) => {
    try {
      const currentItems = dataAccessLayer.getMenuItems({ 
        restaurantId: entityType === 'restaurant' ? entityId : null,
        shopId: entityType === 'vendor' ? entityId : null,
        zoneId: entityType === 'vendor' ? itemData.zoneId : null
      });
      
      const itemIndex = currentItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Menu item not found');
      }
      
      const updatedItem = {
        ...currentItems[itemIndex],
        ...itemData,
        updatedAt: new Date().toISOString(),
      };
      
      const updatedItems = [...currentItems];
      updatedItems[itemIndex] = updatedItem;
      
      const success = dataAccessLayer.saveMenuItems(entityId, updatedItems, entityType);
      
      if (success) {
        dispatch(fetchMenuItems({ 
          restaurantId: entityType === 'restaurant' ? entityId : null,
          shopId: entityType === 'vendor' ? entityId : null,
          zoneId: entityType === 'vendor' ? itemData.zoneId : null,
          entityType 
        }));
        logger.info('Menu item updated successfully', { itemId, entityId }, 'menuSlice');
        return updatedItem;
      } else {
        throw new Error('Failed to save menu item');
      }
    } catch (error) {
      logger.error('Failed to update menu item', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  'menu/deleteMenuItem',
  async ({ entityId, entityType, itemId, zoneId }, { dispatch, rejectWithValue }) => {
    try {
      const currentItems = dataAccessLayer.getMenuItems({ 
        restaurantId: entityType === 'restaurant' ? entityId : null,
        shopId: entityType === 'vendor' ? entityId : null,
        zoneId: entityType === 'vendor' ? zoneId : null
      });
      
      const updatedItems = currentItems.filter(item => item.id !== itemId);
      const success = dataAccessLayer.saveMenuItems(entityId, updatedItems, entityType);
      
      if (success) {
        dispatch(fetchMenuItems({ 
          restaurantId: entityType === 'restaurant' ? entityId : null,
          shopId: entityType === 'vendor' ? entityId : null,
          zoneId: entityType === 'vendor' ? zoneId : null,
          entityType 
        }));
        logger.info('Menu item deleted successfully', { itemId, entityId }, 'menuSlice');
        return itemId;
      } else {
        throw new Error('Failed to save menu items');
      }
    } catch (error) {
      logger.error('Failed to delete menu item', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Menu Categories
export const fetchMenuCategories = createAsyncThunk(
  'menu/fetchMenuCategories',
  async ({ entityId, entityType }, { rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_categories_${entityId}`
        : `zone_menu_categories_${entityId}`;
      
      const categories = dataAccessLayer.getData(key, []);
      return { categories, entityType, entityId };
    } catch (error) {
      logger.error('Failed to fetch menu categories', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'menu/createCategory',
  async ({ entityId, entityType, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_categories_${entityId}`
        : `zone_menu_categories_${entityId}`;
      
      const currentCategories = dataAccessLayer.getData(key, []);
      const newCategory = {
        id: Date.now().toString(),
        ...categoryData,
        entityId,
        entityType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedCategories = [...currentCategories, newCategory];
      const success = dataAccessLayer.setData(key, updatedCategories);
      
      if (success) {
        dispatch(fetchMenuCategories({ entityId, entityType }));
        logger.info('Menu category created successfully', { categoryId: newCategory.id, entityId }, 'menuSlice');
        return newCategory;
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error) {
      logger.error('Failed to create menu category', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'menu/updateCategory',
  async ({ entityId, entityType, categoryId, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_categories_${entityId}`
        : `zone_menu_categories_${entityId}`;
      
      const currentCategories = dataAccessLayer.getData(key, []);
      const categoryIndex = currentCategories.findIndex(cat => cat.id === categoryId);
      
      if (categoryIndex === -1) {
        throw new Error('Category not found');
      }
      
      const updatedCategory = {
        ...currentCategories[categoryIndex],
        ...categoryData,
        updatedAt: new Date().toISOString(),
      };
      
      const updatedCategories = [...currentCategories];
      updatedCategories[categoryIndex] = updatedCategory;
      
      const success = dataAccessLayer.setData(key, updatedCategories);
      
      if (success) {
        dispatch(fetchMenuCategories({ entityId, entityType }));
        logger.info('Menu category updated successfully', { categoryId, entityId }, 'menuSlice');
        return updatedCategory;
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error) {
      logger.error('Failed to update menu category', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'menu/deleteCategory',
  async ({ entityId, entityType, categoryId }, { dispatch, rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_categories_${entityId}`
        : `zone_menu_categories_${entityId}`;
      
      const currentCategories = dataAccessLayer.getData(key, []);
      const updatedCategories = currentCategories.filter(cat => cat.id !== categoryId);
      
      const success = dataAccessLayer.setData(key, updatedCategories);
      
      if (success) {
        dispatch(fetchMenuCategories({ entityId, entityType }));
        logger.info('Menu category deleted successfully', { categoryId, entityId }, 'menuSlice');
        return categoryId;
      } else {
        throw new Error('Failed to save categories');
      }
    } catch (error) {
      logger.error('Failed to delete menu category', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Menu Modifiers
export const fetchMenuModifiers = createAsyncThunk(
  'menu/fetchMenuModifiers',
  async ({ entityId, entityType }, { rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_modifiers_${entityId}`
        : `zone_menu_modifiers_${entityId}`;
      
      const modifiers = dataAccessLayer.getData(key, []);
      return { modifiers, entityType, entityId };
    } catch (error) {
      logger.error('Failed to fetch menu modifiers', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const createModifier = createAsyncThunk(
  'menu/createModifier',
  async ({ entityId, entityType, modifierData }, { dispatch, rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_modifiers_${entityId}`
        : `zone_menu_modifiers_${entityId}`;
      
      const currentModifiers = dataAccessLayer.getData(key, []);
      const newModifier = {
        id: Date.now().toString(),
        ...modifierData,
        entityId,
        entityType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedModifiers = [...currentModifiers, newModifier];
      const success = dataAccessLayer.setData(key, updatedModifiers);
      
      if (success) {
        dispatch(fetchMenuModifiers({ entityId, entityType }));
        logger.info('Menu modifier created successfully', { modifierId: newModifier.id, entityId }, 'menuSlice');
        return newModifier;
      } else {
        throw new Error('Failed to save modifier');
      }
    } catch (error) {
      logger.error('Failed to create menu modifier', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const updateModifier = createAsyncThunk(
  'menu/updateModifier',
  async ({ entityId, entityType, modifierId, modifierData }, { dispatch, rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_modifiers_${entityId}`
        : `zone_menu_modifiers_${entityId}`;
      
      const currentModifiers = dataAccessLayer.getData(key, []);
      const modifierIndex = currentModifiers.findIndex(mod => mod.id === modifierId);
      
      if (modifierIndex === -1) {
        throw new Error('Modifier not found');
      }
      
      const updatedModifier = {
        ...currentModifiers[modifierIndex],
        ...modifierData,
        updatedAt: new Date().toISOString(),
      };
      
      const updatedModifiers = [...currentModifiers];
      updatedModifiers[modifierIndex] = updatedModifier;
      
      const success = dataAccessLayer.setData(key, updatedModifiers);
      
      if (success) {
        dispatch(fetchMenuModifiers({ entityId, entityType }));
        logger.info('Menu modifier updated successfully', { modifierId, entityId }, 'menuSlice');
        return updatedModifier;
      } else {
        throw new Error('Failed to save modifier');
      }
    } catch (error) {
      logger.error('Failed to update menu modifier', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const deleteModifier = createAsyncThunk(
  'menu/deleteModifier',
  async ({ entityId, entityType, modifierId }, { dispatch, rejectWithValue }) => {
    try {
      const key = entityType === 'restaurant' 
        ? `restaurant_menu_modifiers_${entityId}`
        : `zone_menu_modifiers_${entityId}`;
      
      const currentModifiers = dataAccessLayer.getData(key, []);
      const updatedModifiers = currentModifiers.filter(mod => mod.id !== modifierId);
      
      const success = dataAccessLayer.setData(key, updatedModifiers);
      
      if (success) {
        dispatch(fetchMenuModifiers({ entityId, entityType }));
        logger.info('Menu modifier deleted successfully', { modifierId, entityId }, 'menuSlice');
        return modifierId;
      } else {
        throw new Error('Failed to save modifiers');
      }
    } catch (error) {
      logger.error('Failed to delete menu modifier', error, 'menuSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Add hydration thunk for initial load from localStorage
export const hydrateMenuData = createAsyncThunk(
  'menu/hydrateMenuData',
  async ({ entityId, entityType }, { dispatch, rejectWithValue }) => {
    try {
      // Fetch all data simultaneously
      const [itemsResult, categoriesResult, modifiersResult] = await Promise.allSettled([
        dispatch(fetchMenuItems({ 
          restaurantId: entityType === 'restaurant' ? entityId : null,
          shopId: entityType === 'vendor' ? entityId : null,
          entityType 
        })),
        dispatch(fetchMenuCategories({ entityId, entityType })),
        dispatch(fetchMenuModifiers({ entityId, entityType }))
      ]);
      
      logger.info('Menu data hydrated successfully', { entityId, entityType }, 'menuSlice');
      
      return {
        items: itemsResult.status === 'fulfilled' ? itemsResult.value.payload.items : [],
        categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.payload.categories : [],
        modifiers: modifiersResult.status === 'fulfilled' ? modifiersResult.value.payload.modifiers : [],
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
        state.items = action.payload.items;
        state.currentEntityType = action.payload.entityType;
        state.currentEntityId = action.payload.entityId;
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
        state.categories = action.payload.categories;
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
        state.modifiers = action.payload.modifiers;
      })
      .addCase(fetchMenuModifiers.rejected, (state, action) => {
        state.modifiersLoading = false;
        state.modifiersError = action.payload;
      })
      
      // Menu Data Hydration
      .addCase(hydrateMenuData.pending, (state) => {
        state.itemsLoading = true;
        state.categoriesLoading = true;
        state.modifiersLoading = true;
      })
      .addCase(hydrateMenuData.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.categoriesLoading = false;
        state.modifiersLoading = false;
        state.items = action.payload.items || [];
        state.categories = action.payload.categories || [];
        state.modifiers = action.payload.modifiers || [];
        state.currentEntityType = action.payload.entityType;
        state.currentEntityId = action.payload.entityId;
        state.isHydrated = true;
        state.lastFetchTime = Date.now();
      })
      .addCase(hydrateMenuData.rejected, (state, action) => {
        state.itemsLoading = false;
        state.categoriesLoading = false;
        state.modifiersLoading = false;
        state.itemsError = action.payload;
        state.categoriesError = action.payload;
        state.modifiersError = action.payload;
        state.isHydrated = true; // Mark as attempted even if failed
      })
      
      // Handle all pending CUD operations
      .addMatcher(
        (action) => [
          createMenuItem.pending, updateMenuItem.pending, deleteMenuItem.pending,
          createCategory.pending, updateCategory.pending, deleteCategory.pending,
          createModifier.pending, updateModifier.pending, deleteModifier.pending
        ].includes(action.type),
        (state) => {
          // Set appropriate loading state based on action type
          if (action.type.includes('MenuItem')) {
            state.itemsLoading = true;
          } else if (action.type.includes('Category')) {
            state.categoriesLoading = true;
          } else if (action.type.includes('Modifier')) {
            state.modifiersLoading = true;
          }
        }
      )
      
      // Handle all rejected CUD operations
      .addMatcher(
        (action) => [
          createMenuItem.rejected, updateMenuItem.rejected, deleteMenuItem.rejected,
          createCategory.rejected, updateCategory.rejected, deleteCategory.rejected,
          createModifier.rejected, updateModifier.rejected, deleteModifier.rejected
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
          }
        }
      )
      
      // Handle all fulfilled CUD operations
      .addMatcher(
        (action) => [
          createMenuItem.fulfilled, updateMenuItem.fulfilled, deleteMenuItem.fulfilled,
          createCategory.fulfilled, updateCategory.fulfilled, deleteCategory.fulfilled,
          createModifier.fulfilled, updateModifier.fulfilled, deleteModifier.fulfilled
        ].includes(action.type),
        (state) => {
          // Clear loading state - data will be refreshed by refetch
          if (action.type.includes('MenuItem')) {
            state.itemsLoading = false;
          } else if (action.type.includes('Category')) {
            state.categoriesLoading = false;
          } else if (action.type.includes('Modifier')) {
            state.modifiersLoading = false;
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

// Memoized derived selectors
export const selectAvailableMenuItems = createSelector(
  [selectMenuItems],
  (items) => items.filter(item => item.available)
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