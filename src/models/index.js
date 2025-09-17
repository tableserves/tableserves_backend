/**
 * Models Index
 * Central export point for all Mongoose models
 */

// Import all models
const User = require('./User');
const Subscription = require('./Subscription');
const Restaurant = require('./Restaurant');
const Order = require('./Order');
const Zone = require('./Zone');
const ZoneShop = require('./ZoneShop');
const MenuCategory = require('./MenuCategory');
const MenuItem = require('./MenuItem');
const Analytics = require('./Analytics');
const Report = require('./Report');
const TableServeRating = require('./TableServeRating');

// Export all models
module.exports = {
  User,
  Subscription,
  Restaurant,
  Order,
  Zone,
  ZoneShop,
  MenuCategory,
  MenuItem,
  Analytics,
  Report,
  TableServeRating
};

// Also export individual models for convenience
module.exports.User = User;
module.exports.Subscription = Subscription;
module.exports.Restaurant = Restaurant;
module.exports.Order = Order;
module.exports.Zone = Zone;
module.exports.ZoneShop = ZoneShop;
module.exports.MenuCategory = MenuCategory;
module.exports.MenuItem = MenuItem;
module.exports.Analytics = Analytics;
module.exports.Report = Report;

/**
 * Model Relationships Overview:
 * 
 * User (1) -> (1) Subscription
 * User (1) -> (0..n) Restaurant (as owner)
 * User (1) -> (0..n) Zone (as admin)
 * User (1) -> (0..n) ZoneShop (as owner/vendor)
 * Restaurant (1) -> (0..n) Order
 * Restaurant (1) -> (0..n) MenuCategory
 * Zone (1) -> (0..n) ZoneShop
 * Zone (1) -> (0..n) MenuCategory
 * ZoneShop (1) -> (0..n) Order
 * ZoneShop (1) -> (0..n) MenuCategory
 * MenuCategory (1) -> (0..n) MenuItem
 * MenuItem (1) -> (0..n) OrderItem (referenced in orders)
 * Order (1) -> (0..n) OrderItem (embedded)
 * 
 * Future models to be added:
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