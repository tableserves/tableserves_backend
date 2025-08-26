import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function LoginGuard({ children }) {
  const location = useLocation();

  // If user is trying to access login page, allow direct access
  // Existing users don't need to choose plan again when logging in
  if (location.pathname === '/tableserve/login') {
    return children;
  }

  // If user is trying to access signup page, allow direct access
  // New users can signup directly and choose hotel or restaurant type during the flow
  if (location.pathname === '/tableserve/signup') {
    return children;
  }

  // For other protected routes, check subscription
  let sub = null;
  try {
    const raw = localStorage.getItem('tableserve_subscription');
    sub = raw ? JSON.parse(raw) : null;
  } catch (e) {
    sub = null;
  }

  if (!sub) {
    return <Navigate to="/tableserve/choose-plan" replace />;
  }

  return children;
}

