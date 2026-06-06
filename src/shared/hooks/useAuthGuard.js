import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import simpleTokenService from '../auth/SimpleTokenService';

export const useAuthGuard = (allowedRoles = []) => {
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      window.location.href = '/login';
      return;
    }

    // Check token validity
    if (!simpleTokenService.isAuthenticated()) {
      simpleTokenService.clearTokens();
      window.location.href = '/login';
      return;
    }

    // Check role permissions
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      window.location.href = '/login';
      return;
    }
  }, [isAuthenticated, user, allowedRoles]);

  return { user, isAuthenticated };
};