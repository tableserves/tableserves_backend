import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import SingleRestaurantSidebar from './SingleRestaurantSidebar';
import SingleRestaurantNavbar from './SingleRestaurantNavbar';
import RestaurantOrderNotifications from '../../../features/owner/pages/RestaurantOrderNotifications';

const SingleRestaurantLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation(); // Fixed: Required for animation keys
  
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  useEffect(() => {
    // Silent auth check
    if (!isAuthenticated || user?.role !== 'restaurant_owner') {
      navigate('/login', { replace: true });
      return;
    }
    setLoading(false);
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // Robust resize handler
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tech-minimal Enterprise Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-theme-text-secondary tracking-wide">Authenticating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg-primary flex font-sans text-theme-text-primary selection:bg-accent/20 theme-transition">
      
      {/* Global Real-time Notifications */}
      <RestaurantOrderNotifications />

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <SingleRestaurantSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content Wrapper - Margin synced exactly with Sidebar widths (w-64 and w-20) */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isMobile 
            ? 'ml-0' 
            : sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Navbar */}
        <SingleRestaurantNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />

        {/* Page Content Context */}
        <main className="flex-1 w-full relative pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          
          {/* mode="wait" prevents the old page and new page from stacking during navigation */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full w-full"
            >
              {children || <Outlet />}
            </motion.div>
          </AnimatePresence>

        </main>
      </div>
    </div>
  );
};

export default SingleRestaurantLayout;