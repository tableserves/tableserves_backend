const mongoose = require('mongoose');
const User = require('../models/User');

// Simple console logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err || '')
};

// Database connection
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://tableserves02:VGlbikiaK5WTfMGr@tableserves.w4jzk34.mongodb.net/?retryWrites=true&w=majority&appName=TableServes');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Update admin user
const updateAdmin = async () => {
  try {
    console.log('Looking for existing admin user...');
    
    // Find existing admin
    const existingAdmin = await User.findOne({ 
      email: 'admin@tableserve.com',
      role: 'admin' 
    });

    if (!existingAdmin) {
      logger.error('Admin user not found');
      return;
    }

    console.log('Found admin user:', existingAdmin.email);

    // Update admin with username if not set
    if (!existingAdmin.username) {
      existingAdmin.username = 'admin';
      await existingAdmin.save();
      logger.info('Admin username updated successfully');
    } else {
      logger.info('Admin username already set');
    }

    // Ensure admin status is active
    if (existingAdmin.status !== 'active') {
      existingAdmin.status = 'active';
      await existingAdmin.save();
      logger.info('Admin status updated to active');
    }

    logger.info('Admin user update completed');
    console.log('✅ Admin user updated successfully');
    console.log('Login credentials:');
    console.log('Username: admin');
    console.log('Email: admin@tableserve.com');
    console.log('Password: admin123');

  } catch (error) {
    logger.error('Error updating admin user:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  let connection = null;
  try {
    console.log('Starting admin user update...');
    connection = await connectDB();
    
    await updateAdmin();
    
  } catch (error) {
    logger.error('Admin update failed:', error);
    console.error('❌ Admin update failed:', error);
    throw error;
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
};

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Admin update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAdmin };
