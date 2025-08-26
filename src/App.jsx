import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';

// Error Handling
import { ErrorBoundary } from './components/ErrorBoundary';
import errorHandlingService from './services/ErrorHandlingService';
import storageInitializationService from './services/StorageInitializationService';


// Import simple components that don't use Redux for now
import Login from './pages/Login';
import RouteProtection from './components/auth/RouteProtection';
import UrlNormalizer from './components/UrlNormalizer';

// Lazy load large dashboard components for better performance
const SuperAdminDashboard = lazy(() => import('./components/admin/SuperAdminDashboard'));
const ZoneAdminDashboard = lazy(() => import('./components/zoneadmin/ZoneAdminDashboard'));
const SingleRestaurantDashboard = lazy(() => import('./components/owner/SingleRestaurantDashboard'));
const ZoneShopDashboard = lazy(() => import('./components/zoneshop/ZoneShopDashboard'));

// Super Admin Components
import RestaurantManagement from './components/admin/accounts/RestaurantManagement';
import RestaurantPremiumManagement from './components/admin/accounts/RestaurantPremiumManagement';
import FoodZonesManagement from './components/admin/accounts/FoodZonesManagement';
import ZoneAdvancedManagement from './components/admin/accounts/ZoneAdvancedManagement';
import LiveOrders from './components/admin/orders/LiveOrders';
import OrderHistory from './components/admin/orders/OrderHistory';
import AdminSettings from './components/admin/settings/AdminSettings';
import Reports from './components/admin/analytics/Reports';
import AdminProfile from './components/admin/profile/AdminProfile';
// Removed CustomerManagement - not Super Admin responsibility

// Zone Shop Components
// Lazy loaded above
import ZoneShopProfile from './components/zoneshop/ZoneShopProfile';
import MenuItems from './components/zoneshop/menu/MenuItems';
import ZoneShopLiveOrders from './components/zoneshop/orders/LiveOrders';

import ZoneShopOrderReports from './components/zoneshop/reports/ZoneShopOrderReports';
import ZoneShopAnalytics from './components/zoneshop/analytics/ZoneShopAnalytics';
import ZoneShopTransactionReports from './components/zoneshop/reports/ZoneShopTransactionReports';
import ZoneShopSettings from './components/zoneshop/settings/ZoneShopSettings';
// Removed TableManagement - not Super Admin responsibility

// Zone Admin Components
// Lazy loaded above
import ZoneProfile from './components/zoneadmin/ZoneProfile';
import AllZoneShops from './components/zoneadmin/shops/AllZoneShops';

// Zone Shop Menu Components
import MenuCategories from './components/zoneshop/menu/MenuCategories';
import MenuModifiers from './components/zoneshop/menu/MenuModifiers';
import ZoneShopOrderHistory from './components/zoneshop/orders/OrderHistory';

// Customer Components

// Removed QR, Orders, Menu management - not Super Admin responsibility
import RevenueAnalytics from './components/admin/analytics/RevenueAnalytics';
// Removed ProfileManagement, MenuOverview, CategoriesManagement, ImportExportMenus - not Super Admin responsibility

// Single Restaurant Owner Components
// Lazy loaded above
import SingleRestaurantUpgrade from './components/owner/SingleRestaurantUpgrade';
import QRCodeGenerator from './components/owner/QRCodeGenerator';

// Zone Admin Components
import AllVendors from './components/zoneadmin/vendors/AllVendors';
import VendorCredentials from './components/zoneadmin/vendors/VendorCredentials';
import UpgradeRequests from './components/zoneadmin/common/UpgradeRequests';
import ZoneAdminQRCodeGenerator from './components/zoneadmin/QRCodeGenerator';
import ZoneMenuCategories from './components/zoneadmin/menu/MenuCategories';
import ZoneMenuItems from './components/zoneadmin/menu/MenuItems';
import ZoneMenuModifiers from './components/zoneadmin/menu/MenuModifiers';
import ZoneMergedMenu from './components/zoneadmin/menu/ZoneMergedMenu';
import ZoneAnalytics from './components/zoneadmin/analytics/ZoneAnalytics';
import ZoneSettings from './components/zoneadmin/ZoneSettings';
import ZoneAdminUpgrade from './components/zoneadmin/ZoneAdminUpgrade';

