import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaShieldAlt,
  FaCheck,
  FaRupeeSign,
  FaExclamationTriangle,
  FaBuilding,
  FaTable
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import ApiService from '../../api/ApiService';
import simpleTokenService from '../../auth/SimpleTokenService';

const PaymentModal = ({ isOpen, onClose, selectedPlan, onPaymentSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    if (isOpen) {
      loadRazorpayScript();
    }
  }, [isOpen]);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      if (typeof ApiService.post !== 'function') {
        throw new Error('ApiService.post is not available. Please refresh the page and try again.');
      }

      const token = simpleTokenService.getAccessToken();
      if (!token) {
        throw new Error('You must be logged in to make a payment. Please log in and try again.');
      }

      if (!selectedPlan.key || !selectedPlan.planType) {
        throw new Error('Plan key or planType is missing. Please select a valid plan.');
      }

      const planIdentifier = {
        key: selectedPlan.key,
        planType: selectedPlan.planType,
        name: selectedPlan.label || selectedPlan.name,
        price: selectedPlan.priceINR || selectedPlan.price || 0
      };

      const orderResponse = await ApiService.post('/payment/create-plan-order', {
        planKey: planIdentifier.key,
        planType: planIdentifier.planType
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }

      const { orderId, amount, currency, key, plan: orderPlan, user: userData } = orderResponse.data;

      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: 'TableServe',
        description: `${orderPlan?.name || selectedPlan?.name || 'Plan'} Subscription`,
        order_id: orderId,
        method: {
          card: true,
          netbanking: true,
          wallet: true,
          upi: true,
          paylater: true
        },
        handler: async function (response) {
          try {
            const verifyResponse = await ApiService.post('/payment/verify-plan-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.success) {
              toast.success('Payment successful! Your plan has been activated.');
              onPaymentSuccess({
                method: 'razorpay',
                transactionId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: amount,
                plan: orderPlan,
                paymentData: verifyResponse.data
              });
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
            setError('Payment verification failed. Please contact support.');
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: userData?.name || 'Customer',
          email: userData?.email || '',
          contact: userData?.contact || ''
        },
        notes: {
          plan_id: selectedPlan?.id || orderPlan?.id || 'unknown',
          plan_name: selectedPlan?.name || orderPlan?.name || 'Unknown Plan'
        },
        theme: {
          color: '#2337C6' // Match dashboard theme
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
            setError('Payment was cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      let errorMessage = 'Payment failed. Please try again.';

      if (error.message && error.message.includes('ApiService.post is not a function')) {
        errorMessage = 'Payment service is not available. Please contact support.';
      } else if (error.response?.status === 503) {
        errorMessage = 'Payment service is temporarily unavailable. Please try again later.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Payment service not found. Please contact support.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Invalid request. Please check your plan selection.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setProcessing(false);
    }
  };

  const getPlanPrice = () => selectedPlan?.priceINR || 0;
  const getTaxAmount = () => Math.round(getPlanPrice() * 0.18);
  const getTotalAmount = () => getPlanPrice() + getTaxAmount();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-theme-bg-primary rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-theme-border-primary"
        >
          {/* Header */}
          <div className="bg-theme-bg-secondary/50 border-b border-theme-border-primary p-6 flex-shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-fredoka text-theme-text-primary">Complete Upgrade</h2>
              <p className="text-theme-text-tertiary font-raleway text-xs mt-1">Review your plan and confirm payment</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center text-theme-text-tertiary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-colors"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-theme-border-primary">
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Order Summary Receipt */}
              <div className="bg-theme-bg-secondary/30 rounded-2xl p-6 border border-theme-border-primary shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-theme-accent-primary/5 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="font-fredoka text-theme-text-primary mb-5 text-lg flex items-center gap-2">
                  Order Summary
                </h3>
                
                <div className="space-y-4 text-sm font-raleway">
                  <div className="flex justify-between items-center text-theme-text-secondary">
                    <span>{selectedPlan?.label} Plan (Monthly)</span>
                    <span className="font-sans font-medium text-theme-text-primary">₹{getPlanPrice().toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-theme-text-secondary">
                    <span>GST (18%)</span>
                    <span className="font-sans font-medium text-theme-text-primary">₹{getTaxAmount().toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-theme-border-primary border-dashed">
                    <div className="flex justify-between items-end">
                      <span className="text-theme-text-primary font-bold">Total Amount</span>
                      <span className="font-sans text-2xl font-black text-theme-accent-primary">₹{getTotalAmount().toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-status-error-light/50 border border-status-error/30 rounded-2xl p-4">
                      <div className="flex items-start space-x-3 text-status-error">
                        <div className="w-8 h-8 bg-status-error/10 rounded-full flex items-center justify-center shrink-0">
                          <FaExclamationTriangle className="text-sm" />
                        </div>
                        <div>
                          <span className="font-raleway font-bold text-sm block">Payment Interrupted</span>
                          <p className="text-xs text-status-error/80 mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Plan Features Preview */}
              <div>
                <h3 className="font-fredoka text-theme-text-primary mb-4 text-lg">What you're getting</h3>
                <div className="bg-theme-bg-secondary/30 rounded-2xl border border-theme-border-primary p-6">
                  <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-theme-border-primary">
                    <div className="w-12 h-12 bg-theme-accent-primary/10 rounded-xl flex items-center justify-center">
                      <FaRupeeSign className="text-theme-accent-primary text-xl" />
                    </div>
                    <div>
                      <h4 className="font-fredoka text-theme-text-primary text-lg">{selectedPlan?.label} Tier</h4>
                      <p className="text-xs text-theme-text-tertiary font-raleway">Billed monthly • Cancel anytime</p>
                    </div>
                  </div>

                  <ul className="space-y-4 text-sm font-raleway">
                    {/* Capacity Limits */}
                    <li className="flex items-center space-x-3 text-theme-text-secondary">
                      <FaTable className="text-theme-text-tertiary shrink-0" />
                      <span>Max Tables: <strong className="text-theme-text-primary">{selectedPlan?.maxTables === -1 ? 'Unlimited' : selectedPlan?.maxTables || 'Custom'}</strong></span>
                    </li>
                    {selectedPlan?.planType === 'zone' && (
                      <li className="flex items-center space-x-3 text-theme-text-secondary">
                        <FaBuilding className="text-theme-text-tertiary shrink-0" />
                        <span>Max Vendors: <strong className="text-theme-text-primary">{selectedPlan?.maxVendors === -1 ? 'Unlimited' : selectedPlan?.maxVendors || 'Custom'}</strong></span>
                      </li>
                    )}
                    
                    {/* Features */}
                    <li className="flex items-center space-x-3 text-theme-text-secondary">
                      <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                        <FaCheck className="text-green-500 text-[10px]" />
                      </div>
                      <span>Menu & Order Management</span>
                    </li>
                    <li className="flex items-center space-x-3 text-theme-text-secondary">
                      <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                        <FaCheck className="text-green-500 text-[10px]" />
                      </div>
                      <span>QR Code Generation</span>
                    </li>
                    {selectedPlan?.features?.analytics && (
                      <li className="flex items-center space-x-3 text-theme-text-secondary">
                        <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                          <FaCheck className="text-green-500 text-[10px]" />
                        </div>
                        <span>Advanced Analytics Dashboard</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Security Badge */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex items-center justify-center text-center">
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-xs font-raleway font-semibold">
                  <FaShieldAlt />
                  <span>Secure 256-bit encrypted checkout</span>
                </div>
              </div>

            </div>
          </div>

          {/* Fixed Payment Button */}
          <div className="p-6 border-t border-theme-border-primary bg-theme-bg-secondary/50 flex-shrink-0">
            <button
              onClick={handlePayment}
              disabled={processing}
              className="relative w-full overflow-hidden bg-theme-accent-primary hover:bg-theme-accent-secondary text-white py-4 rounded-xl font-raleway font-bold text-lg shadow-lg hover:shadow-theme-accent-primary/25 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {/* Button Shine Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
              
              {processing ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Connecting to Gateway...</span>
                </div>
              ) : (
                `Pay ₹${getTotalAmount().toLocaleString('en-IN')}`
              )}
            </button>
            <p className="text-[10px] text-theme-text-tertiary text-center mt-3 font-raleway">
              By proceeding, you agree to our Terms of Service and Billing Agreement
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;