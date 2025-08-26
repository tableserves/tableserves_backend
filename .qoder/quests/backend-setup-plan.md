# TableServe Backend Setup Plan

## Overview

This document outlines the backend architecture setup for TableServe, a multi-tenant QR-based restaurant ordering platform. The backend will support multiple user roles (Super Admin, Restaurant Owners, Zone Admins, Zone Shops/Vendors) with subscription-based access control.

## Technology Stack

### Core Framework
- **Node.js** with **Express.js** - RESTful API server
- **JavaScript (ES6+)** - Modern JavaScript with ES modules
- **JWT** - Authentication and authorization

### Database Layer
- **MongoDB Atlas** - Cloud-hosted MongoDB database service
- **Mongoose ODM** - Object document modeling and schema validation
- **Redis** - Session storage, caching, and real-time features

### Infrastructure & DevOps
- **Docker** - Containerization
- **PM2** - Process management
- **Winston** - Logging
- **Helmet** - Security middleware

### Additional Services
- **Socket.io** - Real-time order updates
- **Cloudinary** - Image storage and transformation
- **Nodemailer** - Email services
- **QR Code Generator** - Dynamic QR generation

## MongoDB Atlas Benefits for TableServe

### Cloud-Native Advantages
- **Automatic Scaling**: Handle traffic spikes during peak dining hours
- **Global Distribution**: Low-latency access for international restaurant chains
- **Automatic Backups**: Point-in-time recovery with continuous backups
- **Security**: Enterprise-grade security with encryption at rest and in transit
- **Monitoring**: Built-in performance monitoring and alerting

### Cost Optimization
- **Pay-as-you-scale**: Start with free tier, scale based on usage
- **No Infrastructure Management**: Focus on application development
- **Automatic Optimization**: Performance advisor for query optimization

### Development Productivity
- **Atlas Data API**: REST API access for rapid prototyping
- **Atlas Search**: Full-text search capabilities for menu items
- **Charts**: Built-in analytics and visualization tools
- **Realm Sync**: Real-time data synchronization for mobile apps

### Production Readiness
- **99.995% SLA**: High availability for restaurant operations
- **Multi-region clusters**: Disaster recovery and data residency
- **GDPR Compliance**: Data privacy and protection standards
- **SOC 2 Certified**: Enterprise security standards

## Database Architecture

## Database Architecture

### MongoDB Atlas Configuration

```javascript
// Database connection setup for MongoDB Atlas
const mongoose = require('mongoose');

// MongoDB Atlas connection string format
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority';

// Connection options for MongoDB Atlas
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferMaxEntries: 0, // Disable mongoose buffering
  bufferCommands: false, // Disable mongoose buffering
};

// Database connection function
const connectDatabase = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    console.log('✅ MongoDB Atlas connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB Atlas connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB Atlas disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Atlas reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB Atlas connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error during database disconnection:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error);
    process.exit(1);
  }
};

module.exports = { connectDatabase };
```

### MongoDB Atlas Security Configuration

```javascript
// Security best practices for MongoDB Atlas
const atlasSecurityConfig = {
  // Network Access
  ipWhitelist: [
    '0.0.0.0/0', // Allow from anywhere (development only)
    // 'YOUR_SERVER_IP/32', // Specific server IP (production)
    // 'YOUR_OFFICE_IP/32'  // Office IP range
  ],
  
  // Database User Roles
  databaseUsers: {
    admin: {
      username: 'tableserve-admin',
      roles: ['atlasAdmin', 'readWriteAnyDatabase']
    },
    application: {
      username: 'tableserve-app',
      roles: ['readWrite'] // Limited to specific database
    },
    readonly: {
      username: 'tableserve-readonly',
      roles: ['read'] // Read-only access for analytics
    }
  },
  
  // Connection Security
  sslMode: 'require',
  authSource: 'admin',
  retryWrites: true,
  w: 'majority' // Write concern for data durability
};
```

