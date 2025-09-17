require('dotenv').config();
const fs = require('fs');
const path = require('path');

const validateAndFixErrorHandling = async () => {
  console.log('=== ERROR HANDLING VALIDATION AND FIXES ===\n');

  const fixes = [];
  const errors = [];

  // 1. Custom Error Classes
  console.log('1. Setting up Custom Error Classes...');
  const errorClassesPath = path.join(__dirname, '../src/utils/errors');

  if (!fs.existsSync(errorClassesPath)) {
    fs.mkdirSync(errorClassesPath, { recursive: true });
  }

  // Create base error class
  const baseErrorPath = path.join(errorClassesPath, 'BaseError.js');
  const baseErrorContent = `
class BaseError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = BaseError;
`;

  try {
    fs.writeFileSync(baseErrorPath, baseErrorContent);
    console.log('✅ Created BaseError class');
    fixes.push('Created BaseError class');
  } catch (error) {
    console.error('❌ Failed to create BaseError class:', error.message);
    errors.push(`Failed to create BaseError class: ${error.message}`);
  }

  // Create specific error classes
  const specificErrors = [
    {
      name: 'ValidationError',
      statusCode: 400,
      message: 'Invalid input data'
    },
    {
      name: 'AuthenticationError',
      statusCode: 401,
      message: 'Authentication failed'
    },
    {
      name: 'AuthorizationError',
      statusCode: 403,
      message: 'Not authorized'
    },
    {
      name: 'NotFoundError',
      statusCode: 404,
      message: 'Resource not found'
    },
    {
      name: 'ConflictError',
      statusCode: 409,
      message: 'Resource conflict'
    }
  ];

  for (const error of specificErrors) {
    const errorPath = path.join(errorClassesPath, `${error.name}.js`);
    const errorContent = `
const BaseError = require('./BaseError');

class ${error.name} extends BaseError {
  constructor(message = '${error.message}') {
    super(message, ${error.statusCode});
  }
}

module.exports = ${error.name};
`;

    try {
      fs.writeFileSync(errorPath, errorContent);
      console.log(`✅ Created ${error.name} class`);
      fixes.push(`Created ${error.name} class`);
    } catch (err) {
      console.error(`❌ Failed to create ${error.name} class:`, err.message);
      errors.push(`Failed to create ${error.name} class: ${err.message}`);
    }
  }

  // Create error handler index
  const errorIndexPath = path.join(errorClassesPath, 'index.js');
  const errorIndexContent = `
const BaseError = require('./BaseError');
const ValidationError = require('./ValidationError');
const AuthenticationError = require('./AuthenticationError');
const AuthorizationError = require('./AuthorizationError');
const NotFoundError = require('./NotFoundError');
const ConflictError = require('./ConflictError');

module.exports = {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
};
`;

  try {
    fs.writeFileSync(errorIndexPath, errorIndexContent);
    console.log('✅ Created error handler index');
    fixes.push('Created error handler index');
  } catch (error) {
    console.error('❌ Failed to create error handler index:', error.message);
    errors.push(`Failed to create error handler index: ${error.message}`);
  }

  // 2. Global Error Handler
  console.log('\n2. Setting up Global Error Handler...');
  const errorHandlerPath = path.join(__dirname, '../src/middleware/errorHandler.js');
  const errorHandlerContent = `
const { BaseError } = require('../utils/errors');

const handleCastErrorDB = err => ({
  message: 'Invalid value provided',
  statusCode: 400
});

const handleValidationErrorDB = err => ({
  message: Object.values(err.errors).map(el => el.message).join('. '),
  statusCode: 400
});

const handleDuplicateFieldsDB = err => ({
  message: 'Duplicate field value. Please use another value',
  statusCode: 400
});

const handleJWTError = () => ({
  message: 'Invalid token. Please log in again',
  statusCode: 401
});

const handleJWTExpiredError = () => ({
  message: 'Your token has expired. Please log in again',
  statusCode: 401
});

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
`;

  try {
    fs.writeFileSync(errorHandlerPath, errorHandlerContent);
    console.log('✅ Created global error handler');
    fixes.push('Created global error handler');
  } catch (error) {
    console.error('❌ Failed to create global error handler:', error.message);
    errors.push(`Failed to create global error handler: ${error.message}`);
  }

  // 3. Async Handler Wrapper
  console.log('\n3. Setting up Async Handler Wrapper...');
  const asyncHandlerPath = path.join(__dirname, '../src/utils/asyncHandler.js');
  const asyncHandlerContent = `
const asyncHandler = fn => (
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }
);

module.exports = asyncHandler;
`;

  try {
    fs.writeFileSync(asyncHandlerPath, asyncHandlerContent);
    console.log('✅ Created async handler wrapper');
    fixes.push('Created async handler wrapper');
  } catch (error) {
    console.error('❌ Failed to create async handler wrapper:', error.message);
    errors.push(`Failed to create async handler wrapper: ${error.message}`);
  }

  // 4. Update App.js with Error Handler
  console.log('\n4. Updating App.js with Error Handler...');
  const appPath = path.join(__dirname, '../src/app.js');

  if (fs.existsSync(appPath)) {
    try {
      let appContent = fs.readFileSync(appPath, 'utf8');
      let modified = false;

      // Add error handler import if missing
      if (!appContent.includes('errorHandler')) {
        appContent = `const errorHandler = require('./middleware/errorHandler');\n${appContent}`;
        modified = true;
      }

      // Add error handler middleware if missing
      if (!appContent.includes('app.use(errorHandler)')) {
        const lastMiddleware = appContent.lastIndexOf('app.use');
        if (lastMiddleware !== -1) {
          const insertPoint = appContent.indexOf('\n', lastMiddleware) + 1;
          appContent = appContent.slice(0, insertPoint) + 
                      '\n// Global error handler\napp.use(errorHandler);\n' +
                      appContent.slice(insertPoint);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(appPath, appContent);
        console.log('✅ Updated App.js with error handler');
        fixes.push('Updated App.js with error handler');
      }
    } catch (error) {
      console.error('❌ Failed to update App.js:', error.message);
      errors.push(`Failed to update App.js: ${error.message}`);
    }
  }

  // Summary
  console.log('\n=== ERROR HANDLING FIX SUMMARY ===');
  console.log(`\nFixed Items (${fixes.length}):`);
  fixes.forEach(fix => console.log(`✅ ${fix}`));

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Review and customize error messages for your application');
  console.log('2. Add specific error handling for your business logic');
  console.log('3. Update controllers to use the new error classes');
  console.log('4. Test error handling in different environments');
  console.log('5. Add error logging and monitoring');

  return {
    fixes,
    errors
  };
};

validateAndFixErrorHandling().catch(console.error);