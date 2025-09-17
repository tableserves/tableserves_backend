require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const validateAndFixSecurity = async () => {
  console.log('=== SECURITY VALIDATION AND FIXES ===\n');

  const fixes = [];
  const errors = [];
  const warnings = [];

  // 1. Environment Variables Security
  console.log('1. Checking Environment Variables Security...');

  // Check .env file
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    try {
      const envExample = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
      fs.writeFileSync(envPath, envExample);
      console.log('✅ Created .env file from .env.example');
      fixes.push('Created .env file');
      warnings.push('Please update .env with your secure values');
    } catch (error) {
      console.error('❌ Failed to create .env file:', error.message);
      errors.push(`Failed to create .env file: ${error.message}`);
    }
  }

  // Check JWT secrets
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    const newSecret = crypto.randomBytes(32).toString('hex');
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /JWT_SECRET=.*/,
        `JWT_SECRET=${newSecret}`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated JWT secret with secure value');
      fixes.push('Updated JWT secret');
    } catch (error) {
      console.error('❌ Failed to update JWT secret:', error.message);
      errors.push(`Failed to update JWT secret: ${error.message}`);
    }
  }

  // 2. Express Security Configuration
  console.log('\n2. Checking Express Security Configuration...');
  const appPath = path.join(__dirname, '../src/app.js');

  if (fs.existsSync(appPath)) {
    try {
      let appContent = fs.readFileSync(appPath, 'utf8');
      let modified = false;

      // Add security middleware imports if missing
      if (!appContent.includes('helmet')) {
        appContent = `const helmet = require('helmet');\n${appContent}`;
        modified = true;
      }
      if (!appContent.includes('cors')) {
        appContent = `const cors = require('cors');\n${appContent}`;
        modified = true;
      }
      if (!appContent.includes('hpp')) {
        appContent = `const hpp = require('hpp');\n${appContent}`;
        modified = true;
      }
      if (!appContent.includes('express-rate-limit')) {
        appContent = `const rateLimit = require('express-rate-limit');\n${appContent}`;
        modified = true;
      }

      // Add security middleware usage if missing
      const middlewareConfig = `
// Security Middleware
app.use(helmet());
app.use(cors());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
`;

      if (!appContent.includes('app.use(helmet())')) {
        const insertPoint = appContent.indexOf('app.use(express');
        if (insertPoint !== -1) {
          appContent = appContent.slice(0, insertPoint) + middlewareConfig + appContent.slice(insertPoint);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(appPath, appContent);
        console.log('✅ Updated Express security configuration');
        fixes.push('Updated Express security configuration');
      }
    } catch (error) {
      console.error('❌ Failed to update Express security configuration:', error.message);
      errors.push(`Failed to update Express security configuration: ${error.message}`);
    }
  }

  // 3. File Upload Security
  console.log('\n3. Checking File Upload Security...');
  const uploadServicePath = path.join(__dirname, '../src/services/uploadService.js');

  if (fs.existsSync(uploadServicePath)) {
    try {
      let uploadContent = fs.readFileSync(uploadServicePath, 'utf8');
      let modified = false;

      // Add file type validation if missing
      const fileValidation = `
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validateFile = (file) => {
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
};
`;

      if (!uploadContent.includes('ALLOWED_FILE_TYPES')) {
        uploadContent = fileValidation + uploadContent;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(uploadServicePath, uploadContent);
        console.log('✅ Updated file upload security');
        fixes.push('Updated file upload security');
      }
    } catch (error) {
      console.error('❌ Failed to update file upload security:', error.message);
      errors.push(`Failed to update file upload security: ${error.message}`);
    }
  }

  // 4. Password Security
  console.log('\n4. Checking Password Security...');
  const userModelPath = path.join(__dirname, '../src/models/User.js');

  if (fs.existsSync(userModelPath)) {
    try {
      let userContent = fs.readFileSync(userModelPath, 'utf8');
      let modified = false;

      // Add password validation and hashing if missing
      const passwordSecurity = `
// Password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
  }
};

// Hash password before saving
schema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    validatePassword(this.password);
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
schema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
`;

      if (!userContent.includes('validatePassword')) {
        const schemaEnd = userContent.lastIndexOf('});');
        if (schemaEnd !== -1) {
          userContent = userContent.slice(0, schemaEnd) + passwordSecurity + userContent.slice(schemaEnd);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(userModelPath, userContent);
        console.log('✅ Updated password security');
        fixes.push('Updated password security');
      }
    } catch (error) {
      console.error('❌ Failed to update password security:', error.message);
      errors.push(`Failed to update password security: ${error.message}`);
    }
  }

  // Summary
  console.log('\n=== SECURITY FIX SUMMARY ===');
  console.log(`\nFixed Items (${fixes.length}):`);
  fixes.forEach(fix => console.log(`✅ ${fix}`));

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach(warning => console.log(`⚠️ ${warning}`));
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Review and update environment variables with secure values');
  console.log('2. Install required security packages: helmet, cors, hpp, express-rate-limit');
  console.log('3. Review and customize rate limiting configuration');
  console.log('4. Update allowed file types and size limits for your use case');
  console.log('5. Review and test password validation rules');

  return {
    fixes,
    warnings,
    errors
  };
};

validateAndFixSecurity().catch(console.error);