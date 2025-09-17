
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