#### Users Collection
```javascript
// users collection
{
  _id: ObjectId,
  email: String, // unique index
  phone: String, // unique index
  passwordHash: String,
  role: String, // enum: ['admin', 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor']
  emailVerified: Boolean,
  phoneVerified: Boolean,
  profile: {
    name: String,
    avatar: String, // Cloudinary URL
    address: String,
    settings: Object
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Subscriptions Collection
```javascript
// subscriptions collection
{
  _id: ObjectId,
  userId: ObjectId, // ref to users
  planKey: String,
  planType: String, // 'restaurant', 'zone', 'admin'
  features: {
    crudMenu: Boolean,
    qrGeneration: Boolean,
    vendorManagement: Boolean,
    analytics: Boolean,
    qrCustomization: Boolean,
    modifiers: Boolean,
    watermark: Boolean,
    unlimited: Boolean
  },
  limits: {
    maxTables: Number,
    maxShops: Number,
    maxVendors: Number,
    maxCategories: Number,
    maxMenuItems: Number
  },
  status: String, // 'active', 'expired', 'cancelled'
  price: Number,
  startDate: Date,
  endDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Restaurants Collection
```javascript
// restaurants collection
{
  _id: ObjectId,
  ownerId: ObjectId, // ref to users
  subscriptionId: ObjectId, // ref to subscriptions
  name: String,
  description: String,
  address: String,
  phone: String,
  email: String,
  logo: String, // Cloudinary URL
  images: [String], // Array of Cloudinary URLs
  settings: {
    theme: Object,
    qrCustomization: Object,
    orderSettings: Object
  },
  tables: [{
    number: Number,
    qrCode: String, // Generated QR code data
    active: Boolean
  }],
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Zones Collection
```javascript
// zones collection
{
  _id: ObjectId,
  adminId: ObjectId, // ref to users
  subscriptionId: ObjectId, // ref to subscriptions
  name: String,
  description: String,
  location: String,
  settings: {
    theme: Object,
    orderSettings: Object,
    paymentSettings: Object
  },
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Shops Collection
```javascript
// shops collection
{
  _id: ObjectId,
  zoneId: ObjectId, // ref to zones
  vendorId: ObjectId, // ref to users
  name: String,
  description: String,
  contactInfo: {
    phone: String,
    email: String,
    address: String
  },
  logo: String, // Cloudinary URL
  images: [String], // Array of Cloudinary URLs
  status: String, // 'active', 'inactive', 'pending'
  settings: Object,
  createdAt: Date,
  updatedAt: Date
}
```

#### MenuCategories Collection
```javascript
// menuCategories collection
{
  _id: ObjectId,
  restaurantId: ObjectId, // ref to restaurants (optional)
  zoneId: ObjectId, // ref to zones (optional)
  name: String,
  description: String,
  image: String, // Cloudinary URL
  sortOrder: Number,
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### MenuItems Collection
```javascript
// menuItems collection
{
  _id: ObjectId,
  categoryId: ObjectId, // ref to menuCategories
  restaurantId: ObjectId, // ref to restaurants (optional)
  zoneId: ObjectId, // ref to zones (optional)
  name: String,
  description: String,
  price: Number,
  images: [String], // Array of Cloudinary URLs
  modifiers: [{
    name: String,
    options: [{
      name: String,
      price: Number
    }],
    required: Boolean,
    multiple: Boolean
  }],
  available: Boolean,
  sortOrder: Number,
  tags: [String],
  nutritionInfo: Object,
  createdAt: Date,
  updatedAt: Date
}
```

#### Orders Collection
```javascript
// orders collection
{
  _id: ObjectId,
  orderNumber: String, // unique order identifier
  restaurantId: ObjectId, // ref to restaurants (optional)
  zoneId: ObjectId, // ref to zones (optional)
  shopId: ObjectId, // ref to shops (optional)
  tableNumber: Number,
  customer: {
    name: String,
    phone: String,
    email: String
  },
  items: [{
    menuItemId: ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    modifiers: [{
      name: String,
      options: [String],
      price: Number
    }],
    specialInstructions: String
  }],
  totalAmount: Number,
  tax: Number,
  discount: Number,
  finalAmount: Number,
  status: String, // 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
  paymentStatus: String, // 'pending', 'paid', 'failed', 'refunded'
  deliveryInfo: {
    type: String, // 'pickup', 'table_service'
    estimatedTime: Number,
    actualTime: Number
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    updatedBy: ObjectId
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### MongoDB Indexes

```javascript
// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 }, { unique: true })
db.users.createIndex({ role: 1 })

// Subscriptions collection indexes
db.subscriptions.createIndex({ userId: 1 })
db.subscriptions.createIndex({ status: 1 })
db.subscriptions.createIndex({ endDate: 1 })

// Restaurants collection indexes
db.restaurants.createIndex({ ownerId: 1 })
db.restaurants.createIndex({ active: 1 })

// Zones collection indexes
db.zones.createIndex({ adminId: 1 })
db.zones.createIndex({ active: 1 })

// Shops collection indexes
db.shops.createIndex({ zoneId: 1 })
db.shops.createIndex({ vendorId: 1 })
db.shops.createIndex({ status: 1 })

// MenuCategories collection indexes
db.menuCategories.createIndex({ restaurantId: 1 })
db.menuCategories.createIndex({ zoneId: 1 })
db.menuCategories.createIndex({ active: 1 })

// MenuItems collection indexes
db.menuItems.createIndex({ categoryId: 1 })
db.menuItems.createIndex({ restaurantId: 1 })
db.menuItems.createIndex({ zoneId: 1 })
db.menuItems.createIndex({ available: 1 })
db.menuItems.createIndex({ tags: 1 })

// Orders collection indexes
db.orders.createIndex({ orderNumber: 1 }, { unique: true })
db.orders.createIndex({ restaurantId: 1 })
db.orders.createIndex({ zoneId: 1 })
db.orders.createIndex({ shopId: 1 })
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ createdAt: -1 })
db.orders.createIndex({ "customer.phone": 1 })
```

## API Architecture

### Authentication & Authorization

```mermaid
sequenceDiagram
    participant Client
    participant AuthMiddleware
    participant AuthService
    participant Database
    participant JWTService
    
    Client->>AuthMiddleware: Request with JWT
    AuthMiddleware->>JWTService: Validate Token
    JWTService-->>AuthMiddleware: Token Valid/Invalid
    
    alt Token Valid
        AuthMiddleware->>Database: Get User & Subscription
        Database-->>AuthMiddleware: User Data
        AuthMiddleware->>Client: Allow Request
    else Token Invalid/Expired
        AuthMiddleware->>Client: 401 Unauthorized
    end
```

### Role-Based Access Control

```javascript
// User permissions structure
const userPermissions = {
  role: 'super_admin', // 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'
  subscription: {
    planType: 'admin', // 'restaurant', 'zone'
    features: {
      crudMenu: true,
      qrGeneration: true,
      vendorManagement: true,
      analytics: true,
      modifiers: true,
      unlimited: true
    },
    limits: {
      maxTables: null, // null for unlimited
      maxShops: null,
      maxVendors: null,
      maxCategories: null,
      maxMenuItems: null
    }
  }
};

// Permission check middleware
const checkPermission = (requiredFeature, requiredRole = null) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      // Check role if required
      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { message: 'Insufficient role permissions' }
        });
      }
      
      // Check feature permission
      if (requiredFeature && !user.subscription.features[requiredFeature]) {
        return res.status(403).json({
          success: false,
          error: { message: `Feature '${requiredFeature}' not available in your plan` }
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: 'Permission check failed' }
      });
    }
  };
};
```

### API Endpoints Structure

#### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/reset-password
POST /api/auth/verify-email
POST /api/auth/verify-phone
```

#### Super Admin Endpoints
```
GET    /api/admin/analytics
GET    /api/admin/users
GET    /api/admin/subscriptions
PUT    /api/admin/users/:id/subscription
DELETE /api/admin/users/:id
```

#### Restaurant Management
```
GET    /api/restaurants
POST   /api/restaurants
GET    /api/restaurants/:id
PUT    /api/restaurants/:id
DELETE /api/restaurants/:id
POST   /api/restaurants/:id/qr-generate
```

#### Zone Management
```
GET    /api/zones
POST   /api/zones
GET    /api/zones/:id
PUT    /api/zones/:id
DELETE /api/zones/:id

GET    /api/zones/:id/vendors
POST   /api/zones/:id/vendors
PUT    /api/zones/:id/vendors/:vendorId
DELETE /api/zones/:id/vendors/:vendorId

GET    /api/zones/:id/shops
POST   /api/zones/:id/shops
PUT    /api/zones/:id/shops/:shopId
DELETE /api/zones/:id/shops/:shopId
```

#### Menu Management
```
GET    /api/restaurants/:id/menu/categories
POST   /api/restaurants/:id/menu/categories
PUT    /api/restaurants/:id/menu/categories/:categoryId
DELETE /api/restaurants/:id/menu/categories/:categoryId

GET    /api/restaurants/:id/menu/items
POST   /api/restaurants/:id/menu/items
PUT    /api/restaurants/:id/menu/items/:itemId
DELETE /api/restaurants/:id/menu/items/:itemId

GET    /api/zones/:id/menu/categories
POST   /api/zones/:id/menu/categories
PUT    /api/zones/:id/menu/categories/:categoryId
DELETE /api/zones/:id/menu/categories/:categoryId
```

#### Order Management
```
GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/status
DELETE /api/orders/:id

GET    /api/restaurants/:id/orders
GET    /api/zones/:id/orders
GET    /api/shops/:id/orders
```

#### Analytics
```
GET    /api/analytics/restaurant/:id
GET    /api/analytics/zone/:id
GET    /api/analytics/platform
GET    /api/analytics/export/:type
```

## Business Logic Layer

### Subscription Service

```mermaid
flowchart TD
    A[User Request] --> B{Check User Role}
    B -->|Super Admin| C[Unlimited Access]
    B -->|Restaurant Owner| D[Check Restaurant Subscription]
    B -->|Zone Admin| E[Check Zone Subscription]
    B -->|Shop/Vendor| F[Check Zone Subscription]
    
    D --> G{Valid Subscription?}
    E --> G
    F --> G
    
    G -->|Yes| H[Check Feature Limits]
    G -->|No| I[Return 403 Forbidden]
    
    H --> J{Within Limits?}
    J -->|Yes| K[Allow Operation]
    J -->|No| L[Return 429 Limit Exceeded]
```

### Order Processing Flow

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Confirmed : Restaurant/Shop Accepts
    Pending --> Cancelled : Timeout/Rejection
    
    Confirmed --> Preparing : Start Cooking
    Preparing --> Ready : Food Ready
    Ready --> Completed : Customer Pickup/Delivery
    
    Confirmed --> Cancelled : Cancellation Request
    Preparing --> Cancelled : Cancellation Request
    
    Cancelled --> [*]
    Completed --> [*]
```

### QR Code Generation Service

```javascript
// QR Code Service implementation
class QRCodeService {
  /**
   * Generate QR code for restaurant table
   * @param {string} restaurantId - Restaurant ID
   * @param {number} tableNumber - Table number (optional)
   * @returns {Promise<string>} QR code data URL
   */
  static async generateRestaurantQR(restaurantId, tableNumber = null) {
    const qrData = {
      type: 'restaurant',
      id: restaurantId,
      tableNumber: tableNumber,
      timestamp: Date.now()
    };
    
    const qrString = JSON.stringify(qrData);
    return await QRCode.toDataURL(qrString);
  }
  
  /**
   * Generate QR code for zone/shop
   * @param {string} zoneId - Zone ID
   * @param {string} shopId - Shop ID (optional)
   * @returns {Promise<string>} QR code data URL
   */
  static async generateZoneQR(zoneId, shopId = null) {
    const qrData = {
      type: shopId ? 'shop' : 'zone',
      id: shopId || zoneId,
      zoneId: zoneId,
      timestamp: Date.now()
    };
    
    const qrString = JSON.stringify(qrData);
    return await QRCode.toDataURL(qrString);
  }
  
  /**
   * Generate custom QR code with customization options
   * @param {Object} qrData - QR code data
   * @param {Object} customization - Customization options
   * @returns {Promise<string>} QR code data URL
   */
  static async generateCustomQR(qrData, customization = {}) {
    const options = {
      width: customization.size || 256,
      color: {
        dark: customization.colors?.foreground || '#000000',
        light: customization.colors?.background || '#FFFFFF'
      },
      type: customization.format || 'png'
    };
    
    const qrString = JSON.stringify(qrData);
    
    if (customization.logo) {
      // Add logo overlay using canvas manipulation
      return await this.addLogoToQR(qrString, customization.logo, options);
    }
    
    return await QRCode.toDataURL(qrString, options);
  }
  
  /**
   * Add logo overlay to QR code
   * @param {string} qrString - QR data string
   * @param {string} logoUrl - Logo image URL
   * @param {Object} options - QR options
   * @returns {Promise<string>} QR code with logo
   */
  static async addLogoToQR(qrString, logoUrl, options) {
    // Implementation would involve canvas manipulation
    // to overlay logo on QR code
    return await QRCode.toDataURL(qrString, options);
  }
}

// QR Data structure examples
const qrDataExamples = {
  restaurant: {
    type: 'restaurant',
    id: '507f1f77bcf86cd799439011',
    tableNumber: 5,
    metadata: {
      restaurantName: 'Sample Restaurant',
      location: 'Downtown'
    }
  },
  zone: {
    type: 'zone',
    id: '507f1f77bcf86cd799439012',
    metadata: {
      zoneName: 'Food Court A',
      location: 'Mall Level 2'
    }
  },
  shop: {
    type: 'shop',
    id: '507f1f77bcf86cd799439013',
    zoneId: '507f1f77bcf86cd799439012',
    metadata: {
      shopName: 'Pizza Corner',
      vendor: 'John Doe'
    }
  }
};

// QR Customization options
const qrCustomizationOptions = {
  logo: 'https://res.cloudinary.com/your-cloud/image/upload/v1/logos/restaurant-logo.png',
  colors: {
    foreground: '#2563eb',
    background: '#ffffff'
  },
  size: 512,
  format: 'png' // 'png' or 'svg'
};
```

## Middleware & Interceptors

### Security Middleware Stack

```javascript
// Security middleware configuration
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting configuration
const rateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP'
    }
  }
};

// Apply security middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // CORS configuration
app.use(rateLimit(rateLimitOptions)); // Rate limiting
app.use(authMiddleware); // JWT authentication
app.use(rbacMiddleware); // Role-based access control
app.use(subscriptionMiddleware); // Subscription validation
app.use(auditMiddleware); // Request auditing
```

### Request Validation

```javascript
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware functions
const validationMiddleware = {
  // Restaurant validation
  validateCreateRestaurant: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Restaurant name must be 2-100 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('address').trim().isLength({ min: 5, max: 200 }).withMessage('Address must be 5-200 characters'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }
      next();
    }
  ],
  
  // Menu item validation
  validateCreateMenuItem: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Item name must be 2-100 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('categoryId').isMongoId().withMessage('Valid category ID is required'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid menu item data',
            details: errors.array()
          }
        });
      }
      next();
    }
  ],
  
  // Order validation
  validateCreateOrder: [
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    body('items.*.menuItemId').isMongoId().withMessage('Valid menu item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('customer.name').trim().isLength({ min: 2, max: 50 }).withMessage('Customer name required'),
    body('customer.phone').isMobilePhone().withMessage('Valid phone number required'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order data',
            details: errors.array()
          }
        });
      }
      next();
    }
  ],
  
  // Subscription validation
  validateUpdateSubscription: [
    body('planKey').isString().isLength({ min: 1 }).withMessage('Valid plan key is required'),
    body('planType').isIn(['restaurant', 'zone']).withMessage('Plan type must be restaurant or zone'),
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid subscription data',
            details: errors.array()
          }
        });
      }
      next();
    }
  ]
};
```

### Error Handling

```javascript
// Error response structure
const createErrorResponse = (code, message, details = null, statusCode = 500) => {
  return {
    success: false,
    error: {
      code: code,
      message: message,
      details: details,
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substr(2, 9)
    }
  };
};

// Custom error class
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Something went wrong';
  let details = null;
  
  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid input data';
    details = Object.values(error.errors).map(err => err.message);
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid ID format';
  } else if (error.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'Resource already exists';
    details = Object.keys(error.keyValue);
  }
  
  // Log error for debugging
  console.error('Error:', {
    statusCode,
    errorCode,
    message,
    details,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id
  });
  
  // Send error response
  res.status(statusCode).json(
    createErrorResponse(errorCode, message, details, statusCode)
  );
};

// Common error creators
const ErrorTypes = {
  ValidationError: (message, details) => new AppError(400, 'VALIDATION_ERROR', message, details),
  NotFoundError: (resource) => new AppError(404, 'NOT_FOUND', `${resource} not found`),
  UnauthorizedError: (message = 'Unauthorized access') => new AppError(401, 'UNAUTHORIZED', message),
  ForbiddenError: (message = 'Access forbidden') => new AppError(403, 'FORBIDDEN', message),
  ConflictError: (message) => new AppError(409, 'CONFLICT', message),
  RateLimitError: () => new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests'),
  SubscriptionError: (message) => new AppError(402, 'SUBSCRIPTION_REQUIRED', message)
};
```

## Real-time Features

### WebSocket Events

```mermaid
sequenceDiagram
    participant Customer
    participant Backend
    participant Restaurant
    participant ZoneAdmin
    
    Customer->>Backend: Place Order
    Backend->>Restaurant: New Order Event
    Backend->>ZoneAdmin: New Order Event (if zone order)
    
    Restaurant->>Backend: Update Order Status
    Backend->>Customer: Order Status Update
    Backend->>ZoneAdmin: Order Status Update
    
    Restaurant->>Backend: Menu Item Availability
    Backend->>Customer: Menu Update (if browsing)
```

### Socket.io Implementation

```javascript
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Socket events structure
const SocketEvents = {
  // Order events
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated', 
  ORDER_CANCELLED: 'order:cancelled',
  
  // Menu events
  MENU_ITEM_UPDATED: 'menu:item_updated',
  MENU_CATEGORY_UPDATED: 'menu:category_updated',
  
  // System events
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SUBSCRIPTION_EXPIRED: 'subscription:expired'
};

// Socket.io server setup
const setupSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });
  
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).populate('subscription');
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });
  
  // Socket connection handler
  io.on('connection', (socket) => {
    console.log(`User ${socket.user.id} connected`);
    
    // Join rooms based on user role
    if (socket.user.role === 'restaurant_owner' && socket.user.restaurantId) {
      socket.join(`restaurant_${socket.user.restaurantId}`);
    } else if (socket.user.role === 'zone_admin' && socket.user.zoneId) {
      socket.join(`zone_${socket.user.zoneId}`);
    } else if (socket.user.role === 'zone_shop' && socket.user.shopId) {
      socket.join(`shop_${socket.user.shopId}`);
      socket.join(`zone_${socket.user.zoneId}`);
    }
    
    // Handle order status updates
    socket.on('update_order_status', async (data) => {
      try {
        const { orderId, status } = data;
        
        // Validate user permission to update this order
        const order = await Order.findById(orderId);
        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }
        
        // Update order status
        order.status = status;
        order.statusHistory.push({
          status: status,
          timestamp: new Date(),
          updatedBy: socket.user.id
        });
        await order.save();
        
        // Emit to relevant parties
        if (order.restaurantId) {
          io.to(`restaurant_${order.restaurantId}`).emit(SocketEvents.ORDER_UPDATED, {
            orderId: order._id,
            status: status,
            timestamp: new Date()
          });
        }
        
        if (order.zoneId) {
          io.to(`zone_${order.zoneId}`).emit(SocketEvents.ORDER_UPDATED, {
            orderId: order._id,
            status: status,
            timestamp: new Date()
          });
        }
        
        if (order.shopId) {
          io.to(`shop_${order.shopId}`).emit(SocketEvents.ORDER_UPDATED, {
            orderId: order._id,
            status: status,
            timestamp: new Date()
          });
        }
        
      } catch (error) {
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });
    
    // Handle menu item availability updates
    socket.on('update_menu_availability', async (data) => {
      try {
        const { itemId, available } = data;
        
        const menuItem = await MenuItem.findById(itemId);
        if (!menuItem) {
          socket.emit('error', { message: 'Menu item not found' });
          return;
        }
        
        menuItem.available = available;
        await menuItem.save();
        
        // Emit to customers browsing menu
        if (menuItem.restaurantId) {
          io.to(`restaurant_${menuItem.restaurantId}`).emit(SocketEvents.MENU_ITEM_UPDATED, {
            itemId: menuItem._id,
            available: available
          });
        }
        
        if (menuItem.zoneId) {
          io.to(`zone_${menuItem.zoneId}`).emit(SocketEvents.MENU_ITEM_UPDATED, {
            itemId: menuItem._id,
            available: available
          });
        }
        
      } catch (error) {
        socket.emit('error', { message: 'Failed to update menu item' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.id} disconnected`);
    });
  });
  
  return io;
};

