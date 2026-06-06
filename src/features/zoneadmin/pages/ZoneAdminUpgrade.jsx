import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { FaCrown, FaCheckCircle, FaStar, FaBolt } from 'react-icons/fa';
import ZoneAdminLayout from '../../../features/zoneadmin/pages/ZoneAdminLayout';
import UpgradeTab from '../../../features/subscription/components/UpgradeTab';
import { fetchCurrentSubscription } from '../../../store/slices/subscriptionSlice';

const ZoneAdminUpgrade = () => {
  const dispatch = useDispatch();
  
  // Get subscription data from the dedicated subscription slice
  const subscription = useSelector((state) => state.subscription.current);
  const { user } = useSelector((state) => state.ui.auth);
  
  // Fetch subscription data when component mounts
  useEffect(() => {
    if (!subscription) {
      dispatch(fetchCurrentSubscription());
    }
  }, [dispatch, subscription]);
  
  // Get the actual plan from subscription object
  const planKey = subscription?.planKey || subscription?.key || user?.subscriptionPlan || 'free';
  
  // Normalize the plan key to human-readable format
  const getPlanDisplayName = (key) => {
    const keyLower = key.toLowerCase();
    
    // Handle free plans
    if (keyLower.includes('free')) return 'Free Plan';
    
    // Handle basic/starter plans
    if (keyLower.includes('basic') || keyLower.includes('starter')) return 'Basic Plan';
    
    // Handle advanced/professional plans
    if (keyLower.includes('advanced') || keyLower.includes('professional')) return 'Advanced Plan';
    
    // Handle premium/enterprise plans
    if (keyLower.includes('premium') || keyLower.includes('enterprise')) return 'Premium Plan';
    
    // Fallback: capitalize first letter and add "Plan"
    const cleanKey = key.replace(/^(restaurant_|zone_)/, '');
    return cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1) + ' Plan';
  };
  
  const currentPlan = getPlanDisplayName(planKey);
  const isPremium = planKey.toLowerCase().includes('premium') || planKey.toLowerCase().includes('enterprise');
  const planStatus = subscription?.status || user?.subscription?.status || 'Active';

  return (
    <ZoneAdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Premium Hero Banner & Current Plan Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl bg-theme-bg-secondary border border-theme-border-primary p-8 sm:p-10 shadow-xl flex flex-col lg:flex-row gap-8"
        >
          {/* Decorative Ambient Gradients */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-72 h-72 rounded-full bg-theme-accent-primary/15 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-72 h-72 rounded-full bg-purple-500/15 blur-[80px] pointer-events-none" />

          {/* Left: Header Content */}
          <div className="relative z-10 text-center lg:text-left flex-1 flex flex-col justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`inline-flex items-center self-center lg:self-start gap-2 px-3 py-1.5 rounded-full border mb-5 shadow-sm ${
                isPremium 
                  ? 'bg-gradient-to-r from-purple-500/20 to-yellow-400/20 border-purple-400/30'
                  : 'bg-gradient-to-r from-theme-accent-primary/20 to-purple-500/20 border-theme-accent-primary/30'
              }`}
            >
              <FaCrown className={isPremium ? 'text-yellow-400 w-3.5 h-3.5' : 'text-theme-accent-primary w-3.5 h-3.5'} />
              <span className="text-[11px] font-bold text-theme-text-primary uppercase tracking-widest">
                {isPremium ? 'Premium Member' : 'Zone Upgrades'}
              </span>
            </motion.div>
            
            {isPremium ? (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-fredoka text-theme-text-primary mb-4 leading-tight">
                  You're at the <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400">
                    Top Tier
                  </span>
                </h1>
                
                <p className="text-theme-text-secondary font-raleway text-sm sm:text-base max-w-xl leading-relaxed mx-auto lg:mx-0">
                  Enjoy unlimited access to all premium features, priority support, and enterprise-grade capabilities for your food zone.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-fredoka text-theme-text-primary mb-4 leading-tight">
                  Scale Your <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-accent-primary to-purple-500">
                    Food Zone
                  </span>
                </h1>
                
                <p className="text-theme-text-secondary font-raleway text-sm sm:text-base max-w-xl leading-relaxed mx-auto lg:mx-0">
                  Unlock powerful features, revenue analytics, and unlimited vendor capacities to take your operations to the next level.
                </p>
              </>
            )}
          </div>

          {/* Right: Current Plan Status Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 w-full lg:w-80 shrink-0"
          >
            <div className="h-full p-6 rounded-2xl bg-theme-bg-primary/60 backdrop-blur-xl border border-theme-border-primary shadow-lg flex flex-col justify-between relative overflow-hidden">
              
              {/* Optional glow for premium users */}
              {isPremium && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 blur-[40px] pointer-events-none" />
              )}

              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-theme-text-tertiary mb-1">
                  Your Current Plan
                </p>
                <div className="flex items-center gap-2 mb-4">
                  {isPremium ? (
                    <FaStar className="text-yellow-500 w-5 h-5" />
                  ) : (
                    <FaBolt className="text-theme-accent-primary w-5 h-5" />
                  )}
                  <h2 className="text-2xl font-fredoka text-theme-text-primary capitalize">
                    {currentPlan}
                  </h2>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-theme-text-secondary font-raleway">
                    <FaCheckCircle className="text-green-500 w-3.5 h-3.5" />
                    <span>Status: <strong className="text-theme-text-primary capitalize">{planStatus}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-theme-border-primary">
                {isPremium ? (
                  <p className="text-xs text-theme-text-tertiary font-raleway text-center">
                    Need more capacity or custom features? <span className="text-theme-accent-primary font-semibold">Contact Support</span>
                  </p>
                ) : (
                  <p className="text-xs text-theme-text-tertiary font-raleway text-center">
                    Select a new plan below to instantly apply changes to your Zone.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
          
        </motion.div>
        
        {/* Main Upgrade Component Tab (Pricing Tables/Tiers) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative z-10"
        >
          <UpgradeTab currentPlan={currentPlan} />
        </motion.div>
        
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneAdminUpgrade;