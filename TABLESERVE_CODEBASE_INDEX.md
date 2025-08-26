# TableServe Codebase Index

## Project Overview
TableServe is a modern QR-based restaurant ordering system built with React, Redux Toolkit, and Tailwind CSS. It supports multiple user roles including Super Admins, Restaurant Owners, Zone Admins, Zone Shop Owners, and Customers.

## Tech Stack
- **Frontend**: React 19, Redux Toolkit, React Router DOM v7
- **Styling**: Tailwind CSS, Framer Motion
- **Icons**: React Icons
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Animations**: Framer Motion

## Project Structure
```
src/
├── assets/              # Static assets (images, icons)
├── components/          # Reusable UI components
│   ├── admin/          # Super Admin components
│   ├── auth/           # Authentication components
│   ├── common/         # Shared components
│   ├── customer/       # Customer-facing components
│   ├── owner/          # Restaurant owner components
│   ├── user/           # Simple user components
│   ├── zoneadmin/      # Zone admin components
│   └── zoneshop/       # Zone shop components
├── pages/               # Page components
│   ├── owner/          # Owner dashboard pages
│   └── user/           # Customer pages
├── screens/             # Marketing website screens
├── services/            # API services and business logic
├── store/               # Redux store and slices
└── routes/              # Route configurations
```

## Core Components

### Authentication & User Management
- **Login Page** (`src/pages/Login.jsx`): Unified login for all staff roles (admin, owner, zone-admin, zone-shop)
- **Customer Login** (`src/pages/CustomerLogin.jsx`): Customer access point via restaurant slug
- **Protected Routes** (`src/components/auth/ProtectedRoute.jsx`): Route protection based on user roles
- **Auth Slice** (`src/store/slices/authSlice.js`): Authentication state management

### Customer Experience
- **Digital Menu** (`src/components/customer/DigitalMenu.jsx`): Interactive menu with filtering, search, and cart functionality
- **Restaurant Footer** (`src/components/customer/RestaurantFooter.jsx`): Restaurant information display
- **Customer Profile** (`src/components/customer/CustomerProfile.jsx`): Customer account management
- **Cart Management** (`src/components/customer/CartManagement.jsx`): Shopping cart functionality
- **Order Tracking** (`src/components/customer/OrderTracking.jsx`): Real-time order status updates
- **Payment Phase** (`src/components/customer/PaymentPhase.jsx`): Payment processing interface
- **QR Scanner** (`src/components/customer/QRScanner.jsx`): QR code scanning functionality
- **QR Direct Access** (`src/components/customer/QRDirectAccess.jsx`): Direct QR-based access to restaurant

### Super Admin Dashboard
- **Dashboard** (`src/components/admin/SuperAdminDashboard.jsx`): Platform overview with KPIs and analytics
- **Layout** (`src/components/admin/SuperAdminLayout.jsx`): Main layout with sidebar and navbar
- **Sidebar** (`src/components/admin/SuperAdminSidebar.jsx`): Navigation menu with collapsible sections
- **Analytics** (`src/components/admin/analytics/RevenueAnalytics.jsx`): Revenue tracking and reporting
- **Restaurant Management** (`src/components/admin/RestaurantManagement.jsx`): Restaurant account management
- **Account Management** (`src/components/admin/accounts/`): Management of different user types
- **Support Tools** (`src/components/admin/support/VendorAssistance.jsx`): Vendor support functionality

### Zone Shop Management
- **Live Orders** (`src/components/zoneshop/orders/LiveOrders.jsx`): Real-time order processing interface
- **Layout** (`src/components/zoneshop/ZoneShopLayout.jsx`): Zone shop interface layout
- **Menu Management** (`src/components/zoneshop/menu/`): Menu items, categories, and modifiers management
- **Order History** (`src/components/zoneshop/orders/OrderHistory.jsx`): Historical order tracking

### Restaurant Owner Dashboard
- **Single Restaurant Dashboard** (`src/components/owner/SingleRestaurantDashboard.jsx`): Owner's main dashboard
- **QR Code Generator** (`src/components/owner/QRCodeGenerator.jsx`): QR code generation for tables
- **Layout Components** (`src/components/owner/SingleRestaurantLayout.jsx`): Owner interface layout

### Marketing Website
- **Home Page** (`src/screens/HomePage.jsx`): Main landing page
- **Services** (`src/screens/Services.jsx`): Service offerings
- **About** (`src/screens/About.jsx`): Company information
- **Contact** (`src/screens/Contact.jsx`): Contact information
- **Layout** (`src/components/Layout.jsx`): Marketing website layout