// Helper functions for emitting events
const SocketHelpers = {
  // Emit new order to restaurant/zone
  emitNewOrder: (io, order) => {
    const orderData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      totalAmount: order.totalAmount,
      timestamp: order.createdAt
    };
    
    if (order.restaurantId) {
      io.to(`restaurant_${order.restaurantId}`).emit(SocketEvents.ORDER_CREATED, orderData);
    }
    
    if (order.zoneId) {
      io.to(`zone_${order.zoneId}`).emit(SocketEvents.ORDER_CREATED, orderData);
    }
    
    if (order.shopId) {
      io.to(`shop_${order.shopId}`).emit(SocketEvents.ORDER_CREATED, orderData);
    }
  },
  
  // Emit subscription expiry warning
  emitSubscriptionExpiry: (io, userId) => {
    io.to(`user_${userId}`).emit(SocketEvents.SUBSCRIPTION_EXPIRED, {
      message: 'Your subscription has expired',
      timestamp: new Date()
    });
  },
  
  // Emit system maintenance notification
  emitSystemMaintenance: (io, message) => {
    io.emit(SocketEvents.SYSTEM_MAINTENANCE, {
      message: message,
      timestamp: new Date()
    });
  }
};

module.exports = {
  setupSocketServer,
  SocketEvents,
  SocketHelpers
};
```

## Testing Strategy

### Unit Testing
- **Jest** - Testing framework
- **Supertest** - API endpoint testing
- **Test Coverage** - Minimum 80% code coverage

### Integration Testing
- Database integration tests
- External service mocking
- API workflow testing

### Test Structure
```
tests/
├── unit/
│   ├── services/
│   ├── middleware/
│   └── utils/
├── integration/
│   ├── auth/
│   ├── restaurants/
│   ├── zones/
│   └── orders/
└── e2e/
    ├── auth-flow.test.js
    ├── order-flow.test.js
    └── subscription-flow.test.js
