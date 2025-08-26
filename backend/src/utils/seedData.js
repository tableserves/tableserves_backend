const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { User, Subscription, Restaurant, Order } = require('../models');
const { hashPassword } = require('../services/authService');
const { logger } = require('../utils/logger');

/**
 * Database Seeder
 * Populates the database with sample data for development and testing
 */

const sampleUsers = [
  {
    email: 'admin@tableserve.com',
    phone: '+1234567890',
    password: 'Admin123!',
    role: 'admin',
    profile: {
      name: 'System Administrator'
    },
    emailVerified: true,
    phoneVerified: true,
    status: 'active'
  },
  {
    email: 'restaurant@example.com',
    phone: '+1234567891',
    password: 'Restaurant123!',
    role: 'restaurant_owner',
    profile: {
      name: 'John Restaurant Owner'
    },
    emailVerified: true,
    phoneVerified: true,
    status: 'active'
  },
  {
    email: 'zone@example.com',
    phone: '+1234567892',
    password: 'Zone123!',
    role: 'zone_admin',
    profile: {
      name: 'Jane Zone Admin'
    },
    emailVerified: true,
    phoneVerified: true,
    status: 'active'
  }
];

const sampleSubscriptions = [
  {
    planKey: 'admin_platform',
    planType: 'admin',
    planName: 'Platform Admin',
    features: {
      crudMenu: true,
      qrGeneration: true,
      vendorManagement: true,
      analytics: true,
      qrCustomization: true,
      modifiers: true,
      watermark: false,
      unlimited: true,
      multiLocation: true,
      advancedReporting: true,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
      customBranding: true
    },
    limits: {
      maxTables: null,
      maxShops: null,
      maxVendors: null,
      maxCategories: null,
      maxMenuItems: null,
      maxUsers: null,
      maxOrdersPerMonth: null,
      maxStorageGB: null
    },
    pricing: {
      amount: 0,
      currency: 'USD',
      interval: 'lifetime',
      trialDays: 0
    },
    status: 'active',
    endDate: new Date('2030-12-31')
  },
  {
    planKey: 'restaurant_professional',
    planType: 'restaurant',
    planName: 'Restaurant Professional',
    features: {
      crudMenu: true,
      qrGeneration: true,
      vendorManagement: false,
      analytics: true,
      qrCustomization: true,
      modifiers: true,
      watermark: false,
      unlimited: false,
      multiLocation: false,
      advancedReporting: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: true,
      customBranding: true
    },
    limits: {
      maxTables: 50,
      maxShops: 0,
      maxVendors: 0,
      maxCategories: 20,
      maxMenuItems: 200,
      maxUsers: 10,
      maxOrdersPerMonth: 5000,
      maxStorageGB: 10
    },
    pricing: {
      amount: 49.99,
      currency: 'USD',
      interval: 'monthly',
      trialDays: 14
    },
    status: 'active',
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  {
    planKey: 'zone_professional',
    planType: 'zone',
    planName: 'Zone Professional',
    features: {
      crudMenu: true,
      qrGeneration: true,
      vendorManagement: true,
      analytics: true,
      qrCustomization: true,
      modifiers: true,
      watermark: false,
      unlimited: false,
      multiLocation: true,
      advancedReporting: true,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: true,
      customBranding: true
    },
    limits: {
      maxTables: 0,
      maxShops: 25,
      maxVendors: 50,
      maxCategories: 50,
      maxMenuItems: 1000,
      maxUsers: 25,
      maxOrdersPerMonth: 10000,
      maxStorageGB: 25
    },
    pricing: {
      amount: 99.99,
      currency: 'USD',
      interval: 'monthly',
      trialDays: 14
    },
    status: 'active',
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  }
];

const sampleRestaurants = [
  {
    name: 'The Gourmet Kitchen',
    description: 'Fine dining experience with locally sourced ingredients and expertly crafted dishes.',
    contact: {
      address: {
        street: '123 Culinary Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      },
      phone: '+1-555-GOURMET',
      email: 'info@gourmetkitchen.com',
      website: 'https://www.gourmetkitchen.com'
    },
    hours: {
      monday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
      tuesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
      wednesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
      thursday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
      friday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
      saturday: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
      sunday: { isOpen: true, openTime: '10:00', closeTime: '21:00' }
    },
    settings: {
      theme: {
        primaryColor: '#2563eb',
        secondaryColor: '#f59e0b',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'Inter'
      },
      ordering: {
        isEnabled: true,
        requireCustomerInfo: true,
        allowSpecialInstructions: true,
        estimatedPrepTime: 25,
        autoAcceptOrders: false
      },
      payment: {
        acceptCash: true,
        acceptCard: true,
        taxRate: 0.08,
        serviceFee: 0.18,
        tipOptions: [0.15, 0.18, 0.20, 0.25],
        currency: 'USD'
      }
    },
    isActive: true,
    isPublished: true
  }
];

const sampleOrders = [
  {
    tableNumber: '5',
    customer: {
      name: 'Alice Johnson',
      phone: '+1-555-0123',
      email: 'alice@example.com',
      preferences: {
        allergies: ['nuts'],
        dietaryRestrictions: ['vegetarian'],
        spiceLevel: 'mild'
      }
    },
    items: [
      {
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, tomato sauce, basil',
        price: 18.99,
        quantity: 1,
        modifiers: [
          {
            name: 'Size',
            options: [{ name: 'Large', price: 3.00 }],
            totalPrice: 3.00
          }
        ],
        specialInstructions: 'Extra basil please',
        subtotal: 21.99,
        status: 'confirmed',
        prepTime: 15
      },
      {
        name: 'Caesar Salad',
        description: 'Romaine lettuce, parmesan, croutons, caesar dressing',
        price: 12.99,
        quantity: 1,
        modifiers: [],
        subtotal: 12.99,
        status: 'confirmed',
        prepTime: 5
      }
    ],
    pricing: {
      subtotal: 34.98,
      tax: {
        rate: 0.08,
        amount: 2.80
      },
      serviceFee: {
        rate: 0.18,
        amount: 6.30
      },
      discount: {
        type: 'percentage',
        value: 0,
        amount: 0
      },
      tip: {
        amount: 7.00,
        percentage: 0.20
      },
      total: 51.08,
      currency: 'USD'
    },
    status: 'confirmed',
    payment: {
      status: 'pending',
      method: 'cash'
    },
    delivery: {
      type: 'table_service',
      estimatedTime: 20,
      instructions: 'Table by the window'
    },
    specialInstructions: 'Celebrating anniversary - any special touches appreciated!',
    flags: {
      hasAllergies: true,
      isVip: false,
      requiresSpecialAttention: true
    },
    source: {
      platform: 'web',
      userAgent: 'Mozilla/5.0 (compatible; TableServe/1.0)',
      ipAddress: '192.168.1.100'
    }
  }
];

/**
 * Clear all collections
 */
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Subscription.deleteMany({});
    await Restaurant.deleteMany({});
    await Order.deleteMany({});
    
    logger.info('✅ Database cleared successfully');
  } catch (error) {
    logger.error('❌ Error clearing database:', error);
    throw error;
  }
};