## Redux Store

### State Slices
- **authSlice** (`src/store/slices/authSlice.js`): User authentication and session management
- **restaurantSlice** (`src/store/slices/restaurantSlice.js`): Restaurant data management
- **menuSlice** (`src/store/slices/menuSlice.js`): Menu items and categories management
- **orderSlice** (`src/store/slices/orderSlice.js`): Order processing and tracking
- **analyticsSlice** (`src/store/slices/analyticsSlice.js`): Analytics data management
- **cartSlice** (`src/store/slices/cartSlice.js`): Shopping cart state
- **ownerSlice** (`src/store/slices/ownerSlice.js`): Restaurant owner data
- **activitySlice** (`src/store/slices/activitySlice.js`): Activity logging and monitoring

### Store Configuration
- **Main Store** (`src/store/index.js`): Redux store setup with all reducers

## Services & Utilities

### API Service
- **API Client** (`src/services/api.js`): Axios-based API client with interceptors
- **Order Processing Service** (`src/services/OrderProcessingService.js`): Business logic for order handling across different restaurant types

## User Roles & Permissions

1. **Super Admin** (`admin`): Platform management, restaurant oversight, analytics
2. **Restaurant Owner** (`owner`): Menu management, order processing, restaurant analytics
3. **Zone Admin** (`zone-admin`): Food zone management, vendor oversight
4. **Zone Shop Owner** (`zone-shop`): Individual shop management within food zones
5. **Customer** (`customer`): QR-based ordering, order tracking, profile management

## Routing Structure

### Marketing Website
- `/` - Home page
- `/services` - Services overview
- `/about` - About page
- `/contact` - Contact information

### Authentication
- `/tableserve/login` - Staff login portal
- `/customer/:restaurantSlug` - Customer access point

### Super Admin
- `/admin/dashboard` - Dashboard overview
- `/admin/accounts/*` - Account management
- `/admin/analytics/*` - Analytics and revenue tracking
- `/admin/support/*` - Support tools

### Restaurant Owner
- `/owner/dashboard` - Owner dashboard
- `/owner/menu/*` - Menu management
- `/owner/orders/*` - Order processing
- `/owner/analytics/*` - Business analytics

### Zone Admin
- `/zone-admin/dashboard` - Zone admin dashboard
- `/zone-admin/vendors/*` - Vendor management
- `/zone-admin/orders/*` - Zone order management

### Zone Shop
- `/zone-shop/dashboard` - Shop dashboard
- `/zone-shop/menu/*` - Menu management
- `/zone-shop/orders/*` - Order processing

### Customer Experience
- `/customer/:restaurantSlug/menu` - Digital menu
- `/customer/:restaurantSlug/cart` - Shopping cart
- `/customer/:restaurantSlug/payment` - Payment processing
- `/customer/:restaurantSlug/tracking` - Order tracking
- `/customer/:restaurantSlug/profile` - Customer profile

### QR-based Access
- `/r/:restaurantSlug/t/:tableNumber` - Restaurant QR access
- `/z/:zoneSlug/t/:tableNumber` - Zone QR access
- `/scan/:encodedData` - QR scanner endpoint

## Styling & UI

### Tailwind Configuration
- **Colors**: Primary (#0D0D0D), Accent (#FF6B00)
- **Fonts**: Fredoka One (headings), Raleway (body)
- **Custom Utilities**: Line clamping, scrollbar hiding, autofill fixes

### Animation Libraries
- **Framer Motion**: Component animations and transitions
- **AOS**: Scroll animations for marketing pages

## Environment Configuration

### Environment Variables
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version

### Configuration Files
- **Tailwind** (`tailwind.config.js`): Tailwind CSS configuration
- **Vite** (`vite.config.js`): Build tool configuration
- **ESLint** (`eslint.config.js`): Code linting rules
- **PostCSS** (`postcss.config.js`): CSS processing configuration

## Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Key Features
1. **Multi-role Access**: Single codebase supporting multiple user types
2. **QR-based Ordering**: Table-specific QR codes for customer access
3. **Real-time Order Management**: Live order tracking and status updates
4. **Responsive Design**: Mobile-first approach with adaptive layouts
5. **Analytics Dashboard**: Comprehensive business insights
6. **Menu Management**: Flexible menu creation and modification
7. **Customer Profiles**: Personalized experiences with preferences
8. **Activity Logging**: Comprehensive audit trail for admin actions
