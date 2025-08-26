import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock data and localStorage functions
const getOwnersFromStorage = () => {
  const stored = localStorage.getItem('restaurantOwners');
  return stored ? JSON.parse(stored) : [];
};

const saveOwnersToStorage = (owners) => {
  localStorage.setItem('restaurantOwners', JSON.stringify(owners));
};

export const fetchOwners = createAsyncThunk(
  'owner/fetchOwners',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const owners = getOwnersFromStorage();
      return owners;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createOwner = createAsyncThunk(
  'owner/createOwner',
  async (ownerData, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const owners = getOwnersFromStorage();
      const newOwner = {
        id: `owner-${Date.now()}`,
        ...ownerData,
        status: 'active',
      };
      const updatedOwners = [...owners, newOwner];
      saveOwnersToStorage(updatedOwners);
      return newOwner;
    } catch (error) {
      return rejectWithValue(error.message);
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
      });
  },
});

export const { clearError } = ownerSlice.actions;
export default ownerSlice.reducer;
