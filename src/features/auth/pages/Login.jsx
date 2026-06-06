import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { setCredentials, clearError, logout } from '../../../store/slices/authSlice';
import { loginUser as loginUserAction } from '../../../store/slices/uiSlice';
import {
  setSubscription,
  fetchCurrentSubscription,
  fetchSubscriptionLimits,
  fetchCurrentCounts
} from '../../../store/slices/subscriptionSlice';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import serverAuthService from '../../../shared/auth/ServerAuthService';
import multiTabAuthService from '../../../shared/auth/MultiTabAuthService';
import { getUserFriendlyErrorMessage } from '../../../shared/utils/errorMessageUtils';
import logo from '../../../assets/logo.svg';
import simpleTokenService from '../../../shared/auth/SimpleTokenService';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [fieldNames] = useState({
    username: `user_${Math.random().toString(36).substring(2, 11)}`,
    password: `pass_${Math.random().toString(36).substring(2, 11)}`
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.ui.auth);

  // Check if form is valid
  useEffect(() => {
    const isValid = formData.username.trim().length > 0 && formData.password.length > 0;
    setIsFormValid(isValid);
  }, [formData]);

  // Initialize multi-tab authentication service
  useEffect(() => {
    multiTabAuthService.initialize();

    // Listen for authentication changes from other tabs
    const removeListener = multiTabAuthService.addListener((authData) => {
      if (authData.action === 'LOGIN' && authData.user && !isAuthenticated) {
        // Another tab logged in - update this tab's state
        dispatch(
          setCredentials({
            user: authData.user,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: true
          })
        );

        // Only fetch subscription data if not already loading
        if (!loading) {
          dispatch(fetchCurrentSubscription());
          dispatch(fetchSubscriptionLimits());
          dispatch(fetchCurrentCounts());
        }
      } else if (authData.action === 'LOGOUT' && isAuthenticated) {
        // Another tab logged out - update this tab's state
        dispatch(logout());
      }
    });

    // Cleanup on unmount
    return () => {
      removeListener();
    };
  }, [dispatch, isAuthenticated, loading]);

  // Check for existing authentication in localStorage on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        // Check if we have valid tokens using SimpleTokenService
        if (simpleTokenService.isAuthenticated()) {
          const accessToken = simpleTokenService.getAccessToken();
          const refreshToken = simpleTokenService.getRefreshToken();
          const userData = simpleTokenService.getUserData();

          if (accessToken && refreshToken && userData) {
            // Update Redux state with the authenticated user
            dispatch(
              setCredentials({
                user: userData,
                accessToken: accessToken,
                refreshToken: refreshToken,
                isAuthenticated: true
              })
            );

            // Broadcast existing session to other tabs
            multiTabAuthService.broadcastLogin(userData);

            // Only fetch subscription data if not already loading
            if (!loading) {
              dispatch(fetchCurrentSubscription());
              dispatch(fetchSubscriptionLimits());
              dispatch(fetchCurrentCounts());
            }

            return; // Exit early, navigation will be handled by the other useEffect
          }
        }
      } catch (error) {
        // This is normal for users who aren't logged in
      }
    };

    // Only check for auth if not already authenticated
    if (!isAuthenticated && !loading) {
      checkExistingAuth();
    }
  }, []); // Run only on mount

  // Handle navigation when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Fetch real-time subscription data from backend
      const fetchSubscriptionData = async () => {
        try {
          // Fetch all subscription-related data in parallel
          await Promise.all([
            dispatch(fetchCurrentSubscription()).unwrap(),
            dispatch(fetchSubscriptionLimits()).unwrap(),
            dispatch(fetchCurrentCounts()).unwrap()
          ]);
        } catch (error) {
          // Fallback: if user object has subscription, use it temporarily
          if (user.subscription) {
            dispatch(setSubscription(user.subscription));
          }
        }
      };

      fetchSubscriptionData();

      // Clear any previous error on successful login
      if (error) {
        dispatch(clearError());
      }

      // Get the redirect path from location state or use default
      const from = location.state?.from?.pathname || '/';

      // Navigate based on user role
      switch (user.role) {
        case 'admin':
          navigate(from === '/' ? '/admin/dashboard' : from, { replace: true });
          break;

        case 'restaurant_owner':
          sessionStorage.setItem('currentOwner', JSON.stringify(user));
          // Use restaurantId first, fallback to user.id
          const restaurantId = user.restaurantId || user.id;
          if (restaurantId) {
            navigate(from === '/' ? `/restaurant/${restaurantId}/dashboard` : from, { replace: true });
          } else {
            // If no restaurant ID, redirect to login page with error
            console.error('Restaurant owner missing restaurantId');
            navigate('/login', { replace: true });
          }
          break;

        case 'zone_admin':
          if (user.zoneId) {
            navigate(from === '/' ? `/zone/${user.zoneId}/dashboard` : from, { replace: true });
          } else {
            // If no zone ID, redirect to login page with error
            console.error('Zone admin missing zoneId');
            navigate('/login', { replace: true });
          }
          break;

        case 'zone_shop':
          if (user.zoneId && user.shopId) {
            const dashboardUrl = `/zone/${user.zoneId}/shop/${user.shopId}/dashboard`;
            navigate(from === '/' ? dashboardUrl : from, { replace: true });
          } else {
            // If missing required IDs, redirect to login page with error
            console.error('Zone shop missing required IDs');
            navigate('/login', { replace: true });
          }
          break;

        case 'zone_vendor':
          if (user.shopId && user.zoneId) {
            const dashboardUrl = `/zone/${user.zoneId}/shop/${user.shopId}/dashboard`;
            navigate(from === '/' ? dashboardUrl : from, { replace: true });
          } else {
            // If missing required IDs, redirect to login page with error
            console.error('Zone vendor missing required IDs');
            navigate('/login', { replace: true });
          }
          break;

        default:
          navigate(from === '/' ? '/login' : from, { replace: true });
          break;
      }
    }
  }, [isAuthenticated, user, navigate, dispatch, error, loading, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent submission if form is invalid
    if (!isFormValid) return;

    try {
      // Use Redux loginUser action which handles JWT authentication
      const result = await dispatch(loginUserAction(formData)).unwrap();

      // The loginUser action should have already stored tokens in localStorage
      // and updated Redux state, so we just need to broadcast and fetch subscription data

      // Broadcast login success to other tabs
      if (result.user) {
        multiTabAuthService.broadcastLogin(result.user);
      }

      // Fetch subscription data
      dispatch(fetchCurrentSubscription());
      dispatch(fetchSubscriptionLimits());
      dispatch(fetchCurrentCounts());
    } catch (error) {
      // Error is already handled by Redux action
    }
  };

  // Handle username input with lowercase conversion
  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase();
    setFormData({ ...formData, username: value });
    if (error) dispatch(clearError());
  };

  // Handle Enter key press for form submission
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && isFormValid && !loading) {
        handleSubmit(e);
      }
    },
    [isFormValid, loading, handleSubmit]
  );

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
            TableServes
          </h1>
          <p className="text-primary-bg font-raleway">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form space-y-6" autoComplete="off">
          <div style={{ display: 'none' }}>
            <input type="text" name="fake_username" autoComplete="username" />
            <input type="password" name="fake_password" autoComplete="current-password" />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaUser className="w-4 h-4 text-primary-bg" />
            </div>
            <input
              type="text"
              name={fieldNames.username}
              data-form-type="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleUsernameChange}
              onKeyPress={handleKeyPress}
              className="login-input autofill-fix block w-full pl-10 pr-3 py-3 border border-primary-bg rounded-lg bg-white/10 text-primary-bg placeholder-primary-bg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              required
            />
          </div>

          <div style={{ position: 'relative', display: 'block' }}>
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                pointerEvents: 'none'
              }}
            >
              <FaLock className="w-4 h-4 text-primary-bg" />
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              name={fieldNames.password}
              data-form-type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (error) dispatch(clearError());
              }}
              onKeyPress={handleKeyPress}
              className="login-input autofill-fix block w-full py-3 border border-primary-bg rounded-lg bg-white/10 text-primary-bg placeholder-primary-bg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              style={{
                paddingLeft: '40px',
                paddingRight: '40px',
                position: 'relative',
                zIndex: 1
              }}
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="text-primary-bg hover:text-primary-bg focus:outline-none focus:text-primary-bg transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-raleway text-center">
              {getUserFriendlyErrorMessage(error, 'login')}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading || !isFormValid}
            whileHover={{ scale: isFormValid && !loading ? 1.02 : 1 }}
            whileTap={{ scale: isFormValid && !loading ? 0.98 : 1 }}
            className={`w-full font-raleway font-semibold py-3 rounded-lg transition-colors ${
              loading || !isFormValid
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-accent hover:bg-accent/90 text-white'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <FaSpinner className="animate-spin mr-2" />
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-black font-raleway text-sm mb-2">Looking for customer access?</p>
          <p className="text-black font-raleway text-xs">
            Scan the QR code at your restaurant table to access the menu and place orders.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-black font-raleway text-sm">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-accent hover:text-accent/80 font-semibold">
              Sign Up
            </button>
          </p>
          <button onClick={() => navigate('/forgot-password')} className="text-accent hover:text-accent/80 font-raleway text-sm mt-2">
            Forgot your password?
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
