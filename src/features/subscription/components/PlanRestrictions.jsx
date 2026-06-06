import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { FaCrown } from 'react-icons/fa';

// Import plan configurations
import { RESTAURANT_PLANS, ZONE_PLANS, mapBackendToFrontendPlanKey } from '../constants/plans';

// Import services
import DatabaseService from '../../../services/DatabaseService';
import RealtimeDatabaseService from '../../../services/RealtimeDatabaseService';

// Import Redux actions
import { fetchCurrentSubscription, fetchSubscriptionLimits, fetchCurrentCounts } from '../../../store/slices/subscriptionSlice';

// Plan Status Component
const PlanStatusBadge = ({ subscription, currentCounts }) => {
  const navigate = useNavigate();
  const { restaurantId, zoneId } = useParams();

  if (!subscription) {
    return (
      <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
        No Plan
      </div>
    );
  }

  // Clean up plan name - remove any (Unlimited) text and format properly
  let planName = subscription.label || subscription.name || subscription.key;
  if (planName) {
    planName = planName.replace(' (Unlimited)', '').replace('(Unlimited)', '');
  }
  
  const isPremium = subscription.key === 'premium';

  return (
    <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 ${
      isPremium 
        ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200' 
        : 'bg-blue-100 text-blue-800 border border-blue-200'
    }`}>
      {isPremium && <FaCrown className="text-purple-600 text-xs" />}
      <span>{planName}</span>
      {isPremium && (
        <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold">
          PREMIUM
        </span>
      )}
    </div>
  );
};

// Feature Restriction Component
const FeatureRestriction = ({ feature, subscription, currentCounts, children }) => {
  if (!subscription) {
    return null;
  }

  const isUnlimited = subscription.features?.unlimited || subscription.key === 'premium';
  
  if (isUnlimited) {
    return children;
  }

  // Check specific feature limits
  const limits = {
    tables: subscription.maxTables || subscription.limits?.maxTables || 5,
    vendors: subscription.maxVendors || subscription.limits?.maxVendors || 3,
    categories: subscription.maxCategories || subscription.limits?.maxCategories || 10,
    menuItems: subscription.maxMenuItems || subscription.limits?.maxMenuItems || 50
  };

  const current = currentCounts?.[feature] || 0;
  const limit = limits[feature];

  if (current >= limit) {
    return (
      <div className="text-gray-400 cursor-not-allowed">
        {children}
        <div className="text-xs text-red-500 mt-1">
          Limit reached ({current}/{limit})
        </div>
      </div>
    );
  }

  return children;
};

// Limit Reached Modal Component
const LimitReachedModal = ({ isOpen, onClose, onUpgrade, feature, current, limit, planType }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Limit Reached</h3>
        <p className="text-gray-600 mb-4">
          You've reached your {feature} limit ({current}/{limit}). 
          Upgrade your plan to add more {feature}.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              // Use the onUpgrade prop instead of hardcoded navigation
              if (onUpgrade) {
                onUpgrade();
              } else {
                // Fallback to generic upgrade page
                window.location.href = '/upgrade';
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Plan Restrictions Hook
export const usePlanRestrictions = () => {
  const { restaurantId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Redux state
  const subscriptionFromState = useSelector((state) => state.subscription.current);
  const subscriptionLimits = useSelector((state) => state.subscription.limits);
  const currentCounts = useSelector((state) => state.subscription.currentCounts);
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  // Local state
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(null);

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      setLoading(true);
      
      try {
        let finalSubscription = null;

        // PRIORITY 1: Always try to fetch fresh data from backend first (ensures latest data after page refresh)
        if (isAuthenticated && user?.id) {
          console.log('PlanRestrictions: Fetching real-time subscription from backend (primary)');
          try {
            const realtimeSubscription = await RealtimeDatabaseService.getCurrentSubscription();
            if (realtimeSubscription) {
              console.log('PlanRestrictions: Got fresh subscription from backend:', realtimeSubscription);
              finalSubscription = realtimeSubscription;
              
              // Update Redux state with fresh data
              dispatch(fetchCurrentSubscription());
              dispatch(fetchSubscriptionLimits());
              dispatch(fetchCurrentCounts());
            }
          } catch (error) {
            console.warn('PlanRestrictions: Failed to fetch real-time subscription, trying Redux fallback:', error);
          }
        }

        // PRIORITY 2: Use Redux subscription as fallback if backend fails
        if (!finalSubscription && subscriptionFromState) {
          console.log('PlanRestrictions: Using Redux subscription as fallback:', subscriptionFromState);
          finalSubscription = subscriptionFromState;
        }

        // PRIORITY 3: Use default plan only if no data available
        if (!finalSubscription) {
          console.log('PlanRestrictions: No subscription found, using default plan based on context');
          
          // Determine the correct plan type based on context
          const planType = zoneId ? 'zone' : 'restaurant';
          const defaultPlan = planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;

          finalSubscription = {
            ...defaultPlan,
            key: 'free',
            label: 'Free Starter',
            planType
          };
          
          console.log('PlanRestrictions: Using default plan:', {
            planType,
            zoneId,
            restaurantId,
            finalSubscription
          });
        }

        setSubscription(finalSubscription);
        
      } catch (error) {
        console.error('PlanRestrictions: Error loading subscription:', error);
        
        // Fallback to default free plan
        const planType = zoneId ? 'zone' : 'restaurant';
        const defaultPlan = planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
        
        setSubscription({
          ...defaultPlan,
          key: 'free',
          label: 'Free Starter',
          planType
        });
      } finally {
        setLoading(false);
      }
    };

    // Only load once when component mounts or when user authentication changes
    if (isAuthenticated && user?.id) {
      loadSubscription();
    }
  }, [isAuthenticated, user?.id, zoneId, restaurantId, dispatch]); // Removed subscriptionFromState to prevent re-fetching

  // SEAMLESS UPGRADE SYNC: When the Redux subscription changes (e.g. after a plan upgrade),
  // update the local state mirror so every component using usePlanRestrictions reflects the
  // new plan IMMEDIATELY — no page refresh required, no re-fetch from the backend.
  //
  // We deliberately keep this in a SEPARATE effect from the loader above so:
  //   • The loader still only runs on mount / auth change (avoiding the infinite re-fetch loop
  //     the original author was worried about — that's why the comment above says
  //     "Removed subscriptionFromState to prevent re-fetching")
  //   • This effect just mirrors Redux → local state, with no network calls, so it's cheap.
  //
  // Without this, the restaurant upgrade looks smooth (because Redux state updates) but the
  // zone upgrade appeared broken — the loader had already cached a stale subscription in
  // local state, and there was nothing pushing the Redux update back into that local state.
  useEffect(() => {
    if (subscriptionFromState) {
      setSubscription((prev) => {
        // Avoid unnecessary state updates if the subscription is structurally identical.
        // We use a shallow comparison on the fields that actually drive UI gating.
        if (
          prev &&
          prev.key === subscriptionFromState.key &&
          prev.planKey === subscriptionFromState.planKey &&
          prev.planType === subscriptionFromState.planType &&
          prev.status === subscriptionFromState.status
        ) {
          return prev;
        }
        return subscriptionFromState;
      });
    }
  }, [subscriptionFromState]);

  // Check if user can perform an action
  const checkLimit = async (type, increment = 1) => {
    console.log('CheckLimit called:', { 
      type, 
      increment, 
      subscription: subscription?.key, 
      subscriptionPlanType: subscription?.planType,
      currentCounts,
      fullSubscription: subscription,
      restaurantId,
      zoneId
    });
    
    if (!subscription) {
      console.log('No subscription found, allowing access (default behavior)');
      return true;
    }

    // Premium users have unlimited access to everything
    const isPremium = subscription.key === 'premium' ||
                     subscription.plan === 'premium' ||
                     (subscription.planKey && subscription.planType &&
                      mapBackendToFrontendPlanKey(subscription.planKey, subscription.planType) === 'premium');

    if (isPremium) {
      console.log('Premium user - unlimited access granted');
      return true;
    }

    // Get current counts (use real-time data if available)
    const counts = currentCounts || await RealtimeDatabaseService.getCurrentCounts();
    const current = counts[type] || 0;
    
    // Get limits
    const limits = subscriptionLimits || await RealtimeDatabaseService.getSubscriptionLimits();
    let limit;
    
    if (type === 'vendors' || type === 'shops') {
      limit = limits.maxVendors || subscription.maxVendors || subscription.maxShops || 3;
    } else {
      const limitPropertyName = `max${type.charAt(0).toUpperCase() + type.slice(1)}`;
      limit = limits[limitPropertyName] || subscription[limitPropertyName] || 5;
    }
    
    console.log('Detailed limit check:', {
      type,
      current,
      limit,
      increment,
      wouldExceed: (current + increment) > limit,
      subscription: subscription?.key
    });

    const wouldExceed = (current + increment) > limit;
    
    if (wouldExceed) {
      console.log('Limit would be exceeded, showing modal');
      setShowLimitModal({
        isOpen: true,
        feature: type,
        current,
        limit,
        planType: subscription.planType
      });
      return false;
    }

    return true;
  };

  // Close limit modal
  const closeLimitModal = () => {
    setShowLimitModal(null);
  };

  // Handle upgrade
  const handleUpgrade = () => {
    closeLimitModal();
    
    // Determine the correct upgrade path based on current context
    if (zoneId) {
      navigate(`/zone/${zoneId}/upgrade`);
    } else if (restaurantId) {
      navigate(`/restaurant/${restaurantId}/upgrade`);
    } else {
      // Fallback to generic upgrade page
      navigate('/upgrade');
    }
  };

  return {
    subscription,
    subscriptionLimits,
    currentCounts: currentCounts || { tables: 0, categories: 0, menuItems: 0, shops: 0, vendors: 0 },
    loading,
    checkLimit,
    PlanStatusBadge: (props) => <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} {...props} />,
    FeatureRestriction,
    LimitReachedModal: showLimitModal ? (
      <LimitReachedModal
        {...showLimitModal}
        onClose={closeLimitModal}
        onUpgrade={handleUpgrade}
      />
    ) : null
  };
};

export { PlanStatusBadge, FeatureRestriction, LimitReachedModal };
export default usePlanRestrictions;
