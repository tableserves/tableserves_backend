const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

/**
 * Production-optimized database configuration
 */
class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Get optimized connection options based on environment
   */
  getConnectionOptions() {
    const isProduction = process.env.NODE_ENV === 'production';

    const baseOptions = {
  
      // Index management
      autoIndex: !isProduction, // Only create indexes automatically in development
      autoCreate: !isProduction, // Only auto-create collections in development

      // Connection pool settings - optimized for production
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || (isProduction ? 20 : 10),
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || (isProduction ? 5 : 2),

      // Timeout settings
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || (isProduction ? 10000 : 5000),
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || (isProduction ? 45000 : 30000),
      connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || (isProduction ? 10000 : 5000),

      // Heartbeat and monitoring
      heartbeatFrequencyMS: isProduction ? 10000 : 30000, // More frequent in production

      // Write concern for production
      writeConcern: {
        w: isProduction ? 'majority' : 1,
        j: isProduction, // Journal writes in production
        wtimeout: isProduction ? 5000 : 0
      },

      // Read preference
      readPreference : 'primary',

      // Compression (if supported by MongoDB version)
      compressors: isProduction ? ['zstd', 'zlib'] : [],

      // Network settings
      family: 4, // Use IPv4, skip trying IPv6

      // Buffer settings (updated for newer Mongoose versions)
      bufferCommands: false, // Disable mongoose buffering

      // Retry settings
      retryWrites: true,
      retryReads: true
    };

    if (isProduction) {
      logger.info('Using production database configuration', {
        maxPoolSize: baseOptions.maxPoolSize,
        minPoolSize: baseOptions.minPoolSize,
        serverSelectionTimeoutMS: baseOptions.serverSelectionTimeoutMS,
        autoIndex: baseOptions.autoIndex
      });
    }

    return baseOptions;
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URI;

      if (!mongoUri) {
        throw new Error('MongoDB URI is required. Please set MONGODB_URI environment variable.');
      }

      const options = this.getConnectionOptions();

      logger.info('Connecting to MongoDB...', {
        environment: process.env.NODE_ENV,
        retryAttempt: this.connectionRetries + 1,
        maxRetries: this.maxRetries
      });

      const conn = await mongoose.connect(mongoUri, options);

      this.isConnected = true;
      this.connectionRetries = 0;

      // Set up connection event handlers
      this.setupConnectionHandlers();

      // Verify connection and setup indexes
      await this.verifyConnection();

      if (process.env.NODE_ENV === 'production') {
        logger.info('Skipping index setup in production — existing indexes are already configured.');
      }

      logger.info('✅ MongoDB Connected Successfully', {
        host: conn.connection.host,
        database: conn.connection.name,
        readyState: conn.connection.readyState,
        environment: process.env.NODE_ENV
      });

      return conn;

    } catch (error) {
      this.isConnected = false;
      this.connectionRetries++;

      logger.error('MongoDB connection failed:', {
        error: error.message,
        retryAttempt: this.connectionRetries,
        maxRetries: this.maxRetries
      });

      // Retry logic
      if (this.connectionRetries < this.maxRetries) {
        logger.info(`Retrying connection in ${this.retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect(); // Recursive retry
      } else {
        logger.error('Max connection retries exceeded. Exiting...');
        process.exit(1);
      }
    }
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Verify database connection
   */
  async verifyConnection() {
    try {
      await mongoose.connection.db.admin().ping();
      logger.info('Database connection verified');
    } catch (error) {
      logger.error('Database connection verification failed:', error);
      throw error;
    }
  }

  /**
   * Setup production indexes for better performance
   */
  async setupProductionIndexes() {
    try {
      logger.info('Setting up production database indexes...');

      // Get all models and ensure indexes
      const models = mongoose.modelNames();

      for (const modelName of models) {
        const model = mongoose.model(modelName);
        await model.ensureIndexes();
        logger.info(`Indexes ensured for model: ${modelName}`);
      }

      logger.info('✅ Production indexes setup completed');
    } catch (error) {
      logger.error('Failed to setup production indexes:', error);
      // Don't fail the connection for index issues
    }
  }

  /**
   * Graceful disconnect
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed gracefully');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Legacy function for backward compatibility
const connectDB = async () => {
  return databaseManager.connect();
};

module.exports = {
  connectDatabase: connectDB,
  databaseManager,
  DatabaseManager
};