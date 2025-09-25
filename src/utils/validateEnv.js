/**
 * Environment Variable Validation Utility
 * Validates all required environment variables for TableServe backend
 */

const colors = require('colors');

// Define required environment variables by category
const ENV_REQUIREMENTS = {
  // Core application settings
  core: {
    NODE_ENV: { required: false, default: 'development', description: 'Application environment' },
    PORT: { required: false, default: '5000', description: 'Server port' },
    API_VERSION: { required: false, default: 'v1', description: 'API version' }
  },

  // Database configuration
  database: {
    DATABASE_URI: { required: true, description: 'MongoDB connection string' },
    DB_NAME: { required: false, default: 'tableserve', description: 'Database name' }
  },

  // Authentication & Security
  auth: {
    JWT_SECRET: { required: true, description: 'JWT signing secret' },
    JWT_REFRESH_SECRET: { required: true, description: 'JWT refresh token secret' },
    JWT_EXPIRE: { required: false, default: '15m', description: 'JWT expiration time' },
    JWT_REFRESH_EXPIRE: { required: false, default: '7d', description: 'JWT refresh expiration time' }
  },

  // External Services
  external: {
    CLOUDINARY_CLOUD_NAME: { required: false, description: 'Cloudinary cloud name for image uploads' },
    CLOUDINARY_API_KEY: { required: false, description: 'Cloudinary API key' },
    CLOUDINARY_API_SECRET: { required: false, description: 'Cloudinary API secret' },
    SMTP_HOST: { required: false, description: 'Email SMTP host' },
    SMTP_PORT: { required: false, default: '587', description: 'Email SMTP port' },
    SMTP_USER: { required: false, description: 'Email SMTP username' },
    SMTP_PASS: { required: false, description: 'Email SMTP password' }
  },

  // Frontend Integration
  frontend: {
    FRONTEND_URL: { required: false, default: 'http://localhost:5173', description: 'Frontend application URL' },
    ADMIN_PANEL_URL: { required: false, description: 'Admin panel URL (if separate)' }
  },

  // Redis/Caching (optional)
  cache: {
    REDIS_ENABLED: { required: false, default: 'true', description: 'Enable/disable Redis caching' },
    REDIS_URL: { required: false, description: 'Redis connection URL' },
    REDIS_HOST: { required: false, description: 'Redis host' },
    REDIS_PORT: { required: false, default: '6379', description: 'Redis port' },
    REDIS_PASSWORD: { required: false, description: 'Redis password' },
    REDIS_MAX_RETRIES: { required: false, default: '3', description: 'Maximum Redis connection retries' },
    REDIS_RETRY_DELAY: { required: false, default: '1000', description: 'Redis retry delay in milliseconds' },
    REDIS_CIRCUIT_BREAKER_THRESHOLD: { required: false, default: '5', description: 'Circuit breaker failure threshold' },
    FALLBACK_MEMORY_ENABLED: { required: false, default: 'true', description: 'Enable in-memory fallback cache' },
    FALLBACK_MEMORY_MAX_SIZE: { required: false, default: '104857600', description: 'Max memory cache size in bytes (100MB)' },
    FALLBACK_MEMORY_MAX_ENTRIES: { required: false, default: '10000', description: 'Max memory cache entries' },
    CACHE_DEFAULT_TTL: { required: false, default: '300', description: 'Default cache TTL in seconds' }
  },

  // Rate Limiting
  rateLimit: {
    RATE_LIMIT_WINDOW_MS: { required: false, default: '900000', description: 'Rate limit window (15 minutes)' },
    RATE_LIMIT_MAX_REQUESTS: { required: false, default: '100', description: 'Max requests per window' }
  }
};

/**
 * Validate environment variables
 */
const validateEnvironment = () => {
  console.log('\n🔍 TableServe Environment Validation'.cyan.bold);
  console.log('=' .repeat(50).cyan);

  let hasErrors = false;
  let hasWarnings = false;
  const results = {};

  // Check each category
  Object.entries(ENV_REQUIREMENTS).forEach(([category, variables]) => {
    console.log(`\n📋 ${category.toUpperCase()} Configuration:`.blue.bold);
    
    results[category] = {};

    Object.entries(variables).forEach(([varName, config]) => {
      const value = process.env[varName];
      const hasValue = value !== undefined && value !== '';

      results[category][varName] = {
        value: hasValue ? (varName.toLowerCase().includes('secret') || varName.toLowerCase().includes('password') ? '[REDACTED]' : value) : null,
        required: config.required,
        hasValue,
        default: config.default,
        description: config.description
      };

      if (config.required && !hasValue) {
        console.log(`  ❌ ${varName}`.red + ` - REQUIRED but missing`);
        console.log(`     ${config.description}`.gray);
        hasErrors = true;
      } else if (!hasValue && config.default) {
        console.log(`  ⚠️  ${varName}`.yellow + ` - Using default: ${config.default}`);
        console.log(`     ${config.description}`.gray);
        hasWarnings = true;
      } else if (hasValue) {
        const displayValue = varName.toLowerCase().includes('secret') || varName.toLowerCase().includes('password') 
          ? '[CONFIGURED]' 
          : value;
        console.log(`  ✅ ${varName}`.green + ` - ${displayValue}`);
      } else {
        console.log(`  ⚪ ${varName}`.gray + ` - Optional, not set`);
        console.log(`     ${config.description}`.gray);
      }
    });
  });

  // Summary
  console.log('\n📊 Validation Summary'.cyan.bold);
  console.log('=' .repeat(50).cyan);

  if (hasErrors) {
    console.log('❌ ERRORS FOUND: Missing required environment variables'.red.bold);
    console.log('   The application may not start or function correctly.'.red);
    console.log('   Please set the required variables and restart.'.red);
  } else {
    console.log('✅ All required environment variables are set'.green.bold);
  }

  if (hasWarnings) {
    console.log('⚠️  WARNINGS: Some optional variables are using defaults'.yellow.bold);
    console.log('   Consider setting these for production use.'.yellow);
  }

  console.log(`\n🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Current working directory: ${process.cwd()}`);
  console.log(`🕒 Validation completed at: ${new Date().toISOString()}`);

  return {
    hasErrors,
    hasWarnings,
    results,
    summary: {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      cwd: process.cwd()
    }
  };
};

// Run validation if this script is executed directly
if (require.main === module) {
  const result = validateEnvironment();
  process.exit(result.hasErrors ? 1 : 0);
}

module.exports = { validateEnvironment, ENV_REQUIREMENTS };
