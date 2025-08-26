import { createSlice } from '@reduxjs/toolkit';
import { RESTAURANT_PLANS, ZONE_PLANS, resolvePlanMetadata } from '../../constants/plans';

const initialState = {
  // persisted via LocalStorageService elsewhere (auth user carries plan)
  current: null, // { plan, planType, maxTables, maxVendors?, features, status }
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription(state, action) {
      state.current = action.payload; // trust validated metadata
    },
    clearSubscription(state) {
      state.current = null;
    },
    upgradePlan(state, action) {
      const { planKey, planType, custom } = action.payload;
      state.current = resolvePlanMetadata({ planKey, planType, custom });
    },
  },
});

export const { setSubscription, clearSubscription, upgradePlan } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

export const selectSubscription = (state) => state.subscription.current;
export const isFeatureEnabled = (state, featureKey) => !!state.subscription.current?.features?.[featureKey];

export { RESTAURANT_PLANS, ZONE_PLANS };