/**
 * Seed users and subscriptions
 */
const seedUsersAndSubscriptions = async () => {
  try {
    const createdUsers = [];
    const createdSubscriptions = [];
    
    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      const subscriptionData = sampleSubscriptions[i];
      
      // Hash password
      const passwordHash = await hashPassword(userData.password);
      
      // Create user
      const user = new User({
        ...userData,
        passwordHash
      });
      delete user.password; // Remove plain password
      
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      
      // Create subscription
      const subscription = new Subscription({
        ...subscriptionData,
        userId: savedUser._id
      });
      
      const savedSubscription = await subscription.save();
      createdSubscriptions.push(savedSubscription);
      
      // Link subscription to user
      savedUser.subscription = savedSubscription._id;
      await savedUser.save();
      
      logger.info(`✅ Created user: ${savedUser.email} with ${subscriptionData.planName} plan`);
    }
    
    return { users: createdUsers, subscriptions: createdSubscriptions };
  } catch (error) {
    logger.error('❌ Error seeding users and subscriptions:', error);
    throw error;
  }
};

/**
 * Seed restaurants
 */
const seedRestaurants = async (users) => {
  try {
    const restaurantOwner = users.find(user => user.role === 'restaurant_owner');
    if (!restaurantOwner) {
      throw new Error('No restaurant owner found');
    }
    
    const createdRestaurants = [];
    
    for (const restaurantData of sampleRestaurants) {
      const restaurant = new Restaurant({
        ...restaurantData,
        ownerId: restaurantOwner._id,
        subscriptionId: restaurantOwner.subscription
      });
      
      const savedRestaurant = await restaurant.save();
      createdRestaurants.push(savedRestaurant);
      
      logger.info(`✅ Created restaurant: ${savedRestaurant.name}`);
    }
    
    return createdRestaurants;
  } catch (error) {
    logger.error('❌ Error seeding restaurants:', error);
    throw error;
  }
};

/**
 * Seed orders
 */
const seedOrders = async (restaurants) => {
  try {
    const restaurant = restaurants[0];
    if (!restaurant) {
      throw new Error('No restaurant found');
    }
    
    const createdOrders = [];
    
    for (const orderData of sampleOrders) {
      const order = new Order({
        ...orderData,
        restaurantId: restaurant._id
      });
      
      const savedOrder = await order.save();
      createdOrders.push(savedOrder);
      
      logger.info(`✅ Created order: ${savedOrder.orderNumber}`);
    }
    
    return createdOrders;
  } catch (error) {
    logger.error('❌ Error seeding orders:', error);
    throw error;
  }
};

/**
 * Main seeder function
 */
const seedDatabase = async (options = {}) => {
  const { clearFirst = true, seedUsers = true, seedRestaurants = true, seedOrders = true } = options;
  
  try {
    logger.info('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDatabase();
    
    // Clear database if requested
    if (clearFirst) {
      await clearDatabase();
    }
    
    let users = [];
    let restaurants = [];
    
    // Seed users and subscriptions
    if (seedUsers) {
      const result = await seedUsersAndSubscriptions();
      users = result.users;
    }
    
    // Seed restaurants
    if (seedRestaurants && users.length > 0) {
      restaurants = await seedRestaurants(users);
    }
    
    // Seed orders
    if (seedOrders && restaurants.length > 0) {
      await seedOrders(restaurants);
    }
    
    logger.info('🎉 Database seeding completed successfully!');
    logger.info('\n📋 Sample Data Created:');
    logger.info(`   👥 Users: ${users.length}`);
    logger.info(`   🏪 Restaurants: ${restaurants.length}`);
    logger.info('\n🔐 Login Credentials:');
    users.forEach(user => {
      const password = sampleUsers.find(u => u.email === user.email)?.password;
      logger.info(`   📧 ${user.email} / 🔑 ${password} (${user.role})`);
    });
    
    return {
      users,
      restaurants,
      success: true
    };
    
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
};

/**
 * Run seeder if called directly
 */
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = {
  seedDatabase,
  clearDatabase,
  seedUsersAndSubscriptions,
  seedRestaurants,
  seedOrders
};