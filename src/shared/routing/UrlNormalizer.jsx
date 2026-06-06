import React, { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import logger from '../../services/LoggingService';

/**
 * Component that normalizes URLs by removing "user/undefined" from the path
 * This component doesn't render anything visible, it just performs the redirection
 */
const UrlNormalizer = () => {
  // Safely get Router context with fallback handling
  let navigate, location, userId;

  try {
    navigate = useNavigate();
    location = useLocation();
    const params = useParams();
    userId = params.userId;
  } catch (error) {
    // Router context not available, component can't function
    console.warn('UrlNormalizer: Router context not available');
    return null;
  }

  useEffect(() => {
    // Check if URL contains "user/undefined"
    if (userId === 'undefined') {
      // Get the current path without the user segment
      const currentPath = location.pathname;
      const normalizedPath = currentPath.replace(/\/user\/undefined/, '');

      // Only redirect if the path actually changed
      if (normalizedPath !== currentPath) {
        logger.route(currentPath, normalizedPath, { userId }, 'UrlNormalizer');
        navigate(normalizedPath, { replace: true });
      }
    }
  }, [location.pathname, userId, navigate]);

  // This component doesn't render anything visible
  return null;
};

export default UrlNormalizer;
