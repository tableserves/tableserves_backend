#!/usr/bin/env node

/**
 * Test Environment Variables Loading
 * 
 * This script tests if the JWT/JWE keys are properly loaded from .env file
 * Run with: node test-env-keys.cjs
 */

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
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log(colorize('❌ .env file not found!', 'red'));
    console.log('Run: npm run generate-keys');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return envVars;
}

function validateKey(key, expectedLength, name) {
  if (!key) {
    console.log(`${colorize('❌', 'red')} ${name}: Missing`);
    return false;
  }
  
  if (key.length !== expectedLength) {
    console.log(`${colorize('❌', 'red')} ${name}: Wrong length (${key.length}/${expectedLength})`);
    return false;
  }
  
  if (!/^[0-9a-f]+$/i.test(key)) {
    console.log(`${colorize('❌', 'red')} ${name}: Invalid format (not hex)`);
    return false;
  }
  
  console.log(`${colorize('✓', 'green')} ${name}: Valid (${key.substring(0, 16)}...)`);
  return true;
}

function testKeyUsage(envVars) {
  console.log(colorize('\n🧪 Simulating Key Usage:', 'bright'));
  console.log(colorize('============================\n', 'bright'));
  
  // Simulate how Vite loads environment variables
  const mockImportMeta = {
    env: {}
  };
  
  // Only VITE_ prefixed variables are available in browser
  Object.keys(envVars).forEach(key => {
    if (key.startsWith('VITE_')) {
      mockImportMeta.env[key] = envVars[key];
    }
  });
  
  // Simulate JWTTokenService constructor logic
  const JWT_SECRET = mockImportMeta.env.VITE_JWT_SECRET || 'tableserve_jwt_secret_key_2024';
  const REFRESH_SECRET = mockImportMeta.env.VITE_JWT_REFRESH_SECRET || 'tableserve_refresh_secret_key_2024';
  const JWE_SECRET = mockImportMeta.env.VITE_JWE_SECRET || 'tableserve_jwe_secret_key_2024';
  const JWE_IV_SECRET = mockImportMeta.env.VITE_JWE_IV_SECRET || 'tableserve_jwe_iv_secret_2024';
  const ENABLE_JWE = mockImportMeta.env.VITE_ENABLE_JWE === 'true';
  
  console.log('JWT Service would load:');
  console.log(`${colorize('JWT_SECRET:', 'cyan')} ${JWT_SECRET === 'tableserve_jwt_secret_key_2024' ? colorize('Using fallback!', 'yellow') : colorize('Using .env key ✓', 'green')}`);
  console.log(`${colorize('REFRESH_SECRET:', 'cyan')} ${REFRESH_SECRET === 'tableserve_refresh_secret_key_2024' ? colorize('Using fallback!', 'yellow') : colorize('Using .env key ✓', 'green')}`);
  console.log(`${colorize('JWE_SECRET:', 'cyan')} ${JWE_SECRET === 'tableserve_jwe_secret_key_2024' ? colorize('Using fallback!', 'yellow') : colorize('Using .env key ✓', 'green')}`);
  console.log(`${colorize('JWE_IV_SECRET:', 'cyan')} ${JWE_IV_SECRET === 'tableserve_jwe_iv_secret_2024' ? colorize('Using fallback!', 'yellow') : colorize('Using .env key ✓', 'green')}`);
  console.log(`${colorize('ENABLE_JWE:', 'cyan')} ${ENABLE_JWE ? colorize('true ✓', 'green') : colorize('false', 'yellow')}`);
  
  return {
    usingEnvKeys: JWT_SECRET !== 'tableserve_jwt_secret_key_2024',
    jweEnabled: ENABLE_JWE
  };
}

function main() {
  console.log(colorize('\n🔍 Environment Variables Test', 'bright'));
  console.log(colorize('==============================\n', 'bright'));

  // Load .env file
  const envVars = loadEnvFile();
  
  if (Object.keys(envVars).length === 0) {
    console.log(colorize('\n❌ No environment variables found!', 'red'));
    return;
  }

  console.log(colorize('📋 Checking Required Keys:', 'bright'));
  console.log(colorize('==========================\n', 'bright'));

  // Validate keys
  const validations = {
    jwtSecret: validateKey(envVars.VITE_JWT_SECRET, 128, 'VITE_JWT_SECRET'),
    jwtRefresh: validateKey(envVars.VITE_JWT_REFRESH_SECRET, 128, 'VITE_JWT_REFRESH_SECRET'),
    jweSecret: validateKey(envVars.VITE_JWE_SECRET, 64, 'VITE_JWE_SECRET'),
    jweIv: validateKey(envVars.VITE_JWE_IV_SECRET, 64, 'VITE_JWE_IV_SECRET')
  };

  const allValid = Object.values(validations).every(v => v);
  
  // Test key usage simulation
  const usage = testKeyUsage(envVars);
  
  console.log(colorize('\n📊 Summary:', 'bright'));
  console.log(colorize('===========\n', 'bright'));
  
  if (allValid && usage.usingEnvKeys) {
    console.log(colorize('🎉 SUCCESS: All keys are valid and will be used!', 'green'));
    console.log(colorize(`🔐 JWE Encryption: ${usage.jweEnabled ? 'ENABLED' : 'DISABLED'}`, usage.jweEnabled ? 'green' : 'yellow'));
  } else if (!allValid) {
    console.log(colorize('❌ FAILED: Some keys are invalid!', 'red'));
    console.log('Run: npm run generate-keys');
  } else if (!usage.usingEnvKeys) {
    console.log(colorize('⚠️  WARNING: Using fallback keys!', 'yellow'));
    console.log('Keys exist but might not be loaded correctly.');
  }
  
  console.log(colorize('\n📝 Next Steps:', 'bright'));
  console.log('1. Start your app: npm run dev');
  console.log('2. Login and check browser console for JWT logs');
  console.log('3. Check browser storage for encrypted tokens');
  
  console.log(colorize('\n🔗 Files to check:', 'blue'));
  console.log('- .env (this file)');
  console.log('- src/services/JWTTokenService.js (loads these keys)');
}

// Run the test
if (require.main === module) {
  main();
}