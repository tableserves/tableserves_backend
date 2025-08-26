import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useSelector((state) => state.ui.auth);

  if (!isAuthenticated) {
    return <Navigate to="/tableserve/login" />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/tableserve/login" />;
  }

  return children;
};

export default ProtectedRoute;