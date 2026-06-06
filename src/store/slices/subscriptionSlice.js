import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RESTAURANT_PLANS, ZONE_PLANS, resolvePlanMetadata, mapBackendToFrontendPlanKey } from '../../features/subscription/constants/plans';
import RealtimeDatabaseService from '../../services/RealtimeDatabaseService';
import logger from '../../services/LoggingService';

// Async thunks for real-time subscription data
export const fetchCurrentSubscription = createAsyncThunk(
  'subscription/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      logger.info('Fetching current subscription from backend', {}, 'subscriptionSlice');
      const subscription = await RealtimeDatabaseService.getCurrentSubscription();
      return subscription;
    } catch (error) {
      logger.error('Failed to fetch current subscription', error, 'subscriptionSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSubscriptionLimits = createAsyncThunk(
  'subscription/fetchLimits',
  async (_, { rejectWithValue }) => {
    try {
      const limits = await RealtimeDatabaseService.getSubscriptionLimits();
      return limits;
    } catch (error) {
      logger.error('Failed to fetch subscription limits', error, 'subscriptionSlice');
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCurrentCounts = createAsyncThunk(
  'subscription/fetchCounts',
  async (_, { rejectWithValue }) => {
    try {
      const counts = await RealtimeDatabaseService.getCurrentCounts();
      return counts;
    } catch (error) {
      logger.error('Failed to fetch current counts', error, 'subscriptionSlice');
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Real-time subscription data from backend (no localStorage)
  current: null, // { plan, planType, maxTables, maxVendors?, features, status }
  limits: null, // { maxTables, maxVendors, maxCategories, etc. }
  currentCounts: null, // { tables, vendors, categories, etc. }
  loading: false,
  error: null,
  lastFetched: null
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription(state, action) {
      const subscription = action.payload;

      // If subscription has a backend plan key, map it to frontend plan key
      if (subscription && subscription.planKey && subscription.planType) {
        const frontendPlanKey = mapBackendToFrontendPlanKey(subscription.planKey, subscription.planType);

        // Create a normalized subscription object with frontend plan key
        state.current = {
          ...subscription,
          planKey: frontendPlanKey,
          key: frontendPlanKey, // Also set 'key' for compatibility
        };
      } else {
        state.current = subscription; // trust validated metadata
      }
      state.lastFetched = Date.now();
    },
    clearSubscription(state) {
      state.current = null;
      state.limits = null;
      state.currentCounts = null;
      state.error = null;
      state.lastFetched = null;
    },
    upgradePlan(state, action) {
      const { planKey, planType, custom } = action.payload;
      state.current = resolvePlanMetadata({ planKey, planType, custom });
    },
    setLimits(state, action) {
      state.limits = action.payload;
    },
    setCounts(state, action) {
      state.currentCounts = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch current subscription
      .addCase(fetchCurrentSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentSubscription.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure payload is serializable (not a Promise)
        const subscription = action.payload;
        if (subscription && typeof subscription === 'object' && !subscription.then) {
          state.current = subscription;
        } else {
          state.current = null;
        }
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchCurrentSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch subscription limits
      .addCase(fetchSubscriptionLimits.fulfilled, (state, action) => {
        // Ensure payload is serializable (not a Promise)
        const limits = action.payload;
        if (limits && typeof limits === 'object' && !limits.then) {
          state.limits = limits;
        } else {
          // Fallback to free plan limits (NO HARDCODING)
          const planType = state.current?.planType || 'restaurant';
          const freePlan = planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
          state.limits = {
            maxTables: freePlan.maxTables || 1,
            maxVendors: freePlan.maxVendors || (planType === 'zone' ? 1 : 0),
            maxShops: freePlan.maxShops || (planType === 'zone' ? 1 : 0),
            maxCategories: freePlan.maxCategories || 1,
            maxMenuItems: freePlan.maxMenuItems || 2,
            maxUsers: 1,
            maxOrdersPerMonth: 50,
            maxStorageGB: 1
          };
        }
      })
      // Fetch current counts
      .addCase(fetchCurrentCounts.fulfilled, (state, action) => {
        // Ensure payload is serializable (not a Promise)
        const counts = action.payload;
        if (counts && typeof counts === 'object' && !counts.then) {
          state.currentCounts = counts;
        } else {
          // Fallback to default counts if payload is invalid
          state.currentCounts = {
            tables: 0,
            vendors: 0,
            categories: 0,
            menuItems: 0,
            users: 0,
            ordersThisMonth: 0,
            storageUsedGB: 0
          };
        }
      })
      .addCase(fetchCurrentCounts.rejected, (state, action) => {
        // Handle rejected case for fetchCurrentCounts
        state.error = action.payload;
        // Keep current counts if fetch fails
      });
  }
});

export const { setSubscription, clearSubscription, upgradePlan, setLimits, setCounts } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

export const selectSubscription = (state) => state.subscription.current;
export const isFeatureEnabled = (state, featureKey) => !!state.subscription.current?.features?.[featureKey];

export { RESTAURANT_PLANS, ZONE_PLANS };

