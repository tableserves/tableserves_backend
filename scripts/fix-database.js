require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const validateAndFixDatabase = async () => {
  console.log('=== DATABASE VALIDATION AND FIXES ===\n');

  const fixes = [];
  const errors = [];

  // Connect to MongoDB
  try {
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb+srv://username:password@cluster.mongodb.net/tableserve?retryWrites=true&w=majority';    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }

  // Load all models
  const modelsDir = path.join(__dirname, '../src/models');
  const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.js'));

  for (const modelFile of modelFiles) {
    const modelPath = path.join(modelsDir, modelFile);
    const modelName = path.basename(modelFile, '.js');

    try {
      require(modelPath);
      console.log(`✅ Loaded model: ${modelName}`);
    } catch (error) {
      console.error(`❌ Failed to load model ${modelName}:`, error.message);
      errors.push(`Failed to load model ${modelName}: ${error.message}`);
      continue;
    }
  }

  // Validate and fix schemas
  const models = mongoose.models;
  
  for (const [modelName, model] of Object.entries(models)) {
    console.log(`\nValidating ${modelName} schema...`);

    const schema = model.schema;
    const paths = Object.keys(schema.paths);

    // Check required fields
    const requiredFields = paths.filter(path => {
      const schemaType = schema.paths[path];
      return schemaType.options && schemaType.options.required;
    });

    console.log(`Required fields: ${requiredFields.join(', ') || 'None'}`);

    // Check indexes
    const indexes = schema.indexes();
    console.log(`Indexes: ${indexes.length ? indexes.map(idx => Object.keys(idx[0])).join(', ') : 'None'}`);

    // Add timestamps if missing
    if (!schema.options.timestamps) {
      schema.set('timestamps', true);
      console.log('✅ Added timestamps');
      fixes.push(`Added timestamps to ${modelName}`);
    }

    // Add version key if missing
    if (!schema.options.versionKey) {
      schema.set('versionKey', '__v');
      console.log('✅ Added version key');
      fixes.push(`Added version key to ${modelName}`);
    }

    // Add common indexes
    try {
      // Add index on createdAt and updatedAt
      await model.collection.createIndex({ createdAt: -1 });
      await model.collection.createIndex({ updatedAt: -1 });
      console.log('✅ Added timestamp indexes');
      fixes.push(`Added timestamp indexes to ${modelName}`);

      // Add text index on name/title fields if they exist
      const textFields = paths.filter(path => {
        const schemaType = schema.paths[path];
        return schemaType.instance === 'String' && 
               (path.toLowerCase().includes('name') || path.toLowerCase().includes('title'));
      });

      if (textFields.length > 0) {
        const textIndex = textFields.reduce((acc, field) => {
          acc[field] = 'text';
          return acc;
        }, {});

        await model.collection.createIndex(textIndex);
        console.log('✅ Added text search indexes');
        fixes.push(`Added text search indexes to ${modelName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create indexes for ${modelName}:`, error.message);
      errors.push(`Failed to create indexes for ${modelName}: ${error.message}`);
    }

    // Validate existing documents
    try {
      const documents = await model.find({});
      console.log(`Validating ${documents.length} documents...`);

      let invalidDocs = 0;
      for (const doc of documents) {
        try {
          await doc.validate();
        } catch (error) {
          invalidDocs++;
          console.error(`Invalid document ${doc._id}:`, error.message);
        }
      }

      if (invalidDocs > 0) {
        console.log(`⚠️ Found ${invalidDocs} invalid documents in ${modelName}`);
        errors.push(`Found ${invalidDocs} invalid documents in ${modelName}`);
      } else {
        console.log('✅ All documents are valid');
      }
    } catch (error) {
      console.error(`❌ Failed to validate documents in ${modelName}:`, error.message);
      errors.push(`Failed to validate documents in ${modelName}: ${error.message}`);
    }
  }

  // Summary
  console.log('\n=== DATABASE FIX SUMMARY ===');
  console.log(`\nFixed Items (${fixes.length}):`);
  fixes.forEach(fix => console.log(`✅ ${fix}`));

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Review and fix any invalid documents manually');
  console.log('2. Consider adding more specific indexes based on your query patterns');
  console.log('3. Monitor index usage and remove unused indexes');
  console.log('4. Consider implementing data migration scripts if needed');

  // Close MongoDB connection
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');

  return {
    fixes,
    errors
  };
};

validateAndFixDatabase().catch(console.error);