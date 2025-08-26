import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt,
  FaUsers,
  FaStore,
  FaShoppingCart,
  FaChartBar,
  FaHeadset,
  FaCog,
  FaChevronDown,
  FaChevronRight,
  FaBuilding,
  FaMapMarkerAlt,
  FaClipboardList,
  FaDollarSign,
  FaTable,
  FaFileExport,
  FaTimes,
  FaCrown
} from 'react-icons/fa';
import { selectTheme } from '../../store/slices/uiSlice';

const SuperAdminSidebar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const location = useLocation();
  const currentTheme = useSelector(selectTheme);
  const [expandedSections, setExpandedSections] = useState({
    accounts: true,
    orders: false,
    analytics: false,
    support: false
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
        accounts: true,
        menus: true,
        orders: true,
        analytics: true,
        qr: true,
        support: true
      });
    } else if (!sidebarOpen) {
      // On desktop collapsed mode, collapse all sections
      setExpandedSections({
        accounts: false,
        menus: false,
        orders: false,
        analytics: false,
        qr: false,
        support: false
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
      path: '/tableserve/admin/dashboard',
      single: true
    },
    {
      id: 'accounts',
      title: 'Account Management',
      icon: FaUsers,
      items: [
        { path: '/tableserve/admin/accounts/restaurants', label: 'Restaurant Management', icon: FaStore },
        { path: '/tableserve/admin/accounts/restaurant-premium', label: 'Premium Restaurant Management', icon: FaCrown },
        { path: '/tableserve/admin/accounts/zones', label: 'Zone Management', icon: FaMapMarkerAlt },
        { path: '/tableserve/admin/accounts/zone-advanced', label: 'Premium Zone Management', icon: FaBuilding }
      ]
    },
   


    {
      id: 'orders',
      title: 'Orders & Monitoring',
      icon: FaShoppingCart,
      items: [
        { path: '/tableserve/admin/orders/live', label: 'Live Orders', icon: FaShoppingCart },
        { path: '/tableserve/admin/orders/history', label: 'Order History', icon: FaClipboardList },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Revenue',
      icon: FaChartBar,
      items: [
        { path: '/tableserve/admin/analytics/overview', label: 'Overview', icon: FaChartBar },
        { path: '/tableserve/admin/analytics/reports', label: 'Reports', icon: FaFileExport }
      ]
    },

    {
      id: 'settings',
      title: 'Settings',
      icon: FaCog,
      path: '/tableserve/admin/settings',
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
      {/* Logo */}
     

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-0 scrollbar-theme">
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

                  {/* Tooltip for collapsed state */}
                  {!sidebarOpen && !isMobile && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
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

                    {/* Chevron for expanded state */}
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

                    {/* Tooltip for collapsed state */}
                    {!sidebarOpen && !isMobile && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-theme-bg-card text-theme-text-primary text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-theme-border-primary">
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
                                  ? 'sidebar-item active'
                                  : 'sidebar-item text-theme-text-tertiary'
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

      {/* Footer - Only show when sidebar is open */}
      {sidebarOpen && (
        <div className="border-t border-theme-border-accent p-3">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-xs text-theme-text-tertiary font-raleway">
                TableServe v2.0
              </p>
              <p className="text-xs text-theme-text-tertiary font-raleway">
                Super Admin Panel
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </motion.aside>
  );
};

export default SuperAdminSidebar;
