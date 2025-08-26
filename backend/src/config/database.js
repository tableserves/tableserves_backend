const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// MongoDB Atlas connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://username:password@cluster.mongodb.net/tableserve?retryWrites=true&w=majority';

// Connection options optimized for MongoDB Atlas
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferMaxEntries: 0, // Disable mongoose buffering
  bufferCommands: false, // Disable mongoose buffering
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  w: 'majority' // Write concern for data durability
};

/**
 * Connect to MongoDB Atlas database
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    // Validate environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    logger.info('🔄 Connecting to MongoDB Atlas...');
    
    // Set mongoose configuration
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    logger.info('✅ MongoDB Atlas connected successfully');
    logger.info(`📊 Database: ${mongoose.connection.db.databaseName}`);
    logger.info(`🌐 Host: ${mongoose.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('❌ MongoDB Atlas connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB Atlas disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB Atlas reconnected');
    });

    mongoose.connection.on('connected', () => {
      logger.info('🔗 MongoDB Atlas connection established');
    });

    mongoose.connection.on('connecting', () => {
      logger.info('🔄 Connecting to MongoDB Atlas...');
    });
    
    // Graceful shutdown handlers
    const gracefulShutdown = async () => {
      try {
        await mongoose.connection.close();
        logger.info('🔚 MongoDB Atlas connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during database disconnection:', error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown); // For nodemon
    
  } catch (error) {
    logger.error('❌ MongoDB Atlas connection failed:', error.message);
    
    // Log specific connection errors
    if (error.name === 'MongooseServerSelectionError') {
      logger.error('🔍 Possible causes:');
      logger.error('  • Network connectivity issues');
      logger.error('  • Incorrect connection string');
      logger.error('  • IP address not whitelisted in MongoDB Atlas');
      logger.error('  • Database user credentials incorrect');
    }
    
    process.exit(1);
  }
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeDatabaseConnection = async () => {
  try {
    await mongoose.connection.close();
    logger.info('✅ Database connection closed successfully');
  } catch (error) {
    logger.error('❌ Error closing database connection:', error);
    throw error;
  }
};

/**
 * Check if database is connected
 * @returns {boolean}
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection statistics
 * @returns {Object}
 */
const getConnectionStats = () => {
  const conn = mongoose.connection;
  return {
    readyState: conn.readyState,
    host: conn.host,
    port: conn.port,
    name: conn.name,
    collections: Object.keys(conn.collections),
    models: Object.keys(conn.models)
  };
};

/**
 * Create database indexes for optimal performance
 * @returns {Promise<void>}
 */
const createIndexes = async () => {
  try {
    logger.info('🔍 Creating database indexes...');
    
    const db = mongoose.connection.db;
    
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    
    // Subscriptions collection indexes
    await db.collection('subscriptions').createIndex({ userId: 1 });
    await db.collection('subscriptions').createIndex({ status: 1 });
    await db.collection('subscriptions').createIndex({ endDate: 1 });
    
    // Restaurants collection indexes
    await db.collection('restaurants').createIndex({ ownerId: 1 });
    await db.collection('restaurants').createIndex({ active: 1 });
    
    // Zones collection indexes
    await db.collection('zones').createIndex({ adminId: 1 });
    await db.collection('zones').createIndex({ active: 1 });
    
    // Shops collection indexes
    await db.collection('shops').createIndex({ zoneId: 1 });
    await db.collection('shops').createIndex({ vendorId: 1 });
    await db.collection('shops').createIndex({ status: 1 });
    
    // MenuCategories collection indexes
    await db.collection('menucategories').createIndex({ restaurantId: 1 });
    await db.collection('menucategories').createIndex({ zoneId: 1 });
    await db.collection('menucategories').createIndex({ active: 1 });
    
    // MenuItems collection indexes
    await db.collection('menuitems').createIndex({ categoryId: 1 });
    await db.collection('menuitems').createIndex({ restaurantId: 1 });
    await db.collection('menuitems').createIndex({ zoneId: 1 });
    await db.collection('menuitems').createIndex({ available: 1 });
    await db.collection('menuitems').createIndex({ tags: 1 });
    
    // Orders collection indexes
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('orders').createIndex({ restaurantId: 1 });
    await db.collection('orders').createIndex({ zoneId: 1 });
    await db.collection('orders').createIndex({ shopId: 1 });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ 'customer.phone': 1 });
    
    logger.info('✅ Database indexes created successfully');
  } catch (error) {
    logger.error('❌ Error creating database indexes:', error);
    // Don't throw error here as indexes might already exist
  }
};

module.exports = {
  connectDatabase,
  closeDatabaseConnection,
  isDatabaseConnected,
  getConnectionStats,
  createIndexes
};