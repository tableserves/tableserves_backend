import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
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
  FaChartLine,
  FaCheck,
  FaUserShield
} from 'react-icons/fa';
import { useRegisterMutation } from '../../../store/api/authApi';
import { setCredentials } from '../../../store/slices/uiSlice';
import { getUserFriendlyErrorMessage } from '../../../shared/utils/errorMessageUtils';
import logger from '../../../services/LoggingService';
import simpleTokenService from '../../../shared/auth/SimpleTokenService';

const initialForm = {
  name: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  username: '',
  password: '',
  businessType: ''
};

const initialErrors = {
  name: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  username: '',
  password: '',
  businessType: ''
};

// Password validation functions
const validatePasswordRequirements = (password) => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  return requirements;
};

const validatePassword = (password) => {
  if (!password) return 'Password is required';

  const requirements = validatePasswordRequirements(password);
  const allMet = Object.values(requirements).every((req) => req);

  if (!allMet) {
    return 'Password must meet all requirements below';
  }

  return '';
};

// Other validation functions
const validateEmail = (email) => {
  if (!email) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? '' : 'Please enter a valid email address';
};

const validatePhone = (phone) => {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 0) return '';
  if (digitsOnly.length !== 10) return 'Phone number must be exactly 10 digits';
  return '';
};

const validateRequired = (value, fieldName) => {
  return !value.trim() ? `${fieldName} is required` : '';
};

const validateBusinessType = (businessType) => {
  if (!businessType) return 'Business type is required';
  if (!['restaurant', 'zone'].includes(businessType)) return 'Please select a valid business type';
  return '';
};

