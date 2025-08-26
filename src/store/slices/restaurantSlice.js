import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import LocalStorageService from '../../services/LocalStorageService';

export const fetchRestaurantDetails = createAsyncThunk(
  'restaurant/fetchRestaurantDetails',
  async ({ restaurantId, zoneId }, { rejectWithValue }) => {
    try {
      const details = LocalStorageService.getRestaurantDetails({ restaurantId, zoneId });
      return details;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  details: null,
  loading: false,
  error: null,
};

export const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurantDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurantDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.details = action.payload;
      })
      .addCase(fetchRestaurantDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default restaurantSlice.reducer;