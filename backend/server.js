/**
 * TableServe Backend Server
 * Clean, maintainable server configuration
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.set('trust proxy', 1);

// Logger with fallback
const logger = (() => {
  try {
    return require('./src/utils/logger').logger;
  } catch {
    const log = (level, msg, ...args) => console[level](`[${new Date().toISOString()}] ${level.toUpperCase()}:`, msg, ...args);
    return {
      info: (msg, ...args) => log('log', msg, ...args),
      warn: (msg, ...args) => log('warn', msg, ...args),
      error: (msg, ...args) => log('error', msg, ...args),
      debug: (msg, ...args) => log('debug', msg, ...args)
    };
  }
})();

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      process.env.ADMIN_PANEL_URL,
      'https://tableserves.com',
      'https://www.tableserves.com',
      'https://api.tableserves.com'
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:8080', 'https://tableserves.com', 'https://www.tableserves.com'];

// Match any LAN IP (192.168.x.x or 10.x.x.x) on any port — covers mobile devices on the same WiFi
const isLocalNetworkOrigin = (origin) => {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return /^192\.168\.\d+\.\d+$/.test(hostname) || /^10\.\d+\.\d+\.\d+$/.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && isLocalNetworkOrigin(origin))) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.warn(`CORS: Unknown origin: ${origin}`);
      callback(null, true); // Allow in development
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.options('*', cors());

// Security & Performance
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
  app.use(compression());
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: { message: 'Too many requests, please try again later.' } }
  }));
} else {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    skip: (req) => req.path.includes('/health') || req.path.includes('/test')
  }));
}

// Body parsing & Request ID
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: msg => logger.info(msg.trim()) },
    skip: (req) => req.url.includes('/health') || req.url.includes('/socket.io')
  }));
}

// Health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  };

  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.database = 'connected';
    } else {
      health.database = 'disconnected';
      health.status = 'degraded';
    }
  } catch {
    health.database = 'error';
    health.status = 'degraded';
  }

  res.json({ success: true, message: 'Tableserves Backend API is running', data: health });
});

app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Tableserves API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route loader with validation
const loadRoute = (name, path) => {
  try {
    const router = require(path);
    if (!router || typeof router !== 'function') {
      logger.warn(`[ROUTE] ${name}: Invalid router`);
      return null;
    }
    logger.info(`[ROUTE] ✓ Loaded ${name}`);
    return router;
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      logger.error(`[ROUTE] ${name}: ${error.message}`);
    }
    return null;
  }
};

// Route configuration
const routes = [
  { name: 'auth', path: './src/routes/authRoutes', mount: '/auth' },
  { name: 'restaurants', path: './src/routes/restaurantRoutes', mount: '/restaurants' },
  { name: 'menu', path: './src/routes/menusRoutes', mount: '/menus' },
  { name: 'orders', path: './src/routes/orderRoutes', mount: '/orders' },
  { name: 'admin', path: './src/routes/adminRoutes', mount: '/admin' },
  { name: 'zones', path: './src/routes/zoneRoutes', mount: '/zones' },
  { name: 'shops', path: './src/routes/zoneShopRoutes', mount: '/shops' },
  { name: 'vendors', path: './src/routes/vendorRoutes', mount: '/vendors' },
  { name: 'qr', path: './src/routes/qrCodeRoutes', mount: '/qr' },
  { name: 'subscriptions', path: './src/routes/subscriptionRoutes', mount: '/subscriptions' },
  { name: 'plans', path: './src/routes/planRoutes', mount: '/plans' },
  { name: 'plan-usage', path: './src/routes/planUsageRoutes', mount: '/plan-usage' },
  { name: 'payment', path: './src/routes/paymentRoutes', mount: '/payment' },
  { name: 'webhooks', path: './src/routes/webhookRoutes', mount: '/webhooks' },
  { name: 'analytics', path: './src/routes/analyticsRoutes', mount: '/analytics' },
  { name: 'reports', path: './src/routes/reportRoutes', mount: '/reports' },
  { name: 'ratings', path: './src/routes/tableServeRatingRoutes', mount: '/tableserve-ratings' },
  { name: 'images', path: './src/routes/imageRoutes', mount: '/images' },
  { name: 'business-setup', path: './src/routes/businessSetupRoutes', mount: '/business-setup' },
  { name: 'utility', path: './src/routes/utilityRoutes', mount: '/utility' },
  { name: 'test', path: './src/routes/testRoutes', mount: '/test' }
];

// Load and mount routes
logger.info('Loading routes...');
const apiBase = '/api/v1';
const mounted = [];

routes.forEach(({ name, path, mount }) => {
  const router = loadRoute(name, path);
  if (router) {
    app.use(`${apiBase}${mount}`, router);
    mounted.push({ name, path: `${apiBase}${mount}` });
  }
});

logger.info(`Routes loaded: ${mounted.length}/${routes.length}`);
mounted.forEach(({ name, path }) => logger.info(`  ✓ ${path} (${name})`));

// API documentation
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Tableserves API v1',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/health',
        test: '/test',
        api: '/api',
        routes: mounted.map(({ path }) => path)
      }
    }
  });
});

// Error handlers
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Endpoint ${req.originalUrl} not found` }
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tableserves Backend API',
    data: {
      version: '1.0.0',
      status: 'online',
      routes: mounted.length,
      endpoints: { api: '/api', health: '/health' }
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.originalUrl} not found` }
  });
});

app.use((error, req, res, next) => {
  logger.error('Error:', error.message);
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      requestId: req.id
    }
  });
});

// Server startup
const startServer = async () => {
  try {
    logger.info('Starting Tableserves Backend...');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Database
    try {
      const { connectDatabase } = require('./src/config/database');
      await connectDatabase();
      logger.info('Database connected');
    } catch (err) {
      logger.warn('Database connection failed:', err.message);
    }

    // Superadmin
    try {
      const { ensureSuperAdmin } = require('./src/utils/seedData');
      await ensureSuperAdmin();
      logger.info('Superadmin setup complete');
    } catch (err) {
      logger.warn('Superadmin setup failed:', err.message);
    }

    // Socket.io
    try {
      const socketService = require('./src/services/socketService');
      socketService.init(server);
      logger.info('Socket.io initialized');
    } catch (err) {
      logger.warn('Socket.io initialization failed:', err.message);
    }

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health: http://localhost:${PORT}/health`);
      logger.info(`API: http://localhost:${PORT}/api`);
      logger.info(`Routes: ${mounted.length}/${routes.length}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down...`);
      server.close(() => {
        try {
          require('mongoose').connection.close();
        } catch {}
        logger.info('Shutdown complete');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Startup failed:', error);
    process.exit(1);
  }
};

// Error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Start
if (require.main === module) {
  startServer().catch(error => {
    console.error('Startup failed:', error);
    process.exit(1);
  });
}

module.exports = { app, server, startServer };