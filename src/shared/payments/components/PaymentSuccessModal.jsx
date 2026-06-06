import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { setSubscription, fetchCurrentSubscription, fetchSubscriptionLimits, fetchCurrentCounts } from '@store/slices/subscriptionSlice';
import { updateUserSubscription } from '@store/slices/uiSlice';
import RealtimeDatabaseService from '@services/RealtimeDatabaseService';
import {
  FaCheckCircle,
  FaDownload,
  FaEnvelope,
  FaCalendarAlt,
  FaRupeeSign,
  FaCreditCard,
  FaArrowRight,
  FaCrown
} from 'react-icons/fa';

const PaymentSuccessModal = ({ isOpen, onClose, paymentData, onContinue }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  const handleUpgradeCurrentAccount = async () => {
    // ✅ FIXED: Upgrade current user's subscription by fetching fresh data from backend
    try {
      console.log('PaymentSuccessModal: Starting account upgrade process');
      
      // Clear cache to force fresh data fetch
      RealtimeDatabaseService.clearCache();
      
      // Fetch fresh subscription data from backend
      const freshSubscription = await RealtimeDatabaseService.getCurrentSubscription();
      
      if (freshSubscription) {
        console.log('PaymentSuccessModal: Fresh subscription fetched from backend:', freshSubscription);
        
        // Update Redux store with fresh subscription data
        dispatch(setSubscription(freshSubscription));
        
        // Also fetch and update limits and counts
        dispatch(fetchCurrentSubscription());
        dispatch(fetchSubscriptionLimits());
        dispatch(fetchCurrentCounts());
        
        console.log('PaymentSuccessModal: Redux store updated with fresh data');
      } else {
        console.warn('PaymentSuccessModal: No subscription data returned from backend');
      }
      
      // Trigger custom event to notify components of subscription change
      window.dispatchEvent(new CustomEvent('subscriptionUpdated', {
        detail: {
          newPlan: paymentData.plan?.key,
          planLabel: paymentData.plan?.label,
          timestamp: Date.now()
        }
      }));
      
      console.log('PaymentSuccessModal: Subscription update complete');
      
      // Close modal
      onClose();
      
      // Show success message
      toast.success('Plan upgraded successfully! Your new limits are now active.');
      
    } catch (error) {
      console.error('Error upgrading account:', error);
      toast.error('Failed to refresh subscription data. Please refresh the page.');
      
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
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="bg-theme-bg-primary border border-theme-border-primary rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col relative"
        >
          {/* Success Animation Header */}
          <div className="relative pt-12 pb-8 text-center flex-shrink-0 overflow-hidden bg-gradient-to-b from-green-500/10 to-theme-bg-primary">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-green-500/20 rounded-full blur-[50px] pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative z-10 w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)] border border-green-500/30"
            >
              <FaCheckCircle className="text-6xl text-green-500" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-fredoka font-bold text-theme-text-primary mb-2 relative z-10"
            >
              Payment Successful!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-theme-text-secondary font-raleway text-sm relative z-10"
            >
              Your subscription has been successfully activated
            </motion.p>
          </div>

          {/* Payment Details */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 scrollbar-thin scrollbar-thumb-theme-border-primary">
            
            <div className="bg-theme-bg-secondary/50 rounded-2xl p-6 mb-6 border border-theme-border-primary shadow-sm">
              <h3 className="font-fredoka text-theme-text-primary mb-5 text-lg">Transaction Details</h3>
              
              <div className="space-y-4 font-raleway text-sm">
                <div className="flex items-center justify-between pb-4 border-b border-theme-border-primary border-dashed">
                  <div className="flex items-center space-x-3 text-theme-text-secondary">
                    <FaCreditCard className="text-theme-text-tertiary" />
                    <span className="font-medium">Transaction ID</span>
                  </div>
                  <span className="font-mono font-bold text-theme-text-primary">
                    {paymentData.transactionId}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-theme-border-primary border-dashed">
                  <div className="flex items-center space-x-3 text-theme-text-secondary">
                    <FaRupeeSign className="text-theme-text-tertiary" />
                    <span className="font-medium">Amount Paid</span>
                  </div>
                  <span className="font-sans font-black text-theme-accent-primary text-lg">
                    ₹{paymentData.amount?.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-theme-border-primary border-dashed">
                  <div className="flex items-center space-x-3 text-theme-text-secondary">
                    <FaCrown className="text-theme-text-tertiary" />
                    <span className="font-medium">Plan Type</span>
                  </div>
                  <span className="font-bold text-theme-text-primary">
                    {paymentData.plan?.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-theme-text-secondary">
                    <FaCalendarAlt className="text-theme-text-tertiary" />
                    <span className="font-medium">Valid Until</span>
                  </div>
                  <span className="font-bold font-sans text-theme-text-primary">
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="p-4 bg-theme-accent-primary/5 border border-theme-accent-primary/20 rounded-xl mb-8 flex items-start space-x-4">
              <div className="w-10 h-10 bg-theme-accent-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <FaEnvelope className="text-theme-accent-primary text-lg" />
              </div>
              <div>
                <p className="text-theme-text-primary font-raleway font-bold text-sm">
                  Confirmation Email Sent
                </p>
                <p className="text-theme-text-tertiary font-raleway text-xs mt-1 leading-relaxed">
                  A detailed receipt and subscription information has been sent to your email address.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={handleUpgradeCurrentAccount}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-raleway font-bold text-lg shadow-lg shadow-green-500/25 transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Access Premium Features</span>
                <FaArrowRight className="text-base" />
              </button>

              <button
                onClick={handleDownloadReceipt}
                className="w-full bg-theme-bg-secondary hover:bg-theme-bg-hover text-theme-text-primary border border-theme-border-primary py-3.5 rounded-xl font-raleway font-semibold flex items-center justify-center space-x-2 transition-colors text-sm"
              >
                <FaDownload className="text-theme-text-tertiary" />
                <span>Download Receipt</span>
              </button>
            </div>

            {/* Support Info */}
            <div className="text-center">
              <p className="text-theme-text-tertiary font-raleway text-xs">
                Need help? Contact us at{' '}
                <a href="mailto:support@tableserve.com" className="text-theme-accent-primary hover:underline font-medium">
                  support@tableserves.com
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