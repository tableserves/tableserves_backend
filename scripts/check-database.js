require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const checkDatabase = async () => {
  console.log('=== DATABASE CONNECTION AND MODELS CHECK ===\n');

  // Check MongoDB URI
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('❌ MONGODB_URI not found in environment variables');
    return;
  }

  try {
    // Connect to MongoDB
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Successfully connected to MongoDB\n');

    // Load and check all models
    const modelsDir = path.join(__dirname, '../src/models');
    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

    console.log('Checking models...');
    for (const file of modelFiles) {
      try {
        const modelPath = path.join(modelsDir, file);
        const model = require(modelPath);

        console.log(`\nChecking ${file}:`);

        // Check if it's a valid Mongoose model
        if (model.modelName && model.schema instanceof mongoose.Schema) {
          console.log('✅ Valid Mongoose model');
          console.log('Model name:', model.modelName);

          // Check schema fields
          const schemaFields = Object.keys(model.schema.paths);
          console.log('Schema fields:', schemaFields.join(', '));

          // Check indexes
          const indexes = model.schema.indexes();
          console.log('Indexes:', indexes.length ? indexes.map(idx => idx[0]) : 'No custom indexes');

          // Check for required fields
          const requiredFields = schemaFields.filter(field => 
            model.schema.paths[field].isRequired
          );
          console.log('Required fields:', requiredFields.length ? requiredFields.join(', ') : 'None');

          // Check for validation rules
          const fieldsWithValidation = schemaFields.filter(field => {
            const path = model.schema.paths[field];
            return path.validators && path.validators.length > 0;
          });
          console.log('Fields with validation:', fieldsWithValidation.length ? fieldsWithValidation.join(', ') : 'None');

          // Test model operations
          try {
            // Create a test document
            const TestModel = mongoose.model(model.modelName);
            const testDoc = new TestModel();

            // Validate the empty document to check required fields
            try {
              await testDoc.validate();
              console.log('⚠️ Empty document validation passed (check required fields)');
            } catch (validationError) {
              console.log('✅ Required field validation working');
            }

          } catch (modelError) {
            console.log('❌ Error testing model:', modelError.message);
          }

        } else {
          console.log('❌ Not a valid Mongoose model');
        }

      } catch (error) {
        console.log(`❌ Error loading model ${file}:`, error.message);
      }
    }

    // Check for common database operations
    console.log('\n=== Testing Common Database Operations ===');
    
    // Test connection pool
    const poolSize = mongoose.connection.config.poolSize || 'default';
    console.log('Connection pool size:', poolSize);

    // Check for existing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nExisting collections:', collections.map(c => c.name).join(', '));

    // Database statistics
    const dbStats = await mongoose.connection.db.stats();
    console.log('\nDatabase statistics:');
    console.log('- Collections:', dbStats.collections);
    console.log('- Indexes:', dbStats.indexes);
    console.log('- Average object size:', dbStats.avgObjSize, 'bytes');

  } catch (error) {
    console.log('❌ Database check failed:', error.message);
  } finally {
    // Close the connection
    try {
      await mongoose.connection.close();
      console.log('\n✅ Database connection closed');
    } catch (error) {
      console.log('❌ Error closing database connection:', error.message);
    }
  }

  // Recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Ensure all models have appropriate indexes for frequently queried fields');
  console.log('2. Add validation rules for critical fields');
  console.log('3. Consider implementing soft delete where appropriate');
  console.log('4. Add timestamps to track document changes');
  console.log('5. Implement proper error handling for database operations');
};

checkDatabase();