const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { connectDatabase } = require('./src/config/database');
const { logger } = require('./src/utils/logger');
const { errorHandler } = require('./src/middleware/errorHandler');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting (needed for production)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: { message: 'Too many requests from this IP, please try again later.' }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Apply rate limiting to all requests
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TableServe Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes (will be added as we create them)
app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1/images', require('./src/routes/imageRoutes'));
app.use('/api/v1/admin', require('./src/routes/adminRoutes'));
app.use('/api/v1/restaurants', require('./src/routes/restaurantRoutes'));
app.use('/api/v1/orders', require('./src/routes/orderRoutes'));
// app.use('/api/v1/zones', require('./src/routes/zoneRoutes'));
// app.use('/api/v1/menu', require('./src/routes/menuRoutes'));
// app.use('/api/v1/analytics', require('./src/routes/analyticsRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.originalUrl} not found` }
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database (commented out for initial testing)
    // await connectDatabase();
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 TableServe Backend API server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 Auth test: http://localhost:${PORT}/api/v1/auth/test`);
    });
    
    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} signal received: closing HTTP server`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };