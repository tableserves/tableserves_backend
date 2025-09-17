require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const checkSecurity = async () => {
  console.log('=== SECURITY CONFIGURATION CHECK ===\n');

  let securityScore = 100;
  const deductions = [];

  // 1. Environment Variables Security
  console.log('1. Checking Environment Variables Security...');
  const envPath = path.join(__dirname, '../.env');
  const gitignorePath = path.join(__dirname, '../.gitignore');

  if (fs.existsSync(envPath)) {
    // Check if .env is in .gitignore
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignoreContent.includes('.env')) {
        console.log('⚠️ .env file is not listed in .gitignore');
        securityScore -= 10;
        deductions.push('ENV_NOT_GITIGNORED');
      } else {
        console.log('✅ .env file is properly gitignored');
      }
    }

    // Check sensitive variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    const sensitivePatterns = [
      { pattern: /^.*(PASSWORD|PASS|SECRET|KEY|TOKEN).*=/m, recommendation: 'Ensure sensitive credentials are properly secured' },
      { pattern: /^.*(AWS|AZURE|GOOGLE).*=/m, recommendation: 'Secure cloud provider credentials' },
      { pattern: /^.*(_URL|_URI).*=/m, recommendation: 'Protect service endpoints and connection strings' }
    ];

    sensitivePatterns.forEach(({ pattern, recommendation }) => {
      if (pattern.test(envContent)) {
        console.log(`⚠️ Found potentially sensitive data: ${recommendation}`);
      }
    });
  }

  // 2. Authentication Security
  console.log('\n2. Checking Authentication Security...');
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      console.log('⚠️ JWT secret is too short (should be at least 32 characters)');
      securityScore -= 10;
      deductions.push('WEAK_JWT_SECRET');
    } else {
      console.log('✅ JWT secret length is adequate');
    }
  } else {
    console.log('❌ JWT secret is not configured');
    securityScore -= 20;
    deductions.push('MISSING_JWT_SECRET');
  }

  // 3. Password Security
  console.log('\n3. Checking Password Security...');
  try {
    const userModelPath = path.join(__dirname, '../src/models/User.js');
    if (fs.existsSync(userModelPath)) {
      const userModelContent = fs.readFileSync(userModelPath, 'utf8');
      
      // Check for password hashing
      if (!userModelContent.includes('bcrypt') && !userModelContent.includes('argon2')) {
        console.log('⚠️ No secure password hashing detected');
        securityScore -= 15;
        deductions.push('NO_PASSWORD_HASH');
      } else {
        console.log('✅ Password hashing is implemented');
      }

      // Check for password validation
      if (!userModelContent.match(/password.*validate/i)) {
        console.log('⚠️ No password validation detected');
        securityScore -= 5;
        deductions.push('NO_PASSWORD_VALIDATION');
      } else {
        console.log('✅ Password validation is implemented');
      }
    }
  } catch (error) {
    console.log('❌ Error checking password security:', error.message);
  }

  // 4. Headers Security
  console.log('\n4. Checking Headers Security...');
  try {
    const appPath = path.join(__dirname, '../src/app.js');
    if (fs.existsSync(appPath)) {
      const appContent = fs.readFileSync(appPath, 'utf8');
      
      // Check for security headers
      const securityHeaders = [
        { name: 'helmet', description: 'Security headers middleware' },
        { name: 'cors', description: 'CORS middleware' },
        { name: 'xss', description: 'XSS protection' },
        { name: 'hpp', description: 'HTTP Parameter Pollution protection' }
      ];

      securityHeaders.forEach(({ name, description }) => {
        if (!appContent.includes(name)) {
          console.log(`⚠️ Missing ${description} (${name})`);
          securityScore -= 5;
          deductions.push(`MISSING_${name.toUpperCase()}`);
        } else {
          console.log(`✅ ${description} is implemented`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Error checking headers security:', error.message);
  }

  // 5. Rate Limiting
  console.log('\n5. Checking Rate Limiting...');
  const rateLimitWindow = process.env.RATE_LIMIT_WINDOW;
  const rateLimitMax = process.env.RATE_LIMIT_MAX;

  if (!rateLimitWindow || !rateLimitMax) {
    console.log('⚠️ Rate limiting is not configured');
    securityScore -= 5;
    deductions.push('NO_RATE_LIMIT');
  } else {
    console.log('✅ Rate limiting is configured');
  }

  // 6. File Upload Security
  console.log('\n6. Checking File Upload Security...');
  try {
    const uploadServicePath = path.join(__dirname, '../src/services/uploadService.js');
    if (fs.existsSync(uploadServicePath)) {
      const uploadContent = fs.readFileSync(uploadServicePath, 'utf8');
      
      // Check for file type validation
      if (!uploadContent.match(/mime|fileFilter|mimetype/i)) {
        console.log('⚠️ No file type validation detected');
        securityScore -= 5;
        deductions.push('NO_UPLOAD_VALIDATION');
      } else {
        console.log('✅ File upload validation is implemented');
      }

      // Check for file size limits
      if (!uploadContent.match(/limits|fileSize|maxSize/i)) {
        console.log('⚠️ No file size limits detected');
        securityScore -= 5;
        deductions.push('NO_UPLOAD_LIMITS');
      } else {
        console.log('✅ File upload limits are implemented');
      }
    }
  } catch (error) {
    console.log('❌ Error checking file upload security:', error.message);
  }

  // Security Score Summary
  console.log('\n=== SECURITY SCORE ===');
  console.log(`Overall Security Score: ${securityScore}/100`);
  
  if (deductions.length > 0) {
    console.log('\nSecurity Deductions:');
    deductions.forEach(deduction => console.log(`- ${deduction}`));
  }

  // Recommendations
  console.log('\n=== SECURITY RECOMMENDATIONS ===');
  console.log('1. Implement all missing security headers');
  console.log('2. Ensure strong password policies');
  console.log('3. Configure rate limiting for all public endpoints');
  console.log('4. Implement proper file upload validation');
  console.log('5. Use secure session configuration');
  console.log('6. Enable CORS with specific origins');
  console.log('7. Implement API key rotation mechanism');
  console.log('8. Add request size limits');
  console.log('9. Implement proper error handling without exposing system details');
  console.log('10. Regular security audits and dependency updates');

  return {
    score: securityScore,
    deductions: deductions
  };
};

checkSecurity();