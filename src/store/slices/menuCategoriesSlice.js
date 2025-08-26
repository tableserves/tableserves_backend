import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import LocalStorageService from '../../services/LocalStorageService';

// Fetch menu categories
export const fetchMenuCategories = createAsyncThunk(
  'menuCategories/fetchMenuCategories',
  async ({ restaurantId }, { rejectWithValue }) => {
    try {
      const categories = LocalStorageService.getRestaurantCategories(restaurantId);
      return categories;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create a new category
export const createCategory = createAsyncThunk(
  'menuCategories/createCategory',
  async ({ restaurantId, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      const currentCategories = LocalStorageService.getRestaurantCategories(restaurantId);
      const newCategory = {
        id: Date.now().toString(),
        ...categoryData,
        restaurantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedCategories = [...currentCategories, newCategory];
      LocalStorageService.saveRestaurantCategories(restaurantId, updatedCategories);
      dispatch(fetchMenuCategories({ restaurantId }));
      return newCategory;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a category
export const updateCategory = createAsyncThunk(
  'menuCategories/updateCategory',
  async ({ restaurantId, categoryId, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      const currentCategories = LocalStorageService.getRestaurantCategories(restaurantId);
      const categoryIndex = currentCategories.findIndex(cat => cat.id === categoryId);
      if (categoryIndex > -1) {
        const updatedCategory = {
          ...currentCategories[categoryIndex],
          ...categoryData,
          updatedAt: new Date().toISOString(),
        };
        const updatedCategories = [...currentCategories];
        updatedCategories[categoryIndex] = updatedCategory;
        LocalStorageService.saveRestaurantCategories(restaurantId, updatedCategories);
        dispatch(fetchMenuCategories({ restaurantId }));
        return updatedCategory;
      } else {
        return rejectWithValue('Category not found');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a category
export const deleteCategory = createAsyncThunk(
  'menuCategories/deleteCategory',
  async ({ restaurantId, categoryId }, { dispatch, rejectWithValue }) => {
    try {
      const currentCategories = LocalStorageService.getRestaurantCategories(restaurantId);
      const updatedCategories = currentCategories.filter(cat => cat.id !== categoryId);
      LocalStorageService.saveRestaurantCategories(restaurantId, updatedCategories);
      dispatch(fetchMenuCategories({ restaurantId }));
      return categoryId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  categories: [],
  loading: false,
  error: null,
};

export const menuCategoriesSlice = createSlice({
  name: 'menuCategories',
  initialState,
  reducers: {
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchMenuCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchMenuCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fulfilled cases for CUD are handled by refetching, but you could add them
      // for optimistic updates if desired. Refetching is simpler and safer.
      .addMatcher(
        (action) => [createCategory.fulfilled, updateCategory.fulfilled, deleteCategory.fulfilled].includes(action.type),
        (state) => {
          state.loading = false; // Stop loading after CUD operation is done (and refetch is likely complete)
        }
      );
  },
});

export const { setCategories } = menuCategoriesSlice.actions;

export const selectAvailableCategories = (state) => {
  return state.menuCategories.categories.filter(cat => cat.active);
};

export const selectCategoryNameExists = (state, categoryName, excludeId = null) => {
  return state.menuCategories.categories.some(cat => 
    cat.name.toLowerCase() === categoryName.toLowerCase() && 
    cat.id !== excludeId
  );
};

export default menuCategoriesSlice.reducer;