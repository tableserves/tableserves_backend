import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart, FaArrowLeft, FaUserCircle } from 'react-icons/fa';
import { generateZoneUrl } from '../../utils/urlUtils';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantDetails } from '../../store/slices/restaurantSlice';
import { logout } from '../../store/slices/uiSlice'; // Updated to use uiSlice

const ZoneUserNavbar = ({ cartItemCount = 0, showBackButton = false }) => {
  const { zoneId, tableId, userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { details: zone, loading, error } = useSelector((state) => state.restaurant);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    if (zoneId) {
      dispatch(fetchRestaurantDetails({ zoneId }));
    }
  }, [zoneId, dispatch]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleCartClick = () => {
    navigate(generateZoneUrl(zoneId, tableId, userId, 'cart'));
  };

  const handleLogout = () => {
    dispatch(logout());
    setShowProfileDropdown(false);
    // Redirect to the same page but without user ID to become a guest
    navigate(generateZoneUrl(zoneId, tableId, null, 'shops'));
  };

  const handleOrderHistory = () => {
    navigate(generateZoneUrl(zoneId, tableId, userId, 'orders'));
    setShowProfileDropdown(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const title = loading ? "Loading..." : zone ? zone.name : "Food Zone";

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-divider-border">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Back button or Logo */}
          <div className="flex items-center">
            {showBackButton ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleBackClick}
                className="p-2 bg-accent rounded-full shadow-lg mr-3"
              >
                <FaArrowLeft className="text-lg text-white" />
              </motion.button>
            ) : (
              <div className="flex items-center">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-fredoka text-lg">FZ</span>
                </div>
                <div>
                  <h1 className="text-lg font-fredoka text-primary-bg">{title}</h1>
                  <p className="text-xs text-placeholder-subtext">Table #{tableId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Profile or Cart */}
          <div className="relative">
            {userId ? (
              // Logged-in user: Profile icon and dropdown
              <>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleProfileDropdown}
                  className="p-2 bg-accent rounded-full shadow-lg"
                >
                  <FaUserCircle className="text-lg text-white" />
                </motion.button>
                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                    >
                      <div className="py-1">
                        <button
                          onClick={handleOrderHistory}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Order History
                        </button>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              // Guest user: Cart icon
              cartItemCount > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCartClick}
                  className="relative p-2 bg-accent rounded-full shadow-lg"
                >
                  <FaShoppingCart className="text-lg text-white" />
                  <span className="absolute -top-1 -right-1 bg-primary-bg text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </motion.button>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ZoneUserNavbar;