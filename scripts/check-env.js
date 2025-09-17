require('dotenv').config();
const fs = require('fs');
const path = require('path');

const checkEnvironment = () => {
  console.log('=== ENVIRONMENT CONFIGURATION CHECK ===\n');

  // Required environment variables
  const requiredVars = [
    // Server
    { name: 'PORT', type: 'number', default: '3000' },
    { name: 'NODE_ENV', type: 'string', allowed: ['development', 'production', 'test'] },
    
    // Database
    { name: 'MONGODB_URI', type: 'string', required: true },
    { name: 'DB_NAME', type: 'string', required: true },
    
    // Authentication
    { name: 'JWT_SECRET', type: 'string', required: true },
    { name: 'JWT_EXPIRES_IN', type: 'string', default: '1d' },
    { name: 'REFRESH_TOKEN_SECRET', type: 'string', required: true },
    { name: 'REFRESH_TOKEN_EXPIRES_IN', type: 'string', default: '7d' },
    
    // Email (if using email features)
    { name: 'SMTP_HOST', type: 'string' },
    { name: 'SMTP_PORT', type: 'number' },
    { name: 'SMTP_USER', type: 'string' },
    { name: 'SMTP_PASS', type: 'string' },
    
    // File Upload
    { name: 'UPLOAD_DIR', type: 'string', default: 'uploads' },
    { name: 'MAX_FILE_SIZE', type: 'number', default: '5242880' }, // 5MB
    
    // Rate Limiting
    { name: 'RATE_LIMIT_WINDOW', type: 'number', default: '900000' }, // 15 minutes
    { name: 'RATE_LIMIT_MAX', type: 'number', default: '100' },
    
    // Logging
    { name: 'LOG_LEVEL', type: 'string', default: 'info', allowed: ['error', 'warn', 'info', 'debug'] },
    { name: 'LOG_FILE', type: 'string', default: 'app.log' }
  ];

  let hasErrors = false;
  let warnings = 0;

  // Check .env file existence
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️ .env file not found!');
    console.log('   Creating .env file from .env.example if it exists...\n');
    
    const envExamplePath = path.join(__dirname, '../.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Created .env file from .env.example\n');
    } else {
      console.log('❌ .env.example file not found!\n');
      hasErrors = true;
    }
  }

  // Check each required variable
  requiredVars.forEach(({ name, type, required, default: defaultValue, allowed }) => {
    const value = process.env[name];
    console.log(`Checking ${name}:`);

    if (!value) {
      if (required) {
        console.log(`❌ Missing required environment variable: ${name}`);
        hasErrors = true;
      } else if (defaultValue) {
        console.log(`⚠️ Using default value: ${defaultValue}`);
        warnings++;
      } else {
        console.log(`ℹ️ Optional variable not set`);
      }
    } else {
      // Type checking
      if (type === 'number' && isNaN(Number(value))) {
        console.log(`❌ Invalid type: ${name} should be a number`);
        hasErrors = true;
      }

      // Allowed values checking
      if (allowed && !allowed.includes(value)) {
        console.log(`❌ Invalid value: ${name} should be one of [${allowed.join(', ')}]`);
        hasErrors = true;
      }

      // Specific validations
      if (name === 'MONGODB_URI' && !value.startsWith('mongodb')) {
        console.log(`❌ Invalid MongoDB URI format`);
        hasErrors = true;
      }

      if (name === 'JWT_SECRET' && value.length < 32) {
        console.log(`⚠️ JWT_SECRET should be at least 32 characters long`);
        warnings++;
      }

      if (name.includes('EXPIRES_IN') && !value.match(/^\d+[smhd]$/)) {
        console.log(`❌ Invalid expiration format. Use format: <number>[s|m|h|d]`);
        hasErrors = true;
      }
    }
    console.log('');
  });

  // Summary
  console.log('=== CHECK SUMMARY ===');
  if (hasErrors) {
    console.log('❌ Configuration check failed with errors');
    console.log('   Please fix the above errors before running the application');
  } else if (warnings > 0) {
    console.log('⚠️ Configuration check passed with warnings');
    console.log(`   Found ${warnings} warning(s)`);
  } else {
    console.log('✅ All environment variables are properly configured');
  }

  // Additional checks
  console.log('\n=== ADDITIONAL CHECKS ===');
  
  // Check upload directory
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const uploadPath = path.join(__dirname, '..', uploadDir);
  if (!fs.existsSync(uploadPath)) {
    console.log(`⚠️ Upload directory (${uploadDir}) does not exist`);
    console.log('   Creating directory...');
    try {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('✅ Upload directory created successfully');
    } catch (error) {
      console.log(`❌ Failed to create upload directory: ${error.message}`);
      hasErrors = true;
    }
  } else {
    console.log('✅ Upload directory exists');
  }

  // Check log directory
  const logFile = process.env.LOG_FILE || 'app.log';
  const logDir = path.dirname(path.join(__dirname, '..', logFile));
  if (!fs.existsSync(logDir)) {
    console.log(`⚠️ Log directory does not exist`);
    console.log('   Creating directory...');
    try {
      fs.mkdirSync(logDir, { recursive: true });
      console.log('✅ Log directory created successfully');
    } catch (error) {
      console.log(`❌ Failed to create log directory: ${error.message}`);
      hasErrors = true;
    }
  } else {
    console.log('✅ Log directory exists');
  }

  return !hasErrors;
};

checkEnvironment();