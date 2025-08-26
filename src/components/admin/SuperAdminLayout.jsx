import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminNavbar from './SuperAdminNavbar';
import { logActivity } from '../../store/slices/activitySlice';
import { initializeTheme, selectTheme } from '../../store/slices/uiSlice';

const SuperAdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);
  const currentTheme = useSelector(selectTheme);

  useEffect(() => {
    // Initialize theme
    dispatch(initializeTheme());
  }, [dispatch]);

  useEffect(() => {
    // Check authentication and role
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/tableserve/login');
      return;
    }

    // Log admin access
    dispatch(logActivity({
      action: 'ADMIN_ACCESS',
      details: `Super Admin ${user.name} accessed the panel`,
      timestamp: new Date().toISOString()
    }));

    setLoading(false);
  }, [isAuthenticated, user, navigate, dispatch]);

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
      <div className="min-h-screen admin-layout flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-theme-text-primary font-raleway">Loading Super Admin Panel...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen admin-layout theme-transition"
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
      <SuperAdminSidebar
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
        <SuperAdminNavbar
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
            paddingTop: 'calc(var(--navbar-height, 6rem) + 1rem)' // Navbar height + extra spacing
          }}
        >
          <AnimatePresence>
            <div key={children ? 'admin-children' : 'admin-outlet'}>
              {children || <Outlet />}
            </div>
          </AnimatePresence>
        </motion.main>
      </div>

      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,0,0.1),transparent_50%)]"></div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
