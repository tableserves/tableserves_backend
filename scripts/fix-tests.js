require('dotenv').config();
const fs = require('fs');
const path = require('path');

const validateAndFixTests = async () => {
  console.log('=== TEST COVERAGE VALIDATION AND FIXES ===\n');

  const fixes = [];
  const errors = [];

  // 1. Create Test Configuration Files
  console.log('1. Setting up Test Configuration Files...');

  // Jest base config
  const jestConfigPath = path.join(__dirname, '../jest.config.js');
  const jestConfigContent = `
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['./tests/setup.js']
};
`;

  try {
    fs.writeFileSync(jestConfigPath, jestConfigContent);
    console.log('✅ Created Jest configuration');
    fixes.push('Created Jest configuration');
  } catch (error) {
    console.error('❌ Failed to create Jest configuration:', error.message);
    errors.push(`Failed to create Jest configuration: ${error.message}`);
  }

  // Jest E2E config
  const jestE2EConfigPath = path.join(__dirname, '../jest.config.e2e.js');
  const jestE2EConfigContent = `
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/tests/e2e/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.e2e.js'],
  testTimeout: 30000
};
`;

  try {
    fs.writeFileSync(jestE2EConfigPath, jestE2EConfigContent);
    console.log('✅ Created Jest E2E configuration');
    fixes.push('Created Jest E2E configuration');
  } catch (error) {
    console.error('❌ Failed to create Jest E2E configuration:', error.message);
    errors.push(`Failed to create Jest E2E configuration: ${error.message}`);
  }

  // 2. Create Test Setup Files
  console.log('\n2. Creating Test Setup Files...');

  // Base test setup
  const testSetupPath = path.join(__dirname, '../tests/setup.js');
  const testSetupContent = `
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/tableserve_test';

// Global test timeout
jest.setTimeout(10000);

// Silence console during tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
`;

  try {
    if (!fs.existsSync(path.dirname(testSetupPath))) {
      fs.mkdirSync(path.dirname(testSetupPath), { recursive: true });
    }
    fs.writeFileSync(testSetupPath, testSetupContent);
    console.log('✅ Created test setup file');
    fixes.push('Created test setup file');
  } catch (error) {
    console.error('❌ Failed to create test setup file:', error.message);
    errors.push(`Failed to create test setup file: ${error.message}`);
  }

  // E2E test setup
  const testE2ESetupPath = path.join(__dirname, '../tests/setup.e2e.js');
  const testE2ESetupContent = `
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
`;

  try {
    fs.writeFileSync(testE2ESetupPath, testE2ESetupContent);
    console.log('✅ Created E2E test setup file');
    fixes.push('Created E2E test setup file');
  } catch (error) {
    console.error('❌ Failed to create E2E test setup file:', error.message);
    errors.push(`Failed to create E2E test setup file: ${error.message}`);
  }

  // 3. Create Test Helpers
  console.log('\n3. Creating Test Helpers...');
  const testHelpersPath = path.join(__dirname, '../tests/helpers.js');
  const testHelpersContent = `
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Generate test JWT token
const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

// Create test user
const createTestUser = async (User, data = {}) => {
  const defaultData = {
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User',
    role: 'user'
  };

  const userData = { ...defaultData, ...data };
  return await User.create(userData);
};

// Clear test database
const clearDatabase = async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

module.exports = {
  generateTestToken,
  createTestUser,
  clearDatabase
};
`;

  try {
    fs.writeFileSync(testHelpersPath, testHelpersContent);
    console.log('✅ Created test helpers');
    fixes.push('Created test helpers');
  } catch (error) {
    console.error('❌ Failed to create test helpers:', error.message);
    errors.push(`Failed to create test helpers: ${error.message}`);
  }

  // 4. Create Example Tests
  console.log('\n4. Creating Example Tests...');

  // Model test example
  const modelTestPath = path.join(__dirname, '../tests/unit/models/user.test.js');
  const modelTestContent = `
const mongoose = require('mongoose');
const User = require('../../../src/models/User');

describe('User Model Test', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should create & save user successfully', async () => {
    const validUser = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!'
    });
    const savedUser = await validUser.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(validUser.name);
    expect(savedUser.email).toBe(validUser.email);
  });

  it('should fail to save user without required fields', async () => {
    const userWithoutRequiredField = new User({ name: 'John Doe' });
    let err;
    
    try {
      await userWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });
});
`;

  try {
    if (!fs.existsSync(path.dirname(modelTestPath))) {
      fs.mkdirSync(path.dirname(modelTestPath), { recursive: true });
    }
    fs.writeFileSync(modelTestPath, modelTestContent);
    console.log('✅ Created model test example');
    fixes.push('Created model test example');
  } catch (error) {
    console.error('❌ Failed to create model test example:', error.message);
    errors.push(`Failed to create model test example: ${error.message}`);
  }

  // Controller test example
  const controllerTestPath = path.join(__dirname, '../tests/unit/controllers/auth.test.js');
  const controllerTestContent = `
const AuthController = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const { generateTestToken } = require('../../helpers');

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: {}
    };
    res = mockResponse();
    next = jest.fn();
  });

  describe('login', () => {
    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123' };
      
      await AuthController.login(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Please provide email and password'
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com' };
      
      await AuthController.login(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Please provide email and password'
      });
    });
  });
});
`;

  try {
    if (!fs.existsSync(path.dirname(controllerTestPath))) {
      fs.mkdirSync(path.dirname(controllerTestPath), { recursive: true });
    }
    fs.writeFileSync(controllerTestPath, controllerTestContent);
    console.log('✅ Created controller test example');
    fixes.push('Created controller test example');
  } catch (error) {
    console.error('❌ Failed to create controller test example:', error.message);
    errors.push(`Failed to create controller test example: ${error.message}`);
  }

  // E2E test example
  const e2eTestPath = path.join(__dirname, '../tests/e2e/auth.test.js');
  const e2eTestContent = `
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should return validation error for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('status', 'fail');
    });
  });
});
`;

  try {
    if (!fs.existsSync(path.dirname(e2eTestPath))) {
      fs.mkdirSync(path.dirname(e2eTestPath), { recursive: true });
    }
    fs.writeFileSync(e2eTestPath, e2eTestContent);
    console.log('✅ Created E2E test example');
    fixes.push('Created E2E test example');
  } catch (error) {
    console.error('❌ Failed to create E2E test example:', error.message);
    errors.push(`Failed to create E2E test example: ${error.message}`);
  }

  // Summary
  console.log('\n=== TEST COVERAGE FIX SUMMARY ===');
  console.log(`\nFixed Items (${fixes.length}):`);
  fixes.forEach(fix => console.log(`✅ ${fix}`));

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Install required packages: jest, supertest, mongodb-memory-server');
  console.log('2. Add test scripts to package.json');
  console.log('3. Create tests for remaining models and controllers');
  console.log('4. Set up CI/CD pipeline with test automation');
  console.log('5. Monitor and maintain test coverage');

  return {
    fixes,
    errors
  };
};

validateAndFixTests().catch(console.error);