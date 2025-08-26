import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import LocalStorageService from '../../services/LocalStorageService';

// Fetch menu items and categories
export const fetchMenuItems = createAsyncThunk(
  'menuItems/fetchMenuItems',
  async ({ restaurantId, shopId }, { rejectWithValue }) => {
    try {
      const items = LocalStorageService.getMenuItems({ restaurantId, shopId });
      const categories = LocalStorageService.getRestaurantCategories(restaurantId);
      return { menuItems: items, categories: categories };
    } catch (error) {
      const message = error.message || error.toString();
      return rejectWithValue(message);
    }
  }
);

// Create a new menu item
export const createMenuItem = createAsyncThunk(
  'menuItems/createMenuItem',
  async ({ restaurantId, categoryId, itemData }, { dispatch, rejectWithValue }) => {
    try {
      const currentItems = LocalStorageService.getMenuItems({ restaurantId });
      const newItem = {
        id: Date.now().toString(),
        ...itemData,
        categoryId,
        restaurantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedItems = [...currentItems, newItem];
      LocalStorageService.saveMenuItems(restaurantId, updatedItems);
      dispatch(fetchMenuItems({ restaurantId }));
      return newItem;
    } catch (error) {
      const message = error.message || error.toString();
      return rejectWithValue(message);
    }
  }
);

// Update a menu item
export const updateMenuItem = createAsyncThunk(
  'menuItems/updateMenuItem',
  async ({ restaurantId, itemId, itemData }, { dispatch, rejectWithValue }) => {
    try {
      const currentItems = LocalStorageService.getMenuItems({ restaurantId });
      const itemIndex = currentItems.findIndex(item => item.id === itemId);
      if (itemIndex > -1) {
        const updatedItem = {
          ...currentItems[itemIndex],
          ...itemData,
          updatedAt: new Date().toISOString(),
        };
        const updatedItems = [...currentItems];
        updatedItems[itemIndex] = updatedItem;
        LocalStorageService.saveMenuItems(restaurantId, updatedItems);
        dispatch(fetchMenuItems({ restaurantId }));
        return updatedItem;
      } else {
        return rejectWithValue('Item not found');
      }
    } catch (error) {
      const message = error.message || error.toString();
      return rejectWithValue(message);
    }
  }
);

// Delete a menu item
export const deleteMenuItem = createAsyncThunk(
  'menuItems/deleteMenuItem',
  async ({ restaurantId, itemId }, { dispatch, rejectWithValue }) => {
    try {
      const currentItems = LocalStorageService.getMenuItems({ restaurantId });
      const updatedItems = currentItems.filter(item => item.id !== itemId);
      LocalStorageService.saveMenuItems(restaurantId, updatedItems);
      dispatch(fetchMenuItems({ restaurantId }));
      return itemId;
    } catch (error) {
      const message = error.message || error.toString();
      return rejectWithValue(message);
    }
  }
);


const initialState = {
  categories: [],
  dishes: [],
  loading: false,
  error: null,
};

export const menuItemsSlice = createSlice({
  name: 'menuItems',
  initialState,
  reducers: {
    setItems: (state, action) => {
      state.categories = action.payload.categories || [];
      state.dishes = action.payload.dishes || [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.loading = false;
        console.log('menuItemsSlice - fetchMenuItems.fulfilled - action.payload.menuItems:', action.payload.menuItems);
        state.dishes = action.payload.menuItems || [];
        state.categories = action.payload.categories || [];
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createMenuItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(createMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateMenuItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteMenuItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Matcher for fulfilled CUD operations
      .addMatcher(
        (action) => [createMenuItem.fulfilled, updateMenuItem.fulfilled, deleteMenuItem.fulfilled].includes(action.type),
        (state) => {
          state.loading = false;
        }
      );
  },
});

export const { setItems } = menuItemsSlice.actions;

export default menuItemsSlice.reducer;