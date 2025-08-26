import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaShieldAlt,
  FaCheck,
  FaRupeeSign
} from 'react-icons/fa';

const PaymentModal = ({ isOpen, onClose, selectedPlan, onPaymentSuccess }) => {
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);

    // Simulate processing and then navigate to account register
    setTimeout(() => {
      setProcessing(false);
      onPaymentSuccess({
        method: 'gateway',
        transactionId: `TXN${Date.now()}`,
        amount: selectedPlan?.priceINR || 0,
        plan: selectedPlan
      });
    }, 2000);
  };

  const getPlanPrice = () => {
    return selectedPlan?.priceINR || 0;
  };

  const getTaxAmount = () => {
    return Math.round(getPlanPrice() * 0.10); // 10% GST
  };

  const getTotalAmount = () => {
    return getPlanPrice() + getTaxAmount();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-raleway font-bold">Complete Payment</h2>
                <p className="text-white/90 font-raleway text-base mt-1">{selectedPlan?.label} Plan</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-8">
              {/* Order Summary */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-raleway font-bold text-gray-800 mb-4 text-lg">Order Summary</h3>
                <div className="space-y-3 text-base">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Plan Price</span>
                    <span className="font-bold font-sans text-lg">₹{getPlanPrice().toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">GST (10%)</span>
                    <span className="font-bold font-sans text-lg">₹{getTaxAmount().toLocaleString('en-IN')}</span>
                  </div>
                  <hr className="my-4 border-orange-200" />
                  <div className="flex justify-between items-center text-xl font-bold text-gray-800 bg-white rounded-lg p-3 border border-gray-100">
                    <span>Total Amount</span>
                    <span className='font-sans text-orange-600'>₹{getTotalAmount().toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Plan Features */}
              <div>
                <h3 className="font-raleway font-bold text-gray-800 mb-5 text-lg">Plan Features</h3>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-4 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <FaRupeeSign className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="font-raleway font-bold text-gray-800 text-lg">{selectedPlan?.label}</h4>
                      <p className="text-base text-gray-600 font-medium">Monthly subscription</p>
                    </div>
                  </div>

                  {selectedPlan?.planType === 'restaurant' ? (
                    <ul className="space-y-4 text-base">
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">Max Tables: <strong className="text-gray-900">{selectedPlan?.maxTables}</strong></span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">Menu Management</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">Order Management</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">QR Code Generation</span>
                      </li>
                      {selectedPlan?.features?.analytics && (
                        <li className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <FaCheck className="text-green-600 text-sm" />
                          </div>
                          <span className="text-gray-700">Analytics Dashboard</span>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <ul className="space-y-4 text-base">
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">Max Tables: <strong className="text-gray-900">{selectedPlan?.maxTables || 'Custom'}</strong></span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">Max Vendors: <strong className="text-gray-900">{selectedPlan?.maxVendors || 'Custom'}</strong></span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">Vendor Management</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <FaCheck className="text-green-600 text-sm" />
                        </div>
                        <span className="text-gray-700">Multi-Restaurant Orders</span>
                      </li>
                      {selectedPlan?.features?.analytics && (
                        <li className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <FaCheck className="text-green-600 text-sm" />
                          </div>
                          <span className="text-gray-700">Analytics Dashboard</span>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>



              {/* Security Badge */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center space-x-3 text-green-700">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FaShieldAlt className="text-green-600 text-lg" />
                  </div>
                  <div>
                    <span className="font-raleway font-bold text-base block">Secure Payment Gateway</span>
                    <p className="text-sm text-green-600 mt-1">Powered by industry-leading payment processors</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Payment Button */}
          <div className="p-8 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-5 rounded-xl font-raleway font-bold text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
            >
              {processing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Redirecting to Payment Gateway...</span>
                </div>
              ) : (
                `Proceed to Pay ₹${getTotalAmount().toLocaleString('en-IN')}`
              )}
            </button>
            <p className="text-sm text-gray-600 text-center mt-4 font-raleway font-medium">
              You'll be redirected to our secure payment gateway to complete the transaction
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;
