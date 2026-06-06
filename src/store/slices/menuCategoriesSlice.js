/**
 * Menu Categories Slice - Updated to use RTK Query
 * 
 * This slice now primarily manages UI state and delegates data operations to RTK Query.
 * The actual CRUD operations are handled by menuApi hooks.
 */

import { createSlice } from '@reduxjs/toolkit';
import { logger } from '../../shared/logging/logger';

const initialState = {
  categories: [],
  loading: false,
  error: null,
  // UI state for category management
  selectedCategory: null,
  isEditing: false,
  editingCategory: null,
};

export const menuCategoriesSlice = createSlice({
  name: 'menuCategories',
  initialState,
  reducers: {
    // Legacy support for components that still use setCategories
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
    // UI state management
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setIsEditing: (state, action) => {
      state.isEditing = action.payload;
    },
    setEditingCategory: (state, action) => {
      state.editingCategory = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Local state updates for optimistic UI
    setLocalCategories: (state, action) => {
      state.categories = action.payload;
    },
    addLocalCategory: (state, action) => {
      state.categories.push(action.payload);
    },
    updateLocalCategory: (state, action) => {
      const index = state.categories.findIndex(cat => cat.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    removeLocalCategory: (state, action) => {
      state.categories = state.categories.filter(cat => cat.id !== action.payload);
    },
  },
});

export const {
  setCategories,
  setSelectedCategory,
  setIsEditing,
  setEditingCategory,
  clearError,
  setLocalCategories,
  addLocalCategory,
  updateLocalCategory,
  removeLocalCategory,
} = menuCategoriesSlice.actions;

// Selectors
export const selectAvailableCategories = (state) => {
  return state.menuCategories.categories.filter(cat => cat.active !== false);
};

export const selectCategoryNameExists = (state, categoryName, excludeId = null) => {
  return state.menuCategories.categories.some(cat => 
    cat.name.toLowerCase() === categoryName.toLowerCase() && 
    cat.id !== excludeId
  );
};

export const selectMenuCategories = (state) => state.menuCategories.categories;
export const selectSelectedCategory = (state) => state.menuCategories.selectedCategory;
export const selectIsEditing = (state) => state.menuCategories.isEditing;
export const selectEditingCategory = (state) => state.menuCategories.editingCategory;
export const selectMenuCategoriesError = (state) => state.menuCategories.error;

// Helper functions for components to use with RTK Query
export const menuCategoriesHelpers = {
  // Log successful operations
  logSuccess: (operation, data) => {
    logger.info(`Menu category ${operation} successful`, data);
  },
  
  // Log errors
  logError: (operation, error) => {
    logger.error(`Menu category ${operation} failed`, error);
  },
  
  // Transform category data for API
  transformCategoryForApi: (categoryData) => {
    return {
      ...categoryData,
      sortOrder: parseInt(categoryData.sortOrder) || 0,
      isActive: Boolean(categoryData.isActive !== false),
      displayOrder: parseInt(categoryData.displayOrder) || 0,
    };
  },
  
  // Validate category data
  validateCategory: (categoryData) => {
    const errors = [];
    
    if (!categoryData.name || categoryData.name.trim().length === 0) {
      errors.push('Category name is required');
    }
    
    if (categoryData.name && categoryData.name.length > 50) {
      errors.push('Category name must be 50 characters or less');
    }
    
    if (categoryData.description && categoryData.description.length > 200) {
      errors.push('Category description must be 200 characters or less');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
};

export default menuCategoriesSlice.reducer;

// MIGRATION NOTE:
// This slice has been updated to work with RTK Query.
// Components should now use the following RTK Query hooks instead of dispatching thunks:
// 
// - useGetMenuCategoriesQuery({ restaurantId, zoneId })
// - useCreateMenuCategoryMutation()
// - useUpdateMenuCategoryMutation()
// - useDeleteMenuCategoryMutation()
//
// The old thunks (fetchMenuCategories, createCategory, updateCategory, deleteCategory) 
// have been removed and replaced with RTK Query mutations and queries.
// 
// Example usage in components:
// ```
// import { useGetMenuCategoriesQuery, useCreateMenuCategoryMutation } from '../../store/api/menuApi';
// 
// const { data: categories, isLoading } = useGetMenuCategoriesQuery({ restaurantId });
// const [createCategory] = useCreateMenuCategoryMutation();
// ```