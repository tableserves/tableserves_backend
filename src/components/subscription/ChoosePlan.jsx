import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTimes, FaUsers, FaTable, FaPhone, FaEnvelope, FaComments, FaCrown, FaRocket, FaStar, FaShieldAlt, FaChevronRight, FaLock, FaHeadset, FaChartLine, FaArrowRight } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { setSubscription } from '../../store/slices/subscriptionSlice';
import { RESTAURANT_PLANS, ZONE_PLANS, resolvePlanMetadata, getPaidPlansForType } from '../../constants/plans';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../payment/PaymentModal';
import PaymentSuccessModal from '../payment/PaymentSuccessModal';

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
    navigate('/tableserve/signup');
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
    navigate('/tableserve/signup');
  };

  // Custom card component for consistent styling
  const PlanCard = ({ plan, selected, isContactPlan, isPopular, onClick }) => (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        isContactPlan
          ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-sm'
          : selected
            ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md ring-2 ring-orange-100'
            : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
          MOST POPULAR
        </div>
      )}

      <div className="p-6">
        {/* Plan Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center">
            {!isContactPlan && (
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 transition-colors ${
                selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`}>
                {selected && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
            )}
            <div>
              <h3 className={`font-bold text-lg ${selected ? 'text-orange-700' : isContactPlan ? 'text-purple-800' : 'text-gray-900'}`}>
                {plan.label}
              </h3>
              {isContactPlan && (
                <span className="inline-flex items-center text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full mt-1">
                  <FaComments className="mr-1" /> Contact Required
                </span>
              )}
            </div>
          </div>
          {selected && !isContactPlan && (
            <span className="inline-flex items-center text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
              <FaCheck className="mr-1" /> Selected
            </span>
          )}
        </div>

        {/* Pricing */}
        <div className="mb-6">
          {plan.priceINR == null ? (
            <div className="text-xl font-bold text-purple-700">Custom Pricing</div>
          ) : (
            <div>
              <div className={`text-3xl font-bold ${selected ? 'text-orange-700' : 'text-gray-900'}`}>
                ₹{plan.priceINR.toLocaleString('en-IN')}
              </div>
              <div className="text-gray-500 text-sm mt-1">per month</div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-4 mb-6">
          {isContactPlan ? (
            <div className="space-y-4">
              <div className="bg-white border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                  <FaComments className="text-purple-600 mr-2" />
                  Contact Our Team
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center text-purple-700">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <FaPhone className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">+91 98765 43210</div>
                      <div className="text-xs text-purple-500">Direct Line</div>
                    </div>
                  </div>
                  <div className="flex items-center text-purple-700">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <FaEnvelope className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">admin@tableserve.com</div>
                      <div className="text-xs text-purple-500">24/7 Support</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-100">
                <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
                  <FaCrown className="text-purple-500 mr-2" />
                  Premium Features
                </h5>
                <ul className="space-y-2">
                  {planType === 'restaurant' ? (
                    <>
                      <li className="flex items-start">
                        <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaShieldAlt className="text-green-600 text-xs" />
                        </div>
                        <span className="text-gray-700">Custom Table Configuration</span>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaCheck className="text-green-600 text-xs" />
                        </div>
                        <span className="text-gray-700">Priority 24/7 Support</span>
                      </li>
                    </>
                  ) : (
                    <li className="flex items-start">
                      <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                        <FaShieldAlt className="text-green-600 text-xs" />
                      </div>
                      <span className="text-gray-700">Fully Customizable Setup</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {planType === 'restaurant' ? (
                <>
                  <li className="flex items-start">
                    <div className="bg-orange-100 p-1 rounded-full mr-3 mt-0.5">
                      <FaTable className="text-orange-600 text-xs" />
                    </div>
                    <div>
                      <span className="text-gray-700">Up to <span className="font-semibold">{plan.maxTables}</span> tables</span>
                    </div>
                  </li>
                  {plan.maxCategories && (
                    <li className="flex items-start">
                      <div className="bg-blue-100 p-1 rounded-full mr-3 mt-0.5">
                        <FaCheck className="text-blue-600 text-xs" />
                      </div>
                      <div>
                        <span className="text-gray-700"><span className="font-semibold">{plan.maxCategories}</span> categories</span>
                      </div>
                    </li>
                  )}
                  {plan.maxMenuItems && (
                    <li className="flex items-start">
                      <div className="bg-purple-100 p-1 rounded-full mr-3 mt-0.5">
                        <FaCheck className="text-purple-600 text-xs" />
                      </div>
                      <div>
                        <span className="text-gray-700"><span className="font-semibold">{plan.maxMenuItems}</span> items per category</span>
                      </div>
                    </li>
                  )}
                  <li className="flex items-start">
                    {plan.features?.modifiers ? (
                      <>
                        <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaCheck className="text-green-600 text-xs" />
                        </div>
                        <span className="text-gray-700">Menu Management & Modifiers</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-gray-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaTimes className="text-gray-400 text-xs" />
                        </div>
                        <span className="text-gray-500">No modifiers/addons</span>
                      </>
                    )}
                  </li>
                  <li className="flex items-start">
                    {plan.features?.orderTracking ? (
                      <>
                        <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaCheck className="text-green-600 text-xs" />
                        </div>
                        <span className="text-gray-700">Real-time Order Tracking</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-gray-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaTimes className="text-gray-400 text-xs" />
                        </div>
                        <span className="text-gray-500">Basic Order Management</span>
                      </>
                    )}
                  </li>
                </>
              ) : (
                <>
                  {plan.maxShops ? (
                    <li className="flex items-start">
                      <div className="bg-orange-100 p-1 rounded-full mr-3 mt-0.5">
                        <FaUsers className="text-orange-600 text-xs" />
                      </div>
                      <div>
                        <span className="text-gray-700"><span className="font-semibold">{plan.maxShops}</span> shops (vendors)</span>
                      </div>
                    </li>
                  ) : (
                    <li className="flex items-start">
                      <div className="bg-orange-100 p-1 rounded-full mr-3 mt-0.5">
                        <FaTable className="text-orange-600 text-xs" />
                      </div>
                      <div>
                        <span className="text-gray-700">Tables: <span className="font-semibold">{plan.maxTables ?? 'Custom'}</span></span>
                      </div>
                    </li>
                  )}
                  {plan.maxTables && plan.maxShops && (
                    <li className="flex items-start">
                      <div className="bg-blue-100 p-1 rounded-full mr-3 mt-0.5">
                        <FaTable className="text-blue-600 text-xs" />
                      </div>
                      <div>
                        <span className="text-gray-700"><span className="font-semibold">{plan.maxTables}</span> tables per shop</span>
                      </div>
                    </li>
                  )}
                  <li className="flex items-start">
                    {plan.features?.vendorManagement ? (
                      <>
                        <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaCheck className="text-green-600 text-xs" />
                        </div>
                        <span className="text-gray-700">Multi-Vendor Management</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-gray-100 p-1 rounded-full mr-3 mt-0.5">
                          <FaTimes className="text-gray-400 text-xs" />
                        </div>
                        <span className="text-gray-500">No vendor management</span>
                      </>
                    )}
                  </li>
                </>
              )}
              <li className="flex items-start">
                {plan.features?.analytics ? (
                  <>
                    <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                      <FaChartLine className="text-green-600 text-xs" />
                    </div>
                    <span className="text-gray-700">Advanced Analytics Dashboard</span>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-100 p-1 rounded-full mr-3 mt-0.5">
                      <FaTimes className="text-gray-400 text-xs" />
                    </div>
                    <span className="text-gray-500">No analytics</span>
                  </>
                )}
              </li>
              {plan.features?.qrCustomization ? (
                <li className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                    <FaCheck className="text-green-600 text-xs" />
                  </div>
                  <span className="text-gray-700">{plan.features?.premiumBranding ? 'Premium' : 'Standard'} QR Customization</span>
                </li>
              ) : (
                <li className="flex items-start">
                  <div className="bg-gray-100 p-1 rounded-full mr-3 mt-0.5">
                    <FaTimes className="text-gray-400 text-xs" />
                  </div>
                  <span className="text-gray-500">Default QR only</span>
                </li>
              )}
              {plan.features?.prioritySupport && (
                <li className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                    <FaHeadset className="text-green-600 text-xs" />
                  </div>
                  <span className="text-gray-700">Priority Support</span>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* CTA Button */}
        {!isContactPlan && (
          <button
            onClick={() => {
              if (selected) {
                // If this plan is selected, proceed with plan selection flow
                handleContinue();
              } else {
                // If this plan is not selected, set it as selected
                setPlanKey(plan.key);
              }
            }}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              selected
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {selected ? 'Continue with Plan' : 'Select Plan'}
            <FaChevronRight className="ml-2 text-sm" />
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Perfect Plan</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transform your restaurant experience with our cutting-edge QR ordering system. 
            Select the plan that matches your hotel or restaurant needs and start your journey today.
          </p>
        </motion.div>

        {/* Plan Type Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setPlanType('restaurant')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                planType === 'restaurant'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center">
                <FaTable className="mr-2" />
                Single Restaurant
              </div>
            </button>
            <button
              onClick={() => setPlanType('zone')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                planType === 'zone'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center">
                <FaUsers className="mr-2" />
                Food Zone
              </div>
            </button>
          </div>
        </motion.div>

        {/* Free Starter Plan Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="text-center lg:text-left mb-6 lg:mb-0">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <FaRocket className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-green-800">Start Free Today!</h3>
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      No Payment Required
                    </span>
                  </div>
                </div>
                <p className="text-green-700 text-lg mb-4">
                  Get started with our Free Starter Plan. Choose your hotel or restaurant type during signup.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-green-700">
                    <FaCheck className="text-green-500 mr-2" />
                    <span>{planType === 'restaurant' ? '1 Table, 1 Category, 2 Menu Items' : '1 Shop, 1 QR, 1 Category, 1 Menu Item'}</span>
                  </div>
                  <div className="flex items-center text-green-700">
                    <FaCheck className="text-green-500 mr-2" />
                    <span>Basic QR Code</span>
                  </div>
                  <div className="flex items-center text-green-700">
                    <FaCheck className="text-green-500 mr-2" />
                    <span>Order Management</span>
                  </div>
                  <div className="flex items-center text-green-700">
                    <FaCheck className="text-green-500 mr-2" />
                    <span>Upgrade Anytime</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartFree}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
                >
                  Start Free Trial
                  <FaArrowRight className="ml-2" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Paid Plan Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Upgrade Plans - More Features & Capacity
            </h2>
            <p className="text-gray-600">
              Ready to scale? Choose a paid plan for advanced features and higher limits.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paidPlans
              .filter(plan => plan.key !== 'premium') // Filter out premium for display in cards
              .map((plan, index) => {
                const selected = planKey === plan.key;
                const isPopular = plan.key === 'advanced';

                return (
                  <motion.div
                    key={plan.key}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  >
                    <PlanCard
                      plan={plan}
                      selected={selected}
                      isContactPlan={false}
                      isPopular={isPopular}
                      onClick={() => setPlanKey(plan.key)}
                    />
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
{/* Premium Restaurant Plan - Enhanced Layout */}
        {planType === 'restaurant' && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-6 max-w-6xl mx-auto"
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
                          <div className="font-raleway font-bold text-lg">+91 98765 43210</div>
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
                          <div className="font-raleway font-bold text-lg">+91 98765 43210</div>
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
                className="group bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-8 md:px-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center justify-center text-base md:text-lg w-full md:w-auto"
              >
                Continue with {planType === 'restaurant' ? 'Restaurant' : 'Zone'} Plan
                <FaRocket className="ml-3 text-xl group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Info below button */}
              <p className="text-gray-600 text-base md:text-lg mt-6 mx-auto px-4">
                🚀 You'll be redirected to secure payment and account setup
              </p>

              {/* Trust badges */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-8 text-gray-500">
                <div className="flex items-center space-x-2">
                  <FaShieldAlt className="text-green-500" />
                  <span className="text-sm font-medium">Secure Payment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaCheck className="text-green-500" />
                  <span className="text-sm font-medium">Instant Setup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaStar className="text-orange-500" />
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