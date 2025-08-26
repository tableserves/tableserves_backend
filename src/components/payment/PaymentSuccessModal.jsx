import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setSubscription } from '../../store/slices/subscriptionSlice';
import { updateUserSubscription } from '../../store/slices/uiSlice';
import {
  FaCheckCircle,
  FaDownload,
  FaEnvelope,
  FaCalendarAlt,
  FaRupeeSign,
  FaCreditCard,
  FaArrowRight
} from 'react-icons/fa';

const PaymentSuccessModal = ({ isOpen, onClose, paymentData, onContinue }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  const handleUpgradeCurrentAccount = () => {
    // Upgrade current user's subscription instead of creating new account
    try {
      // Update current user's subscription
      const userData = JSON.parse(localStorage.getItem('tableserve_user') || '{}');
      if (userData.id) {
        userData.subscriptionPlan = paymentData?.plan?.key;
        userData.subscription = {
          ...paymentData.plan,
          planType: paymentData.plan?.planType || 'restaurant',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          features: paymentData.plan?.features || {}
        };
        localStorage.setItem('tableserve_user', JSON.stringify(userData));
      }
      
      // Update subscription data
      const newSubscription = {
        ...paymentData.plan,
        planType: paymentData.plan?.planType || 'restaurant',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        features: paymentData.plan?.features || {}
      };
      localStorage.setItem('tableserve_subscription', JSON.stringify(newSubscription));
      
      // Update restaurant/zone data - CONSISTENT FORMAT
      if (newSubscription.planType === 'restaurant') {
        const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
        const updatedRestaurants = restaurants.map(restaurant => {
          if (restaurant.id === userData.restaurantId) {
            return { 
              ...restaurant, 
              subscriptionPlan: paymentData.plan?.key, // Use plan.key consistently
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
              subscriptionPlan: paymentData.plan?.key, // Use plan.key consistently
              subscription: newSubscription // Add full subscription object
            };
          }
          return zone;
        });
        localStorage.setItem('tableserve_zones', JSON.stringify(updatedZones));
      }
      
      console.log('PaymentSuccessModal: Account upgraded successfully:', newSubscription);
      
      // Update Redux store with new subscription data IMMEDIATELY
      dispatch(setSubscription(newSubscription));
      
      // CRITICAL: Update auth user state with new subscription data
      if (isAuthenticated && user) {
        // Update auth state in Redux to include new subscription
        dispatch(updateUserSubscription({
          subscription: newSubscription
        }));
        
        console.log('PaymentSuccessModal: Updated auth user state with new subscription:', newSubscription);
      }
      
      // Trigger custom event to notify super admin components of subscription change
      window.dispatchEvent(new CustomEvent('subscriptionUpdated', {
        detail: {
          restaurantId: userData.restaurantId,
          zoneId: userData.zoneId,
          newPlan: paymentData.plan?.key,
          planLabel: paymentData.plan?.label,
          subscriptionData: newSubscription
        }
      }));
      
      console.log('PaymentSuccessModal: Redux store and auth state updated, events dispatched');
      
      // Close modal and let state updates handle the UI refresh
      onClose();
      
      // Force a brief timeout to ensure state updates are processed
      setTimeout(() => {
        console.log('PaymentSuccessModal: State update timeout completed');
      }, 100);
    } catch (error) {
      console.error('Error upgrading account:', error);
      // Fallback to onContinue if provided
      if (onContinue) {
        onContinue();
      }
    }
  };
  const handleDownloadReceipt = () => {
    // Create a simple receipt content
    const receiptContent = `
TABLESERVE PAYMENT RECEIPT
========================

Transaction ID: ${paymentData?.transactionId}
Date: ${new Date().toLocaleDateString('en-IN')}
Time: ${new Date().toLocaleTimeString('en-IN')}

Plan Details:
- Plan: ${paymentData?.plan?.label}
- Duration: Monthly
- Amount: ₹${paymentData?.amount?.toLocaleString('en-IN')}

Payment Method: ${paymentData?.method?.toUpperCase()}
Status: SUCCESS

Thank you for choosing TableServe!
Visit: www.tableserve.com
Support: support@tableserve.com
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TableServe_Receipt_${paymentData?.transactionId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen || !paymentData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Success Animation */}
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-8 text-center flex-shrink-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <FaCheckCircle className="text-5xl text-green-500" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-raleway font-bold text-white mb-3"
            >
              Payment Successful!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-white/90 font-raleway text-lg"
            >
              Your subscription has been activated
            </motion.p>
          </div>

          {/* Payment Details */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-100">
              <h3 className="font-raleway font-bold text-gray-800 mb-5 text-lg">Payment Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <FaCreditCard className="text-gray-600" />
                    </div>
                    <span className="text-gray-700 font-raleway font-medium">Transaction ID</span>
                  </div>
                  <span className="font-mono text-base font-bold text-gray-800">
                    {paymentData.transactionId}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <FaRupeeSign className="text-gray-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Amount Paid</span>
                  </div>
                  <span className="font-bold font-sans text-gray-800 text-lg">
                    ₹{paymentData.amount?.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <FaCalendarAlt className="text-gray-600" />
                    </div>
                    <span className="text-gray-700 font-raleway font-medium">Plan</span>
                  </div>
                  <span className="font-bold text-gray-800 text-base">
                    {paymentData.plan?.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <FaCalendarAlt className="text-gray-600" />
                    </div>
                    <span className="text-gray-700 font-raleway font-medium">Valid Until</span>
                  </div>
                  <span className="font-bold font-sans text-gray-800 text-base">
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 mb-6">
              <button
                onClick={handleDownloadReceipt}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-raleway font-semibold flex items-center justify-center space-x-3 transition-colors text-base"
              >
                <FaDownload className="text-lg" />
                <span>Download Receipt</span>
              </button>

              <button
                onClick={handleUpgradeCurrentAccount}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-xl font-raleway font-bold text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <span>Upgrade My Account</span>
                <FaArrowRight className="text-lg" />
              </button>
            </div>

            {/* Additional Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                  <FaEnvelope className="text-blue-600" />
                </div>
                <div>
                  <p className="text-blue-800 font-raleway font-bold text-base">
                    Confirmation Email Sent
                  </p>
                  <p className="text-blue-600 font-raleway text-sm mt-1">
                    A detailed receipt and subscription information has been sent to your email address.
                  </p>
                </div>
              </div>
            </div>

            {/* Support Info */}
            <div className="text-center">
              <p className="text-gray-500 font-raleway text-sm">
                Need help? Contact us at{' '}
                <a href="mailto:support@tableserve.com" className="text-green-600 hover:underline font-medium">
                  support@tableserve.com
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentSuccessModal;
