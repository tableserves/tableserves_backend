import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { logout, logoutUser } from '../../../store/slices/uiSlice';
import ThemeToggle from '../../../components/common/ThemeToggle';
import logo from '../../../assets/logo.svg';

const SuperAdminNavbar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.ui.auth);
  
  // UI State
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
      dispatch(logout()); // Fallback synchronous logout
    } finally {
      navigate('/login', { replace: true }); 
    }
  };

  return (
    <motion.nav
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 admin-navbar z-50 bg-theme-bg/80 backdrop-blur-md border-b border-theme-border-primary"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 h-[var(--navbar-height,4rem)]">
        
        {/* Left Section - Hamburger */}
        <div className="flex-1 flex items-center justify-start">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-theme-text-primary hover:text-theme-accent-primary transition-colors p-2 rounded-lg hover:bg-theme-bg-hover focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50"
            aria-label="Toggle Sidebar"
          >
            <FaBars className="w-5 h-5" />
          </button>
        </div>

        {/* Center Section - Brand */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2"
          >
            <img src={logo} alt='TableServes Logo' className='h-8 w-8 sm:h-10 sm:w-10' />
            <h1 className="text-lg sm:text-xl font-cinzel font-semibold text-theme-accent-primary hidden sm:block">
              TableServes
            </h1>
          </motion.div>
        </div>

        {/* Right Section - Actions & Profile */}
        <div className="flex-1 flex items-center justify-end space-x-2 sm:space-x-4">
          <ThemeToggle variant="icon-only" showLabel={false} />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 sm:space-x-3 text-theme-text-primary hover:text-theme-accent-primary transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-theme-bg-hover"
            >
              {!isMobile && (
                <div className="text-right hidden md:block">
                  <p className="font-raleway text-sm font-medium leading-none">{user?.name || 'Super Admin'}</p>
                  <p className="text-theme-text-tertiary text-xs font-raleway mt-1">{user?.role || 'Admin'}</p>
                </div>
              )}
              {/* Profile Avatar using Logo */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-theme-bg-secondary overflow-hidden border border-theme-border-primary/50">
                <img src={logo} alt="Profile" className="w-5 h-5 object-contain" />
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-56 dropdown-theme rounded-xl z-50 shadow-xl border border-theme-border-primary overflow-hidden"
                >
                  <div className="p-4 border-b border-theme-border-primary bg-theme-bg-secondary">
                    <div className="flex items-center space-x-3">
                      {/* Dropdown Header Avatar using Logo */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-theme-bg overflow-hidden border border-theme-border-primary/50">
                        <img src={logo} alt="Profile" className="w-6 h-6 object-contain" />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-theme-text-primary font-raleway font-medium truncate">{user?.name || 'Admin'}</h3>
                        <p className="text-theme-text-tertiary text-xs font-raleway truncate">{user?.email || 'System Administrator'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 bg-theme-bg">
                    <button
                      onClick={() => {
                        navigate('/admin/profile');
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
                    >
                      <FaUser className="w-4 h-4" />
                      <span className="font-raleway text-sm">Profile Settings</span>
                    </button>
                    
                    <div className="h-px bg-theme-border-primary my-1 mx-2" />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <FaSignOutAlt className="w-4 h-4" />
                      <span className="font-raleway text-sm font-medium">Sign Out</span>
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