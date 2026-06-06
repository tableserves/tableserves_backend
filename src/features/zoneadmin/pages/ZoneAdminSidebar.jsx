import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt,
  FaUsers,
  FaQrcode,
  FaCog,
  FaStore,
  FaUtensils,
  FaChartBar,
  FaKey,
  FaCrown,
  FaComments,
  FaChevronDown
} from 'react-icons/fa';

const ZoneAdminSidebar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const location = useLocation();
  const { zoneId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  
  const [expandedSections, setExpandedSections] = useState({
    shops: false,
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
      setExpandedSections({ shops: true, menu: true, analytics: true, qr: true });
    } else if (!sidebarOpen) {
      setExpandedSections({ shops: false, menu: false, analytics: false, qr: false });
    }
  }, [isMobile, sidebarOpen]);

  const toggleSection = (sectionId) => {
    // UX FIX: If sidebar is collapsed on desktop and user clicks a folder, open the sidebar AND the folder
    if (!isMobile && !sidebarOpen) {
      setSidebarOpen(true);
      setExpandedSections((prev) => ({ ...prev, [sectionId]: true }));
      return;
    }

    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
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
      path: `/zone/${zoneId}/dashboard`,
      single: true
    },
    {
      id: 'shops',
      title: 'Manage Zoneshop',
      icon: FaStore,
      items: [
        { path: `/zone/${zoneId}/vendors/list`, label: 'All Vendors', icon: FaUsers },
        { path: `/zone/${zoneId}/vendors/credentials`, label: 'Vendor Credentials', icon: FaKey }
      ]
    },
    {
      id: 'qr',
      title: 'Tables & QR Management',
      icon: FaQrcode,
      path: `/zone/${zoneId}/qr/generator`,
      single: true
    },
    {
      id: 'reviews',
      title: 'Zone Reviews',
      icon: FaComments,
      path: `/zone/${zoneId}/reviews`,
      single: true
    },
    {
      id: 'analytics',
      title: 'Revenue Analytics',
      icon: FaChartBar,
      path: `/zone/${zoneId}/analytics/revenue`,
      single: true
    },
    {
      id: 'settings',
      title: 'Zone Settings',
      icon: FaCog,
      path: `/zone/${zoneId}/settings`,
      single: true
    },
    {
      id: 'upgrade',
      title: 'Upgrade Plan',
      icon: FaCrown,
      path: `/zone/${zoneId}/upgrade`,
      single: true
    },
  ];

  const isSectionActive = (items) => items?.some((item) => location.pathname.startsWith(item.path));

  return (
    <motion.aside
      initial={false}
      animate={{
        // UX FIX: Use strict percentages for mobile translation to prevent visual artifacts
        x: isMobile && !sidebarOpen ? '-100%' : '0%',
        width: sidebarOpen || isMobile ? 256 : 80 // 80px allows icons to breathe in collapsed mode
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed left-0 top-0 h-full bg-theme-bg-secondary border-r border-theme-border-primary z-40 flex flex-col ${
        isMobile ? 'shadow-2xl' : ''
      }`}
      style={{ paddingTop: 'var(--navbar-height, 5rem)' }} // Ensure this matches your ZoneAdminLayout navbar height
    >
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* Navigation Menu - Flexbox ensures it scrolls perfectly without magic math */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-theme-border-primary py-4">
          <div className="space-y-1 px-3">
            {menuSections.map((section) => (
              <div key={section.id} className="relative group/tooltip">
                {section.single ? (
                  <NavLink
                    to={section.path}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl transition-all duration-200 cursor-pointer ${
                        sidebarOpen ? 'px-4 py-3 space-x-4' : 'justify-center p-3 mx-auto w-12 h-12'
                      } ${
                        isActive
                          ? 'bg-theme-accent-primary/10 text-theme-accent-primary font-bold'
                          : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                      }`
                    }
                  >
                    <section.icon className={`flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'text-lg' : 'text-xl'}`} />
                    
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="font-raleway whitespace-nowrap overflow-hidden"
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
                      className={`w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer ${
                        sidebarOpen ? 'px-4 py-3 justify-between' : 'justify-center p-3 mx-auto w-12 h-12'
                      } ${
                        isSectionActive(section.items)
                          ? 'bg-theme-accent-primary/10 text-theme-accent-primary font-bold'
                          : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <section.icon className={`flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'text-lg' : 'text-xl'}`} />
                        <AnimatePresence>
                          {sidebarOpen && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="font-raleway whitespace-nowrap overflow-hidden"
                            >
                              {section.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {sidebarOpen && (
                        <motion.div
                          animate={{ rotate: expandedSections[section.id] ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FaChevronDown className="text-xs opacity-70" />
                        </motion.div>
                      )}
                    </button>

                    {/* Submenu Dropdown */}
                    <AnimatePresence>
                      {expandedSections[section.id] && sidebarOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pl-11 pr-2 py-2 space-y-1">
                            {section.items.map((item) => (
                              <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                                    isActive
                                      ? 'bg-theme-accent-primary/10 text-theme-accent-primary font-bold'
                                      : 'text-theme-text-tertiary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                                  }`
                                }
                              >
                                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-raleway whitespace-nowrap">{item.label}</span>
                              </NavLink>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* UX FIX: Clean tooltip implementation for collapsed mode */}
                {!sidebarOpen && !isMobile && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-raleway font-semibold rounded-md opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-lg pointer-events-none">
                    {section.title}
                    {/* Tooltip triangle indicator */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-gray-900"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
        
      </div>
    </motion.aside>
  );
};

export default ZoneAdminSidebar;