```

## Deployment Architecture

### Environment Configuration

```mermaid
flowchart LR
    A[Development] --> B[Staging]
    B --> C[Production]
    
    subgraph "Production Environment"
        D[Load Balancer]
        E[App Server 1]
        F[App Server 2]
        G[MongoDB Atlas Cluster]
        H[Redis Cloud]
        I[Cloudinary CDN]
    end
    
    subgraph "MongoDB Atlas Features"
        J[Automatic Backups]
        K[Global Clusters]
        L[Real-time Analytics]
        M[Performance Advisor]
    end
    
    D --> E
    D --> F
    E --> G
    F --> G
    E --> H
    F --> H
    E --> I
    F --> I
    G --> J
    G --> K
    G --> L
    G --> M
```

### Docker Configuration

```dockerfile
# Multi-stage build for Node.js
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Copy dependencies and source code
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs . .

# Switch to non-root user
USER nodeuser

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.mongodb.net/${MONGODB_DATABASE}?retryWrites=true&w=majority
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-key
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
    depends_on:
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    networks:
      - tableserve-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - tableserve-network

  # MongoDB Atlas connection test service
  db-test:
    build:
      context: .
      dockerfile: Dockerfile.dbtest
    environment:
      - MONGODB_URI=mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.mongodb.net/${MONGODB_DATABASE}?retryWrites=true&w=majority
    depends_on:
      - backend
    command: node scripts/testConnection.js
    networks:
      - tableserve-network

