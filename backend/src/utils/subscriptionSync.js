/**
 * Subscription Sync Utility
 * Utilities to sync subscription plans and clean up inconsistencies
 */

const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const logger = require('./logger');

/**
 * Sync all restaurant subscription plans with their actual subscriptions
 */
async function syncAllRestaurantSubscriptionPlans() {
  try {
    console.log('🔄 Starting subscription plan sync for all restaurants...');
    
    const restaurants = await Restaurant.find({})
      .populate('subscriptionId', 'planKey planName planType status');
    
    let updated = 0;
    let errors = 0;
    
    for (const restaurant of restaurants) {
      try {
        if (restaurant.subscriptionId) {
          const subscription = restaurant.subscriptionId;
          let subscriptionPlan = 'free'; // default
          
          if (subscription && subscription.planKey) {
            // Map subscription planKey to restaurant subscriptionPlan
            switch (subscription.planKey) {
              case 'restaurant_enterprise':
              case 'restaurant_premium':
                subscriptionPlan = 'premium';
                break;
              case 'restaurant_professional':
              case 'restaurant_advanced':
                subscriptionPlan = 'advanced';
                break;
              case 'restaurant_starter':
              case 'restaurant_basic':
                subscriptionPlan = 'basic';
                break;
              case 'restaurant_free':
              case 'free_plan':
              default:
                subscriptionPlan = 'free';
                break;
            }
            
            // Update if different
            if (restaurant.subscriptionPlan !== subscriptionPlan) {
              restaurant.subscriptionPlan = subscriptionPlan;
              await restaurant.save();
              updated++;
              
              console.log(`✅ Updated restaurant ${restaurant.name}: ${subscription.planKey} → ${subscriptionPlan}`);
            }
          }
        } else {
          // No subscription, ensure it's set to free
          if (restaurant.subscriptionPlan !== 'free') {
            restaurant.subscriptionPlan = 'free';
            await restaurant.save();
            updated++;
            
            console.log(`✅ Updated restaurant ${restaurant.name}: no subscription → free`);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating restaurant ${restaurant.name}:`, error.message);
        errors++;
      }
    }
    
    console.log(`🎉 Subscription sync completed: ${updated} updated, ${errors} errors`);
    return { updated, errors, total: restaurants.length };
    
  } catch (error) {
    console.error('❌ Failed to sync subscription plans:', error);
    throw error;
  }
}

/**
 * Remove subscription plan field from all restaurants (if you decide it's not needed)
 */
async function removeSubscriptionPlanField() {
  try {
    console.log('🗑️ Removing subscriptionPlan field from all restaurants...');
    
    const result = await Restaurant.updateMany(
      {},
      { $unset: { subscriptionPlan: 1 } }
    );
    
    console.log(`✅ Removed subscriptionPlan field from ${result.modifiedCount} restaurants`);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to remove subscriptionPlan field:', error);
    throw error;
  }
}

/**
 * Get subscription plan statistics
 */
async function getSubscriptionPlanStats() {
  try {
    const stats = await Restaurant.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 },
          restaurants: { $push: { name: '$name', id: '$_id' } }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log('📊 Subscription Plan Statistics:');
    stats.forEach(stat => {
      console.log(`  ${stat._id || 'undefined'}: ${stat.count} restaurants`);
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Failed to get subscription stats:', error);
    throw error;
  }
}

module.exports = {
  syncAllRestaurantSubscriptionPlans,
  removeSubscriptionPlanField,
  getSubscriptionPlanStats
};