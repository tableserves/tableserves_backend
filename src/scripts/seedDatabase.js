const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// Simple console logger since logger might not be available
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

// Create super admin user
const createSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { email: 'admin@tableserve.com' },
        { username: 'admin' }
      ],
      role: 'admin'
    });

    if (existingAdmin) {
      logger.info('Super admin already exists');
      return existingAdmin;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);

    // Create super admin user
    const superAdmin = new User({
      email: 'admin@tableserve.com',
      username: 'admin',
      phone: '+919999999999',
      passwordHash,
      role: 'admin',
      profile: {
        name: 'Super Administrator',
        businessType: 'admin'
      },
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
      permissions: {
        canManageUsers: true,
        canManageSubscriptions: true,
        canViewAnalytics: true,
        canManageSystem: true,
        canAccessReports: true
      }
    });

    await superAdmin.save();

    // Create admin subscription
    const adminSubscription = new Subscription({
      userId: superAdmin._id,
      planKey: 'admin',
      planName: 'Admin Plan',
      planType: 'admin',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      pricing: {
        amount: 0,
        currency: 'INR',
        interval: 'monthly'
      },
      features: {
        crudMenu: true,
        branding: true,
        analytics: true,
        qrGeneration: true,
        qrCustomization: true,
        modifiers: true,
        watermark: false,
        orderTracking: true,
        multiLocation: true,
        advancedAnalytics: true,
        customReports: true,
        apiAccess: true,
        prioritySupport: true
      },
      limits: {
        maxTables: null, // Unlimited
        maxCategories: null,
        maxMenuItems: null,
        maxOrdersPerMonth: null,
        maxVendors: null
      },
      usage: {
        currentTables: 0,
        currentCategories: 0,
        currentMenuItems: 0,
        ordersThisMonth: 0,
        currentVendors: 0
      }
    });

    await adminSubscription.save();

    logger.info('Super admin created successfully');
    logger.info('Email: admin@tableserve.com');
    logger.info('Password: admin123');
    
    return superAdmin;

  } catch (error) {
    logger.error('Error creating super admin:', error);
    throw error;
  }
};

// Create default plans data
const createDefaultPlans = async () => {
  try {
    // This could be expanded to seed plan templates in the database
    logger.info('Default plans are defined in constants/plans.js');
  } catch (error) {
    logger.error('Error creating default plans:', error);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  let connection = null;
  try {
    console.log('Starting database seeding process...');
    connection = await connectDB();

    logger.info('Starting database seeding...');

    // Create super admin
    console.log('Creating super admin...');
    await createSuperAdmin();

    // Create default plans
    console.log('Setting up default plans...');
    await createDefaultPlans();

    logger.info('Database seeding completed successfully');
    console.log('✅ Database seeding completed successfully');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = {
  seedDatabase,
  createSuperAdmin,
  createDefaultPlans
};