volumes:
  redis_data:

networks:
  tableserve-network:
    driver: bridge
```

### Environment File for Development

```bash
# .env.development
# MongoDB Atlas Configuration
MONGODB_USERNAME=your-atlas-username
MONGODB_PASSWORD=your-atlas-password
MONGODB_CLUSTER=your-cluster-name
MONGODB_DATABASE=tableserve_dev

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Other configurations...
```

### Environment Variables

```bash
# MongoDB Atlas Database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority
MONGODB_URI_TEST=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<test-database-name>?retryWrites=true&w=majority

# Alternative MongoDB Atlas configuration (separate variables)
MONGODB_USERNAME=your-atlas-username
MONGODB_PASSWORD=your-atlas-password
MONGODB_CLUSTER=your-cluster-name.mongodb.net
MONGODB_DATABASE=tableserve
MONGODB_OPTIONS=retryWrites=true&w=majority&ssl=true

# Redis (can use Redis Cloud or local)
REDIS_URL=redis://localhost:6379
# For Redis Cloud: redis://username:password@host:port

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=tableserve # Optional: folder for organized uploads
CLOUDINARY_SECURE=true # Use HTTPS URLs

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@tableserve.com

# Application
NODE_ENV=production
PORT=3001
API_BASE_URL=https://api.tableserve.com
FRONTEND_URL=https://tableserve.com
APP_NAME=TableServe
APP_VERSION=1.0.0

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://tableserve.com
BCRYPT_SALT_ROUNDS=12

