import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaSearch,
  FaShoppingCart,
  FaExclamationTriangle,
  FaCheckCircle,
  FaStore
} from 'react-icons/fa';
import { logout } from '../../store/slices/uiSlice';
import ThemeToggle from '../common/ThemeToggle';
import { selectTheme } from '../../store/slices/uiSlice';

const SingleRestaurantNavbar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  const currentTheme = useSelector(selectTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock notifications for restaurant owner
  const notifications = [
    {
      id: 1,
      type: 'order',
      title: 'New Order Received',
      message: 'Table 5 - 2 items - $24.99',
      time: '2 minutes ago',
      read: false,
      icon: FaShoppingCart,
      color: 'text-green-400'
    },
    {
      id: 2,
      type: 'alert',
      title: 'Low Stock Alert',
      message: 'Margherita Pizza ingredients running low',
      time: '15 minutes ago',
      read: false,
      icon: FaExclamationTriangle,
      color: 'text-yellow-400'
    },
    {
      id: 3,
      type: 'success',
      title: 'Order Completed',
      message: 'Table 3 order marked as served',
      time: '1 hour ago',
      read: true,
      icon: FaCheckCircle,
      color: 'text-blue-400'
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/tableserve/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 right-0 left-0 admin-navbar z-50"
    >
      <div className="flex items-center justify-between px-3 sm:px-6 py-4">
        {/* Left Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-theme-text-primary hover:text-theme-accent-primary transition-colors p-2 rounded-lg hover:bg-theme-bg-hover"
          >
            <FaBars className="w-5 h-5" />
          </button>

          {/* Search - Hidden on mobile */}
          {!isMobile && (
            <form onSubmit={handleSearch} className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary text-sm" />
              <input
                type="text"
                placeholder="Search orders, menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-theme rounded-lg pl-10 pr-4 py-2 focus:outline-none transition-colors w-80"
              />
            </form>
          )}

          {/* Mobile Search Button */}
          {isMobile && (
            <button className="text-theme-text-primary hover:text-theme-accent-primary transition-colors p-2 rounded-lg hover:bg-theme-bg-hover">
              <FaSearch className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Center - Restaurant Status */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 text-status-success rounded-full text-sm font-raleway">
            <div className="w-2 h-2 bg-status-success rounded-full animate-pulse"></div>
            <span>Restaurant Open</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle variant="icon-only" showLabel={false} />


          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 sm:space-x-3 text-white hover:text-accent transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              {!isMobile && (
                <div className="text-right">
                  <p className="font-raleway text-secondary text-sm font-medium">{user?.name || 'Restaurant Owner'}</p>
                  <p className="text-secondary text-xs font-raleway">{user?.restaurantName}</p>
                </div>
              )}
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <FaStore className="w-4 h-4 text-white" />
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-black/90 backdrop-blur-xl border border-accent/20 rounded-2xl shadow-2xl z-50"
                >
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                        <FaStore className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-fredoka">{user?.name}</h3>
                        <p className="text-white/60 font-raleway text-sm">{user?.restaurantName}</p>
                        <p className="text-accent font-raleway text-xs">Restaurant Owner</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => navigate(`/tableserve/restaurant/${restaurantId}/profile`)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-raleway"
                    >
                      <FaUser className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </button>
                    <button
                      onClick={() => navigate(`/tableserve/restaurant/${restaurantId}/settings`)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-raleway"
                    >
                      <FaCog className="w-4 h-4" />
                      <span>Account Settings</span>
                    </button>
                    <hr className="border-white/10 my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors font-raleway"
                    >
                      <FaSignOutAlt className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default SingleRestaurantNavbar;
