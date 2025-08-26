/**
 * Models Index
 * Central export point for all Mongoose models
 */

// Import all models
const User = require('./User');
const Subscription = require('./Subscription');
const Restaurant = require('./Restaurant');
const Order = require('./Order');

// Export all models
module.exports = {
  User,
  Subscription,
  Restaurant,
  Order
};

// Also export individual models for convenience
module.exports.User = User;
module.exports.Subscription = Subscription;
module.exports.Restaurant = Restaurant;
module.exports.Order = Order;

/**
 * Model Relationships Overview:
 * 
 * User (1) -> (1) Subscription
 * User (1) -> (0..n) Restaurant (as owner)
 * Restaurant (1) -> (0..n) Order
 * Order (1) -> (0..n) OrderItem (embedded)
 * 
 * Future models to be added:
 * - Zone: For zone administrators
 * - Shop: For shops within zones
 * - MenuCategory: For organizing menu items
 * - MenuItem: Individual menu items
 * - ZoneOrder: Orders within zones
 * - Analytics: Analytics and reporting data
 * - Notification: System notifications
 * - AuditLog: System audit trails
 */

/**
 * Model Usage Examples:
 * 
 * // Import all models
 * const { User, Restaurant, Order } = require('./models');
 * 
 * // Import specific model
 * const User = require('./models/User');
 * 
 * // Create new user
 * const newUser = new User({
 *   email: 'user@example.com',
 *   phone: '+1234567890',
 *   passwordHash: 'hashed_password',
 *   role: 'restaurant_owner'
 * });
 * 
 * // Find user by email
 * const user = await User.findOne({ email: 'user@example.com' });
 * 
 * // Create restaurant for user
 * const restaurant = new Restaurant({
 *   ownerId: user._id,
 *   subscriptionId: user.subscription,
 *   name: 'Amazing Restaurant',
 *   contact: {
 *     address: {
 *       street: '123 Main St',
 *       city: 'New York',
 *       state: 'NY',
 *       zipCode: '10001',
 *       country: 'US'
 *     },
 *     phone: '+1234567890'
 *   }
 * });
 * 
 * // Create order
 * const order = new Order({
 *   restaurantId: restaurant._id,
 *   tableNumber: '5',
 *   customer: {
 *     name: 'John Doe',
 *     phone: '+1234567890'
 *   },
 *   items: [{
 *     name: 'Burger',
 *     price: 12.99,
 *     quantity: 2,
 *     subtotal: 25.98
 *   }],
 *   pricing: {
 *     subtotal: 25.98,
 *     tax: { rate: 0.08, amount: 2.08 },
 *     total: 28.06
 *   }
 * });
 */