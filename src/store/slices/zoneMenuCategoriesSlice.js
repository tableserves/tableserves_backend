import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { zoneAPI } from '../../services/api';

// Fetch menu categories for a zone
export const fetchZoneMenuCategories = createAsyncThunk(
  'zoneMenuCategories/fetchZoneMenuCategories',
  async (zoneId, { rejectWithValue }) => {
    try {
      const response = await zoneAPI.getZoneMenuCategories(zoneId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create a new menu category in a zone
export const createZoneMenuCategory = createAsyncThunk(
  'zoneMenuCategories/createZoneMenuCategory',
  async ({ zoneId, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await zoneAPI.createZoneMenuCategory(zoneId, categoryData);
      dispatch(fetchZoneMenuCategories(zoneId)); // Refetch categories
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a menu category in a zone
export const updateZoneMenuCategory = createAsyncThunk(
  'zoneMenuCategories/updateZoneMenuCategory',
  async ({ zoneId, categoryId, categoryData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await zoneAPI.updateZoneMenuCategory(zoneId, categoryId, categoryData);
      dispatch(fetchZoneMenuCategories(zoneId)); // Refetch categories
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a menu category from a zone
export const deleteZoneMenuCategory = createAsyncThunk(
  'zoneMenuCategories/deleteZoneMenuCategory',
  async ({ zoneId, categoryId }, { dispatch, rejectWithValue }) => {
    try {
      await zoneAPI.deleteZoneMenuCategory(zoneId, categoryId);
      dispatch(fetchZoneMenuCategories(zoneId)); // Refetch categories
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

export const zoneMenuCategoriesSlice = createSlice({
  name: 'zoneMenuCategories',
  initialState,
  reducers: {
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchZoneMenuCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZoneMenuCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchZoneMenuCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // CUD operations
      .addMatcher(
        (action) => [createZoneMenuCategory.pending, updateZoneMenuCategory.pending, deleteZoneMenuCategory.pending].includes(action.type),
        (state) => {
          state.loading = true;
        }
      )
      .addMatcher(
        (action) => [createZoneMenuCategory.rejected, updateZoneMenuCategory.rejected, deleteZoneMenuCategory.rejected].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      )
      .addMatcher(
        (action) => [createZoneMenuCategory.fulfilled, updateZoneMenuCategory.fulfilled, deleteZoneMenuCategory.fulfilled].includes(action.type),
        (state) => {
          state.loading = false;
        }
      );
  },
});

export const { setCategories } = zoneMenuCategoriesSlice.actions;

export default zoneMenuCategoriesSlice.reducer;
