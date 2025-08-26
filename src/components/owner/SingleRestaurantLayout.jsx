import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import SingleRestaurantSidebar from './SingleRestaurantSidebar';
import SingleRestaurantNavbar from './SingleRestaurantNavbar';

const SingleRestaurantLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  useEffect(() => {
    // Check authentication and role
    console.log('SingleRestaurantLayout auth check:', { isAuthenticated, userRole: user?.role });

    if (!isAuthenticated || user?.role !== 'restaurant_owner') {
      console.log('Layout redirecting to login - not authenticated or wrong role');
      navigate('/tableserve/login');
      return;
    }

    console.log('Layout authentication successful');
    setLoading(false);
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // Handle responsive behavior
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-raleway">Loading restaurant dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 admin-layout"
      style={{ '--navbar-height': '6rem' }}
    >
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <SingleRestaurantSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${isMobile
        ? 'ml-0'
        : sidebarOpen
          ? 'ml-64'
          : 'ml-16'
        }`}>
        {/* Top Navbar */}
        <SingleRestaurantNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen p-3 sm:p-6"
          style={{
            paddingTop: 'calc(var(--navbar-height, 6rem) + 1rem)'
          }}
        >
          <AnimatePresence>
            <motion.div key={location.pathname}>
              {children || <Outlet />}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>
    </div>
  );
};

export default SingleRestaurantLayout;
