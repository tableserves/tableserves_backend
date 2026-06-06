/**
 * Menu Items Slice - Updated to use RTK Query
 * 
 * This slice now primarily manages UI state and delegates data operations to RTK Query.
 * The actual CRUD operations are handled by menuApi hooks.
 */

import { createSlice } from '@reduxjs/toolkit';
import { logger } from '../../shared/logging/logger';

const initialState = {
  categories: [],
  dishes: [],
  loading: false,
  error: null,
  // UI state for menu management
  selectedCategory: null,
  isEditing: false,
  editingItem: null,
};

export const menuItemsSlice = createSlice({
  name: 'menuItems',
  initialState,
  reducers: {
    // Legacy support for components that still use setItems
    setItems: (state, action) => {
      state.categories = action.payload.categories || [];
      state.dishes = action.payload.dishes || [];
    },
    // UI state management
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setIsEditing: (state, action) => {
      state.isEditing = action.payload;
    },
    setEditingItem: (state, action) => {
      state.editingItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Local state updates for optimistic UI
    setLocalCategories: (state, action) => {
      state.categories = action.payload;
    },
    setLocalMenuItems: (state, action) => {
      state.dishes = action.payload;
    },
    addLocalMenuItem: (state, action) => {
      state.dishes.push(action.payload);
    },
    updateLocalMenuItem: (state, action) => {
      const index = state.dishes.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.dishes[index] = action.payload;
      }
    },
    removeLocalMenuItem: (state, action) => {
      state.dishes = state.dishes.filter(item => item.id !== action.payload);
    },
  },
});

export const {
  setItems,
  setSelectedCategory,
  setIsEditing,
  setEditingItem,
  clearError,
  setLocalCategories,
  setLocalMenuItems,
  addLocalMenuItem,
  updateLocalMenuItem,
  removeLocalMenuItem,
} = menuItemsSlice.actions;

// Selectors
export const selectMenuItems = (state) => state.menuItems.dishes;
export const selectMenuCategories = (state) => state.menuItems.categories;
export const selectSelectedCategory = (state) => state.menuItems.selectedCategory;
export const selectIsEditing = (state) => state.menuItems.isEditing;
export const selectEditingItem = (state) => state.menuItems.editingItem;
export const selectMenuItemsError = (state) => state.menuItems.error;

// Helper functions for components to use with RTK Query
export const menuItemsHelpers = {
  // Log successful operations
  logSuccess: (operation, data) => {
    logger.info(`Menu ${operation} successful`, data);
  },
  
  // Log errors
  logError: (operation, error) => {
    logger.error(`Menu ${operation} failed`, error);
  },
  
  // Transform menu item data for API
  transformItemForApi: (itemData) => {
    return {
      ...itemData,
      price: parseFloat(itemData.price) || 0,
      isAvailable: Boolean(itemData.isAvailable),
      preparationTime: parseInt(itemData.preparationTime) || 15,
    };
  },
  
  // Transform category data for API
  transformCategoryForApi: (categoryData) => {
    return {
      ...categoryData,
      sortOrder: parseInt(categoryData.sortOrder) || 0,
      isActive: Boolean(categoryData.isActive),
    };
  },
};

export default menuItemsSlice.reducer;

// MIGRATION NOTE:
// This slice has been updated to work with RTK Query.
// Components should now use the following RTK Query hooks instead of dispatching thunks:
// 
// For Menu Items:
// - useGetMenuItemsQuery({ restaurantId, zoneId, vendorId })
// - useCreateMenuItemMutation()
// - useUpdateMenuItemMutation()
// - useDeleteMenuItemMutation()
// 
// For Categories:
// - useGetMenuCategoriesQuery({ restaurantId, zoneId })
// - useCreateMenuCategoryMutation()
// - useUpdateMenuCategoryMutation()
// - useDeleteMenuCategoryMutation()
//
// The old thunks (fetchMenuItems, createMenuItem, updateMenuItem, deleteMenuItem) 
// have been removed and replaced with RTK Query mutations and queries.
// 
// Example usage in components:
// ```
// import { useGetMenuItemsQuery, useCreateMenuItemMutation } from '../../store/api/menuApi';
// 
// const { data: menuItems, isLoading } = useGetMenuItemsQuery({ restaurantId });
// const [createMenuItem] = useCreateMenuItemMutation();
// ```