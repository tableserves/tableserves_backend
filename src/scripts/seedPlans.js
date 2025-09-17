const mongoose = require('mongoose');
const Plan = require('../models/Plan');
require('dotenv').config();

/**
 * Seed script for creating default subscription plans
 */

const restaurantPlans = [
  {
    name: 'Free Starter',
    key: 'free',
    planType: 'restaurant',
    price: 0,
    currency: 'INR',
    durationDays: null, // Unlimited duration for free plan
    limits: {
      maxMenus: 1,
      maxCategories: 1,
      maxMenuItems: 2,
      maxTables: 1,
      maxShops: null,
      maxVendors: null
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: false,
      analytics: false,
      modifiers: false,
      watermark: true,
      vendorManagement: false,
      prioritySupport: false,
      premiumBranding: false
    },
    description: 'Perfect for getting started with basic menu management',
    sortOrder: 1,
    metadata: {
      isPopular: false,
      isFeatured: false,
      tags: ['starter', 'basic']
    }
  },
  {
    name: 'Basic',
    key: 'basic',
    planType: 'restaurant',
    price: 299,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 5,
      maxCategories: 8,
      maxMenuItems: 10,
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
    description: 'Great for small restaurants with multiple menu categories',
    sortOrder: 2,
    metadata: {
      isPopular: true,
      isFeatured: false,
      tags: ['popular', 'small-business']
    }
  },
  {
    name: 'Advanced',
    key: 'advanced',
    planType: 'restaurant',
    price: 1299,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 10,
      maxCategories: 15,
      maxMenuItems: 20,
      maxTables: 8,
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
    description: 'Perfect for growing restaurants with analytics and premium features',
    sortOrder: 3,
    metadata: {
      isPopular: false,
      isFeatured: true,
      tags: ['analytics', 'premium']
    }
  },
  {
    name: 'Premium',
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
    description: 'Unlimited features for large restaurants and chains',
    sortOrder: 4,
    metadata: {
      isPopular: false,
      isFeatured: true,
      tags: ['unlimited', 'enterprise']
    }
  }
];

const zonePlans = [
  {
    name: 'Free Starter',
    key: 'free',
    planType: 'zone',
    price: 0,
    currency: 'INR',
    durationDays: null,
    limits: {
      maxMenus: 1,
      maxCategories: 1,
      maxMenuItems: 1,
      maxTables: 1,
      maxShops: 1,
      maxVendors: 1
    },
    features: {
      crudMenu: true,
      qrGeneration: true,
      qrCustomization: false,
      analytics: false,
      modifiers: false,
      watermark: true,
      vendorManagement: true,
      prioritySupport: false,
      premiumBranding: false
    },
    description: 'Basic zone management for single vendor',
    sortOrder: 1,
    metadata: {
      isPopular: false,
      isFeatured: false,
      tags: ['starter', 'single-vendor']
    }
  },
  {
    name: 'Basic',
    key: 'basic',
    planType: 'zone',
    price: 999,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 5,
      maxCategories: 8,
      maxMenuItems: 10,
      maxTables: 5,
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
    description: 'Perfect for small food courts and zones',
    sortOrder: 2,
    metadata: {
      isPopular: true,
      isFeatured: false,
      tags: ['popular', 'food-court']
    }
  },
  {
    name: 'Advanced',
    key: 'advanced',
    planType: 'zone',
    price: 1999,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: 10,
      maxCategories: 15,
      maxMenuItems: 20,
      maxTables: 8,
      maxShops: 8,
      maxVendors: 8
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
    description: 'Advanced zone management with analytics',
    sortOrder: 3,
    metadata: {
      isPopular: false,
      isFeatured: true,
      tags: ['analytics', 'multi-vendor']
    }
  },
  {
    name: 'Premium',
    key: 'premium',
    planType: 'zone',
    price: 4999,
    currency: 'INR',
    durationDays: 30,
    limits: {
      maxMenus: null,
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
    description: 'Unlimited zone management for large complexes',
    sortOrder: 4,
    metadata: {
      isPopular: false,
      isFeatured: true,
      tags: ['unlimited', 'enterprise', 'mall']
    }
  }
];

async function seedPlans() {
  try {
    console.log('Starting plan seeding...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URI);
    console.log('Connected to MongoDB');

    // Clear existing plans
    const deleteResult = await Plan.deleteMany({});
    console.log('Cleared existing plans:', deleteResult.deletedCount);

    // Insert restaurant plans
    const restaurantPlanDocs = await Plan.insertMany(restaurantPlans);
    console.log(`Created ${restaurantPlanDocs.length} restaurant plans`);

    // Insert zone plans
    const zonePlanDocs = await Plan.insertMany(zonePlans);
    console.log(`Created ${zonePlanDocs.length} zone plans`);

    console.log('Plan seeding completed successfully!');
    
    // Display created plans
    console.log('\n=== RESTAURANT PLANS ===');
    restaurantPlanDocs.forEach(plan => {
      console.log(`${plan.name} (${plan.key}): ₹${plan.price}`);
    });

    console.log('\n=== ZONE PLANS ===');
    zonePlanDocs.forEach(plan => {
      console.log(`${plan.name} (${plan.key}): ₹${plan.price}`);
    });

  } catch (error) {
    console.error('Error seeding plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedPlans();
}

module.exports = { seedPlans, restaurantPlans, zonePlans };
