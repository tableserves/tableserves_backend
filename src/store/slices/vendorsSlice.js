import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { zoneAPI } from '../../shared/api/api';

// Fetch vendors for a zone
export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (zoneId, { rejectWithValue }) => {
    try {
      const response = await zoneAPI.getVendorsByZone(zoneId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add a new vendor to a zone
export const addVendor = createAsyncThunk(
  'vendors/addVendor',
  async ({ zoneId, vendorData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await zoneAPI.addVendorToZone(zoneId, vendorData);
      dispatch(fetchVendors(zoneId)); // Refetch vendors
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a vendor in a zone
export const updateVendor = createAsyncThunk(
  'vendors/updateVendor',
  async ({ zoneId, vendorId, vendorData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await zoneAPI.updateVendorInZone(zoneId, vendorId, vendorData);
      dispatch(fetchVendors(zoneId)); // Refetch vendors
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a vendor from a zone
export const deleteVendor = createAsyncThunk(
  'vendors/deleteVendor',
  async ({ zoneId, vendorId }, { dispatch, rejectWithValue }) => {
    try {
      await zoneAPI.deleteVendorInZone(zoneId, vendorId);
      dispatch(fetchVendors(zoneId)); // Refetch vendors
      return vendorId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const vendorsSlice = createSlice({
  name: 'vendors',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    setVendors: (state, action) => {
      state.list = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // CUD operations
      .addMatcher(
        (action) => [addVendor.pending, updateVendor.pending, deleteVendor.pending].includes(action.type),
        (state) => {
          state.loading = true;
        }
      )
      .addMatcher(
        (action) => [addVendor.rejected, updateVendor.rejected, deleteVendor.rejected].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      )
      .addMatcher(
        (action) => [addVendor.fulfilled, updateVendor.fulfilled, deleteVendor.fulfilled].includes(action.type),
        (state) => {
          state.loading = false;
        }
      );
  },
});

export const { setVendors } = vendorsSlice.actions;

export default vendorsSlice.reducer;