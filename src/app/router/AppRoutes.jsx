import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import RouteProtection from '../../features/auth/components/RouteProtection';

// Auth + plan selection
import Login from '../../features/auth/pages/Login';
import ForgotPassword from '../../features/auth/pages/ForgotPassword';
import ResetPassword from '../../features/auth/pages/ResetPassword';
import Signup from '../../features/auth/pages/Signup';
import ChoosePlan from '../../features/subscription/pages/ChoosePlan.jsx';

// Marketing
import Layout from '../../features/marketing/components/Layout';
import HomePage from '../../features/marketing/pages/HomePage';
import Services from '../../features/marketing/pages/Services';
import About from '../../features/marketing/pages/About';
import Contact from '../../features/marketing/pages/Contact';
import PricingPage from '../../features/marketing/pages/PricingPage';

// Debug
import ThemeToggle from '../../components/common/ThemeToggle';
import { shouldRenderDebugRoute } from '../config/EnvironmentConfig.js';

// Super Admin
const SuperAdminDashboard = lazy(() => import('../../features/admin/components/SuperAdminDashboard.jsx'));
import RestaurantManagement from '../../features/admin/components/accounts/RestaurantManagement.jsx';
import RestaurantPremiumManagement from '../../features/admin/components/accounts/RestaurantPremiumManagement.jsx';
import FoodZonesManagement from '../../features/admin/components/accounts/FoodZonesManagement.jsx';
import ZoneAdvancedManagement from '../../features/admin/components/accounts/ZoneAdvancedManagement.jsx';
import LiveOrders from '../../features/admin/components/orders/LiveOrders.jsx';
import OrderHistory from '../../features/admin/components/orders/OrderHistory.jsx';
import Reports from '../../features/admin/components/analytics/Reports.jsx';
import AdminProfile from '../../features/admin/components/profile/AdminProfile.jsx';
import AdminFeedbackManagement from '../../features/admin/components/feedback/AdminFeedbackManagement.jsx';
import AdminBilling from '../../features/admin/pages/AdminBilling.jsx';

// Zone Admin
const ZoneAdminDashboard = lazy(() => import('../../features/zoneadmin/pages/ZoneAdminDashboard.jsx'));
import ZoneProfile from '../../features/zoneadmin/pages/ZoneProfile.jsx';
import AllVendors from '../../features/zoneadmin/vendors/AllVendors.jsx';
import VendorCredentials from '../../features/zoneadmin/vendors/VendorCredentials.jsx';
import ZoneAdminQRCodeGenerator from '../../features/zoneadmin/pages/QRCodeGenerator.jsx';
import ZoneAnalytics from '../../features/zoneadmin/analytics/ZoneAnalytics.jsx';
import ZoneSettings from '../../features/zoneadmin/pages/ZoneSettings.jsx';
import ZoneAdminUpgrade from '../../features/zoneadmin/pages/ZoneAdminUpgrade.jsx';
import ZoneAdminReviews from '../../features/zoneadmin/pages/ZoneAdminReviews.jsx';

// Zone Shop
const ZoneShopDashboard = lazy(() => import('../../features/zoneshop/pages/ZoneShopDashboard.jsx'));
import ZoneShopProfile from '../../features/zoneshop/pages/ZoneShopProfile.jsx';
import MenuItems from '../../features/zoneshop/menu/MenuItems.jsx';
import MenuCategories from '../../features/zoneshop/menu/MenuCategories.jsx';
import ZoneShopLiveOrders from '../../features/zoneshop/orders/LiveOrders.jsx';
import ZoneShopOrderHistory from '../../features/zoneshop/orders/OrderHistory.jsx';
// Removed: ZoneShopOrderReports — order reports route was deprecated in favour of the
// Analytics page (which now contains the Transaction Ledger and Excel export).
import ShopReviews from '../../features/zoneshop/pages/ShopReviews.jsx';
import ZoneShopAnalytics from '../../features/zoneshop/analytics/ZoneShopAnalytics.jsx';
import ZoneShopSettings from '../../features/zoneshop/settings/ZoneShopSettings.jsx';

// Restaurant Owner
const SingleRestaurantDashboard = lazy(() => import('../../features/owner/components/SingleRestaurantDashboard.jsx'));
import SingleRestaurantUpgrade from '../../features/owner/pages/SingleRestaurantUpgrade.jsx';
import QRCodeGenerator from '../../features/owner/pages/QRCodeGenerator.jsx';
import RestaurantReviews from '../../features/owner/pages/RestaurantReviews.jsx';

