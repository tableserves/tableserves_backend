import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchOwners = createAsyncThunk(
  'owner/fetchOwners',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/restaurants');
      return response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createOwner = createAsyncThunk(
  'owner/createOwner',
  async (ownerData, { rejectWithValue }) => {
    try {
      const response = await api.post('/restaurants', ownerData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateOwner = createAsyncThunk(
  'owner/updateOwner',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/restaurants/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteOwner = createAsyncThunk(
  'owner/deleteOwner',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/restaurants/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const ownerSlice = createSlice({
  name: 'owner',
  initialState: {
    owners: [],
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
      .addCase(fetchOwners.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOwners.fulfilled, (state, action) => {
        state.owners = action.payload;
        state.loading = false;
      })
      .addCase(fetchOwners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createOwner.pending, (state) => {
        state.loading = true;
      })
      .addCase(createOwner.fulfilled, (state, action) => {
        state.owners.push(action.payload);
        state.loading = false;
      })
      .addCase(createOwner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateOwner.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateOwner.fulfilled, (state, action) => {
        const index = state.owners.findIndex(owner => owner._id === action.payload._id);
        if (index !== -1) {
          state.owners[index] = action.payload;
        }
        state.loading = false;
      })
      .addCase(updateOwner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteOwner.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteOwner.fulfilled, (state, action) => {
        state.owners = state.owners.filter(owner => owner._id !== action.payload);
        state.loading = false;
      })
      .addCase(deleteOwner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = ownerSlice.actions;
export default ownerSlice.reducer;
