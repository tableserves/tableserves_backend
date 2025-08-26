import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import DataService from '../../services/DataService';

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchDashboardStats',
  async (role, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      let stats;
      switch (role) {
        case 'admin':
          stats = DataService.getSuperAdminStats();
          break;
        case 'restaurant_owner':
          stats = DataService.getRestaurantOwnerStats(user.restaurantId);
          break;
        case 'zone_admin':
          stats = DataService.getZoneAdminStats(user.zoneId);
          break;
        case 'zone_shop':
          stats = DataService.getZoneShopStats(user.shopId);
          break;
        default:
          throw new Error('Invalid role for dashboard stats');
      }
      return stats;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  stats: null,
  loading: false,
  error: null,
};

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default dashboardSlice.reducer;