import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaTimes,
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaSearch,
  FaShoppingCart,
  FaExclamationTriangle,
  FaCheckCircle,
  FaStore,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { logout } from '../../store/slices/uiSlice';
import ThemeToggle from '../common/ThemeToggle';
import { selectTheme } from '../../store/slices/uiSlice';

const ZoneAdminNavbar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { zoneId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  const currentTheme = useSelector(selectTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get zone data from localStorage
  const getZoneData = () => {
    try {
      const zoneData = localStorage.getItem(`tableserve_zone_${zoneId}`);
      return zoneData ? JSON.parse(zoneData) : null;
    } catch (error) {
      console.error('Error loading zone data:', error);
      return null;
    }
  };

  const zoneData = getZoneData();

  // Mock notifications for zone admin
  const notifications = [
    {
      id: 1,
      type: 'order',
      title: 'New Shop Order',
      message: 'Pizza Corner - Table 3 - ₹450',
      time: '3 minutes ago',
      read: false,
      icon: FaShoppingCart,
      color: 'text-green-400'
    },
    {
      id: 2,
      type: 'alert',
      title: 'Shop Status Update',
      message: 'Burger Barn is now offline',
      time: '20 minutes ago',
      read: false,
      icon: FaExclamationTriangle,
      color: 'text-yellow-400'
    },
    {
      id: 3,
      type: 'success',
      title: 'New Vendor Added',
      message: 'Sushi Zen successfully onboarded',
      time: '2 hours ago',
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

  const handleProfileClick = () => {
    navigate(`/tableserve/zone/${zoneId}/profile`);
    setShowProfile(false);
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
            title={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
          >
            {sidebarOpen ? (
              <FaTimes className="w-5 h-5" />
            ) : (
              <FaBars className="w-5 h-5" />
            )}
          </button>

          {/* Zone Info */}
          <div className="flex items-center space-x-3">
            <FaMapMarkerAlt className="text-theme-accent-primary text-xl" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-fredoka text-theme-text-primary">{user?.zoneName || 'Food Zone'}</h1>
              <p className="text-theme-text-tertiary text-xs font-raleway">Zone Administration</p>
            </div>
          </div>

          {/* Search - Hidden on mobile */}
          {!isMobile && (
            <form onSubmit={handleSearch} className="relative ml-4">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary text-sm" />
              <input
                type="text"
                placeholder="Search vendors, shops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-theme rounded-lg pl-10 pr-4 py-2 w-64 text-sm focus:outline-none"
              />
            </form>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
        
          <ThemeToggle variant="icon-only" showLabel={false} />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 text-theme-text-secondary hover:text-theme-text-primary transition-colors p-2 rounded-lg hover:bg-theme-bg-hover"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden">
                {zoneData?.logo ? (
                  <img
                    src={zoneData.logo}
                    alt={zoneData?.name || 'Zone'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-theme-accent-primary rounded-full flex items-center justify-center ${zoneData?.logo ? 'hidden' : 'flex'}`}>
                  <FaUser className="w-4 h-4 text-theme-text-inverse" />
                </div>
              </div>
              <span className="hidden md:inline font-raleway text-sm">{user?.name}</span>
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg z-50"
                >
                  <div className="p-4 border-b border-theme-border-primary">
                    <p className="font-fredoka text-primary">{user?.name}</p>
                    <p className="text-primary text-xs font-raleway">Zone Administrator</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-primary hover:text-accent hover:bg-white/80 rounded-lg transition-colors"
                    >
                      <FaUser className="w-4 h-4" />
                      <span className="font-raleway text-sm">Zone Profile</span>
                    </button>
                    <button
                      onClick={() => navigate(`/tableserve/zone/${zoneId}/settings`)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-primary hover:text-accent hover:bg-theme-bg-hover rounded-lg transition-colors"
                    >
                      <FaCog className="w-4 h-4" />
                      <span className="font-raleway text-sm">Settings</span>
                    </button>
                    <hr className="my-2 border-theme-border-primary" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-theme-bg-hover rounded-lg transition-colors"
                    >
                      <FaSignOutAlt className="w-4 h-4" />
                      <span className="font-raleway text-sm">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showProfile) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowProfile(false);
          }}
        />
      )}
    </motion.nav>
  );
};

export default ZoneAdminNavbar;
