const mongoose = require('mongoose');
require('dotenv').config();

async function fixPlanIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('plans');

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Existing indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the old unique index on 'key' if it exists
    try {
      await collection.dropIndex('key_1');
      console.log('Dropped old key_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('key_1 index does not exist, skipping...');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }

    // Drop the existing compound index to recreate as unique
    try {
      await collection.dropIndex('key_1_planType_1');
      console.log('Dropped existing key_1_planType_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('key_1_planType_1 index does not exist, skipping...');
      } else {
        console.error('Error dropping compound index:', error.message);
      }
    }

    // Create the new compound unique index
    try {
      await collection.createIndex({ key: 1, planType: 1 }, { unique: true });
      console.log('Created new compound unique index on key + planType');
    } catch (error) {
      console.error('Error creating index:', error.message);
    }

    // Verify new indexes
    const newIndexes = await collection.indexes();
    console.log('New indexes:', newIndexes.map(idx => ({ name: idx.name, key: idx.key })));

    console.log('Index fix completed successfully!');

  } catch (error) {
    console.error('Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix function if this file is executed directly
if (require.main === module) {
  fixPlanIndexes();
}

module.exports = { fixPlanIndexes };
