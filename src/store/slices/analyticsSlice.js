import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsAPI } from '../../services/api';

export const fetchRestaurantAnalytics = createAsyncThunk(
  'analytics/fetchRestaurantAnalytics',
  async ({ restaurantId, period }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getRestaurantAnalytics(restaurantId, period);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const fetchPlatformAnalytics = createAsyncThunk(
  'analytics/fetchPlatformAnalytics',
  async (period, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getPlatformAnalytics(period);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    restaurantData: null,
    platformData: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurantAnalytics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRestaurantAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurantData = action.payload;
      })
      .addCase(fetchRestaurantAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPlatformAnalytics.fulfilled, (state, action) => {
        state.platformData = action.payload;
      });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;