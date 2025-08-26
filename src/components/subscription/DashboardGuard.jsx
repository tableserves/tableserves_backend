import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function DashboardGuard({ children, businessType }) {
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);

  console.log('DashboardGuard: Called with:', {
    businessType,
    pathname: location.pathname,
    isAuthenticated,
    user: user ? {
      id: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
      zoneId: user.zoneId,
      hasSubscription: !!user.subscription,
      subscriptionPlanType: user.subscription?.planType
    } : null
  });

  // PRIORITY 1: If user is authenticated, use their data directly for redirects
  if (isAuthenticated && user) {
    console.log('DashboardGuard: User is authenticated, checking role-based redirects');
    
    // Restaurant Owner - Always redirect to restaurant dashboard
    if (user.role === 'restaurant_owner' && user.restaurantId) {
      if (businessType === 'zone') {
        console.log('DashboardGuard: Restaurant owner accessing zone route, redirecting to restaurant dashboard');
        return <Navigate to={`/tableserve/restaurant/${user.restaurantId}/dashboard`} replace />;
      }
      // If already on restaurant route and has restaurant ID, allow access
      if (businessType === 'restaurant') {
        console.log('DashboardGuard: Restaurant owner on restaurant route, allowing access');
        return children;
      }
    }
    
    // Zone Admin - Always redirect to zone dashboard
    if (user.role === 'zone_admin' && user.zoneId) {
      if (businessType === 'restaurant') {
        console.log('DashboardGuard: Zone admin accessing restaurant route, redirecting to zone dashboard');
        return <Navigate to={`/tableserve/zone/${user.zoneId}/dashboard`} replace />;
      }
      // If already on zone route and has zone ID, allow access
      if (businessType === 'zone') {
        console.log('DashboardGuard: Zone admin on zone route, allowing access');
        return children;
      }
    }
    
    // Zone Shop/Vendor - should stay in their zone shop area
    if ((user.role === 'zone_shop' || user.role === 'zone_vendor') && user.zoneId && user.shopId) {
      if (businessType === 'restaurant') {
        console.log('DashboardGuard: Zone shop/vendor accessing restaurant route, redirecting to shop dashboard');
        return <Navigate to={`/tableserve/zone/${user.zoneId}/shop/${user.shopId}/dashboard`} replace />;
      }
      // Allow access to zone routes
      return children;
    }
  }

  // PRIORITY 2: Check subscription data for plan type validation
  let subscription = null;
  try {
    const raw = localStorage.getItem('tableserve_subscription');
    subscription = raw ? JSON.parse(raw) : null;
  } catch (e) {
    subscription = null;
  }

  // If authenticated user has subscription, prioritize that
  if (isAuthenticated && user && user.subscription) {
    subscription = user.subscription;
    console.log('DashboardGuard: Using authenticated user subscription:', subscription);
  }

  // Check if there's temporary signup data indicating incomplete onboarding
  let tempSignup = null;
  try {
    const temp = localStorage.getItem('tableserve_temp_signup');
    tempSignup = temp ? JSON.parse(temp) : null;
  } catch (e) {
    tempSignup = null;
  }

  // If user has temp signup data with needsBusinessTypeSelection flag, redirect to hotel or restaurant type selection
  if (tempSignup?.needsBusinessTypeSelection) {
    console.log('DashboardGuard: Redirecting to business type selection due to temp signup');
    return <Navigate to="/tableserve/business-type" replace />;
  }

  // If no subscription is found, redirect to signup
  if (!subscription) {
    console.log('DashboardGuard: No subscription found, redirecting to signup');
    return <Navigate to="/tableserve/signup" replace />;
  }

  console.log('DashboardGuard: Subscription check:', {
    businessType,
    subscriptionPlanType: subscription.planType,
    matches: subscription.planType === businessType
  });

  // PRIORITY 3: Subscription-based plan type validation (fallback)
  if (businessType && subscription && subscription.planType !== businessType) {
    console.log('DashboardGuard: Plan type mismatch detected:', {
      requiredBusinessType: businessType,
      subscriptionPlanType: subscription.planType,
      userRole: user?.role
    });
    
    // IMPORTANT: Only redirect if user is not already authenticated with correct role
    // This prevents the infinite redirect loop
    if (!isAuthenticated || !user) {
      console.log('DashboardGuard: User not authenticated, checking localStorage fallback');
      
      // FALLBACK: Search localStorage for user's account (less reliable)
      if (subscription.planType === 'restaurant') {
        console.log('DashboardGuard: Searching for restaurant in localStorage');
        const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
        if (restaurants.length > 0) {
          const userRestaurant = restaurants[0]; // Use first restaurant as fallback
          console.log('DashboardGuard: Redirecting to restaurant dashboard:', userRestaurant.id);
          return <Navigate to={`/tableserve/restaurant/${userRestaurant.id}/dashboard`} replace />;
        }
      } else if (subscription.planType === 'zone') {
        console.log('DashboardGuard: Searching for zone in localStorage');
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        if (zones.length > 0) {
          const userZone = zones[0]; // Use first zone as fallback
          console.log('DashboardGuard: Redirecting to zone dashboard:', userZone.id);
          return <Navigate to={`/tableserve/zone/${userZone.id}/dashboard`} replace />;
        }
      }
      
      console.log('DashboardGuard: Could not find appropriate redirect, going to signup');
      return <Navigate to="/tableserve/signup" replace />;
    } else {
      console.log('DashboardGuard: User is authenticated with correct role, ignoring plan type mismatch');
      // User is authenticated - trust the authentication system rather than subscription planType
      // This prevents restaurant users with incorrect planType from being redirected to zone
    }
  }

  console.log('DashboardGuard: All checks passed, allowing access to dashboard');
  // All checks passed, allow access to dashboard
  return children;
}