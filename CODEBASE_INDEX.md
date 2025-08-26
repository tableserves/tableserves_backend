# TableServe Codebase Index

## Project Overview
TableServe is a modern QR-based restaurant ordering system built with React 19, Redux Toolkit, and Tailwind CSS. It supports multiple user roles including Super Admins, Restaurant Owners, Zone Admins, Zone Shop Owners, and Customers.

## Tech Stack
- **Frontend**: React 19, Redux Toolkit, React Router DOM v7
- **Styling**: Tailwind CSS, Framer Motion
- **Icons**: React Icons
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Animations**: Framer Motion
- **PDF Generation**: jsPDF, html2canvas
- **QR Code**: qrcode, qrcode.react

## Project Structure

```
src/
├── assets/              # Static assets (images, icons)
├── components/          # Reusable UI components
│   ├── admin/           # Super Admin components
│   ├── auth/            # Authentication components
│   ├── common/          # Shared components
│   ├── customer/        # Customer-facing components
│   ├── debug/           # Debugging components
│   ├── owner/           # Restaurant owner components
│   ├── payment/         # Payment processing components
│   ├── subscription/    # Subscription management components
│   ├── test/            # Test components
│   ├── user/            # Simple user components
│   ├── zoneadmin/       # Zone admin components
│   └── zoneshop/        # Zone shop components
├── constants/           # Application constants
├── context/             # React context providers
├── hooks/               # Custom React hooks
├── pages/               # Page components
│   ├── admin/           # Admin dashboard pages
│   ├── customer_user/   # Customer pages
│   ├── owner/           # Restaurant owner pages
│   ├── user/            # User pages
│   └── zone_user/       # Zone user pages
├── routes/              # Route configurations
├── screens/             # Marketing website screens
├── services/            # API services and business logic
├── store/               # Redux store and slices
│   └── slices/          # Redux slices
├── styles/              # Global styles
└── utils/               # Utility functions
```

## Core Components

### Authentication & User Management
- **Login Page** (`src/pages/Login.jsx`): Unified login for all staff roles (admin, owner, zone-admin, zone-shop)
- **Customer Login** (`src/pages/CustomerLogin.jsx`): Customer access point via restaurant slug
- **Auth Slice** (`src/store/slices/authSlice.js`): Authentication state management
- **Auth Service** (`src/services/AuthService.js`): Authentication logic for different user roles

### Customer Experience
- **Digital Menu** (`src/components/customer/DigitalMenu.jsx`): Interactive menu with filtering, search, and cart functionality
- **Cart Management** (`src/components/customer/CartManagement.jsx`): Shopping cart functionality
- **Order Tracking** (`src/components/customer/OrderTracking.jsx`): Real-time order status updates
- **Payment Phase** (`src/components/customer/PaymentPhase.jsx`): Payment processing interface
- **QR Scanner** (`src/components/customer/QRScanner.jsx`): QR code scanning functionality

### Super Admin Dashboard
- **Dashboard** (`src/components/admin/SuperAdminDashboard.jsx`): Platform overview with KPIs and analytics
- **Restaurant Management** (`src/components/admin/accounts/RestaurantManagement.jsx`): Restaurant account management
- **Analytics** (`src/components/admin/analytics/RevenueAnalytics.jsx`): Revenue tracking and reporting

### Zone Shop Management
- **Live Orders** (`src/components/zoneshop/orders/LiveOrders.jsx`): Real-time order processing interface
- **Menu Management** (`src/components/zoneshop/menu/`): Menu items, categories, and modifiers management
- **Order History** (`src/components/zoneshop/orders/OrderHistory.jsx`): Historical order tracking

### Restaurant Owner Dashboard
- **Single Restaurant Dashboard** (`src/components/owner/SingleRestaurantDashboard.jsx`): Owner's main dashboard
- **QR Code Generator** (`src/components/owner/QRCodeGenerator.jsx`): QR code generation for tables
- **Menu Management** (`src/pages/owner/MenuManagement.jsx`): Menu items management

### Marketing Website
- **Home Page** (`src/screens/HomePage.jsx`): Main landing page
- **Services** (`src/screens/Services.jsx`): Service offerings
- **About** (`src/screens/About.jsx`): Company information
- **Contact** (`src/screens/Contact.jsx`): Contact information

## Redux Store

### State Slices
- **authSlice** (`src/store/slices/authSlice.js`): User authentication and session management
- **menuCategoriesSlice** (`src/store/slices/menuCategoriesSlice.js`): Menu categories management
- **menuItemsSlice** (`src/store/slices/menuItemsSlice.js`): Menu items management
- **menuModifiersSlice** (`src/store/slices/menuModifiersSlice.js`): Menu modifiers management
- **subscriptionSlice** (`src/store/slices/subscriptionSlice.js`): Subscription management
- **themeSlice** (`src/store/slices/themeSlice.js`): Theme management
- **vendorsSlice** (`src/store/slices/vendorsSlice.js`): Vendors management
- **zoneSlice** (`src/store/slices/zoneSlice.js`): Zone management
- **zoneMenuCategoriesSlice** (`src/store/slices/zoneMenuCategoriesSlice.js`): Zone menu categories
- **zoneMenuModifiersSlice** (`src/store/slices/zoneMenuModifiersSlice.js`): Zone menu modifiers

