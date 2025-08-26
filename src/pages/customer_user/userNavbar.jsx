import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUserCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantDetails } from '../../store/slices/restaurantSlice';

const UserNavbar = ({ userId }) => {
  const { restaurantId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { details, loading, error } = useSelector((state) => state.restaurant);

  useEffect(() => {
    if (restaurantId) {
      dispatch(fetchRestaurantDetails({ restaurantId }));
    } else if (zoneId) {
      dispatch(fetchRestaurantDetails({ zoneId }));
    }
  }, [restaurantId, zoneId, dispatch]);

  const handleViewCart = () => {
    navigate(`/tableserve/${restaurantId}/${userId}/cart`);
  };

  return (
    <div className="flex justify-between items-center p-5 bg-accent mb-4 shadow-md">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-white capitalize">
          {loading ? 'Loading...' : details ? `${details.name} Menu` : 'Restaurant Menu'}
        </h1>
      </div>

      <div className="flex items-center space-x-3">
        {/* Cart Button */}
        {cartItemCount > 0 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleViewCart}
            className="relative p-2 bg-white bg-opacity-20 rounded-full shadow-lg"
          >
            <FaShoppingCart className="text-lg text-white" />
            <span className="absolute -top-1 -right-1 bg-primary-bg text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartItemCount}
            </span>
          </motion.button>
        )}

        {/* Profile Dropdown for logged-in users */}
        {isAuthenticated && user && (
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleProfileDropdown}
              className="flex items-center space-x-2 p-2 bg-white bg-opacity-20 rounded-full shadow-lg"
            >
              <FaUser className="text-lg text-white" />
              <FaChevronDown className={`text-white text-xs transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </motion.button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-divider-border z-50"
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-divider-border">
                    <p className="text-sm font-fredoka text-primary-bg">{user.name || user.phone}</p>
                    <p className="text-xs text-placeholder-subtext">{user.phone}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={handleOrderHistory}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <FaReceipt className="text-accent" />
                      <span className="text-sm font-raleway text-primary-bg">Order History</span>
                    </button>

                    <hr className="my-2 border-divider-border" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-red-50 transition-colors"
                    >
                      <FaSignOutAlt className="text-red-500" />
                      <span className="text-sm font-raleway text-red-500">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overlay to close dropdown */}
            {showProfileDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileDropdown(false)}
              />
            )}
          </div>
        )}

        {/* Login Button for guests */}
        {!isAuthenticated && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (restaurantId && tableId) {
                navigate(`/tableserve/restaurant/${restaurantId}/table/${tableId}/otp-login`);
              } else {
                navigate('/tableserve/login');
              }
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 rounded-full shadow-lg"
          >
            <FaUser className="text-white text-sm" />
            <span className="text-white text-sm font-raleway">Login</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default UserNavbar;