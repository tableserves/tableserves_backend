import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaLock, 
  FaCrown, 
  FaArrowUp, 
  FaExclamationTriangle,
  FaTable,
  FaUtensils,
  FaList,
  FaStore,
  FaUsers,
  FaTimes
} from 'react-icons/fa';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../../constants/plans';
import PaymentModal from '../payment/PaymentModal';
import PaymentSuccessModal from '../payment/PaymentSuccessModal';
import LocalStorageService from '../../services/LocalStorageService';

// Plan Status Component
const PlanStatusBadge = ({ subscription, currentCounts }) => {
  const navigate = useNavigate();
  const { restaurantId, zoneId } = useParams();

  // Add debug logging
  console.log('PlanStatusBadge render:', { subscription, currentCounts });

  if (!subscription) {
    console.log('PlanStatusBadge: No subscription found');
    return (
      <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-lg">
        <div className="flex items-center space-x-2">
          <FaCrown className="text-gray-400" />
          <span className="font-fredoka text-lg text-gray-600 dark:text-gray-300">
            Loading plan information...
          </span>
        </div>
      </div>
    );
  }

  const getUsagePercentage = (current, max) => {
    if (!max) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const tableUsage = getUsagePercentage(currentCounts?.tables || 0, subscription.maxTables);
  const categoryUsage = getUsagePercentage(currentCounts?.categories || 0, subscription.maxCategories);
  const menuItemUsage = getUsagePercentage(currentCounts?.menuItems || 0, subscription.maxMenuItems);

  const isNearLimit = tableUsage >= 80 || categoryUsage >= 80 || menuItemUsage >= 80;
  const isAtLimit = tableUsage >= 100 || categoryUsage >= 100 || menuItemUsage >= 100;

  const isPremiumUser = subscription.key === 'premium' || subscription.plan === 'premium';

  // Special handling for premium users
  if (isPremiumUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-6 rounded-lg border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
              <FaCrown className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-fredoka text-xl text-purple-800 dark:text-purple-200">
                Premium Plan Active
              </h3>
              <p className="text-purple-600 dark:text-purple-300 font-raleway text-sm">
                Unlimited access to all features • No restrictions
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500 text-white">
              <FaCrown className="mr-1" />
              Premium
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 p-4 rounded-lg border shadow-lg ${
        isAtLimit 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' 
          : isNearLimit 
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' 
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FaCrown className={`${
            subscription.key === 'free' ? 'text-gray-500 dark:text-gray-400' : 
            subscription.key === 'premium' ? 'text-orange-500 dark:text-orange-400' : 'text-blue-500 dark:text-blue-400'
          }`} />
          <span className="font-fredoka text-lg text-gray-900 dark:text-white">
            {subscription.label} Plan
          </span>
        </div>
        {(isNearLimit || isAtLimit) && (
          <button
            onClick={() => {
              if (restaurantId) {
                navigate(`/tableserve/restaurant/${restaurantId}/upgrade`);
              } else if (zoneId) {
                navigate(`/tableserve/zone/${zoneId}/upgrade`);
              }
            }}
            className="flex items-center space-x-1 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-raleway transition-colors"
          >
            <FaArrowUp className="text-xs" />
            <span>Upgrade</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subscription.maxTables && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Tables</span>
              <span className="font-medium text-gray-900 dark:text-white">{currentCounts?.tables || 0}/{subscription.maxTables}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(tableUsage)}`}
                style={{ width: `${tableUsage}%` }}
              />
            </div>
          </div>
        )}

        {subscription.maxCategories && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Categories</span>
              <span className="font-medium text-gray-900 dark:text-white">{currentCounts?.categories || 0}/{subscription.maxCategories}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(categoryUsage)}`}
                style={{ width: `${categoryUsage}%` }}
              />
            </div>
          </div>
        )}

        {subscription.maxMenuItems && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Menu Items</span>
              <span className="font-medium text-gray-900 dark:text-white">{currentCounts?.menuItems || 0}/{subscription.maxMenuItems}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(menuItemUsage)}`}
                style={{ width: `${menuItemUsage}%` }}
              />
            </div>
          </div>
        )}

        {(subscription.maxVendors || subscription.maxShops) && subscription.planType === 'zone' && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Vendors</span>
              <span className="font-medium text-gray-900 dark:text-white">{currentCounts?.vendors || 0}/{subscription.maxVendors || subscription.maxShops}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(getUsagePercentage(currentCounts?.vendors || 0, subscription.maxVendors || subscription.maxShops))}`}
                style={{ width: `${getUsagePercentage(currentCounts?.vendors || 0, subscription.maxVendors || subscription.maxShops)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Feature Restriction Component
const FeatureRestriction = ({ feature, subscription, children, showUpgrade = true, onUpgrade }) => {
  
  // Check if user has access to the feature based on their plan
  const hasAccess = () => {
    // If no subscription, allow access (loading state)
    if (!subscription) return true;
    
    // For free plan, allow basic functionality based on feature type
    if (subscription.key === 'free') {
      // Allow basic QR generation (not customization) for free plan
      if (feature === 'qrGeneration') {
        return true; // Free plan allows basic QR generation
      }
      
      // Allow basic menu management for free plan
      if (feature === 'crudMenu') {
        return true; // Free plan allows basic menu management
      }
      
      // For other features, check if explicitly allowed in the plan
      // But allow basic functionality that's within plan limits
      return !!subscription.features?.[feature];
    }
    
    // For paid plans, check if feature is explicitly allowed
    return !!subscription.features?.[feature];
  };

  const getFeatureInfo = () => {
    switch (feature) {
      case 'qrCustomization':
        return {
          title: 'QR Code Customization',
          description: 'Customize your QR codes with logos, colors, and branding.',
          benefits: ['Custom logos on QR codes', 'Brand colors', 'Professional appearance', 'Increased customer trust']
        };
      case 'analytics':
        return {
          title: 'Advanced Analytics',
          description: 'Get detailed insights into your restaurant performance.',
          benefits: ['Revenue tracking', 'Popular items analysis', 'Customer behavior insights', 'Sales reports']
        };
      case 'modifiers':
        return {
          title: 'Menu Modifiers',
          description: 'Add customization options to your menu items.',
          benefits: ['Add-ons and extras', 'Size variations', 'Ingredient customization', 'Increased revenue']
        };
      default:
        return {
          title: 'Premium Feature',
          description: 'This feature requires a paid plan subscription.',
          benefits: ['Enhanced functionality', 'Better user experience', 'Professional tools', 'Priority support']
        };
    }
  };

  if (hasAccess()) {
    return children;
  }

  const featureInfo = getFeatureInfo();

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-xl shadow-2xl max-w-md mx-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaLock className="text-orange-500 text-2xl" />
          </div>
          
          <h3 className="text-xl font-fredoka text-gray-900 mb-3">
            {featureInfo.title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-4">
            {featureInfo.description}
          </p>
          
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3 text-sm">Upgrade to get:</h4>
            <ul className="space-y-2 text-left">
              {featureInfo.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-3" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          {showUpgrade && onUpgrade && (
            <div className="space-y-3">
              <button
                onClick={() => onUpgrade('basic')} // Default to basic plan
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-raleway font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Upgrade Now
              </button>
              <p className="text-xs text-gray-500">
                Starting from ₹299/month • Cancel anytime
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

// Limit Reached Component
const LimitReachedModal = ({ type, currentCount, limit, businessType, onClose, onUpgrade }) => {
  const getTypeInfo = () => {
    switch (type) {
      case 'tables':
        return {
          icon: FaTable,
          title: 'Table Limit Reached',
          description: `You've reached your plan limit of ${limit} tables. Upgrade to add more tables.`,
          upgradeFeatures: businessType === 'restaurant' 
            ? ['Up to 8 tables', '15 categories', '20 menu items per category', 'Advanced analytics']
            : ['Up to 8 tables', '8 vendors', 'Advanced analytics', 'QR customization']
        };
      case 'categories':
        return {
          icon: FaList,
          title: 'Category Limit Reached',
          description: `You've reached your plan limit of ${limit} categories. Upgrade to add more categories.`,
          upgradeFeatures: ['15 categories', '20 menu items per category', 'Advanced menu management', 'Analytics']
        };
      case 'menuItems':
        return {
          icon: FaUtensils,
          title: 'Menu Item Limit Reached',
          description: `You've reached your plan limit of ${limit} menu items. Upgrade to add more items.`,
          upgradeFeatures: ['20 menu items per category', 'Unlimited modifiers', 'Advanced menu management', 'Analytics']
        };
      case 'vendors':
      case 'shops':
        return {
          icon: FaStore,
          title: 'Vendor Limit Reached',
          description: `You've reached your plan limit of ${limit} vendors/shops. Upgrade to add more vendors.`,
          upgradeFeatures: ['Up to 8 vendors', '8 tables per vendor', 'Advanced vendor management', 'Analytics']
        };
      default:
        return {
          icon: FaExclamationTriangle,
          title: 'Plan Limit Reached',
          description: 'You\'ve reached your current plan limit.',
          upgradeFeatures: ['Increased limits', 'Advanced features', 'Priority support']
        };
    }
  };

  const typeInfo = getTypeInfo();
  const IconComponent = typeInfo.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconComponent className="text-orange-500 text-2xl" />
          </div>
          
          <h3 className="text-xl font-fredoka text-gray-900 mb-2">
            {typeInfo.title}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {typeInfo.description}
          </p>

          <div className="mb-6">
            <h4 className="font-fredoka text-gray-900 mb-3">Upgrade to get:</h4>
            <ul className="space-y-2 text-left">
              {typeInfo.upgradeFeatures.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-raleway hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-raleway hover:bg-orange-600 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main Plan Restrictions Hook
export const usePlanRestrictions = () => {
  const { restaurantId, zoneId } = useParams();
  const navigate = useNavigate();
  const subscriptionFromState = useSelector((state) => state.subscription.current);
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth); // Get authenticated user
  
  // Use useState to stabilize subscription object and prevent infinite re-renders
  const [subscription, setSubscription] = useState(null);
  
  // Initialize subscription only once
  useEffect(() => {
    let finalSubscription = subscriptionFromState;
    
    console.log('PlanRestrictions: Initializing subscription...', {
      subscriptionFromState,
      restaurantId,
      zoneId,
      hasReduxSubscription: !!subscriptionFromState,
      authenticatedUser: user ? { id: user.id, role: user.role, hasSubscription: !!user.subscription } : null
    });
    
    // PRIORITY 1: Use authenticated user data to determine correct plan type
    if (isAuthenticated && user) {
      console.log('PlanRestrictions: User is authenticated, determining plan type based on role');
      
      // For restaurant owners, force restaurant plan type regardless of subscription data
      if (user.role === 'restaurant_owner') {
        console.log('PlanRestrictions: Restaurant owner detected, ensuring restaurant plan type');
        
        if (user.subscription) {
          finalSubscription = {
            ...user.subscription,
            planType: 'restaurant' // Force restaurant plan type
          };
          console.log('PlanRestrictions: Using user subscription with corrected planType:', finalSubscription);
        } else {
          // Find restaurant subscription from data
          try {
            const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
            const userRestaurant = restaurants.find(r => r.id === user.restaurantId || r.id === user.id);
            
            if (userRestaurant && userRestaurant.subscription) {
              finalSubscription = {
                ...userRestaurant.subscription,
                planType: 'restaurant'
              };
            } else if (userRestaurant && userRestaurant.subscriptionPlan) {
              const planData = RESTAURANT_PLANS[userRestaurant.subscriptionPlan] || RESTAURANT_PLANS.free;
              finalSubscription = {
                ...planData,
                key: userRestaurant.subscriptionPlan,
                planType: 'restaurant'
              };
            } else {
              finalSubscription = {
                ...RESTAURANT_PLANS.free,
                key: 'free',
                label: 'Free Starter',
                planType: 'restaurant'
              };
            }
          } catch (error) {
            console.error('Error loading restaurant data for user:', error);
            finalSubscription = {
              ...RESTAURANT_PLANS.free,
              key: 'free',
              label: 'Free Starter',
              planType: 'restaurant'
            };
          }
        }
      }
      // For zone admins, force zone plan type
      else if (user.role === 'zone_admin') {
        console.log('PlanRestrictions: Zone admin detected, ensuring zone plan type');
        
        if (user.subscription) {
          finalSubscription = {
            ...user.subscription,
            planType: 'zone' // Force zone plan type
          };
          console.log('PlanRestrictions: Using user subscription with corrected planType:', finalSubscription);
        } else {
          // Find zone subscription from data
          try {
            const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
            const userZone = zones.find(z => z.id === user.zoneId);
            
            if (userZone && userZone.subscription) {
              finalSubscription = {
                ...userZone.subscription,
                planType: 'zone'
              };
            } else if (userZone && userZone.subscriptionPlan) {
              const planData = ZONE_PLANS[userZone.subscriptionPlan] || ZONE_PLANS.free;
              finalSubscription = {
                ...planData,
                key: userZone.subscriptionPlan,
                planType: 'zone'
              };
            } else {
              finalSubscription = {
                ...ZONE_PLANS.free,
                key: 'free',
                label: 'Free Starter',
                planType: 'zone'
              };
            }
          } catch (error) {
            console.error('Error loading zone data for user:', error);
            finalSubscription = {
              ...ZONE_PLANS.free,
              key: 'free',
              label: 'Free Starter',
              planType: 'zone'
            };
          }
        }
      }
      // For zone shops/vendors, inherit from parent zone
      else if (user.role === 'zone_shop' || user.role === 'zone_vendor') {
        console.log('PlanRestrictions: Zone shop/vendor detected, using parent zone subscription');
        
        try {
          const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
          const parentZone = zones.find(z => z.id === user.zoneId);
          
          if (parentZone && parentZone.subscription) {
            finalSubscription = {
              ...parentZone.subscription,
              planType: 'zone'
            };
          } else if (parentZone && parentZone.subscriptionPlan) {
            const planData = ZONE_PLANS[parentZone.subscriptionPlan] || ZONE_PLANS.free;
            finalSubscription = {
              ...planData,
              key: parentZone.subscriptionPlan,
              planType: 'zone'
            };
          } else {
            finalSubscription = {
              ...ZONE_PLANS.free,
              key: 'free',
              label: 'Free Starter',
              planType: 'zone'
            };
          }
        } catch (error) {
          console.error('Error loading parent zone data:', error);
          finalSubscription = {
            ...ZONE_PLANS.free,
            key: 'free',
            label: 'Free Starter',
            planType: 'zone'
          };
        }
      }
    }
    
    // PRIORITY 2: Fallback to localStorage subscription (check even if authenticated for fresh upgrades)
    if (!finalSubscription) {
      console.log('PlanRestrictions: No user subscription or authentication, checking localStorage...');
      
      try {
        // Always check localStorage for the most recent subscription data
        const stored = localStorage.getItem('tableserve_subscription');
        if (stored) {
          const parsedSubscription = JSON.parse(stored);
          console.log('PlanRestrictions: Found subscription in localStorage:', parsedSubscription);
          
          // Validate the subscription has required fields
          if (parsedSubscription.key && parsedSubscription.planType) {
            finalSubscription = parsedSubscription;
            console.log('PlanRestrictions: Using valid localStorage subscription');
          } else {
            console.log('PlanRestrictions: localStorage subscription missing required fields, will fallback');
          }
        } else {
          console.log('PlanRestrictions: No subscription in localStorage, checking user data...');
          
          // Get from user data as fallback
          const userData = localStorage.getItem('tableserve_user');
          if (userData) {
            const user = JSON.parse(userData);
            console.log('PlanRestrictions: Found user data:', { 
              userId: user.id, 
              role: user.role, 
              hasSubscription: !!user.subscription 
            });
            
            // Determine the correct plan type based on context
            const planType = zoneId ? 'zone' : 'restaurant';
            const defaultPlan = planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
            
            console.log('PlanRestrictions: Determined plan type:', {
              planType,
              zoneId,
              restaurantId,
              defaultPlan: defaultPlan.key
            });
            
            finalSubscription = user.subscription || {
              ...defaultPlan,
              key: 'free',
              label: 'Free Starter',
              planType: planType
            };
          } else if (zoneId) {
            console.log('PlanRestrictions: No user data but zoneId present, checking zone data...');
            
            // If no user data but we have zoneId, check zone data directly
            try {
              const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
              const currentZone = zones.find(z => z.id === zoneId);
              
              console.log('PlanRestrictions: Zone lookup result:', {
                totalZones: zones.length,
                zoneId,
                foundZone: !!currentZone,
                zoneSubscription: currentZone?.subscription,
                zoneSubscriptionPlan: currentZone?.subscriptionPlan
              });
              
              if (currentZone && currentZone.subscription) {
                finalSubscription = currentZone.subscription;
              } else if (currentZone && currentZone.subscriptionPlan) {
                // Convert old subscriptionPlan format to new subscription object
                console.log('PlanRestrictions: Converting zone subscriptionPlan to subscription:', currentZone.subscriptionPlan);
                const planData = ZONE_PLANS[currentZone.subscriptionPlan];
                if (planData) {
                  finalSubscription = {
                    ...planData,
                    key: currentZone.subscriptionPlan,
                    planType: 'zone'
                  };
                  console.log('PlanRestrictions: Converted subscription:', finalSubscription);
                } else {
                  finalSubscription = {
                    ...ZONE_PLANS.free,
                    key: 'free',
                    label: 'Free Starter',
                    planType: 'zone'
                  };
                }
              } else {
                // Default to zone free plan
                finalSubscription = {
                  ...ZONE_PLANS.free,
                  key: 'free',
                  label: 'Free Starter',
                  planType: 'zone'
                };
              }
            } catch (error) {
              console.error('Error loading zone data:', error);
              finalSubscription = {
                ...ZONE_PLANS.free,
                key: 'free',
                label: 'Free Starter',
                planType: 'zone'
              };
            }
          } else if (restaurantId) {
            console.log('PlanRestrictions: No user data but restaurantId present, checking restaurant data...');
            
            // Check restaurant data directly
            try {
              const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
              const currentRestaurant = restaurants.find(r => r.id === restaurantId);
              
              console.log('PlanRestrictions: Restaurant lookup result:', {
                totalRestaurants: restaurants.length,
                restaurantId,
                foundRestaurant: !!currentRestaurant,
                restaurantSubscription: currentRestaurant?.subscription,
                restaurantSubscriptionPlan: currentRestaurant?.subscriptionPlan
              });
              
              if (currentRestaurant && currentRestaurant.subscription) {
                finalSubscription = currentRestaurant.subscription;
              } else if (currentRestaurant && currentRestaurant.subscriptionPlan) {
                // Convert old subscriptionPlan format to new subscription object
                console.log('PlanRestrictions: Converting restaurant subscriptionPlan to subscription:', currentRestaurant.subscriptionPlan);
                const planData = RESTAURANT_PLANS[currentRestaurant.subscriptionPlan];
                if (planData) {
                  finalSubscription = {
                    ...planData,
                    key: currentRestaurant.subscriptionPlan,
                    planType: 'restaurant'
                  };
                  console.log('PlanRestrictions: Converted subscription:', finalSubscription);
                } else {
                  finalSubscription = {
                    ...RESTAURANT_PLANS.free,
                    key: 'free',
                    label: 'Free Starter',
                    planType: 'restaurant'
                  };
                }
              } else {
                // Default to restaurant free plan
                finalSubscription = {
                  ...RESTAURANT_PLANS.free,
                  key: 'free',
                  label: 'Free Starter',
                  planType: 'restaurant'
                };
              }
            } catch (error) {
              console.error('Error loading restaurant data:', error);
              finalSubscription = {
                ...RESTAURANT_PLANS.free,
                key: 'free',
                label: 'Free Starter',
                planType: 'restaurant'
              };
            }
          } else {
            console.log('PlanRestrictions: No specific context, using default restaurant plan');
            
            // Default fallback
            finalSubscription = {
              ...RESTAURANT_PLANS.free,
              key: 'free',
              label: 'Free Starter',
              planType: 'restaurant'
            };
          }
        }
      } catch (error) {
        console.error('Error loading subscription from localStorage:', error);
        // Default to free plan if all else fails - determine correct plan type
        const planType = zoneId ? 'zone' : 'restaurant';
        const defaultPlan = planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
        
        console.log('PlanRestrictions: Error fallback - using default plan:', {
          planType,
          defaultPlan: defaultPlan.key
        });
        
        finalSubscription = {
          ...defaultPlan,
          key: 'free',
          label: 'Free Starter',
          planType: planType
        };
        
        // Store the default subscription for future use
        try {
          localStorage.setItem('tableserve_subscription', JSON.stringify(finalSubscription));
          console.log('PlanRestrictions: Stored default subscription to localStorage');
        } catch (storageError) {
          console.warn('Could not store default subscription:', storageError);
        }
      }
    }
    
    // Ensure features object exists with required features enabled for free plan
    if (finalSubscription && (!finalSubscription.features || !finalSubscription.features.qrGeneration)) {
      console.log('PlanRestrictions: Ensuring features object exists for subscription');
      
      finalSubscription = {
        ...finalSubscription,
        features: {
          ...finalSubscription.features,
          qrGeneration: true, // Always allow QR generation
          crudMenu: true // Always allow basic menu management
        }
      };
    }
    
    console.log('PlanRestrictions: Final subscription being set:', {
      finalSubscription,
      source: subscriptionFromState ? 'Redux' : 'localStorage/fallback',
      zoneId,
      restaurantId,
      planType: finalSubscription?.planType,
      maxCategories: finalSubscription?.maxCategories,
      maxMenuItems: finalSubscription?.maxMenuItems,
      maxTables: finalSubscription?.maxTables,
      maxVendors: finalSubscription?.maxVendors,
      features: finalSubscription?.features
    });
    
    setSubscription(finalSubscription);
  }, [subscriptionFromState, restaurantId, zoneId, user, isAuthenticated]); // Include user and auth state
  
  // Listen for subscription updates from localStorage and custom events
  useEffect(() => {
    const handleSubscriptionUpdate = (event) => {
      console.log('PlanRestrictions: Received subscription update event:', event.detail);
      
      // Reload subscription from localStorage after update
      try {
        const storedSubscription = localStorage.getItem('tableserve_subscription');
        if (storedSubscription) {
          const parsedSubscription = JSON.parse(storedSubscription);
          console.log('PlanRestrictions: Updating subscription from localStorage:', parsedSubscription);
          setSubscription(parsedSubscription);
        }
      } catch (error) {
        console.error('Error updating subscription from localStorage:', error);
      }
    };
    
    // Listen for custom subscription update events
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);
  
  const [currentCounts, setCurrentCounts] = useState({
    tables: 0,
    categories: 0,
    menuItems: 0,
    shops: 0,
    vendors: 0
  });
  const [showLimitModal, setShowLimitModal] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  // Load current counts
  useEffect(() => {
    const loadCounts = () => {
      console.log('PlanRestrictions: Loading counts...', { 
        restaurantId, 
        zoneId, 
        subscriptionKey: subscription?.key,
        authenticatedUser: user ? { role: user.role, restaurantId: user.restaurantId, zoneId: user.zoneId } : null
      });
      
      try {
        // PRIORITY: Use authenticated user data to determine what to load
        let shouldLoadRestaurant = false;
        let shouldLoadZone = false;
        let targetRestaurantId = restaurantId;
        let targetZoneId = zoneId;
        
        if (isAuthenticated && user) {
          console.log('PlanRestrictions: Using authenticated user context for loading counts');
          
          if (user.role === 'restaurant_owner') {
            shouldLoadRestaurant = true;
            targetRestaurantId = user.restaurantId || user.id || restaurantId;
            console.log('PlanRestrictions: Restaurant owner - loading restaurant counts for:', targetRestaurantId);
          } else if (user.role === 'zone_admin' || user.role === 'zone_shop' || user.role === 'zone_vendor') {
            shouldLoadZone = true;
            targetZoneId = user.zoneId || zoneId;
            console.log('PlanRestrictions: Zone user - loading zone counts for:', targetZoneId);
          }
        } else {
          // Fallback to URL parameters if not authenticated
          console.log('PlanRestrictions: No authenticated user, using URL parameters');
          shouldLoadRestaurant = !!restaurantId;
          shouldLoadZone = !!zoneId;
        }
        
        if (shouldLoadRestaurant && targetRestaurantId) {
          console.log('PlanRestrictions: Loading restaurant counts for:', targetRestaurantId);
          
          // Load restaurant-specific counts
          const savedTables = localStorage.getItem(`tables_states_${targetRestaurantId}`);
          let tableCount = 0;
          if (savedTables) {
            try {
              const tables = JSON.parse(savedTables);
              tableCount = Array.isArray(tables) ? tables.length : Object.keys(tables).length;
              console.log('PlanRestrictions: Loaded tables:', { savedTables: !!savedTables, tableCount, isArray: Array.isArray(tables) });
            } catch (error) {
              console.error('Error parsing tables data:', error);
            }
          }

          // Load categories count with multiple fallback keys
          const categoryKeys = [
            `restaurant_menu_categories_${targetRestaurantId}`,
            `menu_categories_${targetRestaurantId}`,
            `categories_${targetRestaurantId}`
          ];
          
          let categoryCount = 0;
          for (const key of categoryKeys) {
            const savedCategories = localStorage.getItem(key);
            if (savedCategories) {
              try {
                const categories = JSON.parse(savedCategories);
                categoryCount = Array.isArray(categories) ? categories.length : 0;
                console.log(`PlanRestrictions: Loaded categories from ${key}:`, { count: categoryCount });
                break;
              } catch (error) {
                console.error(`Error parsing categories from ${key}:`, error);
              }
            }
          }

          // Load menu items count with multiple fallback keys
          const menuItemKeys = [
            `restaurant_menu_items_${targetRestaurantId}`,
            `menu_items_${targetRestaurantId}`,
            `items_${targetRestaurantId}`
          ];
          
          let menuItemCount = 0;
          for (const key of menuItemKeys) {
            const savedMenuItems = localStorage.getItem(key);
            if (savedMenuItems) {
              try {
                const menuItems = JSON.parse(savedMenuItems);
                menuItemCount = Array.isArray(menuItems) ? menuItems.length : 0;
                console.log(`PlanRestrictions: Loaded menu items from ${key}:`, { count: menuItemCount });
                break;
              } catch (error) {
                console.error(`Error parsing menu items from ${key}:`, error);
              }
            }
          }

          const newCounts = {
            tables: tableCount,
            categories: categoryCount,
            menuItems: menuItemCount,
            shops: 0,
            vendors: 0
          };
          
          setCurrentCounts(newCounts);
          
          console.log('PlanRestrictions: Restaurant counts loaded:', {
            ...newCounts,
            subscription: subscription?.key,
            maxTables: subscription?.maxTables,
            maxCategories: subscription?.maxCategories,
            maxMenuItems: subscription?.maxMenuItems
          });
          
        } else if (shouldLoadZone && targetZoneId) {
          console.log('PlanRestrictions: Loading zone counts for:', targetZoneId);
          
          // Load zone-specific counts using LocalStorageService for accuracy
          const zoneShops = LocalStorageService.getZoneShops(targetZoneId);
          const vendorCount = zoneShops.length;

          // Load zone tables count (check multiple possible keys)
          const tableKeys = [
            `zone_tables_${targetZoneId}`,
            `tables_states_${targetZoneId}`,
            `tables_${targetZoneId}`
          ];
          
          let tableCount = 0;
          for (const key of tableKeys) {
            const savedTables = localStorage.getItem(key);
            if (savedTables) {
              try {
                const tables = JSON.parse(savedTables);
                tableCount = Array.isArray(tables) ? tables.length : Object.keys(tables).length;
                console.log(`PlanRestrictions: Loaded zone tables from ${key}:`, { count: tableCount });
                break;
              } catch (error) {
                console.error(`Error parsing zone tables from ${key}:`, error);
              }
            }
          }

          // Load zone categories count with multiple fallback keys
          const categoryKeys = [
            `zone_menu_categories_${targetZoneId}`,
            `menu_categories_${targetZoneId}`,
            `categories_${targetZoneId}`
          ];
          
          let categoryCount = 0;
          for (const key of categoryKeys) {
            const savedCategories = localStorage.getItem(key);
            if (savedCategories) {
              try {
                const categories = JSON.parse(savedCategories);
                categoryCount = Array.isArray(categories) ? categories.length : 0;
                console.log(`PlanRestrictions: Loaded zone categories from ${key}:`, { count: categoryCount });
                break;
              } catch (error) {
                console.error(`Error parsing zone categories from ${key}:`, error);
              }
            }
          }

          // Load zone menu items count with multiple fallback keys
          const menuItemKeys = [
            `zone_menu_items_${targetZoneId}`,
            `menu_items_${targetZoneId}`,
            `items_${targetZoneId}`
          ];
          
          let menuItemCount = 0;
          for (const key of menuItemKeys) {
            const savedMenuItems = localStorage.getItem(key);
            if (savedMenuItems) {
              try {
                const menuItems = JSON.parse(savedMenuItems);
                menuItemCount = Array.isArray(menuItems) ? menuItems.length : 0;
                console.log(`PlanRestrictions: Loaded zone menu items from ${key}:`, { count: menuItemCount });
                break;
              } catch (error) {
                console.error(`Error parsing zone menu items from ${key}:`, error);
              }
            }
          }

          const newCounts = {
            tables: tableCount,
            categories: categoryCount,
            menuItems: menuItemCount,
            shops: vendorCount, // For zones, shops = vendors
            vendors: vendorCount
          };
          
          setCurrentCounts(newCounts);
          
          console.log('PlanRestrictions: Zone counts loaded:', {
            ...newCounts,
            zoneShops: zoneShops.map(s => ({ id: s.id, name: s.name, type: s.type })),
            subscription: subscription?.key,
            maxTables: subscription?.maxTables,
            maxCategories: subscription?.maxCategories,
            maxMenuItems: subscription?.maxMenuItems,
            maxVendors: subscription?.maxVendors,
            maxShops: subscription?.maxShops
          });
        } else {
          console.log('PlanRestrictions: No valid context for loading counts, setting default values');
          setCurrentCounts({
            tables: 0,
            categories: 0,
            menuItems: 0,
            shops: 0,
            vendors: 0
          });
        }
      } catch (error) {
        console.error('Error loading current counts:', error);
      }
    };

    if (subscription) {
      loadCounts();
      
      // Set up interval to refresh counts every 5 seconds
      const interval = setInterval(loadCounts, 5000);
      
      return () => clearInterval(interval);
    }
  }, [restaurantId, zoneId, subscription?.key, user?.role, user?.restaurantId, user?.zoneId, isAuthenticated]); // Include user context

  const checkLimit = (type, increment = 1) => {
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
    if (subscription.key === 'premium' || subscription.plan === 'premium') {
      console.log('Premium user - unlimited access granted');
      return true;
    }

    // Free plan users should have access to their allocated limits
    // Only block if they exceed their plan limits
    const current = currentCounts[type] || 0;
    
    // Handle different limit property names with better debugging
    let limit;
    if (type === 'vendors' || type === 'shops') {
      // For zones: both 'vendors' and 'shops' map to maxVendors or maxShops
      limit = subscription.maxVendors || subscription.maxShops;
      console.log('Vendor/Shop limit lookup:', {
        type,
        maxVendors: subscription.maxVendors,
        maxShops: subscription.maxShops,
        resolvedLimit: limit
      });
    } else {
      // Standard mapping for other types
      const limitPropertyName = `max${type.charAt(0).toUpperCase() + type.slice(1)}`;
      limit = subscription[limitPropertyName];
      console.log('Standard limit lookup:', {
        type,
        limitPropertyName,
        limit,
        subscriptionProperties: Object.keys(subscription).filter(k => k.startsWith('max'))
      });
    }
    
    console.log('Detailed limit check:', {
      type,
      current,
      limit,
      increment,
      wouldExceed: current + increment > limit,
      businessType: subscription.planType,
      subscriptionKey: subscription.key,
      isFreePlan: subscription.key === 'free',
      planFeatures: subscription.features
    });
    
    // Special handling for free plans - ensure they get their allocated quota
    if (subscription.key === 'free') {
      console.log('Free plan special handling:', {
        type,
        current,
        limit,
        increment,
        planType: subscription.planType,
        hasBasicFeatures: subscription.features?.crudMenu
      });
      
      // If no limit is explicitly set for free plan, use the plan defaults
      if (limit === null || limit === undefined) {
        const planType = subscription.planType || (zoneId ? 'zone' : 'restaurant');
        const defaultFreePlan = planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
        const defaultLimitPropertyName = `max${type.charAt(0).toUpperCase() + type.slice(1)}`;
        limit = defaultFreePlan[defaultLimitPropertyName];
        
        console.log('Free plan limit fallback applied:', {
          planType,
          defaultLimitPropertyName,
          defaultLimit: limit,
          defaultFreePlan: defaultFreePlan.key
        });
      }
    }
    
    // If no limit is set (null/undefined), it's unlimited
    if (limit == null || limit === undefined) {
      console.log('No limit set for type:', type, 'allowing access. Limit value:', limit);
      return true;
    }
    
    // Check if adding increment would exceed the limit
    if (current + increment > limit) {
      console.log('Limit exceeded, showing modal. Current:', current, 'Limit:', limit, 'Increment:', increment);
      setShowLimitModal({
        type,
        currentCount: current,
        limit,
        businessType: subscription.planType
      });
      return false;
    }
    
    console.log('Within limit, allowing access. Current:', current, 'Limit:', limit, 'Available:', limit - current);
    return true;
  };

  const handleUpgrade = (planKey = null) => {
    setShowLimitModal(null);
    
    if (planKey) {
      // Direct plan upgrade with payment modal
      const planType = subscription?.planType || 'restaurant';
      const allPlans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
      const plan = allPlans[planKey];
      
      if (plan) {
        setSelectedPlanForPayment(plan);
        setShowPaymentModal(true);
      }
    } else {
      // Get recommended plan based on current plan type
      const planType = subscription?.planType || 'restaurant';
      const allPlans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
      const recommendedPlan = allPlans['basic'] || allPlans['advanced'];
      
      if (recommendedPlan) {
        setSelectedPlanForPayment(recommendedPlan);
        setShowPaymentModal(true);
      } else {
        // Fallback to pricing page if no recommended plan
        navigate('/tableserve/pricing');
      }
    }
  };

  const handlePaymentSuccess = (paymentResult) => {
    setShowPaymentModal(false);
    setPaymentData(paymentResult);
    
    // Update subscription after payment
    updateSubscriptionAfterPayment(paymentResult.plan);
    
    setShowSuccessModal(true);
  };

  const updateSubscriptionAfterPayment = (plan) => {
    try {
      const planType = subscription?.planType || 'restaurant';
      
      // Update subscription data in localStorage
      const newSubscription = {
        ...plan,
        planType: planType,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        features: plan.features || {}
      };
      
      localStorage.setItem('tableserve_subscription', JSON.stringify(newSubscription));
      
      // Update user's subscription plan in user data
      const userData = JSON.parse(localStorage.getItem('tableserve_user') || '{}');
      if (userData.id) {
        userData.subscriptionPlan = plan.key;
        userData.subscription = newSubscription; // Add full subscription object
        localStorage.setItem('tableserve_user', JSON.stringify(userData));
      }
      
      // Update restaurant/zone data with new plan - CONSISTENT FORMAT
      if (planType === 'restaurant') {
        const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
        const updatedRestaurants = restaurants.map(restaurant => {
          if (restaurant.id === userData.restaurantId) {
            return { 
              ...restaurant, 
              subscriptionPlan: plan.key, // Use plan.key consistently
              subscription: newSubscription // Add full subscription object
            };
          }
          return restaurant;
        });
        localStorage.setItem('tableserve_restaurants', JSON.stringify(updatedRestaurants));
      } else {
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        const updatedZones = zones.map(zone => {
          if (zone.id === userData.zoneId) {
            return { 
              ...zone, 
              subscriptionPlan: plan.key, // Use plan.key consistently
              subscription: newSubscription // Add full subscription object
            };
          }
          return zone;
        });
        localStorage.setItem('tableserve_zones', JSON.stringify(updatedZones));
      }
      
      console.log('PlanRestrictions: Subscription updated successfully:', newSubscription);
      
      // Update the local subscription state immediately for this component
      setSubscription(newSubscription);
      
      // Trigger custom event to notify components of subscription change
      window.dispatchEvent(new CustomEvent('subscriptionUpdated', {
        detail: {
          restaurantId: userData.restaurantId,
          zoneId: userData.zoneId,
          newPlan: plan.key,
          planLabel: plan.label,
          subscriptionData: newSubscription
        }
      }));
      
      // Trigger a refresh of counts to reflect the new subscription limits
      setTimeout(() => {
        console.log('PlanRestrictions: Triggering count refresh after subscription update');
        // Force re-render by updating the dependency
        setCurrentCounts(prev => ({ ...prev }));
      }, 100);
      
      console.log('PlanRestrictions: Local subscription state updated immediately');
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setPaymentData(null);
    setSelectedPlanForPayment(null);
    // Don't reload the page - let the state update handle the UI refresh
    console.log('PlanRestrictions: Success modal closed, subscription should be updated in state');
  };

  const closeLimitModal = () => {
    setShowLimitModal(null);
  };

  return {
    subscription,
    currentCounts,
    checkLimit,
    showLimitModal,
    handleUpgrade,
    closeLimitModal,
    showPaymentModal,
    setShowPaymentModal,
    showSuccessModal,
    selectedPlanForPayment,
    paymentData,
    handlePaymentSuccess,
    handleSuccessClose,
    PlanStatusBadge: (props) => <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} {...props} />,
    FeatureRestriction,
    LimitReachedModal: showLimitModal ? (
      <LimitReachedModal
        {...showLimitModal}
        onClose={closeLimitModal}
        onUpgrade={handleUpgrade}
      />
    ) : null,
    PaymentModal: (
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        selectedPlan={selectedPlanForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />
    ),
    PaymentSuccessModal: (
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        paymentData={paymentData}
        onContinue={handleSuccessClose}
      />
    )
  };
};

export { PlanStatusBadge, FeatureRestriction, LimitReachedModal };