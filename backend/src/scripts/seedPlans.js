const mongoose = require('mongoose');
const Plan = require('../models/Plan');
require('dotenv').config();

// Sample plans with 30-day duration
const samplePlans = [
  // Restaurant Plans
  {
    name: 'Restaurant Basic',
    key: 'basic',
    planType: 'restaurant',
    price: 299,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 1,
      maxCategories: 5,
      maxMenuItems: 25,
      maxTables: 5,
      maxShops: null,
      maxVendors: null
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      analytics: false,
      modifiers: true,
      watermark: false,
      vendorManagement: false,
      prioritySupport: false,
      premiumBranding: false
    },
    description: 'Perfect for small restaurants getting started',
    sortOrder: 1,
    active: true
  },
  {
    name: 'Restaurant Advanced',
    key: 'advanced',
    planType: 'restaurant',
    price: 1299,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 3,
      maxCategories: 15,
      maxMenuItems: 100,
      maxTables: 15,
      maxShops: null,
      maxVendors: null
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      analytics: true,
      modifiers: true,
      watermark: false,
      vendorManagement: false,
      prioritySupport: true,
      premiumBranding: true
    },
    description: 'Advanced features for growing restaurants',
    sortOrder: 2,
    active: true,
    metadata: {
      isPopular: true
    }
  },
  {
    name: 'Restaurant Premium',
    key: 'premium',
    planType: 'restaurant',
    price: 2999,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: null, // Unlimited
      maxCategories: null,
      maxMenuItems: null,
      maxTables: null,
      maxShops: null,
      maxVendors: null
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      analytics: true,
      modifiers: true,
      watermark: false,
      vendorManagement: false,
      prioritySupport: true,
      premiumBranding: true
    },
    description: 'Unlimited features for enterprise restaurants',
    sortOrder: 3,
    active: true,
    metadata: {
      isFeatured: true
    }
  },

  // Zone Plans
  {
    name: 'Zone Basic',
    key: 'basic',
    planType: 'zone',
    price: 999,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 1,
      maxCategories: 10,
      maxMenuItems: 50,
      maxTables: 10,
      maxShops: 5,
      maxVendors: 5
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      analytics: false,
      modifiers: true,
      watermark: false,
      vendorManagement: true,
      prioritySupport: false,
      premiumBranding: false
    },
    description: 'Perfect for small zones and food courts',
    sortOrder: 1,
    active: true
  },
  {
    name: 'Zone Advanced',
    key: 'advanced',
    planType: 'zone',
    price: 1999,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 3,
      maxCategories: 25,
      maxMenuItems: 150,
      maxTables: 25,
      maxShops: 15,
      maxVendors: 15
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      analytics: true,
      modifiers: true,
      watermark: false,
      vendorManagement: true,
      prioritySupport: true,
      premiumBranding: true
    },
    description: 'Advanced features for growing zones',
    sortOrder: 2,
    active: true,
    metadata: {
      isPopular: true
    }
  },
  {
    name: 'Zone Premium',
    key: 'premium',
    planType: 'zone',
    price: 4999,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: null, // Unlimited
      maxCategories: null,
      maxMenuItems: null,
      maxTables: null,
      maxShops: null,
      maxVendors: null
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: true,
      analytics: true,
      modifiers: true,
      watermark: false,
      vendorManagement: true,
      prioritySupport: true,
      premiumBranding: true
    },
    description: 'Unlimited features for large zones and malls',
    sortOrder: 3,
    active: true,
    metadata: {
      isFeatured: true
    }
  }
];

async function seedPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing plans (optional - comment out if you want to keep existing plans)
    // await Plan.deleteMany({});
    // console.log('🗑️ Cleared existing plans');

    // Insert sample plans
    for (const planData of samplePlans) {
      try {
        // Check if plan already exists
        const existingPlan = await Plan.findOne({
          key: planData.key,
          planType: planData.planType
        });

        if (existingPlan) {
          console.log(`⚠️ Plan ${planData.planType}_${planData.key} already exists, skipping...`);
          continue;
        }

        const plan = new Plan(planData);
        await plan.save();
        console.log(`✅ Created plan: ${plan.name} (${plan.planType}_${plan.key})`);
      } catch (error) {
        console.error(`❌ Failed to create plan ${planData.name}:`, error.message);
      }
    }

    console.log('🎉 Plan seeding completed!');

    // Display summary
    const restaurantPlans = await Plan.find({ planType: 'restaurant', active: true });
    const zonePlans = await Plan.find({ planType: 'zone', active: true });

    console.log('\n📊 Plan Summary:');
    console.log(`Restaurant Plans: ${restaurantPlans.length}`);
    restaurantPlans.forEach(plan => {
      console.log(`  - ${plan.name}: ₹${plan.price}/month (30 days)`);
    });

    console.log(`Zone Plans: ${zonePlans.length}`);
    zonePlans.forEach(plan => {
      console.log(`  - ${plan.name}: ₹${plan.price}/month (30 days)`);
    });

  } catch (error) {
    console.error('❌ Error seeding plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeding function
if (require.main === module) {
  seedPlans();
}

module.exports = { seedPlans, samplePlans };