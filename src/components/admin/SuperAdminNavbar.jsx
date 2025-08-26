import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaSearch,
  FaGlobe,
  FaCog,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle
} from 'react-icons/fa';
import { logout, logoutUser } from '../../store/slices/uiSlice';
import ThemeToggle from '../common/ThemeToggle';
import { selectTheme } from '../../store/slices/uiSlice';

const SuperAdminNavbar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.ui.auth);
  const currentTheme = useSelector(selectTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemStatus, setSystemStatus] = useState('operational');

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Payment Failed',
      message: 'Bella Vista restaurant payment failed',
      time: '5 min ago',
      unread: true
    },
    {
      id: 2,
      type: 'success',
      title: 'New Restaurant',
      message: 'Golden Spoon successfully onboarded',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 3,
      type: 'info',
      title: 'System Update',
      message: 'Platform maintenance scheduled for tonight',
      time: '2 hours ago',
      unread: false
    },
    {
      id: 4,
      type: 'error',
      title: 'Service Alert',
      message: 'QR generation service experiencing delays',
      time: '3 hours ago',
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/tableserve/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: use synchronous logout if async fails
      dispatch(logout());
      navigate('/tableserve/login');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement global search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return <FaExclamationTriangle className="text-yellow-400" />;
      case 'success': return <FaCheckCircle className="text-green-400" />;
      case 'error': return <FaExclamationTriangle className="text-red-400" />;
      default: return <FaInfoCircle className="text-blue-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'text-green-400';
      case 'maintenance': return 'text-yellow-400';
      case 'issues': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  useEffect(() => {
    // Simulate system status check
    const checkSystemStatus = () => {
      // This would be replaced with actual system health checks
      setSystemStatus('operational');
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.nav
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 admin-navbar z-50"
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

          

         
        </div>

        {/* Center Section - System Status */}
        <div className="flex items-center ml-8 sm:ml-12 md:ml-20 lg:ml-40 space-x-2">
          
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <h1 className="text-2xl font-cinzel font-semibold text-theme-accent-primary whitespace-nowrap">TableServe</h1>
                <p className="text-sm text-secondary font-raleway ml-8 whitespace-nowrap">Super Admin</p>
              </motion.div>
           
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle variant="icon-only" showLabel={false} />
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 sm:space-x-3 text-theme-text-primary hover:text-theme-accent-primary transition-colors p-2 rounded-lg hover:bg-theme-bg-hover"
            >
              {!isMobile && (
                <div className="text-right">
                  <p className="font-raleway text-sm font-medium">{user?.name || 'Super Admin'}</p>
                  <p className="text-theme-text-tertiary text-xs font-raleway">{user?.role}</p>
                </div>
              )}
              <div className="w-8 h-8 bg-theme-accent-primary rounded-full flex items-center justify-center">
                <FaShieldAlt className="w-4 h-4 text-theme-text-inverse" />
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-64 dropdown-theme rounded-xl z-50"
                >
                  <div className="p-4 border-b border-theme-border-primary">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-theme-accent-primary rounded-full flex items-center justify-center">
                        <FaShieldAlt className="w-6 h-6 text-theme-text-inverse" />
                      </div>
                      <div>
                        <h3 className="text-theme-text-primary font-raleway font-medium">{user?.name}</h3>
                        <p className="text-theme-text-tertiary text-sm font-raleway">Super Administrator</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigate('/tableserve/admin/profile');
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
                    >
                      <FaUser className="w-4 h-4" />
                      <span className="font-raleway">Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/tableserve/admin/settings');
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
                    >
                      <FaCog className="w-4 h-4" />
                      <span className="font-raleway">Admin Settings</span>
                    </button>
                    <hr className="border-theme-border-primary my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-status-error hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <FaSignOutAlt className="w-4 h-4" />
                      <span className="font-raleway">Sign Out</span>
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

export default SuperAdminNavbar;