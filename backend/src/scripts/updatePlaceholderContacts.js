/**
 * Script to update placeholder contact information in restaurants and zones
 * This script specifically targets "To be updated" placeholder values
 * Run with: node backend/src/scripts/updatePlaceholderContacts.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import models
const Restaurant = require('../models/Restaurant');
const Zone = require('../models/Zone');

async function updatePlaceholderContacts() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tableserve';
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);

    console.log('✅ Connected to database');

    // Update restaurants with placeholder values
    console.log('\n📋 Updating Restaurant Placeholders...\n');
    const restaurants = await Restaurant.find({});
    
    console.log(`Found ${restaurants.length} restaurants\n`);

    let restaurantsUpdated = 0;

    for (const restaurant of restaurants) {
      console.log(`\n🏪 Restaurant: ${restaurant.name} (ID: ${restaurant._id})`);
      
      let needsUpdate = false;
      
      // Check for placeholder values
      if (restaurant.contact?.address) {
        const addr = restaurant.contact.address;
        
        if (addr.street === 'To be updated' || 
            addr.city === 'To be updated' || 
            addr.state === 'To be updated' || 
            addr.zipCode === '00000') {
          
          console.log('  ⚠️  Found placeholder values in address');
          
          // Update with proper default values
          if (addr.street === 'To be updated') {
            addr.street = `${restaurant.name} Location`;
            console.log(`    ✓ Updated street to: ${addr.street}`);
          }
          
          if (addr.city === 'To be updated') {
            addr.city = 'City Name';
            console.log(`    ✓ Updated city to: ${addr.city}`);
          }
          
          if (addr.state === 'To be updated') {
            addr.state = 'State';
            console.log(`    ✓ Updated state to: ${addr.state}`);
          }
          
          if (addr.zipCode === '00000') {
            addr.zipCode = '000000';
            console.log(`    ✓ Updated ZIP to: ${addr.zipCode}`);
          }
          
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await restaurant.save();
        restaurantsUpdated++;
        console.log('  ✅ Restaurant contact information updated!');
        console.log('  📝 Please update with actual contact details in restaurant settings');
      } else {
        console.log('  ✅ No placeholder values found');
      }
    }

    // Update zones with placeholder values
    console.log('\n\n📋 Updating Zone Placeholders...\n');
    const zones = await Zone.find({});
    
    console.log(`Found ${zones.length} zones\n`);

    let zonesUpdated = 0;

    for (const zone of zones) {
      console.log(`\n🏢 Zone: ${zone.name} (ID: ${zone._id})`);
      
      let needsUpdate = false;
      
      // Check for placeholder location
      if (zone.location === 'Location to be updated') {
        console.log('  ⚠️  Found placeholder location');
        zone.location = `${zone.name} Food Zone Location`;
        console.log(`    ✓ Updated location to: ${zone.location}`);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await zone.save();
        zonesUpdated++;
        console.log('  ✅ Zone contact information updated!');
        console.log('  📝 Please update with actual location in zone settings');
      } else {
        console.log('  ✅ No placeholder values found');
      }
    }

    console.log('\n\n✅ Update complete!');
    console.log(`   📊 Restaurants updated: ${restaurantsUpdated}/${restaurants.length}`);
    console.log(`   📊 Zones updated: ${zonesUpdated}/${zones.length}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server (if running)');
    console.log('   2. Test by downloading/printing a receipt from the live orders page');
    console.log('   3. The receipt should now show the updated business information');
    console.log('   4. Update with actual contact details through the settings page');
    console.log('\n⚠️  Important: Please update the contact information with actual details');
    console.log('   through your restaurant/zone settings page for accurate receipts.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the script
updatePlaceholderContacts();
