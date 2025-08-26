import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaLock, 
  FaBuilding, 
  FaCheckCircle, 
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaUserPlus,
  FaExclamationTriangle,
  FaRocket,
  FaShieldAlt,
  FaChartLine
} from 'react-icons/fa';
import LocalStorageService from '../services/LocalStorageService';

const initialForm = {
  name: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  username: '',
  password: '',
};

const initialErrors = {
  name: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  username: '',
  password: '',
};

// Validation functions
const validateEmail = (email) => {
  if (!email) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? '' : 'Please enter a valid email address';
};

const validatePhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  // Check if exactly 10 digits
  if (digitsOnly.length === 0) return '';
  if (digitsOnly.length !== 10) return 'Phone number must be exactly 10 digits';
  return '';
};

const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
};

const validateRequired = (value, fieldName) => {
  return !value.trim() ? `${fieldName} is required` : '';
};

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialErrors);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);



  const onChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone number - only allow digits and limit to 10
    let processedValue = value;
    if (name === 'ownerPhone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setForm((f) => ({ ...f, [name]: processedValue }));
    
    // Real-time validation
    let fieldError = '';
    switch (name) {
      case 'name':
        fieldError = validateRequired(processedValue, 'Business Name');
        break;
      case 'ownerName':
        fieldError = validateRequired(processedValue, 'Owner Name');
        break;
      case 'ownerEmail':
        fieldError = validateEmail(processedValue);
        break;
      case 'ownerPhone':
        fieldError = validatePhone(processedValue);
        break;
      case 'username':
        fieldError = validateRequired(processedValue, 'Username');
        break;
      case 'password':
        fieldError = validatePassword(processedValue);
        break;
      default:
        break;
    }
    
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
    if (error) setError(null);
  };

  const validateForm = () => {
    const newErrors = {
      name: validateRequired(form.name, 'Business Name'),
      ownerName: validateRequired(form.ownerName, 'Owner Name'),
      ownerEmail: validateEmail(form.ownerEmail),
      ownerPhone: validatePhone(form.ownerPhone),
      username: validateRequired(form.username, 'Username'),
      password: validatePassword(form.password),
    };
    
    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create account with Default Free Starter Plan
      // This ensures user is registered but cannot access dashboard yet
      const userData = {
        name: form.name,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPhone: form.ownerPhone,
        username: form.username,
        password: form.password,
        defaultFreePlanAssigned: true, // Flag indicating default plan assigned
        needsBusinessTypeSelection: true, // Gateway flag - prevents dashboard access
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      // Store temporary data for hotel or restaurant type selection
      localStorage.setItem('tableserve_temp_signup', JSON.stringify(userData));
      
      // Step 2: Redirect to Business Type Selection (mandatory gateway)
      navigate('/tableserve/business-type');
      
    } catch (err) {
      console.error(err);
      setError('Failed to proceed with signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/tableserve/login');
  };



  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-25 to-orange-100 flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full h-screen flex flex-col lg:flex-row">
          {/* Left Side - Welcome Section (Hidden on mobile) */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange-400 to-orange-600 flex-col justify-center items-center text-white p-12 xl:p-16 h-screen overflow-hidden"
          >
            <div className="max-w-lg mx-auto space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <FaRocket className="text-white text-3xl" />
                </div>
                <h1 className="text-4xl xl:text-5xl font-fredoka mb-4">Welcome to</h1>
                <h2 className="text-5xl xl:text-7xl font-fredoka bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent mb-8">
                  TableServe
                </h2>
                <p className="text-lg xl:text-xl text-orange-100 font-raleway leading-relaxed">
                  Transform your restaurant with our revolutionary QR-based ordering platform. Join thousands of successful businesses worldwide.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                    <FaRocket className="text-white text-lg" />
                  </div>
                  <div>
                    <h4 className="text-white font-raleway font-semibold text-lg">Instant Setup</h4>
                    <p className="text-orange-100 text-sm">Get started in minutes with QR code menus</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                    <FaChartLine className="text-white text-lg" />
                  </div>
                  <div>
                    <h4 className="text-white font-raleway font-semibold text-lg">Real-time Analytics</h4>
                    <p className="text-orange-100 text-sm">Track orders and revenue in real-time</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                    <FaShieldAlt className="text-white text-lg" />
                  </div>
                  <div>
                    <h4 className="text-white font-raleway font-semibold text-lg">Secure & Reliable</h4>
                    <p className="text-orange-100 text-sm">Enterprise-grade security for your business</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Form Section */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full lg:w-1/2 h-screen flex flex-col bg-white lg:bg-gray-50 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 xl:p-12">
              <div className="w-full max-w-lg mx-auto">
                <div className="bg-white rounded-3xl xl:rounded-4xl shadow-2xl border border-orange-100 p-6 xl:p-8">
                {/* Mobile Header (Visible only on mobile) */}
                <div className="lg:hidden text-center mb-8">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  >
                    <FaUserPlus className="text-white text-3xl" />
                  </motion.div>
                  <h1 className="text-4xl font-fredoka bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-3">Create Account</h1>
                  <p className="text-gray-600 font-raleway text-lg">
                    Get started with our <span className="font-semibold text-green-600">Default Free Starter Plan</span>
                  </p>
                </div>

                {/* Desktop Header (Visible only on desktop) */}
                <div className="hidden lg:block text-center mb-6">
                  <h1 className="text-3xl xl:text-4xl font-fredoka bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-2">Create Your Account</h1>
                  <p className="text-lg text-gray-600 font-raleway">
                    Get your <span className="font-bold text-green-600">Default Free Starter Plan</span> instantly
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Restaurant/Zone Name */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      <FaBuilding className="inline mr-2 text-orange-500" />
                      Business Name *
                    </label>
                    <input 
                      name="name" 
                      value={form.name} 
                      onChange={onChange}
                      className={`w-full border-2 rounded-xl px-4 py-3 font-raleway text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                        errors.name ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-orange-200 focus:border-orange-500 hover:border-orange-300'
                      }`}
                      placeholder="Enter your business name"
                    />
                    {errors.name && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-xs mt-1 font-raleway"
                      >
                        {errors.name}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Owner Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Owner Name */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <FaUser className="inline mr-2 text-orange-500" />
                        Owner Name *
                      </label>
                      <input 
                        name="ownerName" 
                        value={form.ownerName} 
                        onChange={onChange}
                        className={`w-full border-2 rounded-xl px-4 py-3 font-raleway text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                          errors.ownerName ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-orange-200 focus:border-orange-500 hover:border-orange-300'
                        }`}
                        placeholder="Enter owner name"
                      />
                      {errors.ownerName && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 font-raleway"
                        >
                          {errors.ownerName}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Owner Email */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <FaEnvelope className="inline mr-2 text-orange-500" />
                        Owner Email
                      </label>
                      <input 
                        type="email" 
                        name="ownerEmail" 
                        value={form.ownerEmail} 
                        onChange={onChange}
                        className={`w-full border-2 rounded-xl px-4 py-3 font-raleway text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                          errors.ownerEmail ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-orange-200 focus:border-orange-500 hover:border-orange-300'
                        }`}
                        placeholder="owner@example.com"
                      />
                      {errors.ownerEmail && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 font-raleway"
                        >
                          {errors.ownerEmail}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>

                  {/* Phone and Username Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Owner Phone */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <FaPhone className="inline mr-2 text-orange-500" />
                        Owner Phone (10 digits)
                      </label>
                      <input 
                        name="ownerPhone" 
                        value={form.ownerPhone} 
                        onChange={onChange}
                        maxLength="10"
                        placeholder="9876543210"
                        className={`w-full border-2 rounded-xl px-4 py-3 font-raleway text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                          errors.ownerPhone ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-orange-200 focus:border-orange-500 hover:border-orange-300'
                        }`}
                      />
                      {errors.ownerPhone && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 font-raleway"
                        >
                          {errors.ownerPhone}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Username */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <FaUser className="inline mr-2 text-orange-500" />
                        Username *
                      </label>
                      <input 
                        name="username" 
                        value={form.username} 
                        onChange={onChange}
                        className={`w-full border-2 rounded-xl px-4 py-3 font-raleway text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                          errors.username ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-orange-200 focus:border-orange-500 hover:border-orange-300'
                        }`}
                        placeholder="Choose a username"
                      />
                      {errors.username && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 font-raleway"
                        >
                          {errors.username}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>

                  {/* Password */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      <FaLock className="inline mr-2 text-orange-500" />
                      Password *
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        name="password" 
                        value={form.password} 
                        onChange={onChange}
                        className={`w-full border-2 rounded-xl px-4 py-3 pr-12 font-raleway text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                          errors.password ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-orange-200 focus:border-orange-500 hover:border-orange-300'
                        }`}
                        placeholder="Create a secure password"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-orange-500 transition-colors focus:outline-none"
                        >
                          {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    {errors.password && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-xs mt-1 font-raleway"
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* General Error */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border-2 border-red-300 rounded-xl"
                    >
                      <p className="text-red-600 font-raleway text-center text-sm font-medium">{error}</p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.button 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    disabled={loading} 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-raleway font-bold text-lg disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating Account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <FaUserPlus className="text-lg" />
                        <span>Create Account</span>
                      </div>
                    )}
                  </motion.button>
                </form>

                {/* Login Link */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="text-center mt-6"
                >
                  <button 
                    onClick={() => navigate('/tableserve/login')} 
                    className="text-orange-600 hover:text-orange-700 font-raleway font-semibold text-base transition-colors duration-200 underline-offset-4 hover:underline"
                  >
                    Already have an account? Sign In
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
          </motion.div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && successData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleSuccessModalClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl p-12 max-w-lg w-full mx-4 shadow-2xl border border-orange-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg"
                >
                  <FaCheckCircle className="text-white text-4xl" />
                </motion.div>

                {/* Success Message */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-3xl font-fredoka bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-4">Account Created Successfully!</h2>
                  <div className="space-y-3 text-gray-600 font-raleway mb-8 text-lg">
                    <p><strong className="text-gray-800">{successData.type === 'restaurant' ? 'Restaurant' : 'Zone'}:</strong> <span className="text-orange-600 font-semibold">{successData.name}</span></p>
                    <p><strong className="text-gray-800">Owner:</strong> <span className="text-orange-600 font-semibold">{successData.ownerName}</span></p>
                    <p><strong className="text-gray-800">Username:</strong> <span className="text-orange-600 font-semibold">{successData.username}</span></p>
                    <p><strong className="text-gray-800">Plan:</strong> <span className="text-orange-600 font-semibold">{successData.plan?.plan || 'Basic'}</span></p>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <button
                    onClick={handleSuccessModalClose}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-raleway font-bold text-lg hover:shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    Continue to Login
                  </button>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full text-orange-600 hover:text-orange-700 font-raleway font-semibold transition-colors duration-200 py-2"
                  >
                    Close
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