// Customer Components
import LandingScreen from './pages/customer_user/LandingScreen';
import DigitalMenuScreen from './pages/customer_user/DigitalMenuScreen';
import ProductDetailScreen from './pages/customer_user/ProductDetailScreen';
import CartScreen from './pages/customer_user/CartScreen';
import OTPLoginScreen from './pages/customer_user/OTPLoginScreen';
import CheckoutScreen from './pages/customer_user/CheckoutScreen';
import OrderSuccessScreen from './pages/customer_user/OrderSuccessScreen';
import ReceiptPage from './pages/customer_user/ReceiptPage';
import OrderTrackingScreen from './pages/customer_user/OrderTrackingScreen';
import ZoneShopSelection from './components/customer/ZoneShopSelection';

// Zone User Components
import ZoneShopSelectionScreen from './pages/zone_user/ZoneShopSelectionScreen';
import ZoneDigitalMenuScreen from './pages/zone_user/ZoneDigitalMenuScreen';
import ZoneCartScreen from './pages/zone_user/ZoneCartScreen';
import UserProfile from './pages/user/UserProfile';

import AdminBilling from './components/admin/AdminBilling';
import MenuManagementPage from './pages/owner/MenuManagement';
import MenuCategoriesPage from './pages/owner/MenuCategories';
import MenuModifiersPage from './pages/owner/MenuModifiers';
import ProfileManagementPage from './pages/owner/ProfileManagement';
import OrderManagementPage from './pages/owner/OrderManagement';
import AnalyticsPage from './pages/owner/Analytics';
import SettingsPage from './pages/owner/Settings';

// Core components
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/common/LoadingSpinner';
import PersistenceInitializer from './components/common/PersistenceInitializer';

// Marketing website components
import HomePage from './screens/HomePage';
import Services from './screens/Services';
import About from './screens/About';
import Contact from './screens/Contact';
import ChoosePlan from './components/subscription/ChoosePlan.jsx';
import PricingPage from './components/marketing/PricingPage.jsx';
import BusinessTypeSelection from './components/subscription/BusinessTypeSelection.jsx';
import LoginGuard from './components/subscription/LoginGuard';
import DashboardGuard from './components/subscription/DashboardGuard';
import Signup from './pages/Signup';
import { CartProvider } from './context/CartContext.jsx';



import Layout from './components/Layout';

import AOS from 'aos';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeTheme } from './store/slices/uiSlice';
import ThemeToggle from './components/common/ThemeToggle';
import 'aos/dist/aos.css';

import logger from './services/LoggingService';
import { generateRestaurantUrl, generateZoneUrl } from './utils/urlUtils';

