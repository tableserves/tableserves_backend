import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTimes, FaUsers, FaTable, FaPhone, FaEnvelope, FaComments, FaCrown, FaRocket, FaStar, FaShieldAlt, FaChevronRight, FaLock, FaHeadset, FaChartLine, FaArrowRight } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { setSubscription } from '../../../store/slices/subscriptionSlice';
import { RESTAURANT_PLANS, ZONE_PLANS, resolvePlanMetadata, getPaidPlansForType } from '../constants/plans';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../../../shared/payments/components/PaymentModal';
import PaymentSuccessModal from '@/shared/payments/components/PaymentSuccessModal';

export default function ChoosePlan() {
  const [planType, setPlanType] = useState('restaurant');
  const [planKey, setPlanKey] = useState('basic');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get only paid plans (exclude free plans)
  const allPlans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
  const paidPlans = Object.values(allPlans).filter(plan => plan.priceINR > 0 || plan.priceINR === null);
  
  // Handle free plan button click
  const handleStartFree = () => {
    navigate('/signup');
  };

  const handleContinue = () => {
    if (planType === 'zone' && planKey === 'premium') {
      alert('Zone Premium plan requires super admin approval. Please contact us.');
      return;
    }

    if (!planKey) {
      alert('Please select a plan to continue.');
      return;
    }

    // Find the selected plan
    const selectedPlan = paidPlans.find(p => p.key === planKey);
    if (!selectedPlan) {
      alert('Please select a valid plan.');
      return;
    }

    // If it's a contact plan (premium/custom), don't show payment modal
    if (selectedPlan.priceINR === null) {
      alert('Please contact our team for premium plans.');
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (payment) => {
    const metadata = resolvePlanMetadata({ planKey, planType });
    const subscriptionData = {
      ...metadata,
      paymentData: payment,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    dispatch(setSubscription(subscriptionData));
    try { localStorage.setItem('tableserve_subscription', JSON.stringify(subscriptionData)); } catch { }
    setPaymentData(payment);
    setShowPaymentModal(false);
    setShowSuccessModal(true);
  };

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg via-theme-bg-secondary to-theme-bg">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-fredoka font-bold mb-4"
          >
            Choose Your Perfect Plan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl font-raleway text-white/90 max-w-3xl mx-auto"
          >
            Unlock the full potential of TableServe with plans designed for every business size
          </motion.p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Plan Type Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-theme-border">
            <button
              onClick={() => setPlanType('restaurant')}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                planType === 'restaurant'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-theme-text-secondary hover:text-primary'
              }`}
            >
              <FaUtensils className="inline mr-2" />
              Restaurant
            </button>
            <button
              onClick={() => setPlanType('zone')}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                planType === 'zone'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-theme-text-secondary hover:text-primary'
              }`}
            >
              <FaBuilding className="inline mr-2" />
              Zone/Hotel
            </button>
          </div>
        </motion.div>

        {/* Free Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <div className="bg-white rounded-3xl shadow-xl border border-theme-border overflow-hidden">
            <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between">
                <div className="flex-1 text-center lg:text-left">
                  <h2 className="text-3xl font-fredoka font-bold text-theme-text mb-4">
                    Free Starter Plan
                  </h2>
                  <p className="text-theme-text-secondary text-lg mb-6 max-w-2xl">
                    Perfect to get started and explore TableServe's basic features
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-6">
                    <div className="flex items-center space-x-2 text-theme-text-secondary">
                      <FaCheck className="text-green-500" />
                      <span>Basic menu management</span>
                    </div>
                    <div className="flex items-center space-x-2 text-theme-text-secondary">
                      <FaCheck className="text-green-500" />
                      <span>QR code generation</span>
                    </div>
                    <div className="flex items-center space-x-2 text-theme-text-secondary">
                      <FaCheck className="text-green-500" />
                      <span>1 table included</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-center">
                    <div className="text-5xl font-fredoka font-bold text-theme-text mb-2">₹0</div>
                    <div className="text-theme-text-secondary mb-6">Forever Free</div>
                    <button
                      onClick={handleStartFree}
                      className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center"
                    >
                      Start Free
                      <FaArrowRight className="ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Paid Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {paidPlans.map((plan, index) => {
            const isSelected = planKey === plan.key;
            const isPopular = plan.key === 'advanced';
            const isPremium = plan.priceINR === null;

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                className={`relative bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:-translate-y-2 ${
                  isSelected
                    ? 'border-primary shadow-2xl scale-105'
                    : 'border-theme-border hover:border-primary/50'
                } ${isPopular ? 'ring-4 ring-accent/20' : ''}`}
                onClick={() => setPlanKey(plan.key)}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                      isPremium
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                        : isPopular
                        ? 'bg-gradient-to-br from-accent to-accent/80'
                        : 'bg-gradient-to-br from-primary to-primary/80'
                    }`}>
                      {isPremium ? (
                        <FaCrown className="text-white text-2xl" />
                      ) : isPopular ? (
                        <FaRocket className="text-white text-2xl" />
                      ) : (
                        <FaStar className="text-white text-2xl" />
                      )}
                    </div>

                    <h3 className="text-2xl font-fredoka font-bold text-theme-text mb-2">
                      {plan.label}
                    </h3>

                    <div className="mb-4">
                      {plan.priceINR === null ? (
                        <div>
                          <div className="text-3xl font-fredoka font-bold text-purple-600">Contact Us</div>
                          <div className="text-theme-text-secondary">Custom Pricing</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-4xl font-fredoka font-bold text-theme-text">
                            ₹{plan.priceINR}
                          </div>
                          <div className="text-theme-text-secondary">per month</div>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="inline-flex items-center bg-primary/10 text-primary px-4 py-2 rounded-full font-bold text-sm">
                        <FaCheck className="mr-2" />
                        Selected
                      </div>
                    )}
                  </div>

                  {/* Plan Features */}
                  <div className="space-y-4">
                    {/* Limits */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-theme-text mb-3">What's included:</h4>
                      {plan.maxTables !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-theme-text-secondary">Tables</span>
                          <span className="font-bold text-theme-text">
                            {plan.maxTables === null ? 'Unlimited' : plan.maxTables}
                          </span>
                        </div>
                      )}
                      {plan.maxCategories !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-theme-text-secondary">Categories</span>
                          <span className="font-bold text-theme-text">
                            {plan.maxCategories === null ? 'Unlimited' : plan.maxCategories}
                          </span>
                        </div>
                      )}
                      {plan.maxMenuItems !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-theme-text-secondary">Menu Items</span>
                          <span className="font-bold text-theme-text">
                            {plan.maxMenuItems === null ? 'Unlimited' : plan.maxMenuItems}
                          </span>
                        </div>
                      )}
                      {plan.maxShops !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-theme-text-secondary">Shops</span>
                          <span className="font-bold text-theme-text">
                            {plan.maxShops === null ? 'Unlimited' : plan.maxShops}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Key Features */}
                    <div className="pt-4 border-t border-theme-border">
                      <div className="space-y-3">
                        {Object.entries(plan.features || {})
                          .filter(([_, value]) => value === true)
                          .slice(0, 6)
                          .map(([feature, _]) => (
                            <div key={feature} className="flex items-center space-x-3">
                              <FaCheck className="text-green-500 flex-shrink-0" />
                              <span className="text-theme-text-secondary text-sm">
                                {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Select Button */}
                  <div className="mt-8">
                    <button
                      className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary text-white shadow-lg'
                          : isPremium
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-theme-bg-secondary hover:bg-primary hover:text-white text-theme-text'
                      }`}
                    >
                      {isSelected ? 'Selected' : isPremium ? 'Contact Sales' : 'Select Plan'}
                      <FaChevronRight className="ml-2" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Contact Section for Premium Plans */}
        {planType === 'restaurant' && planKey === 'premium' && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-6 mx-auto"
          >
            <div className="border-2 border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between space-y-8 lg:space-y-0 lg:space-x-12">
                {/* Left Side - Plan Info */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <FaCrown className="text-white text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-fredoka font-bold text-purple-800">Premium Plan</h3>
                      <span className="inline-block bg-purple-500 text-white px-4 py-2 rounded-full font-raleway font-bold text-sm mt-2 shadow-md">
                        Contact Required
                      </span>
                    </div>
                  </div>
                  <p className="text-purple-700 font-raleway text-xl mb-6 leading-relaxed">
                    Enterprise-grade solution with custom table configuration and premium features tailored to your hotel or restaurant needs.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaShieldAlt className="text-purple-500 text-xl" />
                      <span className="font-raleway font-semibold">Custom Tables</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaRocket className="text-purple-500 text-xl" />
                      <span className="font-raleway font-semibold">Advanced Analytics</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaCheck className="text-green-500 text-xl" />
                      <span className="font-raleway font-semibold">Priority Support</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaStar className="text-purple-500 text-xl" />
                      <span className="font-raleway font-semibold">Advance Admin Access</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Contact Info */}
                <div className="flex-shrink-0">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-8 max-w-sm">
                    <h4 className="font-fredoka font-bold text-purple-800 mb-6 flex items-center gap-3 text-2xl">
                      <FaComments className="text-purple-600" />
                      Contact Us
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-purple-700 bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <FaPhone className="text-purple-500 flex-shrink-0 text-xl" />
                        <div>
                          <div className="font-raleway font-bold text-lg">+91 79040 21564</div>
                          <div className="text-purple-600 text-sm">Call us directly</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-purple-700 bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <FaEnvelope className="text-purple-500 flex-shrink-0 text-xl" />
                        <div>
                          <div className="font-raleway font-bold text-lg">admin@tableserve.com</div>
                          <div className="text-purple-600 text-sm">Email support</div>
                        </div>
                      </div>
                      <div className="text-center text-purple-600 font-raleway font-semibold bg-purple-100 p-4 rounded-xl border border-purple-200">
                        💬 Let's discuss your custom requirements and create the perfect solution for your hotel or restaurant!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Premium Zone Plan - Enhanced Layout */}
        {planType === 'zone' && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-6 mx-auto"
          >
            <div className="border-2 border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between space-y-8 lg:space-y-0 lg:space-x-12">
                {/* Left Side - Plan Info */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <FaCrown className="text-white text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-fredoka font-bold text-purple-800">Premium Plan</h3>
                      <span className="inline-block bg-purple-500 text-white px-4 py-2 rounded-full font-raleway font-bold text-sm mt-2 shadow-md">
                        Contact Required
                      </span>
                    </div>
                  </div>
                  <p className="text-purple-700 font-raleway text-xl mb-6 leading-relaxed">
                    Enterprise-grade solution with custom table configuration and premium features tailored to your hotel or restaurant needs.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaShieldAlt className="text-purple-500 text-xl" />
                      <span className="font-raleway font-semibold">Custom Tables</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaRocket className="text-purple-500 text-xl" />
                      <span className="font-raleway font-semibold">Advanced Analytics</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaCheck className="text-green-500 text-xl" />
                      <span className="font-raleway font-semibold">Priority Support</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaStar className="text-purple-500 text-xl" />
                      <span className="font-raleway font-semibold">Advance Admin Access</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Contact Info */}
                <div className="flex-shrink-0">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-8 max-w-sm">
                    <h4 className="font-fredoka font-bold text-purple-800 mb-6 flex items-center gap-3 text-2xl">
                      <FaComments className="text-purple-600" />
                      Contact Us
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-purple-700 bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <FaPhone className="text-purple-500 flex-shrink-0 text-xl" />
                        <div>
                          <div className="font-raleway font-bold text-lg">+91 79040 21564</div>
                          <div className="text-purple-600 text-sm">Call us directly</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-purple-700 bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <FaEnvelope className="text-purple-500 flex-shrink-0 text-xl" />
                        <div>
                          <div className="font-raleway font-bold text-lg">admin@tableserve.com</div>
                          <div className="text-purple-600 text-sm">Email support</div>
                        </div>
                      </div>
                      <div className="text-center text-purple-600 font-raleway font-semibold bg-purple-100 p-4 rounded-xl border border-purple-200">
                        💬 Let's discuss your custom requirements and create the perfect solution for your hotel or restaurant!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Continue Button - Final Merged Design */}
        {!((planType === 'zone' && planKey === 'advanced') || (planType === 'restaurant' && planKey === 'premium')) && planKey && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex justify-center items-center mt-8 px-4"
          >
            <div className="text-center max-w-2xl mx-auto">
              {/* Button */}
              <button
                onClick={handleContinue}
                className="group bg-accent hover:bg-accent/90 text-white font-bold py-4 px-8 md:px-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center justify-center text-base md:text-lg w-full md:w-auto"
              >
                Continue with {planType === 'restaurant' ? 'Restaurant' : 'Zone'} Plan
                <FaRocket className="ml-3 text-xl group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Info below button */}
              <p className="text-theme-text-secondary text-base md:text-lg mt-6 mx-auto px-4">
                🚀 You'll be redirected to secure payment and account setup
              </p>

              {/* Trust badges */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-8 text-theme-text-tertiary">
                <div className="flex items-center space-x-2">
                  <FaShieldAlt className="text-green-500" />
                  <span className="text-sm font-medium">Secure Payment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaCheck className="text-green-500" />
                  <span className="text-sm font-medium">Instant Setup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaStar className="text-accent" />
                  <span className="text-sm font-medium">24/7 Support</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentModalClose}
        selectedPlan={resolvePlanMetadata({ planKey, planType })}
        onPaymentSuccess={handlePaymentSuccess}
      />
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        paymentData={paymentData}
        onContinue={handleSuccessModalContinue}
      />
    </div>
  );
}
