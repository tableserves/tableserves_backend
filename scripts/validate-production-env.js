#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates all required environment variables and configurations for production deployment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper functions for colored output
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`)
};

// Required environment variables for production
const requiredVars = [
  {
    name: 'NODE_ENV',
    description: 'Node environment',
    validator: (value) => value === 'production',
    errorMsg: 'NODE_ENV must be set to "production"'
  },
  {
    name: 'PORT',
    description: 'Server port',
    validator: (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) < 65536,
    errorMsg: 'PORT must be a valid port number (1-65535)'
  },
  {
    name: 'MONGODB_URI',
    description: 'MongoDB connection string',
    validator: (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
    errorMsg: 'MONGODB_URI must be a valid MongoDB connection string'
  },
  {
    name: 'JWT_SECRET',
    description: 'JWT signing secret',
    validator: (value) => value.length >= 32,
    errorMsg: 'JWT_SECRET must be at least 32 characters long'
  },
  {
    name: 'JWT_REFRESH_SECRET',
    description: 'JWT refresh token secret',
    validator: (value) => value.length >= 32,
    errorMsg: 'JWT_REFRESH_SECRET must be at least 32 characters long'
  },
  {
    name: 'CLOUDINARY_CLOUD_NAME',
    description: 'Cloudinary cloud name',
    validator: (value) => value.length > 0,
    errorMsg: 'CLOUDINARY_CLOUD_NAME is required'
  },
  {
    name: 'CLOUDINARY_API_KEY',
    description: 'Cloudinary API key',
    validator: (value) => value.length > 0,
    errorMsg: 'CLOUDINARY_API_KEY is required'
  },
  {
    name: 'CLOUDINARY_API_SECRET',
    description: 'Cloudinary API secret',
    validator: (value) => value.length > 0,
    errorMsg: 'CLOUDINARY_API_SECRET is required'
  },
  {
    name: 'SMTP_USER',
    description: 'SMTP user email',
    validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    errorMsg: 'SMTP_USER must be a valid email address'
  },
  {
    name: 'SMTP_PASS',
    description: 'SMTP password/app password',
    validator: (value) => value.length >= 8,
    errorMsg: 'SMTP_PASS must be at least 8 characters long'
  },
  {
    name: 'FRONTEND_URL',
    description: 'Frontend application URL',
    validator: (value) => value.startsWith('http://') || value.startsWith('https://'),
    errorMsg: 'FRONTEND_URL must be a valid URL starting with http:// or https://'
  },
  {
    name: 'RAZORPAY_KEY_ID',
    description: 'Razorpay key ID',
    validator: (value) => value.length > 0,
    errorMsg: 'RAZORPAY_KEY_ID is required'
  },
  {
    name: 'RAZORPAY_KEY_SECRET',
    description: 'Razorpay key secret',
    validator: (value) => value.length > 0,
    errorMsg: 'RAZORPAY_KEY_SECRET is required'
  }
];

// Optional but recommended variables
const optionalVars = [
  {
    name: 'REDIS_URL',
    description: 'Redis connection URL for caching',
    validator: (value) => value.startsWith('redis://'),
    errorMsg: 'REDIS_URL should be a valid Redis connection string'
  },
  {
    name: 'ADMIN_PANEL_URL',
    description: 'Admin panel URL',
    validator: (value) => value.startsWith('http://') || value.startsWith('https://'),
    errorMsg: 'ADMIN_PANEL_URL should be a valid URL'
  },
  {
    name: 'API_BASE_URL',
    description: 'API base URL',
    validator: (value) => value.startsWith('http://') || value.startsWith('https://'),
    errorMsg: 'API_BASE_URL should be a valid URL'
  }
];

// Security checks
const securityChecks = [
  {
    name: 'JWT Secret Strength',
    check: (env) => {
      const secret = env.JWT_SECRET;
      if (!secret) return { passed: false, message: 'JWT_SECRET not found' };
      
      // Check for common weak secrets
      const weakSecrets = ['secret', 'password', '123456', 'jwt-secret', 'your-secret-key'];
      if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
        return { passed: false, message: 'JWT_SECRET appears to be weak or contains common words' };
      }
      
      // Check entropy
      const entropy = calculateEntropy(secret);
      if (entropy < 4.0) {
        return { passed: false, message: `JWT_SECRET has low entropy (${entropy.toFixed(2)}). Consider using a more random secret.` };
      }
      
      return { passed: true, message: `JWT_SECRET has good entropy (${entropy.toFixed(2)})` };
    }
  },
  {
    name: 'Production URLs',
    check: (env) => {
      const urls = [env.FRONTEND_URL, env.ADMIN_PANEL_URL, env.API_BASE_URL].filter(Boolean);
      const hasLocalhost = urls.some(url => url.includes('localhost') || url.includes('127.0.0.1'));
      
      if (hasLocalhost) {
        return { passed: false, message: 'Production URLs should not contain localhost or 127.0.0.1' };
      }
      
      const hasHttps = urls.every(url => url.startsWith('https://'));
      if (!hasHttps && urls.length > 0) {
        return { passed: false, message: 'Production URLs should use HTTPS' };
      }
      
      return { passed: true, message: 'All URLs are properly configured for production' };
    }
  },
  {
    name: 'Gmail Configuration',
    check: (env) => {
      if (env.SMTP_HOST === 'smtp.gmail.com') {
        if (!env.SMTP_PASS || env.SMTP_PASS.length !== 16) {
          return { passed: false, message: 'Gmail requires a 16-character app password' };
        }
        if (env.SMTP_PASS.includes(' ')) {
          return { passed: false, message: 'Gmail app password should not contain spaces' };
        }
      }
      return { passed: true, message: 'Email configuration looks good' };
    }
  }
];

// Calculate entropy of a string
function calculateEntropy(str) {
  const freq = {};
  for (let char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (let char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// Load environment variables from .env.production
function loadProductionEnv() {
  const envPath = path.join(process.cwd(), '.env.production');
  
  if (!fs.existsSync(envPath)) {
    log.error('.env.production file not found');
    return null;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

// Validate required variables
function validateRequiredVars(env) {
  log.header('Validating Required Environment Variables');
  
  let allValid = true;
  const results = [];
  
  for (const varConfig of requiredVars) {
    const value = env[varConfig.name];
    
    if (!value) {
      log.error(`${varConfig.name}: Missing`);
      results.push({ name: varConfig.name, status: 'missing', message: 'Variable not set' });
      allValid = false;
    } else if (!varConfig.validator(value)) {
      log.error(`${varConfig.name}: ${varConfig.errorMsg}`);
      results.push({ name: varConfig.name, status: 'invalid', message: varConfig.errorMsg });
      allValid = false;
    } else {
      log.success(`${varConfig.name}: Valid`);
      results.push({ name: varConfig.name, status: 'valid', message: 'OK' });
    }
  }
  
  return { allValid, results };
}

// Validate optional variables
function validateOptionalVars(env) {
  log.header('Checking Optional Environment Variables');
  
  const results = [];
  
  for (const varConfig of optionalVars) {
    const value = env[varConfig.name];
    
    if (!value) {
      log.warning(`${varConfig.name}: Not set (optional)`);
      results.push({ name: varConfig.name, status: 'missing', message: 'Optional variable not set' });
    } else if (!varConfig.validator(value)) {
      log.warning(`${varConfig.name}: ${varConfig.errorMsg}`);
      results.push({ name: varConfig.name, status: 'invalid', message: varConfig.errorMsg });
    } else {
      log.success(`${varConfig.name}: Valid`);
      results.push({ name: varConfig.name, status: 'valid', message: 'OK' });
    }
  }
  
  return results;
}

// Run security checks
function runSecurityChecks(env) {
  log.header('Running Security Checks');
  
  let allPassed = true;
  const results = [];
  
  for (const check of securityChecks) {
    const result = check.check(env);
    
    if (result.passed) {
      log.success(`${check.name}: ${result.message}`);
    } else {
      log.error(`${check.name}: ${result.message}`);
      allPassed = false;
    }
    
    results.push({
      name: check.name,
      passed: result.passed,
      message: result.message
    });
  }
  
  return { allPassed, results };
}

// Generate validation report
function generateReport(requiredResults, optionalResults, securityResults) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    validation: {
      required: requiredResults,
      optional: optionalResults,
      security: securityResults
    },
    summary: {
      requiredValid: requiredResults.allValid,
      securityPassed: securityResults.allPassed,
      totalChecks: requiredVars.length + optionalVars.length + securityChecks.length,
      passedChecks: [
        ...requiredResults.results.filter(r => r.status === 'valid'),
        ...optionalResults.filter(r => r.status === 'valid'),
        ...securityResults.results.filter(r => r.passed)
      ].length
    }
  };
  
  // Save report
  const reportPath = path.join(process.cwd(), 'production-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

// Main validation function
function main() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                TableServe Production Validator               ║
║              Environment Configuration Check                 ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  // Load environment
  const env = loadProductionEnv();
  if (!env) {
    process.exit(1);
  }
  
  log.success('.env.production file loaded successfully');
  console.log('');
  
  // Run validations
  const requiredResults = validateRequiredVars(env);
  console.log('');
  
  const optionalResults = validateOptionalVars(env);
  console.log('');
  
  const securityResults = runSecurityChecks(env);
  console.log('');
  
  // Generate report
  const report = generateReport(requiredResults, optionalResults, securityResults);
  
  // Display summary
  log.header('Validation Summary');
  console.log(`Total checks: ${report.summary.totalChecks}`);
  console.log(`Passed checks: ${report.summary.passedChecks}`);
  console.log(`Required variables: ${requiredResults.allValid ? 'VALID' : 'INVALID'}`);
  console.log(`Security checks: ${securityResults.allPassed ? 'PASSED' : 'FAILED'}`);
  
  if (requiredResults.allValid && securityResults.allPassed) {
    log.success('🎉 Production environment validation PASSED!');
    log.info('Your application is ready for production deployment.');
    process.exit(0);
  } else {
    log.error('❌ Production environment validation FAILED!');
    log.error('Please fix the issues above before deploying to production.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, loadProductionEnv, validateRequiredVars, runSecurityChecks };
