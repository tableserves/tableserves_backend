import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt,
  FaUsers,
  FaQrcode,
  FaList,
  FaCog,
  FaStore,
  FaUtensils,
  FaChartBar,
  FaTimes,
  FaKey,
  FaCrown
} from 'react-icons/fa';

const ZoneAdminSidebar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.ui.auth);
  const { zoneId } = useParams();
  const [expandedSections, setExpandedSections] = useState({
    shops: true,
    menu: false,
    analytics: false,
    qr: false
  });

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
        shops: true,
        menu: true,
        analytics: true,
        qr: true
      });
    } else if (!sidebarOpen) {
      // On desktop collapsed mode, collapse all sections
      setExpandedSections({
        shops: false,
        menu: false,
        analytics: false,
        qr: false
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

  const menuSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: FaTachometerAlt,
      path: `/tableserve/zone/${zoneId}/dashboard`,
      single: true
    },
    {
      id: 'upgrade',
      title: 'Upgrade Plan',
      icon: FaCrown,
      path: `/tableserve/zone/${zoneId}/upgrade`,
      single: true
    },
    {
      id: 'shops',
      title: 'Manage Zoneshop',
      icon: FaStore,
      items: [
        { path: `/tableserve/zone/${zoneId}/vendors/list`, label: 'All Vendors', icon: FaUsers },
        { path: `/tableserve/zone/${zoneId}/vendors/credentials`, label: 'Vendor Credentials', icon: FaKey }
      ]
    },
    {
      id: 'menu',
      title: 'Menu Management',
      icon: FaUtensils,
      items: [
        { path: `/tableserve/zone/${zoneId}/menu/categories`, label: 'Menu Categories', icon: FaList },
        { path: `/tableserve/zone/${zoneId}/menu/items`, label: 'Menu Items', icon: FaUtensils },
        { path: `/tableserve/zone/${zoneId}/menu/modifiers`, label: 'Menu Modifiers', icon: FaCog },
        { path: `/tableserve/zone/${zoneId}/menu/merged`, label: 'Merged Zone Menu', icon: FaUtensils }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: FaChartBar,
      items: [
        { path: `/tableserve/zone/${zoneId}/analytics/revenue`, label: 'Revenue Analytics', icon: FaChartBar },
      ]
    },
    {
      id: 'qr',
      title: 'QR Management',
      icon: FaQrcode,
      items: [
        { path: `/tableserve/zone/${zoneId}/qr/generator`, label: 'QR Generator', icon: FaQrcode }
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Account',
      icon: FaCog,
      items: [
        { path: `/tableserve/zone/${zoneId}/settings`, label: 'Zone Settings', icon: FaCog },
        { path: `/tableserve/zone/${zoneId}/requests/upgrade`, label: 'Upgrade Requests', icon: FaUsers }
      ]
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
      className={`fixed left-0 top-0 h-full admin-sidebar z-40 ${isMobile
        ? 'shadow-2xl'
        : ''
        } ${isMobile && !sidebarOpen ? 'pointer-events-none' : ''
        }`}
      style={{
        width: isMobile ? '16rem' : sidebarOpen ? '16rem' : '4rem',
        paddingTop: 'var(--navbar-height, 6rem)' // Match navbar height
      }}
    >
      <div className="flex flex-col h-full">
        {/* Logo/Brand Section */}


        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto  scrollbar-theme" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
          <div className={`space-y-1 transition-all duration-300 ${sidebarOpen ? 'px-3' : 'px-2'}`}>
            {menuSections.map((section) => (
              <div key={section.id}>
                {section.single ? (
                  <NavLink
                    to={section.path}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `sidebar-item flex items-center rounded-lg transition-all duration-200 group relative ${sidebarOpen ? 'space-x-3 px-3 py-2' : 'justify-center p-3'
                      } ${isActive
                        ? 'sidebar-item active'
                        : 'sidebar-item'
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
                          className="font-raleway font-medium whitespace-nowrap"
                        >
                          {section.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                ) : (
                  <div>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center rounded-lg transition-all duration-200 group relative ${sidebarOpen ? 'justify-between px-3 py-2' : 'justify-center p-3'
                        } ${isSectionActive(section.items)
                          ? 'sidebar-item active'
                          : 'sidebar-item'
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
                              className="font-raleway font-medium whitespace-nowrap"
                            >
                              {section.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.div
                            initial={{ opacity: 0, rotate: 0 }}
                            animate={{
                              opacity: 1,
                              rotate: expandedSections[section.id] ? 180 : 0
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-auto"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                                    ? 'sidebar-item active'
                                    : 'sidebar-item text-theme-text-tertiary'
                                  }`
                                }
                              >
                                <item.icon className="w-4 h-4 flex-shrink-0" />
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

        {/* Footer */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="p-4 border-t border-theme-border-primary"
            >
              <div className="text-center">
                <p className="text-theme-text-tertiary text-xs font-raleway">
                  Zone ID: {zoneId}
                </p>
                <p className="text-theme-text-tertiary text-xs font-raleway mt-1">
                  Zone Admin Panel
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};

export default ZoneAdminSidebar;
