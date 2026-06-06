/**
 * Script to check and fix restaurant contact information
 * Run with: node backend/src/scripts/fixRestaurantContacts.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import models
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');

async function checkAndFixContacts() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tableserve';
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);

    console.log('✅ Connected to database');

    // Check restaurants
    console.log('\n📋 Checking Restaurants...\n');
    const restaurants = await Restaurant.find({});
    
    console.log(`Found ${restaurants.length} restaurants\n`);

    for (const restaurant of restaurants) {
      console.log(`\n🏪 Restaurant: ${restaurant.name} (ID: ${restaurant._id})`);
      
      // Check contact information
      const hasContact = restaurant.contact && typeof restaurant.contact === 'object';
      const hasAddress = hasContact && restaurant.contact.address && typeof restaurant.contact.address === 'object';
      const hasPhone = hasContact && restaurant.contact.phone;
      const hasEmail = hasContact && restaurant.contact.email;

      console.log('  Contact Info Status:');
      console.log(`    ✓ Has contact object: ${hasContact ? '✅' : '❌'}`);
      console.log(`    ✓ Has address: ${hasAddress ? '✅' : '❌'}`);
      if (hasAddress) {
        console.log(`      - Street: ${restaurant.contact.address.street || '❌ Missing'}`);
        console.log(`      - City: ${restaurant.contact.address.city || '❌ Missing'}`);
        console.log(`      - State: ${restaurant.contact.address.state || '❌ Missing'}`);
        console.log(`      - ZIP: ${restaurant.contact.address.zipCode || '❌ Missing'}`);
      }
      console.log(`    ✓ Has phone: ${hasPhone ? '✅ ' + restaurant.contact.phone : '❌'}`);
      console.log(`    ✓ Has email: ${hasEmail ? '✅ ' + restaurant.contact.email : '❌'}`);

      // Fix missing contact information with placeholder data
      if (!hasContact || !hasAddress || !hasPhone) {
        console.log('\n  ⚠️  Missing contact information - Adding placeholder data...');
        
        if (!restaurant.contact) {
          restaurant.contact = {};
        }

        if (!restaurant.contact.address || typeof restaurant.contact.address !== 'object') {
          restaurant.contact.address = {
            street: '123 Main Street',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US'
          };
        } else {
          // Fill in missing address fields
          if (!restaurant.contact.address.street) restaurant.contact.address.street = '123 Main Street';
          if (!restaurant.contact.address.city) restaurant.contact.address.city = 'New York';
          if (!restaurant.contact.address.state) restaurant.contact.address.state = 'NY';
          if (!restaurant.contact.address.zipCode) restaurant.contact.address.zipCode = '10001';
          if (!restaurant.contact.address.country) restaurant.contact.address.country = 'US';
        }

        if (!restaurant.contact.phone) {
          restaurant.contact.phone = '+1 555-123-4567';
        }

        if (!restaurant.contact.email) {
          restaurant.contact.email = `contact@${restaurant.slug || 'restaurant'}.com`;
        }

        await restaurant.save();
        console.log('  ✅ Contact information updated!');
      } else {
        console.log('  ✅ Contact information is complete');
      }
    }

    // Check zones
    console.log('\n\n📋 Checking Zones...\n');
    const zones = await Zone.find({});
    
    console.log(`Found ${zones.length} zones\n`);

    for (const zone of zones) {
      console.log(`\n🏢 Zone: ${zone.name} (ID: ${zone._id})`);
      
      // Check contact information
      const hasLocation = zone.location && zone.location.trim() !== '';
      const hasContactInfo = zone.contactInfo && typeof zone.contactInfo === 'object';
      const hasPhone = hasContactInfo && zone.contactInfo.phone;
      const hasEmail = hasContactInfo && zone.contactInfo.email;

      console.log('  Contact Info Status:');
      console.log(`    ✓ Has location: ${hasLocation ? '✅ ' + zone.location : '❌'}`);
      console.log(`    ✓ Has contactInfo object: ${hasContactInfo ? '✅' : '❌'}`);
      console.log(`    ✓ Has phone: ${hasPhone ? '✅ ' + zone.contactInfo.phone : '❌'}`);
      console.log(`    ✓ Has email: ${hasEmail ? '✅ ' + zone.contactInfo.email : '❌'}`);

      // Fix missing contact information
      if (!hasLocation || !hasContactInfo || !hasPhone || !hasEmail) {
        console.log('\n  ⚠️  Missing contact information - Adding placeholder data...');
        
        if (!zone.location || zone.location.trim() === '') {
          zone.location = '123 Food Court, Shopping Mall, City';
        }

        if (!zone.contactInfo || typeof zone.contactInfo !== 'object') {
          zone.contactInfo = {};
        }

        if (!zone.contactInfo.phone) {
          zone.contactInfo.phone = '+1 555-987-6543';
        }

        if (!zone.contactInfo.email) {
          zone.contactInfo.email = `contact@${zone.name.toLowerCase().replace(/\s+/g, '-')}.com`;
        }

        await zone.save();
        console.log('  ✅ Contact information updated!');
      } else {
        console.log('  ✅ Contact information is complete');
      }
    }

    console.log('\n\n✅ All done! Contact information has been checked and updated.');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Create a new test order');
    console.log('   3. Check the receipt - it should now show proper business information');
    console.log('\n⚠️  Note: Old orders will still show empty info. Only new orders will have the updated data.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the script
checkAndFixContacts();
