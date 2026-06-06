import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AuthService from '../../shared/auth/AuthService';
import simpleTokenService from '../../shared/auth/SimpleTokenService';
import { getUserFriendlyErrorMessage } from '../../shared/utils/errorMessageUtils';







const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  businessEntity: null,
  isAuthenticated: false,
  error: null,
  loading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.businessEntity = action.payload.businessEntity || null;
      state.isAuthenticated = true;
      state.error = null;
    },
    setBusinessOwner: (state, action) => {
      // Transition user to business owner mode
      const { businessType, businessId, subscription } = action.payload;
      
      if (state.user) {
        state.user = {
          ...state.user,
          role: businessType === 'restaurant' ? 'restaurant_owner' : 'zone_admin',
          businessType,
          isBusinessOwner: true,
          ...(businessType === 'restaurant' && { restaurantId: businessId }),
          ...(businessType === 'zone' && { zoneId: businessId }),
          subscription,
          registrationComplete: true,
          onboardingComplete: true
        };
        state.isAuthenticated = true;
      }
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.businessEntity = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder


  },
});

export const { setCredentials, setBusinessOwner, logout, setError, clearError } = authSlice.actions;



export default authSlice.reducer;