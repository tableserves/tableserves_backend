import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FaCrown, 
  FaRocket, 
  FaCheck, 
  FaTimes, 
  FaTable, 
  FaUtensils, 
  FaBuilding,
  FaChartLine,
  FaQrcode,
  FaBolt,
  FaArrowUp,
  FaStar,
  FaShieldAlt,
  FaHeadset
} from 'react-icons/fa';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../../constants/plans';
import { usePlanRestrictions } from './PlanRestrictions';
import { setSubscription } from '../../store/slices/subscriptionSlice';
import { updateUserSubscription } from '../../store/slices/uiSlice';
import PaymentModal from '../payment/PaymentModal';
import PaymentSuccessModal from '../payment/PaymentSuccessModal';

const UpgradeTab = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { subscription } = usePlanRestrictions();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  // Determine plan type from current subscription
  const planType = subscription?.planType || 'restaurant';
  const currentPlan = subscription?.plan || subscription?.key || 'free';
  
  // Check if user is on premium plan
  const isPremiumUser = currentPlan === 'premium';
  
  // Get plans for the current type
  const allPlans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
  const availablePlans = Object.values(allPlans).filter(plan => 
    plan.key !== 'free' && plan.priceINR !== null
  );

  const currentPlanData = allPlans[currentPlan];

  const handleUpgrade = (planKey) => {
    const plan = allPlans[planKey];
    setSelectedPlanForPayment(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentResult) => {
    setShowPaymentModal(false);
    setPaymentData(paymentResult);
    
    // Update subscription in localStorage
    updateSubscriptionAfterPayment(paymentResult.plan);
    
    setShowSuccessModal(true);
  };

  const updateSubscriptionAfterPayment = (plan) => {
    try {
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
      
      console.log('UpgradeTab: Subscription updated successfully:', newSubscription);
      
      // Update Redux store IMMEDIATELY with new subscription data
      dispatch(setSubscription(newSubscription));
      
      // CRITICAL: Update auth user state with new subscription data
      if (isAuthenticated && user) {
        // Update auth state in Redux to include new subscription
        dispatch(updateUserSubscription({
          subscription: newSubscription
        }));
        
        console.log('UpgradeTab: Updated auth user state with new subscription:', newSubscription);
      }
      
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
      
      console.log('UpgradeTab: Redux store and auth state updated, events dispatched');
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setPaymentData(null);
    setSelectedPlanForPayment(null);
    // Don't reload the page - let the state update handle the UI refresh
    console.log('UpgradeTab: Success modal closed, subscription should be updated in state');
  };

  const PlanCard = ({ plan, isRecommended, isCurrent }) => (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        isRecommended
          ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md ring-2 ring-orange-100'
          : isCurrent
            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md ring-2 ring-green-100'
            : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
      }`}
    >
      {isRecommended && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
          RECOMMENDED
        </div>
      )}
      
      {isCurrent && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
          CURRENT PLAN
        </div>
      )}

      <div className="p-6">
        {/* Plan Header */}
        <div className="flex items-center mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
            isRecommended ? 'bg-orange-100' : isCurrent ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {plan.key === 'basic' ? (
              <FaRocket className={`text-xl ${isRecommended ? 'text-orange-600' : isCurrent ? 'text-green-600' : 'text-gray-600'}`} />
            ) : (
              <FaCrown className={`text-xl ${isRecommended ? 'text-orange-600' : isCurrent ? 'text-green-600' : 'text-blue-600'}`} />
            )}
          </div>
          <div>
            <h3 className={`font-bold text-lg ${isRecommended ? 'text-orange-700' : isCurrent ? 'text-green-700' : 'text-gray-900'}`}>
              {plan.label}
            </h3>
            <p className="text-gray-600 text-sm">Perfect for growing businesses</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <div className={`text-3xl font-bold ${isRecommended ? 'text-orange-700' : isCurrent ? 'text-green-700' : 'text-gray-900'}`}>
            ₹{plan.priceINR.toLocaleString('en-IN')}
          </div>
          <div className="text-gray-500 text-sm mt-1">per month</div>
        </div>

        {/* Plan Limits */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">What's Included</h4>
          <div className="space-y-2 text-sm">
            {planType === 'restaurant' ? (
              <>
                <div className="flex items-center">
                  <FaTable className="text-orange-500 mr-2" />
                  <span>Up to {plan.maxTables} tables</span>
                </div>
                <div className="flex items-center">
                  <FaUtensils className="text-orange-500 mr-2" />
                  <span>{plan.maxCategories} categories</span>
                </div>
                <div className="flex items-center">
                  <FaStar className="text-orange-500 mr-2" />
                  <span>{plan.maxMenuItems} items per category</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <FaBuilding className="text-blue-500 mr-2" />
                  <span>Up to {plan.maxShops} shops</span>
                </div>
                <div className="flex items-center">
                  <FaTable className="text-blue-500 mr-2" />
                  <span>{plan.maxTables || 'Unlimited'} tables per shop</span>
                </div>
                <div className="flex items-center">
                  <FaUtensils className="text-blue-500 mr-2" />
                  <span>{plan.maxCategories} categories</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Features</h4>
          <ul className="space-y-2">
            <li className="flex items-center text-sm">
              <div className="bg-green-100 p-1 rounded-full mr-3">
                <FaCheck className="text-green-600 text-xs" />
              </div>
              <span>Menu Management</span>
            </li>
            <li className="flex items-center text-sm">
              <div className="bg-green-100 p-1 rounded-full mr-3">
                <FaCheck className="text-green-600 text-xs" />
              </div>
              <span>QR Code Generation</span>
            </li>
            {plan.features?.analytics && (
              <li className="flex items-center text-sm">
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
                <span>Advanced Analytics</span>
              </li>
            )}
            {plan.features?.branding && (
              <li className="flex items-center text-sm">
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
                <span>QR Customization</span>
              </li>
            )}
            {plan.features?.prioritySupport && (
              <li className="flex items-center text-sm">
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
                <span>Priority Support</span>
              </li>
            )}
          </ul>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleUpgrade(plan.key)}
          disabled={isCurrent}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
            isCurrent
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : isRecommended
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg'
                : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {isCurrent ? 'Current Plan' : `Upgrade to ${plan.label}`}
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-fredoka text-gray-900 mb-2">
          {isPremiumUser ? 'Premium Plan Status' : 'Upgrade Your Plan'}
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          {isPremiumUser 
            ? 'You are on our premium plan with unlimited access to all features'
            : 'Unlock more features and grow your business with our premium plans'
          }
        </p>
      </motion.div>

      {/* Premium User Status */}
      {isPremiumUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 text-white text-center"
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCrown className="text-white text-4xl" />
          </div>
          <h2 className="text-3xl font-fredoka mb-4">
            🎉 You're at Premium Plan!
          </h2>
          <p className="text-purple-100 text-lg mb-6">
            Enjoy unlimited access to all features with no restrictions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <FaShieldAlt className="text-3xl mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Unlimited Tables</h4>
              <p className="text-sm text-purple-100">
                No limits on table creation
              </p>
            </div>
            <div className="text-center">
              <FaUtensils className="text-3xl mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Unlimited Menu Items</h4>
              <p className="text-sm text-purple-100">
                Create as many items as you need
              </p>
            </div>
            <div className="text-center">
              <FaHeadset className="text-3xl mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Priority Support</h4>
              <p className="text-sm text-purple-100">
                24/7 dedicated support team
              </p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-purple-100">
              Need help or have questions? Contact us at{' '}
              <a href="mailto:admin@tableserve.com" className="text-white font-semibold hover:underline">
                admin@tableserve.com
              </a>
            </p>
          </div>
        </motion.div>
      )}

      {/* Show upgrade options only for non-premium users */}
      {!isPremiumUser && (
        <>
      {/* Current Plan Status */}
      {currentPlanData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <FaShieldAlt className="text-blue-600 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-fredoka text-blue-900">
                  Current Plan: {currentPlanData.label}
                </h3>
                <p className="text-blue-700">
                  {currentPlan === 'free' ? 'Free Plan' : `₹${currentPlanData.priceINR}/month`}
                </p>
              </div>
            </div>
            <div className="text-right">
              {planType === 'restaurant' ? (
                <div className="text-sm text-blue-700">
                  <div>{currentPlanData.maxTables} tables</div>
                  <div>{currentPlanData.maxCategories} categories</div>
                  <div>{currentPlanData.maxMenuItems} items/category</div>
                </div>
              ) : (
                <div className="text-sm text-blue-700">
                  <div>{currentPlanData.maxShops} shops</div>
                  <div>{currentPlanData.maxTables || 'Unlimited'} tables</div>
                  <div>{currentPlanData.maxCategories} categories</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Upgrade Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white"
      >
        <div className="text-center mb-6">
          <FaBolt className="text-4xl mx-auto mb-3" />
          <h2 className="text-2xl font-fredoka mb-2">Why Upgrade?</h2>
          <p className="text-orange-100">
            Unlock powerful features to scale your business
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <FaChartLine className="text-2xl mx-auto mb-2" />
            <h4 className="font-semibold mb-1">Advanced Analytics</h4>
            <p className="text-sm text-orange-100">
              Detailed insights and revenue tracking
            </p>
          </div>
          <div className="text-center">
            <FaQrcode className="text-2xl mx-auto mb-2" />
            <h4 className="font-semibold mb-1">QR Customization</h4>
            <p className="text-sm text-orange-100">
              Brand your QR codes with logos and colors
            </p>
          </div>
          <div className="text-center">
            <FaHeadset className="text-2xl mx-auto mb-2" />
            <h4 className="font-semibold mb-1">Priority Support</h4>
            <p className="text-sm text-orange-100">
              Get help when you need it most
            </p>
          </div>
        </div>
      </motion.div>

      {/* Available Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-fredoka text-gray-900 mb-6 text-center">
          Choose Your Plan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availablePlans.map((plan, index) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isRecommended={plan.key === 'basic'}
              isCurrent={plan.key === currentPlan}
            />
          ))}
        </div>
      </motion.div>

      {/* Need Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center bg-gray-50 rounded-2xl p-6"
      >
        <h3 className="text-lg font-fredoka text-gray-900 mb-2">
          Need a Custom Plan?
        </h3>
        <p className="text-gray-600 mb-4">
          Contact our team for enterprise solutions and custom pricing
        </p>
        <div className="flex justify-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Contact Sales
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="border-2 border-gray-900 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-900 hover:text-white transition-colors"
          >
            Schedule Demo
          </motion.button>
        </div>
      </motion.div>
        </>
      )}
      
      {/* Payment Modals - shown for all users */}
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