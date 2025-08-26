import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { zoneAPI } from '../../services/api';

export const fetchZoneAndShops = createAsyncThunk(
  'zone/fetchZoneAndShops',
  async (zoneId, { rejectWithValue }) => {
    try {
      const response = await zoneAPI.getById(zoneId);
      // Assuming the API at /zones/:zoneId returns an object like { zone: {...}, shops: [...] }
      return response.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  zone: null,
  shops: [],
  loading: false,
  error: null,
};

export const zoneSlice = createSlice({
  name: 'zone',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchZoneAndShops.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZoneAndShops.fulfilled, (state, action) => {
        state.loading = false;
        state.zone = action.payload.zone;
        state.shops = action.payload.shops;
      })
      .addCase(fetchZoneAndShops.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default zoneSlice.reducer;
