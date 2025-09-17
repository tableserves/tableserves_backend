const mongoose = require('mongoose');
const Restaurant = require('../src/models/Restaurant');

async function updateRestaurantAddress() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://tableserves02:VGlbikiaK5WTfMGr@tableserves.w4jzk34.mongodb.net/?retryWrites=true&w=majority&appName=TableServes');
    
    const restaurant = await Restaurant.findById('68ca1eb9aeec5e49a67d57b8');
    if (restaurant) {
      console.log('Current address:', JSON.stringify(restaurant.contact?.address, null, 2));
      
      // Check if address is empty or has placeholder data
      const address = restaurant.contact?.address;
      if (!address || !address.street || address.zipCode === '00000') {
        console.log('Updating address with proper dummy data...');
        
        const updateData = {
          'contact.address.street': 'Gandhi Road, Near City Center',
          'contact.address.city': 'Vellore',
          'contact.address.state': 'Tamil Nadu',
          'contact.address.zipCode': '632001',
          'contact.address.country': 'India'
        };
        
        await Restaurant.findByIdAndUpdate('68ca1eb9aeec5e49a67d57b8', { $set: updateData });
        console.log('Address updated successfully');
        
        // Verify update
        const updatedRestaurant = await Restaurant.findById('68ca1eb9aeec5e49a67d57b8');
        console.log('Updated address:', JSON.stringify(updatedRestaurant.contact?.address, null, 2));
      } else {
        console.log('Address is already valid');
      }
    } else {
      console.log('Restaurant not found');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateRestaurantAddress();