// Environment configuration
import EnvironmentConfig, { shouldRenderDebugRoute, shouldRenderDemoFeature } from './config/EnvironmentConfig';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    AOS.init({ duration: 1000 });
    // Initialize theme on app startup
    dispatch(initializeTheme());
    
    // Initialize error handling and storage systems
    const initializeApp = async () => {
      try {
        // Initialize storage system
        const storageResult = await storageInitializationService.initialize();
        if (!storageResult.success) {
          logger.error('Storage initialization failed', storageResult.error, 'App');
        }
        
        logger.info('Application initialized successfully', {
          storage: storageResult.success,
          migrated: storageResult.migration?.migrated || false
        }, 'App');
      } catch (error) {
        errorHandlingService.handleError(error, {
          component: 'App',
          context: { phase: 'initialization' }
        });
      }
    };
    
    initializeApp();
  }, [dispatch]);

  // Redirect components that need to be inside Router context
  const ZoneHomeRedirect = () => {
    const { zoneId, tableId } = useParams();
    const { user } = useSelector((state) => state.ui.auth);

    // Generate a unique session user ID for fresh QR scans
    const generateSessionUserId = () => {
      return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    };

    // Create a unique user ID for this session if no user is logged in
    const sessionUserId = user?.id || generateSessionUserId();

    // Use enhanced URL utility for consistent URL generation with unique user session
    const redirectUrl = generateZoneUrl(zoneId, tableId, sessionUserId, 'shops');
    
    logger.route('ZoneHomeRedirect - Fresh QR Scan', redirectUrl, { 
      zoneId, 
      tableId, 
      sessionUserId,
      isNewSession: !user?.id 
    });
    
    return <Navigate to={redirectUrl} replace />;
  };

  const ZoneUserHomeRedirect = () => {
    const { zoneId, tableId, userId } = useParams();
    const redirectUrl = generateZoneUrl(zoneId, tableId, userId, 'shops');
    
    logger.route('ZoneUserHomeRedirect', redirectUrl, { zoneId, tableId, userId });
    return <Navigate to={redirectUrl} replace />;
  };

  const HomeShopsRedirect = () => {
    const { zoneId, tableId, userId } = useParams();
    const location = useLocation();
    logger.error('Invalid route accessed', { pathname: location.pathname }, 'HomeShopsRedirect');
    logger.debug('Redirecting with params', { zoneId, tableId, userId }, 'HomeShopsRedirect');

    if (zoneId && tableId) {
      const redirectUrl = generateZoneUrl(zoneId, tableId, userId, 'shops');
      return <Navigate to={redirectUrl} replace />;
    }
    return <Navigate to="/tableserve" replace />;
  };

  const RestaurantUserHomeRedirect = () => {
    const { restaurantId, tableId, userId } = useParams();
    const redirectUrl = generateRestaurantUrl(restaurantId, tableId, userId, 'menu');
    
    logger.route('RestaurantUserHomeRedirect', redirectUrl, { restaurantId, tableId, userId });
    return <Navigate to={redirectUrl} replace />;
  };

  const RestaurantHomeRedirect = () => {
    const { restaurantId, tableId } = useParams();
    const { user } = useSelector((state) => state.ui.auth);

    // Generate a unique session user ID for fresh QR scans
    const generateSessionUserId = () => {
      return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    };

    // Create a unique user ID for this session if no user is logged in
    const sessionUserId = user?.id || generateSessionUserId();

    // Use enhanced URL utility for consistent URL generation with unique user session
    const redirectUrl = generateRestaurantUrl(restaurantId, tableId, sessionUserId, 'menu');
    
    logger.route('RestaurantHomeRedirect - Fresh QR Scan', redirectUrl, { 
      restaurantId, 
      tableId, 
      sessionUserId,
      isNewSession: !user?.id 
    });
    
    return <Navigate to={redirectUrl} replace />;
  };

  const ZoneUserRedirect = () => {
    const { zoneId, tableId, userId } = useParams();
    const redirectUrl = generateZoneUrl(zoneId, tableId, userId, 'shops');
    
    logger.route('ZoneUserRedirect', redirectUrl, { zoneId, tableId, userId });
    return <Navigate to={redirectUrl} replace />;
  };


  return (
    <ErrorBoundary
      level="app"
      componentName="App"
      onError={(error, errorInfo) => {
        logger.error('Application-level error caught', error, 'App');
      }}
    >
      <Router>
        <PersistenceInitializer />
        <CartProvider>
          <ScrollToTop />
          <UrlNormalizer />
          <Routes>
        {/* Plan selection page (must choose plan before login) */}
        {/* Root redirect to marketing site */}
        <Route path="/" element={<Navigate to="/tableserve" replace />} />

        <Route path="/tableserve/choose-plan" element={<ChoosePlan />} />

        {/* Signup route - plan must be chosen first */}
        <Route path="/tableserve/signup" element={<LoginGuard><Signup /></LoginGuard>} />
        {/* Business type selection route - after signup */}
        <Route path="/tableserve/business-type" element={<BusinessTypeSelection />} />
        {/* Login route - direct access for existing users */}
        <Route path="/tableserve/login" element={<Login />} />

        {/* Marketing Website Routes */}
        <Route path="/tableserve" element={
          <Layout>
            <HomePage />
          </Layout>
        } />
        <Route path="/tableserve/services" element={
          <Layout>
            <Services />
          </Layout>
        } />
        <Route path="/tableserve/about" element={
          <Layout>
            <About />
          </Layout>
        } />
        <Route path="/tableserve/contact" element={
          <Layout>
            <Contact />
          </Layout>
        } />
        <Route path="/tableserve/pricing" element={
          <Layout>
            <PricingPage />
          </Layout>
        } />

        {/* Theme Test Route - Development Only */}
        {shouldRenderDebugRoute() && (
          <>
            <Route path="/theme-test" element={
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
            } />
          </>
        )}



        {/* ===== SUPER ADMIN ROUTES (HIGHEST PRIORITY) ===== */}
        <Route path="/tableserve/admin/dashboard" element={
          <RouteProtection allowedRoles={['admin']}>
            <Suspense fallback={<LoadingSpinner message="Loading Admin Dashboard..." />}>
              <SuperAdminDashboard />
            </Suspense>
          </RouteProtection>
        } />
        <Route path="/tableserve/admin/accounts/restaurants" element={<RouteProtection allowedRoles={['admin']}><RestaurantManagement /></RouteProtection>} />
        <Route path="/tableserve/admin/accounts/restaurant-premium" element={<RouteProtection allowedRoles={['admin']}><RestaurantPremiumManagement /></RouteProtection>} />
        <Route path="/tableserve/admin/accounts/zones" element={<RouteProtection allowedRoles={['admin']}><FoodZonesManagement /></RouteProtection>} />
        <Route path="/tableserve/admin/accounts/zone-advanced" element={<RouteProtection allowedRoles={['admin']}><ZoneAdvancedManagement /></RouteProtection>} />
        <Route path="/tableserve/admin/orders/live" element={<RouteProtection allowedRoles={['admin']}><LiveOrders /></RouteProtection>} />
        <Route path="/tableserve/admin/orders/history" element={<RouteProtection allowedRoles={['admin']}><OrderHistory /></RouteProtection>} />
        <Route path="/tableserve/admin/analytics/overview" element={<RouteProtection allowedRoles={['admin']}><RevenueAnalytics /></RouteProtection>} />
        <Route path="/tableserve/admin/analytics/revenue" element={<RouteProtection allowedRoles={['admin']}><RevenueAnalytics /></RouteProtection>} />
        <Route path="/tableserve/admin/analytics/reports" element={<RouteProtection allowedRoles={['admin']}><Reports /></RouteProtection>} />
        <Route path="/tableserve/admin/profile" element={<RouteProtection allowedRoles={['admin']}><AdminProfile /></RouteProtection>} />
        <Route path="/tableserve/admin/settings" element={<RouteProtection allowedRoles={['admin']}><AdminSettings /></RouteProtection>} />
        <Route path="/tableserve/admin/billing" element={<RouteProtection allowedRoles={['admin']}><AdminBilling /></RouteProtection>} />

        {/* ===== ZONE ADMIN ROUTES (SECOND PRIORITY) ===== */}
        <Route path="/tableserve/zone/:zoneId/dashboard" element={
          <RouteProtection allowedRoles={['zone_admin']}>
            <DashboardGuard businessType="zone">
              <Suspense fallback={<LoadingSpinner message="Loading Zone Dashboard..." />}>
                <ZoneAdminDashboard />
              </Suspense>
            </DashboardGuard>
          </RouteProtection>
        } />
        <Route path="/tableserve/zone/:zoneId/profile" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneProfile /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shops" element={<RouteProtection allowedRoles={['zone_admin']}><AllZoneShops /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shops/add" element={<RouteProtection allowedRoles={['zone_admin']}><AllZoneShops /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shops/revenue" element={<RouteProtection allowedRoles={['zone_admin']}><AllZoneShops /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shops/performance" element={<RouteProtection allowedRoles={['zone_admin']}><AllZoneShops /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/vendors" element={<RouteProtection allowedRoles={['zone_admin']}><AllZoneShops /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/vendors/list" element={<RouteProtection allowedRoles={['zone_admin']}><AllVendors /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/vendors/credentials" element={<RouteProtection allowedRoles={['zone_admin']}><VendorCredentials /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/requests/upgrade" element={<RouteProtection allowedRoles={['zone_admin']}><UpgradeRequests /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/menu/categories" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneMenuCategories /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/menu/items" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneMenuItems /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/menu/modifiers" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneMenuModifiers /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/menu/merged" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneMergedMenu /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/analytics/revenue" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneAnalytics /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/analytics/performance" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneAnalytics /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/qr/generator" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneAdminQRCodeGenerator /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/upgrade" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneAdminUpgrade /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/settings" element={<RouteProtection allowedRoles={['zone_admin']}><ZoneSettings /></RouteProtection>} />

        {/* ===== ZONE SHOP ROUTES (THIRD PRIORITY) ===== */}
        <Route path="/tableserve/zone/:zoneId/shop/:shopId" element={<Navigate to="dashboard" replace />} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/dashboard" element={
          <RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}>
            <Suspense fallback={<LoadingSpinner message="Loading Shop Dashboard..." />}>
              <ZoneShopDashboard />
            </Suspense>
          </RouteProtection>
        } />

        {/* All zone shop and vendor routes require zoneId in the URL */}
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/profile" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopProfile /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/menu/items" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><MenuItems /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/menu/categories" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><MenuCategories /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/menu/modifiers" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><MenuModifiers /></RouteProtection>} />

        <Route path="/tableserve/zone/:zoneId/shop/:shopId/orders/live" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopLiveOrders /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/orders/history" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopOrderHistory /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/orders/reports" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopOrderReports /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/analytics/revenue" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopAnalytics /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/analytics/performance" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopAnalytics /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/reports/transactions" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopTransactionReports /></RouteProtection>} />
        <Route path="/tableserve/zone/:zoneId/shop/:shopId/settings" element={<RouteProtection allowedRoles={['zone_shop', 'zone_vendor']}><ZoneShopSettings /></RouteProtection>} />

        {/* ===== RESTAURANT OWNER ROUTES (FOURTH PRIORITY - MOST SPECIFIC) ===== */}
        <Route path="/tableserve/restaurant/:restaurantId/dashboard" element={
          <RouteProtection allowedRoles={['restaurant_owner']}>
            <DashboardGuard businessType="restaurant">
              <Suspense fallback={<LoadingSpinner message="Loading Restaurant Dashboard..." />}>
                <SingleRestaurantDashboard />
              </Suspense>
            </DashboardGuard>
          </RouteProtection>
        } />
        <Route path="/tableserve/restaurant/:restaurantId/profile" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><ProfileManagementPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/menu/items" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><MenuManagementPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/menu/categories" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><MenuCategoriesPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/menu/modifiers" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><MenuModifiersPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/qr/generator" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><QRCodeGenerator /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/orders/live" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><OrderManagementPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/orders/history" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><OrderManagementPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/orders/feedback" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><OrderManagementPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/analytics/sales" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><AnalyticsPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/analytics/revenue" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><AnalyticsPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/analytics/export" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><AnalyticsPage /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/upgrade" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><SingleRestaurantUpgrade /></DashboardGuard></RouteProtection>} />
        <Route path="/tableserve/restaurant/:restaurantId/settings" element={<RouteProtection allowedRoles={['restaurant_owner']}><DashboardGuard businessType="restaurant"><SettingsPage /></DashboardGuard></RouteProtection>} />

        {/* ===== CUSTOMER-FACING ROUTES (QR CODE SYSTEM) ===== */}
        {/* Restaurant Customer Routes - Table-based QR System (Not Logged In) */}
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/home" element={<RestaurantHomeRedirect />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/menu" element={<DigitalMenuScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/product/:productId" element={<ProductDetailScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/cart" element={<CartScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/checkout" element={<CheckoutScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/success" element={<OrderSuccessScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/tracking" element={<OrderTrackingScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/otp-login" element={<OTPLoginScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/otp-login" element={<OTPLoginScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/otp-login" element={<OTPLoginScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/otp-login" element={<OTPLoginScreen />} />


        {/* Restaurant Customer Routes - Table-based QR System (Logged In) */}
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/home" element={<RestaurantUserHomeRedirect />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/menu" element={<DigitalMenuScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/product/:productId" element={<ProductDetailScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/cart" element={<CartScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/checkout" element={<CheckoutScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/success" element={<OrderSuccessScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/tracking" element={<OrderTrackingScreen />} />
        <Route path="/tableserve/restaurant/:restaurantId/table/:tableId/user/:userId/profile" element={<UserProfile />} />

        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/shops" element={<ZoneShopSelection />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/shop/:shopId/menu" element={<ZoneDigitalMenuScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/shop/:shopId/product/:productId" element={<ProductDetailScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/cart" element={<CartScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/checkout" element={<CheckoutScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/success" element={<OrderSuccessScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/tracking" element={<OrderTrackingScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/profile" element={<UserProfile />} />

        {/* Zone Customer Routes - Zone-Wide Table System */}
        <Route path="/tableserve/zone/:zoneId/table/:tableId/home" element={<ZoneHomeRedirect />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/shops" element={<ZoneShopSelection />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/shop/:shopId/menu" element={<ZoneDigitalMenuScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/shop/:shopId/product/:productId" element={<ProductDetailScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/cart" element={<CartScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/checkout" element={<CheckoutScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/success" element={<OrderSuccessScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/tracking" element={<OrderTrackingScreen />} />

        {/* ===== ZONE USER ROUTES (NEW PATTERN) ===== */}
        {/* Zone User Routes - /tableserve/zone/:zoneId/table/:tableId/user/:userId/* */}
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId" element={<ZoneUserRedirect />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/home" element={<ZoneUserHomeRedirect />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/shops" element={<ZoneShopSelectionScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/menu" element={<ZoneDigitalMenuScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/shop/:shopId/menu" element={<ZoneDigitalMenuScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/cart" element={<ZoneCartScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/checkout" element={<CheckoutScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/success" element={<OrderSuccessScreen />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/tracking" element={<OrderTrackingScreen />} />

        {/* Catch-all routes for problematic patterns */}
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/home/shops" element={<HomeShopsRedirect />} />
        <Route path="/tableserve/zone/:zoneId/table/:tableId/user/:userId/home/*" element={<HomeShopsRedirect />} />

        {/* Enhanced QR System Routes - Multiple URL patterns supported */}



        {/* Legacy redirects */}
        <Route path="/tableserve/admin" element={<Navigate to="/admin/dashboard" />} />
        <Route path="/tableserve/admin/login" element={<Navigate to="/tableserve/login" />} />
        <Route path="/tableserve/owner/login" element={<Navigate to="/tableserve/login" />} />
        <Route path="/tableserve/zone-admin/login" element={<Navigate to="/tableserve/login" />} />
        <Route path="/tableserve/zone-shop/login" element={<Navigate to="/tableserve/login" />} />
      </Routes>
        </CartProvider>
    </Router>
  </ErrorBoundary>
);
}

// Main App component that provides Redux context
function App() {
  return <AppContent />;
}

export default App;