const validateUsername = (username) => {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (!/^[a-z0-9_]+$/.test(username)) return 'Username can only contain lowercase letters, numbers, and underscores';
  return '';
};

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialErrors);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showLoginSuggestion, setShowLoginSuggestion] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
  });

  // RTK Query hook for registration
  const [register, { isLoading: isRegistering }] = useRegisterMutation();

  const onChange = (e) => {
    const { name, value } = e.target;

    // Special handling for different fields
    let processedValue = value;
    if (name === 'ownerPhone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'username') {
      // Convert to lowercase and remove invalid characters
      processedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    }

    setForm((f) => ({ ...f, [name]: processedValue }));

    // Update password requirements in real-time
    if (name === 'password') {
      setPasswordRequirements(validatePasswordRequirements(processedValue));
    }

    // Clear general error when user starts typing
    if (error) {
      setError(null);
      setShowLoginSuggestion(false);
    }

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
        fieldError = validateUsername(processedValue);
        break;
      case 'password':
        fieldError = validatePassword(processedValue);
        break;
      case 'businessType':
        fieldError = validateBusinessType(processedValue);
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
      username: validateUsername(form.username),
      password: validatePassword(form.password),
      businessType: validateBusinessType(form.businessType)
    };

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);
    setError(null);
    setShowLoginSuggestion(false);

    try {
      const registrationData = {
        email: form.ownerEmail,
        phone: form.ownerPhone,
        password: form.password,
        confirmPassword: form.password,
        role: form.businessType === 'restaurant' ? 'restaurant_owner' : 'zone_admin',
        profile: {
          name: form.ownerName,
          businessName: form.name,
          username: form.username
        },
        businessType: form.businessType
      };

      const result = await register(registrationData).unwrap();
      const responseData = result.data || result;

      if (responseData && (responseData.userId || responseData.user)) {
        const userData = responseData.user || {
          id: responseData.userId,
          email: responseData.email,
          username: responseData.username,
          role: responseData.role,
          businessType: responseData.businessType,
          restaurantId: responseData.user?.restaurantId,
          zoneId: responseData.user?.zoneId,
          profile: responseData.user?.profile
        };

        const tokenStored = simpleTokenService.storeTokens(responseData.accessToken, responseData.refreshToken, userData);

        if (!tokenStored) {
          throw new Error('Failed to store authentication tokens');
        }

        dispatch(
          setCredentials({
            user: userData,
            accessToken: responseData.accessToken,
            refreshToken: responseData.refreshToken
          })
        );

        setSuccessData({
          message: 'Account created successfully!',
          email: responseData.email || responseData.user?.email,
          businessType: responseData.businessType || responseData.user?.businessType
        });
        setShowSuccessModal(true);

        setTimeout(() => {
          const businessType = responseData.businessType || responseData.user?.businessType;
          if (businessType === 'restaurant') {
            const restaurantId = responseData.user?.restaurantId || responseData.userId;
            if (restaurantId) {
              navigate(`/restaurant/${restaurantId}/dashboard`);
            } else {
              navigate('/login');
            }
          } else if (businessType === 'zone') {
            const zoneId = responseData.user?.zoneId || responseData.userId;
            if (zoneId) {
              navigate(`/zone/${zoneId}/dashboard`);
            } else {
              navigate('/login');
            }
          } else {
            navigate('/login');
          }
        }, 2000);
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (err) {
      let errorMessage = getUserFriendlyErrorMessage(err, 'signup');
      const rawErrorMsg = err?.data?.message || err?.message || errorMessage;
      const errorString = rawErrorMsg.toLowerCase();

      if (err.status === 409 || errorString.includes('duplicate') || errorString.includes('already exists')) {
        let specificConflict = 'An account with these details';
        
        if (errorString.includes('email')) {
          specificConflict = 'This Email Address';
        } else if (errorString.includes('phone')) {
          specificConflict = 'This Phone Number';
        } else if (errorString.includes('username')) {
          specificConflict = 'This Username';
        } else if (errorString.includes('name')) {
          specificConflict = 'This Business Name';
        }
        
        errorMessage = `${specificConflict} is already registered. Please use unique details or log in.`;
        setShowLoginSuggestion(true);
      } else {
        setShowLoginSuggestion(false);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/login');
  };

  const PasswordRequirement = ({ met, text }) => (
    <div className={`flex items-center space-x-2 text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
      <FaCheck className={`text-xs ${met ? 'text-green-600' : 'text-gray-300'}`} />
      <span>{text}</span>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-25 to-orange-100 flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full h-screen flex flex-col lg:flex-row">
          {/* Left Side - Welcome Section */}
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
                <h1 className="text-4xl xl:text-4xl font-fredoka mb-4">Welcome to</h1>
                <h2 className="text-5xl xl:text-6xl font-cinzel font-semibold bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent mb-8">
                  TableServes
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
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 xl:p-8">
                  {/* Mobile Header */}
                  <div className="lg:hidden text-center mb-8">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                    >
                      <FaUserPlus className="text-white text-2xl" />
                    </motion.div>
                    <h1 className="text-3xl font-fredoka bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-3">
                      Create Account
                    </h1>
                    <p className="text-gray-600 font-raleway">
                      Get started with your <span className="font-semibold text-green-600">Free Starter Plan</span>
                    </p>
                  </div>

                  {/* Desktop Header */}
                  <div className="hidden lg:block text-center mb-6">
                    <h1 className="text-3xl font-fredoka bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-2">
                      Create Your Account
                    </h1>
                    <p className="text-gray-600 font-raleway">
                      Get your <span className="font-bold text-green-600">Free Starter Plan</span> instantly
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="auth-form space-y-5">
                    {/* Business Name */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Business Name *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaBuilding className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          name="name"
                          value={form.name}
                          onChange={onChange}
                          className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl font-raleway transition-all focus:outline-none ${
                            errors.name
                              ? 'border-red-300 bg-red-50 focus:border-red-500'
                              : 'border-gray-200 focus:border-orange-500 hover:border-gray-300'
                          }`}
                          placeholder="Enter your business name"
                        />
                      </div>
                      {errors.name && <p className="text-red-500 text-xs font-raleway">{errors.name}</p>}
                    </div>

                    {/* Owner Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Owner Name *</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaUser className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            name="ownerName"
                            value={form.ownerName}
                            onChange={onChange}
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl font-raleway transition-all focus:outline-none ${
                              errors.ownerName
                                ? 'border-red-300 bg-red-50 focus:border-red-500'
                                : 'border-gray-200 focus:border-orange-500 hover:border-gray-300'
                            }`}
                            placeholder="Enter owner name"
                          />
                        </div>
                        {errors.ownerName && <p className="text-red-500 text-xs font-raleway">{errors.ownerName}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Owner Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaEnvelope className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            name="ownerEmail"
                            value={form.ownerEmail}
                            onChange={onChange}
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl font-raleway transition-all focus:outline-none ${
                              errors.ownerEmail
                                ? 'border-red-300 bg-red-50 focus:border-red-500'
                                : 'border-gray-200 focus:border-orange-500 hover:border-gray-300'
                            }`}
                            placeholder="owner@example.com"
                          />
                        </div>
                        {errors.ownerEmail && <p className="text-red-500 text-xs font-raleway">{errors.ownerEmail}</p>}
                      </div>
                    </div>

                    {/* Phone and Username Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Owner Phone Number</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaPhone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            name="ownerPhone"
                            value={form.ownerPhone}
                            onChange={onChange}
                            maxLength="10"
                            placeholder="Enter Phone Number"
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl font-raleway transition-all focus:outline-none ${
                              errors.ownerPhone
                                ? 'border-red-300 bg-red-50 focus:border-red-500'
                                : 'border-gray-200 focus:border-orange-500 hover:border-gray-300'
                            }`}
                          />
                        </div>
                        {errors.ownerPhone && <p className="text-red-500 text-xs font-raleway">{errors.ownerPhone}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Username *</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaUserShield className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            name="username"
                            value={form.username}
                            onChange={onChange}
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl font-raleway transition-all focus:outline-none ${
                              errors.username
                                ? 'border-red-300 bg-red-50 focus:border-red-500'
                                : 'border-gray-200 focus:border-orange-500 hover:border-gray-300'
                            }`}
                            placeholder="Enter username"
                          />
                        </div>
                        {errors.username && <p className="text-red-500 text-xs font-raleway">{errors.username}</p>}
                      </div>
                    </div>

                    {/* Business Type */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Business Type *</label>
                      <div className="relative">
                        <select
                          name="businessType"
                          value={form.businessType}
                          onChange={onChange}
                          className={`w-full pl-4 pr-10 py-3 border-2 rounded-xl font-raleway transition-all focus:outline-none appearance-none ${
                            errors.businessType
                              ? 'border-red-300 bg-red-50 focus:border-red-500'
                              : 'border-gray-200 focus:border-orange-500 hover:border-gray-300'
                          }`}
                        >
                          <option value="">Select your business type</option>
                          <option value="restaurant">Restaurant Owner</option>
                          <option value="zone">Food Zone Owner</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      {errors.businessType && <p className="text-red-500 text-xs font-raleway">{errors.businessType}</p>}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={form.password}
                          onChange={onChange}
                          className={`w-full border-2 rounded-lg pl-3 pr-12 py-2.5 font-raleway text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                            errors.password
                              ? 'border-red-300 bg-red-50 focus:border-red-500'
                              : 'border-gray-300 focus:border-orange-500 hover:border-gray-400'
                          }`}
                          placeholder="Create secure password"
                        />
                        <div className="absolute flex inset-y-0 right-0 flex items-center pr-3">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-400 hover:text-orange-500 transition-colors focus:outline-none"
                          >
                            {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {/* Password Requirements */}
                      <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-gray-600">Password requirements:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <PasswordRequirement met={passwordRequirements.length} text="8+ characters" />
                          <PasswordRequirement met={passwordRequirements.uppercase} text="Uppercase (A-Z)" />
                          <PasswordRequirement met={passwordRequirements.lowercase} text="Lowercase (a-z)" />
                          <PasswordRequirement met={passwordRequirements.number} text="Number (0-9)" />
                          <PasswordRequirement met={passwordRequirements.symbol} text="Symbol (!@#$%^&*)" />
                        </div>
                      </div>

                      {errors.password && <p className="text-red-500 text-xs font-raleway">{errors.password}</p>}
                    </div>

                    {/* General Error */}
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 font-raleway text-sm text-center mb-3">{error}</p>
                        {showLoginSuggestion && (
                          <div className="text-center">
                            <button
                              onClick={() => navigate('/login')}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-raleway text-sm"
                            >
                              Go to Login
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      disabled={loading}
                      type="submit"
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-raleway font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating Account...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <FaUserPlus />
                          <span>Create Account</span>
                        </div>
                      )}
                    </button>
                  </form>

                  {/* Login Link */}
                  <div className="text-center mt-6">
                    <button
                      onClick={() => navigate('/login')}
                      className="text-orange-600 hover:text-orange-700 font-raleway font-semibold transition-colors duration-200 hover:underline"
                    >
                      Already have an account? Sign In
                    </button>
                  </div>
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
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-orange-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FaCheckCircle className="text-white text-2xl" />
                </div>
                <h2 className="text-2xl font-fredoka bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-4">
                  Account Created Successfully!
                </h2>
                <p className="text-gray-600 font-raleway mb-6">
                  Your account has been created and you'll be redirected to your dashboard shortly.
                </p>
                <button
                  onClick={handleSuccessModalClose}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-raleway font-semibold hover:shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300"
                >
                  Continue to Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
