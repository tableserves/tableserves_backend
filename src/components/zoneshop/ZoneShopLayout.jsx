import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ZoneShopSidebar from './ZoneShopSidebar';
import ZoneShopNavbar from './ZoneShopNavbar';
import { initializeTheme } from '../../store/slices/uiSlice';

const ZoneShopLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  useEffect(() => {
    console.log("ZoneShopLayout - User data:", user);

    // If not authenticated, redirect to login immediately
    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      // Force a hard redirect to the login page to avoid any React Router issues
      window.location.href = '/tableserve/login';
      return;
    }

    // If authenticated but wrong role, redirect to login
    if (user?.role !== 'zone_shop' && user?.role !== 'zone_vendor') {
      console.log("Wrong role, redirecting to login");
      // Force a hard redirect to the login page to avoid any React Router issues
      window.location.href = '/tableserve/login';
      return;
    }

    // Check if we're on a URL with ':zoneId' as a literal string
    const currentPath = window.location.pathname;
    console.log("Current path:", currentPath);

    // Check for various forms of the zoneId placeholder
    if (currentPath.includes('/zone/:zoneId/') && user?.zoneId) {
      console.log("Found /zone/:zoneId/ pattern");
      // Replace the placeholder with the actual zoneId
      const correctPath = currentPath.replace('/zone/:zoneId/', `/zone/${user.zoneId}/`);
      console.log(`Redirecting from ${currentPath} to ${correctPath}`);
      navigate(correctPath);
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
          <p className="text-theme-text-primary font-raleway">Loading Zone Shop Panel...</p>
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
      <ZoneShopSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarOpen && !isMobile ? 'lg:ml-64' : ''
        }`}>
        {/* Top Navbar */}
        <ZoneShopNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen pt-24 md:pt-20 lg:pt-24 p-4 lg:p-6 relative"
          style={{ minHeight: 'calc(100vh - 6rem)' }}
        >
          <AnimatePresence>
            <div key={children ? 'zone-shop-children' : 'zone-shop-outlet'}>
              {children || <Outlet />}
            </div>
          </AnimatePresence>
        </motion.main>
      </div>
    </div>
  );
};

export default ZoneShopLayout;