### Store Configuration
- **Main Store** (`src/store/index.js`): Redux store setup with all reducers and redux-persist

## Services & Utilities

### API Service
- **Auth Service** (`src/services/AuthService.js`): Authentication logic for different user roles
- **Local Storage Service** (`src/services/LocalStorageService.js`): Data persistence using localStorage
- **Analytics Service** (`src/services/AnalyticsService.js`): Analytics data processing
- **Data Service** (`src/services/DataService.js`): Data management
- **Order Processing Service** (`src/services/OrderProcessingService.js`): Order handling
- **OTP Service** (`src/services/OTPService.js`): One-time password functionality
- **Report Service** (`src/services/ReportService.js`): Report generation
- **Subscription Service** (`src/services/SubscriptionService.js`): Subscription management

## User Roles & Permissions

1. **Super Admin** (`admin`): Platform management, restaurant oversight, analytics
2. **Restaurant Owner** (`restaurant_owner`): Menu management, order processing, restaurant analytics
3. **Zone Admin** (`zone_admin`): Food zone management, vendor oversight
4. **Zone Shop Owner** (`zone_shop`): Individual shop management within food zones
5. **Zone Vendor** (`zone_vendor`): Vendor management within zones
6. **Customer** (`customer`): QR-based ordering, order tracking, profile management

## Routing Structure

### Marketing Website
- `/tableserve` - Home page
- `/tableserve/services` - Services overview
- `/tableserve/about` - About page
- `/tableserve/contact` - Contact information

### Authentication
- `/tableserve/login` - Staff login portal
- `/tableserve/signup` - Signup page (guarded by plan selection)
- `/tableserve/choose-plan` - Plan selection page

### Super Admin
- `/tableserve/admin/dashboard` - Dashboard overview
- `/tableserve/admin/accounts/*` - Account management
- `/tableserve/admin/analytics/*` - Analytics and revenue tracking
- `/tableserve/admin/orders/*` - Order management

### Restaurant Owner
- `/tableserve/restaurant/:restaurantId/dashboard` - Owner dashboard
- `/tableserve/restaurant/:restaurantId/menu/*` - Menu management
- `/tableserve/restaurant/:restaurantId/orders/*` - Order processing
- `/tableserve/restaurant/:restaurantId/analytics/*` - Business analytics
- `/tableserve/restaurant/:restaurantId/qr/generator` - QR code generation

### Zone Admin
- `/tableserve/zone/:zoneId/dashboard` - Zone admin dashboard
- `/tableserve/zone/:zoneId/shops/*` - Shop management
- `/tableserve/zone/:zoneId/vendors/*` - Vendor management
- `/tableserve/zone/:zoneId/menu/*` - Menu management
- `/tableserve/zone/:zoneId/analytics/*` - Analytics

### Zone Shop
- `/tableserve/zone/:zoneId/shop/:shopId/dashboard` - Shop dashboard
- `/tableserve/zone/:zoneId/shop/:shopId/menu/*` - Menu management
- `/tableserve/zone/:zoneId/shop/:shopId/orders/*` - Order processing
- `/tableserve/zone/:zoneId/shop/:shopId/analytics/*` - Analytics

### Customer Experience
- `/tableserve/restaurant/:restaurantId/table/:tableId/menu` - Digital menu
- `/tableserve/restaurant/:restaurantId/table/:tableId/cart` - Shopping cart
- `/tableserve/restaurant/:restaurantId/table/:tableId/checkout` - Checkout
- `/tableserve/restaurant/:restaurantId/table/:tableId/tracking` - Order tracking

### Zone Customer Experience
- `/tableserve/zone/:zoneId/table/:tableId/shops` - Zone shop selection
- `/tableserve/zone/:zoneId/table/:tableId/shop/:shopId/menu` - Digital menu
- `/tableserve/zone/:zoneId/table/:tableId/cart` - Shopping cart
- `/tableserve/zone/:zoneId/table/:tableId/checkout` - Checkout
- `/tableserve/zone/:zoneId/table/:tableId/tracking` - Order tracking

## Data Management

The application uses localStorage for data persistence through the LocalStorageService. Key data entities include:

1. **Restaurants**: Restaurant information and settings
2. **Zones**: Food zone information and settings
3. **Zone Shops**: Shops within food zones
4. **Zone Vendors**: Vendors within food zones
5. **Menu Items**: Restaurant and shop menu items
6. **Menu Categories**: Menu categorization
7. **Menu Modifiers**: Customization options for menu items
8. **Orders**: Customer orders and status
9. **User Credentials**: Authentication information

## Key Features

1. **Multi-role Access**: Single codebase supporting multiple user types
2. **QR-based Ordering**: Table-specific QR codes for customer access
3. **Real-time Order Management**: Live order tracking and status updates
4. **Responsive Design**: Mobile-first approach with adaptive layouts
5. **Analytics Dashboard**: Comprehensive business insights
6. **Menu Management**: Flexible menu creation and modification
7. **Theme System**: Light/dark mode support with theme transitions
8. **OTP Authentication**: One-time password for customer verification

## Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint