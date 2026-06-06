import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaShieldAlt,
  FaCheck,
  FaRupeeSign,
  FaExclamationTriangle,
  FaCreditCard,
  FaSpinner,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import ApiService from '@/shared/api/ApiService';

const OrderPaymentModal = ({ 
  isOpen, 
  onClose, 
  order, 
  onPaymentSuccess, 
  onPaymentFailure 
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkError, setNetworkError] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        // Check if Razorpay is already loaded
        if (window.Razorpay) {
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    if (isOpen) {
      loadRazorpayScript().then(setRazorpayLoaded);
    }
  }, [isOpen]);

  const handlePayment = async (isRetry = false) => {
    if (!razorpayLoaded) {
      setError('Payment system is loading. Please wait...');
      return;
    }

    if (!order || !order._id) {
      setError('Order information is missing. Please try again.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setNetworkError(false);

      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      console.log('Creating payment order for:', order._id);

      // Create Razorpay order
      const paymentResponse = await ApiService.post('/orders/create-payment', {
        orderId: order._id
      });

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || 'Failed to create payment order');
      }

      const { razorpayOrderId, amount, currency, keyId } = paymentResponse.data;

      console.log('Payment order created:', { razorpayOrderId, amount, currency });

      // Configure Razorpay options
      const options = {
        key: keyId,
        amount: amount, // Amount already in paise from backend
        currency: currency,
        name: 'TableServe',
        description: `Order #${order.orderNumber}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          try {
            console.log('Payment successful, verifying...', response);

            // Verify payment on backend
            const verifyResponse = await ApiService.post('/orders/verify-payment', {
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.success) {
              toast.success('Payment successful! Your order has been confirmed.');
              onPaymentSuccess({
                orderId: order._id,
                paymentId: response.razorpay_payment_id,
                orderData: verifyResponse.data.order
              });
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
            setError('Payment verification failed. Please contact support.');
            onPaymentFailure && onPaymentFailure(error);
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: order.customer?.name || 'Customer',
          email: order.customer?.email || '',
          contact: order.customer?.phone || ''
        },
        theme: {
          color: '#FF6B6B' // Your brand color
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal dismissed');
            setProcessing(false);
            setError('Payment was cancelled');
          }
        }
      };

      console.log('Opening Razorpay checkout with options:', options);

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation error:', error);

      // Check if it's a network error
      const isNetworkError = !navigator.onLine ||
                           error.message.includes('Network Error') ||
                           error.message.includes('fetch') ||
                           error.code === 'NETWORK_ERROR';

      if (isNetworkError) {
        setNetworkError(true);
        setError('Network connection failed. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'Failed to initiate payment');
      }

      setProcessing(false);
      onPaymentFailure && onPaymentFailure(error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        onClick={(e) => e.target === e.currentTarget && !processing && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <FaCreditCard className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Complete Payment</h2>
                <p className="text-sm text-gray-600">Order #{order?.orderNumber}</p>
              </div>
            </div>
            {!processing && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Table Number:</span>
                  <span className="font-medium">{order?.tableNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium">{order?.items?.length || 0} items</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="flex items-center">
                    <FaRupeeSign className="text-sm mr-1" />
                    {order?.pricing?.total?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Recipient Information */}
            {paymentData?.paymentConfig && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <FaInfoCircle className="text-blue-600" />
                  Payment Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Recipient:</span>
                    <span className="font-medium text-blue-800">{paymentData.paymentConfig.entityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">UPI ID:</span>
                    <span className="font-medium text-blue-800">{paymentData.paymentConfig.upiId}</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    Your payment will be processed directly to the {paymentData.paymentConfig.entityType}'s UPI account.
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center space-x-2">
                  <FaExclamationTriangle className="text-red-500" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </motion.div>
            )}

            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2">
                <FaShieldAlt className="text-green-500" />
                <span className="text-green-700 text-sm font-medium">
                  Secure payment powered by Razorpay
                </span>
              </div>
            </div>

            {/* Payment Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePayment}
              disabled={processing || !razorpayLoaded}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                processing || !razorpayLoaded
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {processing ? (
                <div className="flex items-center justify-center space-x-2">
                  <FaSpinner className="animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : !razorpayLoaded ? (
                <div className="flex items-center justify-center space-x-2">
                  <FaSpinner className="animate-spin" />
                  <span>Loading Payment System...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <FaCreditCard />
                  <span>Pay ₹{order?.pricing?.total?.toFixed(2) || '0.00'}</span>
                </div>
              )}
            </motion.button>

            {/* Retry Button for Network Errors */}
            {networkError && !processing && retryCount < 3 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePayment(true)}
                className="w-full mt-3 py-3 rounded-xl font-medium text-blue-600 border border-blue-300 hover:border-blue-400 transition-all duration-300"
              >
                Retry Payment ({3 - retryCount} attempts left)
              </motion.button>
            )}

            {/* Cancel Button */}
            {!processing && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full mt-3 py-3 rounded-xl font-medium text-gray-600 border border-gray-300 hover:border-gray-400 transition-all duration-300"
              >
                Cancel
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderPaymentModal;
