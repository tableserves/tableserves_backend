import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminNavbar from './SuperAdminNavbar';
import { logActivity } from '../../../store/slices/activitySlice';
import { initializeTheme } from '../../../store/slices/uiSlice'; // Removed unused selectTheme

const SuperAdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation(); // Required for Framer Motion route transitions

  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  // Initialize theme
  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  // Handle Authentication and Logging
  useEffect(() => {
    // Navigate away if not authenticated or not an admin
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login', { replace: true }); // Use replace to prevent back-button loops
      return;
    }

    // Only log activity and disable loading ONCE upon initial valid authentication
    if (loading) {
      dispatch(logActivity({
        action: 'ADMIN_ACCESS',
        details: `Super Admin ${user.name} accessed the panel`,
        timestamp: new Date().toISOString()
      }));
      setLoading(false);
    }
  }, [isAuthenticated, user, navigate, dispatch, loading]);

  // Handle Responsive Layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Automatically manage sidebar state based on screen size
      setSidebarOpen(!mobile); 
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center flex flex-col items-center"
        >
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-theme-text-primary font-raleway font-medium tracking-wide">
            Loading Super Admin Panel...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen admin-layout theme-transition relative bg-theme-bg"
      style={{ '--navbar-height': '6rem' }}
    >
      {/* Mobile Overlay with Animation */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Component */}
      <SuperAdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div 
        className={`transition-all duration-300 ease-in-out flex flex-col min-h-screen ${
          isMobile ? 'ml-0' : sidebarOpen ? 'ml-[288px]' : 'ml-[72px]'
        }`}
      >
        {/* Top Navbar */}
        <SuperAdminNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />

        {/* Page Content */}
        <main
          className="flex-grow p-4 sm:p-6 lg:p-8"
          style={{
            paddingTop: 'calc(var(--navbar-height, 6rem) + 1.5rem)'
          }}
        >
          {/* mode="wait" ensures the old page exits before the new one enters */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname} // Dynamic key forces animation on route change
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              {children || <Outlet />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Background Pattern - Pushed to back with -z-10 */}
      <div className="fixed inset-0 pointer-events-none opacity-5 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,0,0.1),transparent_50%)]"></div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;