import MenuManagementPage from '../../features/owner/pages/MenuManagement.jsx';
import MenuCategoriesPage from '../../features/owner/pages/MenuCategories.jsx';
import ProfileManagementPage from '../../features/owner/pages/ProfileManagement.jsx';
import OrderManagementPage from '../../features/owner/pages/OrderManagement.jsx';
import AnalyticsPage from '../../features/owner/pages/Analytics.jsx';

// Consumer (customer/user)
import LandingScreen from '../../features/consumer/pages/common/LandingScreen.jsx';
import OrderSuccessScreen from '../../features/consumer/pages/common/OrderSuccessScreen.jsx';

import DigitalMenuScreen from '../../features/consumer/pages/restaurant/RestaurantMenuScreen.jsx';
import CartScreen from '../../features/consumer/pages/restaurant/RestaurantCartScreen.jsx';
import CheckoutScreen from '../../features/consumer/pages/restaurant/RestaurantCheckoutScreen.jsx';
import ZoneShopSelectionScreen from '../../features/consumer/pages/zone/ZoneShopSelectionScreen.jsx';
import ZoneDigitalMenuScreen from '../../features/consumer/pages/zone/ZoneMenuScreen.jsx';
import ZoneCartScreen from '../../features/consumer/pages/zone/ZoneCartScreen.jsx';
import ZoneCheckoutScreen from '../../features/consumer/pages/zone/ZoneCheckoutScreen.jsx';

import OrderTracking from '../../features/consumer/components/common/OrderTracking.jsx';

import logger from '../../services/LoggingService';
import { generateRestaurantUrl, generateZoneUrl } from '../../shared/routing/urlUtils';

function ZoneHomeRedirect() {
  const { zoneId, tableId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);

  const generateSessionUserId = () => {
    return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  };

  const sessionUserId = user?.id || generateSessionUserId();
  const redirectUrl = generateZoneUrl(zoneId, tableId, sessionUserId, 'welcome');

  logger.route('ZoneHomeRedirect - Fresh QR Scan to Welcome', redirectUrl, {
    zoneId,
    tableId,
    sessionUserId,
    isNewSession: !user?.id
  });

  return <Navigate to={redirectUrl} replace />;
}

function ZoneUserHomeRedirect() {
  const { zoneId, tableId, userId } = useParams();
  const redirectUrl = generateZoneUrl(zoneId, tableId, userId, 'shops');

  logger.route('ZoneUserHomeRedirect', redirectUrl, { zoneId, tableId, userId });
  return <Navigate to={redirectUrl} replace />;
}

function HomeShopsRedirect() {
  const { zoneId, tableId, userId } = useParams();
  const location = useLocation();
  logger.error('Invalid route accessed', { pathname: location.pathname }, 'HomeShopsRedirect');
  logger.debug('Redirecting with params', { zoneId, tableId, userId }, 'HomeShopsRedirect');

  if (zoneId && tableId) {
    const redirectUrl = generateZoneUrl(zoneId, tableId, userId, 'shops');
    return <Navigate to={redirectUrl} replace />;
  }
  return <Navigate to="/" replace />;
}

function RestaurantUserHomeRedirect() {
  const { restaurantId, tableId, userId } = useParams();
  const redirectUrl = generateRestaurantUrl(restaurantId, tableId, userId, 'menu');

  logger.route('RestaurantUserHomeRedirect', redirectUrl, { restaurantId, tableId, userId });
  return <Navigate to={redirectUrl} replace />;
}

function RestaurantHomeRedirect() {
  const { restaurantId, tableId } = useParams();
  const redirectUrl = `/restaurant/${restaurantId}/table/${tableId}/welcome`;

  logger.route('RestaurantHomeRedirect - Public QR Scan to Welcome', redirectUrl, {
    restaurantId,
    tableId
  });

  return <Navigate to={redirectUrl} replace />;
}

