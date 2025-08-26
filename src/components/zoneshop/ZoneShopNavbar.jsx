import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaStore,
  FaMapMarkerAlt,
  FaClock
} from 'react-icons/fa';
import { logout } from '../../store/slices/uiSlice';
import ThemeToggle from '../common/ThemeToggle';
import { selectTheme } from '../../store/slices/uiSlice';

const ZoneShopNavbar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { zoneId, shopId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  const currentTheme = useSelector(selectTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Use zoneId from URL params or from user object if not in URL
  const effectiveZoneId = zoneId || user?.zoneId;

  const handleLogout = () => {
    // First dispatch logout action to clear auth state
    dispatch(logout());

    // Force a hard redirect to the login page to avoid any React Router issues
    window.location.href = '/tableserve/login';
  };

  const handleProfileClick = () => {
    // Always use the zoneId in the URL
    const zoneIdToUse = effectiveZoneId || user?.zoneId || 'unknown';
    navigate(`/tableserve/zone/${zoneIdToUse}/shop/${shopId}/profile`);
    setShowProfile(false);
  };

  const handleSettingsClick = () => {
    // Always use the zoneId in the URL
    const zoneIdToUse = effectiveZoneId || user?.zoneId || 'unknown';
    navigate(`/tableserve/zone/${zoneIdToUse}/shop/${shopId}/settings`);
    setShowProfile(false);
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 right-0 left-0 admin-navbar  z-50"
      style={{ zIndex: 50 }}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 py-3">
        {/* Left Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-theme-text-primary hover:text-theme-accent-primary transition-colors p-2 rounded-lg hover:bg-theme-bg-hover"
            title={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
          >
            {sidebarOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-3">
            <FaStore className="text-theme-accent-primary text-xl sm:text-2xl" />
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-fredoka text-theme-text-primary">
                {user?.shopName || 'Zone Shop'}
              </h1>
              <div className="flex items-center space-x-2 text-xs text-theme-text-tertiary">
                <FaMapMarkerAlt className="w-3 h-3" />
                <span className="font-raleway">
                  {effectiveZoneId ? `Zone ${effectiveZoneId}` : 'Zone'}
                </span>
                <span>•</span>
                <FaClock className="w-3 h-3" />
                <span>Open</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle variant="icon-only" showLabel={false} />

          {/* Notifications */}

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 text-theme-text-secondary hover:text-theme-text-primary p-2 rounded-lg hover:bg-theme-bg-hover transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <div className={`w-full h-full bg-theme-accent-primary rounded-full flex items-center justify-center`}>
                  <FaUser className="w-4 h-4 text-theme-text-inverse" />
                </div>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-secondary font-raleway text-sm">{user?.name}</p>
                <p className="text-theme-text-tertiary text-xs font-raleway">
                  {user?.role === 'zone_vendor' ? 'Vendor' : 'Shop Owner'}
                </p>
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-theme-bg-primary rounded-xl shadow-xl border-2 border-theme-border-primary"
                  style={{
                    zIndex: 99999,
                    position: 'fixed',
                    top: '4rem',
                    right: '1rem'
                  }}
                >
                  <div className="p-4 border-b border-theme-border-primary">
                    <p className="text-theme-text-primary font-fredoka text-sm">{user?.name}</p>
                    <p className="text-theme-text-tertiary font-raleway text-xs">{user?.shopName}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
                    >
                      <FaUser className="w-4 h-4" />
                      <span className="font-raleway text-sm">Shop Profile</span>
                    </button>
                    <button
                      onClick={handleSettingsClick}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
                    >
                      <FaCog className="w-4 h-4" />
                      <span className="font-raleway text-sm">Settings</span>
                    </button>
                  </div>
                  <div className="p-2 border-t border-theme-border-primary">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-status-error hover:text-status-error hover:bg-status-error-light rounded-lg transition-colors"
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



      {/* Click outside handlers */}
      {(showNotifications || showProfile) && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => {
            setShowNotifications(false);
            setShowProfile(false);
          }}
        />
      )}
    </motion.nav>
  );
};

export default ZoneShopNavbar;