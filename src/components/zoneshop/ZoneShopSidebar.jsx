import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt,
  FaUser,
  FaUtensils,
  FaList,
  FaCog,
  FaShoppingCart,
  FaHistory,
  FaChartBar,
  FaTimes,
  FaStore,
  FaClipboardList,
  FaBoxes
} from 'react-icons/fa';

const ZoneShopSidebar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.ui.auth);
  const { zoneId, shopId } = useParams();
  const [expandedSections, setExpandedSections] = useState({
    menu: true,
    orders: true,
    analytics: false
  });

  // Use zoneId from URL params or from user object if not in URL
  const effectiveZoneId = zoneId || user?.zoneId;

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, setSidebarOpen]);

  // Adjust expanded sections based on screen size
  useEffect(() => {
    if (isMobile) {
      // On mobile, keep sections expanded for better UX
      setExpandedSections({
        menu: true,
        orders: true,
        analytics: true
      });
    } else if (!sidebarOpen) {
      // On desktop collapsed mode, collapse all sections
      setExpandedSections({
        menu: false,
        orders: false,
        analytics: false
      });
    }
  }, [isMobile, sidebarOpen]);

  const toggleSection = (section) => {
    // Don't allow toggling in collapsed desktop mode
    if (!isMobile && !sidebarOpen) return;

    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Always use the zoneId in the URL
  const getPath = (path) => {
    // If we don't have a zoneId from URL or user, use a placeholder that will be replaced later
    const zoneIdToUse = effectiveZoneId || user?.zoneId || 'unknown';
    return `/tableserve/zone/${zoneIdToUse}/shop/${shopId}${path}`;
  };

  const menuSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: FaTachometerAlt,
      path: getPath('/dashboard'),
      single: true
    },
    {
      id: 'profile',
      title: 'Shop Profile',
      icon: FaUser,
      path: getPath('/profile'),
      single: true
    },
    {
      id: 'menu',
      title: 'Menu Management',
      icon: FaUtensils,
      items: [
        { path: getPath('/menu/categories'), label: 'Categories', icon: FaList },
        { path: getPath('/menu/items'), label: 'Menu Items', icon: FaUtensils },
        { path: getPath('/menu/modifiers'), label: 'Modifiers', icon: FaCog }
      ]
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: FaShoppingCart,
      items: [
        { path: getPath('/orders/live'), label: 'Live Orders', icon: FaShoppingCart },
        { path: getPath('/orders/history'), label: 'Order History', icon: FaHistory },
        { path: getPath('/orders/reports'), label: 'Order Reports', icon: FaClipboardList }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: FaChartBar,
      items: [
        { path: getPath('/analytics/revenue'), label: 'Revenue Analytics', icon: FaChartBar },
        { path: getPath('/reports/transactions'), label: 'Transaction Reports', icon: FaClipboardList }
      ]
    }
  ];

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: sidebarOpen ? 0 : (isMobile ? -300 : -250) }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed top-6 left-0 h-full z-30 admin-sidebar ${sidebarOpen ? 'w-64' : 'w-16'
        } transition-all duration-300`}
    >
      <div className="flex flex-col  mt-10 h-full">
        {/* Header */}


        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 pt-6">
          {menuSections.map((section) => (
            <div key={section.id}>
              {section.single ? (
                <NavLink
                  to={section.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive
                      ? 'bg-theme-accent-primary text-theme-text-inverse'
                      : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover'
                    }`
                  }
                >
                  <section.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="font-raleway text-sm">{section.title}</span>
                  )}
                </NavLink>
              ) : (
                <div>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <section.icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <span className="font-raleway text-sm">{section.title}</span>
                      )}
                    </div>
                    {sidebarOpen && (
                      <motion.div
                        animate={{ rotate: expandedSections[section.id] ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs"
                      >
                        ▶
                      </motion.div>
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections[section.id] && sidebarOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-8 mt-1 space-y-1 overflow-hidden"
                      >
                        {section.items.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${isActive
                                ? 'bg-theme-accent-primary/20 text-theme-accent-primary border-l-2 border-theme-accent-primary'
                                : 'text-theme-text-tertiary hover:text-theme-text-primary hover:bg-theme-bg-hover'
                              }`
                            }
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="font-raleway">{item.label}</span>
                          </NavLink>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </motion.aside>
  );
};

export default ZoneShopSidebar;
