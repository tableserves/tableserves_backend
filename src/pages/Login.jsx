import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginUser, clearAuthError } from '../store/slices/uiSlice';
import { setSubscription } from '../store/slices/subscriptionSlice';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const [fieldNames] = useState({
    username: `user_${Math.random().toString(36).substring(2, 11)}`,
    password: `pass_${Math.random().toString(36).substring(2, 11)}`
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.ui.auth);

  // Add this useEffect hook
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("User object in Login.jsx useEffect:", user);
      console.log("User zoneId:", user.zoneId);
      console.log("User zoneId type:", typeof user.zoneId);

      // Load subscription data if available
      if (user.subscription) {
        console.log('Loading subscription from user data:', user.subscription);
        dispatch(setSubscription(user.subscription));
      } else {
        // Try to load subscription from localStorage as fallback
        try {
          const storedSubscription = localStorage.getItem('tableserve_subscription');
          if (storedSubscription) {
            const subscriptionData = JSON.parse(storedSubscription);
            console.log('Loading subscription from localStorage:', subscriptionData);
            dispatch(setSubscription(subscriptionData));
          }
        } catch (error) {
          console.warn('Failed to load subscription from localStorage:', error);
        }
      }

      // Clear any previous error on successful login
      if (error) {
        dispatch(clearAuthError());
      }
      
      console.log('Login: User authenticated successfully:', {
        userId: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
        zoneId: user.zoneId,
        shopId: user.shopId,
        hasSubscription: !!user.subscription
      });
      
      // Navigate based on user role
      switch (user.role) {
        case 'admin':
          console.log('Login: Navigating to admin dashboard');
          navigate('/tableserve/admin/dashboard');
          break;
          
        case 'restaurant_owner':
          console.log('Login: Navigating to restaurant dashboard:', {
            restaurantId: user.restaurantId,
            fallbackId: user.id,
            username: user.username
          });
          sessionStorage.setItem('currentOwner', JSON.stringify(user));
          // Use restaurantId first, fallback to id
          const restaurantId = user.restaurantId || user.id;
          if (restaurantId) {
            navigate(`/tableserve/restaurant/${restaurantId}/dashboard`);
          } else {
            console.error('Login: No restaurant ID found for restaurant owner:', user);
            navigate('/tableserve/login');
          }
          break;
          
        case 'zone_admin':
          console.log('Login: Navigating to zone admin dashboard:', {
            zoneId: user.zoneId,
            username: user.username
          });
          if (user.zoneId) {
            navigate(`/tableserve/zone/${user.zoneId}/dashboard`);
          } else {
            console.error('Login: No zone ID found for zone admin:', user);
            navigate('/tableserve/login');
          }
          break;
          
        case 'zone_shop':
          console.log('Login: Navigating to zone shop dashboard:', {
            zoneId: user.zoneId,
            shopId: user.shopId,
            username: user.username
          });
          if (user.zoneId && user.shopId) {
            const dashboardUrl = `/tableserve/zone/${user.zoneId}/shop/${user.shopId}/dashboard`;
            console.log("Login: Zone shop dashboard URL:", dashboardUrl);
            navigate(dashboardUrl);
          } else {
            console.error("Login: Missing zoneId or shopId for zone_shop user:", user);
            navigate('/tableserve/login');
          }
          break;
          
        case 'zone_vendor':
          console.log('Login: Navigating to zone vendor dashboard:', {
            zoneId: user.zoneId,
            shopId: user.shopId,
            username: user.username
          });
          if (user.shopId && user.zoneId) {
            const dashboardUrl = `/tableserve/zone/${user.zoneId}/shop/${user.shopId}/dashboard`;
            console.log("Login: Zone vendor dashboard URL:", dashboardUrl);
            navigate(dashboardUrl);
          } else {
            console.error("Login: Missing shopId or zoneId for zone_vendor user:", user);
            navigate('/tableserve/login');
          }
          break;
          
        default:
          console.error('Login: Unrecognized user role:', user.role, user);
          navigate('/tableserve/login');
          break;
      }
    }
  }, [isAuthenticated, user, navigate]); // Removed dispatch from dependencies

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Sign In button clicked!'); // Added for debugging
    dispatch(loginUser(formData));
  };

  return (
    <div className="min-h-screen bg-accent/80 backdrop-blur-lg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white  p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-fredoka text-accent mb-2">TableServe</h1>
          <p className="text-primary-bg font-raleway"> Login </p>

        </div>

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
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
              onChange={(e) => {
                setFormData({ ...formData, username: e.target.value });
                if (error) dispatch(clearAuthError());
              }}
              className="login-input autofill-fix block w-full pl-10 pr-3 py-3 border border-primary-bg rounded-lg bg-white/10 text-primary-bg placeholder-primary-bg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              required
            />
          </div>

          <div style={{ position: 'relative', display: 'block' }}>
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              pointerEvents: 'none'
            }}>
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
                if (error) dispatch(clearAuthError());
              }}
              className="login-input autofill-fix block w-full py-3 border border-primary-bg rounded-lg bg-white/10 text-primary-bg placeholder-primary-bg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              style={{
                paddingLeft: '40px',
                paddingRight: '40px',
                position: 'relative',
                zIndex: 1
              }}
              autoComplete="new-password"
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
              {showPassword ? (
                <FaEyeSlash className="w-4 h-4" />
              ) : (
                <FaEye className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm font-raleway text-center"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
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
            <button
              onClick={() => navigate('/tableserve/signup')}
              className="text-accent hover:text-accent/80 font-semibold"
            >
              Sign Up
            </button>
          </p>
          <button className="text-accent hover:text-accent/80 font-raleway text-sm mt-2">
            Forgot your password?
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;