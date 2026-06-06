const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Console logger
const logger = {
  info: (msg) => console.log(`✅ [INFO] ${msg}`),
  error: (msg, err) => console.error(`❌ [ERROR] ${msg}`, err || ''),
  warn: (msg) => console.warn(`⚠️  [WARN] ${msg}`),
  success: (msg) => console.log(`🎉 [SUCCESS] ${msg}`)
};

// Database connection
const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Reset admin user
const resetAdmin = async () => {
  try {
    console.log('\n🔍 Looking for existing admin user...\n');
    
    // Admin credentials
    const adminEmail = 'admin@tableserve.com';
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    const adminPhone = '+1234567890'; // Default phone number

    // Find existing admin by email, username, or role
    let admin = await User.findOne({ 
      $or: [
        { email: adminEmail },
        { username: adminUsername },
        { role: 'admin' }
      ]
    });

    if (admin) {
      logger.info('Found existing admin user');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Username: ${admin.username || 'Not set'}\n`);

      // Hash new password
      console.log('🔐 Hashing new password...');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // Update admin user - keep existing email if different
      const currentEmail = admin.email;
      admin.username = adminUsername;
      admin.passwordHash = hashedPassword;
      admin.status = 'active';
      admin.emailVerified = true;
      admin.phoneVerified = true;
      admin.role = 'admin';
      admin.failedLoginAttempts = 0;
      admin.lastFailedLogin = undefined;
      
      // Update phone if not set
      if (!admin.phone) {
        admin.phone = adminPhone;
      }

      // Update profile
      if (!admin.profile) {
        admin.profile = {};
      }
      admin.profile.name = 'System Administrator';

      await admin.save();
      logger.success('Admin user reset successfully!');

      // Display credentials with actual email
      console.log('\n' + '='.repeat(60));
      console.log('🔐 ADMIN LOGIN CREDENTIALS');
      console.log('='.repeat(60));
      console.log('');
      console.log('  📧 Email:    ' + currentEmail);
      console.log('  👤 Username: admin');
      console.log('  🔑 Password: admin123');
      console.log('  📱 Phone:    ' + admin.phone);
      console.log('');
      console.log('='.repeat(60));
      console.log('');
      console.log('⚠️  SECURITY WARNING:');
      console.log('   Please change the default password after first login!');
      console.log('   This password is for development/testing only.');
      console.log('');
      console.log('🌐 Login URL:');
      console.log('   http://localhost:5173/admin/login');
      console.log('');
      console.log('💡 TIP: You can login with either:');
      console.log('   - Email: ' + currentEmail);
      console.log('   - Username: admin');
      console.log('');
      console.log('='.repeat(60));
      console.log('');

    } else {
      logger.warn('Admin user not found. Creating new admin user...\n');

      // Hash password
      console.log('🔐 Hashing password...');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // Create new admin user
      admin = new User({
        username: adminUsername,
        email: adminEmail,
        phone: adminPhone,
        passwordHash: hashedPassword,
        role: 'admin',
        status: 'active',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          name: 'System Administrator'
        },
        failedLoginAttempts: 0
      });

      await admin.save();
      logger.success('New admin user created successfully!');
    }

    // Display credentials
    console.log('\n' + '='.repeat(60));
    console.log('🔐 ADMIN LOGIN CREDENTIALS');
    console.log('='.repeat(60));
    console.log('');
    console.log('  📧 Email:    admin@tableserve.com');
    console.log('  👤 Username: admin');
    console.log('  🔑 Password: admin123');
    console.log('  📱 Phone:    ' + admin.phone);
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('⚠️  SECURITY WARNING:');
    console.log('   Please change the default password after first login!');
    console.log('   This password is for development/testing only.');
    console.log('');
    console.log('🌐 Login URL:');
    console.log('   http://localhost:5173/admin/login');
    console.log('');
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    logger.error('Error resetting admin user:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  let connection = null;
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 TABLESERVE ADMIN RESET SCRIPT');
    console.log('='.repeat(60) + '\n');
    
    connection = await connectDB();
    await resetAdmin();
    
  } catch (error) {
    logger.error('Admin reset failed:', error);
    console.error('\n💥 Admin reset failed. Please check the error above.\n');
    throw error;
  } finally {
    if (connection) {
      console.log('🔌 Closing database connection...');
      await mongoose.connection.close();
      logger.info('Database connection closed\n');
    }
  }
};

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Admin reset completed successfully!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin reset failed:', error.message);
      process.exit(1);
    });
}

module.exports = { resetAdmin };
