import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import PaymentService from '@/shared/payments/PaymentService';
import PlanService from '../services/PlanService';
import logger from '@/services/LoggingService';

const PlanUpgrade = ({ 
  planType = 'restaurant', 
  currentPlan = null, 
  onUpgradeSuccess = () => {},
  onClose = () => {} 
}) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadPlans();
    loadRazorpaySDK();
  }, [planType]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await PlanService.getPlans(planType);
      
      if (response.success && response.data) {
        // Show free plan as current plan information, but don't allow upgrading to another free plan
        // Only filter out the current plan if it exists
        const availablePlans = response.data.filter(plan => {
          // Skip current plan to avoid showing it as an upgrade option
          if (currentPlan && plan.key === currentPlan.key) return false;
          return true;
        });
        
        setPlans(availablePlans);
      }
    } catch (error) {
      logger.error('Failed to load plans', error, 'PlanUpgrade');
      toast.error('Failed to load plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpaySDK = async () => {
    try {
      await PaymentService.loadRazorpaySDK();
    } catch (error) {
      logger.error('Failed to load Razorpay SDK', error, 'PlanUpgrade');
      toast.error('Payment system not available. Please refresh and try again.');
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPlan) return;

    try {
      setProcessingPayment(true);
      
      // Create payment order
      const orderResponse = await PaymentService.createPlanOrder({
        planKey: selectedPlan.key,
        planType: selectedPlan.planType
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }

      const orderData = orderResponse.data;

      // Check if using mock payments
      if (import.meta.env.VITE_MOCK_PAYMENTS === 'true') {
        // Simulate mock payment success
        setTimeout(() => {
          handlePaymentSuccess({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `mock_payment_${Date.now()}`,
            razorpay_signature: 'mock_signature'
          });
        }, 2000);
        return;
      }

      // Initialize Razorpay payment
      PaymentService.initializeRazorpayPayment(
        orderData,
        handlePaymentSuccess,
        handlePaymentError
      );

    } catch (error) {
      logger.error('Payment initialization failed', error, 'PlanUpgrade');
      toast.error(error.message || 'Failed to initialize payment. Please try again.');
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      // Verify payment with backend
      const verificationResponse = await PaymentService.verifyPlanPayment(paymentData);

      if (verificationResponse.success) {
        toast.success('Payment successful! Your plan has been upgraded.');
        logger.info('Plan upgrade successful', { 
          planName: selectedPlan.name,
          paymentId: paymentData.razorpay_payment_id 
        }, 'PlanUpgrade');
        
        // Call success callback
        onUpgradeSuccess(verificationResponse.data);
        
        // Close modals
        setShowPaymentModal(false);
        onClose();
      } else {
        throw new Error(verificationResponse.message || 'Payment verification failed');
      }
    } catch (error) {
      logger.error('Payment verification failed', error, 'PlanUpgrade');
      toast.error(error.message || 'Payment verification failed. Please contact support.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentError = (error) => {
    logger.error('Razorpay payment failed', error, 'PlanUpgrade');
    
    let errorMessage = 'Payment failed. Please try again.';
    
    if (error.description) {
      errorMessage = error.description;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
    setProcessingPayment(false);
  };

  const formatFeatures = (features) => {
    return PlanService.formatPlanFeatures(features);
  };

  const formatLimits = (limits) => {
    return PlanService.formatPlanLimits(limits);
  };

  const calculatePrice = (basePrice) => {
    return PlanService.calculatePlanPrice(basePrice);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9997]">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Plan Selection Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Upgrade Your {planType === 'restaurant' ? 'Restaurant' : 'Zone'} Plan
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            {currentPlan && (
              <p className="mt-2 text-gray-600">
                Current Plan: <span className="font-semibold">{currentPlan.name}</span>
              </p>
            )}
          </div>

          <div className="p-6">
            {plans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No upgrade plans available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const priceInfo = calculatePrice(plan.price);
                  const features = formatFeatures(plan.features || {});
                  const limits = formatLimits(plan.limits || {});

                  return (
                    <div
                      key={plan._id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        <div className="mt-2">
                          <span className="text-3xl font-bold text-blue-600">
                            {priceInfo.formattedTotal}
                          </span>
                          <span className="text-gray-600 text-sm">/month</span>
                        </div>
                        {plan.price > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Base: {priceInfo.formattedBase} + Tax: {priceInfo.formattedTax}
                          </p>
                        )}
                        {plan.price === 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Free Plan
                          </p>
                        )}
                      </div>

                      {plan.description && (
                        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                      )}

                      {/* Plan Limits */}
                      {limits.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Limits</h4>
                          <ul className="space-y-1">
                            {limits.map((limit) => (
                              <li key={limit.key} className="text-sm text-gray-600 flex justify-between">
                                <span>{limit.label}:</span>
                                <span className={limit.isUnlimited ? 'text-green-600 font-semibold' : ''}>
                                  {limit.value}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Plan Features */}
                      {features.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-900 mb-2">Features</h4>
                          <ul className="space-y-1">
                            {features.slice(0, 5).map((feature) => (
                              <li key={feature.key} className="text-sm text-gray-600 flex items-center">
                                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {feature.label}
                              </li>
                            ))}
                            {features.length > 5 && (
                              <li className="text-sm text-gray-500">
                                +{features.length - 5} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={() => handlePlanSelect(plan)}
                        disabled={plan.price === 0} // Disable upgrading to free plan
                        className={`w-full py-2 px-4 rounded-lg transition-colors font-semibold ${
                          plan.price === 0 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {plan.price === 0 ? 'Current Plan' : `Upgrade to ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Confirm Plan Upgrade
              </h3>
              
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900">{selectedPlan.name}</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Duration: 1 Month (30 days)
                  </p>
                  
                  {(() => {
                    const priceInfo = calculatePrice(selectedPlan.price);
                    return (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Base Price:</span>
                          <span>{priceInfo.formattedBase}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax (18% GST):</span>
                          <span>{priceInfo.formattedTax}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span className="text-blue-600">{priceInfo.formattedTotal}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>Important:</strong> All plans have a fixed duration of 1 month (30 days) 
                      from the date of purchase. Your plan will automatically expire after 30 days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processingPayment}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentConfirm}
                  disabled={processingPayment}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Pay Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlanUpgrade;