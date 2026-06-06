import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaCrown,
  FaRocket,
  FaCheck,
  FaBuilding,
  FaTable,
  FaUtensils,
  FaChartLine,
  FaQrcode,
  FaBolt,
  FaArrowUp,
  FaStar,
  FaShieldAlt,
  FaHeadset,
  FaInfoCircle
} from 'react-icons/fa';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../../../features/subscription/constants/plans';
import { usePlanRestrictions } from '../../../features/subscription/components/PlanRestrictions';
import {
  setSubscription,
  fetchCurrentSubscription,
  fetchSubscriptionLimits,
  fetchCurrentCounts
} from '../../../store/slices/subscriptionSlice';
import { updateUserSubscription } from '../../../store/slices/uiSlice';
import PaymentModal from '../../../shared/payments/components/PaymentModal';
import PaymentSuccessModal from '@/shared/payments/components/PaymentSuccessModal';
import DatabaseService from '../../../services/DatabaseService';

const UpgradeTab = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get subscription data from Redux store
  const subscription = useSelector((state) => state.subscription.current);
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);
  const { currentCounts, subscriptionLimits, loading } = usePlanRestrictions();

  // Extract current usage metrics
  const subscriptionUsage = subscription?.usage || {};
  const finalCounts = {
    tables: subscriptionUsage.currentTables || currentCounts?.tables || 0,
    categories: subscriptionUsage.currentCategories || currentCounts?.categories || 0,
    menuItems: subscriptionUsage.currentMenuItems || currentCounts?.menuItems || 0,
    shops: subscriptionUsage.currentShops || currentCounts?.shops || 0,
    vendors: subscriptionUsage.currentVendors || currentCounts?.vendors || 0
  };

  // Extract current plan limits
  const subscriptionDbLimits = subscription?.limits || {};
  const finalLimits = {
    maxTables: subscriptionDbLimits.maxTables || subscriptionLimits?.maxTables || 5,
    maxCategories: subscriptionDbLimits.maxCategories || subscriptionLimits?.maxCategories || 8,
    maxMenuItems: subscriptionDbLimits.maxMenuItems || subscriptionLimits?.maxMenuItems || 80,
    maxShops: subscriptionDbLimits.maxShops || subscriptionLimits?.maxShops || 3,
    maxVendors: subscriptionDbLimits.maxVendors || subscriptionLimits?.maxVendors || 0
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  const planType = subscription?.planType || (user?.zoneId ? 'zone' : 'restaurant');

  // Normalize current plan key - use planKey first, then key, then fallback
  let currentPlan = subscription?.planKey || subscription?.key || subscription?.plan || user?.subscriptionPlan || 'free';
  if (['restaurant_basic', 'restaurant_starter', 'zone_basic'].includes(currentPlan)) currentPlan = 'basic';
  if (['restaurant_advanced', 'restaurant_professional', 'zone_advanced', 'zone_professional'].includes(currentPlan)) currentPlan = 'advanced';
  if (['restaurant_premium', 'restaurant_enterprise', 'zone_premium', 'zone_enterprise'].includes(currentPlan)) currentPlan = 'premium';
  if (currentPlan === 'free_plan') currentPlan = 'free';

  const isPremiumUser = currentPlan === 'premium';
  const allPlans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;

  const planLevels = { free: 0, basic: 1, advanced: 2, premium: 3 };
  const currentLevel = planLevels[currentPlan] || 0;

  // Show all paid plans in the grid
  const availablePlans = Object.values(allPlans).filter(plan => plan.key !== 'free' && plan.priceINR !== null);
  const currentPlanData = allPlans[currentPlan] || allPlans['free'];

  const handleUpgrade = (planKey) => {
    const plan = allPlans[planKey];
    setSelectedPlanForPayment(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setShowPaymentModal(false);
    setPaymentData(paymentResult);

    try {
      await updateSubscriptionAfterPayment(paymentResult.plan);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to update frontend state after payment:', error);
      setShowSuccessModal(true);
    }
  };

  const updateSubscriptionAfterPayment = useCallback(async (newPlan) => {
    try {
      let freshSubscriptionData;
      if (user?.restaurantId) {
        freshSubscriptionData = await DatabaseService.getData(`/restaurants/${user.restaurantId}`);
      } else if (user?.zoneId) {
        freshSubscriptionData = await DatabaseService.getData(`/zones/${user.zoneId}`);
      } else {
        throw new Error('User has no associated restaurantId or zoneId.');
      }

      const updatedSubscription = freshSubscriptionData.subscriptionId || freshSubscriptionData.subscription || freshSubscriptionData;

      localStorage.setItem('tableserve_subscription', JSON.stringify(updatedSubscription));
      dispatch(setSubscription(updatedSubscription));
      dispatch(updateUserSubscription({ subscriptionPlan: updatedSubscription.plan, subscription: updatedSubscription }));

      if (isAuthenticated && user) {
        dispatch(updateUserSubscription({
          user: { ...user, subscription: updatedSubscription }
        }));
      }

      // Also fan out fresh data through the standard thunks so EVERY consumer of
      // `state.subscription.current`, `state.subscription.limits`, and `state.subscription.currentCounts`
      // sees the upgrade immediately. Without this, pages that read limits/counts from those
      // canonical Redux slices (most of the dashboard) stayed stuck on the previous plan's
      // values until a manual refresh — which is exactly what the user reported for zone admin.
      dispatch(fetchCurrentSubscription());
      dispatch(fetchSubscriptionLimits());
      dispatch(fetchCurrentCounts());
    } catch (error) {
      console.error('Error updating subscription state after payment:', error);
    }
  }, [dispatch, isAuthenticated, user]);

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setPaymentData(null);
    setSelectedPlanForPayment(null);
  };

  // Reusable Limit Card Component
  const LimitCard = ({ label, value, icon: Icon }) => (
    <div className="bg-theme-bg-primary p-4 rounded-2xl border border-theme-border-primary flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-theme-accent-primary/10 text-theme-accent-primary flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-theme-text-secondary text-xs uppercase tracking-widest font-bold mb-0.5">{label}</p>
        <p className="text-theme-text-primary font-fredoka text-xl">
          {value === -1 || value > 1000 ? 'Unlimited' : value}
        </p>
      </div>
    </div>
  );

  // Reusable Usage Progress Bar Component
  const UsageBar = ({ label, current, max, icon: Icon }) => {
    const isUnlimited = max === -1 || max > 1000;
    const percentage = isUnlimited ? 100 : Math.min(100, (current / max) * 100);
    const isNearLimit = !isUnlimited && percentage > 85;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end text-sm">
          <span className="flex items-center gap-2 text-theme-text-secondary font-medium">
            <Icon className="text-theme-text-tertiary" /> {label}
          </span>
          <span className="font-fredoka text-theme-text-primary">
            {current} <span className="text-theme-text-tertiary text-xs font-sans">/ {isUnlimited ? '∞' : max}</span>
          </span>
        </div>
        <div className="h-2 w-full bg-theme-bg-hover rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUnlimited ? 'bg-green-500' : isNearLimit ? 'bg-status-error' : 'bg-theme-accent-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {isNearLimit && !isUnlimited && (
          <p className="text-[10px] text-status-error font-semibold mt-1">Approaching limit. Consider upgrading.</p>
        )}
      </div>
    );
  };

  // Render Plan Cards
  const PlanCard = ({ plan, isRecommended, isCurrent, isDowngrade }) => (
    <motion.div
      whileHover={{ y: isDowngrade ? 0 : -8 }}
      className={`relative rounded-3xl border backdrop-blur-xl transition-all duration-300 flex flex-col h-full overflow-hidden ${
        isCurrent
          ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.15)] bg-gradient-to-b from-green-500/5 to-theme-bg-secondary transform md:-translate-y-2 z-10 ring-1 ring-green-500'
          : isDowngrade
            ? 'border-theme-border-primary bg-theme-bg-primary/40 opacity-80' 
            : isRecommended
              ? 'border-theme-accent-primary bg-theme-bg-secondary shadow-[0_8px_30px_rgba(var(--theme-accent-primary-rgb),0.15)] ring-1 ring-theme-accent-primary/50'
              : 'border-theme-border-primary bg-theme-bg-secondary/60 shadow-lg hover:border-theme-text-tertiary/30'
      }`}
    >
      {isRecommended && !isCurrent && !isDowngrade && (
        <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-theme-accent-primary to-purple-600 text-white text-[10px] uppercase tracking-widest font-bold py-1.5 text-center">
          Next Step Up
        </div>
      )}

      {isCurrent && (
        <div className="absolute top-0 inset-x-0 bg-green-500 text-white text-[11px] uppercase tracking-widest font-black py-2 text-center flex items-center justify-center gap-2 shadow-md">
          <FaCheck className="w-3 h-3" />
          Active Plan
        </div>
      )}

      <div className={`p-8 flex flex-col h-full ${(isRecommended || isCurrent) && !isDowngrade ? 'pt-12' : ''}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
            isCurrent ? 'bg-green-500 text-white shadow-green-500/30' :
            isDowngrade ? 'bg-theme-bg-hover text-theme-text-tertiary' :
            isRecommended ? 'bg-theme-accent-primary/10 text-theme-accent-primary' : 
            'bg-blue-500/10 text-blue-500'
          }`}>
            {plan.key === 'basic' ? <FaRocket size={20} /> : plan.key === 'advanced' ? <FaStar size={20} /> : <FaCrown size={20} />}
          </div>
          <div>
            <h3 className={`font-fredoka text-xl ${isDowngrade ? 'text-theme-text-secondary' : 'text-theme-text-primary'}`}>
              {plan.label}
            </h3>
            <p className="text-theme-text-tertiary font-raleway text-xs">
              {plan.key === 'basic' ? 'Perfect for small venues' : plan.key === 'advanced' ? 'Ideal for growing teams' : 'Complete enterprise solution'}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-end gap-1">
            <span className={`text-3xl font-fredoka ${isDowngrade ? 'text-theme-text-secondary' : 'text-theme-text-primary'}`}>
              {plan.priceINR === 0 ? 'Free' : `₹${plan.priceINR.toLocaleString('en-IN')}`}
            </span>
            <span className="text-theme-text-tertiary font-raleway text-sm mb-1">
              {plan.priceINR === 0 ? 'Forever' : '/ month'}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <h4 className={`text-xs uppercase tracking-widest font-bold mb-4 ${isCurrent ? 'text-green-600 dark:text-green-400' : 'text-theme-text-secondary'}`}>
            {isCurrent ? 'Your Current Features' : "What's Included"}
          </h4>
          <ul className="space-y-3 font-raleway text-sm">
            {planType === 'restaurant' ? (
              <>
                <li className={`flex items-start gap-3 ${isDowngrade ? 'text-theme-text-secondary' : 'text-theme-text-primary'}`}>
                  <FaTable className={`${isCurrent ? 'text-green-500' : isDowngrade ? 'text-theme-text-tertiary' : 'text-theme-accent-primary'} mt-1 shrink-0`} />
                  <span className={isCurrent ? 'font-semibold' : ''}>Up to {plan.limits?.maxTables || plan.maxTables || 'Unlimited'} tables</span>
                </li>
                <li className={`flex items-start gap-3 ${isDowngrade ? 'text-theme-text-secondary' : 'text-theme-text-primary'}`}>
                  <FaUtensils className={`${isCurrent ? 'text-green-500' : isDowngrade ? 'text-theme-text-tertiary' : 'text-theme-accent-primary'} mt-1 shrink-0`} />
                  <span className={isCurrent ? 'font-semibold' : ''}>{plan.limits?.maxCategories || plan.maxCategories || 'Unlimited'} menu categories</span>
                </li>
              </>
            ) : (
              <>
                <li className={`flex items-start gap-3 ${isDowngrade ? 'text-theme-text-secondary' : 'text-theme-text-primary'}`}>
                  <FaBuilding className={`${isCurrent ? 'text-green-500' : isDowngrade ? 'text-theme-text-tertiary' : 'text-theme-accent-primary'} mt-1 shrink-0`} />
                  <span className={isCurrent ? 'font-semibold' : ''}>Up to {plan.limits?.maxShops || plan.maxShops || 'Unlimited'} shops</span>
                </li>
                <li className={`flex items-start gap-3 ${isDowngrade ? 'text-theme-text-secondary' : 'text-theme-text-primary'}`}>
                  <FaTable className={`${isCurrent ? 'text-green-500' : isDowngrade ? 'text-theme-text-tertiary' : 'text-theme-accent-primary'} mt-1 shrink-0`} />
                  <span className={isCurrent ? 'font-semibold' : ''}>{plan.limits?.maxTables || plan.maxTables || 'Unlimited'} tables per shop</span>
                </li>
              </>
            )}

            <li className="flex items-start gap-3 text-theme-text-secondary">
              <FaCheck className={`${isDowngrade ? 'text-theme-text-tertiary' : 'text-green-500'} mt-1 shrink-0`} />
              <span>Menu & Order Management</span>
            </li>
            <li className="flex items-start gap-3 text-theme-text-secondary">
              <FaCheck className={`${isDowngrade ? 'text-theme-text-tertiary' : 'text-green-500'} mt-1 shrink-0`} />
              <span>QR Code Generation</span>
            </li>
            
            {plan.features?.analytics && (
              <li className="flex items-start gap-3 text-theme-text-secondary">
                <FaCheck className={`${isDowngrade ? 'text-theme-text-tertiary' : 'text-green-500'} mt-1 shrink-0`} />
                <span>Advanced Analytics & Reports</span>
              </li>
            )}
            {plan.features?.prioritySupport && (
              <li className="flex items-start gap-3 text-theme-text-secondary">
                <FaCheck className={`${isDowngrade ? 'text-theme-text-tertiary' : 'text-green-500'} mt-1 shrink-0`} />
                <span>Priority 24/7 Support</span>
              </li>
            )}
            {plan.key === 'premium' && (
              <>
                <li className="flex items-start gap-3 text-theme-text-secondary">
                  <FaCheck className={`${isDowngrade ? 'text-theme-text-tertiary' : 'text-green-500'} mt-1 shrink-0`} />
                  <span>Custom Branding</span>
                </li>
                <li className="flex items-start gap-3 text-theme-text-secondary">
                  <FaCheck className={`${isDowngrade ? 'text-theme-text-tertiary' : 'text-green-500'} mt-1 shrink-0`} />
                  <span>Full API Access</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-theme-border-primary">
          <motion.button
            whileHover={{ scale: (isCurrent || isDowngrade) ? 1 : 1.02 }}
            whileTap={{ scale: (isCurrent || isDowngrade) ? 1 : 0.98 }}
            onClick={() => !(isCurrent || isDowngrade) && handleUpgrade(plan.key)}
            disabled={isCurrent || isDowngrade}
            className={`w-full py-3.5 rounded-xl font-raleway font-bold transition-all duration-300 ${
              isCurrent
                ? 'bg-green-500 text-white cursor-default shadow-lg shadow-green-500/20'
                : isDowngrade
                  ? 'bg-theme-bg-hover text-theme-text-tertiary cursor-not-allowed border border-theme-border-primary'
                  : isRecommended
                    ? 'bg-theme-accent-primary text-white hover:opacity-90 shadow-lg shadow-theme-accent-primary/25'
                    : 'bg-theme-bg-primary text-theme-text-primary border border-theme-border-primary hover:bg-theme-bg-hover'
            }`}
          >
            {isCurrent ? 'Selected Plan' : isDowngrade ? 'Included in your plan' : `Upgrade to ${plan.label}`}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8 relative z-10">
      
      {/* Dynamic Current Plan & Usage Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-theme-bg-secondary rounded-3xl p-6 sm:p-8 border border-theme-border-primary shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Plan Info */}
          <div className="lg:w-1/3 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-theme-border-primary pb-6 lg:pb-0 lg:pr-8">
            <h3 className="text-sm font-bold text-theme-text-tertiary uppercase tracking-widest mb-4">Current Plan Status</h3>
            <div className="flex items-center gap-4 mb-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                isPremiumUser ? 'bg-purple-500/10 text-purple-500' : currentPlan === 'free' ? 'bg-gray-500/10 text-gray-500' : 'bg-green-500/10 text-green-500'
              }`}>
                {isPremiumUser ? <FaCrown size={24} /> : currentPlan === 'free' ? <FaShieldAlt size={24} /> : <FaCheck size={24} />}
              </div>
              <div>
                <h2 className="text-2xl font-fredoka text-theme-text-primary">{currentPlanData?.label || 'Free Starter'}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mt-1 ${
                  isPremiumUser ? 'bg-purple-500/10 text-purple-600' : 'bg-green-500/10 text-green-600'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isPremiumUser ? 'bg-purple-500' : 'bg-green-500'}`} />
                  Active
                </span>
              </div>
            </div>
            {currentPlan === 'free' && (
              <p className="text-xs text-theme-text-tertiary font-raleway mt-4">
                You are currently using the free tier. Upgrade below to increase your capacity and unlock features.
              </p>
            )}
            {isPremiumUser && (
              <p className="text-xs text-theme-text-tertiary font-raleway mt-4">
                You're enjoying the highest tier with unlimited access to all premium features.
              </p>
            )}
          </div>

          {/* Usage Stats Progress Bars */}
            {/* Plan Allowances (What they get) */}
          <div className="lg:w-2/3 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-theme-text-tertiary uppercase tracking-widest mb-4">What You Get</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {planType === 'zone' ? (
                <>
                  <LimitCard label="Total Shops" value={finalLimits.maxShops} icon={FaBuilding} />
                  <LimitCard label="Categories" value={finalLimits.maxCategories} icon={FaUtensils} />
                  <LimitCard label="Tables Per Shop" value={finalLimits.maxTables} icon={FaTable} />
                </>
              ) : (
                <>
                  <LimitCard label="Total Tables" value={finalLimits.maxTables} icon={FaTable} />
                  <LimitCard label="Categories" value={finalLimits.maxCategories} icon={FaUtensils} />
                  <LimitCard label="Items/Category" value={finalLimits.maxMenuItems} icon={FaChartLine} />
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Why Upgrade Banner - Only shows if not premium */}
      {!isPremiumUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-theme-bg-secondary to-theme-bg-primary rounded-3xl p-8 border border-theme-border-primary shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3 text-center md:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-theme-accent-primary/10 text-theme-accent-primary rounded-xl mb-4">
                <FaBolt size={24} />
              </div>
              <h2 className="text-2xl font-fredoka text-theme-text-primary mb-2">Scale Up Faster</h2>
              <p className="text-theme-text-tertiary font-raleway text-sm">
                Supercharge your operations with enterprise tools designed for high-volume success.
              </p>
            </div>
            
            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-theme-bg-primary p-4 rounded-2xl border border-theme-border-primary flex gap-4 items-start">
                <FaChartLine className="text-theme-accent-primary text-xl shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-theme-text-primary text-sm mb-1">Deeper Insights</h4>
                  <p className="text-xs text-theme-text-tertiary font-raleway">Track revenue and trends to make data-driven decisions.</p>
                </div>
              </div>
              <div className="bg-theme-bg-primary p-4 rounded-2xl border border-theme-border-primary flex gap-4 items-start">
                <FaQrcode className="text-theme-accent-primary text-xl shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-theme-text-primary text-sm mb-1">Scale Operations</h4>
                  <p className="text-xs text-theme-text-tertiary font-raleway">Handle unlimited orders and tables with ease.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pricing Grid - Hidden for Premium Users */}
      {!isPremiumUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-4"
        >
          <h2 className="text-2xl font-fredoka text-theme-text-primary mb-8 text-center">
            {currentPlan === 'free' ? 'Select Your Upgrade' : 'Your Plan & Available Upgrades'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-end">
            {availablePlans.map((plan) => {
              const planLevel = planLevels[plan.key] || 0;
              const isDowngrade = currentLevel > planLevel;
              const isCurrent = plan.key === currentPlan;
              
              let isRecommended = false;
              if (currentLevel + 1 === planLevel) isRecommended = true;

              return (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  isRecommended={isRecommended}
                  isCurrent={isCurrent}
                  isDowngrade={isDowngrade}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Payment Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        selectedPlan={selectedPlanForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        paymentData={paymentData}
        onContinue={handleSuccessClose}
      />
    </div>
  );
};

export default UpgradeTab;