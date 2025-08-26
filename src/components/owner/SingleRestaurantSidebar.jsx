import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FaTachometerAlt,
  FaUser,
  FaUtensils,
  FaQrcode,
  FaShoppingCart,
  FaChartBar,
  FaRupeeSign,
  FaCog,
  FaChevronDown,
  FaChevronRight,
  FaTable,
  FaDollarSign,
  FaFileExport,
  FaComments,
  FaTimes,
  FaStore,
  FaClipboardList,
  FaHistory,
  FaRocket
} from 'react-icons/fa';

const SingleRestaurantSidebar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const location = useLocation();
  const { restaurantId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);

  // Get restaurant profile data from localStorage
  const getRestaurantProfile = () => {
    try {
      // First try the specific profile key
      const profileData = localStorage.getItem(`restaurant_profile_${restaurantId}`);
      if (profileData) {
        return JSON.parse(profileData);
      }

      // Then try the restaurants array
      const restaurants = localStorage.getItem('tableserve_restaurants');
      if (restaurants) {
        const restaurantsList = JSON.parse(restaurants);
        const restaurant = restaurantsList.find(r => r.id == restaurantId);
        return restaurant || null;
      }

      return null;
    } catch (error) {
      console.error('Error loading restaurant profile:', error);
      return null;
    }
  };

  const [restaurantProfile, setRestaurantProfile] = useState(getRestaurantProfile());
  const [expandedSections, setExpandedSections] = useState({
    menu: false,
    orders: false,
    analytics: false,
    qr: false
  });

  // Refresh profile data when component mounts or restaurantId changes
  useEffect(() => {
    const refreshProfile = () => {
      const updatedProfile = getRestaurantProfile();
      setRestaurantProfile(updatedProfile);
    };

    refreshProfile();

    // Listen for profile update events
    const handleProfileUpdate = (event) => {
      if (event.detail.restaurantId === restaurantId) {
        refreshProfile();
      }
    };

    window.addEventListener('restaurantProfileUpdated', handleProfileUpdate);

    // Set up an interval to check for profile updates (as backup)
    const interval = setInterval(refreshProfile, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
      window.removeEventListener('restaurantProfileUpdated', handleProfileUpdate);
    };
  }, [restaurantId]);

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, setSidebarOpen]);

  // Adjust expanded sections based on screen size
  useEffect(() => {
    if (isMobile) {
      setExpandedSections({
        menu: true,
        orders: true,
        analytics: true,
        qr: true
      });
    } else if (!sidebarOpen) {
      setExpandedSections({
        menu: false,
        orders: false,
        analytics: false,
        qr: false
      });
    }
  }, [isMobile, sidebarOpen]);

  const toggleSection = (section) => {
    if (!isMobile && !sidebarOpen) return;

    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const menuSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: FaTachometerAlt,
      path: `/tableserve/restaurant/${restaurantId}/dashboard`,
      single: true
    },
    {
      id: 'profile',
      title: 'Profile Management',
      icon: FaUser,
      path: `/tableserve/restaurant/${restaurantId}/profile`,
      single: true
    },
    {
      id: 'menu',
      title: 'Menu Management',
      icon: FaUtensils,
      items: [
                { path: `/tableserve/restaurant/${restaurantId}/menu/categories`, label: 'Categories', icon: FaClipboardList },
        { path: `/tableserve/restaurant/${restaurantId}/menu/items`, label: 'Menu Items', icon: FaUtensils },
        { path: `/tableserve/restaurant/${restaurantId}/menu/modifiers`, label: 'Modifiers', icon: FaCog }
      ]
    },
    {
      id: 'qr',
      title: 'Tables & QR Codes',
      icon: FaQrcode,
      items: [
        { path: `/tableserve/restaurant/${restaurantId}/qr/generator`, label: 'QR Generator', icon: FaQrcode },
      ]
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: FaShoppingCart,
      items: [
        { path: `/tableserve/restaurant/${restaurantId}/orders/live`, label: 'Live Orders', icon: FaShoppingCart },
        { path: `/tableserve/restaurant/${restaurantId}/orders/history`, label: 'Order History', icon: FaHistory },
        { path: `/tableserve/restaurant/${restaurantId}/orders/feedback`, label: 'Feedback', icon: FaComments }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: FaChartBar,
      items: [
        { path: `/tableserve/restaurant/${restaurantId}/analytics/revenue`, label: 'Revenue Reports', icon: FaRupeeSign },
      ]
    },
    {
      id: 'upgrade',
      title: 'Upgrade Plan',
      icon: FaRocket,
      path: `/tableserve/restaurant/${restaurantId}/upgrade`,
      single: true
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: FaCog,
      path: `/tableserve/restaurant/${restaurantId}/settings`,
      single: true
    }
  ];

  const isSectionActive = (items) => items?.some(item => location.pathname.startsWith(item.path));

  return (
    <motion.aside
      initial={{ x: isMobile ? -250 : 0 }}
      animate={{
        x: isMobile && !sidebarOpen ? -250 : 0,
        width: isMobile ? 256 : sidebarOpen ? 256 : 64
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`fixed left-0 top-0 h-full admin-sidebar backdrop-blur-xl border-r border-accent/20 z-40 ${isMobile
        ? 'shadow-xl'
        : ''
        } ${isMobile && !sidebarOpen ? 'pointer-events-none' : ''
        }`}
      style={{
        width: isMobile ? '16rem' : sidebarOpen ? '16rem' : '4rem',
        paddingTop: 'var(--navbar-height, 6rem)'
      }}
    >
      {/* Logo */}
      <div className={`border-b border-accent/20 ${sidebarOpen ? 'p-4' : 'p-2'} transition-all duration-300`}>
        <div className="flex items-center justify-center lg:justify-start space-x-3">
          <div className={`rounded-lg overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-10 h-10' : 'w-8 h-8'
            }`}>
            {restaurantProfile?.profilePicture ? (
              <img
                src={restaurantProfile.profilePicture}
                alt={restaurantProfile?.restaurantName || user?.restaurantName || 'Restaurant'}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`bg-accent rounded-lg flex items-center justify-center w-full h-full ${restaurantProfile?.profilePicture ? 'hidden' : 'flex'}`}>
              <FaStore className={`text-white transition-all duration-300 ${sidebarOpen ? 'text-lg' : 'text-base'
                }`} />
            </div>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <h1 className="text-sm   font-cinzel font-semibold text-accent whitespace-nowrap">
                  {user?.restaurantName || 'Restaurant'}
                </h1>
                <p className="text-xs text-secondary font-raleway whitespace-nowrap">Owner Dashboard</p>
              </motion.div>
            )}
          </AnimatePresence>

          
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-theme" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
        <div className={`space-y-1 transition-all duration-300 ${sidebarOpen ? 'px-3' : 'px-2'}`}>
          {menuSections.map((section) => (
            <div key={section.id}>
              {section.single ? (
                <NavLink
                  to={section.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg transition-all duration-200 group relative ${sidebarOpen ? 'space-x-3 px-3 py-2' : 'justify-center p-3'
                    } ${isActive
                      ? 'bg-accent text-white  shadow-lg shadow-accent/25'
                      : 'text-secondary hover:text-accent hover:bg-accent/20'
                    }`
                  }
                  title={!sidebarOpen ? section.title : undefined}
                >
                  <section.icon className={`flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'text-lg' : 'text-xl'
                    }`} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="font-raleway text-secondary font-medium whitespace-nowrap"
                      >
                        {section.title}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {!sidebarOpen && !isMobile && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-theme-accent-primary text-theme-text-inverse text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {section.title}
                    </div>
                  )}
                </NavLink>
              ) : (
                <div>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center rounded-lg transition-all duration-200 group relative ${sidebarOpen ? 'justify-between px-3 py-2' : 'justify-center p-3'
                      } ${isSectionActive(section.items)
                        ? 'bg-accent/20 text-accent'
                        : 'text-secondary hover:text-accent hover:bg-accent/20'
                      }`}
                    title={!sidebarOpen ? section.title : undefined}
                  >
                    <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : ''}`}>
                      <section.icon className={`flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'text-lg' : 'text-xl'
                        }`} />
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="font-raleway text-secondary font-medium whitespace-nowrap"
                          >
                            {section.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {expandedSections[section.id] ? (
                            <FaChevronDown className="text-sm transition-transform duration-200" />
                          ) : (
                            <FaChevronRight className="text-sm transition-transform duration-200" />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!sidebarOpen && !isMobile && (
                      <div className="absolute text-secondary left-full ml-2 px-2 py-1 bg-black/90  text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {section.title}
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections[section.id] && sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="ml-6 mt-2 space-y-1 overflow-hidden"
                      >
                        {section.items.map((item, index) => (
                          <motion.div
                            key={item.path}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.2 }}
                          >
                            <NavLink
                              to={item.path}
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm group relative ${isActive
                                  ? 'bg-accent text-white shadow-lg shadow-accent/25'
                                  : 'text-secondary hover:text-accent hover:bg-accent/20'
                                }`
                              }
                            >
                              <item.icon className="text-sm flex-shrink-0" />
                              <span className="font-raleway whitespace-nowrap">{item.label}</span>
                            </NavLink>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>
    </motion.aside>
  );
};

export default SingleRestaurantSidebar;
