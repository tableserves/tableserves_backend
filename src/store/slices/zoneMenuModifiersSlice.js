import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { zoneAPI } from '../../services/api';

// Fetch menu modifiers for a zone
export const fetchZoneMenuModifiers = createAsyncThunk(
  'zoneMenuModifiers/fetchZoneMenuModifiers',
  async (zoneId, { rejectWithValue }) => {
    try {
      const response = await zoneAPI.getZoneMenuModifiers(zoneId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create a new menu modifier in a zone
export const createZoneMenuModifier = createAsyncThunk(
  'zoneMenuModifiers/createZoneMenuModifier',
  async ({ zoneId, modifierData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await zoneAPI.createZoneMenuModifier(zoneId, modifierData);
      dispatch(fetchZoneMenuModifiers(zoneId)); // Refetch modifiers
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a menu modifier in a zone
export const updateZoneMenuModifier = createAsyncThunk(
  'zoneMenuModifiers/updateZoneMenuModifier',
  async ({ zoneId, modifierId, modifierData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await zoneAPI.updateZoneMenuModifier(zoneId, modifierId, modifierData);
      dispatch(fetchZoneMenuModifiers(zoneId)); // Refetch modifiers
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a menu modifier from a zone
export const deleteZoneMenuModifier = createAsyncThunk(
  'zoneMenuModifiers/deleteZoneMenuModifier',
  async ({ zoneId, modifierId }, { dispatch, rejectWithValue }) => {
    try {
      await zoneAPI.deleteZoneMenuModifier(zoneId, modifierId);
      dispatch(fetchZoneMenuModifiers(zoneId)); // Refetch modifiers
      return modifierId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  modifiers: [],
  loading: false,
  error: null,
};

export const zoneMenuModifiersSlice = createSlice({
  name: 'zoneMenuModifiers',
  initialState,
  reducers: {
    setModifiers: (state, action) => {
      state.modifiers = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchZoneMenuModifiers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZoneMenuModifiers.fulfilled, (state, action) => {
        state.loading = false;
        state.modifiers = action.payload;
      })
      .addCase(fetchZoneMenuModifiers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // CUD operations
      .addMatcher(
        (action) => [createZoneMenuModifier.pending, updateZoneMenuModifier.pending, deleteZoneMenuModifier.pending].includes(action.type),
        (state) => {
          state.loading = true;
        }
      )
      .addMatcher(
        (action) => [createZoneMenuModifier.rejected, updateZoneMenuModifier.rejected, deleteZoneMenuModifier.rejected].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      )
      .addMatcher(
        (action) => [createZoneMenuModifier.fulfilled, updateZoneMenuModifier.fulfilled, deleteZoneMenuModifier.fulfilled].includes(action.type),
        (state) => {
          state.loading = false;
        }
      );
  },
});

export const { setModifiers } = zoneMenuModifiersSlice.actions;

export default zoneMenuModifiersSlice.reducer;
