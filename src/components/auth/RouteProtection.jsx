import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Enhanced route protection with proper authentication checking
const RouteProtection = ({ children, allowedRoles, requiredRole }) => {
  const { isAuthenticated, user } = useSelector((state) => state.ui.auth);
  const { restaurantName } = useParams();
  
  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/tableserve/login" replace />;
  }
  
  // Handle allowedRoles (array) - this is the new parameter being used in App.jsx
  if (allowedRoles && Array.isArray(allowedRoles)) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/tableserve/login" replace />;
    }
    return children;
  }
  
  // Handle legacy requiredRole (single role) for backward compatibility
  if (requiredRole) {
    // Legacy session-based protection for specific roles
    if (requiredRole === 'admin') {
      if (user.role !== 'admin') {
        return <Navigate to="/tableserve/login" replace />;
      }
    }
    
    if (requiredRole === 'owner') {
      // Check if owner is logged in for this restaurant
      const currentOwner = sessionStorage.getItem('currentOwner');
      if (!currentOwner || user.role !== 'restaurant_owner') {
        return <Navigate to={`/${restaurantName}/login`} replace />;
      }
      
      // Verify owner belongs to this restaurant
      const ownerData = JSON.parse(currentOwner);
      const ownerRestaurantSlug = ownerData.restaurantName.toLowerCase().replace(/\s+/g, '-');
      if (ownerRestaurantSlug !== restaurantName) {
        return <Navigate to={`/${restaurantName}/login`} replace />;
      }
    }
    
    // For other roles, check if user role matches
    if (user.role !== requiredRole) {
      return <Navigate to="/tableserve/login" replace />;
    }
  }
  
  return children;
};

export default RouteProtection;
