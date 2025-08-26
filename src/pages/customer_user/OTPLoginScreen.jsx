import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaClock, FaShieldAlt } from 'react-icons/fa';
import OTPService from '../../services/OTPService';
import { generateContextualUrl } from '../../utils/urlUtils';

/**
 * Generate a new user ID for first-time zone users
 * @returns {string} New user ID
 */
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
};

const OTPLoginScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();

  // Debug logging to help troubleshoot route parameters (only log once per mount)
  React.useEffect(() => {
    console.log('OTPLoginScreen mounted with params:', { restaurantId, tableId, userId, zoneId });

    // Validate required parameters
    if (!tableId) {
      console.warn('OTPLoginScreen: Missing tableId parameter');
    }
    if (!restaurantId && !zoneId) {
      console.warn('OTPLoginScreen: Missing both restaurantId and zoneId parameters');
    }
  }, []); // Empty dependency array to log only once on mount
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSession, setOtpSession] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Timer effect for OTP expiry
  useEffect(() => {
    let interval;
    if (timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleGetOtp = async () => {
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!OTPService.validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await OTPService.sendOTP(
        phoneNumber,
        'customer_login',
        `${restaurantId}_${userId}`
      );

      if (result.success) {
        setOtpSession({ id: result.sessionId });
        setTimeRemaining(600); // 10 minutes
        setOtpSent(true);
        setSuccess(`OTP sent to ${OTPService.formatPhoneNumber(phoneNumber)}`);
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = OTPService.verifyOTP(otpSession.id, otp);

      if (result.success) {
        setSuccess('OTP verified successfully!');

        setTimeout(() => {
          // Generate userId if not present (for first-time zone users)
          const finalUserId = userId || generateUserId();

          // Store customer login info with generated userId
          const customerKey = `customer_${restaurantId || zoneId}_${finalUserId}`;
          localStorage.setItem(customerKey, JSON.stringify({
            phoneNumber,
            loginTime: new Date().toISOString(),
            verified: true,
            userId: finalUserId
          }));

          const checkoutRoute = generateContextualUrl(
            { restaurantId, tableId, userId: finalUserId, zoneId },
            'checkout'
          );
          console.log('Navigating to checkout with userId:', finalUserId, 'Route:', checkoutRoute);
          navigate(checkoutRoute);
        }, 1000);
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!otpSession?.id) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await OTPService.resendOTP(otpSession.id);

      if (result.success) {
        setTimeRemaining(600);
        setSuccess('OTP resent successfully');
        setOtp('');
      } else {
        setError(result.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-900 relative pb-safe">
      {/* Mobile-First Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-6 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-accent to-red-500 rounded-full shadow-lg flex items-center justify-center touch-manipulation"
            >
              <FaArrowLeft className="text-white text-sm sm:text-base" />
            </motion.button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka">Login to Order</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-raleway">
                Table {tableId} • Secure verification
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8"
        >

          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl flex items-center space-x-3"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex-shrink-0"></div>
              <span className="font-medium font-raleway text-sm sm:text-base">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl sm:rounded-2xl flex items-center space-x-3"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="font-medium font-raleway text-sm sm:text-base">{success}</span>
            </motion.div>
          )}

          {!otpSent ? (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 font-raleway">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all duration-300 font-raleway text-sm sm:text-base"
                  disabled={loading}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleGetOtp}
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent to-red-500 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold font-fredoka text-base sm:text-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 touch-manipulation"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Get OTP</span>
                )}
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Timer Display */}
              {timeRemaining > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-center space-x-2">
                  <FaClock className="text-blue-600 text-sm sm:text-base" />
                  <span className="text-blue-700 font-medium font-raleway text-sm sm:text-base">
                    OTP expires in {formatTime(timeRemaining)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 font-raleway">
                  Enter OTP
                </label>
                <input
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all duration-300 text-center text-lg sm:text-xl tracking-widest font-mono"
                  disabled={loading}
                  maxLength={6}
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-accent to-red-500 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold font-fredoka text-base sm:text-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 touch-manipulation"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </motion.button>

              {/* Resend OTP Button */}
              <div className="text-center pt-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleResendOTP}
                  disabled={loading || timeRemaining > 540} // Allow resend after 1 minute
                  className="text-accent font-raleway text-sm sm:text-base font-medium underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {timeRemaining > 540
                    ? `Resend OTP in ${formatTime(timeRemaining - 540)}`
                    : loading
                      ? 'Resending...'
                      : 'Resend OTP'
                  }
                </motion.button>
              </div>

              {/* Back to Phone Number */}
              <div className="text-center border-t border-gray-100 pt-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setError('');
                    setSuccess('');
                    setTimeRemaining(0);
                  }}
                  className="text-gray-600 font-raleway text-sm sm:text-base font-medium underline hover:no-underline transition-all duration-300"
                >
                  Change phone number
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OTPLoginScreen;