import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaCheck,
  FaTimes,
  FaUtensils,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaCrown,
  FaRocket,
  FaStar,
  FaShieldAlt,
  FaHeadset,
  FaComments
} from 'react-icons/fa';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../../subscription/constants/plans';

export default function PricingPage() {
  const [planType, setPlanType] = useState('restaurant');

  // Get plans based on selected type
  const allPlans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
  const regularPlans = Object.values(allPlans).filter((plan) => plan.priceINR !== null); // Free, Basic, Advanced
  const premiumPlans = Object.values(allPlans).filter((plan) => plan.priceINR === null);

  // Plan Card Component with original styling
  const PlanCard = ({ plan, isPopular }) => (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        isPopular
          ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md ring-2 ring-orange-100'
          : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
      }`}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
          MOST POPULAR
        </div>
      )}

      <div className="p-6">
        {/* Plan Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className={`font-bold text-lg ${isPopular ? 'text-orange-700' : 'text-gray-900'}`}>{plan.label}</h3>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <div className={`text-3xl font-bold ${isPopular ? 'text-orange-700' : 'text-gray-900'}`}>
            ₹{plan.priceINR.toLocaleString('en-IN')}
          </div>
          <div className="text-gray-500 text-sm mt-1">per month</div>
        </div>

        {/* Separator Line Above Plan Limits */}
        <div className={`border-t ${isPopular ? 'border-orange-200' : 'border-gray-200'} mb-6`}></div>

        {/* Plan Limits */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Plan Limits</h4>
          <div className="space-y-2 text-sm">
            {planType === 'restaurant' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tables:</span>
                  <span className="font-medium">{plan.maxTables}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Categories:</span>
                  <span className="font-medium">{plan.maxCategories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Menu Items:</span>
                  <span className="font-medium">{plan.maxMenuItems} per category</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shops:</span>
                  <span className="font-medium">{plan.maxShops}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tables:</span>
                  <span className="font-medium">{plan.maxTables || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Categories:</span>
                  <span className="font-medium">{plan.maxCategories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Menu Items:</span>
                  <span className="font-medium">{plan.maxMenuItems} per category</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Separator Line */}
        <div className={`border-t ${isPopular ? 'border-orange-200' : 'border-gray-200'} mb-6`}></div>

        {/* Features */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Features</h4>
          <ul className="space-y-2">
            <li className="flex items-center">
              {plan.features?.crudMenu ? (
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
              ) : (
                <div className="bg-red-100 p-1 rounded-full mr-3">
                  <FaTimes className="text-red-600 text-xs" />
                </div>
              )}
              <span className={plan.features?.crudMenu ? 'text-gray-700' : 'text-gray-500'}>Menu Management</span>
            </li>
            <li className="flex items-center">
              {plan.features?.branding ? (
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
              ) : (
                <div className="bg-red-100 p-1 rounded-full mr-3">
                  <FaTimes className="text-red-600 text-xs" />
                </div>
              )}
              <span className={plan.features?.branding ? 'text-gray-700' : 'text-gray-500'}>QR Customization</span>
            </li>
            <li className="flex items-center">
              {plan.features?.analytics ? (
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
              ) : (
                <div className="bg-red-100 p-1 rounded-full mr-3">
                  <FaTimes className="text-red-600 text-xs" />
                </div>
              )}
              <span className={plan.features?.analytics ? 'text-gray-700' : 'text-gray-500'}>Advanced Analytics</span>
            </li>
            <li className="flex items-center">
              {plan.features?.modifiers ? (
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
              ) : (
                <div className="bg-red-100 p-1 rounded-full mr-3">
                  <FaTimes className="text-red-600 text-xs" />
                </div>
              )}
              <span className={plan.features?.modifiers ? 'text-gray-700' : 'text-gray-500'}>Menu Modifiers</span>
            </li>
            <li className="flex items-center">
              {plan.features?.prioritySupport ? (
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
              ) : (
                <div className="bg-red-100 p-1 rounded-full mr-3">
                  <FaTimes className="text-red-600 text-xs" />
                </div>
              )}
              <span className={plan.features?.prioritySupport ? 'text-gray-700' : 'text-gray-500'}>Priority Support</span>
            </li>
            <li className="flex items-center">
              {plan.features?.watermark ? (
                <div className="bg-red-100 p-1 rounded-full mr-3">
                  <FaTimes className="text-red-600 text-xs" />
                </div>
              ) : (
                <div className="bg-green-100 p-1 rounded-full mr-3">
                  <FaCheck className="text-green-600 text-xs" />
                </div>
              )}
              <span className={plan.features?.watermark ? 'text-gray-500' : 'text-gray-700'}>TableServes Watermark</span>
            </li>
          </ul>
        </div>
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
            Simple <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Plans</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Choose the plan that perfectly fits your hotel or restaurant needs. Start free and upgrade as you grow.
          </p>
        </motion.div>

        {/* Business Type Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex">
              <button
                onClick={() => setPlanType('restaurant')}
                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  planType === 'restaurant'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FaUtensils className="mr-2" />
                Single Restaurant
              </button>
              <button
                onClick={() => setPlanType('zone')}
                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  planType === 'zone'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FaBuilding className="mr-2" />
                Food Zone
              </button>
            </div>
          </div>
        </motion.div>

        {/* Regular Plan Cards (Free, Basic, Advanced) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
            <p className="text-gray-600">Start free and upgrade as your hotel or restaurant grows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {regularPlans.map((plan, index) => {
              const isPopular = plan.key === 'advanced';
              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  <PlanCard plan={plan} isPopular={isPopular} />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Premium Plans Section - At Bottom with Original Style */}
        {premiumPlans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-20 mb-16 max-w-6xl mx-auto"
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
                      <h3 className="text-3xl font-bold text-purple-800">Premium Plan</h3>
                      <span className="inline-block bg-purple-500 text-white px-4 py-2 rounded-full font-bold text-sm mt-2 shadow-md">
                        Contact Required
                      </span>
                    </div>
                  </div>
                  <p className="text-purple-700 text-xl mb-6 leading-relaxed">
                    Enterprise-grade solution with custom configuration and premium features tailored to your hotel or restaurant needs.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaShieldAlt className="text-purple-500 text-xl" />
                      <span className="font-semibold">Custom Configuration</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaRocket className="text-purple-500 text-xl" />
                      <span className="font-semibold">Advanced Analytics</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaCheck className="text-green-500 text-xl" />
                      <span className="font-semibold">Priority Support</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start space-x-3 text-purple-700 bg-white p-4 rounded-xl border border-purple-200">
                      <FaStar className="text-purple-500 text-xl" />
                      <span className="font-semibold">Dedicated Account Manager</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Contact Info */}
                <div className="flex-shrink-0">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-8 max-w-sm">
                    <h4 className="font-bold text-purple-800 mb-6 flex items-center gap-3 text-2xl">
                      <FaComments className="text-purple-600" />
                      Contact Us
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-purple-700 bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <FaPhone className="text-purple-500 flex-shrink-0 text-xl" />
                        <div>
                          <div className="font-bold text-lg">+91 79040 21564</div>
                          <div className="text-purple-600 text-sm">Call us directly</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-purple-700 bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <FaEnvelope className="text-purple-500 flex-shrink-0 text-xl" />
                        <div>
                          <div className="font-bold text-lg">admin@tableserves.com</div>
                          <div className="text-purple-600 text-sm">Email support</div>
                        </div>
                      </div>
                      <div className="text-center text-purple-600 font-semibold bg-purple-100 p-4 rounded-xl border border-purple-200">
                        💬 Let's discuss your custom requirements!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-16"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What Makes Us Different?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <FaShieldAlt className="text-green-600 text-2xl" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Secure & Reliable</h4>
                <p className="text-gray-600 text-sm">Enterprise-grade security with 99.9% uptime guarantee</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <FaHeadset className="text-blue-600 text-2xl" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">24/7 Support</h4>
                <p className="text-gray-600 text-sm">Dedicated support team available around the clock</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <FaRocket className="text-orange-600 text-2xl" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Easy Setup</h4>
                <p className="text-gray-600 text-sm">Get started in minutes with our intuitive setup process</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-4">Need Help Choosing? Contact Us</h4>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-600">
                <div className="flex items-center">
                  <FaPhone className="text-orange-500 mr-2" />
                  <span>+91 79040 21564</span>
                </div>
                <div className="flex items-center">
                  <FaEnvelope className="text-orange-500 mr-2" />
                  <span>admin@tableserves.com</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
