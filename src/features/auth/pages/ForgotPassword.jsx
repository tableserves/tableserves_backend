import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaKey, FaCheckCircle, FaTimes } from 'react-icons/fa';
import { useResetPasswordMutation } from '../../../store/api/authApi';
import { getUserFriendlyErrorMessage } from '../../../shared/utils/errorMessageUtils';
import logo from '../../../assets/logo.svg';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [resetPassword] = useResetPasswordMutation();

  const handleSendResetEmail = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-accent/80 backdrop-blur-lg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-cinzel font-semibold text-accent mb-2 -ml-6">
            <img src="/logo.svg" alt="Logo" className="inline-block h-20 w-20" />
            Tableserves
          </h1>
          <p className="text-primary-bg font-raleway">Forgot Password</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center space-x-2"
          >
            <FaTimes className="text-red-500" />
            <span className="text-red-600 font-raleway text-sm">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center space-x-2"
          >
            <FaCheckCircle className="text-green-500" />
            <span className="text-green-600 font-raleway text-sm">{success}</span>
          </motion.div>
        )}

        {!success && (
          <form onSubmit={handleSendResetEmail} className="auth-form space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Registered Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your registered email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                disabled={loading}
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FaKey className="mr-2" />
                  Send Reset Instructions
                </>
              )}
            </motion.button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-accent hover:text-accent/80 font-raleway text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {success && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheckCircle className="text-green-500 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Check Your Email</h3>
            <p className="text-gray-600 mb-6">
              We've sent password reset instructions to {email}. Please check your inbox and follow the link to reset your
              password.
            </p>
            <motion.button
              onClick={handleBackToLogin}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-3 rounded-lg transition-colors"
            >
              Back to Login
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
