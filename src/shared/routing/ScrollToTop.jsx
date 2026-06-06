import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  // Safely get Router context with fallback handling
  let pathname = '/';

  try {
    const location = useLocation();
    pathname = location.pathname;
  } catch (error) {
    // Router context not available, use fallback
    console.warn('ScrollToTop: Router context not available');
    pathname = '/';
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
