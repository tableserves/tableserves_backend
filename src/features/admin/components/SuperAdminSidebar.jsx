import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt,
  FaUsers,
  FaStore,
  FaShoppingCart,
  FaChartBar,
  FaChevronDown,
  FaBuilding,
  FaMapMarkerAlt,
  FaClipboardList,
  FaCrown,
  FaComments,
  FaCreditCard
} from 'react-icons/fa';

const menuSections = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: FaTachometerAlt,
    path: '/admin/dashboard',
    single: true
  },
  {
    id: 'accounts',
    title: 'Account Management',
    icon: FaUsers,
    items: [
      { path: '/admin/accounts/restaurants', label: 'Restaurant Management', icon: FaStore },
      { path: '/admin/accounts/restaurant-premium', label: 'Premium Restaurant Management', icon: FaCrown },
      { path: '/admin/accounts/zones', label: 'Zone Management', icon: FaMapMarkerAlt },
      { path: '/admin/accounts/zone-advanced', label: 'Premium Zone Management', icon: FaBuilding }
    ]
  },
  {
    id: 'orders',
    title: 'Orders & Monitoring',
    icon: FaShoppingCart,
    items: [
      { path: '/admin/orders/live', label: 'Live Orders', icon: FaShoppingCart },
      { path: '/admin/orders/history', label: 'Order History', icon: FaClipboardList }
    ]
  },
  {
    id: 'analytics',
    title: 'Reports & Analytics',
    icon: FaChartBar,
    path: '/admin/analytics/reports',
    single: true
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    icon: FaCreditCard,
    path: '/admin/billing',
    single: true
  },
  {
    id: 'feedback',
    title: 'Customer Feedback',
    icon: FaComments,
    path: '/admin/feedback/reviews',
    single: true
  }
];

const SuperAdminSidebar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const location = useLocation();
  
  const [expandedSections, setExpandedSections] = useState(() => {
    const initialState = {};
    menuSections.forEach(section => {
      if (!section.single) initialState[section.id] = false;
    });
    return initialState;
  });

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, setSidebarOpen]);

  useEffect(() => {
    setExpandedSections(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = isMobile ? true : sidebarOpen ? prev[key] : false;
      });
      return newState;
    });
  }, [isMobile, sidebarOpen]);

  const toggleSection = useCallback((sectionId) => {
    if (!isMobile && !sidebarOpen) return;
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, [isMobile, sidebarOpen]);

  const handleNavClick = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, setSidebarOpen]);

  const isSectionActive = useCallback((items) => {
    return items?.some(item => location.pathname.startsWith(item.path));
  }, [location.pathname]);

  return (
    <motion.aside
      initial={false}
      animate={{
        x: isMobile && !sidebarOpen ? -288 : 0,
        width: isMobile ? 288 : sidebarOpen ? 288 : 72 // Increased width from 256 to 288px
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed left-0 top-0 h-full admin-sidebar z-40 flex flex-col bg-theme-bg border-r border-theme-border-primary overflow-hidden ${
        isMobile ? 'shadow-2xl' : ''
      } ${isMobile && !sidebarOpen ? 'pointer-events-none' : ''}`}
      style={{
        paddingTop: 'var(--navbar-height, 4rem)'
      }}
    >
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-theme overflow-x-hidden">
        <div className="space-y-1.5 px-3 transition-all duration-300">
          {menuSections.map((section) => (
            <div key={section.id} className="relative group/nav">
              {section.single ? (
                <NavLink
                  to={section.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `sidebar-item flex items-center rounded-lg transition-all duration-200 ${
                      sidebarOpen ? 'px-3 py-2.5' : 'justify-center p-3'
                    } ${
                      isActive
                        ? 'bg-theme-accent-primary/10 text-theme-accent-primary font-medium'
                        : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                    }`
                  }
                >
                  <section.icon className={`flex-shrink-0 ${sidebarOpen ? 'text-lg' : 'text-xl'}`} />
                  
                  <AnimatePresence mode="wait">
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-raleway ml-3 flex-1 text-left truncate"
                      >
                        {section.title}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {!sidebarOpen && !isMobile && (
                    <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary text-sm font-raleway font-medium rounded-lg opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {section.title}
                    </div>
                  )}
                </NavLink>
              ) : (
                <div>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center rounded-lg transition-all duration-200 ${
                      sidebarOpen ? 'px-3 py-2.5' : 'justify-center p-3'
                    } ${
                      isSectionActive(section.items)
                        ? 'bg-theme-accent-primary/5 text-theme-accent-primary font-medium'
                        : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                    }`}
                  >
                    <section.icon className={`flex-shrink-0 ${sidebarOpen ? 'text-lg' : 'text-xl'}`} />
                    
                    <AnimatePresence mode="wait">
                      {sidebarOpen && (
                        <>
                          {/* Flex-1 ensures text takes up remaining space but cuts off properly if too long */}
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="font-raleway ml-3 flex-1 text-left truncate"
                          >
                            {section.title}
                          </motion.span>
                          
                          {/* Flex-shrink-0 ensures the arrow is never squeezed out of the button */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-shrink-0 ml-2 pl-1"
                          >
                            <FaChevronDown 
                              className={`text-xs transition-transform duration-300 ${
                                expandedSections[section.id] ? 'rotate-180' : 'rotate-0'
                              }`} 
                            />
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {!sidebarOpen && !isMobile && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary text-sm font-raleway font-medium rounded-lg opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
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
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="ml-9 mt-1 space-y-1 pb-1">
                          {section.items.map((item) => (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                `flex items-start space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm group ${
                                  isActive
                                    ? 'bg-theme-accent-primary/10 text-theme-accent-primary font-medium'
                                    : 'text-theme-text-tertiary hover:text-theme-text-primary hover:bg-theme-bg-hover'
                                }`
                              }
                            >
                              <item.icon className="text-xs flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity mt-1" />
                              {/* Changed to whitespace-normal so long text wraps beautifully instead of hiding */}
                              <span className="font-raleway whitespace-normal leading-snug">{item.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="border-t border-theme-border-primary p-4 bg-theme-bg-secondary mt-auto"
          >
            <div className="text-center">
              <p className="text-xs font-semibold text-theme-text-secondary tracking-wider font-raleway uppercase">
                Tableserves
              </p>
              <p className="text-[10px] text-theme-text-tertiary font-raleway mt-0.5">
                Super Admin System
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};

export default SuperAdminSidebar;