# Session & Cache
SESSION_SECRET=your-session-secret-key
CACHE_TTL=3600

# File Upload
MAX_FILE_SIZE=5242880 # 5MB in bytes
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp

# QR Code
QR_CODE_SIZE=512
QR_CODE_ERROR_CORRECTION=M

# Payment (for future integration)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring & Logging
LOG_LEVEL=info
LOG_FORMAT=combined
ENABLE_REQUEST_LOGGING=true

# MongoDB Atlas Specific
MONGODB_ATLAS_PROJECT_ID=your-project-id
MONGODB_ATLAS_PUBLIC_KEY=your-public-api-key
MONGODB_ATLAS_PRIVATE_KEY=your-private-api-key

# Development only
DB_SEED_DATA=false
ENABLE_CORS=true
ENABLE_MORGAN_LOGGING=true
```

### MongoDB Atlas Setup Script

```javascript
// scripts/setupAtlas.js
const mongoose = require('mongoose');
require('dotenv').config();

// Function to test MongoDB Atlas connection
async function testAtlasConnection() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    console.log('Testing MongoDB Atlas connection...');
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas');
    
    // Test database operations
    const testCollection = mongoose.connection.db.collection('connection_test');
    const testDoc = { test: true, timestamp: new Date() };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted successfully');
    
    await testCollection.deleteOne({ test: true });
    console.log('✅ Test document deleted successfully');
    
    console.log('🚀 MongoDB Atlas is ready for use!');
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n📝 Check your username and password in the connection string');
    }
    
    if (error.message.includes('connection timed out')) {
      console.log('\n📝 Check your network access settings in MongoDB Atlas');
      console.log('   - Ensure your IP address is whitelisted');
      console.log('   - Check if you\'re behind a firewall');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Function to create initial database indexes
async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    // Create indexes for better performance
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('menuitems').createIndex({ available: 1 });
    
    console.log('✅ Database indexes created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create indexes:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Run tests
if (require.main === module) {
  testAtlasConnection()
    .then(() => createIndexes())
    .then(() => {
      console.log('\n✨ MongoDB Atlas setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { testAtlasConnection, createIndexes };
```

### Package.json Configuration

```json
{
  "name": "tableserve-backend",
  "version": "1.0.0",
  "description": "Backend API for TableServe QR-based restaurant ordering system",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "seed": "node scripts/seedDatabase.js",
    "db:reset": "node scripts/resetDatabase.js",
    "generate:keys": "node scripts/generateKeys.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "redis": "^4.6.7",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^6.10.0",
    "express-validator": "^7.0.1",
    "socket.io": "^4.7.2",
    "cloudinary": "^1.40.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.4",
    "qrcode": "^1.5.3",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.47.0",
    "mongodb-memory-server": "^8.15.1"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

## Implementation Phases

### Phase 1: Core Backend Setup (Week 1-2)
- Project initialization with Express.js + JavaScript (ES6+)
- MongoDB Atlas cluster setup and configuration
- MongoDB Atlas connection with Mongoose ODM
- Redis setup for caching and sessions (local or Redis Cloud)
- Basic authentication system with JWT
- User management endpoints
- Docker configuration for development
- Environment configuration and validation
- MongoDB Atlas security setup (IP whitelisting, user roles)

**Deliverables:**
- Basic Express server structure
- MongoDB Atlas cluster configured and connected
- User schema with proper indexes
- JWT authentication middleware
- Basic CRUD operations for users
- Docker development environment
- Connection testing and monitoring scripts

### Phase 2: Business Logic (Week 3-4)
- Subscription management system with MongoDB Atlas
- Restaurant and Zone CRUD operations
- Menu management endpoints
- Role-based access control middleware
- Input validation with express-validator
- Error handling middleware
- Cloudinary integration for image uploads
- MongoDB Atlas performance optimization
- Database indexing strategy implementation

**Deliverables:**
- Complete MongoDB Atlas schemas for all entities
- Optimized database queries and aggregations
- Subscription validation middleware
- File upload endpoints with Cloudinary
- Restaurant and zone management APIs
- Menu category and item management
- Performance monitoring setup

### Phase 3: Order System (Week 5-6)
- Order creation and management APIs
- Real-time order updates with Socket.io
- QR code generation service
- Email notification system with Nodemailer
- Order status tracking and history
- Customer order placement workflow

**Deliverables:**
- Complete order management system
- Real-time WebSocket implementation
- QR code generation with customization
- Email notification templates
- Order tracking functionality

### Phase 4: Advanced Features (Week 7-8)
- Analytics endpoints and data aggregation
- Advanced search and filtering with MongoDB
- Audit logging and activity tracking
- Performance optimization and caching
- Rate limiting and security enhancements
- Image optimization with Cloudinary

**Deliverables:**
- Analytics dashboard APIs
- Search and filter functionality
- Comprehensive audit logging
- Performance monitoring
- Security hardening

### Phase 5: Testing & Deployment (Week 9-10)
- Comprehensive test suite with Jest
- API documentation with Swagger/OpenAPI
- Load testing and performance tuning
- Production deployment setup
- Monitoring and logging setup
- CI/CD pipeline configuration

**Deliverables:**
- Complete test coverage (>80%)
- API documentation
- Production-ready deployment
- Monitoring and alerting
- Deployment automation

## Security Considerations

### Data Protection
- Password hashing with bcrypt
- JWT token security
- Input sanitization
- SQL injection prevention
- XSS protection

### Access Control
- Role-based permissions
- Resource-level authorization
- Subscription-based feature gating
- API rate limiting
- Request size limiting

### Monitoring & Auditing
- Request logging
- Error tracking
- Performance monitoring
- Security event logging
- User activity auditing