const { Restaurant, Zone } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { APIError } = require('../middleware/errorHandler');

/**
 * Check and fix restaurant/zone contact information
 * @route POST /api/v1/utility/fix-contacts
 * @access Private (Admin only)
 */
const fixContactInformation = catchAsync(async (req, res) => {
  const results = {
    restaurants: {
      total: 0,
      fixed: 0,
      details: []
    },
    zones: {
      total: 0,
      fixed: 0,
      details: []
    }
  };

  // Check and fix restaurants
  const restaurants = await Restaurant.find({});
  results.restaurants.total = restaurants.length;

  for (const restaurant of restaurants) {
    const hasContact = restaurant.contact && typeof restaurant.contact === 'object';
    const hasAddress = hasContact && restaurant.contact.address && typeof restaurant.contact.address === 'object';
    const hasPhone = hasContact && restaurant.contact.phone;
    const hasEmail = hasContact && restaurant.contact.email;

    const needsFix = !hasContact || !hasAddress || !hasPhone;

    if (needsFix) {
      // Fix missing contact information
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
      results.restaurants.fixed++;
      results.restaurants.details.push({
        id: restaurant._id,
        name: restaurant.name,
        status: 'Fixed'
      });
    } else {
      results.restaurants.details.push({
        id: restaurant._id,
        name: restaurant.name,
        status: 'Already complete'
      });
    }
  }

  // Check and fix zones
  const zones = await Zone.find({});
  results.zones.total = zones.length;

  for (const zone of zones) {
    const hasLocation = zone.location && zone.location.trim() !== '';
    const hasContactInfo = zone.contactInfo && typeof zone.contactInfo === 'object';
    const hasPhone = hasContactInfo && zone.contactInfo.phone;
    const hasEmail = hasContactInfo && zone.contactInfo.email;

    const needsFix = !hasLocation || !hasContactInfo || !hasPhone || !hasEmail;

    if (needsFix) {
      // Fix missing contact information
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
      results.zones.fixed++;
      results.zones.details.push({
        id: zone._id,
        name: zone.name,
        status: 'Fixed'
      });
    } else {
      results.zones.details.push({
        id: zone._id,
        name: zone.name,
        status: 'Already complete'
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Contact information check and fix completed',
    data: results
  });
});

module.exports = {
  fixContactInformation
};
