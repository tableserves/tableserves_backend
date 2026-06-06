import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaLock, FaCheckCircle, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useUpdatePasswordWithTokenMutation } from '../../../store/api/authApi';
import { getUserFriendlyErrorMessage } from '../../../shared/utils/errorMessageUtils';
import logo from '../../../assets/logo.svg';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { token: urlToken } = useParams();

  const [updatePasswordWithToken] = useUpdatePasswordWithTokenMutation();

  // Extract token from URL params or query params
  useEffect(() => {
    let extractedToken = '';
    if (urlToken) {
      extractedToken = urlToken;
    } else {
      // Extract token from query parameters
      const searchParams = new URLSearchParams(location.search);
      const tokenParam = searchParams.get('token');
      if (tokenParam) {
        extractedToken = tokenParam;
      }
    }

    // Log the extracted token for debugging (be careful not to log the full token in production)
    console.log('ResetPassword: Extracted token', {
      tokenLength: extractedToken.length,
      tokenPreview: extractedToken.substring(0, 10) + '...',
      fullToken: extractedToken // Be careful with this in production
    });

    // Validate and clean the token
    try {
      // Handle potential double encoding by decoding until stable
      let cleanedToken = extractedToken;
      let previousToken;
      do {
        previousToken = cleanedToken;
        cleanedToken = decodeURIComponent(cleanedToken);
      } while (cleanedToken !== previousToken && cleanedToken !== decodeURIComponent(cleanedToken));

      // Only update state if the token was actually changed
      if (cleanedToken !== extractedToken) {
        console.log('ResetPassword: Token cleaned', {
          originalToken: extractedToken,
          cleanedToken: cleanedToken
        });
        setToken(cleanedToken);
      }
    } catch (cleanError) {
      console.log('ResetPassword: Error cleaning token, using original', {
        error: cleanError.message
      });
    }

    setToken(extractedToken);
  }, [urlToken, location]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    // Updated validation: minimum 8 characters with all required types
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Check for required character types
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    if (!hasLowercase) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!hasUppercase) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!hasNumber) {
      setError('Password must contain at least one number');
      return;
    }

    if (!hasSpecialChar) {
      setError('Password must contain at least one special character');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await updatePasswordWithToken({
        token,
        password: newPassword,
        confirmPassword: confirmPassword
      }).unwrap();

      setSuccess('Password updated successfully!');

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err, 'update_password');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
          <p className="text-primary-bg font-raleway">Reset Password</p>
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
          <form onSubmit={handleUpdatePassword} className="auth-form space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                New Password
              </label>
              <div className="relative flex">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter new password"
                  className=" w-full px-4 py-3 ml-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent pr-12"
                  disabled={loading}
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute   top-6 right-8 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                Confirm Password
              </label>
              <div className="relative flex">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 ml-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent pr-12"
                  disabled={loading}
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-6 right-8 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-700 font-raleway font-medium text-sm mb-2">Password Requirements:</p>
              <ul className="text-gray-600 font-raleway text-xs space-y-1">
                <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                  <span className="mr-2">•</span>
                  At least 8 characters long
                </li>
                <li className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className="mr-2">•</span>
                  Contains lowercase letter
                </li>
                <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className="mr-2">•</span>
                  Contains uppercase letter
                </li>
                <li className={`flex items-center ${/\d/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className="mr-2">•</span>
                  Contains number
                </li>
                <li
                  className={`flex items-center ${
                    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'text-green-600' : ''
                  }`}
                >
                  <span className="mr-2">•</span>
                  Contains special character
                </li>
                <li className={`flex items-center ${newPassword === confirmPassword && newPassword.length > 0 ? 'text-green-600' : ''}`}>
                  <span className="mr-2">•</span>
                  Passwords match
                </li>
              </ul>
            </div>

            <motion.button
              type="submit"
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FaLock className="mr-2" />
                  Update Password
                </>
              )}
            </motion.button>

            <div className="text-center">
              <button type="button" onClick={handleBackToLogin} className="text-accent hover:text-accent/80 font-raleway text-sm">
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Password Updated Successfully!</h3>
            <p className="text-gray-600 mb-6">Your password has been changed. You'll be redirected to the login page.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
