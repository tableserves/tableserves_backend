import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import LocalStorageService from '../../services/LocalStorageService';

export const fetchMenuModifiers = createAsyncThunk(
  'menuModifiers/fetchMenuModifiers',
  async ({ restaurantId, zoneId, shopId }, { rejectWithValue }) => {
    try {
      const menuItems = LocalStorageService.getMenuItems({ restaurantId, zoneId, shopId });
      const modifiers = menuItems.modifiers || [];
      return modifiers;
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

export const menuModifiersSlice = createSlice({
  name: 'menuModifiers',
  initialState,
  reducers: {
    setModifiers: (state, action) => {
      state.modifiers = action.payload;
    },
    addModifier: (state, action) => {
      state.modifiers.push(action.payload);
    },
    updateModifier: (state, action) => {
      const index = state.modifiers.findIndex(modifier => modifier.id === action.payload.id);
      if (index !== -1) {
        state.modifiers[index] = action.payload;
      }
    },
    deleteModifier: (state, action) => {
      state.modifiers = state.modifiers.filter(modifier => modifier.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenuModifiers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuModifiers.fulfilled, (state, action) => {
        state.loading = false;
        state.modifiers = action.payload;
      })
      .addCase(fetchMenuModifiers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setModifiers, addModifier, updateModifier, deleteModifier } = menuModifiersSlice.actions;

export const selectAvailableModifiers = (state) => {
  return state.menuModifiers.modifiers;
};

export const selectModifierNameExists = (state, modifierName, excludeId = null) => {
  return state.menuModifiers.modifiers.some(mod =>
    mod.name.toLowerCase() === modifierName.toLowerCase() &&
    mod.id !== excludeId
  );
};

export default menuModifiersSlice.reducer;