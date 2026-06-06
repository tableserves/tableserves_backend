import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logger from '../../../services/LoggingService';

const RouteProtection = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.ui.auth);
  const location = useLocation();

  // Enhanced public QR patterns to ensure all QR routes are excluded from protection
  const publicQRPatterns = [
    /^\/restaurant\/[^/]+\/table\/[^/]+\//,
    /^\/zone\/[^/]+\/table\/[^/]+\//,
    /^\/restaurant\/[^/]+\/table\/[^/]+$/,
    /^\/zone\/[^/]+\/table\/[^/]+$/
  ];

  const isPublicQRRoute = publicQRPatterns.some((pattern) => pattern.test(location.pathname));

  if (isPublicQRRoute) {
    logger.debug('RouteProtection: QR route detected, skipping authentication', {
      path: location.pathname,
      isQRRoute: true
    });
    return children; // Skip all authentication for public QR routes
  }

  // If not a public QR route, enforce authentication
  if (!isAuthenticated || !user) {
    logger.debug('RouteProtection: Authentication required for non-QR route', {
      path: location.pathname,
      isAuthenticated,
      hasUser: !!user
    });
    return <Navigate to="/login" replace />;
  }

  // Role-based access control for authenticated users
  if (allowedRoles && Array.isArray(allowedRoles)) {
    if (!allowedRoles.includes(user.role)) {
      // Redirect to a generic unauthorized page or login
      logger.debug('RouteProtection: User role not allowed', {
        path: location.pathname,
        userRole: user.role,
        allowedRoles
      });
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default RouteProtection;
