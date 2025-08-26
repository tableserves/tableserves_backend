import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ZoneAdminSidebar from './ZoneAdminSidebar';
import ZoneAdminNavbar from './ZoneAdminNavbar';
import { initializeTheme, selectTheme } from '../../store/slices/uiSlice';

const ZoneAdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);
  const currentTheme = useSelector(selectTheme);

  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/tableserve/login');
      return;
    }

    // Allow zone_admin and zone_shop for testing
    if (user?.role !== 'zone_admin' && user?.role !== 'zone_shop') {
      navigate('/tableserve/login');
      return;
    }

    setLoading(false);
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // On desktop, sidebar should be open by default
      // On mobile, sidebar should be closed by default
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen admin-layout flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-theme-text-primary font-raleway">Loading Zone Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen admin-layout theme-transition"
      style={{ '--navbar-height': '6rem' }}
    >
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <ZoneAdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarOpen && !isMobile ? 'lg:ml-64' : ''
        }`}>
        {/* Top Navbar */}
        <ZoneAdminNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen pt-20 lg:pt-24 p-4 lg:p-6"
        >
          <AnimatePresence>
            <div key={children ? 'zone-admin-children' : 'zone-admin-outlet'}>
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

export default ZoneAdminLayout;
