#!/usr/bin/env node

/**
 * Security Key Generator for TableServe
 * 
 * Generates cryptographically secure keys for JWT and JWE encryption
 * Run with: node generate-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function generateKey(bytes, name) {
  const key = crypto.randomBytes(bytes).toString('hex');
  console.log(`${colorize('✓', 'green')} Generated ${colorize(name, 'cyan')}: ${colorize(key.substring(0, 16) + '...', 'yellow')} (${key.length} chars)`);
  return key;
}

function createEnvContent(keys) {
  return `# TableServe Environment Configuration
# Generated on: ${new Date().toISOString()}
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# JWT Configuration (Production Ready)
VITE_JWT_SECRET=${keys.jwtSecret}
VITE_JWT_REFRESH_SECRET=${keys.jwtRefreshSecret}

# JWE (JSON Web Encryption) Configuration
VITE_JWE_SECRET=${keys.jweSecret}
VITE_JWE_IV_SECRET=${keys.jweIvSecret}

# JWT Token Configuration
VITE_JWT_ACCESS_EXPIRY=15m
VITE_JWT_REFRESH_EXPIRY=7d

# Security Configuration
VITE_ENABLE_JWE=true
VITE_SECURITY_LEVEL=high

# Key Generation Info
# JWT Keys: 512-bit (64 bytes) for HMAC-SHA256
# JWE Keys: 256-bit (32 bytes) for AES-256 encryption
# Generated using Node.js crypto.randomBytes()
`;
}

function main() {
  console.log(colorize('\n🔐 TableServe Security Key Generator', 'bright'));
  console.log(colorize('=====================================\n', 'bright'));

  try {
    // Generate keys
    console.log(colorize('Generating cryptographically secure keys...', 'blue'));
    
    const keys = {
      jwtSecret: generateKey(64, 'JWT Secret (64 bytes)'),
      jwtRefreshSecret: generateKey(64, 'JWT Refresh Secret (64 bytes)'),
      jweSecret: generateKey(32, 'JWE Secret (32 bytes)'),
      jweIvSecret: generateKey(32, 'JWE IV Secret (32 bytes)')
    };

    console.log(colorize('\n📋 Environment Variables:', 'bright'));
    console.log(colorize('========================\n', 'bright'));

    // Display environment variables
    console.log(colorize('VITE_JWT_SECRET=', 'cyan') + keys.jwtSecret);
    console.log(colorize('VITE_JWT_REFRESH_SECRET=', 'cyan') + keys.jwtRefreshSecret);
    console.log(colorize('VITE_JWE_SECRET=', 'cyan') + keys.jweSecret);
    console.log(colorize('VITE_JWE_IV_SECRET=', 'cyan') + keys.jweIvSecret);

    // Check if .env exists
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    console.log(colorize('\n💾 File Operations:', 'bright'));
    console.log(colorize('==================\n', 'bright'));

    if (fs.existsSync(envPath)) {
      console.log(colorize('⚠️  .env file already exists!', 'yellow'));
      console.log(colorize('   Backup will be created as .env.backup', 'yellow'));
      
      // Create backup
      const backupPath = path.join(process.cwd(), '.env.backup');
      fs.copyFileSync(envPath, backupPath);
      console.log(colorize(`✓ Backup created: ${backupPath}`, 'green'));
    }

    // Write new .env file
    const envContent = createEnvContent(keys);
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(colorize(`✓ New .env file created: ${envPath}`, 'green'));

    // Security validation
    console.log(colorize('\n🔍 Security Validation:', 'bright'));
    console.log(colorize('======================\n', 'bright'));

    const validations = {
      'JWT Secret Length': keys.jwtSecret.length === 128,
      'JWT Refresh Length': keys.jwtRefreshSecret.length === 128,
      'JWE Secret Length': keys.jweSecret.length === 64,
      'JWE IV Length': keys.jweIvSecret.length === 64,
      'Unique Keys': new Set(Object.values(keys)).size === 4
    };

    Object.entries(validations).forEach(([check, passed]) => {
      const status = passed ? colorize('✓ PASS', 'green') : colorize('✗ FAIL', 'red');
      console.log(`${status} ${check}`);
    });

    const allPassed = Object.values(validations).every(v => v);
    
    if (allPassed) {
      console.log(colorize('\n🎉 All security checks passed!', 'green'));
      console.log(colorize('Your keys are production-ready.\n', 'green'));
    } else {
      console.log(colorize('\n❌ Some security checks failed!', 'red'));
      console.log(colorize('Please regenerate keys.\n', 'red'));
      process.exit(1);
    }

    // Instructions
    console.log(colorize('📚 Next Steps:', 'bright'));
    console.log(colorize('=============\n', 'bright'));
    console.log('1. Verify your .env file contains the generated keys');
    console.log('2. Never commit .env to version control');
    console.log('3. Use different keys for production, staging, and development');
    console.log('4. Store production keys securely (AWS Secrets Manager, etc.)');
    console.log('5. Rotate keys regularly (every 3-6 months)');
    
    console.log(colorize('\n🚀 Ready to start TableServe with secure authentication!', 'bright'));

  } catch (error) {
    console.error(colorize('\n❌ Error generating keys:', 'red'), error.message);
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  main();
}

module.exports = { generateKey, createEnvContent };