function ZoneUserRedirect() {
  const { zoneId, tableId, userId } = useParams();
  const redirectUrl = generateZoneUrl(zoneId, tableId, userId, 'shops');

  logger.route('ZoneUserRedirect', redirectUrl, { zoneId, tableId, userId });
  return <Navigate to={redirectUrl} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Plan selection page (must choose plan before login) */}
      <Route path="/choose-plan" element={<ChoosePlan />} />

      {/* Signup route - plan must be chosen first */}
      <Route path="/signup" element={<Signup />} />
      {/* Login route - direct access for existing users */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Marketing Website Routes */}
      <Route
        path="/"
        element={
          <Layout>
            <HomePage />
          </Layout>
        }
      />
      <Route
        path="/services"
        element={
          <Layout>
            <Services />
          </Layout>
        }
      />
      <Route
        path="/about"
        element={
          <Layout>
            <About />
          </Layout>
        }
      />
      <Route
        path="/contact"
        element={
          <Layout>
            <Contact />
          </Layout>
        }
      />
      <Route
        path="/pricing"
        element={
          <Layout>
            <PricingPage />
          </Layout>
        }
      />

      {/* Theme Test Route - Development Only */}
      {shouldRenderDebugRoute() && (
        <Route
          path="/theme-test"
          element={
            <div className="min-h-screen admin-layout theme-transition p-8">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-fredoka text-theme-text-primary mb-6">Theme System Test</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="admin-card p-6 rounded-lg">
                    <h2 className="text-xl font-raleway text-theme-text-primary mb-4">Theme Toggle</h2>
                    <ThemeToggle />
                  </div>
                  <div className="admin-card p-6 rounded-lg">
                    <h2 className="text-xl font-raleway text-theme-text-primary mb-4">Color Samples</h2>
                    <div className="space-y-2">
                      <div className="p-2 bg-theme-accent-primary text-theme-text-inverse rounded">Accent Primary</div>
                      <div className="p-2 bg-theme-bg-secondary text-theme-text-secondary rounded">Background Secondary</div>
                      <div className="p-2 border border-theme-border-primary text-theme-text-primary rounded">Border Primary</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* ===== SUPER ADMIN ROUTES (HIGHEST PRIORITY) ===== */}
      <Route
        path="/admin/dashboard"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <Suspense fallback={<div />}>
              <SuperAdminDashboard />
            </Suspense>
          </RouteProtection>
        }
      />
      <Route
        path="/admin/accounts/restaurants"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <RestaurantManagement />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/accounts/restaurant-premium"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <RestaurantPremiumManagement />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/accounts/zones"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <FoodZonesManagement />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/accounts/zone-advanced"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <ZoneAdvancedManagement />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/orders/live"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <LiveOrders />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/orders/history"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <OrderHistory />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/analytics/reports"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <Reports />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/feedback/reviews"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <AdminFeedbackManagement />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <AdminProfile />
          </RouteProtection>
        }
      />
      <Route
        path="/admin/billing"
        element={
          <RouteProtection allowedRoles={['admin']}>
            <AdminBilling />
          </RouteProtection>
        }
      />

      {/* ===== ZONE ADMIN ROUTES (SECOND PRIORITY) ===== */}
      <Route
        path="/zone/:zoneId/dashboard"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <Suspense fallback={<div />}>
              <ZoneAdminDashboard />
            </Suspense>
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/profile"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <ZoneProfile />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/vendors/list"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <AllVendors />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/vendors/credentials"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <VendorCredentials />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/analytics/revenue"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <ZoneAnalytics />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/analytics/performance"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <ZoneAnalytics />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/qr/generator"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <ZoneAdminQRCodeGenerator />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/reviews"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <ZoneAdminReviews />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/upgrade"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <ZoneAdminUpgrade />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/settings"
        element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <ZoneSettings />
          </RouteProtection>
        }
      />

      {/* ===== ZONE SHOP ROUTES (THIRD PRIORITY) ===== */}
      <Route path="/zone/:zoneId/shop/:shopId" element={<Navigate to="dashboard" replace />} />
      <Route
        path="/zone/:zoneId/shop/:shopId/dashboard"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <Suspense fallback={<div />}>
              <ZoneShopDashboard />
            </Suspense>
          </RouteProtection>
        }
      />

      {/* All zone shop and vendor routes require zoneId in the URL */}
      <Route
        path="/zone/:zoneId/shop/:shopId/profile"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <ZoneShopProfile />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/shop/:shopId/menu/items"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <MenuItems />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/shop/:shopId/menu/categories"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <MenuCategories />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/shop/:shopId/orders/live"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <ZoneShopLiveOrders />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/shop/:shopId/orders/history"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <ZoneShopOrderHistory />
          </RouteProtection>
        }
      />
      {/* /orders/reports route removed — superseded by the Analytics page */}
      <Route
        path="/zone/:zoneId/shop/:shopId/reviews"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <ShopReviews />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/shop/:shopId/analytics/revenue"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <ZoneShopAnalytics />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/shop/:shopId/analytics/performance"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <ZoneShopAnalytics />
          </RouteProtection>
        }
      />
      <Route
        path="/zone/:zoneId/shop/:shopId/settings"
        element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <ZoneShopSettings />
          </RouteProtection>
        }
      />

      {/* ===== RESTAURANT OWNER ROUTES (FOURTH PRIORITY - MOST SPECIFIC) ===== */}
      <Route
        path="/restaurant/:restaurantId/dashboard"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <Suspense fallback={<div />}>
              <SingleRestaurantDashboard />
            </Suspense>
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/profile"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <ProfileManagementPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/menu/items"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <MenuManagementPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/menu/categories"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <MenuCategoriesPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/qr/generator"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <QRCodeGenerator />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/orders/live"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <OrderManagementPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/orders/history"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <OrderManagementPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/orders/feedback"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <OrderManagementPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/reviews"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <RestaurantReviews />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/analytics/sales"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <AnalyticsPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/analytics/revenue"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <AnalyticsPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/analytics/export"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <AnalyticsPage />
          </RouteProtection>
        }
      />
      <Route
        path="/restaurant/:restaurantId/upgrade"
        element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <SingleRestaurantUpgrade />
          </RouteProtection>
        }
      />

      {/* ===== CUSTOMER-FACING ROUTES (QR CODE SYSTEM) ===== */}
      {/* Restaurant Customer Routes - Table-based QR System (Not Logged In) */}
      <Route path="/restaurant/:restaurantId/table/:tableId/home" element={<RestaurantHomeRedirect />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/welcome" element={<LandingScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/menu" element={<DigitalMenuScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/cart" element={<CartScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/checkout" element={<CheckoutScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/success" element={<OrderSuccessScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/tracking" element={<OrderTracking />} />

      {/* Restaurant Customer Routes - Table-based QR System (Logged In) */}
      <Route path="/restaurant/:restaurantId/table/:tableId/user/:userId/home" element={<RestaurantUserHomeRedirect />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/user/:userId/welcome" element={<LandingScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/user/:userId/menu" element={<DigitalMenuScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/user/:userId/cart" element={<CartScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/user/:userId/checkout" element={<CheckoutScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/user/:userId/success" element={<OrderSuccessScreen />} />
      <Route path="/restaurant/:restaurantId/table/:tableId/user/:userId/tracking" element={<OrderTracking />} />

      <Route path="/zone/:zoneId/table/:tableId/user/:userId/shop/:shopId/menu" element={<ZoneDigitalMenuScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/cart" element={<ZoneCartScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/shop/:shopId/cart" element={<ZoneCartScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/checkout" element={<ZoneCheckoutScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/shop/:shopId/checkout" element={<ZoneCheckoutScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/success" element={<OrderSuccessScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/tracking" element={<OrderTracking />} />

      {/* Zone Customer Routes - Zone-Wide Table System */}
      <Route path="/zone/:zoneId/table/:tableId/home" element={<ZoneHomeRedirect />} />
      <Route path="/zone/:zoneId/table/:tableId/welcome" element={<LandingScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/shops" element={<ZoneShopSelectionScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/shop/:shopId/menu" element={<ZoneDigitalMenuScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/cart" element={<ZoneCartScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/shop/:shopId/cart" element={<ZoneCartScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/checkout" element={<ZoneCheckoutScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/shop/:shopId/checkout" element={<ZoneCheckoutScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/success" element={<OrderSuccessScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/tracking" element={<OrderTracking />} />

      {/* ===== ZONE USER ROUTES (NEW PATTERN) ===== */}
      <Route path="/zone/:zoneId/table/:tableId/user/:userId" element={<ZoneUserRedirect />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/home" element={<ZoneUserHomeRedirect />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/welcome" element={<LandingScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/shops" element={<ZoneShopSelectionScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/menu" element={<ZoneDigitalMenuScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/shop/:shopId/menu" element={<ZoneDigitalMenuScreen />} />


      <Route path="/zone/:zoneId/table/:tableId/user/:userId/success" element={<OrderSuccessScreen />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/tracking" element={<OrderTracking />} />

      {/* Catch-all routes for problematic patterns */}
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/home/shops" element={<HomeShopsRedirect />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/home/*" element={<HomeShopsRedirect />} />

      {/* Legacy redirects */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
      <Route path="/admin/login" element={<Navigate to="/login" />} />
      <Route path="/owner/login" element={<Navigate to="/login" />} />
      <Route path="/zone-admin/login" element={<Navigate to="/login" />} />
      <Route path="/zone-shop/login" element={<Navigate to="/login" />} />

      {/* Fix common incorrect routes */}
      <Route path="/restaurant-dashboard" element={<Navigate to="/login" />} />
      <Route path="/zone-dashboard" element={<Navigate to="/login" />} />

      {/* New Order Number Based Tracking Routes */}
      <Route path="/track/:orderNumber" element={<OrderTracking />} />

      {/* Zone-specific enhanced tracking */}
      <Route path="/track/zone/:orderNumber" element={<OrderTracking />} />
      <Route path="/zone/:zoneId/track/:orderNumber" element={<OrderTracking />} />
      <Route path="/zone/:zoneId/table/:tableId/track/:orderNumber" element={<OrderTracking />} />
      <Route path="/zone/:zoneId/table/:tableId/user/:userId/track/:orderNumber" element={<OrderTracking />} />

      {/* Catch-all route for unmatched paths */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
