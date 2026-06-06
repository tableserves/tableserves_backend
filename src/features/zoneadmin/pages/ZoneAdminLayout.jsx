import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ZoneAdminSidebar from './ZoneAdminSidebar';
import ZoneAdminNavbar from './ZoneAdminNavbar';
import { initializeTheme } from '../../../store/slices/uiSlice';

const ZoneAdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  // 1. Initialize Theme & Settings
  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  // 2. Optimized Auth Guard
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
    } else if (!['zone_admin', 'zone_user'].includes(user.role)) {
      navigate('/login', { replace: true });
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, navigate]);

  // 3. Responsive Logic (Unified Resize Handler)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile); // Auto-close on mobile, auto-open on desktop
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 4. Auto-close sidebar on mobile navigation
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  // 5. Minimalist Enterprise Loading State
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-theme-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-theme-text-primary tracking-wide">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // Calculate dynamic spacing constants
  const sidebarWidth = isMobile ? '0px' : sidebarOpen ? '256px' : '80px';

  return (
    <div className="min-h-screen bg-theme-bg-primary flex font-raleway selection:bg-theme-accent-primary/20 theme-transition overflow-x-hidden">
      
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Component */}
      <ZoneAdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content Wrapper */}
      <div 
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Sticky Navbar */}
        <ZoneAdminNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 w-full relative pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1600px] mx-auto w-full h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full"
              >
                {children || <Outlet />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer Area */}
        <footer className="py-6 text-center text-xs text-theme-text-secondary font-medium">
          © {new Date().getFullYear()} Zone Admin Dashboard • All rights reserved
        </footer>
      </div>

      {/* Decorative Background Accents (Theme Aware) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-theme-accent-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-theme-accent-secondary/10 blur-[120px]" />
      </div>
    </div>
  );
};

export default ZoneAdminLayout;